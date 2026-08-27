import { create } from 'zustand';
import api from '../api/axios';
import toast from 'react-hot-toast';

export const useUploadStore = create((set, get) => ({
  uploads: [], // [{ id, type, caption, progress, status: 'uploading' | 'completed' | 'error', error }]

  startUpload: async ({ type, caption, tags, categories, files, queryClient }) => {
    const id = Date.now().toString();
    const newUpload = {
      id,
      type,
      caption,
      progress: 0,
      status: 'uploading',
      thumbnail: files[0] ? URL.createObjectURL(files[0]) : null,
      fileCount: files.length,
    };

    set((state) => ({ uploads: [newUpload, ...state.uploads] }));
    toast.success('Uploading in background 🚀');

    try {
      const formData = new FormData();
      formData.append('caption', caption);
      formData.append('type', type);
      formData.append('tags', JSON.stringify(tags || []));
      formData.append('categories', JSON.stringify(categories || []));

      if (type === 'clip' && files[0]) {
        formData.append('video', files[0]);
      } else {
        files.forEach((f) => formData.append('images', f));
      }

      const endpoint = type === 'clip' ? '/posts/clips' : '/posts';

      await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded / e.total) * 100);
          set((state) => ({
            uploads: state.uploads.map((u) => (u.id === id ? { ...u, progress: percent } : u)),
          }));
        },
      });

      set((state) => ({
        uploads: state.uploads.map((u) => (u.id === id ? { ...u, progress: 100, status: 'completed' } : u)),
      }));

      toast.success(type === 'clip' ? 'Clip dropped successfully 🎬' : 'Post published ✨');
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['feed'] });
        queryClient.invalidateQueries({ queryKey: ['clips'] });
      }

      // Automatically remove from list after 4 seconds
      setTimeout(() => {
        set((state) => ({ uploads: state.uploads.filter((u) => u.id !== id) }));
      }, 4000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Upload failed';
      set((state) => ({
        uploads: state.uploads.map((u) => (u.id === id ? { ...u, status: 'error', error: msg } : u)),
      }));
      toast.error(`Upload failed: ${msg}`);
    }
  },

  dismissUpload: (id) => {
    set((state) => ({ uploads: state.uploads.filter((u) => u.id !== id) }));
  },
}));
