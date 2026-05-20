"use client";
import React from 'react';
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="text-2xl font-black bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
          RAGSupport
        </Link>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
          <Link href="#features" className="hover:text-brand-400 transition-colors">Features</Link>
          <Link href="#how-it-works" className="hover:text-brand-400 transition-colors">How it Works</Link>
          <Link href="#pricing" className="hover:text-brand-400 transition-colors">Pricing</Link>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-semibold text-gray-300 hover:text-white px-4">Login</Link>
          <Link href="/register" className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-brand-500/20">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
