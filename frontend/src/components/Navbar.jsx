import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio, Compass, Film, MessageSquare, Bell, Bookmark,
  Trophy, User, PlusCircle, LogOut, Search, Zap, X, Sun, Moon, Edit3
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../contexts/authStore';
import CreatePost from './CreatePost';
import { useSocket, useOnlineUsers } from '../contexts/SocketContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../api/axios';

const AURA_LEVEL_COLORS = {
  newbie:    'text-slate-400',
  rising:    'text-emerald-400',
  glowing:   'text-cyan-300',
  radiant:   'text-pink-400',
  legendary: 'text-gradient font-bold',
};

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const onlineUsers = useOnlineUsers();
  const isUserOnline = user?._id ? onlineUsers.includes(user._id.toString()) : false;
  const { isDark, toggleTheme } = useTheme();
  const socket = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch initial notifications and unread messages count
  useEffect(() => {
    const fetchCounters = async () => {
      try {
        const [notifRes, msgRes] = await Promise.all([
          api.get('/users/me/notifications'),
          api.get('/messages/conversations'),
        ]);
        setNotifCount(notifRes.data.unreadCount || 0);
        const totalUnread = (msgRes.data.conversations || []).reduce(
          (sum, c) => sum + (c.unreadCount || 0),
          0
        );
        setUnreadMsgCount(totalUnread);
      } catch (_) {}
    };
    fetchCounters();
  }, [location.pathname]);

  // Real-time socket events for notifications and direct messages
  useEffect(() => {
    if (!socket) return;

    const handleNewNotif = () => {
      setNotifCount((prev) => prev + 1);
      toast('🔔 New Intel Received', { icon: '📡' });
    };

    const handleNewMsg = (data) => {
      if (!location.pathname.startsWith('/messages')) {
        setUnreadMsgCount((prev) => prev + 1);
        toast(`💬 Transmission from @${data.message?.sender?.username || 'Node'}`, {
          icon: '⚡',
        });
      }
    };

    socket.on('notification', handleNewNotif);
    socket.on('receive_message', handleNewMsg);

    return () => {
      socket.off('notification', handleNewNotif);
      socket.off('receive_message', handleNewMsg);
    };
  }, [socket, location.pathname]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await api.get(`/users/search/people?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(data.users || []);
      } catch (_) {} finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('Node disconnected from NEXUS');
  };

  const navItems = [
    { to: '/',              icon: Radio,         label: 'Main Pulse' },
    { to: '/explore',        icon: Compass,       label: 'Radar Explore' },
    { to: '/clips',          icon: Film,          label: 'Holo Clips' },
    { to: '/messages',       icon: MessageSquare, label: 'Comms (DMs)', badge: unreadMsgCount },
    { to: '/notifications',  icon: Bell,          label: 'Intel & Alerts', badge: notifCount },
    { to: '/saved',          icon: Bookmark,      label: 'Saved Vault' },
    { to: '/leaderboard',    icon: Trophy,        label: 'Resonance Board' },
    { to: `/${user?.username}`, icon: User,       label: 'Node Identity' },
  ];

  const activeClass = 'bg-gradient-to-r from-cyan-500/15 via-purple-500/10 to-transparent text-cyan-300 font-bold border-l-2 border-cyan-400 shadow-[inset_0_0_15px_rgba(0,242,254,0.1)]';
  const inactiveClass = 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border-l-2 border-transparent';

  return (
    <>
      {/* ─── Desktop Left Dock Sidebar ─────────────────────────────────────────── */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 flex-col justify-between p-4 border-r border-[var(--border-subtle)] bg-[var(--bg-sidebar)] backdrop-blur-2xl z-40 transition-colors duration-200">
        <div className="flex flex-col gap-1">
          {/* Futuristic NEXUS Logo & Theme Switcher */}
          <div className="flex items-center justify-between px-2 mb-3">
            <NavLink to="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 via-purple-600 to-pink-500 p-[1px] shadow-[0_0_20px_rgba(0,242,254,0.4)] group-hover:shadow-[0_0_30px_rgba(0,242,254,0.7)] transition-all">
                <div className="w-full h-full bg-[var(--bg-surface)] rounded-[11px] flex items-center justify-center">
                  <span className="text-cyan-400 font-black text-xl tracking-tighter">◈</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-display font-black text-2xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-400">
                  NEXUS
                </span>
                <span className="text-[10px] tracking-widest uppercase text-cyan-400/80 font-mono -mt-1">
                  Social Mesh
                </span>
              </div>
            </NavLink>

            {/* Dark / Light Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 hover:text-cyan-300 transition-all"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-cyan-400" />}
            </button>
          </div>

          {/* Quick Search Bar */}
          <div className="relative mb-3">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] transition-all text-xs"
            >
              <div className="flex items-center gap-2.5">
                <Search size={15} className="text-cyan-400" />
                <span>Search Network...</span>
              </div>
              <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-400 font-mono">⌘K</span>
            </button>

            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  className="absolute top-full left-0 right-0 mt-2 glass-card p-3 shadow-2xl z-50 border border-cyan-500/30"
                >
                  <div className="relative mb-2">
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search nodes by username..."
                      className="nexus-input py-2 text-xs !pl-8 !pr-7"
                    />
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {isSearching && (
                    <p className="text-xs text-cyan-400 py-2 text-center animate-pulse font-mono">
                      Scanning frequencies...
                    </p>
                  )}

                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {searchResults.map((u) => (
                      <button
                        key={u._id}
                        onClick={() => {
                          navigate(`/${u.username}`);
                          setShowSearch(false);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.06] transition-colors text-left"
                      >
                        <img
                          src={u.avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${u.username}`}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover ring-1 ring-cyan-400/40"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">
                            {u.displayName || u.username}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">@{u.username}</p>
                        </div>
                        <span className={`text-[10px] ${AURA_LEVEL_COLORS[u.auraLevel || 'newbie']}`}>
                          ⚡ {u.auraScore || 0}
                        </span>
                      </button>
                    ))}
                    {searchQuery && !isSearching && searchResults.length === 0 && (
                      <p className="text-xs text-slate-500 py-3 text-center">No nodes found on this frequency</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            {navItems.map(({ to, icon: Icon, label, badge }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-sm ${
                    isActive ? activeClass : inactiveClass
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <span>{label}</span>
                </div>
                {badge > 0 && (
                  <span className="text-[10px] bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)]">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Quick Transmit / Create Button */}
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl btn-nexus text-sm font-semibold tracking-wide"
          >
            <PlusCircle size={18} />
            <span>Transmit Pulse</span>
          </button>
        </div>

        {/* User Identity Footer */}
        <div className="pt-3 border-t border-white/[0.08]">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-cyan-500/30 transition-all">
            <NavLink to={`/${user?.username}`} className="relative">
              <img
                src={user?.avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${user?.username}`}
                alt={user?.username}
                className="w-9 h-9 rounded-full object-cover ring-1 ring-cyan-400/50"
              />
              {isUserOnline && (
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-[#0E0E18] shadow-[0_0_6px_#10B981]" />
              )}
            </NavLink>
            <NavLink to={`/${user?.username}`} className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {user?.displayName || user?.username}
              </p>
              <div className="flex items-center gap-1.5">
                <Zap size={11} className="text-cyan-400" />
                <span className="text-[11px] font-mono text-cyan-300 truncate">
                  {user?.auraScore || 0} Resonance
                </span>
              </div>
            </NavLink>
            <div className="flex items-center gap-1">
              <NavLink
                to={`/${user?.username}`}
                title="Edit Profile"
                className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors"
              >
                <Edit3 size={15} />
              </NavLink>
              <button
                onClick={handleLogout}
                title="Disconnect"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Mobile Bottom Glowing Dock ────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border-subtle)] bg-[var(--bg-sidebar)] backdrop-blur-2xl px-2 py-2 transition-colors duration-200">
        <div className="flex items-center justify-around">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center p-2 rounded-xl transition-all ${
                isActive ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(0,242,254,0.6)]' : 'text-slate-400'
              }`
            }
          >
            <Radio size={20} />
            <span className="text-[9px] mt-0.5 font-medium">Pulse</span>
          </NavLink>

          <NavLink
            to="/explore"
            className={({ isActive }) =>
              `flex flex-col items-center p-2 rounded-xl transition-all ${
                isActive ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(0,242,254,0.6)]' : 'text-slate-400'
              }`
            }
          >
            <Compass size={20} />
            <span className="text-[9px] mt-0.5 font-medium">Radar</span>
          </NavLink>

          {/* Mobile Center Quick Transmit Button */}
          <button
            onClick={() => setShowCreate(true)}
            className="w-11 h-11 -mt-5 rounded-full btn-nexus flex items-center justify-center text-white shadow-[0_0_18px_rgba(0,242,254,0.6)] active:scale-95 transition-transform"
            title="Transmit Pulse"
          >
            <PlusCircle size={24} />
          </button>

          <NavLink
            to="/messages"
            className={({ isActive }) =>
              `flex flex-col items-center p-2 rounded-xl transition-all relative ${
                isActive ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(0,242,254,0.6)]' : 'text-slate-400'
              }`
            }
          >
            <MessageSquare size={20} />
            <span className="text-[9px] mt-0.5 font-medium">Comms</span>
            {unreadMsgCount > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_6px_#FF007A]" />
            )}
          </NavLink>

          <button
            onClick={toggleTheme}
            className="flex flex-col items-center p-2 rounded-xl text-slate-400 hover:text-cyan-300 transition-all"
            title={isDark ? 'Light Mode' : 'Dark Mode'}
          >
            {isDark ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-cyan-400" />}
            <span className="text-[9px] mt-0.5 font-medium">{isDark ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </nav>

      {/* ─── Create Post Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreate && <CreatePost onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </>
  );
}
