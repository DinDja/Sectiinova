import React, { useState } from "react";
import {
  BookOpen,
  CheckSquare,
  Clock3,
  File,
  FileText,
  Sparkles,
} from "lucide-react";
import ModalPesquisaAnterioridade from "./ModalPesquisaAnterioridade";
import AutonomousINPIAgent from "./AutonomousINPIAgent";
import INPIProcessTracker from "./INPIProcessTracker";
import ChecklistSidebar from "./ChecklistSidebar";
import DocumentosObrigatorios from "./DocumentosObrigatorios";
import GeradorDocumentos from "./GeradorDocumentos";
import GuiaINPI from "./GuiaINPI";
import AssinaturaDigitalSerpro from "./AssinaturaDigitalSerpro";

export default function INPI({ clubProjects = [], loggedUser = null }) {
  const [activeTab, setActiveTab] = useState("guia");
  const [isPesquisaModalOpen, setIsPesquisaModalOpen] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [viewMode, setViewMode] = useState("leitura_rapida");

  const tabs = [
    {
      id: "guia",
      label: "Comece Aqui",
      helper: "Fluxo simples para iniciantes",
      icon: BookOpen,
      color: "bg-yellow-300",
    },
       {
      id: "agente",
      label: "GUIÁ",
      helper: "Converse para destravar duvidas",
      img: "/Lobo.svg",
      color: "bg-orange-400",
    },
    {
      id: "documentos",
      label: "Documentos",
      helper: "Entenda os 4 arquivos obrigatorios",
      icon: File,
      color: "bg-pink-400",
    },
    {
      id: "gerador",
      label: "Gerador",
      helper: "Monte os textos com apoio",
      icon: FileText,
      color: "bg-teal-400",
    },
    {
      id: "assinatura_digital",
      label: "Assinatura Digital",
      helper: "Como conseguir no Serpro e por que o INPI exige",
      icon: CheckSquare,
      color: "bg-lime-300",
    },
    {
      id: "acompanhamento",
      label: "Acompanhamento",
      helper: "Consulte e monitore processos",
      icon: Clock3,
      color: "bg-blue-400",
    }
  ];

  const quickStartCards = [
    {
      id: "guia",
      title: "1. Entenda o caminho",
      time: "5 min",
      description:
        "Veja o roteiro em linguagem simples antes de preencher qualquer dado.",
      action: "Abrir guia rapido",
      tab: "guia",
      mode: "leitura_rapida",
    },
    {
      id: "documentos",
      title: "2. Veja o que precisa enviar",
      time: "8 min",
      description: "Cheque os 4 documentos obrigatorios e os erros mais comuns.",
      action: "Abrir documentos",
      tab: "documentos",
      mode: "leitura_rapida",
    },
    {
      id: "gerador",
      title: "3. Monte seu pacote",
      time: "15+ min",
      description:
        "Use o gerador para estruturar relatorio, reivindicacoes, resumo e desenhos.",
      action: "Ir para o gerador",
      tab: "gerador",
      mode: "leitura_rapida",
    },
  ];

  const activeTabData = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const showViewModeToggle = ["guia", "documentos", "gerador", "assinatura_digital"].includes(
    activeTab,
  );

  const handleQuickJump = (card) => {
    setActiveTab(card.tab);
    if (card.mode) {
      setViewMode(card.mode);
    }
  };

  return (
    <div className="min-h-screen font-sans text-slate-900 overflow-x-hidden relative">
      <style>{`
        .neo-scrollbar-x::-webkit-scrollbar { height: 10px; }
        .neo-scrollbar-x::-webkit-scrollbar-track { background: #f1f5f9; border-top: 4px solid #0f172a; border-bottom: 4px solid #0f172a; }
        .neo-scrollbar-x::-webkit-scrollbar-thumb { background: #0f172a; border-radius: 0px; }
      `}</style>

      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a15_2px,transparent_2px),linear-gradient(to_bottom,#0f172a15_2px,transparent_2px)] bg-[size:40px_40px]"></div>
      </div>

      <nav className="bg-white border-b-4 border-slate-900 sticky top-0 z-10">
        <div className=" mx-auto flex neo-scrollbar-x overflow-x-auto px-4 py-4 md:py-6 gap-4">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-3 px-6 py-3 font-black uppercase tracking-widest text-xs md:text-sm rounded-xl border-4 border-slate-900 transition-all whitespace-nowrap shrink-0
                  ${
                    isActive
                      ? `${tab.color} text-slate-900 shadow-[inset_0_-4px_0_0_rgba(0,0,0,0.2)] translate-y-1 translate-x-1`
                      : "bg-white text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:shadow-[6px_6px_0px_0px_#0f172a]"
                  }
                `}
              >
                {tab.img ? (
                  <div className="w-6 h-6 rounded-full border-2 border-slate-900 bg-white flex items-center justify-center overflow-hidden">
                    <img src={tab.img} alt="Icone do assistente" className="w-4 h-4 object-contain" />
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

      <main className="mx-auto px-4 sm:px-6 py-10 relative z-10">
        {activeTab === "guia" && (
          <section className="mb-10 rounded-[2rem] border-4 border-slate-900 bg-white p-8 md:p-10 shadow-[8px_8px_0px_0px_#0f172a]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <p className="inline-flex items-center gap-2 border-2 border-slate-900 bg-yellow-300 px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_#0f172a]">
                  <Sparkles className="h-4 w-4 stroke-[3]" />
                  Primeira vez no INPI?
                </p>
                <h2 className="mt-4 text-2xl md:text-4xl font-black uppercase tracking-tighter text-slate-900 leading-tight">
                  Comece pelo caminho mais simples
                </h2>
                <p className="mt-3 text-sm md:text-base font-bold text-slate-700 bg-slate-100 border-2 border-slate-900 rounded-xl p-4">
                  Esta trilha foi organizada para quem esta iniciando: menos teoria
                  no comeco, mais acao pratica para chegar ao protocolo sem travar.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {quickStartCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleQuickJump(card)}
                  className="text-left rounded-2xl border-4 border-slate-900 bg-slate-50 p-5 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all"
                >
                  <p className="inline-flex items-center border-2 border-slate-900 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest">
                    Tempo medio: {card.time}
                  </p>
                  <h3 className="mt-3 text-lg font-black uppercase tracking-tight text-slate-900">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm font-bold text-slate-700">
                    {card.description}
                  </p>
                  <p className="mt-4 inline-flex items-center border-2 border-slate-900 bg-teal-400 px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_#0f172a]">
                    {card.action}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="mb-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="rounded-2xl border-4 border-slate-900 bg-white px-5 py-4 shadow-[4px_4px_0px_0px_#0f172a]">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">
              Area atual
            </p>
            <p className="text-lg font-black uppercase tracking-tight text-slate-900">
              {activeTabData.label}
            </p>
            <p className="text-sm font-bold text-slate-600">{activeTabData.helper}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {showViewModeToggle && (
              <div className="inline-flex items-center rounded-2xl border-4 border-slate-900 bg-white p-1.5 shadow-[4px_4px_0px_0px_#0f172a]">
                <button
                  onClick={() => setViewMode("leitura_rapida")}
                  className={`rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
                    viewMode === "leitura_rapida"
                      ? "bg-slate-900 text-white shadow-inner"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  Modo simples
                </button>
                <button
                  onClick={() => setViewMode("completo")}
                  className={`rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
                    viewMode === "completo"
                      ? "bg-slate-900 text-white shadow-inner"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  Modo tecnico
                </button>
              </div>
            )}

            <button
              onClick={() => setShowChecklist((prev) => !prev)}
              className={`inline-flex items-center justify-center gap-3 rounded-2xl border-4 border-slate-900 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-slate-900 transition-all
                ${
                  showChecklist
                    ? "bg-pink-400 shadow-[2px_2px_0px_0px_#0f172a] translate-y-0.5 translate-x-0.5"
                    : "bg-yellow-300 shadow-[4px_4px_0px_0px_#0f172a] hover:shadow-[6px_6px_0px_0px_#0f172a]"
                }
              `}
            >
              <CheckSquare className="w-5 h-5 stroke-[3]" />
              {showChecklist ? "Ocultar checklist" : "Mostrar checklist"}
            </button>
          </div>
        </div>

        <div
          className={`grid gap-10 items-start ${
            showChecklist ? "lg:grid-cols-[380px_1fr]" : "grid-cols-1"
          }`}
        >
          {showChecklist && (
            <aside className="bg-white p-8 rounded-[2rem] shadow-[8px_8px_0px_0px_#0f172a] border-4 border-slate-900 sticky top-36 self-start animate-in slide-in-from-left-8 duration-300">
              <div className="flex items-center gap-3 mb-6 border-b-4 border-slate-900 pb-4">
                <div className="w-4 h-8 bg-pink-400 border-2 border-slate-900"></div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">
                  Checklist <br /> do processo
                </h2>
              </div>
              <ChecklistSidebar loggedUser={loggedUser} viewMode={viewMode} />
            </aside>
          )}

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
            {activeTab === "assinatura_digital" && (
              <AssinaturaDigitalSerpro viewMode={viewMode} />
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
