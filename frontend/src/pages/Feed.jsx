import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Radio, RefreshCw, TrendingUp, Users, Sparkles, PlusCircle } from 'lucide-react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/axios';
import PostCard from '../components/PostCard';
import StoriesRail from '../components/StoriesRail';
import NexusHub from '../components/NexusHub';
import CreatePost from '../components/CreatePost';
import useAuthStore from '../contexts/authStore';

const FEED_TABS = [
  { key: 'for_you',   label: 'Main Pulse',  icon: Radio      },
  { key: 'following', label: 'Synced Nodes', icon: Users     },
  { key: 'trending',  label: 'Radar Top',    icon: TrendingUp },
];

const SkeletonCard = () => (
  <div className="glass-card mb-4 p-4 animate-pulse border border-white/[0.06]">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-full skeleton" />
      <div className="space-y-2 flex-1">
        <div className="h-3 w-32 rounded skeleton" />
        <div className="h-2.5 w-20 rounded skeleton" />
      </div>
    </div>
    <div className="space-y-2 mb-3">
      <div className="h-3 w-full rounded skeleton" />
      <div className="h-3 w-4/5 rounded skeleton" />
    </div>
    <div className="h-60 rounded-2xl skeleton" />
  </div>
);

export default function Feed() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('for_you');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const { ref: sentinelRef, inView } = useInView({ threshold: 0.1 });

  const fetchFeed = async ({ pageParam = 1 }) => {
    let endpoint;
    switch (activeTab) {
      case 'following':
        endpoint = `/posts/feed?page=${pageParam}&limit=10&filter=following`;
        break;
      case 'trending':
        endpoint = `/posts/explore?page=${pageParam}&limit=10`;
        break;
      default:
        endpoint = `/posts/feed?page=${pageParam}&limit=10`;
    }
    const { data } = await api.get(endpoint);
    return data;
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['feed', activeTab],
    queryFn: fetchFeed,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length + 1 : undefined),
  });

  // Infinite scroll trigger
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage]);

  const posts = data?.pages.flatMap((p) => p.posts ?? p.clips ?? []) ?? [];

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['feed', activeTab] });
    toast.success('Frequency recalibrated ✨');
  };

  return (
    <div className="max-w-6xl mx-auto flex justify-center xl:justify-start px-2 sm:px-4 py-4 pt-5">
      {/* ─── Center Stream ─────────────────────────────────────────────── */}
      <main className="w-full max-w-[620px] pb-16">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div>
            <h1 className="font-display font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-400">
              Nexus Pulse
            </h1>
            <p className="text-xs text-slate-400">
              Synchronized as <span className="text-cyan-300 font-semibold">@{user?.username}</span>
            </p>
          </div>

          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-xl btn-ghost group hover:border-cyan-400/40"
            title="Recalibrate Feed"
          >
            <RefreshCw
              size={16}
              className="text-slate-400 group-hover:text-cyan-300 transition-colors group-hover:rotate-180 duration-500"
            />
          </button>
        </div>

        {/* ─── Stories Rail ────────────────────────────────────────────── */}
        <StoriesRail />

        {/* ─── Quick Transmit Box ───────────────────────────────────────── */}
        <div
          onClick={() => setShowCreatePost(true)}
          className="glass-card p-3.5 mb-5 border border-white/[0.08] hover:border-cyan-500/30 cursor-pointer flex items-center gap-3 group transition-all"
        >
          <img
            src={user?.avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${user?.username}`}
            alt=""
            className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-cyan-400/50 transition-all"
          />
          <div className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-slate-400 group-hover:text-slate-200 group-hover:border-white/15 transition-all">
            Transmit pulse to the network, @{user?.username}...
          </div>
          <button className="p-2 rounded-xl btn-nexus text-white shadow-sm flex-shrink-0">
            <PlusCircle size={18} />
          </button>
        </div>

        {/* ─── Feed Category Tabs ──────────────────────────────────────── */}
        <div className="flex gap-1.5 p-1 glass-card rounded-2xl mb-5 border border-[var(--border-subtle)]">
          {FEED_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === key ? 'text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {activeTab === key && (
                <motion.div
                  layoutId="feedTab"
                  className="absolute inset-0 bg-gradient-to-r from-cyan-500/15 via-purple-500/10 to-transparent rounded-xl border border-cyan-400/30 shadow-[0_0_15px_rgba(0,242,254,0.15)]"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                />
              )}
              <Icon size={14} className="relative z-10" />
              <span className="relative z-10">{label}</span>
            </button>
          ))}
        </div>

        {/* ─── Posts Stream ────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
            </motion.div>
          ) : isError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-16 text-center glass-card p-6 border border-white/[0.06]"
            >
              <div className="text-3xl mb-3">📡</div>
              <p className="text-slate-300 font-semibold text-sm mb-1">Signal Loss Detected</p>
              <p className="text-slate-500 text-xs mb-4">Could not calibrate pulses for this frequency</p>
              <button onClick={() => refetch()} className="btn-nexus px-4 py-2 text-xs">
                Retry Calibration
              </button>
            </motion.div>
          ) : posts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-20 text-center glass-card p-8 border border-white/[0.06]"
            >
              <div className="text-4xl mb-3 animate-pulse">🌌</div>
              <h3 className="font-display font-bold text-base text-slate-100 mb-1">
                {activeTab === 'following' ? 'No Synced Transmissions Yet' : 'Frequency Silent'}
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mb-4">
                {activeTab === 'following'
                  ? 'Connect with more creators from Radar to receive their pulses.'
                  : 'Be the first node to broadcast a transmission to the network.'}
              </p>
              <button
                onClick={() => setShowCreatePost(true)}
                className="btn-nexus px-4 py-2 text-xs font-semibold"
              >
                Transmit Pulse ✨
              </button>
            </motion.div>
          ) : (
            <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {posts.map((post, i) => (
                <motion.div
                  key={post._id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.3) }}
                >
                  <PostCard post={post} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Infinite Scroll Sentinel ────────────────────────────────── */}
        <div ref={sentinelRef} className="py-6 flex justify-center">
          {isFetchingNextPage && (
            <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          )}
          {!hasNextPage && posts.length > 0 && (
            <p className="text-xs text-slate-500 font-mono py-2">
              ◈ All frequencies synchronized to this point
            </p>
          )}
        </div>
      </main>

      {/* ─── Right Sidebar: NexusHub ─────────────────────────────────── */}
      <NexusHub />

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreatePost && <CreatePost onClose={() => setShowCreatePost(false)} />}
      </AnimatePresence>
    </div>
  );
}
