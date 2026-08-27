import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Sparkles, MessageCircle, UserPlus, Heart, Share2, CheckCheck, RefreshCw, Flame, Skull, AtSign } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useSocket } from '../contexts/SocketContext';

const NOTIF_ICONS = {
  aura:    { icon: Sparkles,      color: 'text-cyan-300',   bg: 'bg-cyan-500/10' },
  comment: { icon: MessageCircle, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  reply:   { icon: MessageCircle, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  follow:  { icon: UserPlus,      color: 'text-emerald-400',bg: 'bg-emerald-500/10' },
  share:   { icon: Share2,        color: 'text-pink-400',   bg: 'bg-pink-500/10' },
  based:   { icon: Flame,         color: 'text-amber-400',  bg: 'bg-amber-500/10' },
  cringe:  { icon: Skull,         color: 'text-rose-400',   bg: 'bg-rose-500/10' },
  mention: { icon: AtSign,        color: 'text-cyan-300',   bg: 'bg-cyan-500/10' },
};

export default function Notifications() {
  const navigate = useNavigate();
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/users/me/notifications');
      setNotifications(data.notifications || []);
    } catch (_) {} finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Listen to live notifications from socket
  useEffect(() => {
    if (!socket) return;
    const handleLiveNotif = () => {
      fetchNotifications();
    };
    socket.on('notification', handleLiveNotif);
    return () => socket.off('notification', handleLiveNotif);
  }, [socket]);

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'reactions') return n.type === 'aura' || n.type === 'based';
    if (filter === 'comments') return n.type === 'comment' || n.type === 'reply';
    if (filter === 'follows') return n.type === 'follow';
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-400 to-purple-600 text-white shadow-[0_0_15px_rgba(0,242,254,0.4)]">
            <Bell size={20} />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-slate-100">Intel Feed</h1>
            <p className="text-xs text-slate-400">Network activity and synchronizations</p>
          </div>
        </div>

        <button
          onClick={fetchNotifications}
          className="p-2 rounded-xl btn-ghost hover:rotate-180 transition-transform duration-500"
          title="Refresh Intel"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* ─── Filter Pills ────────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: 'all', label: 'All Intel' },
          { key: 'reactions', label: '⚡ Reactions' },
          { key: 'comments', label: '💬 Comments' },
          { key: 'follows', label: '👥 Network Syncs' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filter === key
                ? 'btn-nexus text-white shadow-md'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 border border-white/[0.06]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ─── Notifications Stream ────────────────────────────────────────── */}
      <div className="space-y-2.5">
        {filteredNotifs.map((n) => {
          const config = NOTIF_ICONS[n.type] || NOTIF_ICONS.aura;
          const Icon = config.icon;

          return (
            <motion.div
              key={n._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-3.5 border border-white/[0.06] hover:border-cyan-500/30 transition-all flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Sender Avatar & Type Badge */}
                <Link to={`/${n.sender?.username}`} className="relative flex-shrink-0">
                  <img
                    src={n.sender?.avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${n.sender?.username}`}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10"
                  />
                  <div className={`absolute -bottom-1 -right-1 p-1 rounded-full ${config.bg} ${config.color} ring-2 ring-[#0F0F1B]`}>
                    <Icon size={10} />
                  </div>
                </Link>

                {/* Content */}
                <div className="min-w-0">
                  <p className="text-xs text-slate-200 leading-snug">
                    <Link
                      to={`/${n.sender?.username}`}
                      className="font-bold hover:text-cyan-300 transition-colors mr-1"
                    >
                      @{n.sender?.username}
                    </Link>
                    <span className="text-slate-400">
                      {n.message || (
                        <>
                          {n.type === 'aura' && 'resonated with your transmission ✨'}
                          {n.type === 'follow' && 'synchronized with your node 🔒'}
                          {n.type === 'comment' && 'dropped a frequency on your pulse 💬'}
                          {n.type === 'reply' && 'replied to your comment 💬'}
                          {n.type === 'based' && 'marked your post as Based 🔥'}
                          {n.type === 'cringe' && 'marked your post as Cringe 💀'}
                          {n.type === 'share' && 'rebroadcasted your pulse 🔁'}
                          {n.type === 'mention' && 'mentioned your frequency in a transmission 📡'}
                        </>
                      )}
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Post Thumbnail if associated with post */}
              {n.post && n.post.media?.[0]?.url && (
                <Link to={`/post/${n.post._id}`} className="flex-shrink-0">
                  <img
                    src={n.post.media[0].url}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover ring-1 ring-white/10 group-hover:ring-cyan-400/50 transition-all"
                  />
                </Link>
              )}
            </motion.div>
          );
        })}

        {!isLoading && filteredNotifs.length === 0 && (
          <div className="text-center py-16 glass-card p-6 border border-white/[0.06]">
            <Bell size={32} className="mx-auto mb-2 text-cyan-400 opacity-40" />
            <p className="text-sm font-semibold text-slate-200">Intel Matrix Clear</p>
            <p className="text-xs text-slate-500 mt-1">No new transmissions or notifications recorded.</p>
          </div>
        )}
      </div>
    </div>
  );
}
