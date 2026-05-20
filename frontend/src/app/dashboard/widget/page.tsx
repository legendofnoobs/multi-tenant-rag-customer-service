"use client";
import React, { useState, useEffect } from 'react';
import { Code2, Copy, Check, Info, Layout, Smartphone, Globe, Palette, MessageSquareText, Save, Loader2, Zap, ShieldCheck, Terminal } from 'lucide-react';
import ChatWidget from '@/components/ChatWidget';
import api from '@/lib/api';
import { useAlert } from '@/components/AlertContext';

export default function WidgetSettingsPage() {
  const [workspaceId, setWorkspaceId] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showAlert } = useAlert();
  
  const [branding, setBranding] = useState({
    widgetName: "Support AI",
    widgetColor: "#3B82F6",
    welcomeMessage: "Hello! I'm your AI assistant. How can I help you today?"
  });

  useEffect(() => {
    const wsId = localStorage.getItem('workspaceId') || '';
    setWorkspaceId(wsId);
    if (wsId) fetchBranding(wsId);
  }, []);

  const fetchBranding = async (wsId: string) => {
    try {
      const res = await api.get('/workspace/branding', {
        headers: { 'x-workspace-id': wsId }
      });
      if (res.data) setBranding(res.data);
    } catch (e) {
      console.error('Failed to fetch branding');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/workspace/branding', branding, {
        headers: { 'x-workspace-id': workspaceId }
      });
      showAlert('Settings saved successfully! Changes will appear on your widget.', 'success');
    } catch (e) {
      showAlert('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const snippet = `<!-- SupportBot Universal Snippet -->
<script 
  src="http://localhost:3001/widget.js" 
  data-workspace-id="${workspaceId}" 
  async
></script>`;

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl space-y-8 pb-20 text-white animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Widget Configuration</h2>
          <p className="text-gray-400 mt-2">Customize your brand identity and install the chat widget.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-2xl font-bold transition-all shadow-lg shadow-brand-500/20 active:scale-95"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Customization & Installation */}
        <div className="space-y-8">
          {/* Branding Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <Palette className="text-brand-400" size={24} />
              <h3 className="text-xl font-bold">Branding</h3>
            </div>
            
            <div className="glass-card p-6 rounded-3xl space-y-4 border border-white/10">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Widget Name</label>
                <input 
                  value={branding.widgetName}
                  onChange={(e) => setBranding({...branding, widgetName: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-500 outline-none transition-all"
                  placeholder="e.g. Support AI"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Brand Color</label>
                <div className="flex gap-3">
                  <input 
                    type="color"
                    value={branding.widgetColor}
                    onChange={(e) => setBranding({...branding, widgetColor: e.target.value})}
                    className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer p-0"
                  />
                  <input 
                    value={branding.widgetColor}
                    onChange={(e) => setBranding({...branding, widgetColor: e.target.value})}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:border-brand-500 outline-none transition-all uppercase"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Welcome Message</label>
                <textarea 
                  value={branding.welcomeMessage}
                  rows={3}
                  onChange={(e) => setBranding({...branding, welcomeMessage: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-500 outline-none transition-all"
                  placeholder="The first message users see..."
                />
              </div>
            </div>
          </section>

          {/* Installation Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <Globe className="text-brand-400" size={24} />
              <h3 className="text-xl font-bold">Installation Guide</h3>
            </div>
            
            <div className="glass-card p-6 rounded-3xl space-y-6 border border-white/10">
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-brand-500/10 rounded-2xl border border-brand-500/20">
                  <Terminal className="text-brand-400 shrink-0 mt-1" size={18} />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">Universal Script</p>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Copy the snippet below and paste it before the closing <code className="text-brand-300">&lt;/body&gt;</code> tag of your website.
                    </p>
                  </div>
                </div>

                <div className="relative group">
                  <pre className="bg-black/40 rounded-2xl p-6 text-xs font-mono text-brand-300 overflow-x-auto border border-white/5 whitespace-pre-wrap leading-loose">
                    {snippet}
                  </pre>
                  <button 
                    onClick={copySnippet}
                    className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
                  >
                    {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} className="text-gray-400" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 text-brand-400">
                    <Zap size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Async Load</span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    The <code className="text-gray-300">async</code> attribute ensures the widget doesn't slow down your page load.
                  </p>
                </div>
                <div className="space-y-2 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 text-brand-400">
                    <ShieldCheck size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Secure ID</span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    The <code className="text-gray-300">data-workspace-id</code> identifies your unique RAG context.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Usage Examples</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-xs text-gray-300">Next.js / React</span>
                    <span className="text-[9px] bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-md font-bold uppercase">Import Script</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-xs text-gray-300">WordPress</span>
                    <span className="text-[9px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-md font-bold uppercase">Header/Footer Plugin</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Preview Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <Layout className="text-brand-400" size={24} />
            <h3 className="text-xl font-bold">Live Preview</h3>
          </div>
          <div className="glass-card h-[700px] rounded-[3rem] border border-white/10 relative overflow-hidden bg-[url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80')] bg-cover bg-center">
            <div className="absolute inset-0 bg-dark-900/70 backdrop-blur-[2px] pointer-events-none" />
            <div className="relative h-full z-10 p-8 flex justify-center">
              {workspaceId && (
                <div className="w-[380px] h-full shadow-2xl rounded-[2.5rem] overflow-hidden border border-white/10">
                  <ChatWidget workspaceId={workspaceId} previewMode={true} fullMode={true} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
