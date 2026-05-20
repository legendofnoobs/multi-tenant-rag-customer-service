"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import { useAlert } from '@/components/AlertContext';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('workspaceId', res.data.user.workspaces?.[0]?.id);
      
      router.push('/dashboard');
    } catch (error: any) {
      showAlert(error.response?.data?.error || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 px-6 relative overflow-hidden text-white">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] -z-10" />

      <div className="w-full max-w-md space-y-8 glass-card p-10 rounded-3xl border border-white/10 shadow-2xl">
        <div className="text-center">
          <Link href="/" className="text-3xl font-black bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
            RAGSupport
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-white">Welcome back</h2>
          <p className="mt-2 text-sm text-gray-400">Sign in to manage your AI workspace</p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-400 transition-colors" size={20} />
              <input
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Email address"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand-500/50 transition-all"
              />
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-400 transition-colors" size={20} />
              <input
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Password"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand-500/50 transition-all"
              />
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 group"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <>Sign In <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <Link href="/register" className="text-brand-400 hover:text-brand-300 font-semibold">
            Create one for free
          </Link>
        </p>
      </div>
    </div>
  );
}
