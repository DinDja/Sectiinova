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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <Search size={20} strokeWidth={2.5} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              Pesquisa de Anterioridade
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-full md:w-1/2 space-y-4">
              <p className="text-slate-600 leading-relaxed text-lg">
                Esta é a etapa essencial para verificar se já existe algo similar ou idêntico à sua invenção ou marca.
              </p>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex flex-col gap-3">
                <span className="text-sm font-semibold text-emerald-800 uppercase tracking-wider">Acesse o Sistema</span>
                <p className="text-sm text-emerald-900/80">
                  Realize buscas nacionais no BuscaWeb INPI e buscas internacionais na WIPO, EPO e USPTO.
                </p>
                <a 
                  href="https://busca.inpi.gov.br/pePI/" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm w-full shadow-sm"
                >
                  Abrir BuscaWeb INPI <ExternalLink size={16} />
                </a>
              </div>
            </div>
            
            <div className="w-full md:w-1/2 bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center justify-center min-h-[16rem] relative">
              {!gifFullscreen && (
                <button
                  type="button"
                  className="absolute top-2 right-2 z-20 inline-flex items-center gap-1 rounded-md bg-slate-900/80 text-white px-2 py-1 text-xs font-semibold hover:bg-slate-800"
                  onClick={() => setGifFullscreen(true)}
                >
                  <Maximize size={14} />
                  Tela cheia
                </button>
              )}

              <img 
                src="/Gifs/pesquisa.gif" 
                alt="Exemplo de pesquisa no BuscaWeb INPI" 
                className="w-full h-auto object-cover rounded-lg mix-blend-multiply" 
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Lightbulb className="text-amber-500" size={20} />
              Recomendações Estratégicas
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-emerald-300 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Search size={18} className="text-blue-500" />
                  <h4 className="font-semibold text-slate-800">Pesquisa "Radical"</h4>
                </div>
                <p className="text-sm text-slate-600">
                  Busque pelo núcleo do sinal registrado. Ex: para "Bruxas Festas", pesquise apenas por "Bruxas" para encontrar semelhanças e aproximações.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-emerald-300 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert size={18} className="text-red-500" />
                  <h4 className="font-semibold text-slate-800">Fonética e Grafia</h4>
                </div>
                <p className="text-sm text-slate-600">
                  Sinais similares causam confusão mesmo com grafias diferentes. O INPI avalia o som da palavra (Ex: <em>McDuck</em> vs <em>McDonalds</em>).
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-emerald-300 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Tags size={18} className="text-purple-500" />
                  <h4 className="font-semibold text-slate-800">Classes Econômicas</h4>
                </div>
                <p className="text-sm text-slate-600">
                  As marcas são protegidas de acordo com sua classe econômica. Sempre verifique as classes existentes para evitar colisões no seu setor.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-emerald-300 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={18} className="text-emerald-600" />
                  <h4 className="font-semibold text-slate-800">Documente Tudo</h4>
                </div>
                <p className="text-sm text-slate-600">
                  Use sinônimos, filtre pela classificação internacional (IPC/CCI) para aumentar a precisão, e guarde as datas e termos da sua busca.
                </p>
              </div>
            </div>
          </div>

        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-end">
          <button 
            onClick={onClose} 
            className="bg-slate-800 text-white px-6 py-2.5 rounded-lg hover:bg-slate-900 transition-colors shadow-sm font-medium"
          >
            Entendi, fechar tutorial
          </button>
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
            src="/Gifs/pesquisa.gif"
            alt="Exemplo de pesquisa no BuscaWeb INPI (fullscreen)"
            className="max-h-[calc(100vh-3rem)] max-w-[calc(100vw-3rem)] rounded-xl shadow-2xl"
          />
        </div>
      )}
      </div>
    </div>
  );
}