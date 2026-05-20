"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Shield, Lock, Loader2, CheckCircle2, User } from 'lucide-react';
import api from '@/lib/api';
import { useAlert } from '@/components/AlertContext';

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const { showAlert } = useAlert();

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const res = await api.get(`/auth/invite/${token}`);
        setInvite(res.data);
      } catch (error) {
        showAlert('Invalid or expired invitation', 'error');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showAlert('Passwords do not match', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/invite/accept', { token, password, name });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (error) {
      showAlert('Failed to join workspace', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-dark-900 flex items-center justify-center"><Loader2 className="animate-spin text-brand-400" /></div>;

  if (success) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6">
        <div className="glass-card max-w-md w-full p-10 rounded-[2.5rem] text-center space-y-6 border border-brand-500/30">
          <div className="w-20 h-20 bg-brand-500/20 text-brand-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-bold text-white">Welcome Aboard!</h2>
          <p className="text-gray-400">You have successfully joined {invite.workspace.name}. Redirecting you to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6">
      <div className="glass-card max-w-md w-full p-10 rounded-[2.5rem] space-y-8 border border-white/10 shadow-2xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-brand-500/10 text-brand-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield size={32} />
          </div>
          <h2 className="text-3xl font-bold text-white">Join Workspace</h2>
          <p className="text-gray-400 mt-2">You've been invited to join <span className="text-brand-400 font-bold">{invite.workspace.name}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white focus:outline-none focus:border-brand-500/50 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 ml-1">Email</label>
            <input 
              disabled 
              value={invite.email} 
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-gray-500 cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 ml-1">Create Password</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white focus:outline-none focus:border-brand-500/50 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 ml-1">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white focus:outline-none focus:border-brand-500/50 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="animate-spin" size={20} /> : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
