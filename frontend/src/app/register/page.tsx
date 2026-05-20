"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Mail, Lock, Loader2, User } from 'lucide-react';
import api from '@/lib/api';
import { useAlert } from '@/components/AlertContext';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    workspaceName: ''
  });

  const { showAlert } = useAlert();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.replace('/dashboard');
    } else {
      setCheckingAuth(false);
    }
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-400" size={40} />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/register', formData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('workspaceId', res.data.workspace.id);
      router.push('/dashboard');
    } catch (error) {
      showAlert('Registration failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6">
      <div className="glass-card max-w-md w-full p-10 rounded-[2.5rem] space-y-8 border border-white/10 shadow-2xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-brand-500/10 text-brand-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Building2 size={32} />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Create Account</h2>
          <p className="text-gray-400 mt-2">Launch your AI support platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white focus:outline-none focus:border-brand-500/50 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 ml-1">Work Email</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@company.com"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white focus:outline-none focus:border-brand-500/50 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white focus:outline-none focus:border-brand-500/50 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 ml-1">Workspace Name</label>
            <div className="relative">
              <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                required
                value={formData.workspaceName}
                onChange={(e) => setFormData({ ...formData, workspaceName: e.target.value })}
                placeholder="e.g. Acme Support"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white focus:outline-none focus:border-brand-500/50 transition-all font-bold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Build My Platform'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-400 font-bold hover:text-brand-300">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
