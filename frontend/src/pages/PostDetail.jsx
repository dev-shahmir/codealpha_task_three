import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Sparkles } from 'lucide-react';
import api from '../api/axios';
import PostCard from '../components/PostCard';

export default function PostDetail() {
  const { id } = useParams();

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['post-detail', id],
    queryFn: async () => {
      const { data } = await api.get(`/posts/${id}`);
      return data.post;
    },
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back button */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-semibold mb-5 transition-colors"
      >
        <ArrowLeft size={14} />
        <span>Return to Pulse Stream</span>
      </Link>

      {isLoading ? (
        <div className="glass-card p-6 h-96 skeleton rounded-2xl" />
      ) : isError || !post ? (
        <div className="text-center py-20 glass-card p-8 border border-white/[0.06]">
          <Sparkles size={36} className="mx-auto mb-3 text-cyan-400 opacity-40" />
          <h2 className="font-display font-bold text-lg text-slate-100">Transmission Anomaly</h2>
          <p className="text-xs text-slate-400 mt-1">This pulse may have expired or was purged from Nexus.</p>
        </div>
      ) : (
        <div>
          <PostCard post={post} />
        </div>
      )}
    </div>
  );
}
