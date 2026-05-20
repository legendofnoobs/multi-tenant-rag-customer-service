"use client";
import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Settings2, 
  Building2, 
  Shield, 
  Plus, 
  Loader2, 
  Copy, 
  Link as LinkIcon, 
  User, 
  Trash2, 
  ShieldCheck, 
  UserMinus,
  MessageSquare,
  MessageSquarePlus
} from 'lucide-react';
import { clsx } from 'clsx';
import api from '@/lib/api';
import { useAlert } from '@/components/AlertContext';

export default function SettingsPage() {
  const [workspaceName, setWorkspaceName] = useState('');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [fetchingMembers, setFetchingMembers] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Canned Responses State
  const [cannedResponses, setCannedResponses] = useState<any[]>([]);
  const [isManagingCanned, setIsManagingCanned] = useState(false);
  const [cannedForm, setCannedForm] = useState({ id: '', title: '', content: '', shortcut: '' });

  const { showAlert, showConfirm } = useAlert();

  const fetchData = async () => {
    try {
      const userRes = await api.get('/auth/me');
      setCurrentUser(userRes.data);
      setWorkspaceName(userRes.data.workspaces?.find((w: any) => w.id === localStorage.getItem('workspaceId'))?.name || '');
      
      const membersRes = await api.get('/workspace/members');
      setMembers(membersRes.data);

      const cannedRes = await api.get('/canned');
      setCannedResponses(cannedRes.data);
    } catch (error) {
      console.error('Failed to fetch data');
    } finally {
      setFetchingMembers(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch('/workspace', { name: workspaceName });
      showAlert('Workspace updated!', 'success');
    } catch (error) {
      showAlert('Failed to update workspace', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/workspace', { name: newWorkspaceName });
      showAlert(`Workspace "${res.data.name}" created! Switch to it from the sidebar.`, 'success');
      setNewWorkspaceName('');
      setIsCreating(false);
      window.location.reload();
    } catch (error) {
      showAlert('Failed to create workspace', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      const res = await api.post('/auth/invite', { email: inviteEmail });
      const inviteLink = `${window.location.origin}/join/${res.data.token}`;
      setInvitations(prev => [{ ...res.data, link: inviteLink }, ...prev]);
      setInviteEmail('');
      showAlert('Invitation created! Copy the link below.', 'success');
    } catch (error) {
      showAlert('Failed to invite agent', 'error');
    } finally {
      setInviting(false);
    }
  };

  const updateRole = async (userId: string, role: string) => {
    try {
      await api.patch(`/workspace/members/${userId}`, { role });
      fetchData();
    } catch (error) {
      showAlert('Failed to update role', 'error');
    }
  };

  const removeMember = (userId: string) => {
    showConfirm({
      title: 'Remove Member',
      message: 'Are you sure you want to remove this member from the workspace?',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await api.delete(`/workspace/members/${userId}`);
          fetchData();
          showAlert('Member removed successfully', 'success');
        } catch (error) {
          showAlert('Failed to remove member', 'error');
        }
      }
    });
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    showAlert('Link copied to clipboard!', 'success');
  };

  // Canned Responses Handlers
  const handleSaveCanned = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (cannedForm.id) {
        await api.put(`/canned/${cannedForm.id}`, cannedForm);
        showAlert('Canned response updated!', 'success');
      } else {
        await api.post('/canned', cannedForm);
        showAlert('Canned response added!', 'success');
      }
      setIsManagingCanned(false);
      setCannedForm({ id: '', title: '', content: '', shortcut: '' });
      fetchData();
    } catch (error) {
      showAlert('Failed to save canned response', 'error');
    }
  };

  const deleteCanned = (id: string) => {
    showConfirm({
      title: 'Delete Canned Response',
      message: 'Are you sure you want to delete this response?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await api.delete(`/canned/${id}`);
          fetchData();
          showAlert('Deleted successfully', 'success');
        } catch (error) {
          showAlert('Failed to delete', 'error');
        }
      }
    });
  };

  const workspaceId = typeof window !== 'undefined' ? localStorage.getItem('workspaceId') : null;
  const currentWorkspace = currentUser?.workspaces?.find((w: any) => w.id === workspaceId);
  const isOwner = currentWorkspace?.ownerId === currentUser?.id;
  const canManageTeam = isOwner || currentUser?.role === 'WORKSPACE_OWNER';

  return (
    <div className="max-w-4xl space-y-12 pb-20 text-white">
      <div>
        <h2 className="text-3xl font-bold">Settings</h2>
        <p className="text-gray-400 mt-2">Manage your workspace, team, and account preferences.</p>
      </div>

      {/* Workspace Settings */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
          <Building2 className="text-brand-400" size={24} />
          <h3 className="text-xl font-bold">Workspace Configuration</h3>
        </div>
        <div className="glass-card p-8 rounded-3xl space-y-6">
          <form onSubmit={handleUpdateName} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Workspace Name</label>
              <input
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-brand-500/50 outline-none transition-all"
              />
            </div>
            <button 
              disabled={loading || !canManageTeam}
              className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Save Changes'}
            </button>
          </form>

          {canManageTeam && (
            <div className="pt-6 border-t border-white/5">
              <button 
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 text-brand-400 hover:text-brand-300 font-bold transition-colors"
              >
                <Plus size={20} />
                Create New Workspace
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Canned Responses (Snippets) */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
          <MessageSquare className="text-brand-400" size={24} />
          <h3 className="text-xl font-bold">Canned Responses (Snippets)</h3>
        </div>
        <div className="glass-card p-8 rounded-3xl space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-gray-400 text-sm">Save common replies to answer customers faster.</p>
            <button 
              onClick={() => { setCannedForm({ id: '', title: '', content: '', shortcut: '' }); setIsManagingCanned(true); }}
              className="flex items-center gap-2 text-brand-400 hover:text-brand-300 font-bold transition-colors"
            >
              <MessageSquarePlus size={20} />
              Add Snippet
            </button>
          </div>

          <div className="grid gap-4">
            {cannedResponses.length === 0 ? (
              <div className="text-center py-10 text-gray-500 bg-white/5 rounded-2xl border border-dashed border-white/10">
                No snippets added yet.
              </div>
            ) : (
              cannedResponses.map(snippet => (
                <div key={snippet.id} className="p-4 bg-white/5 rounded-2xl border border-white/10 flex justify-between items-start group">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-bold text-white">{snippet.title}</h4>
                      {snippet.shortcut && (
                        <span className="text-[10px] font-mono bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded border border-brand-500/20">
                          /{snippet.shortcut}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2">{snippet.content}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setCannedForm(snippet); setIsManagingCanned(true); }}
                      className="p-2 text-gray-500 hover:text-brand-400"
                    >
                      <Settings2 size={16} />
                    </button>
                    <button 
                      onClick={() => deleteCanned(snippet.id)}
                      className="p-2 text-gray-500 hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Team Management */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
          <Shield className="text-brand-400" size={24} />
          <h3 className="text-xl font-bold">Team & Invitations</h3>
        </div>
        <div className="glass-card p-8 rounded-3xl space-y-8">
          {/* Members List */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Active Members</h4>
            <div className="grid gap-3">
              {fetchingMembers ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-brand-400" /></div>
              ) : (
                members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 group hover:border-brand-500/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-400">
                        <User size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{member.name || member.email}</p>
                          {member.id === currentUser?.id && (
                            <span className="text-[9px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded uppercase">You</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-tighter">{member.role.replace('_', ' ')}</p>
                      </div>
                    </div>
                    
                    {/* Admin Actions - ONLY for Workspace Owner */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      {canManageTeam && member.id !== currentUser?.id && (
                        <>
                          {member.role === 'AGENT' ? (
                            <button 
                              onClick={() => updateRole(member.id, 'ADMIN')}
                              className="p-2 text-gray-500 hover:text-brand-400 transition-colors"
                              title="Promote to Admin"
                            >
                              <ShieldCheck size={18} />
                            </button>
                          ) : member.role === 'ADMIN' ? (
                            <button 
                              onClick={() => updateRole(member.id, 'AGENT')}
                              className="p-2 text-gray-500 hover:text-yellow-400 transition-colors"
                              title="Demote to Agent"
                            >
                              <UserMinus size={18} />
                            </button>
                          ) : null}
                          <button 
                            onClick={() => removeMember(member.id)}
                            className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                            title="Remove Member"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {canManageTeam && (
            <>
              <div className="pt-8 border-t border-white/5 space-y-4">
                <label className="block text-sm font-medium text-gray-400">Invite New Agent</label>
                <form onSubmit={handleInvite} className="flex gap-4">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="agent@company.com"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-brand-500/50 outline-none transition-all"
                    required
                  />
                  <button 
                    type="submit"
                    disabled={inviting}
                    className="flex items-center gap-2 px-8 py-3 glass hover:bg-white/10 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                  >
                    {inviting ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                    Generate Invite Link
                  </button>
                </form>
              </div>

              {invitations.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Pending Invitations</h4>
                  <div className="grid gap-3">
                    {invitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-4 bg-brand-500/5 rounded-2xl border border-brand-500/20">
                        <div>
                          <p className="font-semibold">{inv.email}</p>
                          <p className="text-xs text-brand-400 font-bold">Waiting for agent to join...</p>
                        </div>
                        <button 
                          onClick={() => copyLink(inv.link)}
                          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-xs font-bold hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20"
                        >
                          <LinkIcon size={14} />
                          Copy Link
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Create Workspace Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md rounded-3xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-6">Create New Workspace</h3>
            <form onSubmit={handleCreateWorkspace} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Workspace Name</label>
                <input
                  autoFocus
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="e.g., Marketing Support"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-brand-500/50 outline-none"
                  required
                />
              </div>
              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-6 py-3 text-gray-400 hover:text-white font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20"
                >
                  {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Canned Response Modal */}
      {isManagingCanned && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg rounded-3xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-6">
              {cannedForm.id ? 'Edit Snippet' : 'Add New Snippet'}
            </h3>
            <form onSubmit={handleSaveCanned} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Title</label>
                <input
                  autoFocus
                  value={cannedForm.title}
                  onChange={(e) => setCannedForm({...cannedForm, title: e.target.value})}
                  placeholder="e.g., Return Policy Link"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-brand-500/50 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Shortcut (Optional)</label>
                <div className="flex items-center">
                  <span className="bg-white/10 px-4 py-3 rounded-l-xl border border-white/10 border-r-0 text-gray-400 font-mono">/</span>
                  <input
                    value={cannedForm.shortcut}
                    onChange={(e) => setCannedForm({...cannedForm, shortcut: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '')})}
                    placeholder="return-policy"
                    className="w-full bg-white/5 border border-white/10 rounded-r-xl py-3 px-4 text-white focus:border-brand-500/50 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Content</label>
                <textarea
                  value={cannedForm.content}
                  onChange={(e) => setCannedForm({...cannedForm, content: e.target.value})}
                  placeholder="The full message to send..."
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-brand-500/50 outline-none resize-none"
                  required
                />
              </div>
              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsManagingCanned(false)}
                  className="flex-1 px-6 py-3 text-gray-400 hover:text-white font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
