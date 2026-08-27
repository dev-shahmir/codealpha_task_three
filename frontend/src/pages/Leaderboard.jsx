import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Zap, Crown, Award, UserPlus, Check, Sparkles, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';

const AURA_LEVEL_BADGES = {
  newbie: '🌱 Newbie',
  rising: '⚡ Rising',
  glowing: '✨ Glowing',
  radiant: '🔥 Radiant',
  legendary: '👑 Prime Legendary',
};

export default function Leaderboard() {
  const [syncedMap, setSyncedMap] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['resonance-leaderboard'],
    queryFn: async () => {
      const { data } = await api.get('/users/leaderboard/resonance?limit=30');
      return data.leaders || [];
    },
  });

  const leaders = data || [];
  const topThree = leaders.slice(0, 3);
  const remaining = leaders.slice(3);

  const handleFollow = async (targetId, username) => {
    try {
      const { data } = await api.post(`/users/${targetId}/follow`);
      setSyncedMap((prev) => ({ ...prev, [targetId]: data.action === 'locked_in' }));
      toast.success(data.action === 'locked_in' ? `Synced with @${username} ⚡` : `Unsynced from @${username}`);
    } catch {
      toast.error('Failed to sync node');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-400 via-purple-600 to-cyan-400 text-white shadow-[0_0_20px_rgba(255,183,3,0.5)]">
          <Trophy size={22} />
        </div>
        <div>
          <h1 className="font-display font-black text-2xl text-slate-100">
            Resonance Rankings
          </h1>
          <p className="text-xs text-slate-400">Top Synced Nexus Prime Nodes</p>
        </div>
      </div>

      {/* ─── Podium for Top 3 Creators ───────────────────────────────────── */}
      {topThree.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mb-8 items-end pt-8">
          {/* #2 Silver */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-4 pt-6 flex flex-col items-center text-center border border-white/10 relative"
          >
            <div className="absolute -top-5 w-8 h-8 rounded-full bg-slate-300 text-slate-900 font-black text-xs flex items-center justify-center shadow-lg">
              2
            </div>
            <Link to={`/${topThree[1].username}`} className="relative mb-2 group">
              <img
                src={topThree[1].avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${topThree[1].username}`}
                alt=""
                className="w-14 h-14 rounded-full object-cover ring-2 ring-slate-300"
              />
            </Link>
            <p className="text-xs font-bold text-slate-200 truncate w-full">
              {topThree[1].displayName || topThree[1].username}
            </p>
            <p className="text-[11px] text-slate-400 mb-2 truncate w-full">@{topThree[1].username}</p>
            <div className="flex items-center gap-1 text-xs font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full">
              <Zap size={11} />
              <span>{topThree[1].auraScore || 0}</span>
            </div>
          </motion.div>

          {/* #1 Gold Champion */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 pt-8 flex flex-col items-center text-center border border-amber-400/40 bg-gradient-to-b from-amber-500/10 to-transparent relative shadow-[0_0_30px_rgba(255,183,3,0.2)] -mt-4"
          >
            <div className="absolute -top-6 w-10 h-10 rounded-full bg-gradient-to-tr from-amber-300 to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-[0_0_15px_rgba(255,183,3,0.8)] ring-2 ring-white/30">
              👑
            </div>
            <Link to={`/${topThree[0].username}`} className="relative mb-2 group">
              <img
                src={topThree[0].avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${topThree[0].username}`}
                alt=""
                className="w-20 h-20 rounded-full object-cover aspect-square ring-4 ring-amber-400 shadow-[0_0_15px_rgba(255,183,3,0.5)]"
              />
            </Link>
            <p className="text-sm font-black text-slate-100 truncate w-full">
              {topThree[0].displayName || topThree[0].username}
            </p>
            <p className="text-xs text-amber-300 font-mono mb-2 truncate w-full">@{topThree[0].username}</p>
            <div className="flex items-center gap-1 text-xs font-mono text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-400/30">
              <Zap size={13} />
              <span className="font-bold">{topThree[0].auraScore || 0} Resonance</span>
            </div>
          </motion.div>

          {/* #3 Bronze */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-4 pt-6 flex flex-col items-center text-center border border-white/10 relative"
          >
            <div className="absolute -top-5 w-8 h-8 rounded-full bg-amber-700 text-amber-100 font-black text-xs flex items-center justify-center shadow-lg">
              3
            </div>
            <Link to={`/${topThree[2].username}`} className="relative mb-2 group">
              <img
                src={topThree[2].avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${topThree[2].username}`}
                alt=""
                className="w-14 h-14 rounded-full object-cover ring-2 ring-amber-700"
              />
            </Link>
            <p className="text-xs font-bold text-slate-200 truncate w-full">
              {topThree[2].displayName || topThree[2].username}
            </p>
            <p className="text-[11px] text-slate-400 mb-2 truncate w-full">@{topThree[2].username}</p>
            <div className="flex items-center gap-1 text-xs font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full">
              <Zap size={11} />
              <span>{topThree[2].auraScore || 0}</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* ─── Remaining Leaderboard Table ─────────────────────────────────── */}
      <div className="space-y-2">
        {remaining.map((user, idx) => {
          const rank = idx + 4;
          const isSynced = syncedMap[user._id] ?? user.isFollowing;

          return (
            <motion.div
              key={user._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-3.5 flex items-center justify-between gap-3 border border-white/[0.06] hover:border-cyan-500/30 transition-all"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="font-mono text-xs font-bold text-slate-500 w-5 text-center">
                  #{rank}
                </span>

                <Link to={`/${user.username}`} className="relative flex-shrink-0">
                  <img
                    src={user.avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${user.username}`}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10"
                  />
                </Link>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/${user.username}`}
                      className="text-xs font-bold text-slate-200 hover:text-cyan-300 transition-colors truncate"
                    >
                      {user.displayName || user.username}
                    </Link>
                    {user.isVerified && <ShieldCheck size={13} className="text-cyan-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">@{user.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-1 font-mono text-xs text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-xl">
                  <Zap size={12} />
                  <span>{user.auraScore || 0}</span>
                </div>

                <button
                  onClick={() => handleFollow(user._id, user.username)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isSynced
                      ? 'bg-white/10 text-slate-300'
                      : 'btn-nexus text-white hover:scale-105 active:scale-95'
                  }`}
                >
                  {isSynced ? <Check size={12} /> : <UserPlus size={12} />}
                  <span>{isSynced ? 'Synced' : 'Sync'}</span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
