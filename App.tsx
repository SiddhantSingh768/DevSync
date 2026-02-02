
import React, { useState, useEffect } from 'react';
import { User, AppRoute } from './types';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Editor from './components/Editor';
import { Loader2 } from 'lucide-react';
import { authService } from './services/authService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [route, setRoute] = useState<AppRoute>(AppRoute.AUTH);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Theme initialization
      const savedTheme = localStorage.getItem('devsync_theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialDark = savedTheme ? savedTheme === 'dark' : prefersDark;
      
      setIsDark(initialDark);
      if (initialDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // User session check
      try {
        const currentUser = await authService.getCurrentUser();
        
        if (currentUser) {
          setUser(currentUser);
          
          // Check for invitation link in URL
          const params = new URLSearchParams(window.location.search);
          const inviteDocId = params.get('doc');
          
          if (inviteDocId) {
            setActiveDocId(inviteDocId);
            setRoute(AppRoute.EDITOR);
          } else {
            setRoute(AppRoute.DASHBOARD);
          }
        }
      } catch (e) {
        console.error('Session restoration failed', e);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('devsync_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('devsync_theme', 'light');
    }
  };

  const handleAuthSuccess = (user: User) => {
    setUser(user);
    
    const params = new URLSearchParams(window.location.search);
    const inviteDocId = params.get('doc');
    if (inviteDocId) {
      setActiveDocId(inviteDocId);
      setRoute(AppRoute.EDITOR);
    } else {
      setRoute(AppRoute.DASHBOARD);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setRoute(AppRoute.AUTH);
  };

  const navigateToEditor = (docId: string) => {
    if (!docId) return;
    setActiveDocId(docId);
    setRoute(AppRoute.EDITOR);

    try {
      const url = new URL(window.location.href);
      url.searchParams.set('doc', docId);
      window.history.pushState({ docId }, '', url.toString());
    } catch (e) {
      console.warn('Navigation state update failed - likely running in sandboxed environment', e);
    }
  };

  const navigateToDashboard = () => {
    setRoute(AppRoute.DASHBOARD);
    setActiveDocId(null);

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('doc');
      window.history.pushState({}, '', url.toString());
    } catch (e) {
      console.warn('Navigation state update failed - likely running in sandboxed environment', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-zinc-950 transition-colors">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 dark:text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-zinc-900 dark:text-zinc-100 transition-colors relative overflow-hidden">
      {/* Global Ambient Lighting - Consistent across Auth and Dashboard */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 -left-12 h-[500px] w-[500px] bg-emerald-400/10 dark:bg-emerald-500/5 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute -bottom-12 -right-12 h-[500px] w-[500px] bg-amber-200/10 dark:bg-emerald-500/5 blur-[120px] rounded-full animate-pulse [animation-delay:2s]"></div>
      </div>

      <div className="relative z-10">
        {route === AppRoute.AUTH && (
          <Auth 
            onAuthSuccess={handleAuthSuccess} 
            isDark={isDark} 
            onToggleTheme={toggleTheme} 
          />
        )}
        
        {route === AppRoute.DASHBOARD && user && (
          <Dashboard 
            user={user} 
            onLogout={handleLogout} 
            onOpenDoc={navigateToEditor}
            isDark={isDark}
            onToggleTheme={toggleTheme}
          />
        )}

        {route === AppRoute.EDITOR && user && activeDocId && (
          <Editor 
            user={user} 
            docId={activeDocId} 
            onBack={navigateToDashboard}
            onLogout={handleLogout}
            isDark={isDark}
            onToggleTheme={toggleTheme}
          />
        )}
      </div>
    </div>
  );
};

export default App;
