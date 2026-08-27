import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { X, Send, Zap, CornerDownRight, ChevronDown, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import useAuthStore from '../contexts/authStore';

export default function CommentSection({ postId, onClose, commentsCount, onCountUpdate }) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState(new Set());
  const [replies, setReplies] = useState({});
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    fetchComments(1, true);
  }, [postId]);

  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  const fetchComments = async (p = 1, reset = false) => {
    setLoading(p === 1);
    try {
      const { data } = await api.get(`/comments/${postId}?page=${p}&limit=20`);
      setComments((prev) => (reset ? data.comments : [...prev, ...data.comments]));
      setHasMore(data.hasMore);
      setPage(p);
    } catch {
      toast.error('Could not load comments');
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async (commentId) => {
    try {
      const { data } = await api.get(`/comments/${postId}?parentId=${commentId}&limit=50`);
      setReplies((prev) => ({ ...prev, [commentId]: data.comments }));
      setExpandedReplies((prev) => new Set([...prev, commentId]));
    } catch {
      toast.error('Could not load replies');
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/comments/${postId}`, {
        text: text.trim(),
        parentCommentId: replyTo?.id || null,
      });

      if (replyTo) {
        setReplies((prev) => ({
          ...prev,
          [replyTo.id]: [data.comment, ...(prev[replyTo.id] || [])],
        }));
        setComments((prev) =>
          prev.map((c) =>
            c._id === replyTo.id ? { ...c, repliesCount: (c.repliesCount || 0) + 1 } : c
          )
        );
        setExpandedReplies((prev) => new Set([...prev, replyTo.id]));
      } else {
        setComments((prev) => [data.comment, ...prev]);
      }

      onCountUpdate?.((commentsCount || 0) + 1);
      setText('');
      setReplyTo(null);
      toast.success('Transmission dropped 💬');
    } catch {
      toast.error('Could not drop comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAura = async (commentId) => {
    setComments((prev) =>
      prev.map((c) =>
        c._id === commentId
          ? {
              ...c,
              hasAura: !c.hasAura,
              auraCount: c.hasAura ? Math.max(0, c.auraCount - 1) : (c.auraCount || 0) + 1,
            }
          : c
      )
    );
    try {
      await api.post(`/comments/${commentId}/aura`);
    } catch {
      // Revert if error
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      onCountUpdate?.(Math.max(0, (commentsCount || 1) - 1));
      toast.success('Comment removed');
    } catch {
      toast.error('Could not delete comment');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40"
      />

      {/* Drawer */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed bottom-0 inset-x-0 max-w-xl mx-auto z-50 bg-[var(--bg-card)] border-t border-cyan-500/30 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-2xl"
        style={{ maxHeight: '82vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-sm text-slate-100 uppercase tracking-wider">
              Pulse Comments
            </h3>
            <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full">
              {commentsCount || 0}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Comments list */}
        <div ref={listRef} className="overflow-y-auto flex-1 p-4 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full skeleton shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 rounded skeleton" />
                    <div className="h-3 w-full rounded skeleton" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-slate-400">
              <span className="text-4xl mb-2 animate-bounce">💬</span>
              <p className="text-xs font-semibold text-slate-300">No transmissions yet</p>
              <p className="text-[11px] text-slate-500">Be the first node to drop a comment!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment._id} className="group">
                <div className="flex gap-3">
                  <Link to={`/${comment.author?.username}`}>
                    <img
                      src={comment.author?.avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${comment.author?.username}`}
                      alt={comment.author?.username}
                      className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-cyan-400/40"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-none px-3.5 py-2.5">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Link
                          to={`/${comment.author?.username}`}
                          className="text-xs font-bold text-slate-200 hover:text-cyan-300 transition-colors"
                        >
                          @{comment.author?.username}
                        </Link>
                        {comment.author?._id === user?._id && (
                          <button
                            onClick={() => handleDeleteComment(comment._id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-opacity"
                            title="Delete comment"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed break-words">{comment.text}</p>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="flex items-center gap-3 mt-1.5 px-2">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>

                      <button
                        onClick={() => handleAura(comment._id)}
                        className={`flex items-center gap-1 text-[11px] font-mono transition-colors ${
                          comment.hasAura ? 'text-cyan-300 font-bold' : 'text-slate-400 hover:text-cyan-300'
                        }`}
                      >
                        <Zap size={11} fill={comment.hasAura ? 'currentColor' : 'none'} />
                        <span>{comment.auraCount > 0 ? comment.auraCount : 'Resonate'}</span>
                      </button>

                      <button
                        onClick={() => setReplyTo({ id: comment._id, username: comment.author?.username })}
                        className="text-[11px] text-slate-400 hover:text-purple-400 font-medium transition-colors"
                      >
                        Reply
                      </button>
                    </div>

                    {/* Show replies toggle */}
                    {comment.repliesCount > 0 && (
                      <button
                        onClick={() =>
                          expandedReplies.has(comment._id)
                            ? setExpandedReplies((prev) => {
                                const s = new Set(prev);
                                s.delete(comment._id);
                                return s;
                              })
                            : fetchReplies(comment._id)
                        }
                        className="flex items-center gap-1 mt-1.5 px-2 text-[11px] text-purple-400 hover:text-purple-300 font-mono"
                      >
                        <CornerDownRight size={11} />
                        {expandedReplies.has(comment._id) ? 'Hide replies' : `View ${comment.repliesCount} replies`}
                      </button>
                    )}

                    {/* Replies */}
                    {expandedReplies.has(comment._id) &&
                      replies[comment._id]?.map((reply) => (
                        <div key={reply._id} className="flex gap-2.5 mt-2.5 ml-4">
                          <img
                            src={reply.author?.avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${reply.author?.username}`}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-purple-400/40"
                          />
                          <div className="flex-1 bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-1.5">
                            <span className="text-[11px] font-bold text-cyan-300">
                              @{reply.author?.username}
                            </span>
                            <p className="text-xs text-slate-300 mt-0.5">{reply.text}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ))
          )}

          {hasMore && (
            <button
              onClick={() => fetchComments(page + 1)}
              className="w-full py-2 text-xs text-cyan-300 hover:underline flex items-center justify-center gap-1 font-mono"
            >
              <ChevronDown size={14} /> Load more comments
            </button>
          )}
        </div>

        {/* ─── Input Box ─────────────────────────────────────── */}
        <div className="p-3.5 border-t border-[var(--border-base)] bg-[var(--bg-surface)]/90 backdrop-blur-md">
          {replyTo && (
            <div className="flex items-center justify-between px-3 py-1 mb-2 bg-purple-500/15 border border-purple-500/30 rounded-xl">
              <span className="text-xs text-purple-300 font-mono">Replying to @{replyTo.username}</span>
              <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-white">
                <X size={12} />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <img
              src={user?.avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${user?.username}`}
              alt=""
              className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-cyan-400/40"
            />
            <div className="flex-1 flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 focus-within:border-cyan-400/50">
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                placeholder={replyTo ? `Reply to @${replyTo.username}...` : 'Transmit a thought...'}
                className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-500 outline-none"
                maxLength={500}
              />
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || submitting}
                className="text-cyan-400 hover:text-cyan-300 disabled:opacity-30 transition-opacity"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
