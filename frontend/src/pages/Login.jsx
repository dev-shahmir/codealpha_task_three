import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Zap, KeyRound, ArrowLeft, ShieldCheck, RefreshCw } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import useAuthStore from '../contexts/authStore';
import api from '../api/axios';

export default function Login() {
  const navigate = useNavigate();
  const { login, googleAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  // Forgot password
  const [step, setStep] = useState('login'); // 'login'|'forgot_email'|'forgot_otp'|'forgot_reset'
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPass, setFpNewPass] = useState('');
  const [fpConfirmPass, setFpConfirmPass] = useState('');
  const [fpShowPass, setFpShowPass] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState('');
  const [devOtp, setDevOtp] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Please fill in both email and password'); return; }
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Synchronized with NEXUS Network 🌌');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally { setLoading(false); }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setGoogleLoading(true); setError('');
      await googleAuth(credentialResponse.credential);
      toast.success('Welcome to NEXUS ✨');
      navigate('/');
    } catch (err) { setError(err.response?.data?.message || 'Google sign in failed'); }
    finally { setGoogleLoading(false); }
  };

  const handleGoogleError = () => setError('Google sign in was unsuccessful');

  // ── Forgot password handlers ────────────────────────────────────
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setFpError('');
    if (!fpEmail) { setFpError('Enter your email address'); return; }
    setFpLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: fpEmail });
      if (!data.devOtp && !data.otpSent) {
        // Email not registered or Google account — stay on email step
        setFpError('No account found with this email, or this account uses Google sign-in.');
        return;
      }
      if (data.devOtp) setDevOtp(data.devOtp);
      toast.success('Reset code sent! 📬');
      setStep('forgot_otp');
    } catch (err) { setFpError(err.response?.data?.message || 'Failed to send reset code'); }
    finally { setFpLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault(); setFpError('');
    if (fpNewPass !== fpConfirmPass) { setFpError("Passwords don't match"); return; }
    if (fpNewPass.length < 6) { setFpError('Password must be at least 6 characters'); return; }
    setFpLoading(true);
    try {
      await api.post('/auth/reset-password', { email: fpEmail, otp: fpOtp, newPassword: fpNewPass });
      toast.success('Password reset! Log in now 🔐');
      setStep('login');
      setFpEmail(''); setFpOtp(''); setFpNewPass(''); setFpConfirmPass(''); setDevOtp(null);
    } catch (err) { setFpError(err.response?.data?.message || 'Reset failed. Check your code.'); }
    finally { setFpLoading(false); }
  };

  const goBack = () => {
    setFpError('');
    const map = { forgot_email: 'login', forgot_otp: 'forgot_email', forgot_reset: 'forgot_otp' };
    setStep(map[step] || 'login');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center px-4 relative overflow-hidden nexus-grid-bg">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <motion.div animate={{ x: [0,40,0], y: [0,-30,0], scale: [1,1.1,1] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} className="blob w-[520px] h-[520px] bg-cyan-500/10 -top-40 -left-20" />
        <motion.div animate={{ x: [0,-30,0], y: [0,40,0], scale: [1,1.05,1] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }} className="blob w-[450px] h-[450px] bg-purple-600/10 -bottom-20 -right-10" />
      </div>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }} className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex flex-col items-center gap-2.5">
            <motion.div animate={{ boxShadow: ['0 0 25px rgba(0,242,254,0.4)','0 0 45px rgba(121,40,202,0.4)','0 0 25px rgba(255,0,122,0.4)'] }} transition={{ duration: 4, repeat: Infinity }} className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-400 via-purple-600 to-pink-500 flex items-center justify-center text-white text-2xl font-display font-bold shadow-xl border border-white/20">◈</motion.div>
            <h1 className="font-display font-black text-3xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-400">NEXUS</h1>
            <p className="text-slate-400 text-xs tracking-wider uppercase font-mono">Thematic Social Mesh Network</p>
          </div>
        </div>

        <div className="glass-card p-7 relative border border-white/[0.08] shadow-2xl">
          <AnimatePresence mode="wait">

            {/* LOGIN */}
            {step === 'login' && (
              <motion.div key="login" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }} transition={{ duration:0.25 }}>
                <h2 className="font-display font-bold text-lg text-slate-100 mb-1">Synchronize Node</h2>
                <p className="text-xs text-slate-400 mb-5">Enter your credentials to enter the mesh</p>
                <div className="mb-5">
                  <div className="flex justify-center w-full"><GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} theme="filled_black" shape="pill" size="large" text="signin_with" width="100%" /></div>
                  {googleLoading && <p className="text-xs text-cyan-400 text-center mt-2 animate-pulse font-mono">Authenticating frequency...</p>}
                  <div className="relative flex py-4 items-center"><div className="flex-grow border-t border-white/10"></div><span className="flex-shrink mx-4 text-[10px] font-mono uppercase tracking-wider text-slate-500">or continue with node auth</span><div className="flex-grow border-t border-white/10"></div></div>
                </div>
                <AnimatePresence>{error && (<motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs"><AlertCircle size={15} className="flex-shrink-0" /><span>{error}</span></motion.div>)}</AnimatePresence>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Email Frequency</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
                      <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="node@nexus.network" className="nexus-input !pl-10" required />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-400">Security Passkey</label>
                      <button type="button" onClick={() => { setFpEmail(form.email); setStep('forgot_email'); setFpError(''); }} className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono transition-colors">Forgot passkey?</button>
                    </div>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
                      <input type={showPass ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="nexus-input !pl-10 !pr-10" required />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white z-10">{showPass ? <EyeOff size={15}/> : <Eye size={15}/>}</button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-3 rounded-xl btn-nexus text-xs font-semibold tracking-wider uppercase text-white shadow-lg disabled:opacity-50 mt-2 flex items-center justify-center gap-2">{loading ? <span>Calibrating...</span> : <><Zap size={14}/><span>Enter NEXUS</span></>}</button>
                </form>
                <div className="mt-6 pt-4 border-t border-white/[0.08] text-center"><p className="text-xs text-slate-400">New to the mesh?{' '}<Link to="/register" className="text-cyan-300 font-bold hover:underline">Initialize Node Identity</Link></p></div>
              </motion.div>
            )}

            {/* FORGOT — EMAIL STEP */}
            {step === 'forgot_email' && (
              <motion.div key="fp_email" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }} transition={{ duration:0.25 }}>
                <button onClick={goBack} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 mb-5 transition-colors"><ArrowLeft size={14}/> Back to login</button>
                <div className="flex items-center gap-3 mb-5"><div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center"><KeyRound size={18} className="text-cyan-400"/></div><div><h2 className="font-display font-bold text-base text-slate-100">Reset Passkey</h2><p className="text-xs text-slate-400">We'll send a 6-digit code to your email</p></div></div>
                <AnimatePresence>{fpError && (<motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs"><AlertCircle size={14} className="flex-shrink-0"/><span>{fpError}</span></motion.div>)}</AnimatePresence>
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Registered Email</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10"/>
                      <input type="email" value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} placeholder="node@nexus.network" className="nexus-input !pl-10" required/>
                    </div>
                  </div>
                  <button type="submit" disabled={fpLoading} className="w-full py-3 rounded-xl btn-nexus text-xs font-semibold tracking-wider uppercase text-white shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">{fpLoading ? <><RefreshCw size={14} className="animate-spin"/><span>Sending...</span></> : <><Zap size={14}/><span>Send Reset Code</span></>}</button>
                </form>
              </motion.div>
            )}

            {/* FORGOT — OTP STEP */}
            {step === 'forgot_otp' && (
              <motion.div key="fp_otp" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }} transition={{ duration:0.25 }}>
                <button onClick={goBack} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 mb-5 transition-colors"><ArrowLeft size={14}/> Change email</button>
                <div className="flex items-center gap-3 mb-5"><div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center"><ShieldCheck size={18} className="text-purple-400"/></div><div><h2 className="font-display font-bold text-base text-slate-100">Enter Reset Code</h2><p className="text-xs text-slate-400">Code sent to <span className="text-cyan-300 font-mono">{fpEmail}</span></p></div></div>
                {devOtp && (<div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-mono flex items-center gap-2"><span className="font-bold">[DEV]</span> OTP: <span className="text-lg font-black tracking-widest ml-1">{devOtp}</span></div>)}
                <AnimatePresence>{fpError && (<motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs"><AlertCircle size={14} className="flex-shrink-0"/><span>{fpError}</span></motion.div>)}</AnimatePresence>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1.5 block">6-Digit Reset Code</label>
                    <input type="text" inputMode="numeric" maxLength={6} value={fpOtp} onChange={(e) => { setFpOtp(e.target.value.replace(/\D/g,'').slice(0,6)); setFpError(''); }} placeholder="000000" className="nexus-input text-center text-2xl tracking-[0.5em] font-mono font-bold"/>
                  </div>
                  <button onClick={() => { if (fpOtp.length===6) { setFpError(''); setStep('forgot_reset'); } else setFpError('Enter the 6-digit code'); }} className="w-full py-3 rounded-xl btn-nexus text-xs font-semibold tracking-wider uppercase text-white shadow-lg flex items-center justify-center gap-2"><ShieldCheck size={14}/><span>Verify Code</span></button>
                  <button type="button" onClick={handleSendOtp} disabled={fpLoading} className="w-full text-xs text-slate-500 hover:text-cyan-400 transition-colors font-mono">{fpLoading ? 'Resending...' : "Didn't receive it? Resend code"}</button>
                </div>
              </motion.div>
            )}

            {/* FORGOT — NEW PASSWORD STEP */}
            {step === 'forgot_reset' && (
              <motion.div key="fp_reset" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }} transition={{ duration:0.25 }}>
                <button onClick={goBack} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 mb-5 transition-colors"><ArrowLeft size={14}/> Back</button>
                <div className="flex items-center gap-3 mb-5"><div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center"><Lock size={18} className="text-pink-400"/></div><div><h2 className="font-display font-bold text-base text-slate-100">Set New Passkey</h2><p className="text-xs text-slate-400">Choose a strong new password</p></div></div>
                <AnimatePresence>{fpError && (<motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs"><AlertCircle size={14} className="flex-shrink-0"/><span>{fpError}</span></motion.div>)}</AnimatePresence>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1.5 block">New Password</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10"/>
                      <input type={fpShowPass ? 'text' : 'password'} value={fpNewPass} onChange={(e) => setFpNewPass(e.target.value)} placeholder="Min. 6 characters" className="nexus-input !pl-10 !pr-10" required minLength={6}/>
                      <button type="button" onClick={() => setFpShowPass(!fpShowPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white z-10">{fpShowPass ? <EyeOff size={15}/> : <Eye size={15}/>}</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Confirm Password</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10"/>
                      <input type={fpShowPass ? 'text' : 'password'} value={fpConfirmPass} onChange={(e) => setFpConfirmPass(e.target.value)} placeholder="Repeat password" className="nexus-input !pl-10" required/>
                    </div>
                  </div>
                  {fpNewPass.length > 0 && (<div className="flex gap-1">{[...Array(4)].map((_,i) => (<div key={i} className={`h-1 flex-1 rounded-full transition-all ${fpNewPass.length > i*3 ? fpNewPass.length < 6 ? 'bg-rose-500' : fpNewPass.length < 10 ? 'bg-amber-400' : 'bg-emerald-400' : 'bg-white/10'}`}/>))}</div>)}
                  <button type="submit" disabled={fpLoading} className="w-full py-3 rounded-xl btn-nexus text-xs font-semibold tracking-wider uppercase text-white shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">{fpLoading ? <><RefreshCw size={14} className="animate-spin"/><span>Resetting...</span></> : <><ShieldCheck size={14}/><span>Reset Passkey</span></>}</button>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

