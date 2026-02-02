
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Document, SyncMessage } from '../types';
import { docService } from '../services/docService';
import { syncService } from '../services/syncService';
import { GoogleGenAI } from "@google/genai";
import { 
  ChevronLeft, 
  Share2, 
  Eye, 
  Code, 
  Loader2, 
  RotateCcw, 
  RotateCw,
  Columns,
  Hash,
  Lock,
  Globe,
  Download,
  LayoutGrid,
  LogOut,
  ChevronDown,
  X,
  Copy,
  Users,
  Wifi,
  Sparkles,
  Wand2,
  Check
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const MarkdownPreview: React.FC<{ content: string }> = ({ content }) => {
  const formatMarkdown = (text: string) => {
    const safeText = text || '';
    let html = safeText
      .replace(/^# (.*$)/gm, '<h1 class="text-5xl font-black mb-10 pb-6 border-b-2 border-slate-100 dark:border-emerald-500/5 text-slate-900 dark:text-white leading-tight">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-3xl font-black mb-6 mt-16 pb-3 border-b border-slate-100 dark:border-zinc-800 text-slate-800 dark:text-white">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-2xl font-bold mb-4 mt-12 text-slate-800 dark:text-white tracking-tight">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 dark:text-white font-black">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-slate-600 dark:text-zinc-300">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-emerald-50/60 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg text-emerald-700 dark:text-emerald-400 mono text-xs font-bold border border-emerald-100/50 dark:border-transparent">$1</code>')
      .replace(/^> (.*$)/gm, '<blockquote class="border-l-[6px] border-emerald-500 bg-white dark:bg-zinc-900/50 p-8 my-10 italic text-slate-700 dark:text-zinc-300 rounded-r-[32px] shadow-sm leading-relaxed border border-slate-50 dark:border-transparent">$1</blockquote>')
      .replace(/^\- (.*$)/gm, '<li class="ml-8 list-disc mb-4 text-slate-700 dark:text-zinc-300 leading-relaxed">$1</li>')
      .replace(/\n/g, '<br />');

    return { __html: html };
  };

  return (
    <div 
      className="p-16 md:p-24 prose prose-slate dark:prose-invert max-w-none h-full overflow-y-auto selection:bg-emerald-500/10 leading-relaxed font-medium text-slate-700 bg-white/95 dark:bg-transparent backdrop-blur-xl"
      dangerouslySetInnerHTML={formatMarkdown(content)}
    />
  );
};

interface EditorProps {
  user: User;
  docId: string;
  onBack: () => void;
  onLogout: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

const Editor: React.FC<EditorProps> = ({ user, docId, onBack, onLogout, isDark, onToggleTheme }) => {
  const [doc, setDoc] = useState<Document | null>(null);
  const [peers, setPeers] = useState<Map<string, { name: string; lastSeen: number }>>(new Map());
  const [activeTab, setActiveTab] = useState<'both' | 'edit' | 'preview'>('both');
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);

  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const lastSnapshotContent = useRef<string>('');
  const profileRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const syncTimeoutRef = useRef<any>(null);
  const saveTimeoutRef = useRef<any>(null);
  const snapshotTimeoutRef = useRef<any>(null);
  const hideSavedTimeoutRef = useRef<any>(null);
  const docRef = useRef<Document | null>(null);

  useEffect(() => { docRef.current = doc; }, [doc]);

  useEffect(() => {
    const fetchDoc = async () => {
      setDoc(null);
      setNotFound(false);
      docRef.current = null;
      setIsSyncing(true); // Assume syncing until found or timeout
      
      try {
        const d = await docService.getDocumentById(docId);
        if (d) {
          setDoc(d);
          lastSnapshotContent.current = d.content;
          setNotFound(false);
          setIsSyncing(false);
        } else {
          // If not found in DB, keep "syncing" state for a bit to see if we get it from peers,
          // otherwise show not found.
          if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
          syncTimeoutRef.current = setTimeout(() => {
            if (!docRef.current) setNotFound(true);
            setIsSyncing(false);
          }, 5000);
        }
      } catch (e) {
        console.error("Failed to load doc", e);
        setIsSyncing(false);
        setNotFound(true);
      }
    };
    fetchDoc();

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [docId]);

  useEffect(() => {
    const unsubscribe = syncService.subscribe((msg: SyncMessage) => {
      if (msg.docId !== docId) return;

      if (msg.type === 'presence' || msg.type === 'update' || msg.type === 'sync_response') {
        setPeers(prev => {
          const next = new Map(prev);
          next.set(msg.userId, { name: msg.userName, lastSeen: Date.now() });
          return next;
        });
      }

      if (msg.type === 'request_sync' && docRef.current) {
        syncService.broadcast({
          type: 'sync_response',
          docId,
          userId: user.id,
          userName: user.name,
          content: docRef.current.content,
          title: docRef.current.title,
          isPrivate: docRef.current.isPrivate
        });
      }

      if (msg.type === 'sync_response' && !docRef.current) {
        // We received the doc from a peer!
        const syncedDoc: Document = {
          id: docId,
          title: msg.title || 'Untitled Doc',
          content: msg.content || '',
          isPrivate: msg.isPrivate || false,
          ownerId: msg.userId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        setDoc(syncedDoc);
        docService.saveDocument(syncedDoc); // Async save to local DB
        lastSnapshotContent.current = syncedDoc.content;
        setIsSyncing(false);
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      }

      if (msg.type === 'update' && msg.userId !== user.id) {
        setDoc(prev => prev ? { 
          ...prev, 
          content: msg.content !== undefined ? msg.content : prev.content, 
          title: msg.title !== undefined ? msg.title : prev.title,
          isPrivate: msg.isPrivate !== undefined ? msg.isPrivate : prev.isPrivate 
        } : null);
      }
    });

    syncService.broadcast({ type: 'presence', docId, userId: user.id, userName: user.name });
    // Request sync from peers if we don't have it
    if (!doc) syncService.broadcast({ type: 'request_sync', docId, userId: user.id, userName: user.name });

    const presenceInterval = setInterval(() => {
      setPeers(prev => {
        const next = new Map(prev);
        const now = Date.now();
        let changed = false;
        next.forEach((data: { name: string; lastSeen: number }, id: string) => {
          if (now - data.lastSeen > 10000) {
            next.delete(id);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(presenceInterval);
    };
  }, [docId, user.id, user.name, doc]); // Added 'doc' dependency to properly check sync state

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((isMod && e.key === 'y') || (isMod && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        handleRedo();
      } else if (isMod && e.key === 's') {
        e.preventDefault();
        if (doc) handleDownload();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [doc]);

  const handleUndo = () => {
    if (undoStack.current.length === 0 || !doc) return;
    const prev = undoStack.current.pop()!;
    redoStack.current.push(doc.content);
    lastSnapshotContent.current = prev;
    updateContentLocally(prev);
  };

  const handleRedo = () => {
    if (redoStack.current.length === 0 || !doc) return;
    const next = redoStack.current.pop()!;
    undoStack.current.push(doc.content);
    lastSnapshotContent.current = next;
    updateContentLocally(next);
  };

  const triggerSave = (updatedDoc: Document) => {
    setIsSaving(true);
    setShowSaved(false);
    if (hideSavedTimeoutRef.current) clearTimeout(hideSavedTimeoutRef.current);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await docService.saveDocument(updatedDoc);
        setIsSaving(false);
        setShowSaved(true);
        hideSavedTimeoutRef.current = setTimeout(() => {
          setShowSaved(false);
        }, 3000);
      } catch (e) {
        console.error('Save failed', e);
        setIsSaving(false);
      }
    }, 1000);
  };

  const updateContentLocally = (newContent: string) => {
    if (!doc) return;
    const updatedDoc = { ...doc, content: newContent };
    setDoc(updatedDoc);
    syncService.broadcast({ type: 'update', docId, userId: user.id, userName: user.name, content: newContent });
    triggerSave(updatedDoc);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!doc) return;
    const newTitle = e.target.value;
    const updatedDoc = { ...doc, title: newTitle };
    setDoc(updatedDoc);
    syncService.broadcast({ type: 'update', docId, userId: user.id, userName: user.name, title: newTitle });
    triggerSave(updatedDoc);
  };

  const handleTogglePrivacy = () => {
    if (!doc) return;
    const newPrivacyStatus = !doc.isPrivate;
    const updatedDoc = { ...doc, isPrivate: newPrivacyStatus };
    setDoc(updatedDoc);
    syncService.broadcast({ type: 'update', docId, userId: user.id, userName: user.name, isPrivate: newPrivacyStatus });
    triggerSave(updatedDoc);
  };

  const handleDownload = () => {
    if (!doc) return;
    try {
      const blob = new Blob([doc.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.title.replace(/\s+/g, '-').toLowerCase() || 'untitled'}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed', e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    updateContentLocally(newContent);
  };

  const handleAISuggestion = async () => {
    if (!aiPrompt.trim() || !doc) return;
    setIsAILoading(true);
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key is not configured.");
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Technical writer context: Title: "${doc.title}", Content: ${doc.content}. Task: ${aiPrompt}. Response in Markdown format only. Do not include introductory text.`,
        config: { temperature: 0.7 }
      });
      const newContent = response.text;
      if (newContent) {
        updateContentLocally(newContent);
        setAiPrompt('');
        setShowAIModal(false);
      }
    } catch (e: any) { 
      console.error('AI error', e);
      alert(e.message || 'AI generation failed'); 
    } finally { 
      setIsAILoading(false); 
    }
  };

  if (notFound) return (
    <div className="h-screen flex flex-col items-center justify-center bg-stone-50 dark:bg-zinc-950 p-8 text-center">
      <div className="h-20 w-20 rounded-[32px] bg-red-50 dark:bg-red-950/20 flex items-center justify-center mb-8">
         <Hash className="h-10 w-10 text-red-500" />
      </div>
      <h2 className="text-3xl font-black mb-3">Document Missing</h2>
      <p className="text-slate-500 mb-10 max-w-sm leading-relaxed">The document you're looking for doesn't exist or you don't have synchronized access.</p>
      <button onClick={onBack} className="px-10 py-4.5 bg-emerald-600 text-white rounded-2xl font-black shadow-2xl shadow-emerald-600/20 active:scale-95 transition-all">Return to Dashboard</button>
    </div>
  );
  
  // Show syncing state only if we don't have a doc yet
  if (!doc) return (
    <div className="h-screen flex flex-col items-center justify-center bg-stone-50 dark:bg-zinc-950">
      <div className="relative">
        <Loader2 className="h-16 w-16 text-emerald-600 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
           <div className="h-4 w-4 rounded-full bg-emerald-100"></div>
        </div>
      </div>
      <p className="mt-8 text-xs font-black uppercase tracking-[0.3em] text-slate-400">Syncing Database</p>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-200 overflow-hidden transition-colors">
      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsInviteOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[48px] p-12 animate-in zoom-in-95 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-zinc-800">
            <h2 className="text-3xl font-black mb-3">Collaborate</h2>
            <p className="text-slate-500 mb-10 font-medium leading-relaxed">Share this private link with your team to enable real-time synchronized editing on this entry.</p>
            <div className="flex flex-col gap-4 p-5 bg-slate-50 dark:bg-zinc-800/50 rounded-3xl border border-slate-100 dark:border-zinc-700">
              <span className="text-xs font-mono break-all text-slate-400 leading-relaxed px-2">{window.location.href}</span>
              <button onClick={() => { navigator.clipboard.writeText(window.location.href); setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); }} className={`w-full py-4.5 rounded-2xl text-sm font-black text-white transition-all shadow-lg active:scale-95 ${copySuccess ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-emerald-600 shadow-emerald-600/20'}`}>
                {copySuccess ? 'Link Copied!' : 'Copy Invitation Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Modal */}
      {showAIModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => !isAILoading && setShowAIModal(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[48px] p-12 animate-in zoom-in-95 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-14 w-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-600/20"><Sparkles className="h-7 w-7" /></div>
              <h2 className="text-2xl font-black">AI Documentation</h2>
            </div>
            <textarea className="w-full h-40 p-6 rounded-3xl bg-slate-50 dark:bg-zinc-800 border border-slate-200/60 dark:border-zinc-700 focus:ring-8 focus:ring-emerald-500/5 transition-all outline-none mb-8 resize-none text-slate-700 dark:text-zinc-200 font-medium leading-relaxed" placeholder="e.g., Explain this system architecture in detail..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} />
            <div className="flex gap-3">
               <button onClick={handleAISuggestion} disabled={isAILoading || !aiPrompt.trim()} className="flex-1 py-5 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-500 disabled:opacity-50 shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">
                {isAILoading ? 'Thinking...' : 'Apply Magic'}
              </button>
              <button onClick={() => setShowAIModal(false)} className="px-8 py-5 bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 rounded-2xl font-black hover:bg-slate-100 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <header className="h-20 border-b border-slate-200/60 dark:border-zinc-800 bg-white/80 dark:bg-[#09090b]/80 px-8 flex items-center justify-between backdrop-blur-3xl z-20 gap-8">
        <div className="flex items-center gap-6 flex-1">
          <button onClick={onBack} className="p-3 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-[18px] text-slate-400 transition-colors shadow-sm active:scale-90"><ChevronLeft className="h-5.5 w-5.5" /></button>
          <div className="flex items-center gap-3 w-full group max-w-md">
            <Hash className="h-5 w-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
            <input className="bg-transparent border-none text-lg font-black focus:outline-none w-full placeholder-slate-300 text-slate-900 dark:text-white" value={doc.title} onChange={handleTitleChange} placeholder="Document Title" />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center -space-x-2.5">
            {[...peers.values()].map((p, i) => (
              <div key={i} className="h-10 w-10 rounded-full border-[3px] border-white dark:border-zinc-900 bg-emerald-500 flex items-center justify-center text-[11px] font-black text-white shadow-lg ring-4 ring-emerald-500/5" title={p.name}>{p.name.charAt(0)}</div>
            ))}
            {peers.size > 0 && (
              <div className="h-10 px-3 flex items-center gap-2 bg-emerald-50/50 rounded-full ml-4 text-[10px] font-black uppercase text-emerald-600 tracking-widest border border-emerald-100/50">
                 <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                 Collaborating
              </div>
            )}
          </div>

          <div className="hidden xl:flex items-center gap-1.5 bg-slate-100/50 dark:bg-zinc-800/50 p-1.5 rounded-[22px] border border-slate-200/50 dark:border-zinc-700/50">
            <button onClick={() => setActiveTab('edit')} className={`p-2 px-5 rounded-[16px] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'edit' ? 'bg-white dark:bg-zinc-700 text-emerald-600 shadow-sm border border-slate-100 dark:border-transparent' : 'text-slate-400 hover:text-slate-600'}`}>Edit</button>
            <button onClick={() => setActiveTab('both')} className={`p-2 px-5 rounded-[16px] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'both' ? 'bg-white dark:bg-zinc-700 text-emerald-600 shadow-sm border border-slate-100 dark:border-transparent' : 'text-slate-400 hover:text-slate-600'}`}>Split</button>
            <button onClick={() => setActiveTab('preview')} className={`p-2 px-5 rounded-[16px] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'preview' ? 'bg-white dark:bg-zinc-700 text-emerald-600 shadow-sm border border-slate-100 dark:border-transparent' : 'text-slate-400 hover:text-slate-600'}`}>View</button>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle isDark={isDark} onToggle={onToggleTheme} className="bg-slate-50/50 dark:bg-zinc-800" />
            <button onClick={() => setShowAIModal(true)} className="p-3 rounded-[18px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 border border-emerald-100 dark:border-transparent transition-all hover:scale-105 active:scale-95 shadow-sm" title="AI Assistant"><Sparkles className="h-5.5 w-5.5" /></button>
            <button onClick={() => setIsInviteOpen(true)} className="px-8 py-3.5 rounded-2xl bg-emerald-600 text-white font-black text-sm shadow-xl shadow-emerald-600/20 transition-all active:scale-95">Invite</button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-[#09090b]">
        <div className={`flex-1 flex flex-col border-r border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-transparent ${activeTab === 'preview' ? 'hidden' : 'flex'}`}>
          <textarea className="flex-1 w-full bg-transparent p-12 md:p-16 mono text-[15px] focus:outline-none resize-none leading-relaxed text-slate-800 dark:text-zinc-300 placeholder-slate-300" value={doc.content} onChange={handleChange} placeholder="# Documentation start..." />
        </div>
        <div className={`flex-[1.3] flex flex-col bg-white dark:bg-transparent ${activeTab === 'edit' ? 'hidden' : 'flex'}`}>
          <MarkdownPreview content={doc.content} />
        </div>
      </div>
    </div>
  );
};

export default Editor;
