"use client";
import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  Users,
  Zap,
  TrendingUp,
  ArrowUpRight,
  Loader2,
  Calendar,
  Activity,
  Database,
  MessagesSquare,
  Sparkles,
  RefreshCw,
  History,
  X
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../../lib/api';
import { clsx } from 'clsx';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/analytics/insights/history');
      setHistory(res.data);
    } catch (error) {
      console.error('Failed to fetch history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchInsights = async () => {
    try {
      const res = await api.get('/analytics/insights');
      if (res.data.insights) setInsights(res.data.insights);
    } catch (error) {
      console.error('Failed to fetch AI insights');
    }
  };

  const generateInsights = async () => {
    setLoadingInsights(true);
    try {
      const res = await api.post('/analytics/insights');
      setInsights(res.data.insights);
    } catch (error) {
      console.error('Failed to generate AI insights');
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/analytics/overview');
        setStats(res.data);
      } catch (error) {
        console.error('Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    };

    const syncProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        const role = res.data.role || 'AGENT';
        setUserRole(role);
      } catch (e) {
        setUserRole(localStorage.getItem('userRole') || 'AGENT');
      }
    };

    syncProfile();
    fetchStats();
    fetchInsights();
  }, []);

const canManageInsights = userRole === 'WORKSPACE_OWNER' || userRole === 'ADMIN' || userRole === 'OWNER';

if (loading) return (
  <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
    <Loader2 className="animate-spin text-brand-400" size={40} />
    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Assembling Insights...</p>
  </div>
);

const statCards = [
  { label: 'Total Messages', value: stats?.totalMessages || 0, icon: MessageCircle, color: 'text-brand-400', trend: 'LIVE' },
  { label: 'AI Resolution', value: `${stats?.aiResolutionRate || 0}%`, icon: Zap, color: 'text-yellow-400', trend: 'AUTO' },
  { label: 'Escalations', value: stats?.escalations || 0, icon: Users, color: 'text-red-400', trend: 'Urg.' },
  { label: 'Active Sessions', value: stats?.activeConversations || 0, icon: TrendingUp, color: 'text-green-400', trend: 'NOW' },
];

const dailyStats = stats?.dailyStats || [];
const maxVal = Math.max(...dailyStats.map((d: any) => d.conversations), 1);

