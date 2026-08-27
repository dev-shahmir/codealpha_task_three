import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { X, Image, Film, Upload, Sparkles, Globe, Hash, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useUploadStore } from '../contexts/uploadStore';

const INTEREST_TAGS = [
  'art', 'music', 'gaming', 'fashion', 'food', 'travel', 'fitness',
  'tech', 'movies', 'books', 'sports', 'comedy', 'dance', 'beauty',
  'pets', 'nature', 'photography', 'anime', 'crypto', 'business'
];

export default function CreatePost({ onClose }) {
  const qc = useQueryClient();
  const { startUpload } = useUploadStore();
  const [type, setType] = useState('post'); // 'post' | 'clip'
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [categories, setCategories] = useState([]);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const onDrop = useCallback((accepted) => {
    const maxFiles = type === 'clip' ? 1 : 8;
    const combinedFiles = [...files, ...accepted].slice(0, maxFiles);
    setFiles(combinedFiles);
    setPreviews(
      combinedFiles.map((f) => ({
        url: URL.createObjectURL(f),
        type: f.type.startsWith('video') ? 'video' : 'image',
        name: f.name,
      }))
    );
  }, [type, files]);

  const removeFile = (index, e) => {
    e?.stopPropagation();
    const updatedFiles = files.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    setPreviews(updatedPreviews);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: type === 'clip' ? { 'video/*': [] } : { 'image/*': [], 'video/*': [] },
    maxFiles: type === 'clip' ? 1 : 8,
    maxSize: type === 'clip' ? 200 * 1024 * 1024 : 25 * 1024 * 1024,
  });

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags((prev) => [...prev, t]);
      setTagInput('');
    }
  };

  const toggleCategory = (cat) => {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const handleSubmit = () => {
    if (!caption.trim() && files.length === 0) {
      toast.error('Add a caption or media first');
      return;
    }

    // Trigger background upload and close modal immediately
    startUpload({
      type,
      caption,
      tags,
      categories,
      files,
      queryClient: qc,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-[var(--bg-overlay)] backdrop-blur-md"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 10 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="relative w-full max-w-lg z-10 glass-card border border-white/10 shadow-2xl overflow-hidden max-h-[88vh] flex flex-col my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 via-purple-600 to-pink-500 flex items-center justify-center text-white text-sm font-bold shadow-[0_0_12px_rgba(0,242,254,0.4)]">
              ◈
            </div>
            <h2 className="font-display font-bold text-lg text-slate-100">Transmit Pulse</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Type selector */}
          <div className="flex gap-2 p-1 bg-black/20 rounded-xl border border-white/[0.06]">
            <button
              onClick={() => { setType('post'); setFiles([]); setPreviews([]); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                type === 'post' ? 'btn-nexus text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Image size={16} /> Post (Multi-Images)
            </button>
            <button
              onClick={() => { setType('clip'); setFiles([]); setPreviews([]); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                type === 'clip' ? 'bg-pink-600 text-white shadow-[0_0_12px_rgba(244,63,94,0.5)]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Film size={16} /> Clip 🎬
            </button>
          </div>

          {/* Caption */}
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={type === 'clip' ? "What's this clip giving? 🎬" : "What's the frequency? Transmit your thoughts... ✨"}
            maxLength={2200}
            rows={3}
            className="nexus-input resize-none text-sm"
          />
          <div className="text-xs text-slate-500 text-right -mt-2">{caption.length}/2200</div>

          {/* Media dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-cyan-400 bg-cyan-500/10'
                : 'border-white/15 hover:border-cyan-400/50 hover:bg-white/[0.02]'
            }`}
          >
            <input {...getInputProps()} />
            {previews.length === 0 ? (
              <div className="flex flex-col items-center gap-2 text-slate-400 py-4">
                <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400">
                  <Upload size={24} />
                </div>
                <p className="text-sm font-medium text-slate-200">
                  {isDragActive ? 'Drop media here ✨' : type === 'clip' ? 'Upload clip video (MP4, MOV)' : 'Upload images or video (up to 8 files)'}
                </p>
                <p className="text-xs text-slate-500">
                  {type === 'clip' ? 'Max 200MB' : 'Add multiple photos to create a scrollable gallery'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {previews.map((p, i) => (
                    <div key={i} className="relative group/preview rounded-xl overflow-hidden aspect-square bg-black/40 border border-white/10">
                      {p.type === 'video' ? (
                        <video src={p.url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={p.url} alt="" className="w-full h-full object-cover" />
                      )}
                      <button
                        onClick={(e) => removeFile(i, e)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/80 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow-md"
                        title="Remove image"
                      >
                        <X size={12} />
                      </button>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono">
                        #{i + 1}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-cyan-400 font-mono">
                  + Drop more files to add to carousel ({previews.length}/{type === 'clip' ? 1 : 8})
                </p>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
              <Hash size={13} className="text-cyan-400" /> Network Tags
            </label>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), addTag())}
                placeholder="Add tag + Enter"
                className="nexus-input py-2 text-sm flex-1"
              />
              <button onClick={addTag} className="btn-ghost px-3 text-sm rounded-xl font-bold">+</button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                    className="text-xs bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full cursor-pointer hover:bg-rose-500/20 hover:text-rose-400 transition-colors font-mono"
                  >
                    #{t} ×
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Categories */}
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
              <Globe size={13} className="text-purple-400" /> Radar Categories
            </label>
            <div className="flex flex-wrap gap-1.5">
              {INTEREST_TAGS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`text-xs px-2.5 py-1 rounded-full transition-all ${
                    categories.includes(cat)
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_10px_rgba(0,242,254,0.3)] font-semibold'
                      : 'bg-white/[0.04] text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] shrink-0 bg-white/[0.02]">
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost flex-1 py-2.5 text-xs font-semibold">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!caption.trim() && files.length === 0}
              className="btn-nexus flex-1 py-2.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Sparkles size={15} />
              {type === 'clip' ? 'Transmit Holo Clip 🎬' : 'Transmit Pulse ✨'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
