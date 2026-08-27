import { useState, useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Search, MessageSquare, Plus, ArrowLeft, Check, CheckCheck, Sparkles, User, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../api/axios';
import useAuthStore from '../contexts/authStore';
import { useSocket } from '../contexts/SocketContext';

export default function Messages() {
  const { user } = useAuthStore();
  const socket = useSocket();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch messages for active conversation
  const selectConversation = async (conv) => {
    if (!conv?._id) return;
    setActiveConversation(conv);
    try {
      const { data } = await api.get(`/messages/c/${conv._id}`);
      setMessages(data.messages || []);
      // Reset unread count locally
      setConversations((prev) =>
        prev.map((c) => (c._id === conv._id ? { ...c, unreadCount: 0 } : c))
      );
    } catch {
      toast.error('Failed to load frequency messages');
    }
  };

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const { data } = await api.get('/messages/conversations');
      const convList = data.conversations || [];
      setConversations(convList);

      // Check if autoSelectConvId passed via navigation
      const targetConvId = location.state?.autoSelectConvId || searchParams.get('c');
      if (targetConvId) {
        const found = convList.find((c) => c._id === targetConvId);
        if (found) {
          selectConversation(found);
          return;
        }
      }

      // Check if direct message target username passed
      const targetUser = searchParams.get('to');
      if (targetUser) {
        const initRes = await api.post(`/messages/initiate/${targetUser}`);
        if (initRes.data.conversation) {
          setConversations((prev) => {
            const exists = prev.some((c) => c._id === initRes.data.conversation._id);
            return exists ? prev : [initRes.data.conversation, ...prev];
          });
          selectConversation(initRes.data.conversation);
          return;
        }
      }

      // If on desktop and nothing active yet, select first conversation
      if (!activeConversation && convList.length > 0 && window.innerWidth >= 768) {
        selectConversation(convList[0]);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchConversations();
  }, [location.key]);

  // Socket.io Real-time Message Listener
  useEffect(() => {
    if (!socket) return;

    socket.on('online_users', (users) => {
      setOnlineUserIds(users || []);
    });

    socket.on('receive_message', ({ message, conversationId }) => {
      if (activeConversation && activeConversation._id === conversationId) {
        setMessages((prev) => [...prev, message]);
      }
      fetchConversations();
    });

    socket.on('user_typing_dm', () => {
      setPartnerTyping(true);
    });

    socket.on('user_stop_typing_dm', () => {
      setPartnerTyping(false);
    });

    return () => {
      socket.off('receive_message');
      socket.off('user_typing_dm');
      socket.off('user_stop_typing_dm');
      socket.off('online_users');
    };
  }, [socket, activeConversation]);

  // Join/leave conversation socket rooms
  useEffect(() => {
    if (!socket || !activeConversation) return;

    socket.emit('join_conversation', activeConversation._id);

    return () => {
      socket.emit('leave_conversation', activeConversation._id);
    };
  }, [socket, activeConversation]);

  // Handle typing indicator
  const handleTextChange = (e) => {
    setMessageText(e.target.value);

    if (!socket || !activeConversation) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing_dm', {
        conversationId: activeConversation._id,
        username: user?.username,
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('stop_typing_dm', {
        conversationId: activeConversation._id,
      });
    }, 1500);
  };

  // Send Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConversation) return;

    const currentText = messageText.trim();
    setMessageText('');

    try {
      const { data } = await api.post('/messages', {
        conversationId: activeConversation._id,
        text: currentText,
      });

      setMessages((prev) => [...prev, data.message]);

      // Update conversation last message in list
      setConversations((prev) =>
        prev.map((c) =>
          c._id === activeConversation._id
            ? { ...c, lastMessage: { text: currentText, createdAt: new Date() } }
            : c
        )
      );

      if (socket) {
        socket.emit('stop_typing_dm', {
          conversationId: activeConversation._id,
        });
      }
    } catch {
      toast.error('Transmission failed');
    }
  };

  // Search users for new chat
  useEffect(() => {
    if (!searchUserQuery.trim()) {
      setSearchedUsers([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/users/search/people?q=${encodeURIComponent(searchUserQuery)}`);
        setSearchedUsers(data.users || []);
      } catch (_) {}
    }, 300);
    return () => clearTimeout(timer);
  }, [searchUserQuery]);

  // Start chat with user
  const handleStartChatWithUser = async (targetUsername) => {
    try {
      const { data } = await api.post(`/messages/initiate/${targetUsername}`);
      setShowNewChatModal(false);
      setSearchUserQuery('');
      await fetchConversations();
      selectConversation(data.conversation);
    } catch {
      toast.error('Could not initiate frequency');
    }
  };

  return (
    <div className="h-[calc(100vh-5rem)] lg:h-[calc(100vh-2rem)] max-w-6xl mx-auto p-2 sm:p-4 flex flex-col">
      {/* Container Box */}
      <div className="glass-card flex-1 flex overflow-hidden border border-[var(--border-base)] shadow-2xl relative">
        {/* ─── Left Sidebar: Conversation List ──────────────────────────── */}
        <div
          className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-[var(--border-base)] bg-[var(--bg-sidebar)] ${
            activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-[var(--border-base)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <MessageSquare size={18} />
              </div>
              <h2 className="font-display font-bold text-base text-slate-100">Nexus Comms</h2>
            </div>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-2 rounded-xl btn-nexus text-white shadow-sm hover:scale-105 transition-transform"
              title="New Transmission"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {conversations.map((conv) => {
              const isActive = activeConversation?._id === conv._id;
              const isOnline = onlineUserIds.includes(conv.participant?._id);

              return (
                <div
                  key={conv._id}
                  onClick={() => selectConversation(conv)}
                  className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 via-purple-500/10 to-transparent border border-cyan-500/30'
                      : 'hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={conv.participant?.avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${conv.participant?.username}`}
                      alt=""
                      className="w-11 h-11 rounded-full object-cover ring-1 ring-white/10"
                    />
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-[var(--bg-sidebar)] shadow-[0_0_6px_#10B981]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-bold text-slate-200 truncate flex items-center gap-1">
                        {conv.participant?.displayName || conv.participant?.username}
                        {conv.participant?.isVerified && (
                          <ShieldCheck size={12} className="text-cyan-400 inline" />
                        )}
                      </p>
                      {conv.lastMessage?.createdAt && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {conv.lastMessage?.text || 'Frequency initialized'}
                    </p>
                  </div>

                  {conv.unreadCount > 0 && (
                    <span className="text-[10px] bg-pink-500 text-white font-bold px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.7)] flex-shrink-0">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              );
            })}

            {conversations.length === 0 && (
              <div className="text-center py-12 px-4 text-slate-500">
                <MessageSquare size={32} className="mx-auto mb-2 opacity-40 text-cyan-400" />
                <p className="text-xs font-semibold text-slate-300">No active frequencies</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Connect with other nodes across Nexus to start chatting.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Right: Active Chat Window ───────────────────────────────── */}
        <div
          className={`flex-1 flex flex-col bg-[var(--bg-card)] ${
            !activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Chat Top Bar */}
              <div className="p-3.5 px-4 border-b border-[var(--border-base)] flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveConversation(null)}
                    className="md:hidden p-1.5 rounded-lg hover:bg-white/10 text-slate-400"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className="relative">
                    <img
                      src={activeConversation.participant?.avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${activeConversation.participant?.username}`}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-cyan-400"
                    />
                    {onlineUserIds.includes(activeConversation.participant?._id) && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-[#07070D] shadow-[0_0_6px_#10B981]" />
                    )}
                  </div>

                  <div>
                    <h3 className="font-display font-bold text-sm text-slate-100 flex items-center gap-1.5">
                      {activeConversation.participant?.displayName || activeConversation.participant?.username}
                      {activeConversation.participant?.isVerified && (
                        <ShieldCheck size={14} className="text-cyan-400" />
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {onlineUserIds.includes(activeConversation.participant?._id)
                        ? '🟢 Synchronized Online'
                        : `@${activeConversation.participant?.username}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
                  const isMe = msg.sender?._id === user?._id || msg.sender === user?._id;

                  return (
                    <div
                      key={msg._id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          isMe
                            ? 'bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-500 text-white shadow-[0_0_15px_rgba(0,242,254,0.2)] rounded-br-none'
                            : 'bg-white/[0.08] text-slate-200 border border-white/[0.08] rounded-bl-none'
                        }`}
                      >
                        <p>{msg.text}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 px-1 font-mono">
                        {format(new Date(msg.createdAt), 'hh:mm a')}
                      </span>
                    </div>
                  );
                })}

                {partnerTyping && (
                  <div className="flex items-center gap-2 text-cyan-400 text-xs py-1 animate-pulse">
                    <span className="text-[10px] font-mono">@{activeConversation.participant?.username} is transmitting...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Box */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-[var(--border-base)] flex items-center gap-2 bg-white/[0.02]"
              >
                <input
                  value={messageText}
                  onChange={handleTextChange}
                  placeholder={`Transmit message to @${activeConversation.participant?.username}...`}
                  className="flex-1 nexus-input py-2.5 text-xs sm:text-sm"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim()}
                  className="p-2.5 rounded-xl btn-nexus text-white disabled:opacity-40 transition-transform active:scale-95"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(0,242,254,0.3)]">
                <MessageSquare size={32} />
              </div>
              <h3 className="font-display font-bold text-lg text-slate-200 mb-1">
                Direct Neural Comms
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Select an active frequency from the left dock or initialize a new transmission to begin real-time communication.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── New Chat Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showNewChatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-card p-5 border border-cyan-500/30 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-base text-slate-100">
                  Initialize Transmission
                </h3>
                <button
                  onClick={() => setShowNewChatModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="relative mb-3">
                <input
                  autoFocus
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  placeholder="Search network nodes..."
                  className="nexus-input py-2 text-xs !pl-8"
                />
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5">
                {searchedUsers.map((u) => (
                  <button
                    key={u._id}
                    onClick={() => handleStartChatWithUser(u.username)}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.06] transition-colors text-left"
                  >
                    <img
                      src={u.avatar?.url || `https://api.dicebear.com/7.x/shapes/svg?seed=${u.username}`}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-cyan-400/40"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">
                        {u.displayName || u.username}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">@{u.username}</p>
                    </div>
                    <span className="text-xs text-cyan-300 font-mono">Connect →</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
