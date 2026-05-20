"use client";
import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  User,
  Send,
  CheckCircle2,
  Clock,
  Archive,
  MessageSquare,
  ShieldAlert,
  Loader2,
  Bot,
  Lock,
  Unlock
} from 'lucide-react';
import { clsx } from 'clsx';
import api from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useAlert } from '@/components/AlertContext';

const isArabic = (text: string) => /[\u0600-\u06FF]/.test(text);

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherTyping, setOtherTyping] = useState<boolean>(false);
  
  // Snippets
  const [cannedResponses, setCannedResponses] = useState<any[]>([]);
  const [showSnippets, setShowSnippets] = useState(false);
  
  const { showAlert } = useAlert();

  // Tabs: AI_MANAGED, ESCALATED, ARCHIVED (for Owner) or MY_CHATS, ARCHIVED (for Agent)
  const [activeTab, setActiveTab] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('AGENT');
  const [userId, setUserId] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/chat');
      setConversations(res.data);
    } catch (error) {
      console.error('Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchChatDetail = async (id: string) => {
    try {
      const res = await api.get(`/chat/${id}`);
      setActiveChat(res.data);
    } catch (error) {
      console.error('Failed to fetch chat details');
    }
  };

  const fetchCanned = async () => {
    try {
      const res = await api.get('/canned');
      setCannedResponses(res.data);
    } catch (error) {
      console.error('Failed to fetch snippets');
    }
  };

  // 1. INITIAL SYNC: Profile & Conversations (Run once on mount)
  useEffect(() => {
    fetchConversations();
    fetchCanned();

    // Request Notification Permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }

    const syncProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        const userData = res.data;
        const workspaceId = localStorage.getItem('workspaceId');
        const currentWorkspace = userData.workspaces?.find((w: any) => w.id === workspaceId);
        
        // Context-aware role detection
        const isOwnerOfCurrent = currentWorkspace?.ownerId === userData.id;
        const role = (isOwnerOfCurrent ? 'WORKSPACE_OWNER' : (userData.role || 'AGENT')).toUpperCase();
        
        localStorage.setItem('userRole', role);
        localStorage.setItem('userId', userData.id);
        
        setUserRole(role);
        setUserId(userData.id);
        
        const isOwnerRole = role === 'WORKSPACE_OWNER' || role === 'ADMIN' || role === 'PLATFORM_OWNER';
        setActiveTab(prev => prev || (isOwnerRole ? 'AI_MANAGED' : 'MY_CHATS'));
      } catch (e) {
        const role = (localStorage.getItem('userRole') || 'AGENT').toUpperCase();
        setUserRole(role);
        const isOwnerRole = role === 'WORKSPACE_OWNER' || role === 'ADMIN' || role === 'PLATFORM_OWNER';
        setActiveTab(prev => prev || (isOwnerRole ? 'AI_MANAGED' : 'MY_CHATS'));
      }
    };
    syncProfile();

    const workspaceId = localStorage.getItem('workspaceId');
    if (!workspaceId) return;

    const socket = connectSocket();
    socket.emit('join_workspace', workspaceId);

    socket.on('chat_updated', (updated) => {
      const convId = updated.conversationId || updated.id || updated.conversation?.id;
      const conversationData = updated.conversation || updated;
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, ...conversationData } : c));
    });

    socket.on('new_chat', (newChat) => {
      setConversations(prev => {
        if (prev.find(c => c.id === newChat.id)) return prev;
        return [newChat, ...prev];
      });
      if (Notification.permission === 'granted') {
        new Notification('New Chat', { body: 'A new chat session has started.' });
      }
    });

    socket.on('chat_escalated', (updatedChat) => {
      setConversations(prev => {
        const exists = prev.find(c => c.id === updatedChat.id);
        if (exists) return prev.map(c => c.id === updatedChat.id ? updatedChat : c);
        return [updatedChat, ...prev];
      });
      if (Notification.permission === 'granted') {
        new Notification('Chat Escalated', { body: 'An AI-managed chat requires human assistance.' });
      }
    });

    socket.on('chat_resolved', (updated) => {
      setConversations(prev => prev.map(c => 
        c.id === updated.id ? { ...c, status: 'CLOSED', lockedById: null } : c
      ));
    });

    return () => {
      disconnectSocket();
    };
  }, []); // Run only on mount

  // 2. CHAT SELECTION: Handle details & specific events
  useEffect(() => {
    if (!selectedId) return;
    
    fetchChatDetail(selectedId);
    setOtherTyping(false);

    const socket = connectSocket();
    socket.emit('join_conversation', selectedId);
    
    socket.on('new_message', (message) => {
      setActiveChat((prev: any) => {
        if (!prev || prev.id !== message.conversationId) return prev;
        if (prev.messages.find((m: any) => m.id === message.id)) return prev;
        return { ...prev, messages: [...prev.messages, message] };
      });
    });

    socket.on('typing_status', ({ conversationId, userId: typingUserId, isTyping }) => {
      if (conversationId === selectedId && typingUserId !== userId) {
        setOtherTyping(isTyping);
      }
    });

    socket.on('chat_resolved', (updated) => {
      if (selectedId === updated.id) {
        setActiveChat((prev: any) => ({ ...prev, status: 'CLOSED', lockedById: null }));
      }
    });

    socket.on('chat_escalated', (updatedChat) => {
      if (selectedId === updatedChat.id) {
        setActiveChat(prev => ({ ...prev, ...updatedChat }));
      }
    });

    socket.on('chat_updated', (updated) => {
      const convId = updated.conversationId || updated.id || updated.conversation?.id;
      if (selectedId === convId) {
        const conversationData = updated.conversation || updated;
        setActiveChat(prev => ({ ...prev, ...conversationData }));
      }
    });

    return () => {
      socket.off('new_message');
      socket.off('chat_resolved');
      socket.off('chat_escalated');
      socket.off('chat_updated');
      socket.off('typing_status');
      api.post(`/chat/${selectedId}/unlock`).catch(() => {});
    };
  }, [selectedId, userId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [activeChat?.messages, otherTyping]);

  const handleReply = async () => {
    if (!reply.trim() || !selectedId) return;
    const content = reply;
    setReply('');
    try {
      await api.post(`/chat/${selectedId}/reply`, { content });
      api.post(`/chat/${selectedId}/typing`, { isTyping: false }).catch(() => {});
    } catch (error: any) {
      showAlert(error.response?.data?.error || 'Failed to send reply', 'error');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setReply(val);

    if (val === '/') {
      setShowSnippets(true);
    } else if (!val.startsWith('/')) {
      setShowSnippets(false);
    } else {
      // Auto-expand exact shortcut match
      const match = cannedResponses.find(c => '/' + c.shortcut === val);
      if (match) {
        setReply(match.content);
        setShowSnippets(false);
      }
    }

    if (selectedId) {
      api.post(`/chat/${selectedId}/typing`, { isTyping: true }).catch(() => {});
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        api.post(`/chat/${selectedId}/typing`, { isTyping: false }).catch(() => {});
      }, 3000);
    }
  };

  const insertSnippet = (content: string) => {
    setReply(content);
    setShowSnippets(false);
  };

  const resolveChat = async (id: string) => {
    try {
      await api.post(`/chat/${id}/resolve`);
    } catch (error) {
      showAlert('Failed to resolve chat', 'error');
    }
  };

  const filteredConversations = conversations.filter(c => {
    if (activeTab === 'AI_MANAGED') return c.status === 'AI_ACTIVE';
    if (activeTab === 'ESCALATED') return c.status === 'ESCALATED';
    if (activeTab === 'MY_CHATS') return c.status === 'ESCALATED' && c.assignedToId === userId;
    if (activeTab === 'ARCHIVED') {
      if (userRole === 'AGENT') return c.status === 'CLOSED' && c.assignedToId === userId;
      return c.status === 'CLOSED';
    }
    return true;
  });

  const isOwner = userRole === 'WORKSPACE_OWNER' || userRole === 'ADMIN' || userRole === 'PLATFORM_OWNER';
  const isLockedByOthers = activeChat?.lockedById && activeChat.lockedById !== userId;

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-4 animate-in fade-in duration-500 text-left">
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Sidebar - Chat List */}
        <div className="w-96 flex flex-col glass-card rounded-[2rem] border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-white/5 backdrop-blur-md space-y-4">
            <div className="flex flex-col gap-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageSquare size={20} className="text-brand-400" />
                {isOwner ? 'Workspace Inbox' : 'My Assigned Chats'}
              </h3>

              <div className="flex flex-wrap bg-white/5 p-1 rounded-xl border border-white/5">
                {isOwner ? (
                  <>
                    <button
                      onClick={() => setActiveTab('AI_MANAGED')}
                      className={clsx("flex-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all", activeTab === 'AI_MANAGED' ? "bg-brand-500 text-white" : "text-gray-500 hover:text-white")}
                    >AI Managed</button>
                    <button
                      onClick={() => setActiveTab('ESCALATED')}
                      className={clsx("flex-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all", activeTab === 'ESCALATED' ? "bg-red-500 text-white" : "text-gray-500 hover:text-white")}
                    >Escalated</button>
                    <button
                      onClick={() => setActiveTab('ARCHIVED')}
                      className={clsx("flex-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all", activeTab === 'ARCHIVED' ? "bg-white/10 text-white" : "text-gray-500 hover:text-white")}
                    >Archived</button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setActiveTab('MY_CHATS')}
                      className={clsx("flex-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all", activeTab === 'MY_CHATS' ? "bg-brand-500 text-white" : "text-gray-500 hover:text-white")}
                    >My Chats</button>
                    <button
                      onClick={() => setActiveTab('ARCHIVED')}
                      className={clsx("flex-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all", activeTab === 'ARCHIVED' ? "bg-white/10 text-white" : "text-gray-500 hover:text-white")}
                    >Archived</button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3">
                <Loader2 className="animate-spin" size={32} />
                <span className="text-sm font-bold uppercase tracking-widest">Loading...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-20 px-6">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-700">
                  {activeTab === 'AI_MANAGED' ? <Bot size={32} /> : <CheckCircle2 size={32} />}
                </div>
                <div>
                  <p className="font-bold text-lg text-white">All Clear!</p>
                  <p className="text-sm text-gray-500">No chats in this category.</p>
                </div>
              </div>
            ) : (
              filteredConversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={clsx(
                    "w-full p-4 rounded-2xl border transition-all text-left group relative",
                    selectedId === c.id
                      ? "bg-brand-500/10 border-brand-500/50"
                      : "bg-white/5 border-white/5 hover:bg-white/10"
                  )}
                >
                  {c.lockedById && c.lockedById !== userId && (
                    <div className="absolute top-2 right-2 text-yellow-500/50">
                      <Lock size={12} />
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400">
                        <User size={14} />
                      </div>
                      <span className="font-bold text-sm truncate max-w-[120px] text-white">
                        {c.customerEmail || 'Guest User'}
                      </span>
                    </div>
                    <span className={clsx(
                      "text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-widest",
                      c.status === 'ESCALATED' ? "bg-red-500/20 text-red-400" : "bg-brand-500/20 text-brand-400"
                    )}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>
                  {c.assignedTo && (
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium mb-2">
                      <ShieldAlert size={10} className="text-yellow-500" />
                      Assigned to {c.assignedTo.name || c.assignedTo.email}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 truncate line-clamp-1">
                    {c.messages?.[0]?.content || 'New conversation'}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col glass-card rounded-[2rem] border border-white/5 overflow-hidden relative">
          {activeChat ? (
            <>
              {/* Collision Warning Banner */}
              {isLockedByOthers && (
                <div className="bg-yellow-500/10 border-b border-yellow-500/20 p-3 flex items-center justify-center gap-3 animate-in slide-in-from-top duration-300">
                  <ShieldAlert size={16} className="text-yellow-500" />
                  <p className="text-xs font-bold text-yellow-500 uppercase tracking-widest">
                    Caution: {activeChat.lockedBy?.name || 'Another agent'} is currently handling this chat
                  </p>
                </div>
              )}

              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/20 flex items-center justify-center text-brand-400">
                    <User size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-xl text-white">{activeChat.customerEmail || 'Guest User'}</h3>
                      {activeChat.status === 'ESCALATED' && (
                        <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-black border border-red-500/30">ESCALATED</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <span>ID: {activeChat.id.slice(0, 8)}</span>
                      {activeChat.assignedTo && (
                        <>
                          <span className="w-1 h-1 bg-gray-700 rounded-full" />
                          <span className="text-brand-400 font-bold uppercase tracking-tighter">Assigned to {activeChat.assignedTo.name || activeChat.assignedTo.email}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {activeChat.status !== 'CLOSED' && (
                    <button
                      onClick={() => resolveChat(activeChat.id)}
                      disabled={isLockedByOthers}
                      className="flex items-center gap-2 px-6 py-2.5 bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white rounded-xl text-sm font-bold transition-all border border-green-500/20 disabled:opacity-50"
                    >
                      <CheckCircle2 size={18} />
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>

              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-8 space-y-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/[0.02] to-transparent scroll-smooth"
              >
                {activeChat.messages.map((m: any) => (
                  <div key={m.id || m._id || Math.random()} className={clsx("flex flex-col max-w-[80%] animate-in slide-in-from-bottom-2 duration-300", m.role === 'user' ? "mr-auto items-start" : "ml-auto items-end")}>
                    <div 
                      className={clsx(
                        "px-5 py-3 rounded-2xl text-sm leading-relaxed",
                        m.role === 'user' ? "bg-white/5 border border-white/10 text-gray-200" : "bg-brand-500 text-white shadow-lg shadow-brand-500/20",
                        isArabic(m.content) && "text-right"
                      )}
                      dir={isArabic(m.content) ? "rtl" : "ltr"}
                    >
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]} 
                        className="prose prose-invert prose-sm max-w-none"
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                    <span className="text-[10px] text-gray-600 mt-2 font-bold uppercase tracking-widest px-1">
                      {m.role === 'user' ? 'Customer' : 'Agent/AI'}
                    </span>
                  </div>
                ))}
                
                {otherTyping && (
                  <div className="flex flex-col items-start max-w-[80%] animate-in fade-in duration-300">
                    <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl flex gap-1.5 items-center">
                      <div className="w-1 h-1 bg-brand-400 rounded-full animate-bounce" />
                      <div className="w-1 h-1 bg-brand-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1 h-1 bg-brand-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest ml-2">Typing...</span>
                    </div>
                  </div>
                )}
              </div>

              {activeChat.status !== 'CLOSED' && (
                <div className="p-6 bg-white/5 border-t border-white/5 relative">
                  {showSnippets && cannedResponses.length > 0 && (
                    <div className="absolute bottom-full mb-2 left-6 right-6 max-h-60 overflow-y-auto bg-dark-900 border border-white/10 rounded-2xl p-2 shadow-2xl animate-in slide-in-from-bottom-2">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-2 pb-2 mb-2 border-b border-white/5">Snippets</p>
                      {cannedResponses.map(snippet => (
                        <button
                          key={snippet.id}
                          onClick={() => insertSnippet(snippet.content)}
                          className="w-full text-left p-3 hover:bg-white/5 rounded-xl transition-colors flex flex-col gap-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-sm">{snippet.title}</span>
                            {snippet.shortcut && (
                              <span className="text-[10px] font-mono bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded border border-brand-500/20">
                                /{snippet.shortcut}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 line-clamp-1">{snippet.content}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className={clsx(
                    "flex gap-3 bg-dark-900 border p-2 rounded-2xl transition-all shadow-inner",
                    isLockedByOthers ? "border-red-500/20 opacity-50 pointer-events-none" : "border-white/10 focus-within:border-brand-500/50"
                  )}>
                    <input
                      value={reply}
                      onChange={handleInputChange}
                      onKeyPress={(e) => e.key === 'Enter' && handleReply()}
                      placeholder={isLockedByOthers ? "This chat is locked..." : "Type your reply here... (Type '/' for snippets)"}
                      disabled={isLockedByOthers}
                      className="flex-1 bg-transparent border-none focus:ring-0 text-white px-4 py-2 focus:outline-none"
                      dir={isArabic(reply) ? "rtl" : "ltr"}
                    />
                    <button
                      onClick={handleReply}
                      disabled={!reply.trim() || isLockedByOthers}
                      className="w-12 h-12 bg-brand-500 hover:bg-brand-600 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50 active:scale-90"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
              <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center text-gray-700 animate-pulse">
                <MessageSquare size={48} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Select a conversation</h3>
                <p className="text-gray-500 mt-2">Choose a chat from the inbox to start helping customers.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
