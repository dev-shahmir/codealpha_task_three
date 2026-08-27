import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Grid3X3, Film, Bookmark, Settings, Edit3,
  UserPlus, UserMinus, Sparkles, Award, Share2, MessageSquare,
  Camera, Image as ImageIcon, X, Check, ShieldCheck, Zap,
  Trash2, Power, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import useAuthStore from '../contexts/authStore';
import { useOnlineUsers } from '../contexts/SocketContext';
import PostCard from '../components/PostCard';

const AURA_LEVEL_COLORS = {
  newbie:    { bg: 'bg-slate-800/60',   text: 'text-slate-400',   border: 'border-slate-700/50', label: '🌱 Newbie' },
  rising:    { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: '⚡ Rising' },
  glowing:   { bg: 'bg-cyan-500/15',    text: 'text-cyan-300',    border: 'border-cyan-500/30',    label: '✨ Glowing' },
  radiant:   { bg: 'bg-pink-500/15',    text: 'text-pink-400',    border: 'border-pink-500/30',    label: '🔥 Radiant' },
  legendary: { bg: 'bg-purple-500/20',  text: 'text-gradient font-bold', border: 'border-purple-500/30', label: '👑 Prime Legendary' },
};

const AURA_MAX = { newbie: 100, rising: 500, glowing: 2500, radiant: 10000, legendary: Infinity };

