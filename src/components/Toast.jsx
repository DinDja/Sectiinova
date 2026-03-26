import React, { useEffect } from 'react';

export default function Toast({ message, type = 'error', duration = 4000, onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const tone = {
    success: 'bg-emerald-500/95 text-white',
    error: 'bg-rose-500/95 text-white',
    warning: 'bg-amber-500/95 text-slate-900',
    info: 'bg-sky-500/95 text-white',
  }[type] || 'bg-slate-700/95 text-white';

  return (
    <div className={`fixed bottom-5 right-5 z-50 max-w-sm p-4 rounded-xl shadow-2xl backdrop-blur-sm ${tone}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 text-sm leading-relaxed">{message}</div>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white font-bold"
          aria-label="Fechar toast"
        >
          ×
        </button>
      </div>
    </div>
  );
}
