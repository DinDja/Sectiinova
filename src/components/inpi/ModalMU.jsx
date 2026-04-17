"use client"; 

import React, { useEffect } from 'react';
import { X, Wrench, ShieldCheck, Zap, Lightbulb, Factory, Clock } from 'lucide-react';

const ModalMU = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200 font-sans">
      
      {/* INJEÇÃO DE CSS DA SCROLLBAR */}
      <style>{`
        .neo-scrollbar::-webkit-scrollbar { width: 8px; }
        .neo-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .neo-scrollbar::-webkit-scrollbar-thumb { background: #0f172a; border-radius: 10px; border: 2px solid #fff; }
      `}</style>

      {/* Backdrop de Clique */}
      <div 
        className="absolute inset-0 transition-opacity" 
        onClick={onClose} 
        aria-hidden="true" 
      />
      
      {/* Container Principal */}
      <div className="relative bg-[#FAFAFA] border-4 border-slate-900 rounded-[2rem] shadow-[16px_16px_0px_0px_#0f172a] w-full max-w-4xl flex flex-col max-h-[90vh] animate-in zoom-in-[0.95] duration-200 overflow-hidden">
        
        {/* HEADER NEO-BRUTALISTA (Sem rotação) */}
        <div className="flex items-center justify-between px-8 py-6 border-b-4 border-slate-900 bg-emerald-400">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] rounded-xl flex items-center justify-center">
              <Wrench size={24} className="stroke-[3] text-slate-900" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-slate-900">
              Modelo de Utilidade (MU)
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:shadow-none active:translate-y-0 active:translate-x-0 rounded-xl transition-all"
            title="Fechar"
          >
            <X size={24} className="stroke-[3] text-slate-900" />
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div className="p-8 overflow-y-auto neo-scrollbar flex flex-col gap-8">
          
          <p className="text-lg font-bold text-slate-900 leading-relaxed bg-white p-6 border-4 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_#0f172a]">
            Um <strong className="font-black uppercase tracking-wider">Modelo de Utilidade</strong> (frequentemente chamado de "pequena patente") é destinado a objetos de uso prático que apresentem uma nova forma ou disposição, resultando em uma melhoria funcional no seu uso ou fabricação.
          </p>

          {/* O que caracteriza um MU? */}
          <div className="bg-yellow-300 border-4 border-slate-900 rounded-3xl p-8 shadow-[8px_8px_0px_0px_#0f172a]">
            <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-3 bg-white inline-block px-4 py-2 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
              <ShieldCheck className="w-6 h-6 stroke-[3]" /> O que caracteriza um MU?
            </h3>
            
            <div className="space-y-6 mt-4">
              
              {/* Melhoria Funcional */}
              <div className="bg-white border-4 border-slate-900 p-6 rounded-2xl shadow-[4px_4px_0px_0px_#0f172a] flex flex-col md:flex-row gap-6 items-start">
                <div className="w-12 h-12 bg-emerald-400 border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_0px_#0f172a] flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6 stroke-[3] text-slate-900" />
                </div>
                <div>
                  <strong className="font-black uppercase text-xl text-slate-900 block mb-2">Melhoria Funcional</strong>
                  <p className="text-slate-800 font-bold leading-relaxed text-sm">
                    A grande diferença para a PI é que o MU não precisa ser uma invenção complexa e revolucionária. Basta pegar um objeto que já existe e alterar seu design (forma/estrutura) de modo que ele fique mais prático, eficiente ou fácil de fabricar (Ex: uma tesoura com formato ergonômico que não machuca o dedo).
                  </p>
                </div>
              </div>

              {/* Ato Inventivo */}
              <div className="bg-white border-4 border-slate-900 p-6 rounded-2xl shadow-[4px_4px_0px_0px_#0f172a] flex flex-col md:flex-row gap-6 items-start">
                <div className="w-12 h-12 bg-orange-400 border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_0px_#0f172a] flex items-center justify-center shrink-0">
                  <Lightbulb className="w-6 h-6 stroke-[3] text-slate-900" />
                </div>
                <div>
                  <strong className="font-black uppercase text-xl text-slate-900 block mb-2">Ato Inventivo (e não Atividade Inventiva)</strong>
                  <p className="text-slate-800 font-bold leading-relaxed text-sm">
                    O nível de exigência tecnológica é menor. Ele não pode ser uma mudança vulgar ou puramente estética, mas o INPI aceita melhorias que seriam óbvias demais para conseguirem uma Patente de Invenção plena.
                  </p>
                </div>
              </div>

              {/* Novidade e Aplicação Industrial */}
              <div className="bg-white border-4 border-slate-900 p-6 rounded-2xl shadow-[4px_4px_0px_0px_#0f172a] flex flex-col md:flex-row gap-6 items-start">
                <div className="w-12 h-12 bg-blue-400 border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_0px_#0f172a] flex items-center justify-center shrink-0">
                  <Factory className="w-6 h-6 stroke-[3] text-slate-900" />
                </div>
                <div>
                  <strong className="font-black uppercase text-xl text-slate-900 block mb-2">Novidade e Aplicação Industrial</strong>
                  <p className="text-slate-800 font-bold leading-relaxed text-sm">
                    Assim como na PI, a melhoria funcional do objeto precisa ser nova no mundo inteiro e deve ser possível de ser fabricada em escala industrial.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Duração da Proteção */}
          <div className="bg-teal-400 border-4 border-slate-900 rounded-3xl p-8 shadow-[8px_8px_0px_0px_#0f172a]">
            <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tighter mb-4 flex items-center gap-3">
              <Clock className="w-8 h-8 stroke-[3]" /> Duração da Proteção
            </h3>
            <div className="bg-white border-4 border-slate-900 p-6 rounded-2xl shadow-[4px_4px_0px_0px_#0f172a]">
              <p className="text-base font-bold text-slate-800 leading-relaxed">
                O prazo de validade é de <strong className="font-black uppercase tracking-wider text-slate-900 bg-emerald-300 px-2 py-1 border-2 border-slate-900 inline-block mx-1">15 anos</strong>, contados a partir da data de depósito no INPI. Por se tratar de uma melhoria menor e com ciclo de vida comercial mais rápido, o prazo é mais curto que o da Patente de Invenção (20 anos).
              </p>
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="px-8 py-6 border-t-4 border-slate-900 bg-slate-100 rounded-b-[1.75rem] flex justify-end">
          <button 
            onClick={onClose} 
            className="w-full sm:w-auto bg-white text-slate-900 border-4 border-slate-900 px-10 py-4 rounded-xl hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a] transition-all shadow-[4px_4px_0px_0px_#0f172a] font-black uppercase tracking-widest text-sm"
          >
            Compreendi
          </button>
        </div>

      </div>
    </div>
  );
};

export default ModalMU;