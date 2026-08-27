import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Trash2, Eye, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../api/axios';
import useAuthStore from '../contexts/authStore';

const STORY_DURATION = 5000; // 5 seconds per story

export default function StoryViewer({ userStoriesGroup, allGroups, currentGroupIndex, onClose, onStoryDeleted }) {
  const { user: currentUser } = useAuthStore();
  const [groupIndex, setGroupIndex] = useState(currentGroupIndex || 0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const pausedTimeRef = useRef(0);

  const currentGroup = allGroups[groupIndex] || userStoriesGroup;
  const currentStories = currentGroup?.stories || [];
  const currentStory = currentStories[storyIndex];
  const isOwn = currentGroup?.isOwn || currentGroup?.author?._id === currentUser?._id;

  // Mark story as viewed on backend
  useEffect(() => {
    if (currentStory && !isOwn) {
      api.post(`/stories/${currentStory._id}/view`).catch(() => {});
    }
  }, [currentStory?._id, isOwn]);

  const handleNext = useCallback(() => {
    if (storyIndex < currentStories.length - 1) {
      setStoryIndex((prev) => prev + 1);
      setProgress(0);
    } else if (groupIndex < allGroups.length - 1) {
      setGroupIndex((prev) => prev + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [storyIndex, currentStories.length, groupIndex, allGroups.length, onClose]);

  const handlePrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      const prevGroup = allGroups[groupIndex - 1];
      setGroupIndex((prev) => prev - 1);
      setStoryIndex(prevGroup.stories.length - 1);
      setProgress(0);
    }
  }, [storyIndex, groupIndex, allGroups]);

  // Progress timer loop
  useEffect(() => {
    if (isPaused || !currentStory) return;

    const interval = 50;
    const increment = (interval / STORY_DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPaused, currentStory, handleNext]);

  const handleDeleteStory = async () => {
    if (!currentStory) return;
    try {
      await api.delete(`/stories/${currentStory._id}`);
      toast.success('Pulse deleted');
      if (onStoryDeleted) onStoryDeleted(currentStory._id);
      if (currentStories.length <= 1) {
        onClose();
      } else {
        handleNext();
      }
    } catch {
      toast.error('Failed to delete pulse');
    }
  };

  if (!currentGroup || !currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl select-none">
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <img
          src={currentStory.media?.url}
          alt=""
          className="w-full h-full object-cover blur-3xl scale-125"
        />
      </div>

      {/* Main Story Container */}
      <div
        className="relative w-full max-w-sm h-full max-h-[85vh] sm:rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,242,254,0.3)] border border-white/10 bg-black flex flex-col justify-between"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Top Header & Segmented Progress Bars */}
        <div className="absolute top-0 inset-x-0 z-20 p-3.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          {/* Progress Bars */}
          <div className="flex gap-1.5 mb-3">
            {currentStories.map((s, idx) => (
              <div key={s._id} className="h-1 flex-1 bg-white/25 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-300 transition-all ease-linear"
                  style={{
                    width:
                      idx === storyIndex
                        ? `${progress}%`
                        : idx < storyIndex
                        ? '100%'
                        : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Author Meta */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={currentGroup.author?.avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${currentGroup.author?.username}`}
                alt=""
                className="w-8 h-8 rounded-full object-cover ring-1 ring-cyan-400"
              />
              <div>
                <p className="text-xs font-bold text-white leading-tight">
                  @{currentGroup.author?.username}
                </p>
                <p className="text-[10px] text-slate-300 font-mono">
                  {formatDistanceToNow(new Date(currentStory.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {isOwn && (
                <button
                  onClick={handleDeleteStory}
                  className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors"
                  title="Purge Pulse"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Media Container */}
        <div className="w-full h-full flex items-center justify-center bg-black relative">
          <img
            src={currentStory.media?.url}
            alt=""
            className="w-full h-full object-contain pointer-events-none"
          />

          {/* Click zones for navigation */}
          <div
            className="absolute left-0 top-16 bottom-16 w-1/3 cursor-pointer z-10"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
          />
          <div
            className="absolute right-0 top-16 bottom-16 w-1/3 cursor-pointer z-10"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          />
        </div>

        {/* Bottom Caption & Viewers */}
        <div className="absolute bottom-0 inset-x-0 z-20 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
          {currentStory.caption && (
            <p className="text-xs text-white leading-relaxed text-center font-medium drop-shadow-md mb-2">
              {currentStory.caption}
            </p>
          )}

          {isOwn && (
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-cyan-300 font-mono">
              <Eye size={13} />
              <span>{currentStory.viewersCount || 0} node synchronizations</span>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Prev / Next Outer Controls */}
      {groupIndex > 0 || storyIndex > 0 ? (
        <button
          onClick={handlePrev}
          className="hidden md:flex absolute left-8 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all hover:scale-110"
        >
          <ChevronLeft size={24} />
        </button>
      ) : null}

      <button
        onClick={handleNext}
        className="hidden md:flex absolute right-8 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all hover:scale-110"
      >
        <ChevronRight size={24} />
      </button>
    </div>
  );
}
