import React, { useEffect, useState, useRef } from "react";
import {
  Search,
  Copy,
  Check,
  BookOpen,
  Microscope,
  Cpu,
  Target,
  Sparkles,
  Brain,
  Orbit,
  Heart,
  Leaf,
  Code,
  Lightbulb,
  ChevronRight,
  Layers,
  ArrowDown,
  Globe,
  Atom,
  Palette,
  Calculator,
} from "lucide-react";

// --- COMPONENTE DE ANIMAÇÃO DE SCROLL ---
const ScrollReveal = ({ children, delay = 0, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transform transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default function TrilhaPedagogica() {
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState([]);

  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState(null);
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [filterText, setFilterText] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const objectivesRef = useRef(null);
  const projectsRef = useRef(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/trilha.json");
        const json = await res.json();
        setAreas(json || []);
      } catch (err) {
        console.error("Erro ao carregar trilha", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const selectedArea = areas.find(
    (a) => (a.id || areas.indexOf(a)) === selectedAreaId,
  );
  const objectives = selectedArea?.objetivos || [];
  const selectedObjective = objectives.find(
    (o) => (o.id || objectives.indexOf(o)) === selectedObjectiveId,
  );

  const filteredProjects = (selectedObjective?.projetos || []).filter(
    (projeto) => {
      if (!filterText.trim()) return true;
      const searchTerm = filterText.toLowerCase();
      return (
        projeto.titulo.toLowerCase().includes(searchTerm) ||
        projeto.tags?.some((t) => t.toLowerCase().includes(searchTerm))
      );
    },
  );

  const handleSelectArea = (areaId) => {
    if (selectedAreaId === areaId) return;
    setSelectedAreaId(areaId);
    setSelectedObjectiveId(null);
    setExpandedProjectId(null);
    setFilterText("");

    setTimeout(() => {
      objectivesRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);
  };

  const handleSelectObjective = (objId) => {
    if (selectedObjectiveId === objId) return;
    setSelectedObjectiveId(objId);
    setExpandedProjectId(null);

    setTimeout(() => {
      projectsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);
  };

  const copyToClipboard = async (text, id, e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {}
  };

  const getAreaIcon = (nome) => {
    if (!nome) return <Layers className="w-8 h-8" />;
    const n = nome.toLowerCase();
    if (n.includes("exatas") || n.includes("matemática"))
      return <Calculator className="w-8 h-8" />;
    if (n.includes("humanas") || n.includes("sociais"))
      return <Globe className="w-8 h-8" />;
    if (n.includes("biológicas") || n.includes("ciência"))
      return <Atom className="w-8 h-8" />;
    if (n.includes("artes") || n.includes("linguagens"))
      return <Palette className="w-8 h-8" />;
    return <Layers className="w-8 h-8" />;
  };

  const getThemeVars = (foco) => {
    const themes = {
      "Inteligência Artificial": {
        accent: "text-indigo-600",
        bg: "bg-indigo-50",
        dot: "bg-indigo-600",
      },
      Sustentabilidade: {
        accent: "text-emerald-600",
        bg: "bg-emerald-50",
        dot: "bg-emerald-600",
      },
      Robótica: {
        accent: "text-blue-600",
        bg: "bg-blue-50",
        dot: "bg-blue-600",
      },
      Saúde: { accent: "text-rose-600", bg: "bg-rose-50", dot: "bg-rose-600" },
      Educação: {
        accent: "text-amber-600",
        bg: "bg-amber-50",
        dot: "bg-amber-600",
      },
    };
    return (
      themes[foco] || {
        accent: "text-slate-600",
        bg: "bg-slate-100",
        dot: "bg-slate-600",
      }
    );
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#FAFBFF] flex items-center justify-center">
        <Orbit className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );

  return (
    <>
      {/* ESTILOS INJETADOS PARA O FUNDO DE CUBOS 3D E ANIMAÇÃO */}
      <style>{`
        .bg-3d-cubes {
          background-color: #FAFBFF;
          background-image:
            linear-gradient(30deg, rgba(240,244,248,0.28) 12%, transparent 12.5%, transparent 87%, rgba(240,244,248,0.28) 87.5%, rgba(240,244,248,0.28)),
            linear-gradient(150deg, rgba(240,244,248,0.28) 12%, transparent 12.5%, transparent 87%, rgba(240,244,248,0.28) 87.5%, rgba(240,244,248,0.28)),
            linear-gradient(30deg, rgba(240,244,248,0.28) 12%, transparent 12.5%, transparent 87%, rgba(240,244,248,0.28) 87.5%, rgba(240,244,248,0.28)),
            linear-gradient(150deg, rgba(240,244,248,0.28) 12%, transparent 12.5%, transparent 87%, rgba(240,244,248,0.28) 87.5%, rgba(240,244,248,0.28)),
            linear-gradient(60deg, rgba(226,232,240,0.24) 25%, transparent 25.5%, transparent 75%, rgba(226,232,240,0.24) 75%, rgba(226,232,240,0.24)),
            linear-gradient(60deg, rgba(226,232,240,0.24) 25%, transparent 25.5%, transparent 75%, rgba(226,232,240,0.24) 75%, rgba(226,232,240,0.24));
          background-size: 80px 140px;
          background-position: 0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px;
          animation: panCubes 60s linear infinite;
        }
        @keyframes panCubes {
          0% { background-position: 0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px; }
          100% { background-position: 80px 140px, 80px 140px, 120px 210px, 120px 210px, 80px 140px, 120px 210px; }
        }
      `}</style>

      <div className="min-h-screen bg-3d-cubes text-slate-900 pb-32 font-sans selection:bg-blue-100 overflow-x-hidden relative">
        {/* Overlay sutil para garantir leitura perfeita sobre os cubos */}
        <div className="absolute inset-0 bg-white/20 pointer-events-none"></div>

        <div className="max-w-4xl mx-auto px-6 py-16 space-y-24 relative z-10">
          {/* Header */}
          <ScrollReveal>
            <header className="text-center space-y-4">
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 drop-shadow-sm">
                Sua Jornada Em
                <span className="ms-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  CT&I
                </span>
              </h1>
              <p className="text-slate-600 text-lg max-w-xl mx-auto font-medium">
                Siga os passos e revele o caminho do conhecimento científico e
                tecnológico.
              </p>
              <p className="text-xs text-slate-500 max-w-xl mx-auto font-medium">
                Estas são apenas sugestões de atividades e recursos. O(a) professor(a) tem autonomia para adaptar, rejeitar ou reorganizar conforme a realidade da turma.
              </p>
            </header>
          </ScrollReveal>

          {/* PARTE 1: ÁREAS */}
          <section className="space-y-8 relative z-30">
            <ScrollReveal>
              <div className="flex items-center gap-3 justify-center mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-sm shadow-md">
                  1
                </div>
                <h2 className="text-2xl font-bold text-slate-800 bg-white/60 px-4 py-1 rounded-xl backdrop-blur-sm">
                  Escolha o seu Bloco de Conhecimento
                </h2>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 items-stretch">
              {areas.map((area, idx) => {
                const areaId = area.id || idx;
                const isSelected = selectedAreaId === areaId;

                return (
                  <ScrollReveal key={areaId} delay={idx * 100}>
                    <button
                      onClick={() => handleSelectArea(areaId)}
                      className={`w-full h-full relative p-6 rounded-2xl flex flex-col justify-center items-center gap-3 text-center transition-all duration-300 ease-out backdrop-blur-sm
                        ${
                          isSelected
                            ? "bg-blue-600 text-white border-transparent shadow-[0_10px_40px_-10px_rgba(37,99,235,0.6)] -translate-y-2 scale-105 ring-4 ring-blue-100/50"
                            : "bg-white/90 text-slate-600 border border-slate-200 border-b-[6px] hover:border-b-[6px] hover:border-blue-200 hover:text-blue-600 hover:-translate-y-1 hover:shadow-xl"
                        }
                      `}
                    >
                      <div
                        className={`p-4 rounded-full transition-colors ${isSelected ? "bg-blue-500/50" : "bg-slate-50 text-slate-400 group-hover:bg-blue-50"}`}
                      >
                        {getAreaIcon(area.area_de_conhecimento)}
                      </div>
                      <span className="font-extrabold text-lg tracking-tight break-words leading-tight">
                        {area.area_de_conhecimento}
                      </span>
                    </button>
                  </ScrollReveal>
                );
              })}
            </div>
          </section>

          {/* PARTE 2: OBJETIVOS */}
          {selectedArea && (
            <div ref={objectivesRef} className="pt-8 space-y-8 relative z-20">
              <ScrollReveal>
                <div className="flex justify-center animate-bounce text-slate-400 mb-8">
                  <ArrowDown className="w-8 h-8 drop-shadow-sm" />
                </div>
                <div className="flex items-center gap-3 justify-center mb-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-sm shadow-md">
                    2
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 bg-white/60 px-4 py-1 rounded-xl backdrop-blur-sm">
                    Defina o Objetivo da Investigação
                  </h2>
                </div>
              </ScrollReveal>

              <div className="grid sm:grid-cols-2 gap-4">
                {objectives.map((obj, idx) => {
                  const objId = obj.id || idx;
                  const isSelected = selectedObjectiveId === objId;

                  return (
                    <ScrollReveal key={objId} delay={idx * 100}>
                      <button
                        onClick={() => handleSelectObjective(objId)}
                        className={`w-full p-5 rounded-2xl text-left transition-all duration-300 flex items-start gap-4 border backdrop-blur-sm
                          ${
                            isSelected
                              ? "bg-slate-800 border-slate-800 text-white shadow-xl shadow-slate-300/50 scale-[1.02]"
                              : "bg-white/90 border-slate-200 text-slate-600 border-b-4 hover:border-slate-300 hover:bg-white hover:-translate-y-1"
                          }
                        `}
                      >
                        <Target
                          className={`w-6 h-6 shrink-0 mt-0.5 ${isSelected ? "text-blue-400" : "text-slate-400"}`}
                        />
                        <span className="font-semibold text-sm leading-relaxed">
                          {obj.descricao_objetivo}
                        </span>
                      </button>
                    </ScrollReveal>
                  );
                })}
              </div>
            </div>
          )}

          {/* PARTE 3: A TRILHA DE PROJETOS */}
          {selectedObjective && (
            <div ref={projectsRef} className="pt-8 space-y-8 relative z-10">
              <ScrollReveal>
                <div className="flex justify-center animate-bounce text-slate-400 mb-8">
                  <ArrowDown className="w-8 h-8 drop-shadow-sm" />
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 bg-white/60 p-4 rounded-2xl backdrop-blur-sm border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-sm shadow-md">
                      3
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">
                      Explore a Trilha
                    </h2>
                  </div>

                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      placeholder="Filtrar projetos..."
                      className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500/50 transition-all shadow-sm"
                    />
                  </div>
                </div>
              </ScrollReveal>

              <div className="relative pl-6 md:pl-8">
                {/* Linha Central da Timeline (Com sombra suave para destacar nos cubos) */}
                <div className="absolute left-6 md:left-8 top-0 bottom-0 w-[3px] bg-gradient-to-b from-slate-300 via-slate-300 to-transparent rounded-full shadow-sm"></div>

                <div className="space-y-8">
                  {filteredProjects.map((projeto, index) => {
                    const q = projeto.qualidades_do_projeto || {};
                    const theme = getThemeVars(q.foco || q.focus);
                    const isExpanded = expandedProjectId === index;

                    return (
                      <ScrollReveal key={index} delay={100}>
                        <div className="relative pl-8 md:pl-12 group">
                          {/* Ponto na linha do tempo */}
                          <div
                            className={`absolute left-[-6px] md:left-[-6px] top-6 w-4 h-4 rounded-full ring-4 ring-[#FAFBFF] shadow-sm transition-all duration-500 z-10 ${
                              isExpanded
                                ? `${theme.dot} scale-150`
                                : "bg-slate-300 group-hover:bg-slate-400 group-hover:scale-125"
                            }`}
                          ></div>

                          {/* Card do Projeto */}
                          <div
                            onClick={() =>
                              setExpandedProjectId(isExpanded ? null : index)
                            }
                            className={`bg-white/80 backdrop-blur-sm rounded-[2rem] border transition-all duration-500 cursor-pointer overflow-hidden min-h-[220px] flex flex-col
                              ${
                                isExpanded
                                  ? "border-slate-300 shadow-2xl shadow-slate-300/40 translate-x-2"
                                  : "border-slate-200 border-b-4 hover:border-slate-300 shadow-md hover:shadow-xl hover:translate-x-1 hover:bg-white/90"
                              }
                            `}
                          >
                            <div className="p-6 md:p-8">
                              <div className="flex items-center justify-between mb-3">
                                <span
                                  className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${theme.bg} ${theme.accent}`}
                                >
                                  {q.foco || q.focus || "Geral"}
                                </span>
                                <span className="text-sm font-bold text-slate-300">
                                  #{String(index + 1).padStart(2, "0")}
                                </span>
                              </div>

                              <h3 className="text-xl md:text-2xl font-bold text-slate-800 pr-8 leading-tight">
                                {projeto.titulo}
                              </h3>

                              {!isExpanded && (
                                <div className="mt-5 flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">
                                  Desvendar projeto{" "}
                                  <ChevronRight className="w-4 h-4" />
                                </div>
                              )}
                            </div>

                            {/* Especificações (Conteúdo Expandido) */}
                            <div
                              className={`grid transition-all duration-500 ease-in-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                            >
                              <div className="overflow-hidden bg-slate-50/80 border-t border-slate-100">
                                <div className="p-6 md:p-8 space-y-6">
                                  <div className="space-y-3">
                                    <h4 className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-widest">
                                      <Microscope className="w-4 h-4 text-blue-500" />{" "}
                                      Investigação Científica
                                    </h4>
                                    <p className="text-slate-600 text-sm md:text-base leading-relaxed bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                      {q.a_investigação_científica ||
                                        "Não especificado."}
                                    </p>
                                  </div>

                                  <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                      <h4 className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-widest">
                                        <Code className="w-4 h-4 text-indigo-500" />{" "}
                                        Tecnologia
                                      </h4>
                                      <p className="text-slate-600 text-sm leading-relaxed bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-full">
                                        {q.o_componente_tecnológico ||
                                          "Não especificado."}
                                      </p>
                                    </div>

                                    <div className="space-y-3">
                                      <h4 className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-widest">
                                        <Lightbulb className="w-4 h-4 text-amber-500" />{" "}
                                        Inovação
                                      </h4>
                                      <p className="text-slate-600 text-sm leading-relaxed bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-full">
                                        {q.inovação || "Não especificado."}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-slate-200">
                                    <div className="flex flex-wrap gap-2">
                                      {projeto.tags?.map((tag, i) => (
                                        <span
                                          key={i}
                                          className="px-2.5 py-1 bg-white text-slate-500 text-[10px] font-bold rounded-lg shadow-sm border border-slate-200"
                                        >
                                          #{tag.toUpperCase()}
                                        </span>
                                      ))}
                                    </div>
                                    <button
                                      onClick={(e) =>
                                        copyToClipboard(
                                          projeto.titulo,
                                          index,
                                          e,
                                        )
                                      }
                                      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                                        copiedId === index
                                          ? "bg-green-100 border-green-200 text-green-700"
                                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                                      }`}
                                    >
                                      {copiedId === index ? (
                                        <>
                                          <Check className="w-4 h-4" /> Copiado!
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-4 h-4" /> Copiar
                                          Título
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  {/* NOVA SEÇÃO DE RECURSOS (estrutura atualizada) */}
                                  {projeto.recursos && (
                                    <div className="mt-6 border-t border-slate-200 pt-6">
                                      <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
                                        Recursos
                                      </h4>

                                      {projeto.recursos.referencias?.length > 0 && (
                                        <div className="mb-4">
                                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Referências</p>
                                          <ul className="list-disc list-inside text-slate-600 text-sm space-y-1">
                                            {projeto.recursos.referencias.map((ref, i) => (
                                              <li key={`ref-${i}`}>{ref}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {projeto.recursos.imagens?.length > 0 && (
                                        <div className="mb-4">
                                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Imagens</p>
                                          <ul className="list-disc list-inside text-slate-600 text-sm space-y-1">
                                            {projeto.recursos.imagens.map((img, i) => (
                                              <li key={`img-${i}`}>
                                                <span className="font-semibold">{img.descricao}</span>
                                                {img.fonte_sugerida && ` — ${img.fonte_sugerida}`}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {projeto.recursos.conteudo_adicional && (
                                        <div className="mb-4">
                                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Conteúdo Adicional</p>
                                          <div className="text-slate-600 text-sm space-y-1">
                                            {Object.entries(projeto.recursos.conteudo_adicional).map(([key, value]) => (
                                              <p key={key}>
                                                <span className="font-semibold capitalize">{key.replace(/_/g, " ")}:</span> {value}
                                              </p>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </ScrollReveal>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
