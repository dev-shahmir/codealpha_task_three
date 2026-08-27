import { motion } from 'framer-motion';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[var(--bg-app)] flex flex-col items-center justify-center z-50 nexus-grid-bg">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-6"
      >
        {/* Logo */}
        <div className="relative">
          <motion.div
            className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-400 via-purple-600 to-pink-500 flex items-center justify-center text-2xl font-display font-bold text-white shadow-xl border border-white/20"
            animate={{
              boxShadow: [
                '0 0 25px rgba(0,242,254,0.4)',
                '0 0 45px rgba(121,40,202,0.5)',
                '0 0 25px rgba(255,0,122,0.4)',
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            ◈
          </motion.div>
          <motion.div
            className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-400 to-pink-500 opacity-30 blur-xl"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-display font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-400">
            NEXUS
          </h1>
          <p className="text-slate-400 text-xs font-mono tracking-wider mt-1 uppercase">Synchronizing Network Core...</p>
        </div>

        {/* Loading bar */}
        <div className="w-36 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-full"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>
    </div>
  );
}
