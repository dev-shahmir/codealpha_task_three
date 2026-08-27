import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Sparkles, AlertCircle, User, Mail, Lock, CheckCircle2, Zap } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import useAuthStore from '../contexts/authStore';

const INTEREST_TAGS = [
  { id: 'art',          emoji: '🎨', label: 'Art'          },
  { id: 'music',        emoji: '🎵', label: 'Music'        },
  { id: 'gaming',       emoji: '🎮', label: 'Gaming'       },
  { id: 'fashion',      emoji: '👗', label: 'Fashion'      },
  { id: 'food',         emoji: '🍜', label: 'Food'         },
  { id: 'travel',       emoji: '✈️', label: 'Travel'       },
  { id: 'fitness',      emoji: '💪', label: 'Fitness'      },
  { id: 'tech',         emoji: '💻', label: 'Tech'         },
  { id: 'movies',       emoji: '🎬', label: 'Movies'       },
  { id: 'books',        emoji: '📚', label: 'Books'        },
  { id: 'sports',       emoji: '⚽', label: 'Sports'       },
  { id: 'comedy',       emoji: '😂', label: 'Comedy'       },
  { id: 'dance',        emoji: '💃', label: 'Dance'        },
  { id: 'beauty',       emoji: '💄', label: 'Beauty'       },
  { id: 'pets',         emoji: '🐾', label: 'Pets'         },
  { id: 'nature',       emoji: '🌿', label: 'Nature'       },
  { id: 'photography',  emoji: '📸', label: 'Photography'  },
  { id: 'anime',        emoji: '⛩️', label: 'Anime'        },
  { id: 'crypto',       emoji: '🪙', label: 'Crypto'       },
  { id: 'business',     emoji: '📈', label: 'Business'     },
];

const STEPS = [
  { id: 'account',   label: 'Account',   emoji: '🔑' },
  { id: 'identity',  label: 'Identity',  emoji: '✨' },
  { id: 'interests', label: 'Interests', emoji: '🎯' },
];

const StepIndicator = ({ steps, current }) => (
  <div className="flex items-center gap-2 mb-6">
    {steps.map((step, i) => {
      const idx = steps.findIndex((s) => s.id === current);
      const done = i < idx;
      const active = step.id === current;
      return (
        <div key={step.id} className="flex items-center gap-2 flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
            done
              ? 'bg-emerald-500 text-white shadow-[0_0_10px_#10B981]'
              : active
              ? 'bg-gradient-to-tr from-cyan-400 to-purple-600 text-white shadow-[0_0_12px_rgba(0,242,254,0.6)]'
              : 'bg-white/5 text-slate-500'
          }`}>
            {done ? <CheckCircle2 size={14} /> : step.emoji}
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 rounded transition-all duration-500 ${done ? 'bg-emerald-500' : 'bg-white/10'}`} />
          )}
        </div>
      );
    })}
  </div>
);

