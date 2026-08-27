import { motion, AnimatePresence } from 'framer-motion';
import { useUploadStore } from '../contexts/uploadStore';
import { CheckCircle2, AlertCircle, Loader2, X, Zap } from 'lucide-react';

export default function BackgroundUploadWidget() {
  const { uploads, dismissUpload } = useUploadStore();

  if (!uploads.length) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {uploads.map((upload) => (
          <motion.div
            key={upload.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="pointer-events-auto glass-card p-3 border border-cyan-500/30 shadow-2xl rounded-2xl flex items-center gap-3 bg-[var(--bg-card)] backdrop-blur-xl"
          >
            {/* Thumbnail */}
            {upload.thumbnail ? (
              <img
                src={upload.thumbnail}
                alt=""
                className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0 ring-1 ring-cyan-400/30"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {upload.type === 'clip' ? '🎬' : '📡'}
              </div>
            )}

            {/* Info & Progress */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-bold text-slate-100 truncate">
                  {upload.type === 'clip' ? 'Transmitting Holo Clip' : 'Broadcasting Pulse'}
                </span>
                <span className="text-[11px] font-mono text-cyan-300 font-bold">
                  {upload.status === 'uploading' ? `${upload.progress}%` : upload.status}
                </span>
              </div>

              {/* Progress bar */}
              {upload.status === 'uploading' && (
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-full"
                    animate={{ width: `${upload.progress}%` }}
                    transition={{ ease: 'easeOut' }}
                  />
                </div>
              )}

              {upload.status === 'completed' && (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono font-medium">
                  <CheckCircle2 size={12} /> Broadcast Synced
                </p>
              )}

              {upload.status === 'error' && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1 truncate font-mono">
                  <AlertCircle size={12} /> {upload.error || 'Failed'}
                </p>
              )}
            </div>

            {/* Icon Status or dismiss */}
            <div className="shrink-0 flex items-center gap-1">
              {upload.status === 'uploading' && (
                <Loader2 size={16} className="animate-spin text-cyan-400" />
              )}
              <button
                onClick={() => dismissUpload(upload.id)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
