import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Zap, UserPlus, Check, MessageSquare, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import useAuthStore from '../contexts/authStore';
import { useSocket } from '../contexts/SocketContext';

const AURA_LEVEL_BADGES = {
  newbie: '🌱', rising: '⚡', glowing: '✨', radiant: '🔥', legendary: '👑',
};

export default function NexusHub() {
  const { user: me } = useAuthStore();
  const socket = useSocket();
  const navigate = useNavigate();
  const [onlineNodeIds, setOnlineNodeIds] = useState([]);
  const [suggestedNodes, setSuggestedNodes] = useState([]);
  const [trendingTags, setTrendingTags] = useState([
    { tag: 'cyberpunk', count: '14.2k' },
    { tag: 'nexus', count: '9.8k' },
    { tag: 'ai_art', count: '8.4k' },
    { tag: 'synthwave', count: '5.1k' },
    { tag: 'web3', count: '3.7k' },
  ]);
  const [syncedMap, setSyncedMap] = useState({});
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);

  // Socket online users tracker
  useEffect(() => {
    if (!socket) return;
    socket.on('online_users', (users) => {
      setOnlineNodeIds(users || []);
    });
    return () => {
      socket.off('online_users');
    };
  }, [socket]);

  // Fetch suggested nodes
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const { data } = await api.get('/users/suggestions/nodes');
        setSuggestedNodes(data.users || []);
      } catch (_) {} finally {
        setIsLoadingSuggestions(false);
      }
    };
    fetchSuggestions();
  }, []);

  const handleFollow = async (targetId, username) => {
    try {
      const { data } = await api.post(`/users/${targetId}/follow`);
      setSyncedMap((prev) => ({ ...prev, [targetId]: data.action === 'locked_in' }));
      toast.success(data.action === 'locked_in' ? `Synced with @${username} ⚡` : `Unsynced from @${username}`);
    } catch {
      toast.error('Failed to sync node');
    }
  };

  const handleQuickMessage = (username) => {
    navigate('/messages');
  };

  return (
    <aside className="hidden xl:flex flex-col gap-5 w-80 fixed right-4 top-4 bottom-4 overflow-y-auto pr-1">
      {/* ─── Nexus Trending Radar ────────────────────────────────────────── */}
      <div className="glass-card p-4 border border-white/[0.08] relative overflow-hidden">
        <div className="flex items-center gap-2 mb-3.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <TrendingUp size={16} />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-slate-100">Trending Frequencies</h3>
            <p className="text-[11px] text-slate-400">Hot topics across the mesh</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {trendingTags.map(({ tag, count }, i) => (
            <NavLink
              key={tag}
              to={`/explore?tag=${tag}`}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.04] transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono text-cyan-400/70 group-hover:text-cyan-300">
                  0{i + 1}
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                    #{tag}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">{count} pulses</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                Scan 📡
              </span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* ─── Suggested Nodes ─────────────────────────────────────────────── */}
      <div className="glass-card p-4 border border-white/[0.08]">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Users size={16} />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-slate-100">Recommended Nodes</h3>
              <p className="text-[11px] text-slate-400">Creators matching your vibe</p>
            </div>
          </div>
          <NavLink to="/explore" className="text-[11px] text-cyan-400 hover:underline">
            All
          </NavLink>
        </div>

        <div className="space-y-3">
          {suggestedNodes.map((u) => {
            const isSynced = syncedMap[u._id];
            return (
              <div key={u._id} className="flex items-center justify-between gap-2">
                <NavLink to={`/${u.username}`} className="flex items-center gap-2.5 min-w-0 group">
                  <img
                    src={u.avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${u.username}`}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-cyan-400/50 transition-all"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                        {u.displayName || u.username}
                      </p>
                      {u.isVerified && <ShieldCheck size={11} className="text-cyan-400 flex-shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">@{u.username}</p>
                  </div>
                </NavLink>

                <button
                  onClick={() => handleFollow(u._id, u.username)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSynced
                      ? 'bg-white/10 text-slate-300'
                      : 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-[0_0_10px_rgba(0,242,254,0.3)] hover:scale-105 active:scale-95'
                  }`}
                >
                  {isSynced ? <Check size={12} /> : <UserPlus size={12} />}
                  <span>{isSynced ? 'Synced' : 'Sync'}</span>
                </button>
              </div>
            );
          })}

          {!isLoadingSuggestions && suggestedNodes.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-2">All network nodes connected</p>
          )}
        </div>
      </div>

      {/* ─── Resonance Leaderboard Preview Banner ──────────────────────────── */}
      <NavLink
        to="/leaderboard"
        className="glass-card p-3.5 border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-purple-500/5 to-transparent hover:border-cyan-400/50 transition-all block group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-400 to-pink-500 text-white shadow-[0_0_12px_rgba(255,183,3,0.5)]">
              <Zap size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                Resonance Rankings
              </p>
              <p className="text-[11px] text-slate-400">View Top Nexus Prime Creators</p>
            </div>
          </div>
          <span className="text-xs text-cyan-300 font-bold group-hover:translate-x-1 transition-transform">
            →
          </span>
        </div>
      </NavLink>

      {/* ─── Footer Meta ─────────────────────────────────────────────────── */}
      <div className="px-2 text-[11px] text-slate-500 space-y-1 font-mono">
        <div className="flex gap-3">
          <span className="hover:text-slate-400 cursor-pointer">Protocol</span>
          <span>·</span>
          <span className="hover:text-slate-400 cursor-pointer">Privacy Matrix</span>
          <span>·</span>
          <span className="hover:text-slate-400 cursor-pointer">Mesh Node</span>
        </div>
        <p>© 2026 NEXUS Network. All signals operational.</p>
      </div>
    </aside>
  );
}
