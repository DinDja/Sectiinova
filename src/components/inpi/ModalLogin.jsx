"use client"; 

import React, { useState, useEffect } from 'react';
import { UserPlus, ExternalLink, ShieldCheck, Maximize, Minimize, X } from 'lucide-react';

export default function ModalLogin({ isOpen, onClose }) {
  const [gifFullscreen, setGifFullscreen] = useState(false);

  useEffect(() => {
    if (isOpen || gifFullscreen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, gifFullscreen]);

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
      <div className="relative bg-[#FAFAFA] border-4 border-slate-900 rounded-[2rem] shadow-[16px_16px_0px_0px_#0f172a] w-full max-w-5xl flex flex-col max-h-[90vh] animate-in zoom-in-[0.95] duration-200 overflow-hidden">
        
        {/* HEADER NEO-BRUTALISTA (Sem rotação) */}
        <div className="flex items-center justify-between px-8 py-6 border-b-4 border-slate-900 bg-purple-400">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] rounded-xl flex items-center justify-center">
              <UserPlus size={24} className="stroke-[3] text-slate-900" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-slate-900">
              Como criar seu acesso no INPI
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

        {/* CORPO DO MODAL (Duas Colunas) */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto neo-scrollbar">
          
          {/* COLUNA ESQUERDA: Instruções */}
          <div className="p-8 lg:w-1/2 flex flex-col gap-8">
            <p className="text-base font-bold text-slate-900 leading-relaxed bg-white p-5 border-4 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_#0f172a]">
              Para depositar sua patente, você precisa de um login unificado no sistema e-INPI. Siga os passos abaixo:
            </p>

            <div className="space-y-8 pl-2">
              
              {/* Passo 1 */}
              <div className="flex gap-4 items-start">
                <div className="bg-yellow-300 text-slate-900 w-10 h-10 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] flex items-center justify-center font-black text-xl shrink-0 mt-1">
                  1
                </div>
                <div>
                  <strong className="font-black uppercase text-lg text-slate-900 tracking-tighter block mb-2">Acesse o portal</strong>
                  <p className="text-sm font-bold text-slate-700 leading-relaxed mb-4">
                    Entre na página de peticionamento eletrônico clicando no botão abaixo:
                  </p>
                  <a 
                    href="https://gru.inpi.gov.br/peticionamentoeletronico/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-white text-slate-900 border-2 border-slate-900 px-4 py-2 rounded-xl hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a] transition-all font-black uppercase tracking-widest text-xs shadow-[2px_2px_0px_0px_#0f172a]"
                  >
                    Acessar e-Patentes <ExternalLink className="w-4 h-4 stroke-[3]" />
                  </a>
                </div>
              </div>

              {/* Passo 2 */}
              <div className="flex gap-4 items-start">
                <div className="bg-pink-400 text-slate-900 w-10 h-10 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] flex items-center justify-center font-black text-xl shrink-0 mt-1">
                  2
                </div>
                <div>
                  <strong className="font-black uppercase text-lg text-slate-900 tracking-tighter block mb-2">Inicie o Cadastro</strong>
                  <p className="text-sm font-bold text-slate-700 leading-relaxed">
                    Na tela de login, ignore os campos de usuário/senha e clique no link <strong className="font-black bg-slate-200 px-1 border border-slate-900">"Cadastre-se aqui"</strong> ou em "Cliente (Pessoa Física ou Jurídica)".
                  </p>
                </div>
              </div>

              {/* Passo 3 */}
              <div className="flex gap-4 items-start">
                <div className="bg-teal-400 text-slate-900 w-10 h-10 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] flex items-center justify-center font-black text-xl shrink-0 mt-1">
                  3
                </div>
                <div>
                  <strong className="font-black uppercase text-lg text-slate-900 tracking-tighter block mb-2">Preencha o formulário</strong>
                  <p className="text-sm font-bold text-slate-700 leading-relaxed mb-3">
                    Informe sua <strong className="font-black">Nacionalidade</strong> e escolha com cuidado a <strong className="font-black">Natureza Jurídica</strong>. Preencha os dados de localização e não se esqueça de informar um <strong className="font-black">E-mail</strong> válido, Login e Senha.
                  </p>
                  <div className="inline-flex items-start gap-2 bg-slate-100 border-2 border-slate-900 p-3 rounded-xl shadow-[2px_2px_0px_0px_#0f172a]">
                    <ShieldCheck className="w-5 h-5 text-teal-600 stroke-[3] shrink-0 mt-0.5" /> 
                    <span className="text-xs font-bold text-slate-900 leading-relaxed">
                      Se for estudante ou microempresa, marque a opção correta para garantir o desconto nas taxas.
                    </span>
                  </div>
                </div>
              </div>

              {/* Passo 4 */}
              <div className="flex gap-4 items-start">
                <div className="bg-orange-400 text-slate-900 w-10 h-10 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] flex items-center justify-center font-black text-xl shrink-0 mt-1">
                  4
                </div>
                <div>
                  <strong className="font-black uppercase text-lg text-slate-900 tracking-tighter block mb-2">Confirme o e-mail</strong>
                  <p className="text-sm font-bold text-slate-700 leading-relaxed">
                    Crie sua senha, aceite o termo de adesão e salve. Você usará esse mesmo login para pagar as GRUs e enviar os arquivos.
                  </p>
                </div>
              </div>

            </div>
          </div>
          
          {/* COLUNA DIREITA: GIF Visualização */}
          <div className="p-8 lg:w-1/2 bg-blue-300 border-t-4 lg:border-t-0 lg:border-l-4 border-slate-900 flex flex-col justify-center">
            
            <div className="bg-white border-4 border-slate-900 p-4 rounded-2xl shadow-[8px_8px_0px_0px_#0f172a] mb-6 inline-block w-fit">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                Acompanhe na tela
              </h3>
            </div>

            <div className="w-full bg-white border-4 border-slate-900 rounded-3xl h-64 md:h-96 flex flex-col items-center justify-center relative overflow-hidden shadow-[8px_8px_0px_0px_#0f172a] group">
              {!gifFullscreen && (
                <button
                  type="button"
                  className="absolute top-4 right-4 z-20 inline-flex items-center gap-2 rounded-xl bg-yellow-300 border-2 border-slate-900 text-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all opacity-0 group-hover:opacity-100"
                  onClick={() => setGifFullscreen(true)}
                >
                  <Maximize size={16} className="stroke-[3]" />
                  Tela cheia
                </button>
              )}
              
              <img 
                src="/Gifs/cadastro.gif" 
                alt="Tutorial de Cadastro no INPI" 
                className="w-full h-full object-cover absolute inset-0 z-10 border-2 border-slate-900" 
              />
            </div>

            <div className="mt-6 bg-white/60 p-4 border-2 border-slate-900 rounded-xl">
              <p className="text-xs font-bold text-slate-900 text-center leading-relaxed">
                O visual do site do INPI pode sofrer atualizações, mas a lógica de cadastro no e-INPI permanece a mesma.
              </p>
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="px-8 py-6 border-t-4 border-slate-900 bg-slate-100 rounded-b-[1.75rem] flex justify-end">
          <button 
            onClick={onClose} 
            className="w-full sm:w-auto bg-white text-slate-900 border-4 border-slate-900 px-8 py-4 rounded-xl hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a] transition-all shadow-[4px_4px_0px_0px_#0f172a] font-black uppercase tracking-widest text-xs"
          >
            Entendi, fechar
          </button>
        </div>

      </div>

      {/* FULLSCREEN GIF OVERLAY */}
      {gifFullscreen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/95 p-4 animate-in fade-in">
          <button
            type="button"
            onClick={() => setGifFullscreen(false)}
            className="absolute top-6 right-6 z-40 inline-flex items-center gap-2 rounded-xl bg-yellow-300 border-4 border-slate-900 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all"
          >
            <Minimize size={20} className="stroke-[3]" />
            Fechar Tela Cheia
          </button>
          <img
            src="/Gifs/cadastro.gif"
            alt="Tutorial de Cadastro no INPI (fullscreen)"
            className="max-h-[calc(100vh-6rem)] max-w-[calc(100vw-4rem)] rounded-2xl border-4 border-slate-900 shadow-[16px_16px_0px_0px_#0f172a] bg-white object-contain"
          />
        </div>
      )}

    </div>
  );
}