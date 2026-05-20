"use client";
import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Trash2, Loader2, Zap, Clock } from 'lucide-react';
import api from '@/lib/api';
import { useAlert } from '@/components/AlertContext';
import { connectSocket } from '@/lib/socket';
import { clsx } from 'clsx';

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'text' | 'file'>('text');
  const { showAlert, showConfirm } = useAlert();

  const fetchDocuments = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await api.get('/documents');
      setDocuments(res.data);
    } catch (error) {
      console.error('Failed to fetch documents');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments(true);

    const socket = connectSocket();
    const workspaceId = localStorage.getItem('workspaceId');
    if (workspaceId) {
      socket.emit('join_workspace', workspaceId);
    }

    // Real-time: Refresh list when ANY document finishes processing
    socket.on('document_processed', (data) => {
      console.log('Document processed event received:', data.documentId);
      fetchDocuments();
    });

    return () => {
      socket.off('document_processed');
    };
  }, []);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData();
    if (mode === 'file') {
      if (!file) return showAlert('Please select a file', 'error');
      formData.append('file', file);
    } else {
      if (!title || !content) return showAlert('Please fill in all fields', 'error');
      formData.append('title', title);
      formData.append('content', content);
    }
    
    setIsAdding(false);
    setTitle('');
    setContent('');
    setFile(null);

    try {
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Refresh immediately to show the "PROCESSING" card
      fetchDocuments();
    } catch (error) {
      showAlert('Failed to ingest knowledge', 'error');
    }
  };

  const handleDelete = (id: string) => {
    showConfirm({
      title: 'Delete Document',
      message: 'Are you sure you want to delete this document? All AI chunks will be permanently removed from the vector database.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await api.delete(`/documents/${id}`);
          fetchDocuments();
          showAlert('Document deleted successfully', 'success');
        } catch (error) {
          showAlert('Failed to delete document', 'error');
        }
      }
    });
  };

  return (
    <div className="space-y-8 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Knowledge Base</h2>
          <p className="text-gray-400 mt-2">Manage the data your AI uses for responses.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-brand-500/20 active:scale-95"
        >
          <Plus size={20} />
          Add Document
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-400 transition-colors" size={20} />
        <input
          type="text"
          placeholder="Search documents..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand-500/50 transition-all"
        />
      </div>

      <div className="grid gap-4">
        {loading && documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-600 gap-3">
            <Loader2 className="animate-spin" size={40} />
            <span className="text-sm font-bold uppercase tracking-widest">Loading Repository...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-20 text-gray-500 glass-card rounded-3xl border-dashed border-white/10">
            No documents found. Start by adding one!
          </div>
        ) : (
          documents.map((doc) => {
            const isProcessing = doc.status === 'PROCESSING';
            
            return (
              <div 
                key={doc.id} 
                className={clsx(
                  "glass-card p-6 rounded-2xl flex items-center justify-between group transition-all duration-300",
                  isProcessing ? "border-brand-500/40 bg-brand-500/5 animate-pulse" : "hover:border-brand-500/30"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={clsx(
                    "p-3 rounded-xl transition-all",
                    isProcessing ? "bg-brand-500/20 text-brand-400" : "bg-white/5 text-gray-400 group-hover:text-brand-400 group-hover:bg-brand-500/10"
                  )}>
                    {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <FileText size={24} />}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{doc.filename}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      {isProcessing ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter flex items-center gap-1">
                            <Zap size={10} />
                            AI Indexing...
                          </span>
                          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Working in background</span>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-xs">
                          Last updated {new Date(doc.updatedAt).toLocaleDateString()} • {doc._count?.chunks || 0} chunks
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(doc.id)}
                  className="p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-2xl rounded-3xl p-8 border border-white/20 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-white">Add New Knowledge</h3>
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                <button 
                  onClick={() => setMode('text')}
                  className={clsx("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", mode === 'text' ? "bg-brand-500 text-white shadow-lg" : "text-gray-500 hover:text-gray-300")}
                >
                  Text
                </button>
                <button 
                  onClick={() => setMode('file')}
                  className={clsx("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", mode === 'file' ? "bg-brand-500 text-white shadow-lg" : "text-gray-500 hover:text-gray-300")}
                >
                  File
                </button>
              </div>
            </div>

            <form onSubmit={handleIngest} className="space-y-6">
              {mode === 'text' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Document Title</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      type="text"
                      placeholder="e.g., Refund Policy"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-brand-500/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Content</label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={8}
                      placeholder="Paste your document text here..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-brand-500/50 resize-none"
                      required
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl py-12 px-6 hover:border-brand-500/50 transition-all bg-white/5 group relative">
                  <input 
                    type="file" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept=".pdf,.docx,.txt"
                  />
                  <div className="p-4 bg-brand-500/10 rounded-2xl text-brand-400 mb-4 group-hover:scale-110 transition-transform">
                    <Plus size={32} />
                  </div>
                  <p className="text-white font-bold">{file ? file.name : "Click or drag file to upload"}</p>
                  <p className="text-gray-500 text-xs mt-2 text-center max-w-xs">Supports PDF, DOCX and TXT files. Max size 10MB.</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20"
                >
                  Process Knowledge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