export default function Register() {
  const navigate = useNavigate();
  const { register, googleAuth } = useAuthStore();

  const [step, setStep] = useState('account');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleInterest = (id) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : prev.length < 10 ? [...prev, id] : prev
    );
  };

  const validateAccount = () => {
    if (!form.username.trim()) return 'Username is required';
    if (!/^[a-zA-Z0-9_.]{3,20}$/.test(form.username)) return 'Username: 3-20 chars, letters/numbers/._';
    if (!form.email.trim()) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Invalid email format';
    if (!form.password) return 'Password is required';
    if (form.password.length < 6) return 'Password must be at least 6 characters';
    return null;
  };

  const handleNextStep = () => {
    setError('');
    if (step === 'account') {
      const err = validateAccount();
      if (err) { setError(err); return; }
      setStep('identity');
    } else if (step === 'identity') {
      setStep('interests');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setGoogleLoading(true);
      setError('');
      await googleAuth(credentialResponse.credential);
      toast.success('Welcome to NEXUS ✨');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Google signup failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (interests.length < 3) {
      setError('Pick at least 3 interest frequencies to calibrate your feed');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(form.username, form.email, form.password, interests);
      toast.success('Welcome to NEXUS ✨ Node synchronized');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      setStep('account');
    } finally {
      setLoading(false);
    }
  };

  const slideVariants = {
    enter: { opacity: 0, x: 25 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -25 },
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center px-4 relative overflow-hidden py-8 nexus-grid-bg">
      {/* Background blobs */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="blob w-[520px] h-[520px] bg-cyan-500/10 -top-40 -right-20"
        />
        <motion.div
          animate={{ x: [0, -20, 0], y: [0, 40, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="blob w-[450px] h-[450px] bg-purple-600/10 -bottom-20 -left-10"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <Link to="/login" className="inline-flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 via-purple-600 to-pink-500 flex items-center justify-center text-white font-bold text-2xl shadow-xl border border-white/20">
              ◈
            </div>
            <span className="font-display font-black text-2xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-400">
              NEXUS
            </span>
          </Link>
        </div>

        <div className="glass-card p-6 sm:p-7 border border-white/[0.08] shadow-2xl">
          <StepIndicator steps={STEPS} current={step} />

          <AnimatePresence mode="wait">
            {/* ─── Step 1: Account ──────────────────────── */}
            {step === 'account' && (
              <motion.div
                key="account"
                variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="font-display font-bold text-lg text-slate-100">Initialize Node Account</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Quick setup in less than a minute 🔑</p>
                </div>

                {/* Google Sign Up */}
                <div className="mb-2">
                  <div className="flex justify-center w-full">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setError('Google sign up failed')}
                      theme="filled_black"
                      shape="pill"
                      size="large"
                      text="signup_with"
                      width="100%"
                    />
                  </div>
                  {googleLoading && (
                    <p className="text-xs text-cyan-400 text-center mt-2 animate-pulse font-mono">
                      Setting up Google frequency...
                    </p>
                  )}
                  <div className="relative flex py-3 items-center">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="flex-shrink mx-3 text-[10px] uppercase font-mono tracking-wider text-slate-500">
                      or manual node registration
                    </span>
                    <div className="flex-grow border-t border-white/10"></div>
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Username</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      value={form.username}
                      onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))}
                      placeholder="yourhandle"
                      className="nexus-input !pl-10 py-2.5 text-xs"
                      maxLength={20}
                      autoComplete="username"
                    />
                    {form.username.length >= 3 && /^[a-zA-Z0-9_.]+$/.test(form.username) && (
                      <CheckCircle2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-400" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">@{form.username || 'yourhandle'}</p>
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="node@nexus.network"
                      className="nexus-input !pl-10 py-2.5 text-xs"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="Min. 6 characters"
                      className="nexus-input !pl-10 !pr-10 py-2.5 text-xs"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl text-xs"
                    >
                      <AlertCircle size={14} />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleNextStep}
                  className="btn-nexus w-full py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-lg mt-2"
                >
                  Continue →
                </button>
              </motion.div>
            )}

            {/* ─── Step 2: Identity ─────────────────────── */}
            {step === 'identity' && (
              <motion.div
                key="identity"
                variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="font-display font-bold text-lg text-slate-100">Node Identity</h2>
                  <p className="text-xs text-slate-400 mt-0.5">How your signal broadcasts across NEXUS ✨</p>
                </div>

                {/* Preview card */}
                <div className="glass-card p-4 flex items-center gap-3 border border-cyan-500/30">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 via-purple-600 to-pink-500 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                    {form.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-100">{form.username}</span>
                      <span className="text-[10px] text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full font-mono">🌱 Newbie</span>
                    </div>
                    <p className="text-xs text-cyan-300 font-mono mt-0.5">0 Resonance</p>
                  </div>
                </div>

                <div className="bg-white/[0.03] rounded-xl p-3.5 text-xs text-slate-400 border border-white/[0.06] space-y-1.5">
                  <p className="text-slate-200 font-bold text-xs mb-2">NEXUS Core Features:</p>
                  <p>⚡ <strong className="text-cyan-300">Resonance</strong> — Broadcast & sync energy to level up</p>
                  <p>💬 <strong className="text-purple-400">Comms</strong> — Real-time neural direct messaging</p>
                  <p>📡 <strong className="text-pink-400">Pulses & Stories</strong> — 24h visual broadcasts</p>
                  <p>🔒 <strong className="text-emerald-400">Sync Node</strong> — Connect with other network creators</p>
                  <p>🔥 <strong className="text-amber-400">Quantum Reactions</strong> — Based / Cringe pulse ratings</p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep('account')} className="btn-ghost flex-1 py-2.5 text-xs font-semibold">
                    ← Back
                  </button>
                  <button onClick={handleNextStep} className="btn-nexus flex-1 py-2.5 text-xs font-semibold">
                    Next →
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─── Step 3: Interests ────────────────────── */}
            {step === 'interests' && (
              <motion.div
                key="interests"
                variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="font-display font-bold text-lg text-slate-100">Calibrate Frequencies</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pick at least 3 interests · {interests.length}/10 calibrated
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                  {INTEREST_TAGS.map((tag) => {
                    const selected = interests.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleInterest(tag.id)}
                        className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-xs font-semibold transition-all border ${
                          selected
                            ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(0,242,254,0.3)]'
                            : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:bg-white/[0.06]'
                        }`}
                      >
                        <span className="text-lg">{tag.emoji}</span>
                        <span className="truncate w-full text-center text-[11px]">{tag.label}</span>
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl text-xs"
                    >
                      <AlertCircle size={13} />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3">
                  <button onClick={() => setStep('identity')} className="btn-ghost flex-1 py-2.5 text-xs font-semibold">
                    ← Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || interests.length < 3}
                    className="btn-nexus flex-1 py-2.5 text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <span>Synchronizing Node...</span>
                    ) : (
                      <>
                        <Zap size={14} />
                        <span>Synchronize ✨</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Already have a node identity?{' '}
          <Link to="/login" className="text-cyan-300 font-bold hover:underline">
            Synchronize Log In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
