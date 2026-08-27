import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageCircle, Share2, Bookmark, MoreHorizontal, Zap, Flame,
  Copy, Check, ShieldCheck, ChevronLeft, ChevronRight, Layers,
  Maximize2, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import api from '../api/axios';
import useAuthStore from '../contexts/authStore';
import { useOnlineUsers } from '../contexts/SocketContext';
import AuraParticles from './AuraParticles';
import CommentSection from './CommentSection';

const AURA_LEVEL_BADGES = {
  newbie: '🌱', rising: '⚡', glowing: '✨', radiant: '🔥', legendary: '👑',
};

export default function PostCard({ post: initialPost, onUpdate }) {
  const { user } = useAuthStore();
  const onlineUsers = useOnlineUsers();
  const [post, setPost] = useState(initialPost);
  const isAuthorOnline = post.author?._id ? onlineUsers.includes(post.author._id.toString()) : false;
  const [showComments, setShowComments] = useState(false);
  const [showReact, setShowReact] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [auraParticle, setAuraParticle] = useState({ trigger: false, x: 0, y: 0 });
  const [mediaIndex, setMediaIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null); // null | number
  const [lastTap, setLastTap] = useState(0);

  const cardRef = useRef(null);
  const auraRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Sync scroll position with mediaIndex
  const handleScroll = (e) => {
    const container = e.currentTarget;
    const width = container.clientWidth;
    if (width > 0) {
      const newIdx = Math.round(container.scrollLeft / width);
      if (newIdx !== mediaIndex && newIdx >= 0 && newIdx < (post.media?.length || 0)) {
        setMediaIndex(newIdx);
      }
    }
  };

  const scrollToMedia = (idx, e) => {
    e?.stopPropagation();
    if (!scrollContainerRef.current || !post.media || post.media.length === 0) return;
    const safeIdx = Math.max(0, Math.min(idx, post.media.length - 1));
    const width = scrollContainerRef.current.clientWidth;
    scrollContainerRef.current.scrollTo({
      left: safeIdx * width,
      behavior: 'smooth',
    });
    setMediaIndex(safeIdx);
  };

  const nextMedia = (e) => {
    scrollToMedia((mediaIndex + 1) % (post.media?.length || 1), e);
  };

  const prevMedia = (e) => {
    scrollToMedia((mediaIndex - 1 + (post.media?.length || 1)) % (post.media?.length || 1), e);
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight' && post.media?.length > 1) {
        setLightboxIndex((prev) => (prev + 1) % post.media.length);
      }
      if (e.key === 'ArrowLeft' && post.media?.length > 1) {
        setLightboxIndex((prev) => (prev - 1 + post.media.length) % post.media.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, post.media]);

  // Give Resonance (Like)
  const handleAura = async (e) => {
    e?.stopPropagation();
    const rect = auraRef.current?.getBoundingClientRect();
    if (rect) {
      setAuraParticle({ trigger: Date.now(), x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }

    const wasAura = post.hasAura;
    setPost((p) => ({
      ...p,
      hasAura: !wasAura,
      auraCount: wasAura ? Math.max(0, p.auraCount - 1) : (p.auraCount || 0) + 1,
    }));

    try {
      await api.post(`/posts/${post._id}/aura`);
      if (!wasAura) toast('✨ Resonance synchronized!', { icon: '⚡' });
    } catch {
      setPost((p) => ({
        ...p,
        hasAura: wasAura,
        auraCount: wasAura ? p.auraCount + 1 : Math.max(0, p.auraCount - 1),
      }));
    }
  };

  // Double tap / double click media to like
  const handleDoubleTap = (e) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      if (!post.hasAura) handleAura(e);
      setAuraParticle({ trigger: Date.now(), x: e.clientX, y: e.clientY });
    }
    setLastTap(now);
  };

  // Quantum Reactions (Based / Cringe)
  const handleReact = async (reaction) => {
    try {
      await api.post(`/posts/${post._id}/react`, { reaction });
      setPost((p) => ({ ...p, [`${reaction}Count`]: (p[`${reaction}Count`] || 0) + 1 }));
      setShowReact(false);
      toast(reaction === 'based' ? '🔥 Based Frequency!' : '💀 Cringe Signal!');
    } catch {
      toast.error('Could not emit reaction');
    }
  };

  // Save to Vault
  const handleSave = async () => {
    const wasSaved = post.hasSaved;
    setPost((p) => ({
      ...p,
      hasSaved: !wasSaved,
      savesCount: wasSaved ? Math.max(0, p.savesCount - 1) : (p.savesCount || 0) + 1,
    }));
    try {
      const { data } = await api.post(`/posts/${post._id}/save`);
      toast.success(data.action === 'saved' ? 'Archived to Vault 📌' : 'Removed from Vault');
    } catch {
      setPost((p) => ({
        ...p,
        hasSaved: wasSaved,
        savesCount: wasSaved ? p.savesCount + 1 : Math.max(0, p.savesCount - 1),
      }));
    }
  };

  // Copy share link
  const handleCopyLink = () => {
    const url = `${window.location.origin}/post/${post._id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Transmission link copied to clipboard 🔗');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleNativeShare = async () => {
    const url = `${window.location.origin}/post/${post._id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `NEXUS Pulse by @${post.author?.username}`,
          text: post.caption || 'Check out this pulse on NEXUS',
          url,
        });
      } catch (_) {}
    } else {
      handleCopyLink();
    }
  };

  const timeAgo = formatDistanceToNow(new Date(post.createdAt || Date.now()), { addSuffix: true });

  return (
    <>
      <AuraParticles trigger={auraParticle.trigger} x={auraParticle.x} y={auraParticle.y} />

      <article
        ref={cardRef}
        className="glass-card mb-4 border border-white/[0.08] rounded-3xl overflow-hidden relative"
      >
        {/* ─── Header ────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-4 pb-3">
          <Link to={`/${post.author?.username}`} className="flex items-center gap-3 group">
            <div className="relative">
              <img
                src={post.author?.avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${post.author?.username}`}
                alt={post.author?.username}
                className="w-10 h-10 rounded-full object-cover ring-1 ring-cyan-400/40 group-hover:ring-cyan-300 transition-all shadow-[0_0_8px_rgba(0,242,254,0.3)]"
              />
              {isAuthorOnline && (
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-[var(--bg-surface)] shadow-[0_0_6px_#10B981]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-100 group-hover:text-cyan-300 transition-colors">
                  {post.author?.displayName || post.author?.username}
                </span>
                <span className="text-xs">
                  {AURA_LEVEL_BADGES[post.author?.auraLevel || 'newbie']}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">@{post.author?.username} · {timeAgo}</span>
            </div>
          </Link>

          <button
            onClick={() => setShowShareModal(true)}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>

        {/* ─── Caption ─────────────────────────────────────── */}
        {post.caption && (
          <div className="px-4 pb-3">
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed break-words">
              {post.caption.split(/(@\w+|#\w+)/).map((part, i) =>
                part.startsWith('@') ? (
                  <Link key={i} to={`/${part.slice(1)}`} className="text-cyan-400 hover:underline font-semibold">{part}</Link>
                ) : part.startsWith('#') ? (
                  <Link key={i} to={`/explore?tag=${part.slice(1)}`} className="text-purple-400 font-semibold hover:underline">{part}</Link>
                ) : part
              )}
            </p>
          </div>
        )}

        {/* ─── Multi-Image Smooth Swipeable / Scrollable Gallery ─── */}
        {post.media?.length > 0 && (
          <div className="relative mx-3 my-1 rounded-2xl border border-white/[0.08] overflow-hidden bg-black/40 group/gallery select-none">
            {/* Scrollable Media Container */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              onClick={handleDoubleTap}
              className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar w-full max-h-[520px] bg-black/50"
            >
              {post.media.map((item, index) => (
                <div
                  key={index}
                  className="min-w-full w-full snap-center snap-always flex-shrink-0 flex items-center justify-center relative bg-black/30 overflow-hidden cursor-pointer"
                  onClick={() => setLightboxIndex(index)}
                >
                  {item.type === 'video' ? (
                    <video
                      src={item.url}
                      className="w-full max-h-[520px] object-contain rounded-2xl"
                      controls
                      playsInline
                      preload="metadata"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={`pulse media ${index + 1}`}
                      className="w-full max-h-[520px] object-cover transition-transform duration-300 hover:scale-[1.01]"
                      loading="lazy"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Top Right Media Counter Badge */}
            {post.media.length > 1 && (
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-white text-[11px] font-mono flex items-center gap-1.5 shadow-lg z-20 pointer-events-none">
                <Layers size={13} className="text-cyan-300" />
                <span>{mediaIndex + 1} / {post.media.length}</span>
              </div>
            )}

            {/* Fullscreen Expand Button (Top Left) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(mediaIndex);
              }}
              className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md flex items-center justify-center opacity-0 group-hover/gallery:opacity-100 transition-all border border-white/15 shadow-md hover:scale-105 z-20"
              title="Open full view"
            >
              <Maximize2 size={13} />
            </button>

            {/* Floating Left Navigation Button */}
            {post.media.length > 1 && (
              <button
                onClick={prevMedia}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/65 hover:bg-black/90 text-white backdrop-blur-md flex items-center justify-center opacity-80 group-hover/gallery:opacity-100 transition-all border border-white/20 shadow-xl hover:scale-110 z-20"
                title="Previous media (or swipe)"
              >
                <ChevronLeft size={18} />
              </button>
            )}

            {/* Floating Right Navigation Button */}
            {post.media.length > 1 && (
              <button
                onClick={nextMedia}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/65 hover:bg-black/90 text-white backdrop-blur-md flex items-center justify-center opacity-80 group-hover/gallery:opacity-100 transition-all border border-white/20 shadow-xl hover:scale-110 z-20"
                title="Next media (or swipe)"
              >
                <ChevronRight size={18} />
              </button>
            )}

            {/* Segmented Dots Indicator (Clickable) */}
            {post.media.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1.5 px-2.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 shadow-xl z-20">
                {post.media.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => scrollToMedia(i, e)}
                    className={clsx(
                      'h-1.5 rounded-full transition-all duration-300',
                      i === mediaIndex
                        ? 'bg-cyan-400 w-5 shadow-[0_0_10px_#00F2FE]'
                        : 'bg-white/40 hover:bg-white/80 w-1.5'
                    )}
                    title={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Horizontal Thumbnail Scroll Strip for Posts with 3+ media */}
            {post.media.length > 2 && (
              <div className="p-2 border-t border-white/[0.08] bg-black/50 flex items-center gap-2 overflow-x-auto no-scrollbar">
                {post.media.map((m, i) => (
                  <button
                    key={i}
                    onClick={(e) => scrollToMedia(i, e)}
                    className={clsx(
                      'w-11 h-11 rounded-lg overflow-hidden shrink-0 transition-all border-2',
                      i === mediaIndex
                        ? 'border-cyan-400 scale-105 shadow-[0_0_10px_rgba(0,242,254,0.6)] opacity-100'
                        : 'border-transparent opacity-50 hover:opacity-100'
                    )}
                  >
                    {m.type === 'video' ? (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[10px] text-white">🎬</div>
                    ) : (
                      <img src={m.url} alt="" className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="px-4 pt-2 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 5).map((tag) => (
              <Link
                key={tag}
                to={`/explore?tag=${tag}`}
                className="text-[11px] text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-0.5 rounded-full font-mono transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* ─── Engagement Statistics ─────────────────────────── */}
        <div className="px-4 pt-2.5 pb-1 flex gap-4 text-[11px] font-mono text-slate-400">
          {(post.auraCount || 0) > 0 && (
            <span className="text-cyan-300 font-semibold">{post.auraCount} Resonance</span>
          )}
          {(post.commentsCount || 0) > 0 && <span>{post.commentsCount} Drops</span>}
          {(post.basedCount || 0) > 0 && <span>🔥 {post.basedCount} Based</span>}
          {(post.cringeCount || 0) > 0 && <span>💀 {post.cringeCount} Cringe</span>}
        </div>

        {/* ─── Action Dock ──────────────────────────────────── */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-white/[0.06] mt-2">
          {/* Resonance / Aura */}
          <motion.button
            ref={auraRef}
            onClick={handleAura}
            whileTap={{ scale: 0.9 }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              post.hasAura
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,242,254,0.3)]'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-white/[0.04]'
            }`}
          >
            <Zap size={16} fill={post.hasAura ? 'currentColor' : 'none'} />
            <span>{post.auraCount || 0}</span>
          </motion.button>

          {/* Comments */}
          <button
            onClick={() => setShowComments(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-purple-400 hover:bg-white/[0.04] transition-all"
          >
            <MessageCircle size={16} />
            <span>{post.commentsCount || 0}</span>
          </button>

          {/* Quantum Reactions Popover Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowReact(!showReact)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-amber-400 hover:bg-white/[0.04] transition-all"
            >
              <Flame size={16} />
              <span>React</span>
            </button>

            {/* Reactions Popover */}
            <AnimatePresence>
              {showReact && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-1.5 rounded-2xl glass-card flex items-center gap-1 shadow-2xl border border-cyan-500/30 z-30"
                >
                  <button
                    onClick={() => handleReact('based')}
                    className="p-2 rounded-xl hover:bg-white/10 text-xs flex items-center gap-1 text-amber-400 transition-colors"
                    title="Based Frequency"
                  >
                    <span>🔥</span>
                    <span className="font-bold">Based</span>
                  </button>
                  <button
                    onClick={() => handleReact('cringe')}
                    className="p-2 rounded-xl hover:bg-white/10 text-xs flex items-center gap-1 text-rose-400 transition-colors"
                    title="Cringe Signal"
                  >
                    <span>💀</span>
                    <span className="font-bold">Cringe</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Vault Bookmark */}
          <button
            onClick={handleSave}
            className={`p-2 rounded-xl transition-all ${
              post.hasSaved
                ? 'text-cyan-300 bg-cyan-500/20 border border-cyan-400/40'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-white/[0.04]'
            }`}
            title="Archive in Vault"
          >
            <Bookmark size={16} fill={post.hasSaved ? 'currentColor' : 'none'} />
          </button>

          {/* Share */}
          <button
            onClick={handleNativeShare}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all"
            title="Share Pulse"
          >
            <Share2 size={16} />
          </button>
        </div>
      </article>

      {/* ─── High-Res Fullscreen Lightbox Modal ─────────────────── */}
      <AnimatePresence>
        {lightboxIndex !== null && post.media?.[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-2 sm:p-6 select-none"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Top Toolbar */}
            <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-mono">
                <span>@{post.author?.username}</span>
                <span>·</span>
                <span>{lightboxIndex + 1} / {post.media.length}</span>
              </div>
              <button
                onClick={() => setLightboxIndex(null)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all border border-white/20"
                title="Close (Esc)"
              >
                <X size={20} />
              </button>
            </div>

            {/* Lightbox Media View */}
            <div
              className="relative max-w-5xl max-h-[85vh] w-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {post.media[lightboxIndex].type === 'video' ? (
                <video
                  src={post.media[lightboxIndex].url}
                  className="max-h-[82vh] max-w-full rounded-2xl shadow-2xl object-contain"
                  controls
                  autoPlay
                />
              ) : (
                <img
                  src={post.media[lightboxIndex].url}
                  alt="fullscreen view"
                  className="max-h-[82vh] max-w-full rounded-2xl shadow-2xl object-contain"
                />
              )}

              {/* Lightbox Prev Button */}
              {post.media.length > 1 && (
                <button
                  onClick={() => setLightboxIndex((prev) => (prev - 1 + post.media.length) % post.media.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/70 hover:bg-black/95 text-white flex items-center justify-center border border-white/20 shadow-2xl hover:scale-110 transition-all"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              {/* Lightbox Next Button */}
              {post.media.length > 1 && (
                <button
                  onClick={() => setLightboxIndex((prev) => (prev + 1) % post.media.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/70 hover:bg-black/95 text-white flex items-center justify-center border border-white/20 shadow-2xl hover:scale-110 transition-all"
                >
                  <ChevronRight size={24} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Share & QR Modal ───────────────────────────────── */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm glass-card p-5 border border-cyan-500/30 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4 border-b border-white/[0.08] pb-3">
                <h3 className="font-display font-bold text-sm text-slate-100">
                  Transmit Frequency Link
                </h3>
                <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="p-3 bg-white/[0.04] border border-white/[0.08] rounded-xl flex items-center justify-between gap-2 mb-4">
                <span className="text-xs font-mono text-cyan-300 truncate">
                  {window.location.origin}/post/{post._id}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="btn-nexus p-2 text-xs rounded-lg shrink-0 flex items-center gap-1"
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setShowShareModal(false);
                  handleNativeShare();
                }}
                className="w-full py-2.5 rounded-xl btn-ghost text-xs font-semibold"
              >
                Open System Share Menu
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Comments Drawer ────────────────────────────────── */}
      <AnimatePresence>
        {showComments && (
          <CommentSection
            postId={post._id}
            onClose={() => setShowComments(false)}
            commentsCount={post.commentsCount}
            onCountUpdate={(n) => setPost((p) => ({ ...p, commentsCount: n }))}
          />
        )}
      </AnimatePresence>
    </>
  );
}
