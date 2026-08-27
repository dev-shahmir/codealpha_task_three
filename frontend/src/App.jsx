import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './contexts/ThemeContext';
import useAuthStore from './contexts/authStore';

import Navbar from './components/Navbar';
import Feed from './pages/Feed';
import ReelsFeed from './pages/ReelsFeed';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Explore from './pages/Explore';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import SavedPosts from './pages/SavedPosts';
import Leaderboard from './pages/Leaderboard';
import PostDetail from './pages/PostDetail';
import LoadingScreen from './components/LoadingScreen';
import BackgroundUploadWidget from './components/BackgroundUploadWidget';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 } },
});

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  return !isAuthenticated ? children : <Navigate to="/" replace />;
};

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <ThemeProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] font-sans selection:bg-cyan-500 selection:text-black transition-colors duration-300">
              {/* Animated Cyber Ambient Blobs & Mesh */}
              <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 nexus-grid-bg">
                <div className="blob w-[32rem] h-[32rem] bg-cyan-500/10 top-[-5rem] left-[15%]" style={{ animationDelay: '0s' }} />
                <div className="blob w-[28rem] h-[28rem] bg-purple-600/10 top-[30%] right-[15%]" style={{ animationDelay: '3s' }} />
                <div className="blob w-[30rem] h-[30rem] bg-pink-500/8 bottom-[10%] left-[30%]" style={{ animationDelay: '6s' }} />
              </div>

              <Routes>
                {/* Public Auth Routes */}
                <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

                {/* Reels Feed without Navbar */}
                <Route
                  path="/clips"
                  element={
                    <ProtectedRoute>
                      <ReelsFeed />
                    </ProtectedRoute>
                  }
                />

                {/* Main App Layout */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <div className="min-h-screen">
                        {/* Fixed Left Navigation Dock (w-64 = 256px) */}
                        <Navbar />

                        {/* Center Scrollable Content Canvas — offset by sidebar width on desktop */}
                        <main className="lg:ml-64 min-w-0 pb-20 lg:pb-8 pt-2 lg:pt-4 px-2 sm:px-4 min-h-screen">
                          <Routes>
                            <Route index element={<Feed />} />
                            <Route path="explore" element={<Explore />} />
                            <Route path="messages" element={<Messages />} />
                            <Route path="notifications" element={<Notifications />} />
                            <Route path="saved" element={<SavedPosts />} />
                            <Route path="leaderboard" element={<Leaderboard />} />
                            <Route path="post/:id" element={<PostDetail />} />
                            <Route path=":username" element={<Profile />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                          </Routes>
                        </main>
                      </div>
                    </ProtectedRoute>
                  }
                />
              </Routes>

              <BackgroundUploadWidget />
              <Toaster
                position="bottom-right"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    fontSize: '13px',
                    borderRadius: '14px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                  },
                }}
              />
            </div>
          </BrowserRouter>
        </ThemeProvider>
      </SocketProvider>
    </QueryClientProvider>
  );
}