const ProfileTab = ({ tabs, active, onChange }) => (
  <div className="flex border-b border-white/[0.08] mb-4">
    {tabs.map(({ key, icon: Icon, label }) => (
      <button
        key={key}
        onClick={() => onChange(key)}
        className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs sm:text-sm font-semibold transition-all relative ${
          active === key ? 'text-cyan-300' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Icon size={16} />
        <span>{label}</span>
        {active === key && (
          <motion.div
            layoutId="profileTab"
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 shadow-[0_0_10px_rgba(0,242,254,0.5)]"
          />
        )}
      </button>
    ))}
  </div>
);

const StatPill = ({ value, label, onClick }) => (
  <button
    onClick={onClick}
    disabled={!onClick}
    className={`flex flex-col items-center px-3 py-1 rounded-xl transition-all ${
      onClick ? 'hover:bg-white/[0.05] cursor-pointer' : ''
    }`}
  >
    <span className="font-display font-black text-base sm:text-lg text-slate-100 font-mono">
      {(value || 0).toLocaleString()}
    </span>
    <span className="text-[11px] text-slate-400 font-medium">{label}</span>
  </button>
);

export default function Profile() {
  const { username } = useParams();
  const { user: me, updateUser, logout } = useAuthStore();
  const onlineUsers = useOnlineUsers();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [tab, setTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [editData, setEditData] = useState({ displayName: '', bio: '', vibeStatus: '' });

  // Avatar & Cover upload states
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Followers & Following Modal
  const [listModalType, setListModalType] = useState(null); // 'followers' | 'following' | null
  const [modalUsersList, setModalUsersList] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

  // Fetch profile
  const { data: profileData, isLoading, error } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data } = await api.get(`/users/${username}`);
      return data.user;
    },
  });

  const profile = profileData;
  const isUserOnline = profile?._id ? onlineUsers.includes(profile._id.toString()) : false;

  const isOwn = Boolean(
    me && (
      me.username?.toLowerCase() === (profile?.username || username)?.toLowerCase() ||
      (me._id && profile?._id && me._id.toString() === profile._id.toString())
    )
  );

  useEffect(() => {
    if (profile) {
      setIsFollowing(profile.isFollowing || false);
      setEditData({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        vibeStatus: profile.vibeStatus || '',
      });
    }
  }, [profile]);

  // Fetch posts by tab
  useEffect(() => {
    if (!profile) return;
    const fetchPosts = async () => {
      setPostsLoading(true);
      setPosts([]);
      try {
        const typeMap = { posts: 'post', clips: 'clip', saved: 'post' };
        const { data } = await api.get(`/posts/user/${profile._id}?type=${typeMap[tab]}&limit=18`);
        setPosts(data.posts || []);
      } catch {
        toast.error('Could not load transmissions');
      } finally {
        setPostsLoading(false);
      }
    };
    fetchPosts();
  }, [profile, tab]);

  const handleFollow = async () => {
    const prev = isFollowing;
    setIsFollowing(!prev);
    try {
      const { data } = await api.post(`/users/${profile._id}/follow`);
      toast.success(data.action === 'locked_in' ? `Synced with @${profile.username} ⚡` : `Unsynced from @${profile.username}`);
      qc.invalidateQueries({ queryKey: ['profile', username] });
    } catch {
      setIsFollowing(prev);
      toast.error('Action failed');
    }
  };

  // Open Followers/Following Modal
  const openUsersListModal = async (type) => {
    if (!profile?._id) return;
    setListModalType(type);
    setIsLoadingList(true);
    try {
      const { data } = await api.get(`/users/${profile._id}/${type}`);
      setModalUsersList(data[type] || []);
    } catch {
      toast.error(`Could not load ${type}`);
    } finally {
      setIsLoadingList(false);
    }
  };

  // Save Edit Profile with Avatar & Cover
  const handleSaveEdit = async () => {
    setIsSavingEdit(true);
    try {
      // 1. Text updates
      const { data } = await api.put('/users/me/update', editData);
      updateUser(data.user);

      // 2. Avatar upload if selected
      if (avatarFile) {
        const avatarFormData = new FormData();
        avatarFormData.append('avatar', avatarFile);
        const avRes = await api.put('/users/me/avatar', avatarFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        updateUser({ avatar: avRes.data.avatar });
      }

      // 3. Cover upload if selected
      if (coverFile) {
        const coverFormData = new FormData();
        coverFormData.append('cover', coverFile);
        const covRes = await api.put('/users/me/cover', coverFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        updateUser({ coverImage: covRes.data.coverImage });
      }

      qc.invalidateQueries({ queryKey: ['profile', username] });
      toast.success('Node Identity updated ✨');
      setShowEdit(false);
      setAvatarFile(null);
      setCoverFile(null);
    } catch {
      toast.error('Update failed');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Remove Avatar Picture
  const handleRemoveAvatar = async () => {
    try {
      await api.delete('/users/me/avatar');
      updateUser({ avatar: { url: '', publicId: '' } });
      qc.invalidateQueries({ queryKey: ['profile', username] });
      setAvatarPreview(null);
      setAvatarFile(null);
      toast.success('Profile picture removed 🖼️');
    } catch {
      toast.error('Could not remove profile picture');
    }
  };

  // Remove Cover Banner
  const handleRemoveCover = async () => {
    try {
      await api.delete('/users/me/cover');
      updateUser({ coverImage: { url: '', publicId: '' } });
      qc.invalidateQueries({ queryKey: ['profile', username] });
      setCoverPreview(null);
      setCoverFile(null);
      toast.success('Cover banner removed 🌄');
    } catch {
      toast.error('Could not remove cover banner');
    }
  };

  // Temporarily Deactivate Account
  const handleDeactivateAccount = async () => {
    if (!window.confirm('Deactivate Node? Your profile will be hidden until you log back in.')) return;
    try {
      await api.patch('/users/me/deactivate');
      toast.success('Node deactivated 🌙');
      await logout();
      navigate('/login');
    } catch {
      toast.error('Deactivation failed');
    }
  };

  // Permanently Delete Account
  const handleDeleteAccount = async () => {
    const confirmInput = window.prompt('DANGER: This will PERMANENTLY delete your account, posts, and data from NEXUS. Type "DELETE" to confirm:');
    if (confirmInput !== 'DELETE') {
      if (confirmInput !== null) toast.error('Account deletion cancelled (confirmation mismatch)');
      return;
    }
    try {
      await api.delete('/users/me');
      toast.success('Account permanently deleted 👋');
      await logout();
      navigate('/register');
    } catch {
      toast.error('Account deletion failed');
    }
  };

  const level = profile?.auraLevel || 'newbie';
  const levelInfo = AURA_LEVEL_COLORS[level] || AURA_LEVEL_COLORS.newbie;
  const maxScore = AURA_MAX[level] === Infinity ? (profile?.auraScore || 0) : AURA_MAX[level];
  const prevMax = { newbie: 0, rising: 100, glowing: 500, radiant: 2500, legendary: 10000 }[level] || 0;
  const progressPct = Math.min(100, ((profile?.auraScore - prevMax) / (maxScore - prevMax)) * 100) || 0;

  const TABS = [
    { key: 'posts', icon: Grid3X3, label: 'Pulses' },
    { key: 'clips', icon: Film,    label: 'Holo Clips' },
    ...(isOwn ? [{ key: 'saved', icon: Bookmark, label: 'Vault' }] : []),
  ];

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-8 animate-pulse">
        <div className="h-44 rounded-3xl skeleton mb-4" />
        <div className="flex gap-4 -mt-10 px-4 mb-4">
          <div className="w-20 h-20 rounded-full skeleton border-4 border-[#07070D]" />
          <div className="flex-1 pt-12 space-y-2">
            <div className="h-4 w-32 rounded skeleton" />
            <div className="h-3 w-24 rounded skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center py-24 gap-4 text-center px-4 glass-card max-w-md mx-auto my-8 border border-white/[0.06]">
        <div className="text-5xl animate-pulse">📡</div>
        <h2 className="font-display font-bold text-xl text-slate-100">Node Signal Offline</h2>
        <p className="text-slate-400 text-xs">This user frequency is not active on the NEXUS mesh.</p>
        <Link to="/" className="btn-nexus px-5 py-2 text-xs font-semibold">
          Return to Main Pulse
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* ─── Cover Banner ────────────────────────────────────── */}
      <div className="relative h-44 md:h-56 overflow-hidden sm:rounded-b-3xl border-b border-white/[0.08] bg-black group">
        {profile.coverImage?.url ? (
          <img src={profile.coverImage.url} alt="cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-cyan-500/25 via-purple-600/20 to-pink-500/20 nexus-grid-bg" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-app)] via-transparent to-transparent" />
        {isOwn && (
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              onClick={() => setShowEdit(true)}
              className="bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-1.5 shadow-lg transition-all"
              title="Change Cover Banner"
            >
              <Camera size={14} /> <span>Change Banner</span>
            </button>
            {profile.coverImage?.url && (
              <button
                onClick={handleRemoveCover}
                className="bg-black/60 hover:bg-rose-950/80 backdrop-blur-md text-rose-300 hover:text-rose-200 text-xs font-semibold p-2 rounded-xl border border-rose-500/30 shadow-lg transition-all"
                title="Remove Cover Banner"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── Profile Header Info ─────────────────────────────── */}
      <div className="px-4 -mt-12 pb-4">
        <div className="flex items-end justify-between mb-3.5">
          {/* Avatar with Status */}
          <div className="relative group w-24 h-24 sm:w-28 sm:h-28 shrink-0">
            <div className="w-full h-full rounded-2xl overflow-hidden border-4 border-[var(--bg-app)] shadow-2xl ring-2 ring-cyan-400/50 bg-[var(--bg-surface)]">
              <img
                src={profile.avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${profile.username}`}
                alt={profile.username}
                className="w-full h-full object-cover aspect-square"
              />
            </div>
            {isOwn && (
              <button
                onClick={() => setShowEdit(true)}
                className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-cyan-300 text-[10px] font-bold cursor-pointer"
                title="Change Avatar"
              >
                <Camera size={20} />
                <span>Edit</span>
              </button>
            )}
            {isUserOnline && (
              <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full ring-2 ring-[var(--bg-app)] shadow-[0_0_8px_#10B981] z-10" />
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pb-1">
            {isOwn ? (
              <button
                onClick={() => setShowEdit(true)}
                className="btn-nexus flex items-center gap-2 px-4 py-2 text-xs font-bold text-white shadow-[0_0_18px_rgba(0,242,254,0.4)] hover:scale-105 transition-all"
              >
                <Edit3 size={15} />
                <span>Edit Profile</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleFollow}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isFollowing
                      ? 'btn-ghost'
                      : 'btn-nexus text-white shadow-md'
                  }`}
                >
                  {isFollowing ? <><UserMinus size={14} /> Synced</> : <><UserPlus size={14} /> Sync Node</>}
                </button>
                <button
                  onClick={async () => {
                    try {
                      const { data } = await api.post(`/messages/initiate/${profile.username}`);
                      navigate('/messages', { state: { autoSelectConvId: data.conversation?._id } });
                    } catch {
                      toast.error('Could not initiate frequency');
                    }
                  }}
                  className="btn-ghost p-2 rounded-xl text-cyan-300 hover:text-cyan-200"
                  title="Direct Transmission"
                >
                  <MessageSquare size={16} />
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Node frequency link copied 🔗');
                  }}
                  className="btn-ghost p-2 rounded-xl"
                  title="Share Node"
                >
                  <Share2 size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Display Name & Badge */}
        <div className="mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display font-black text-xl text-slate-100">
              {profile.displayName || profile.username}
            </h1>
            {profile.isVerified && (
              <span className="flex items-center gap-1 text-[11px] bg-cyan-500/15 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30 font-mono font-bold">
                <ShieldCheck size={12} /> Verified Node
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-mono">@{profile.username}</p>
        </div>

        {/* Vibe Status Pill */}
        {profile.vibeStatus && (
          <div className="inline-flex items-center gap-2 bg-white/[0.04] px-3 py-1 rounded-full text-xs text-slate-300 mb-3 border border-white/[0.06]">
            {isUserOnline && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            <span>{profile.vibeStatus}</span>
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-3.5 whitespace-pre-wrap">
            {profile.bio}
          </p>
        )}

        {/* ─── Resonance Energy Card ───────────────────────── */}
        <div className="glass-card p-3.5 mb-4 border border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-purple-500/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-cyan-400" />
              <span className="text-xs font-bold font-display text-slate-200">Resonance Level</span>
            </div>
            <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-bold ${levelInfo.bg} ${levelInfo.text} ${levelInfo.border}`}>
              {levelInfo.label}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-display font-black text-2xl text-cyan-300 font-mono">
              {(profile.auraScore || 0).toLocaleString()}
            </span>
            <div className="flex-1">
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 shadow-[0_0_8px_rgba(0,242,254,0.6)]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Stats Pillars ───────────────────────────────── */}
        <div className="flex items-center justify-around glass-card p-3 mb-4 border border-white/[0.06]">
          <StatPill value={profile.postsCount} label="Pulses" />
          <div className="w-px h-7 bg-white/[0.08]" />
          <StatPill
            value={profile.followersCount}
            label="Synced Nodes"
            onClick={() => openUsersListModal('followers')}
          />
          <div className="w-px h-7 bg-white/[0.08]" />
          <StatPill
            value={profile.followingCount}
            label="Syncing With"
            onClick={() => openUsersListModal('following')}
          />
        </div>
      </div>

      {/* ─── Post Tabs ───────────────────────────────────────── */}
      <ProfileTab tabs={TABS} active={tab} onChange={setTab} />

      {/* ─── Posts Grid ──────────────────────────────────────── */}
      <div className="px-4">
        {postsLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl skeleton" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center glass-card p-8 border border-white/[0.06]">
            <div className="text-3xl mb-2">{tab === 'clips' ? '🎬' : '📡'}</div>
            <p className="text-slate-300 font-semibold text-xs mb-1">No transmissions in this frequency</p>
            <p className="text-slate-500 text-[11px]">
              {isOwn ? 'Broadcast your first pulse to the network' : 'This user has no pulses yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {posts.map((post) => (
              <div
                key={post._id}
                onClick={() => setSelectedPost(post)}
                className="aspect-square relative rounded-2xl overflow-hidden cursor-pointer group bg-black/60 border border-white/[0.06] hover:border-cyan-400/50 transition-all"
              >
                {post.media?.[0] ? (
                  post.media[0].type === 'video' ? (
                    <video src={post.media[0].url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img
                      src={post.media[0].url}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-slate-400">
                    {post.caption}
                  </div>
                )}

                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-xs font-mono font-bold">
                  <span>⚡ {post.auraCount || 0}</span>
                  <span>💬 {post.commentsCount || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Selected Post Dialog ────────────────────────────── */}
      <AnimatePresence>
        {selectedPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl"
            >
              <PostCard post={selectedPost} />
              <button
                onClick={() => setSelectedPost(null)}
                className="absolute -top-3 -right-3 z-30 w-8 h-8 rounded-full bg-black border border-white/20 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                ✕
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Edit Profile Modal with Avatar & Cover Upload ───── */}
      <AnimatePresence>
        {showEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-card p-5 border border-cyan-500/30 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-4 border-b border-white/[0.08] pb-3">
                <h3 className="font-display font-bold text-base text-slate-100">
                  Update Node Identity
                </h3>
                <button onClick={() => setShowEdit(false)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Cover Banner Upload & Remove */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Cover Banner</label>
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => coverInputRef.current?.click()}
                      className="flex-1 h-20 rounded-xl border border-dashed border-white/20 hover:border-cyan-400/50 cursor-pointer overflow-hidden relative flex items-center justify-center bg-black/40 group"
                    >
                      {coverPreview || profile.coverImage?.url ? (
                        <img
                          src={coverPreview || profile.coverImage.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <ImageIcon size={14} />
                          <span>Upload Banner</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-cyan-300 font-bold">
                        Change Banner
                      </div>
                    </div>
                    {(coverPreview || profile.coverImage?.url) && (
                      <button
                        type="button"
                        onClick={handleRemoveCover}
                        className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
                        title="Remove Banner"
                      >
                        <Trash2 size={15} />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={coverInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCoverFile(file);
                        setCoverPreview(URL.createObjectURL(file));
                      }
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {/* Avatar Upload & Remove */}
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => avatarInputRef.current?.click()}
                    className="w-16 h-16 rounded-full border border-dashed border-cyan-400/50 cursor-pointer overflow-hidden relative flex items-center justify-center bg-black/40 group shrink-0"
                  >
                    <img
                      src={avatarPreview || profile.avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${profile.username}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Camera size={16} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="text-xs font-bold text-cyan-300 hover:underline block"
                    >
                      Change Avatar
                    </button>
                    <p className="text-[10px] text-slate-500">Square PNG or JPG recommended</p>
                  </div>
                  {(avatarPreview || profile.avatar?.url) && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
                      title="Remove Avatar"
                    >
                      <Trash2 size={15} />
                      <span className="hidden sm:inline">Remove</span>
                    </button>
                  )}
                  <input
                    type="file"
                    ref={avatarInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setAvatarFile(file);
                        setAvatarPreview(URL.createObjectURL(file));
                      }
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {/* Text fields */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Display Name</label>
                  <input
                    value={editData.displayName}
                    onChange={(e) => setEditData((d) => ({ ...d, displayName: e.target.value }))}
                    className="nexus-input py-2 text-xs"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Bio Frequency</label>
                  <textarea
                    value={editData.bio}
                    onChange={(e) => setEditData((d) => ({ ...d, bio: e.target.value }))}
                    className="nexus-input py-2 text-xs resize-none"
                    rows={3}
                    maxLength={160}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Current Vibe</label>
                  <input
                    value={editData.vibeStatus}
                    onChange={(e) => setEditData((d) => ({ ...d, vibeStatus: e.target.value }))}
                    className="nexus-input py-2 text-xs"
                    maxLength={100}
                    placeholder="e.g. In the quantum zone ✨"
                  />
                </div>

                {/* Account Protocols / Danger Zone */}
                <div className="pt-4 mt-4 border-t border-white/[0.08] space-y-3">
                  <h4 className="text-xs font-bold font-display text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Account Settings & Protocols
                  </h4>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={handleDeactivateAccount}
                      className="flex-1 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Power size={14} />
                      <span>Deactivate Node (Temp)</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      className="flex-1 py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Trash2 size={14} />
                      <span>Delete Identity (Permanent)</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEdit(false)}
                  className="btn-ghost flex-1 py-2.5 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  className="btn-nexus flex-1 py-2.5 text-xs font-semibold disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving...' : 'Synchronize Identity'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Followers / Following List Modal ────────────────── */}
      <AnimatePresence>
        {listModalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm glass-card p-5 border border-cyan-500/30 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4 border-b border-white/[0.08] pb-3">
                <h3 className="font-display font-bold text-sm text-slate-100 uppercase tracking-wider">
                  {listModalType === 'followers' ? 'Synced Nodes' : 'Syncing With'}
                </h3>
                <button onClick={() => setListModalType(null)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2">
                {isLoadingList ? (
                  <p className="text-xs text-cyan-400 py-6 text-center animate-pulse">Loading nodes...</p>
                ) : modalUsersList.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No nodes in this frequency list</p>
                ) : (
                  modalUsersList.map((u) => (
                    <div
                      key={u._id}
                      onClick={() => {
                        setListModalType(null);
                        navigate(`/${u.username}`);
                      }}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.05] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={u.avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${u.username}`}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-cyan-400/40"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate">
                            {u.displayName || u.username}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">@{u.username}</p>
                        </div>
                      </div>
                      <span className="text-[11px] text-cyan-300 font-mono">View →</span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
