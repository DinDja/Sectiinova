"use client"; 

import React, { useState } from 'react';
import { UserPlus, ExternalLink, ShieldCheck, Mail, Maximize, Minimize } from 'lucide-react';

const ModalLogin = ({ isOpen, onClose }) => {
  const [gifFullscreen, setGifFullscreen] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm transition-opacity p-4">
      
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden transform transition-all flex flex-col border border-slate-100 max-h-[90vh]">
        
        <div className="bg-indigo-50/50 px-6 py-4 md:px-8 md:py-5 flex justify-between items-center border-b border-indigo-100/50">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-md">
              <UserPlus className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight">
              Como criar seu acesso no INPI
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-100/50 p-2 rounded-full transition-colors"
            aria-label="Fechar modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row overflow-y-auto">
          
          <div className="p-6 md:p-8 text-slate-700 space-y-6 lg:w-1/2 flex-shrink-0">
            <p className="text-sm md:text-base leading-relaxed text-slate-600 mb-2">
              Para depositar sua patente, você precisa de um login unificado no sistema e-INPI. Siga os passos abaixo:
            </p>

            <div className="space-y-5">
              <div className="flex gap-3 items-start">
                <div className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <strong className="font-semibold text-slate-800 block">Acesse o portal</strong>
                  <p className="text-sm text-slate-600 mt-1">
                    Entre na página de peticionamento eletrônico clicando no botão abaixo:
                  </p>
                  <a 
                    href="https://gru.inpi.gov.br/peticionamentoeletronico/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100"
                  >
                    Acessar e-Patentes <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <strong className="font-semibold text-slate-800 block">Inicie o Cadastro</strong>
                  <p className="text-sm text-slate-600 mt-1">
                    Na tela de login, ignore os campos de usuário/senha e clique no link <strong className="text-slate-700">"Cadastre-se aqui"</strong> ou em "Cliente (Pessoa Física ou Jurídica)".
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <strong className="font-semibold text-slate-800 block">Preencha o formulário</strong>
                  <p className="text-sm text-slate-600 mt-1">
                    Informe sua <strong>Nacionalidade</strong> e escolha com cuidado a <strong>Natureza Jurídica</strong>. Preencha os dados de localização e não se esqueça de informar um <strong>E-mail</strong> válido, Login e Senha.
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-medium mt-1 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                      <ShieldCheck className="w-3 h-3" /> Se for estudante ou microempresa, marque a opção correta para garantir o desconto nas taxas.
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                  4
                </div>
                <div>
                  <strong className="font-semibold text-slate-800 block">Confirme o e-mail</strong>
                  <p className="text-sm text-slate-600 mt-1">
                    Crie sua senha, aceite o termo de adesão e salve. Você usará esse mesmo login para pagar as GRUs e enviar os arquivos.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-6 md:p-8 lg:w-1/2 border-t lg:border-t-0 lg:border-l border-slate-100 flex flex-col items-center justify-center">
            
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 w-full text-left">
              Acompanhe na tela
            </h3>

            <div className="w-full bg-slate-200 border border-slate-300 rounded-xl h-64 md:h-80 flex flex-col items-center justify-center relative overflow-hidden shadow-inner group">
              {!gifFullscreen && (
                <button
                  type="button"
                  className="absolute top-2 right-2 z-20 inline-flex items-center gap-1 rounded-md bg-slate-900/80 text-white px-2 py-1 text-xs font-semibold hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setGifFullscreen(true)}
                >
                  <Maximize size={14} />
                  Tela cheia
                </button>
              )}
              
              <img 
                src="/Gifs/cadastro.gif" 
                alt="Tutorial de Cadastro no INPI" 
                className="w-full h-full object-cover absolute inset-0 z-10" 
              />
            </div>

            <p className="text-xs text-center text-slate-400 mt-4">
              O visual do site do INPI pode sofrer atualizações, mas a lógica de cadastro no e-INPI permanece a mesma.
            </p>
          </div>

        </div>

        <div className="bg-white px-6 py-4 md:px-8 md:py-5 flex justify-end rounded-b-3xl border-t border-slate-100">
          <button 
            onClick={onClose} 
            className="bg-indigo-600 text-white font-semibold px-8 py-2.5 rounded-xl shadow-sm hover:bg-indigo-700 hover:shadow focus:ring-4 focus:ring-indigo-100 transition-all text-sm md:text-base"
          >
            Entendi, fechar
          </button>
        </div>

      </div>

      {gifFullscreen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/90 p-4">
          <button
            type="button"
            onClick={() => setGifFullscreen(false)}
            className="absolute top-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-white"
          >
            <Minimize size={16} />
            Fechar
          </button>
          <img
            src="/Gifs/cadastro.gif"
            alt="Tutorial de Cadastro no INPI (fullscreen)"
            className="max-h-[calc(100vh-3rem)] max-w-[calc(100vw-3rem)] rounded-xl shadow-2xl"
          />
        </div>
      )}

    </div>
  );
};

export default ModalLogin;