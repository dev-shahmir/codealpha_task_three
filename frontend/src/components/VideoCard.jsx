import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Zap, MessageCircle, Share2, Volume2, VolumeX,
  MoreHorizontal, Music2, Play, Pause, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import api from '../api/axios';
import useAuthStore from '../contexts/authStore';
import AuraParticles from './AuraParticles';
import CommentSection from './CommentSection';

export default function VideoCard({ clip: initialClip, isActive }) {
  const { user } = useAuthStore();
  const [clip, setClip] = useState(initialClip);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showAura, setShowAura] = useState(false);
  const [auraParticle, setAuraParticle] = useState({ trigger: false, x: 0, y: 0 });
  const [showPlayPause, setShowPlayPause] = useState(false);
  const videoRef = useRef(null);
  const auraRef = useRef(null);
  const tapTimer = useRef(null);

  // Auto play/pause based on visibility with safe promise handling
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.log('Autoplay fallback:', err);
            video.muted = true;
            setIsMuted(true);
            video.play().then(() => setIsPlaying(true)).catch(() => {});
          });
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  const togglePlayPause = (e) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
    setShowPlayPause(true);
    setTimeout(() => setShowPlayPause(false), 800);
  };

  const handleVideoClick = () => {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
      handleDoubleTapAura();
      return;
    }
    tapTimer.current = setTimeout(() => {
      tapTimer.current = null;
      togglePlayPause();
    }, 250);
  };

  const handleDoubleTapAura = () => {
    if (!clip.hasAura) {
      handleAura(null, 0, 0);
    }
    setShowAura(true);
    setTimeout(() => setShowAura(false), 1000);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setProgress((video.currentTime / video.duration) * 100);
  };

  const handleAura = async (e, cx, cy) => {
    if (e) { e.stopPropagation(); }
    const rect = auraRef.current?.getBoundingClientRect();
    const px = cx || (rect ? rect.left + rect.width / 2 : 0);
    const py = cy || (rect ? rect.top + rect.height / 2 : 0);
    setAuraParticle({ trigger: Date.now(), x: px, y: py });

    const wasAura = clip.hasAura;
    setClip((c) => ({ ...c, hasAura: !wasAura, auraCount: wasAura ? Math.max(0, c.auraCount - 1) : (c.auraCount || 0) + 1 }));
    try {
      await api.post(`/posts/${clip._id}/aura`);
      if (!wasAura) toast('✨ Resonance synchronized!', { icon: '⚡' });
    } catch {
      setClip((c) => ({ ...c, hasAura: wasAura, auraCount: wasAura ? c.auraCount + 1 : Math.max(0, c.auraCount - 1) }));
    }
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${clip._id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `NEXUS Holo Clip by @${clip.author?.username}`,
          text: clip.caption || 'Check out this Holo Clip on NEXUS',
          url,
        });
      } catch (_) {}
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Holo clip link copied 🔗');
    }
  };

  return (
    <>
      <AuraParticles trigger={auraParticle.trigger} x={auraParticle.x} y={auraParticle.y} />

      <div className="clip-item bg-[#07070D] flex items-center justify-center relative overflow-hidden" onClick={handleVideoClick}>
        {/* Ambient video blur background */}
        <video
          src={clip.media?.[0]?.url}
          className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-25 scale-125 pointer-events-none"
          muted
          loop
          playsInline
        />

        {/* Video in natural aspect ratio */}
        <video
          ref={videoRef}
          src={clip.media?.[0]?.url}
          className="relative z-10 w-full h-full max-h-[100dvh] object-contain"
          loop
          muted={isMuted}
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setProgress(100)}
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none z-10" />

        {/* Play/Pause indicator */}
        <AnimatePresence>
          {showPlayPause && (
            <motion.div
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 1.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            >
              <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center shadow-[0_0_30px_rgba(0,242,254,0.4)]">
                {isPlaying ? <Pause size={36} className="text-cyan-300" /> : <Play size={36} className="text-cyan-300" />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Double-tap pulse burst */}
        <AnimatePresence>
          {showAura && (
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 1.6, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            >
              <Zap size={90} className="text-cyan-300 drop-shadow-[0_0_25px_rgba(0,242,254,0.8)]" fill="currentColor" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Bottom Info ─────────────────────────────────────── */}
        <div className="absolute bottom-0 left-0 right-16 p-4 z-20" onClick={(e) => e.stopPropagation()}>
          {/* Progress bar */}
          <div className="reel-progress mb-3 bg-white/20 h-1 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>

          {/* Author */}
          <div className="flex items-center gap-2.5 mb-2">
            <Link to={`/${clip.author?.username}`}>
              <img
                src={clip.author?.avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${clip.author?.username}`}
                alt={clip.author?.username}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-cyan-400/80 shadow-[0_0_10px_rgba(0,242,254,0.5)]"
              />
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <Link to={`/${clip.author?.username}`} className="font-bold text-white text-sm hover:text-cyan-300 transition-colors">
                  @{clip.author?.username}
                </Link>
                {clip.author?.isVerified && <ShieldCheck size={13} className="text-cyan-400" />}
              </div>
            </div>
          </div>

          {/* Caption */}
          {clip.caption && (
            <p className="text-slate-100 text-xs sm:text-sm mb-2 line-clamp-2 leading-relaxed font-medium">
              {clip.caption}
            </p>
          )}

          {/* Tags */}
          {clip.tags?.length > 0 && (
            <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar">
              {clip.tags.slice(0, 4).map((t) => (
                <span key={t} className="text-[11px] text-cyan-300 font-mono">#{t}</span>
              ))}
            </div>
          )}

          {/* Audio */}
          {clip.audio?.name && (
            <div className="flex items-center gap-2 text-slate-300 text-xs font-mono">
              <motion.div animate={{ rotate: isPlaying ? 360 : 0 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
                <Music2 size={13} className="text-cyan-400" />
              </motion.div>
              <span className="truncate max-w-[180px]">{clip.audio.name} — {clip.audio.artist}</span>
            </div>
          )}
        </div>

        {/* ─── Right Side Floating Action Controls ──────────────── */}
        <div className="video-controls z-20" onClick={(e) => e.stopPropagation()}>
          {/* Resonance / Like */}
          <div className="video-action-btn">
            <motion.button
              ref={auraRef}
              whileTap={{ scale: 0.8 }}
              onClick={(e) => handleAura(e)}
              className={clsx(
                'w-12 h-12 rounded-full flex items-center justify-center transition-all backdrop-blur-md',
                clip.hasAura
                  ? 'bg-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(0,242,254,0.6)] border border-cyan-400/50'
                  : 'bg-black/40 text-white hover:bg-cyan-500/20 border border-white/10'
              )}
            >
              <motion.div animate={clip.hasAura ? { scale: [1, 1.3, 1], rotate: [0, 15, 0] } : {}}>
                <Zap size={22} fill={clip.hasAura ? 'currentColor' : 'none'} />
              </motion.div>
            </motion.button>
            <span className="text-slate-200 text-[11px] font-mono font-bold mt-1">
              {clip.auraCount > 0 ? clip.auraCount.toLocaleString() : 'Pulse'}
            </span>
          </div>

          {/* Comments */}
          <div className="video-action-btn">
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => setShowComments(true)}
              className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-purple-500/20 border border-white/10 transition-all"
            >
              <MessageCircle size={22} />
            </motion.button>
            <span className="text-slate-200 text-[11px] font-mono font-bold mt-1">
              {clip.commentsCount > 0 ? clip.commentsCount : '0'}
            </span>
          </div>

          {/* Share */}
          <div className="video-action-btn">
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={handleShare}
              className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-pink-500/20 border border-white/10 transition-all"
            >
              <Share2 size={20} />
            </motion.button>
            <span className="text-slate-200 text-[11px] font-mono font-bold mt-1">Share</span>
          </div>

          {/* Audio Mute/Unmute */}
          <div className="video-action-btn">
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => setIsMuted(!isMuted)}
              className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/10 border border-white/10 transition-all"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Comments Drawer */}
      <AnimatePresence>
        {showComments && (
          <CommentSection
            postId={clip._id}
            onClose={() => setShowComments(false)}
            commentsCount={clip.commentsCount}
            onCountUpdate={(n) => setClip((c) => ({ ...c, commentsCount: n }))}
          />
        )}
      </AnimatePresence>
    </>
  );
}
