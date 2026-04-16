import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Toast({ message, type = 'error', duration = 4000, onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  // Dicionário de cores neo-brutalistas baseadas no tipo de notificação
  const tone = {
    success: 'bg-teal-400 text-slate-900',
    error: 'bg-red-400 text-slate-900',
    warning: 'bg-yellow-300 text-slate-900',
    info: 'bg-blue-400 text-slate-900',
  }[type] || 'bg-white text-slate-900';

  return (
    <div className={`fixed bottom-6 right-6 z-[250] max-w-sm p-5 rounded-2xl border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] animate-in slide-in-from-bottom-8 fade-in duration-300 ${tone}`}>
      <div className="flex items-center gap-4">
        
        {/* Mensagem */}
        <div className="flex-1 text-xs font-black uppercase tracking-widest leading-relaxed">
          {message}
        </div>
        
        {/* Botão de fechar brutalista */}
        <button
          onClick={onClose}
          className="flex-shrink-0 bg-white border-2 border-slate-900 rounded-xl p-1.5 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] active:shadow-none active:translate-y-0.5 transition-all outline-none"
          aria-label="Fechar notificação"
        >
          <X className="w-5 h-5 stroke-[3] text-slate-900" />
        </button>
        
      </div>
    </div>
  );
}