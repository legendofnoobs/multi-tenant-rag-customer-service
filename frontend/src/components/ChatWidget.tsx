"use client";
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Bot, User, Loader2, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';
import api from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { connectSocket, disconnectSocket } from '@/lib/socket';

let msgCounter = 0;
const nextMsgId = () => `msg_${++msgCounter}_${Date.now()}`;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

const isArabic = (text: string) => /[\u0600-\u06FF]/.test(text);

export default function ChatWidget({ 
  workspaceId, 
  fullMode = false, 
  previewMode = false 
}: { 
  workspaceId: string, 
  fullMode?: boolean,
  previewMode?: boolean
}) {
  const [isOpen, setIsOpen] = useState(fullMode || previewMode);
  const [branding, setBranding] = useState({
    widgetName: "Support AI",
    widgetColor: "#3B82F6",
    welcomeMessage: "Hello! I'm your AI assistant. How can I help you today?"
  });
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isResolved, setIsResolved] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const msgIdCounter = useRef(0);
  const getMsgId = () => ++msgIdCounter.current;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const res = await api.get('/workspace/branding/public', {
          params: { workspaceId }
        });
        if (res.data) setBranding(res.data);
      } catch (e) {
        console.error('Failed to fetch branding');
      }
    };
    if (workspaceId) fetchBranding();

    const socket = connectSocket();
    socket.emit('join_workspace', workspaceId);
    
    const handler = (newBranding: any) => setBranding(newBranding);
    socket.on('branding_updated', handler);

    return () => {
      socket.off('branding_updated', handler);
    };
  }, [workspaceId]);

  useEffect(() => {
    if (!conversationId) {
      setMessages(prev => {
        if (prev.length === 0 || (prev.length === 1 && prev[0].role === 'assistant')) {
          return [{ id: nextMsgId(), role: 'assistant', content: branding.welcomeMessage }];
        }
        return prev;
      });
    }
  }, [branding.welcomeMessage, conversationId]);

  const startNewChat = () => {
    if (!previewMode) {
      localStorage.removeItem(`chat_session_${workspaceId}`);
    }
    setConversationId(null);
    setIsResolved(false);
    setMessages([{ id: nextMsgId(), role: 'assistant', content: branding.welcomeMessage }]);
    setInput('');
  };

  useEffect(() => {
    if (previewMode) return;
    const savedId = localStorage.getItem(`chat_session_${workspaceId}`);
    if (savedId) {
      setConversationId(savedId);
      loadHistory(savedId);
    }
  }, [workspaceId, previewMode]);

  const loadHistory = async (id: string) => {
    try {
      const res = await api.get(`/chat/history/${id}`, {
        headers: { 'x-workspace-id': workspaceId }
      });
      if (res.data && res.data.messages) {
        setMessages(res.data.messages.map((m: any) => ({
          id: m.id || nextMsgId(),
          role: m.role,
          content: m.content,
          sources: m.sources
        })));
        if (res.data.status === 'CLOSED') {
          setIsResolved(true);
        }
      }
    } catch (error) {
      console.error('Failed to restore session');
      localStorage.removeItem(`chat_session_${workspaceId}`);
    }
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, isTyping]);

  useEffect(() => {
    if (!conversationId) return;

    if (!previewMode) {
      localStorage.setItem(`chat_session_${workspaceId}`, conversationId);
    }

    const socket = connectSocket();
    socket.emit('join_conversation', conversationId);

    socket.on('new_message', (message) => {
      if (message.role === 'assistant') {
        setIsTyping(false);
        setMessages(prev => {
          if (prev.find(m => m.content === message.content && m.role === 'assistant')) return prev;
          return [...prev, { id: nextMsgId(), role: 'assistant', content: message.content }];
        });
      }
    });

    socket.on('typing_status', ({ conversationId: cid, userId: tid, isTyping: typing }) => {
      if (cid === conversationId && tid) { // If tid exists, it's an agent
        setIsTyping(typing);
      }
    });

    socket.on('chat_resolved', () => {
      setIsResolved(true);
      setMessages(prev => [...prev, { id: nextMsgId(), role: 'assistant', content: "This conversation has been marked as resolved. Have a great day!" }]);
    });

    return () => {
      socket.off('new_message');
      socket.off('chat_resolved');
      socket.off('typing_status');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [conversationId, workspaceId, previewMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    if (conversationId) {
      const socket = connectSocket();
      api.post(`/chat/${conversationId}/typing`, { isTyping: true }, {
        headers: { 'x-workspace-id': workspaceId }
      }).catch(() => {});
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        api.post(`/chat/${conversationId}/typing`, { isTyping: false }, {
          headers: { 'x-workspace-id': workspaceId }
        }).catch(() => {});
      }, 3000);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || isResolved) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: nextMsgId(), role: 'user', content: userMessage }]);
    setIsLoading(true);
    setIsTyping(true); // AI will start typing

    try {
      // Clear user typing status
      if (conversationId) {
        api.post(`/chat/${conversationId}/typing`, { isTyping: false }, {
          headers: { 'x-workspace-id': workspaceId }
        }).catch(() => {});
      }

      const res = await api.post('/chat/message', {
        message: userMessage,
        conversationId,
        isPreview: previewMode
      }, {
        headers: { 'x-workspace-id': workspaceId }
      });

      const newId = res.data.conversationId;
      if (newId) setConversationId(newId);
      
      // If AI response is synchronous (no worker)
      if (res.data.response) {
        setMessages(prev => {
          if (prev.find(m => m.content === res.data.response)) return prev;
          return [...prev, { id: nextMsgId(), role: 'assistant', content: res.data.response, sources: res.data.sources }];
        });
        setIsTyping(false);
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: nextMsgId(), role: 'assistant', content: "I'm sorry, I encountered an error. Please try again." }]);
      setIsTyping(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={clsx(
      "font-sans text-left", 
      fullMode || previewMode ? "w-full h-full flex flex-col" : "fixed bottom-6 right-6 z-[9999]"
    )}>
      {!fullMode && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{ backgroundColor: branding.widgetColor }}
          className="w-16 h-16 text-white rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 group"
        >
          <MessageCircle size={28} className="group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {(isOpen || fullMode) && (
        <div className={clsx(
          "bg-dark-800 border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300",
          fullMode || previewMode ? "flex-1 w-full" : "w-[400px] h-[600px] rounded-[2rem] fixed bottom-6 right-6"
        )}>
          {/* Header */}
          <div 
            style={{ backgroundColor: branding.widgetColor }}
            className="p-6 flex items-center justify-between shadow-lg shrink-0"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Bot size={22} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold">{branding.widgetName}</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={startNewChat}
                title="Start New Chat"
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl"
              >
                <RotateCcw size={18} />
              </button>
              {!fullMode && !previewMode && (
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/[0.03] to-transparent">
            {messages.map(m => (
              <div
                key={m.id}
                className={clsx(
                  "flex flex-col max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                  m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div 
                  className={clsx(
                    "px-5 py-3 rounded-[1.5rem]",
                    m.role === 'user' 
                      ? "text-white rounded-tr-none shadow-lg" 
                      : "bg-white/5 border border-white/10 text-gray-200 rounded-tl-none",
                    isArabic(m.content) && "text-right"
                  )}
                  style={m.role === 'user' ? { backgroundColor: branding.widgetColor } : {}}
                  dir={isArabic(m.content) ? "rtl" : "ltr"}
                >
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    className="prose prose-invert prose-sm max-w-none"
                  >
                    {m.content}
                  </ReactMarkdown>

                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-white/5 space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Sources</p>
                      <div className="flex flex-wrap gap-1.5">
                        {m.sources.map((s, idx) => (
                          <span key={idx} className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded border border-white/5 text-white/50">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-gray-600 mt-2 font-bold uppercase tracking-widest px-1">
                  {m.role === 'user' ? 'You' : branding.widgetName}
                </span>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex flex-col items-start max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white/5 border border-white/10 px-5 py-4 rounded-[1.5rem] rounded-tl-none">
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s]" style={{ backgroundColor: branding.widgetColor }} />
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s]" style={{ backgroundColor: branding.widgetColor }} />
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: branding.widgetColor }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-6 bg-dark-800 border-t border-white/5 shrink-0">
            {!isResolved ? (
              <div className="flex gap-3 bg-white/5 border border-white/10 p-2 rounded-[1.5rem] focus-within:border-brand-500/50 transition-all shadow-inner">
                <input
                  value={input}
                  onChange={handleInputChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-white placeholder-gray-500 px-4 py-2"
                  dir={isArabic(input) ? "rtl" : "ltr"}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  style={{ backgroundColor: branding.widgetColor }}
                  className="w-10 h-10 text-white rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 disabled:grayscale shadow-lg active:scale-90"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-3 bg-white/5 rounded-xl border border-white/5 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                  This conversation has ended
                </div>
                <button 
                  onClick={startNewChat}
                  style={{ backgroundColor: branding.widgetColor }}
                  className="w-full py-3 text-white rounded-xl font-bold text-sm transition-all shadow-lg active:scale-[0.98]"
                >
                  Start New Conversation
                </button>
              </div>
            )}
            <p className="text-[9px] text-center text-gray-600 mt-4 font-bold uppercase tracking-[0.2em]">
              Powered by <span style={{ color: branding.widgetColor }} className="opacity-50">RAG Support</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
