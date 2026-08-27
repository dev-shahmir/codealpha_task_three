import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Search, Compass, Hash, X, Film, Grid3X3, List, ShieldCheck, Zap } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';

const TRENDING_TAGS = [
  'cyberpunk', 'nexus', 'ai_art', 'synthwave', 'web3', 'tech',
  'gaming', 'anime', 'vibes', 'music', 'design', 'future',
  'matrix', 'crypto', 'code', 'neon', 'pulse', 'energy'
];

export default function Explore() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTag = searchParams.get('tag');

  const [activeTag, setActiveTag] = useState(initialTag || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const { ref: sentinelRef, inView } = useInView({ threshold: 0.1 });

  useEffect(() => {
    if (initialTag) setActiveTag(initialTag);
  }, [initialTag]);

  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch,
  } = useInfiniteQuery({
    queryKey: ['explore', activeTag],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({ page: pageParam, limit: 18 });
      if (activeTag) params.set('tag', activeTag);
      const { data } = await api.get(`/posts/explore?${params}`);
      return data;
    },
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length + 1 : undefined),
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage]);

  // User search debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await api.get(`/users/search/people?q=${encodeURIComponent(searchQuery)}&limit=10`);
        setSearchResults(data.users || []);
      } catch {
        toast.error('Radar search failed');
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const posts = data?.pages.flatMap((p) => p.posts ?? []) ?? [];

  const handleTagClick = (tag) => {
    if (activeTag === tag) {
      setActiveTag(null);
      setSearchParams({});
    } else {
      setActiveTag(tag);
      setSearchParams({ tag });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-400 to-purple-600 text-white shadow-[0_0_15px_rgba(0,242,254,0.4)]">
            <Compass size={20} />
          </div>
          <div>
            <h1 className="font-display font-black text-xl text-slate-100">
              Nexus Radar
            </h1>
            <p className="text-xs text-slate-400">Discover signals, frequencies & network nodes</p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/[0.06]">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
            }`}
          >
            <Grid3X3 size={15} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
            }`}
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* ─── Search Bar ─────────────────────────────────────────── */}
      <div className="relative mb-5">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search all network nodes by username or display name..."
          className="nexus-input py-3 !pl-10 !pr-10 text-xs sm:text-sm"
        />
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ─── User Search Results Mode ───────────────────────────── */}
      {searchQuery && (
        <div className="glass-card p-4 mb-6 border border-cyan-500/30">
          <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Node Signals Matching "{searchQuery}"
          </p>
          {isSearching ? (
            <p className="text-xs text-cyan-400 py-3 text-center animate-pulse">Scanning mesh network...</p>
          ) : searchResults.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No node found on this frequency</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {searchResults.map((u) => (
                <div
                  key={u._id}
                  onClick={() => navigate(`/${u.username}`)}
                  className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] cursor-pointer flex items-center justify-between gap-3 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={u.avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${u.username}`}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-cyan-400/40"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate flex items-center gap-1">
                        {u.displayName || u.username}
                        {u.isVerified && <ShieldCheck size={12} className="text-cyan-400 inline" />}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">@{u.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-mono text-cyan-300">
                    <Zap size={11} />
                    <span>{u.auraScore || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Trending Frequencies Rail ──────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
        {TRENDING_TAGS.map((tag) => {
          const isSelected = activeTag === tag;
          return (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'btn-nexus text-white shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 border border-white/[0.06]'
              }`}
            >
              <Hash size={12} className={isSelected ? 'text-white' : 'text-cyan-400'} />
              <span>{tag}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Grid View of Posts ─────────────────────────────────── */}
      {!searchQuery && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="aspect-square rounded-xl skeleton" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 glass-card p-8 border border-white/[0.06]">
              <Compass size={36} className="mx-auto mb-3 text-cyan-400 opacity-40" />
              <p className="text-sm font-semibold text-slate-200">
                {activeTag ? `No pulses found for #${activeTag}` : 'Radar quiet'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Try scanning another frequency or tag.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-3 gap-2">
              {posts.map((post, i) => (
                <Link
                  key={post._id}
                  to={`/post/${post._id}`}
                  className="aspect-square relative rounded-2xl overflow-hidden cursor-pointer group bg-black/50 border border-white/[0.06]"
                >
                  {post.media?.[0] ? (
                    post.media[0].type === 'video' ? (
                      <video src={post.media[0].url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img
                        src={post.media[0].url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-3 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10">
                      <p className="text-xs text-slate-300 line-clamp-4 text-center font-medium">{post.caption}</p>
                    </div>
                  )}

                  {/* Hover overlay with pulse details */}
                  <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                    <div className="text-cyan-300 text-xs font-bold font-mono flex items-center gap-1">
                      <Zap size={13} /> {post.auraCount || 0}
                    </div>
                    <div className="text-slate-300 text-[11px] font-mono">
                      💬 {post.commentsCount || 0}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate max-w-full">
                      @{post.author?.username}
                    </p>
                  </div>

                  {post.type === 'clip' && (
                    <div className="absolute top-2 right-2 bg-black/70 rounded-full p-1 shadow-md">
                      <Film size={12} className="text-cyan-300" />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <Link
                  key={post._id}
                  to={`/post/${post._id}`}
                  className="glass-card p-3.5 flex gap-3.5 items-center border border-white/[0.06] hover:border-cyan-500/30 transition-all block group"
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-black/50 border border-white/10">
                    {post.media?.[0] ? (
                      post.media[0].type === 'video' ? (
                        <video src={post.media[0].url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={post.media[0].url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-500/10 to-purple-500/10 text-cyan-400">
                        ◈
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-cyan-300 mb-0.5">@{post.author?.username}</p>
                    <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">{post.caption || '—'}</p>
                    <div className="flex gap-4 mt-2 text-[11px] font-mono text-slate-400">
                      <span>⚡ {post.auraCount || 0} Resonance</span>
                      <span>💬 {post.commentsCount || 0} Drops</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Sentinel */}
          <div ref={sentinelRef} className="py-6 flex justify-center">
            {isFetchingNextPage && (
              <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
            )}
          </div>
        </>
      )}
    </div>
  );
}
