"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Database, 
  Settings, 
  LogOut,
  Code2,
  ChevronDown,
  Building2,
  Plus,
  Loader2,
  Rocket,
  User,
  Power
} from 'lucide-react';
import { clsx } from 'clsx';
import api from '@/lib/api';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newWsName, setNewWsName] = useState('');
  const [creating, setCreating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);

  // Role-based navigation configuration
  const allMenuItems = [
    { icon: LayoutDashboard, label: 'Overview', path: '/dashboard', roles: ['WORKSPACE_OWNER', 'ADMIN'] },
    { icon: MessageSquare, label: 'Conversations', path: '/dashboard/conversations', roles: ['WORKSPACE_OWNER', 'ADMIN', 'AGENT'] },
    { icon: Database, label: 'Knowledge Base', path: '/dashboard/knowledge', roles: ['WORKSPACE_OWNER', 'ADMIN'] },
    { icon: Code2, label: 'Widget Settings', path: '/dashboard/widget', roles: ['WORKSPACE_OWNER', 'ADMIN'] },
    { icon: Settings, label: 'Settings', path: '/dashboard/settings', roles: ['WORKSPACE_OWNER', 'ADMIN'] },
  ];

  const fetchData = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      setIsOnline(res.data.isOnline);
      const wsList = res.data.workspaces || [];
      setWorkspaces(wsList);
      
      if (wsList.length > 0) {
        const activeId = localStorage.getItem('workspaceId');
        const active = wsList.find((w: any) => w.id === activeId) || wsList[0];
        setCurrentWorkspace(active);
        if (active.id !== activeId) {
          localStorage.setItem('workspaceId', active.id);
        }
      }
    } catch (error) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleOnlineStatus = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    try {
      await api.patch('/auth/status', { isOnline: newStatus });
    } catch (error) {
      setIsOnline(!newStatus); // Rollback on error
      console.error('Failed to update status');
    }
  };

  // ROUTE PROTECTION LOGIC
  useEffect(() => {
    if (!loading && user) {
      const isOwnerOfCurrent = currentWorkspace?.ownerId === user?.id;
      const effectiveRole = isOwnerOfCurrent ? 'WORKSPACE_OWNER' : user?.role;

      const currentItem = allMenuItems.find(item => item.path === pathname);
      // If user is accessing a restricted page, redirect them
      if (currentItem && !currentItem.roles.includes(effectiveRole)) {
        router.push('/dashboard/conversations');
      }
    }
  }, [pathname, user, loading, currentWorkspace]);

  const handleCreateWorkspace = async (e?: React.FormEvent, nameOverride?: string) => {
    if (e) e.preventDefault();
    const finalName = nameOverride || newWsName;
    if (!finalName.trim()) return;

    setCreating(true);
    try {
      const res = await api.post('/workspace', { name: finalName });
      localStorage.setItem('workspaceId', res.data.id);
      window.location.reload();
    } catch (error) {
      alert('Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const switchWorkspace = (ws: any) => {
    localStorage.setItem('workspaceId', ws.id);
    setCurrentWorkspace(ws);
    setIsDropdownOpen(false);
    window.location.reload();
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const isOwnerOfCurrent = currentWorkspace?.ownerId === user?.id;
  const effectiveRole = isOwnerOfCurrent ? 'WORKSPACE_OWNER' : user?.role;
  const menuItems = allMenuItems.filter(item => item.roles.includes(effectiveRole));

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-400" size={40} />
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6">
        <div className="glass-card max-w-xl w-full p-12 rounded-[3rem] text-center space-y-8 border border-white/10 shadow-2xl">
          <div className="w-20 h-20 bg-brand-500/20 text-brand-400 rounded-[2rem] flex items-center justify-center mx-auto">
            <Rocket size={40} />
          </div>
          <div>
            <h2 className="text-4xl font-bold text-white">Let's get started</h2>
            <p className="text-gray-400 mt-4 text-lg leading-relaxed">
              To begin using the platform, create your first workspace. This is where you'll manage your knowledge base and agents.
            </p>
          </div>
          <form onSubmit={(e) => handleCreateWorkspace(e)} className="space-y-4">
            <input
              autoFocus
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              placeholder="e.g., My Customer Support"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-center text-xl focus:border-brand-500/50 outline-none transition-all"
              required
            />
            <button
              type="submit"
              disabled={creating}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
            >
              {creating ? <Loader2 className="animate-spin" size={24} /> : 'Create Workspace'}
            </button>
          </form>
          <button 
            onClick={handleLogout}
            className="text-gray-500 hover:text-white transition-colors text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 flex text-left">
      {/* Sidebar */}
      <aside className="w-72 border-r border-white/5 flex flex-col p-6 gap-8 max-h-screen sticky top-0">
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center text-brand-400">
                <Building2 size={18} />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Workspace</p>
                <p className="text-sm font-bold text-white truncate max-w-[120px]">
                  {currentWorkspace?.name || 'Loading...'}
                </p>
              </div>
            </div>
            <ChevronDown size={16} className={clsx("text-gray-500 transition-transform", isDropdownOpen && "rotate-180")} />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-dark-800 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="max-h-60 overflow-y-auto">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => switchWorkspace(ws)}
                    className={clsx(
                      "w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors flex items-center gap-3",
                      currentWorkspace?.id === ws.id ? "text-brand-400 font-bold" : "text-gray-400"
                    )}
                  >
                    <Building2 size={14} />
                    {ws.name}
                  </button>
                ))}
              </div>
              <div className="border-t border-white/5 p-2">
                <button 
                  onClick={() => {
                    setIsDropdownOpen(false);
                    const name = prompt("Enter workspace name:");
                    if (name) handleCreateWorkspace(undefined, name);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-white transition-colors"
                >
                  <Plus size={14} />
                  Create New Workspace
                </button>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium",
                pathname === item.path 
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20" 
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Presence Toggle Section */}
        <div className="space-y-4">
          <button 
            onClick={toggleOnlineStatus}
            className={clsx(
              "w-full p-4 rounded-2xl border transition-all flex items-center justify-between group",
              isOnline 
                ? "bg-green-500/10 border-green-500/20 text-green-400" 
                : "bg-white/5 border-white/10 text-gray-500"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={clsx(
                "w-2 h-2 rounded-full",
                isOnline ? "bg-green-500 animate-pulse" : "bg-gray-700"
              )} />
              <span className="text-xs font-bold uppercase tracking-widest">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <Power size={16} className={clsx("transition-transform group-active:scale-90", isOnline ? "text-green-500" : "text-gray-700")} />
          </button>

          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-400">
                 <User size={16} />
               </div>
               <div className="truncate">
                 <p className="text-xs font-bold text-white truncate">{user?.name || user?.email}</p>
                 <p className="text-[9px] text-gray-500 uppercase tracking-tighter font-bold">{effectiveRole.replace('_', ' ')}</p>
               </div>
            </div>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-400 transition-colors font-medium"
        >
          <LogOut size={20} />
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