return (
  <div className="space-y-8 animate-in fade-in duration-700 text-left">
    <div className="flex flex-col gap-2">
      <h2 className="text-4xl font-black text-white tracking-tight">Workspace Overview</h2>
      <p className="text-gray-500 text-sm font-medium">Real-time performance metrics for your AI agents.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat) => (
        <div key={stat.label} className="glass-card p-6 rounded-[2rem] border border-white/5 hover:border-brand-500/30 transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <stat.icon size={80} />
          </div>
          <div className="flex items-center justify-between mb-8">
            <div className={clsx("p-3 rounded-2xl bg-white/5 shadow-inner", stat.color)}>
              <stat.icon size={24} />
            </div>
            <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-white/5 flex items-center gap-1 text-gray-500 uppercase tracking-widest">
              {stat.trend}
            </span>
          </div>
          <div>
            <h3 className="text-4xl font-black text-white tracking-tighter mb-1">{stat.value}</h3>
            <p className="text-gray-500 text-xs font-black uppercase tracking-widest">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Chart */}
      <div className="lg:col-span-2 glass-card p-8 rounded-[2.5rem] border border-white/5 flex flex-col">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <Activity className="text-brand-400" size={20} />
              Activity Insights
            </h3>
            <p className="text-gray-500 text-xs mt-1 font-medium">Daily conversation volume over the last 7 days</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-500/10 rounded-xl border border-brand-500/20">
            <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">Live Sync</span>
          </div>
        </div>

        <div className="flex-1 flex items-end justify-between gap-4 min-h-[240px] px-4">
          {dailyStats.some((d: any) => d.conversations > 0) ? dailyStats.map((day: any, i: number) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
              <div className="relative w-full flex flex-col items-center">
                {/* Tooltip */}
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-brand-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-xl pointer-events-none z-10 whitespace-nowrap">
                  {day.conversations} Chats
                </div>
                {/* Bar */}
                <div
                  className="w-full max-w-[40px] bg-brand-500/20 border border-brand-500/30 rounded-t-xl group-hover:bg-brand-500 transition-all duration-500 relative"
                  style={{ height: `${(day.conversations / maxVal) * 200}px`, minHeight: '4px' }}
                >
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-xl" />
                </div>
              </div>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">
                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
            </div>
          )) : (
            <div className="w-full flex flex-col items-center justify-center py-20 text-gray-600 gap-4">
              <Calendar size={48} className="opacity-20" />
              <p className="text-sm font-medium italic">Waiting for your first customer interaction...</p>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Info - REAL DATA ONLY */}
      <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 flex flex-col gap-8">
        <h3 className="text-xl font-bold text-white">Platform Health</h3>

        <div className="flex-1 space-y-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-brand-500/10 rounded-2xl text-brand-400">
              <Database size={20} />
            </div>
            <div>
              <p className="text-white font-bold">{stats?.knowledgeBaseSize || 0} Documents</p>
              <p className="text-gray-500 text-xs">Knowledge Base coverage</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-yellow-500/10 rounded-2xl text-yellow-400">
              <MessagesSquare size={20} />
            </div>
            <div>
              <p className="text-white font-bold">{stats?.avgMessagesPerChat || 0} Msg / Chat</p>
              <p className="text-gray-500 text-xs">Average interaction depth</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-500/10 rounded-2xl text-green-400">
              <Zap size={20} />
            </div>
            <div>
              <p className="text-white font-bold">{stats?.aiResolutionRate || 0}% AI Efficiency</p>
              <p className="text-gray-500 text-xs">Conversations resolved by AI</p>
            </div>
          </div>
        </div>

        <div className="mt-auto">
          <div className="p-6 bg-brand-500/10 rounded-3xl border border-brand-500/20 text-center">
            <p className="text-brand-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">System Status</p>
            <p className="text-white text-xs font-medium">RAG Pipeline Operational. Vector synchronization active.</p>
          </div>
        </div>
      </div>
    </div>

    {/* AI Topic Insights */}
    <div className="glass-card p-8 rounded-[2.5rem] border border-brand-500/20 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        <Sparkles size={120} className="text-brand-400" />
      </div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-brand-500/20 rounded-2xl text-brand-400">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">AI Topic Insights</h3>
            <p className="text-gray-400 text-sm">Actionable intelligence extracted from your recent conversations.</p>
          </div>
        </div>
        {canManageInsights && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchHistory();
                setIsHistoryOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold transition-all"
            >
              <History size={18} />
              History
            </button>
            <button
              onClick={generateInsights}
              disabled={loadingInsights}
              className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
            >
              {loadingInsights ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              {insights ? 'Refresh Insights' : 'Generate Insights'}
            </button>
          </div>
        )}
      </div>

      {loadingInsights ? (
        <div className="flex flex-col items-center justify-center py-12 text-brand-400 gap-4">
          <Loader2 className="animate-spin" size={40} />
          <p className="text-sm font-bold uppercase tracking-widest text-brand-400/70">Analyzing Conversations...</p>
        </div>
      ) : insights ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]} 
            className="prose prose-invert prose-brand max-w-none prose-p:leading-relaxed prose-li:marker:text-brand-400"
          >
            {insights}
          </ReactMarkdown>
        </div>
      ) : (
          <div className="bg-white/5 border border-white/10 border-dashed rounded-2xl p-12 text-center text-gray-500">
          Click "Generate Insights" to analyze your chat history and extract common topics and recommendations.
        </div>
      )}
    </div>

    {/* History Modal */}
    {isHistoryOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
        <div className="glass-card w-full max-w-3xl max-h-[85vh] flex flex-col rounded-3xl border border-white/20 overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <History className="text-brand-400" size={20} />
              Insight Reports History
            </h3>
            <button 
              onClick={() => setIsHistoryOpen(false)}
              className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loadingHistory ? (
              <div className="flex justify-center items-center py-20 text-brand-400">
                <Loader2 className="animate-spin" size={32} />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-20 text-gray-500 italic">
                No past insights generated yet.
              </div>
            ) : (
              history.map((report) => (
                <div key={report.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 bg-brand-500/20 text-brand-400 px-3 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-widest border-b border-l border-brand-500/20">
                    {new Date(report.createdAt).toLocaleString()}
                  </div>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]} 
                    className="prose prose-invert prose-sm prose-brand max-w-none mt-2"
                  >
                    {report.content}
                  </ReactMarkdown>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )}
  </div>
);
}
