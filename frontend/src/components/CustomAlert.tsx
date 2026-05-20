'use client';

import React from 'react';
import { useAlert } from './AlertContext';
import { X, CheckCircle2, AlertCircle, Info, HelpCircle } from 'lucide-react';
import { clsx } from 'clsx';

export const CustomAlert = () => {
  const { alert, hideAlert, confirm } = useAlert();

  return (
    <>
      {/* 1. Alert Notification (Top Center toast) */}
      {alert.isVisible && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-md px-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={clsx(
            "glass-card p-4 rounded-2xl border flex items-start gap-4 shadow-2xl backdrop-blur-xl",
            alert.type === 'success' && 'bg-emerald-500/10 border-emerald-500/20',
            alert.type === 'error' && 'bg-rose-500/10 border-rose-500/20',
            alert.type === 'info' && 'bg-brand-500/10 border-brand-500/20'
          )}>
            <div className="flex-shrink-0 mt-0.5">
              {alert.type === 'success' && <CheckCircle2 className="text-emerald-400" size={24} />}
              {alert.type === 'error' && <AlertCircle className="text-rose-400" size={24} />}
              {alert.type === 'info' && <Info className="text-brand-400" size={24} />}
            </div>
            
            <div className="flex-grow min-w-0">
              <p className="text-white font-medium leading-tight">
                {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}
              </p>
              <p className="text-gray-400 text-sm mt-1 break-words">
                {alert.message}
              </p>
            </div>

            <button 
              onClick={hideAlert}
              className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* 2. Custom Confirmation Modal Dialog */}
      {confirm.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-md rounded-3xl p-6 border border-white/15 bg-slate-900/90 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-rose-500/10 text-rose-400 rounded-2xl animate-pulse">
                <HelpCircle size={28} />
              </div>
              <h3 className="text-xl font-bold text-white leading-tight">{confirm.title}</h3>
            </div>
            
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              {confirm.message}
            </p>
            
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={confirm.onCancel || undefined}
                className="px-5 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 font-semibold text-sm transition-all active:scale-95"
              >
                {confirm.cancelText}
              </button>
              <button
                type="button"
                onClick={confirm.onConfirm || undefined}
                className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
              >
                {confirm.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
