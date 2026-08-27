import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bookmark, Sparkles, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/axios';
import PostCard from '../components/PostCard';

export default function SavedPosts() {
  const [viewMode, setViewMode] = useState('feed'); // 'feed' | 'grid'

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['saved-posts'],
    queryFn: async () => {
      const { data } = await api.get('/posts/saved?limit=30');
      return data.posts || [];
    },
  });

  const posts = data || [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-400 to-pink-500 text-white shadow-[0_0_15px_rgba(255,183,3,0.4)]">
            <Bookmark size={20} />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-slate-100">Saved Vault</h1>
            <p className="text-xs text-slate-400">Archived transmissions and frequencies</p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className={`p-2 rounded-xl btn-ghost ${isRefetching ? 'animate-spin' : ''}`}
          title="Refresh Vault"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* ─── Posts Stream ────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card p-4 h-64 skeleton rounded-2xl" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 glass-card p-8 border border-white/[0.06]">
          <Bookmark size={36} className="mx-auto mb-3 text-amber-400 opacity-40" />
          <h3 className="font-display font-bold text-base text-slate-200">Vault Empty</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
            Bookmark posts from the main pulse stream to archive them in your personal vault.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <motion.div
              key={post._id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <PostCard post={post} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
