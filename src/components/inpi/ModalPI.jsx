"use client"; 

import React, { useEffect } from 'react';

const ModalPI = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 h-screen flex items-center justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0 h-screen bg-blue-950/30 backdrop-blur-sm transition-opacity" onClick={onClose} aria-hidden="true" />
      <div className="relative m-4 sm:m-6 bg-white rounded-3xl shadow-3xl w-full max-w-2xl overflow-hidden transform transition-all flex flex-col border border-gray-100 max-h-[90vh]">
        
        <div className="bg-blue-50/50 px-8 py-5 flex justify-between items-center border-b border-blue-100/50">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-xl text-white shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.82 1.508-2.316a7.5 7.5 0 10-7.516 0c.85.496 1.508 1.333 1.508 2.316V18" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Patente de Invenção (PI)
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-blue-600 hover:bg-blue-100/50 p-2.5 rounded-full transition-colors"
            aria-label="Fechar modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8 text-gray-700 space-y-8 overflow-y-auto max-h-[65vh]">
          <p className="text-lg leading-relaxed font-medium">
            Uma <strong className="text-gray-950 font-semibold">Patente de Invenção</strong> é um título de propriedade concedido pelo INPI que garante ao inventor o direito exclusivo de explorar sua criação comercialmente.
          </p>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-xl text-blue-800 mb-5 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-blue-500"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                Requisitos Básicos
            </h3>
            <ul className="space-y-5 text-base">
              <li className="flex gap-4 items-start">
                <div className="bg-emerald-100 text-emerald-700 p-2.5 rounded-full mt-0.5 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 21v-2.25m-6.364-.386l1.591-1.591M3 12h2.25m.386-6.364l1.591 1.591M12 18.75a6.75 6.75 0 110-13.5 6.75 6.75 0 010 13.5z" /></svg>
                </div>
                <div>
                  <strong className="font-semibold text-gray-900 block mb-1">Novidade</strong>
                  <p className="text-gray-600 leading-relaxed">A invenção deve ser totalmente inédita. Isso significa que ela não pode ter sido descrita, publicada, comercializada ou tornada acessível ao público em nenhum lugar do mundo antes da data de depósito do pedido.</p>
                </div>
              </li>
              <li className="flex gap-4 items-start">
                <div className="bg-amber-100 text-amber-700 p-2.5 rounded-full mt-0.5 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.456-2.456L18 2.25l.259 1.036a3.375 3.375 0 002.456 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>
                </div>
                <div>
                  <strong className="font-semibold text-gray-900 block mb-1">Atividade Inventiva</strong>
                  <p className="text-gray-600 leading-relaxed">A solução proposta não pode ser uma conclusão óbvia ou uma mera combinação de coisas que já existem para um técnico ou especialista daquela área. Ela precisa representar um verdadeiro avanço ou "salto" tecnológico.</p>
                </div>
              </li>
              <li className="flex gap-4 items-start">
                <div className="bg-sky-100 text-sky-700 p-2.5 rounded-full mt-0.5 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
                </div>
                <div>
                  <strong className="font-semibold text-gray-900 block mb-1">Aplicação Industrial</strong>
                  <p className="text-gray-600 leading-relaxed">A invenção (seja um produto ou um processo) precisa ser passível de fabricação ou utilização prática em qualquer tipo de indústria, não podendo ser algo puramente teórico, uma regra de jogo ou uma descoberta abstrata.</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100/50">
            <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-3">
              <div className="bg-blue-100 text-blue-700 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              Duração da Proteção
            </h3>
            <p className="text-base leading-relaxed text-gray-700">
              O prazo de validade é rigorosamente de <strong className="text-blue-700 font-semibold">20 anos</strong>, contados a partir da data de depósito no INPI. Após este período, a tecnologia cai em domínio público, permitindo o uso livre por terceiros.
            </p>
          </div>
        </div>

        <div className="bg-gray-50/50 px-8 py-5 flex justify-end rounded-b-3xl border-t border-gray-100/50">
          <button 
            onClick={onClose} 
            className="bg-blue-600 text-white font-semibold px-10 py-3 rounded-xl shadow-md hover:bg-blue-700 hover:shadow-lg focus:ring-4 focus:ring-blue-100/70 transition-all text-lg"
          >
            Compreendi
          </button>
        </div>

      </div>
    </div>
  );
};

export default ModalPI;