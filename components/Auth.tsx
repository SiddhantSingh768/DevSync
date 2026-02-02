
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { LogIn, UserPlus, Zap, Terminal, Loader2, AlertCircle, Wifi, WifiOff, Server } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { authService, getMode, setMode } from '../services/authService';

interface AuthProps {
  onAuthSuccess: (user: User) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess, isDark, onToggleTheme }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setLocalModeState] = useState<'server' | 'local'>(getMode());

  const toggleMode = () => {
    const newMode = mode === 'server' ? 'local' : 'server';
    setMode(newMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    
    try {
      let user: User;
      if (isLogin) {
        user = await authService.login(email, password);
      } else {
        user = await authService.register(email, password, name);
      }
      onAuthSuccess(user);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed');
      setIsProcessing(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const guestId = Math.random().toString(36).substring(7);
      const guestUser = await authService.register(
        `guest_${guestId}@devsync.local`, 
        'guest_pass', 
        'Guest Developer'
      );
      onAuthSuccess(guestUser);
    } catch (err: any) {
      setError('Guest login failed. Try Offline Mode.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-6 transition-colors overflow-hidden">
      <div className="absolute top-8 right-8 z-50 flex items-center gap-3">
        <button
          onClick={toggleMode}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[20px] text-xs font-black uppercase tracking-wider border shadow-sm transition-all active:scale-95 ${
            mode === 'server' 
              ? 'bg-white dark:bg-zinc-900 border-emerald-500/30 text-emerald-600 dark:text-emerald-500' 
              : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400'
          }`}
        >
          {mode === 'server' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {mode === 'server' ? 'Server Online' : 'Offline Mode'}
        </button>
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
      </div>

      <div className="w-full max-w-md space-y-8 rounded-[48px] bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-12 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.06)] dark:shadow-none animate-slide-up">
        <div className="text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[32px] shadow-2xl ring-4 transition-all duration-500 bg-emerald-600 shadow-emerald-600/30 ring-emerald-50 dark:ring-emerald-900/10">
            {mode === 'server' ? <Server className="h-12 w-12 text-white" /> : <Terminal className="h-12 w-12 text-white" />}
          </div>
          <h2 className="mt-10 text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            {isLogin ? 'Welcome back' : 'Start Synced'}
          </h2>
          <p className="mt-3 text-sm text-slate-500 dark:text-zinc-400 font-medium tracking-wide">
            {mode === 'server' ? 'Connected to Node.js Backend' : 'Running in Offline Demo Mode'}
          </p>
        </div>

        <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold flex flex-col gap-2 animate-in slide-in-from-top-2 border border-red-100 dark:border-red-900/30">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span>Error</span>
              </div>
              <p className="font-medium text-xs opacity-90 leading-relaxed ml-7">{error}</p>
              {error.includes('connect to server') && (
                <button type="button" onClick={() => setMode('local')} className="ml-7 text-xs underline text-left hover:text-red-800 dark:hover:text-red-300">
                  Switch to Offline Mode &rarr;
                </button>
              )}
            </div>
          )}
          
          <div className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="block w-full rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 px-5 py-4.5 text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none sm:text-sm"
                  placeholder="Linus Torvalds"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Email address</label>
              <input
                type="email"
                required
                className="block w-full rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 px-5 py-4.5 text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none sm:text-sm"
                placeholder="developer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Password</label>
              <input
                type="password"
                required
                className="block w-full rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 px-5 py-4.5 text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none sm:text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isProcessing}
              className="group relative flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4.5 text-sm font-bold text-white transition-all active:scale-[0.98] shadow-xl disabled:opacity-50 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 shadow-emerald-600/20"
            >
              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : (isLogin ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />)}
              {isProcessing ? 'Processing...' : (isLogin ? 'Enter Workspace' : 'Create Space')}
            </button>
          </div>
        </form>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200/50 dark:border-zinc-800"></span></div>
          <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.3em]"><span className="bg-white dark:bg-zinc-900 px-5 text-slate-400">Quick Access</span></div>
        </div>

        <button 
          onClick={handleGuestLogin}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-4 rounded-2xl border border-slate-200/60 bg-white dark:bg-zinc-900/50 px-6 py-4.5 text-sm font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all active:scale-[0.98] disabled:opacity-70 group"
        >
          <div className="h-9 w-9 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
            <Zap className="h-4 w-4 fill-current" />
          </div>
          <span>{isProcessing ? 'Creating Session...' : 'Continue as Guest'}</span>
        </button>

        <p className="mt-8 text-center text-sm font-medium text-slate-500 dark:text-zinc-400">
          {isLogin ? "New to DevSync? " : "Already synced? "}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="font-black hover:underline decoration-2 underline-offset-4 transition-colors text-emerald-600 dark:text-emerald-400 decoration-emerald-600/10 hover:decoration-emerald-500/40"
          >
            {isLogin ? 'Join Workspace' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
