import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles } from 'lucide-react';
import api from '../api/axios';
import useAuthStore from '../contexts/authStore';
import StoryViewer from './StoryViewer';
import CreateStoryModal from './CreateStoryModal';
import { useSocket } from '../contexts/SocketContext';

export default function StoriesRail() {
  const { user } = useAuthStore();
  const socket = useSocket();
  const [storyGroups, setStoryGroups] = useState([]);
  const [activeGroupIndex, setActiveGroupIndex] = useState(null);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStories = async () => {
    try {
      const { data } = await api.get('/stories');
      setStoryGroups(data.stories || []);
    } catch (_) {} finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  // Real-time story broadcasts via Socket.io
  useEffect(() => {
    if (!socket) return;
    const handleNewStory = () => {
      fetchStories();
    };
    socket.on('new_story', handleNewStory);
    return () => {
      socket.off('new_story', handleNewStory);
    };
  }, [socket]);

  const ownStoryGroup = storyGroups.find(
    (g) => g.isOwn || g.author?._id === user?._id
  );

  return (
    <>
      <div className="glass-card p-3 mb-5 border border-white/[0.08] relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 overflow-x-auto pb-1 no-scrollbar select-none">
          {/* ─── Add / View Your Story ─────────────────────────────── */}
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
            <div className="relative">
              <div
                onClick={() => {
                  if (ownStoryGroup && ownStoryGroup.stories.length > 0) {
                    const idx = storyGroups.findIndex((g) => g.isOwn);
                    setActiveGroupIndex(idx !== -1 ? idx : 0);
                  } else {
                    setShowCreateStory(true);
                  }
                }}
                className={`w-14 h-14 rounded-full p-[2px] ${
                  ownStoryGroup?.stories.length > 0
                    ? 'story-ring-unseen'
                    : 'border border-dashed border-white/20 p-0.5'
                } group-hover:scale-105 transition-transform`}
              >
                <img
                  src={user?.avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${user?.username}`}
                  alt=""
                  className="w-full h-full rounded-full object-cover bg-slate-900"
                />
              </div>

              {/* Plus Badge */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateStory(true);
                }}
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-600 text-white flex items-center justify-center shadow-[0_0_8px_rgba(0,242,254,0.6)] hover:scale-110 active:scale-95 transition-transform"
                title="Add 24h Pulse"
              >
                <Plus size={12} strokeWidth={3} />
              </button>
            </div>
            <span className="text-[11px] font-medium text-slate-300 max-w-[64px] truncate">
              Your Pulse
            </span>
          </div>

          {/* ─── Other Users' Stories ─────────────────────────────── */}
          {storyGroups
            .filter((g) => !(g.isOwn || g.author?._id === user?._id))
            .map((group) => {
              const originalIndex = storyGroups.findIndex((sg) => sg === group);
              return (
                <div
                  key={group.author?._id}
                  onClick={() => setActiveGroupIndex(originalIndex)}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
                >
                  <div
                    className={`w-14 h-14 rounded-full ${
                      group.hasUnseen ? 'story-ring-unseen' : 'story-ring-seen'
                    }`}
                  >
                    <div className="w-full h-full rounded-full bg-[var(--bg-surface)] p-[2px]">
                      <img
                        src={group.author?.avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${group.author?.username}`}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-300 max-w-[64px] truncate group-hover:text-cyan-300 transition-colors">
                    @{group.author?.username}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Create Story Modal */}
      <AnimatePresence>
        {showCreateStory && (
          <CreateStoryModal
            onClose={() => setShowCreateStory(false)}
            onCreated={() => fetchStories()}
          />
        )}
      </AnimatePresence>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {activeGroupIndex !== null && (
          <StoryViewer
            allGroups={storyGroups}
            currentGroupIndex={activeGroupIndex}
            onClose={() => setActiveGroupIndex(null)}
            onStoryDeleted={() => fetchStories()}
          />
        )}
      </AnimatePresence>
    </>
  );
}
