
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { User, Document } from '../types';
import { docService } from '../services/docService';
import { Plus, Search, FileText, Trash2, LogOut, Clock, ExternalLink, ChevronDown, LayoutGrid, Files, Download, AlertTriangle, Loader2 } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onOpenDoc: (docId: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onOpenDoc, isDark, onToggleTheme }) => {
  const [docs, setDocs] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  
  const loadDocs = useCallback(async () => {
    try {
      const userDocs = await docService.getDocuments(user.id);
      setDocs(userDocs || []);
    } catch (e) {
      console.error("Dashboard: Load failed", e);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadDocs();
    const handleSync = () => loadDocs();
    window.addEventListener('storage', handleSync);
    window.addEventListener('devsync_docs_changed', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('devsync_docs_changed', handleSync);
    };
  }, [loadDocs]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredDocs = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    if (!q) return docs;
    return docs.filter(d => (d.title || '').toLowerCase().includes(q));
  }, [docs, searchQuery]);

  const handleCreate = async () => {
    try {
      const newDoc = await docService.createDocument(user.id);
      onOpenDoc(newDoc.id);
    } catch (e) {
      console.error("Create failed", e);
    }
  };

  const executeDelete = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    try {
      await docService.deleteDocument(id);
      setDocs(prev => prev.filter(d => d.id !== id));
    } catch (e) {
      console.error("Delete failed", e);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const performDownload = (e: React.MouseEvent, doc: Document) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const blob = new Blob([doc.content || ''], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = (doc.title || 'untitled').toLowerCase().replace(/[^a-z0-9]/g, '-');
      a.href = url;
      a.download = `${filename}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  return (
    <div className="min-h-screen transition-colors selection:bg-emerald-500/20">
      {/* Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/20 dark:bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setConfirmDeleteId(null)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[40px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-zinc-800 p-10 animate-in zoom-in-95 duration-300">
            <div className="h-16 w-16 bg-red-50 dark:bg-red-900/30 rounded-[24px] flex items-center justify-center text-red-500 dark:text-red-400 mb-8 mx-auto">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black text-center text-slate-900 dark:text-white mb-3">Delete Document?</h2>
            <p className="text-sm text-center text-slate-500 dark:text-zinc-400 mb-10 font-medium leading-relaxed">This action is permanent and cannot be reversed. Peer sync for this entry will be terminated.</p>
            <div className="flex flex-col gap-3">
              <button onClick={executeDelete} className="w-full py-4.5 bg-red-500 text-white rounded-2xl font-bold text-sm hover:bg-red-600 transition-all active:scale-95 shadow-xl shadow-red-500/20">Delete Permanently</button>
              <button onClick={() => setConfirmDeleteId(null)} className="w-full py-4.5 bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-zinc-300 rounded-2xl font-bold text-sm hover:bg-slate-100 dark:hover:bg-zinc-700 transition-all">Keep Document</button>
            </div>
          </div>
        </div>
      )}

      <nav className="border-b border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-[#09090b]/80 backdrop-blur-2xl sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 flex items-center justify-center bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-600/20 active:scale-90 transition-transform">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">DevSync</span>
          </div>
          
          <div className="flex items-center gap-5">
            <ThemeToggle isDark={isDark} onToggle={onToggleTheme} className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800" />
            
            <div className="relative" ref={profileRef}>
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className={`flex items-center gap-3 p-1.5 pr-5 rounded-2xl transition-all active:scale-95 border ${isProfileOpen ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-slate-50 dark:hover:bg-zinc-800 shadow-sm'}`}>
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-500/20">{user.name.charAt(0).toUpperCase()}</div>
                <div className="hidden sm:block text-left">
                   <p className="text-xs font-black text-slate-900 dark:text-white leading-none mb-0.5">{user.name.split(' ')[0]}</p>
                   <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 leading-none uppercase tracking-wider">Editor</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-4 w-72 rounded-[32px] border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.12)] animate-in fade-in slide-in-from-top-4 z-50">
                  <div className="px-5 py-5 border-b border-slate-100 dark:border-zinc-800/50 mb-3">
                    <span className="text-sm font-black text-slate-900 dark:text-white block truncate">{user.name}</span>
                    <span className="text-xs text-slate-400 truncate block mt-1">{user.email}</span>
                  </div>
                  <button onClick={() => { setIsProfileOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold text-slate-600 dark:text-zinc-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 transition-colors"><LayoutGrid className="h-4 w-4" /> Workspace</button>
                  <button onClick={onLogout} className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><LogOut className="h-4 w-4" /> Log out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-8 py-20">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 mb-20 animate-slide-up">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100/50 text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-6 dark:bg-emerald-900/20 dark:text-emerald-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Workspace Active
            </div>
            <h1 className="text-6xl font-black tracking-tight text-slate-900 dark:text-white mb-6 leading-[0.9]">Workspace</h1>
            <p className="text-slate-500 dark:text-zinc-400 text-xl font-medium leading-relaxed">
              Design technical systems and documentation. <span className="text-emerald-600 dark:text-emerald-400 font-black">{isLoading ? '...' : docs.length} entries</span> synchronized.
            </p>
          </div>
          <button onClick={handleCreate} className="group flex items-center gap-3 rounded-[24px] bg-gradient-to-br from-emerald-600 to-emerald-700 px-10 py-5 text-sm font-black text-white hover:from-emerald-500 hover:to-emerald-600 transition-all active:scale-95 shadow-2xl shadow-emerald-600/30"><Plus className="h-6 w-6 transition-transform group-hover:rotate-90 duration-500" /> New Document</button>
        </div>

        <div className="relative mb-16 max-w-3xl animate-slide-up [animation-delay:0.1s]">
          <Search className="absolute top-1/2 left-6 -translate-y-1/2 h-6 w-6 text-slate-400" />
          <input type="text" className="block w-full rounded-[32px] border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] py-6 pl-16 pr-8 text-slate-900 dark:text-zinc-200 focus:border-emerald-500 focus:ring-8 focus:ring-emerald-500/5 transition-all outline-none shadow-md shadow-slate-200/40 dark:shadow-none placeholder-slate-400" placeholder="Search across documents..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-12 w-12 text-emerald-600 animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center text-center animate-slide-up bg-white dark:bg-zinc-900/40 rounded-[64px] border-2 border-dashed border-slate-200 dark:border-zinc-800 p-16">
            <div className="h-24 w-24 rounded-[36px] bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-8">
              <Files className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4">Start Writing</h2>
            <p className="text-slate-400 mb-10 max-w-md font-medium">Your workspace is currently empty. Create your first technical entry to begin collaborating.</p>
            <button onClick={handleCreate} className="px-12 py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-2xl shadow-emerald-600/30 hover:bg-emerald-500 active:scale-95 transition-all">Create Entry</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3 animate-slide-up [animation-delay:0.2s]">
            {filteredDocs.map((doc) => (
              <div key={doc.id} className={`group relative flex flex-col rounded-[48px] border transition-all duration-500 overflow-hidden p-10 ${doc.isPrivate ? 'border-amber-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 hover:border-amber-400 shadow-md hover:shadow-xl hover:shadow-amber-500/10' : 'border-slate-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 hover:border-emerald-400 shadow-sm hover:shadow-2xl hover:shadow-emerald-600/10'} hover:-translate-y-2`}>
                <button onClick={() => onOpenDoc(doc.id)} className="absolute inset-0 z-10 w-full h-full cursor-pointer focus:outline-none" aria-label={`Open ${doc.title}`} />
                <div className="relative z-20 pointer-events-none mb-10 flex items-start justify-between">
                  <div className={`h-20 w-20 flex items-center justify-center rounded-[28px] ${doc.isPrivate ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-slate-50 dark:bg-zinc-800 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40'} transition-colors duration-500`}><FileText className={`h-10 w-10 ${doc.isPrivate ? 'text-amber-500' : 'text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'}`} /></div>
                </div>
                <div className="relative z-20 pointer-events-none">
                  <h3 className={`text-3xl font-black truncate mb-3 ${doc.isPrivate ? 'text-slate-800 dark:text-slate-200 group-hover:text-amber-600' : 'text-slate-900 dark:text-white group-hover:text-emerald-600'} transition-colors duration-300`}>{doc.title || 'Untitled'}</h3>
                  <div className="flex items-center gap-2 mb-12"><div className={`h-2.5 w-2.5 rounded-full ${doc.isPrivate ? 'bg-amber-500' : 'bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`}></div><span className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{doc.isPrivate ? 'Private Space' : 'Sync Active'}</span></div>
                </div>
                <div className="absolute top-10 right-10 flex items-center gap-2.5 z-30">
                  <button type="button" onClick={(e) => performDownload(e, doc)} className="p-3.5 bg-slate-50 dark:bg-zinc-800 backdrop-blur shadow-sm border border-slate-200 dark:border-zinc-700 text-slate-400 hover:text-emerald-600 hover:border-emerald-300 rounded-[18px] transition-all active:scale-90" title="Download"><Download className="h-4.5 w-4.5" /></button>
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteId(doc.id); }} className="p-3.5 bg-slate-50 dark:bg-zinc-800 backdrop-blur shadow-sm border border-slate-200 dark:border-zinc-700 text-slate-400 hover:text-red-500 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-[18px] transition-all active:scale-90" title="Delete"><Trash2 className="h-4.5 w-4.5" /></button>
                </div>
                <div className="mt-auto relative z-20 pointer-events-none flex items-center justify-between border-t border-slate-100 dark:border-zinc-800 pt-8">
                  <div className="flex items-center gap-2 text-[13px] text-slate-400 dark:text-zinc-500 font-bold"><Clock className="h-4 w-4" /><span>{new Date(doc.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></div>
                  <div className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest group-hover:translate-x-1 transition-transform duration-300 ${doc.isPrivate ? 'text-amber-500' : 'text-emerald-600'}`}>Edit Entry <ExternalLink className="h-3.5 w-3.5" /></div>
                </div>
              </div>
            ))}
            <button onClick={handleCreate} className="flex flex-col items-center justify-center rounded-[48px] border-2 border-dashed border-slate-300 dark:border-zinc-800 p-10 hover:border-emerald-400/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 transition-all duration-500 group min-h-[360px]"><div className="h-24 w-24 rounded-[36px] bg-slate-100 dark:bg-zinc-900/50 flex items-center justify-center mb-10 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:rotate-6 transition-all duration-700 shadow-sm group-hover:shadow-2xl group-hover:shadow-emerald-600/30"><Plus className="h-12 w-12 text-slate-300 group-hover:text-white transition-colors" /></div><span className="text-2xl font-black text-slate-400 dark:text-zinc-400 group-hover:text-emerald-600 transition-colors">Create Document</span></button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
