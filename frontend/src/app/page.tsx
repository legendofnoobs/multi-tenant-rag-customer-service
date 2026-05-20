"use client";
import React from 'react';
import Navbar from '../components/Navbar';
import ChatWidget from '../components/ChatWidget';
import { Zap, BarChart3, Users, Globe, Database, ArrowRight, Check } from 'lucide-react';

export default function LandingPage() {
  const features = [
    { icon: Database, title: "Multi-Tenant RAG", desc: "Isolate data per workspace with secure vector-based retrieval." },
    { icon: Zap, title: "Instant AI Responses", desc: "Powered by Gemma to handle 80% of support queries automatically." },
    { icon: Users, title: "Human Escalation", desc: "Seamless hand-off to agents when the AI detects complexity." },
    { icon: BarChart3, title: "Real-time Analytics", desc: "Track performance and AI resolution rates with event-based logs." },
  ];

  const pricing = [
    { name: "Starter", price: "$0", desc: "For solo founders", features: ["1 Workspace", "100 AI Messages/mo", "Basic RAG", "Community Support"] },
    { name: "Pro", price: "$49", desc: "For growing teams", features: ["5 Workspaces", "Unlimited AI Messages", "Advanced RAG", "Human Escalation", "Priority Support"], popular: true },
    { name: "Enterprise", price: "Custom", desc: "For large scale", features: ["Unlimited Workspaces", "Custom LLM Fine-tuning", "Dedicated Aggregation Worker", "24/7 SLA"] },
  ];

  return (
    <div className="min-h-screen text-white selection:bg-brand-500/30">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-[128px] -z-10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px] -z-10" />

        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-white/20 text-brand-400 text-xs font-bold uppercase tracking-widest">
            <Zap size={14} />
            Next-Gen Customer Service
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[1.1]">
            AI That <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">Knows</span> Your Business.
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Stop giving generic answers. RAGSupport uses your documentation to provide 
            precise, context-aware AI support for every tenant.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button className="w-full sm:w-auto px-10 py-5 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-brand-500/30 flex items-center justify-center gap-2">
              Start Free Trial <ArrowRight size={20} />
            </button>
            <button className="w-full sm:w-auto px-10 py-5 glass hover:bg-white/10 text-white rounded-2xl font-black text-lg transition-all border border-white/10">
              Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white">Enterprise-Grade Features</h2>
            <p className="text-gray-400 mt-4">Everything you need to scale your support operations.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <div key={i} className="glass-card p-8 rounded-3xl group hover:border-brand-500/50 transition-all duration-500">
                <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-400 mb-6 group-hover:scale-110 transition-transform">
                  <f.icon size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black text-white">Simple, Scalable <span className="text-brand-500">Pricing</span></h2>
            <p className="text-gray-400 mt-4">Choose the plan that fits your business scale.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricing.map((p, i) => (
              <div key={i} className={`glass-card p-10 rounded-[2.5rem] border ${p.popular ? 'border-brand-500 shadow-2xl shadow-brand-500/10' : 'border-white/5'} relative`}>
                {p.popular && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-500 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                    Most Popular
                  </span>
                )}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-white">{p.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-5xl font-black text-white">{p.price}</span>
                    {p.price !== "Custom" && <span className="text-gray-500">/mo</span>}
                  </div>
                  <p className="text-gray-500 text-sm mt-4">{p.desc}</p>
                </div>
                
                <div className="space-y-4 mb-10">
                  {p.features.map((f, fi) => (
                    <div key={fi} className="flex items-center gap-3 text-sm text-gray-300">
                      <div className="w-5 h-5 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-400 shrink-0">
                        <Check size={12} />
                      </div>
                      {f}
                    </div>
                  ))}
                </div>

                <button className={`w-full py-4 rounded-2xl font-black transition-all ${p.popular ? 'bg-brand-500 text-white hover:bg-brand-600' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 px-6 bg-white/5 border-y border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
          <div className="lg:w-1/2 space-y-8">
            <h2 className="text-5xl font-black text-white">Go Live in <span className="text-brand-500">Minutes</span></h2>
            <div className="space-y-6">
              {[
                { step: "01", title: "Connect Data", desc: "Upload docs, sync URLs, or connect your database." },
                { step: "02", title: "Train AI", desc: "Our RAG engine chunks and embeds your data automatically." },
                { step: "03", title: "Embed Widget", desc: "Copy-paste one line of code onto your website." },
              ].map((s, i) => (
                <div key={i} className="flex gap-6">
                  <span className="text-2xl font-black text-brand-500/30">{s.step}</span>
                  <div>
                    <h4 className="text-xl font-bold text-white">{s.title}</h4>
                    <p className="text-gray-400 mt-1">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:w-1/2 relative">
             <div className="glass-card rounded-3xl p-4 border border-brand-500/30 rotate-3 transform transition-transform hover:rotate-0 duration-700 shadow-2xl shadow-brand-500/10">
                <div className="bg-dark-900 rounded-2xl aspect-video flex items-center justify-center border border-white/5">
                   <div className="text-center space-y-4">
                      <div className="w-12 h-12 rounded-full bg-brand-500 mx-auto flex items-center justify-center animate-pulse">
                         <Globe className="text-white" size={24} />
                      </div>
                      <p className="text-sm text-gray-500 font-mono">Syncing Global Knowledge Base...</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 text-center border-t border-white/10">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-4xl font-bold text-white">Ready to automate your support?</h2>
          <p className="text-gray-400">Join 500+ businesses saving 40+ hours every week.</p>
          <button className="px-12 py-5 bg-white text-black hover:bg-brand-50 rounded-2xl font-black text-xl transition-all">
            Get Started for Free
          </button>
          <div className="pt-12 text-gray-600 text-sm">
            © 2024 RAGSupport AI Platform. All rights reserved.
          </div>
        </div>
      </footer>

      {/* <ChatWidget workspaceId="replace-with-real-uuid" /> */}
    </div>
  );
}
