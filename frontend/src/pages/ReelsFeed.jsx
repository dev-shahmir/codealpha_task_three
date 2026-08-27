import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bot, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import toast from 'react-hot-toast';
import api from '../api/axios';
import VideoCard from '../components/VideoCard';

export default function ReelsFeed() {
  const qc = useQueryClient();
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [npcMode, setNpcMode] = useState(false);
  const npcTimer = useRef(null);
  const { ref: sentinelRef, inView } = useInView({ threshold: 0.1 });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['clips'],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await api.get(`/posts/clips/feed?page=${pageParam}&limit=5`);
      return data;
    },
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length + 1 : undefined),
  });

  const rawClips = data?.pages.flatMap((p) => p.clips ?? []) ?? [];
  const isVideoMedia = (media) =>
    media && (media.type === 'video' || /\.(mp4|mov|webm|avi|mkv|m4v)(\?.*)?$/i.test(media.url || ''));

  const clips = rawClips.filter((c) => {
    const firstMedia = c.media?.[0];
    return isVideoMedia(firstMedia);
  });

  // Load more when near the end
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage]);

  // Track active clip via IntersectionObserver on the container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll('.clip-item');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = parseInt(entry.target.dataset.index, 10);
            setActiveIndex(idx);
          }
        });
      },
      { threshold: 0.6 }
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [clips.length]);

  // NPC mode — auto-scroll every 8 seconds
  useEffect(() => {
    if (npcMode) {
      toast('🤖 NPC Mode ON — auto-scrolling', { icon: '🤖' });
      npcTimer.current = setInterval(() => {
        setActiveIndex((prev) => {
          const next = prev + 1;
          if (next >= clips.length) {
            clearInterval(npcTimer.current);
            setNpcMode(false);
            return prev;
          }
          containerRef.current
            ?.querySelectorAll('.clip-item')
            [next]?.scrollIntoView({ behavior: 'smooth' });
          return next;
        });
      }, 8000);
    } else {
      clearInterval(npcTimer.current);
    }
    return () => clearInterval(npcTimer.current);
  }, [npcMode, clips.length]);

  if (isLoading) {
    return (
      <div className="h-screen bg-[#07070D] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-[#07070D] overflow-hidden">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 pt-safe pt-4 pb-2">
        <Link to="/" className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:border-cyan-400/50">
          <ArrowLeft size={18} />
        </Link>

        <div className="text-center">
          <h1 className="font-display font-black text-slate-100 text-sm tracking-wider uppercase font-mono">Holo Clips</h1>
          <p className="text-cyan-300/70 text-xs font-mono">{activeIndex + 1} / {clips.length}</p>
        </div>

        {/* NPC Mode toggle */}
        <button
          onClick={() => setNpcMode(!npcMode)}
          className={`w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-all border ${
            npcMode
              ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.6)]'
              : 'bg-black/50 text-slate-400 border-white/10 hover:text-white'
          }`}
          title="Auto-Scroll Mode"
        >
          <Bot size={17} />
        </button>
      </div>

      {/* NPC Mode indicator */}
      <AnimatePresence>
        {npcMode && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-cyan-500/90 text-black backdrop-blur-md px-3.5 py-1 rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,242,254,0.5)]"
          >
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}>
              <Zap size={12} className="text-black fill-black" />
            </motion.div>
            <span className="text-black text-xs font-bold font-mono">AUTO-SCROLL ON</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Clip scroll container ───────────────────────────── */}
      <div ref={containerRef} className="clip-container">
        {clips.length === 0 ? (
          <div className="h-screen flex flex-col items-center justify-center text-white gap-4">
            <div className="text-5xl">🎬</div>
            <p className="text-white/60 text-sm">No clips yet. Drop one!</p>
          </div>
        ) : (
          clips.map((clip, i) => (
            <div key={clip._id} className="clip-item" data-index={i}>
              <VideoCard clip={clip} isActive={i === activeIndex} />
            </div>
          ))
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="clip-item bg-black flex items-center justify-center">
          {isFetchingNextPage ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-aura-purple/30 border-t-aura-purple rounded-full"
            />
          ) : !hasNextPage && clips.length > 0 ? (
            <div className="text-center text-white/40 space-y-2">
              <p className="text-3xl">✨</p>
              <p className="text-sm">You've seen everything bestie</p>
              <button
                onClick={() => qc.invalidateQueries({ queryKey: ['clips'] })}
                className="text-xs text-aura-purple-light underline"
              >
                Reload clips
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* ─── Progress dots ───────────────────────────────────── */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1">
        {clips.slice(Math.max(0, activeIndex - 3), activeIndex + 6).map((_, i) => {
          const realIdx = Math.max(0, activeIndex - 3) + i;
          return (
            <motion.div
              key={realIdx}
              animate={{
                height: realIdx === activeIndex ? 20 : 4,
                opacity: realIdx === activeIndex ? 1 : 0.3,
              }}
              className="w-1 rounded-full bg-white"
              transition={{ duration: 0.2 }}
            />
          );
        })}
      </div>
    </div>
  );
}
