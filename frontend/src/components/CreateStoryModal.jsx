import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, UploadCloud, Image as ImageIcon, Send, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';

export default function CreateStoryModal({ onClose, onCreated }) {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image transmission');
      return;
    }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) {
      toast.error('Please upload an image for your pulse');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', image);
    formData.append('caption', caption);

    try {
      const { data } = await api.post('/stories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Pulse broadcasted to Nexus ✨');
      if (onCreated) onCreated(data.story);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to broadcast pulse');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-md glass-card p-5 border border-cyan-500/30 relative shadow-[0_0_50px_rgba(0,242,254,0.2)]"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-400 to-purple-600 text-white shadow-[0_0_12px_rgba(0,242,254,0.5)]">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="font-display font-bold text-base text-slate-100">Broadcast 24h Pulse</h2>
            <p className="text-xs text-slate-400">Share temporary transmission across Nexus</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`w-full h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative ${
              imagePreview
                ? 'border-cyan-400/50 bg-black'
                : 'border-white/20 hover:border-cyan-400/50 bg-white/[0.02] hover:bg-white/[0.05]'
            }`}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400 p-4 text-center">
                <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-400">
                  <UploadCloud size={24} />
                </div>
                <p className="text-xs font-semibold text-slate-200">Tap to upload visual pulse</p>
                <p className="text-[11px] text-slate-500">Supports PNG, JPG, GIF up to 10MB</p>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Caption */}
          <div>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add pulse frequency caption (optional)..."
              maxLength={300}
              className="nexus-input py-2.5 text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!image || isUploading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl btn-nexus text-xs font-semibold disabled:opacity-50"
            >
              {isUploading ? (
                <span>Transmitting...</span>
              ) : (
                <>
                  <Send size={13} />
                  <span>Transmit Pulse</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
