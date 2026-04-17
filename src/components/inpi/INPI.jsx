import React, { useState } from "react";
import { BookOpen, CheckSquare, Clock3, File, FileText } from "lucide-react";
import ModalPesquisaAnterioridade from "./ModalPesquisaAnterioridade";
import AutonomousINPIAgent from "./AutonomousINPIAgent";
import INPIProcessTracker from "./INPIProcessTracker";
import ChecklistSidebar from "./ChecklistSidebar";
import DocumentosObrigatorios from "./DocumentosObrigatorios";
import GeradorDocumentos from "./GeradorDocumentos";
import GuiaINPI from "./GuiaINPI";

export default function INPI({ clubProjects = [], loggedUser = null }) {
  const [activeTab, setActiveTab] = useState("guia");
  const [isPesquisaModalOpen, setIsPesquisaModalOpen] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [viewMode, setViewMode] = useState("leitura_rapida");

  // Configuração das abas para facilitar a renderização no estilo Neo-Brutalista
  const tabs = [
    { id: "guia", label: "Guia Completo", icon: BookOpen, color: "bg-yellow-300" },
    { id: "documentos", label: "Documentos Obrigatórios", icon: File, color: "bg-pink-400" },
    { id: "gerador", label: "Gerador de Documentos", icon: FileText, color: "bg-teal-400" },
    { id: "agente", label: "GUIÁ", img: "/Lobo.svg", color: "bg-orange-400" },
    { id: "acompanhamento", label: "Acompanhamento", icon: Clock3, color: "bg-blue-400" },
  ];

  return (
    <div className="min-h-screen font-sans text-slate-900 overflow-x-hidden relative">
      
      {/* INJEÇÃO DE CSS DA SCROLLBAR HORIZONTAL */}
      <style>{`
        .neo-scrollbar-x::-webkit-scrollbar { height: 10px; }
        .neo-scrollbar-x::-webkit-scrollbar-track { background: #f1f5f9; border-top: 4px solid #0f172a; border-bottom: 4px solid #0f172a; }
        .neo-scrollbar-x::-webkit-scrollbar-thumb { background: #0f172a; border-radius: 0px; }
      `}</style>

      {/* PADRÃO DE FUNDO - GRID (BLUEPRINT) NEO-BRUTALISTA */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a15_2px,transparent_2px),linear-gradient(to_bottom,#0f172a15_2px,transparent_2px)] bg-[size:40px_40px]"></div>
      </div>

      {/* HEADER NEO-BRUTALISTA */}
      <header className="bg-purple-400 border-b-4 border-slate-900 relative shadow-[0_8px_0_0_#0f172a]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMwZjE3MmEiLz48L3N2Zz4=')] opacity-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6 relative ">
          <div className="overflow-hidden rounded-[28px] border-4 border-slate-900 bg-white shadow-[8px_8px_0px_0px_#0f172a]">
            <img
              src="/logoPatentes.svg"
              alt="Banner do PatentesLab"
              className="block w-full h-auto"
            />
          </div>
        </div>
      </header>

      {/* NAVEGAÇÃO DE ABAS */}
      <nav className="bg-white border-b-4 border-slate-900 sticky top-0 z-1">
        <div className="max-w-7xl mx-auto flex neo-scrollbar-x px-4 py-4 md:py-6 gap-4">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-3 px-6 py-3 font-black uppercase tracking-widest text-xs md:text-sm rounded-xl border-4 border-slate-900 transition-all whitespace-nowrap shrink-0
                  ${isActive
                    ? `${tab.color} text-slate-900 shadow-[inset_0_-4px_0_0_rgba(0,0,0,0.2)] translate-y-1 translate-x-1`
                    : 'bg-white text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_#0f172a]'
                  }
                `}
              >
                {tab.img ? (
                  <div className="w-6 h-6 rounded-full border-2 border-slate-900 bg-white flex items-center justify-center overflow-hidden">
                    <img src={tab.img} alt="Ícone GUIÁ" className="w-4 h-4 object-contain" />
                  </div>
                ) : (
                  <tab.icon className="w-5 h-5 stroke-[3]" />
                )}
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      <ModalPesquisaAnterioridade
        isOpen={isPesquisaModalOpen}
        onClose={() => setIsPesquisaModalOpen(false)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 relative z-1">
        
        {/* BARRA DE CONTROLES (View Mode & Checklist) */}
        <div className="mb-10 flex justify-end">
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
            
            {/* Toggle de Modo de Leitura */}
            <div className="inline-flex items-center rounded-2xl border-4 border-slate-900 bg-white p-1.5 shadow-[4px_4px_0px_0px_#0f172a]">
              <button
                onClick={() => setViewMode("leitura_rapida")}
                className={`rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
                  viewMode === "leitura_rapida"
                    ? "bg-slate-900 text-white shadow-inner"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                Leitura Rápida
              </button>
              <button
                onClick={() => setViewMode("completo")}
                className={`rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
                  viewMode === "completo"
                    ? "bg-slate-900 text-white shadow-inner"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                Modo Completo
              </button>
            </div>

            {/* Toggle de Checklist */}
            <button
              onClick={() => setShowChecklist((prev) => !prev)}
              className={`inline-flex items-center justify-center gap-3 rounded-2xl border-4 border-slate-900 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-slate-900 transition-all
                ${showChecklist 
                  ? 'bg-pink-400 shadow-[2px_2px_0px_0px_#0f172a] translate-y-0.5 translate-x-0.5' 
                  : 'bg-yellow-300 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_#0f172a]'
                }
              `}
            >
              <CheckSquare className="w-5 h-5 stroke-[3]" />
              {showChecklist ? "Ocultar Checklist" : "Marcar Checklist"}
            </button>
          </div>
        </div>

        {/* LAYOUT PRINCIPAL (Sidebar + Conteúdo) */}
        <div
          className={`grid gap-10 items-start ${
            showChecklist ? "lg:grid-cols-[380px_1fr]" : "grid-cols-1"
          }`}
        >
          
          {/* SIDEBAR DO CHECKLIST */}
          {showChecklist && (
            <aside className="bg-white p-8 rounded-[2rem] shadow-[8px_8px_0px_0px_#0f172a] border-4 border-slate-900 sticky top-36 self-start animate-in slide-in-from-left-8 duration-300">
              <div className="flex items-center gap-3 mb-6 border-b-4 border-slate-900 pb-4">
                <div className="w-4 h-8 bg-pink-400 border-2 border-slate-900"></div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">
                  Checklist <br/> Completo
                </h2>
              </div>
              <ChecklistSidebar loggedUser={loggedUser} />
            </aside>
          )}

          {/* ÁREA DE CONTEÚDO (Abas) */}
          <section className="w-full min-w-0 animate-in fade-in duration-500">
            {activeTab === "guia" && (
              <GuiaINPI
                onOpenPesquisa={() => setIsPesquisaModalOpen(true)}
                viewMode={viewMode}
              />
            )}
            {activeTab === "gerador" && (
              <GeradorDocumentos loggedUser={loggedUser} viewMode={viewMode} />
            )}
            {activeTab === "documentos" && (
              <DocumentosObrigatorios viewMode={viewMode} />
            )}
            {activeTab === "acompanhamento" && (
              <INPIProcessTracker loggedUser={loggedUser} />
            )}
            {activeTab === "agente" && (
              <AutonomousINPIAgent clubProjects={clubProjects} />
            )}
          </section>
          
        </div>
      </main>
    </div>
  );
}
