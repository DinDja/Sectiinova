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
import { FcWorkflow } from "react-icons/fc";

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

const TRILHA_LEVELS = [
  {
    id: "ensino_medio",
    label: "Ensino Médio",
    subtitle: "Itinerários formativos de aprofundamento em CT&I",
    file: "/trilha.json",
    legal:
      "RESOLUÇÃO CNE/CEB Nº 4, DE 12 DE MAIO DE 2025 — Parâmetros Nacionais para IFA's no Ensino Médio.",
    headingAccent: "CT&I",
    headingDescription:
      "Siga os passos e revele o caminho do conhecimento científico e tecnológico.",
  },
  {
    id: "anos_finais_8_9",
    label: "Ensino Fundamental (8º/9º)",
    subtitle: "Anos finais com foco em investigação, autoria e inovação",
    file: "/trilha_anos_finais_8_9.json",
    legal:
      "BNCC — Competências e práticas integradas para os Anos Finais do Ensino Fundamental (8º e 9º ano).",
    headingAccent: "CT&I 8º/9º",
    headingDescription:
      "Explore trilhas investigativas adaptadas aos Anos Finais, com linguagem acessível e protagonismo estudantil.",
  },
];

export default function TrilhaPedagogica() {
  const [loading, setLoading] = useState(true);
  const [trilhasByLevel, setTrilhasByLevel] = useState({});
  const [selectedLevelId, setSelectedLevelId] = useState(TRILHA_LEVELS[0].id);

  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState(null);
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [selectedProjectAction, setSelectedProjectAction] = useState({});
  const [filterText, setFilterText] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [openResourcesIndex, setOpenResourcesIndex] = useState(null);

  const objectivesRef = useRef(null);
  const projectsRef = useRef(null);

  useEffect(() => {
    async function loadData() {
      try {
        const loadedLevels = await Promise.all(
          TRILHA_LEVELS.map(async (level) => {
            try {
              const res = await fetch(level.file);
              const json = await res.json();
              return [level.id, json || []];
            } catch (levelErr) {
              console.error(`Erro ao carregar ${level.file}`, levelErr);
              return [level.id, []];
            }
          }),
        );

        setTrilhasByLevel(Object.fromEntries(loadedLevels));
      } catch (err) {
        console.error("Erro ao carregar trilha", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const areas = trilhasByLevel[selectedLevelId] || [];
  const selectedLevel = TRILHA_LEVELS.find((lvl) => lvl.id === selectedLevelId);

  const selectedArea = areas.find(
    (a) => (a.id || areas.indexOf(a)) === selectedAreaId,
  );
  const objectives = selectedArea?.objetivos || [];
  const selectedObjective = objectives.find(
    (o) => (o.id || objectives.indexOf(o)) === selectedObjectiveId,
  );
  const totalObjectives = areas.reduce(
    (sum, area) => sum + (area.objetivos?.length || 0),
    0,
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

  const handleSelectLevel = (levelId) => {
    if (selectedLevelId === levelId) return;
    setSelectedLevelId(levelId);
    setSelectedAreaId(null);
    setSelectedObjectiveId(null);
    setExpandedProjectId(null);
    setSelectedProjectAction({});
    setFilterText("");
    setOpenResourcesIndex(null);
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

  // Helpers para renderizar listas que podem ser strings ou objetos
  const renderList = (arr) => {
    if (!arr || !arr.length) return null;
    return (
      <ul className="list-disc list-inside text-slate-600 text-sm space-y-1">
        {arr.map((item, i) => (
          <li key={i}>
            {typeof item === "string"
              ? item
              : item.descricao ||
                item.descricao_objetivo ||
                item.title ||
                JSON.stringify(item)}
          </li>
        ))}
      </ul>
    );
  };

  const renderActivities = (acts) => {
    if (!acts || !acts.length) return null;
    return (
      <ul className="list-disc list-inside text-slate-600 text-sm space-y-2">
        {acts.map((a, i) => (
          <li key={i}>
            <span className="font-semibold">
              {a.titulo || a.nome || `Atividade ${i + 1}`}
            </span>
            {a.descricao ? ` — ${a.descricao}` : null}
            {a.duracao ? (
              <span className="text-xs text-slate-400"> ({a.duracao})</span>
            ) : null}
          </li>
        ))}
      </ul>
    );
  };

  const renderEncounterDetails = (encontros) => {
    if (!encontros || !encontros.length) return null;
    return (
      <div className="space-y-3">
        {encontros.map((enc, i) => (
          <article
            key={`${enc.numero || i}-${enc.titulo || `enc-${i}`}`}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
              {enc.numero ? `Encontro ${enc.numero}` : `Encontro ${i + 1}`}
            </p>
            <h6 className="text-sm font-bold text-slate-800 mt-1">
              {enc.titulo || `Etapa ${i + 1}`}
            </h6>
            {enc.foco ? (
              <p className="text-xs text-slate-600 mt-2">
                <span className="font-semibold">Foco:</span> {enc.foco}
              </p>
            ) : null}

            {enc.descricao_linhas?.length > 0 ? (
              <ul className="list-disc list-inside mt-2 text-xs text-slate-600 space-y-1">
                {enc.descricao_linhas.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
            ) : enc.descricao ? (
              <p className="text-xs text-slate-600 mt-2">{enc.descricao}</p>
            ) : null}
          </article>
        ))}
      </div>
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
              <div className="mx-auto max-w-3xl">
                <p className="inline-block bg-amber-50 border-l-4 border-amber-400 text-amber-800 px-4 py-2 rounded-lg text-sm md:text-base font-extrabold leading-tight">
                  {selectedLevel?.legal}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <FcWorkflow className="w-12 h-12 text-blue-600" />
                <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 drop-shadow-sm">
                  Sua Jornada Em
                  <span className="ms-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                    {selectedLevel?.headingAccent || "CT&I"}
                  </span>
                </h1>
              </div>
              <p className="text-slate-600 text-lg max-w-xl mx-auto font-medium">
                {selectedLevel?.headingDescription}
              </p>
              <p className="text-xs text-slate-500 max-w-xl mx-auto font-medium">
                Estas são apenas sugestões de atividades e recursos. O(a)
                professor(a) tem autonomia para adaptar, rejeitar ou reorganizar
                conforme a realidade da turma.
              </p>
            </header>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <section className="relative z-30">
              <div className="rounded-3xl p-[1px] bg-gradient-to-r from-cyan-400/70 via-blue-500/60 to-indigo-500/70 shadow-xl">
                <div className="rounded-3xl bg-white/90 backdrop-blur-md p-4 md:p-5 border border-white/60">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h2 className="text-sm md:text-base font-extrabold text-slate-700 uppercase tracking-wide">
                      Selecione a etapa de ensino
                    </h2>
                    <span className="text-[11px] md:text-xs text-slate-500 font-semibold">
                      {areas.length} áreas • {totalObjectives} objetivos
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {TRILHA_LEVELS.map((level) => {
                      const active = level.id === selectedLevelId;
                      return (
                        <button
                          key={level.id}
                          onClick={() => handleSelectLevel(level.id)}
                          className={`text-left rounded-2xl px-4 py-4 border transition-all duration-300 ${
                            active
                              ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-transparent shadow-[0_10px_30px_-10px_rgba(37,99,235,0.7)] -translate-y-0.5"
                              : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/40"
                          }`}
                        >
                          <p className="text-base font-black tracking-tight">
                            {level.label}
                          </p>
                          <p
                            className={`text-xs mt-1 leading-relaxed ${
                              active ? "text-blue-100" : "text-slate-500"
                            }`}
                          >
                            {level.subtitle}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
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
                    const selectedAction = selectedProjectAction[index];

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

                          {/* Card do Projeto (wrapper com barra de destaque) */}
                          <div className="relative">
                            <div className={`absolute left-4 top-6 bottom-6 w-1 rounded-r-xl transition-colors ${isExpanded ? theme.dot : 'bg-slate-200'}`}></div>
                            <div
                              onClick={() => {
                                if (isExpanded) {
                                  setExpandedProjectId(null);
                                } else {
                                  setExpandedProjectId(index);
                                  setSelectedProjectAction((prev) => ({
                                    ...prev,
                                    [index]: null,
                                  }));
                                }
                              }}
                              className={`ml-6 bg-white/90 backdrop-blur-sm rounded-2xl border transition-all duration-500 cursor-pointer overflow-hidden min-h-[220px] flex flex-col
                                ${
                                  isExpanded
                                    ? "border-slate-300 shadow-2xl shadow-slate-300/40 translate-x-2"
                                    : "border-slate-200 border-b-4 hover:border-slate-300 shadow-md hover:shadow-xl hover:translate-x-1 hover:bg-white/95"
                                }
                              `}
                            >
                            <div className="p-6 md:p-8">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${theme.bg} ${theme.accent}`}
                                  >
                                    {q.foco || q.focus || "Geral"}
                                  </span>
                                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                    {selectedLevel?.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-slate-300">#{String(index + 1).padStart(2, "0")}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenResourcesIndex(openResourcesIndex === index ? null : index);
                                    }}
                                    className="p-2 rounded-md hover:bg-slate-100"
                                    aria-label="Ver recursos"
                                  >
                                    <BookOpen className="w-4 h-4 text-slate-500" />
                                  </button>
                                </div>
                              </div>

                              <h3 className="text-xl md:text-2xl font-bold text-slate-800 pr-8 leading-tight">
                                {projeto.titulo}
                              </h3>

                              {/* Resumo curto do projeto */}
                              {projeto.resumo && (
                                <p className="mt-2 text-sm text-slate-600 max-w-[70ch]">
                                  {projeto.resumo.length > 160 ? projeto.resumo.slice(0, 160) + '...' : projeto.resumo}
                                </p>
                              )}

                              {!isExpanded && (
                                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">
                                  Desvendar projeto
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
                                  {!selectedAction ? (
                                    <div className="space-y-5">
                                      <p className="text-sm font-bold text-slate-700">
                                        O que você quer fazer hoje?
                                      </p>
                                      <div className="grid sm:grid-cols-3 gap-3">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedProjectAction(
                                              (prev) => ({
                                                ...prev,
                                                [index]: "investigacao",
                                              }),
                                            );
                                          }}
                                          className="px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 font-bold hover:bg-blue-100"
                                        >
                                          <Microscope className="w-4 h-4 inline mr-1" />
                                          Investigação Científica
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedProjectAction(
                                              (prev) => ({
                                                ...prev,
                                                [index]: "inovacao",
                                              }),
                                            );
                                          }}
                                          className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 font-bold hover:bg-amber-100"
                                        >
                                          <Lightbulb className="w-4 h-4 inline mr-1" />
                                          Inovação
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedProjectAction(
                                              (prev) => ({
                                                ...prev,
                                                [index]: "tecnologia",
                                              }),
                                            );
                                          }}
                                          className="px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100"
                                        >
                                          <Code className="w-4 h-4 inline mr-1" />
                                          Tecnologia
                                        </button>
                                      </div>
                                      <p className="text-xs text-slate-500">
                                        Selecione uma das opções para ver o
                                        detalhe específico do projeto.
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                                          {selectedAction === "investigacao"
                                            ? "Investigação Científica"
                                            : selectedAction === "inovacao"
                                              ? "Inovação"
                                              : "Tecnologia"}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedProjectAction(
                                              (prev) => ({
                                                ...prev,
                                                [index]: null,
                                              }),
                                            );
                                          }}
                                          className="text-xs text-blue-600 underline"
                                        >
                                          Mudar opção
                                        </button>
                                      </div>
                                      <p className="text-slate-600 text-sm leading-relaxed bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                        {selectedAction === "investigacao"
                                          ? q.a_investigação_científica ||
                                            "Não especificado."
                                          : selectedAction === "inovacao"
                                            ? q.inovação || "Não especificado."
                                            : q.o_componente_tecnológico ||
                                              "Não especificado."}
                                      </p>

                                      {/* Detalhes por especificidade */}
                                      {selectedAction === "investigacao" && (
                                        <div className="mt-4 space-y-4">
                                          {projeto.objetivos_especificos
                                            ?.length > 0 && (
                                            <div>
                                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                                Objetivos de investigação
                                              </p>
                                              {renderList(
                                                projeto.objetivos_especificos,
                                              )}
                                            </div>
                                          )}

                                          {projeto.metodologias?.length > 0 && (
                                            <div>
                                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                                Metodologias
                                              </p>
                                              <p className="text-slate-600 text-sm">
                                                {projeto.metodologias.join(
                                                  ", ",
                                                )}
                                              </p>
                                            </div>
                                          )}

                                          {projeto.avaliacao?.indicadores
                                            ?.length > 0 && (
                                            <div>
                                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                                Avaliação
                                              </p>
                                              <p className="text-slate-600 text-sm">
                                                Métodos:{" "}
                                                {projeto.avaliacao.metodos?.join(
                                                  ", ",
                                                )}
                                              </p>
                                              {renderList(
                                                projeto.avaliacao.indicadores,
                                              )}
                                            </div>
                                          )}

                                          {projeto.atividades?.length > 0 && (
                                            <div>
                                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                                Atividades de investigação
                                              </p>
                                              {renderActivities(
                                                projeto.atividades,
                                              )}
                                            </div>
                                          )}

                                          {projeto.recursos_necessarios
                                            ?.length > 0 && (
                                            <div>
                                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                                Recursos de pesquisa
                                              </p>
                                              {renderList(
                                                projeto.recursos_necessarios,
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {selectedAction === "inovacao" && (
                                        <div className="mt-4 space-y-4">
                                          {projeto.impacto_esperado && (
                                            <div>
                                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                                Impacto esperado
                                              </p>
                                              <p className="text-slate-600 text-sm">
                                                {projeto.impacto_esperado}
                                              </p>
                                            </div>
                                          )}

                                          {projeto.atividades?.length > 0 && (
                                            <div>
                                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                                Atividades de inovação
                                              </p>
                                              {renderActivities(
                                                projeto.atividades,
                                              )}
                                            </div>
                                          )}

                                          {projeto.recursos_necessarios
                                            ?.length > 0 && (
                                            <div>
                                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                                Recursos necessários
                                              </p>
                                              {renderList(
                                                projeto.recursos_necessarios,
                                              )}
                                            </div>
                                          )}

                                          {projeto.parcerias?.length > 0 && (
                                            <div>
                                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                                Parcerias
                                              </p>
                                              {renderList(projeto.parcerias)}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {selectedAction === "tecnologia" && (
                                        <div className="mt-4 space-y-4">
                                          <div>
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                              Componente tecnológico
                                            </p>
                                            <p className="text-slate-600 text-sm">
                                              {q.o_componente_tecnológico ||
                                                "Não especificado."}
                                            </p>
                                          </div>

                                          {projeto.recursos_necessarios
                                            ?.length > 0 && (
                                            <div>
                                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                                Recursos necessários
                                              </p>
                                              {renderList(
                                                projeto.recursos_necessarios,
                                              )}
                                            </div>
                                          )}

                                          {projeto.cronograma?.fases?.length >
                                            0 && (
                                            <div>
                                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                                Cronograma
                                              </p>
                                              <ul className="list-disc list-inside text-slate-600 text-sm space-y-1">
                                                {projeto.cronograma.fases.map(
                                                  (f, i) => (
                                                    <li key={i}>
                                                      {f.fase}
                                                      {f.duracao_semanas
                                                        ? ` — ${f.duracao_semanas} semanas`
                                                        : ""}
                                                    </li>
                                                  ),
                                                )}
                                              </ul>
                                            </div>
                                          )}

                                          {projeto.competencias?.length > 0 && (
                                            <div>
                                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                                Competências técnicas
                                              </p>
                                              <div className="flex flex-wrap gap-2">
                                                {projeto.competencias.map(
                                                  (c, i) => (
                                                    <span
                                                      key={i}
                                                      className="px-2 py-1 bg-white text-slate-600 text-[11px] rounded-md border border-slate-200"
                                                    >
                                                      {c}
                                                    </span>
                                                  ),
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          {projeto.acessibilidade?.adaptacoes
                                            ?.length > 0 && (
                                            <div>
                                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                                Acessibilidade
                                              </p>
                                              {renderList(
                                                projeto.acessibilidade
                                                  .adaptacoes,
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {projeto.encontros?.length > 0 && (
                                        <div className="mt-6 pt-5 border-t border-slate-200/80">
                                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                            Encontros da sequência por competência
                                          </p>
                                          {renderEncounterDetails(
                                            projeto.encontros,
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}

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

                                  {/* Recursos agora exibidos fora do card (popover) */}
                                  {openResourcesIndex === index && projeto.recursos && (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className="absolute right-4 top-6 z-50 w-80 md:w-96 bg-white border rounded-xl shadow-xl p-4 text-sm text-slate-700"
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <h5 className="font-bold">Recursos</h5>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenResourcesIndex(null);
                                          }}
                                          className="text-xs text-slate-400 hover:text-slate-600"
                                        >
                                          Fechar
                                        </button>
                                      </div>

                                      {projeto.recursos.referencias?.length > 0 && (
                                        <div className="mb-3">
                                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Referências</p>
                                          <ul className="list-disc list-inside text-slate-600 text-sm space-y-1">
                                            {projeto.recursos.referencias.map((ref, i) => (
                                              <li key={`ref-${i}`}>{ref}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {projeto.recursos.imagens?.length > 0 && (
                                        <div className="mb-3">
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
                                        <div>
                                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Conteúdo adicional</p>
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
