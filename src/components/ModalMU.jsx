// @ts-nocheck
"use client"; 

import React, { useEffect } from 'react';

const ModalMU = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 h-screen flex items-center justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0 h-screen bg-emerald-950/30 backdrop-blur-sm transition-opacity" onClick={onClose} aria-hidden="true" />
      <div className="relative m-4 sm:m-6 bg-white rounded-3xl shadow-3xl w-full max-w-2xl overflow-hidden transform transition-all flex flex-col border border-gray-100 max-h-[90vh]">
        
        {/* Cabeçalho */}
        <div className="bg-emerald-50/50 px-8 py-5 flex justify-between items-center border-b border-emerald-100/50">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-600 p-3 rounded-xl text-white shadow-md">
              {/* Ícone de Ferramenta (representando melhoria prática/MU) */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.492-3.053c.217-.266.358-.595.4-.945l.1-1.071c.045-.487.48-.838.96-.838h.619c.48 0 .915-.351.96-.838l.1-1.071c.042-.35.183-.68.4-.945l2.492-3.053M11.42 15.17l-3.052 2.492c-.266.217-.595.358-.945.4l-1.071.1c-.487.045-.838.48-.838.96v.619c0 .48-.351.915-.838.96l-1.071.1c-.35.042-.68.183-.945.4l-3.052 2.492" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Modelo de Utilidade (MU)
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-emerald-600 hover:bg-emerald-100/50 p-2.5 rounded-full transition-colors"
            aria-label="Fechar modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Corpo do Conteúdo */}
        <div className="p-8 text-gray-700 space-y-8 overflow-y-auto max-h-[65vh]">
          <p className="text-lg leading-relaxed font-medium">
            Um <strong className="text-gray-950 font-semibold">Modelo de Utilidade</strong> (frequentemente chamado de "pequena patente") é destinado a objetos de uso prático que apresentem uma nova forma ou disposição, resultando em uma melhoria funcional no seu uso ou fabricação.
          </p>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-xl text-emerald-800 mb-5 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-emerald-500"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                O que caracteriza um MU?
            </h3>
            <ul className="space-y-5 text-base">
              <li className="flex gap-4 items-start">
                <div className="bg-emerald-100 text-emerald-700 p-2.5 rounded-full mt-0.5 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /></svg>
                </div>
                <div>
                  <strong className="font-semibold text-gray-900 block mb-1">Melhoria Funcional</strong>
                  <p className="text-gray-600 leading-relaxed">A grande diferença para a PI é que o MU não precisa ser uma invenção complexa e revolucionária. Basta pegar um objeto que já existe e alterar seu design (forma/estrutura) de modo que ele fique mais prático, eficiente ou fácil de fabricar (Ex: uma tesoura com formato ergonômico que não machuca o dedo).</p>
                </div>
              </li>
              <li className="flex gap-4 items-start">
                <div className="bg-amber-100 text-amber-700 p-2.5 rounded-full mt-0.5 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 21v-2.25m-6.364-.386l1.591-1.591M3 12h2.25m.386-6.364l1.591 1.591M12 18.75a6.75 6.75 0 110-13.5 6.75 6.75 0 010 13.5z" /></svg>
                </div>
                <div>
                  <strong className="font-semibold text-gray-900 block mb-1">Ato Inventivo (e não Atividade Inventiva)</strong>
                  <p className="text-gray-600 leading-relaxed">O nível de exigência tecnológica é menor. Ele não pode ser uma mudança vulgar ou puramente estética, mas o INPI aceita melhorias que seriam óbvias demais para conseguirem uma Patente de Invenção plena.</p>
                </div>
              </li>
              <li className="flex gap-4 items-start">
                <div className="bg-sky-100 text-sky-700 p-2.5 rounded-full mt-0.5 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" /></svg>
                </div>
                <div>
                  <strong className="font-semibold text-gray-900 block mb-1">Novidade e Aplicação Industrial</strong>
                  <p className="text-gray-600 leading-relaxed">Assim como na PI, a melhoria funcional do objeto precisa ser nova no mundo inteiro e deve ser possível de ser fabricada em escala industrial.</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100/50">
            <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-3">
              <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              Duração da Proteção
            </h3>
            <p className="text-base leading-relaxed text-gray-700">
              O prazo de validade é de <strong className="text-emerald-700 font-semibold">15 anos</strong>, contados a partir da data de depósito no INPI. Por se tratar de uma melhoria menor e com ciclo de vida comercial mais rápido, o prazo é mais curto que o da Patente de Invenção (20 anos).
            </p>
          </div>
        </div>

        {/* Rodapé */}
        <div className="bg-gray-50/50 px-8 py-5 flex justify-end rounded-b-3xl border-t border-gray-100/50">
          <button 
            onClick={onClose} 
            className="bg-emerald-600 text-white font-semibold px-10 py-3 rounded-xl shadow-md hover:bg-emerald-700 hover:shadow-lg focus:ring-4 focus:ring-emerald-100/70 transition-all text-lg"
          >
            Compreendi
          </button>
        </div>

      </div>
    </div>
  );
};

export default ModalMU;