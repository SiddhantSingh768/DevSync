
import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDark, onToggle, className = "" }) => {
  return (
    <button
      onClick={onToggle}
      className={`h-12 w-12 rounded-[20px] transition-all active:scale-90 flex items-center justify-center
        bg-white dark:bg-zinc-900 text-slate-400 dark:text-zinc-500
        border border-slate-200/60 dark:border-zinc-800
        hover:border-emerald-600/30 dark:hover:border-emerald-500/30
        hover:text-emerald-600 dark:hover:text-emerald-400
        shadow-sm hover:shadow-md
        ${className}`}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-5.5 w-5.5" /> : <Moon className="h-5.5 w-5.5" />}
    </button>
  );
};

export default ThemeToggle;
