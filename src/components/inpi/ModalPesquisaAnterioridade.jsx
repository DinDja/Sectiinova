import React, { useEffect, useState } from 'react';
import { 
  X, 
  Search, 
  ExternalLink, 
  Lightbulb, 
  ShieldAlert, 
  Tags, 
  FileText, 
  Maximize, 
  Minimize
} from 'lucide-react';

export default function ModalPesquisaAnterioridade({ isOpen, onClose }) {
  const [gifFullscreen, setGifFullscreen] = useState(false);

  useEffect(() => {
    if (isOpen || gifFullscreen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, gifFullscreen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200 font-sans">
      
      {/* INJEÇÃO DE CSS DA SCROLLBAR */}
      <style>{`
        .neo-scrollbar::-webkit-scrollbar { width: 8px; }
        .neo-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .neo-scrollbar::-webkit-scrollbar-thumb { background: #0f172a; border-radius: 10px; border: 2px solid #fff; }
      `}</style>

      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative bg-[#FAFAFA] border-4 border-slate-900 rounded-[2rem] shadow-[16px_16px_0px_0px_#0f172a] w-full max-w-4xl flex flex-col max-h-[90vh] animate-in zoom-in-[0.95] duration-200">
        
        {/* HEADER NEO-BRUTALISTA */}
        <div className="flex items-center justify-between px-8 py-6 border-b-4 border-slate-900 bg-yellow-300 rounded-t-[1.75rem]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] rounded-xl transform -">
              <Search size={24} className="stroke-[3] text-slate-900" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-slate-900">
              Pesquisa de Anterioridade
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

        {/* BODY */}
        <div className="p-8 overflow-y-auto neo-scrollbar flex flex-col gap-10">
          
          <div className="flex flex-col lg:flex-row gap-10 items-start">
            <div className="w-full lg:w-1/2 space-y-8">
              <p className="text-slate-900 font-bold leading-relaxed text-lg bg-white p-5 border-4 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_#0f172a] transform ">
                Esta é a etapa essencial para verificar se já existe algo similar ou idêntico à sua invenção ou marca.
              </p>
              
              <div className="bg-teal-400 border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] rounded-[1.5rem] p-6 flex flex-col gap-4 transform -">
                <span className="text-sm font-black text-slate-900 bg-white px-3 py-1 border-2 border-slate-900 inline-block w-fit uppercase tracking-widest shadow-[2px_2px_0px_0px_#0f172a]">
                  Acesse o Sistema
                </span>
                <p className="text-base font-bold text-slate-900 leading-relaxed">
                  Realize buscas nacionais no BuscaWeb INPI e buscas internacionais na WIPO, EPO e USPTO.
                </p>
                <a 
                  href="https://busca.inpi.gov.br/pePI/" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center justify-center gap-3 bg-white text-slate-900 border-4 border-slate-900 px-6 py-4 rounded-xl hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a] transition-all font-black uppercase tracking-widest text-xs shadow-[2px_2px_0px_0px_#0f172a] mt-2"
                >
                  Abrir BuscaWeb INPI <ExternalLink size={20} className="stroke-[3]" />
                </a>
              </div>
            </div>
            
            <div className="w-full lg:w-1/2 bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] rounded-[1.5rem] p-4 flex items-center justify-center min-h-[16rem] relative group transform ">
              {!gifFullscreen && (
                <button
                  type="button"
                  className="absolute top-6 right-6 z-20 inline-flex items-center gap-2 rounded-xl bg-yellow-300 border-2 border-slate-900 text-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all opacity-0 group-hover:opacity-100"
                  onClick={() => setGifFullscreen(true)}
                >
                  <Maximize size={16} className="stroke-[3]" />
                  Tela cheia
                </button>
              )}

              <img 
                src="/Gifs/pesquisa.gif" 
                alt="Exemplo de pesquisa no BuscaWeb INPI" 
                className="w-full h-auto object-cover rounded-xl border-2 border-slate-900" 
              />
            </div>
          </div>

          <div className="border-t-4 border-slate-900 border-dashed pt-10">
            <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 mb-8 flex items-center gap-3 bg-white inline-block px-4 py-2 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform -">
              <Lightbulb className="text-yellow-500 stroke-[3]" size={32} />
              Recomendações Estratégicas
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Card 1 */}
              <div className="bg-blue-300 border-4 border-slate-900 rounded-2xl p-6 shadow-[6px_6px_0px_0px_#0f172a] hover:-translate-y-1 transition-transform">
                <div className="flex items-center gap-3 mb-4 bg-white px-3 py-2 border-2 border-slate-900 inline-flex shadow-[2px_2px_0px_0px_#0f172a] transform ">
                  <Search size={20} className="text-blue-600 stroke-[3]" />
                  <h4 className="font-black uppercase tracking-widest text-xs text-slate-900">Pesquisa "Radical"</h4>
                </div>
                <p className="text-sm font-bold text-slate-900 leading-relaxed bg-white/60 p-4 border-2 border-slate-900 rounded-xl">
                  Busque pelo núcleo do sinal registrado. Ex: para "Bruxas Festas", pesquise apenas por "Bruxas" para encontrar semelhanças e aproximações.
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-pink-400 border-4 border-slate-900 rounded-2xl p-6 shadow-[6px_6px_0px_0px_#0f172a] hover:-translate-y-1 transition-transform">
                <div className="flex items-center gap-3 mb-4 bg-white px-3 py-2 border-2 border-slate-900 inline-flex shadow-[2px_2px_0px_0px_#0f172a] transform -">
                  <ShieldAlert size={20} className="text-pink-600 stroke-[3]" />
                  <h4 className="font-black uppercase tracking-widest text-xs text-slate-900">Fonética e Grafia</h4>
                </div>
                <p className="text-sm font-bold text-slate-900 leading-relaxed bg-white/60 p-4 border-2 border-slate-900 rounded-xl">
                  Sinais similares causam confusão mesmo com grafias diferentes. O INPI avalia o som da palavra (Ex: <em className="font-black">McDuck</em> vs <em className="font-black">McDonalds</em>).
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-orange-400 border-4 border-slate-900 rounded-2xl p-6 shadow-[6px_6px_0px_0px_#0f172a] hover:-translate-y-1 transition-transform">
                <div className="flex items-center gap-3 mb-4 bg-white px-3 py-2 border-2 border-slate-900 inline-flex shadow-[2px_2px_0px_0px_#0f172a] transform ">
                  <Tags size={20} className="text-orange-600 stroke-[3]" />
                  <h4 className="font-black uppercase tracking-widest text-xs text-slate-900">Classes Econômicas</h4>
                </div>
                <p className="text-sm font-bold text-slate-900 leading-relaxed bg-white/60 p-4 border-2 border-slate-900 rounded-xl">
                  As marcas são protegidas de acordo com sua classe econômica. Sempre verifique as classes existentes para evitar colisões no seu setor.
                </p>
              </div>

              {/* Card 4 */}
              <div className="bg-emerald-400 border-4 border-slate-900 rounded-2xl p-6 shadow-[6px_6px_0px_0px_#0f172a] hover:-translate-y-1 transition-transform">
                <div className="flex items-center gap-3 mb-4 bg-white px-3 py-2 border-2 border-slate-900 inline-flex shadow-[2px_2px_0px_0px_#0f172a] transform -">
                  <FileText size={20} className="text-emerald-600 stroke-[3]" />
                  <h4 className="font-black uppercase tracking-widest text-xs text-slate-900">Documente Tudo</h4>
                </div>
                <p className="text-sm font-bold text-slate-900 leading-relaxed bg-white/60 p-4 border-2 border-slate-900 rounded-xl">
                  Use sinônimos, filtre pela classificação internacional (IPC/CCI) para aumentar a precisão, e guarde as datas e termos da sua busca.
                </p>
              </div>

            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="px-8 py-6 border-t-4 border-slate-900 bg-slate-100 rounded-b-[1.75rem] flex justify-end">
          <button 
            onClick={onClose} 
            className="w-full sm:w-auto bg-white text-slate-900 border-4 border-slate-900 px-8 py-4 rounded-xl hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a] transition-all shadow-[4px_4px_0px_0px_#0f172a] font-black uppercase tracking-widest text-xs"
          >
            Entendi, fechar tutorial
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
            src="/Gifs/pesquisa.gif"
            alt="Exemplo de pesquisa no BuscaWeb INPI (fullscreen)"
            className="max-h-[calc(100vh-6rem)] max-w-[calc(100vw-4rem)] rounded-2xl border-4 border-slate-900 shadow-[16px_16px_0px_0px_#0f172a] bg-white object-contain"
          />
        </div>
      )}
    </div>
  );
}