import React, { useEffect, useState, useRef } from "react";
import {
  Search,
  Copy,
  Check,
  BookOpen,
  Microscope,
  Target,
  Brain,
  Orbit,
  Code,
  Lightbulb,
  ChevronRight,
  Layers,
  ArrowDown,
  Globe,
  Atom,
  Palette,
  Calculator,
  Asterisk,
} from "lucide-react";

// --- COMPONENTE DE ANIMAÇÃO DE SCROLL (NEO-BRUTALISTA) ---
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
      className={`transform transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
        isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-16 scale-95"
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
    headingAccent: "CT&I Ensino Médio",
    headingDescription:
      "Siga os passos e revele o caminho do conhecimento científico e tecnológico.",
  },
  {
    id: "anos_finais_8_9",
    label: "Ensino Fundamental (8º/9º)",
    subtitle: "Anos finais com foco em investigação, autoria e inovação",
    file: "/trilha_anos_finais_8_9.json",
    legal:
      "DCRB — Competências e práticas integradas para os Anos Finais do Ensino Fundamental (8º e 9º ano).",
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
    if (!nome) return <Layers className="w-8 h-8 stroke-[2.5]" />;
    const n = nome.toLowerCase();
    if (n.includes("exatas") || n.includes("matemática"))
      return <Calculator className="w-8 h-8 stroke-[2.5]" />;
    if (n.includes("humanas") || n.includes("sociais"))
      return <Globe className="w-8 h-8 stroke-[2.5]" />;
    if (n.includes("biológicas") || n.includes("ciência"))
      return <Atom className="w-8 h-8 stroke-[2.5]" />;
    if (n.includes("artes") || n.includes("linguagens"))
      return <Palette className="w-8 h-8 stroke-[2.5]" />;
    return <Layers className="w-8 h-8 stroke-[2.5]" />;
  };

  // Cores adaptadas para o estilo Neo-Brutalista
  const getThemeVars = (foco) => {
    const themes = {
      "Inteligência Artificial": { accent: "bg-blue-400", dot: "bg-blue-400" },
      "Sustentabilidade": { accent: "bg-teal-400", dot: "bg-teal-400" },
      "Robótica": { accent: "bg-purple-400", dot: "bg-purple-400" },
      "Saúde": { accent: "bg-pink-400", dot: "bg-pink-400" },
      "Educação": { accent: "bg-yellow-300", dot: "bg-yellow-300" },
    };
    return themes[foco] || { accent: "bg-slate-300", dot: "bg-slate-300" };
  };

  const renderList = (arr) => {
    if (!arr || !arr.length) return null;
    return (
      <ul className="list-disc list-outside ml-4 text-slate-800 text-sm font-bold space-y-2 marker:text-slate-900">
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
      <ul className="list-disc list-outside ml-4 text-slate-800 text-sm font-bold space-y-3 marker:text-slate-900">
        {acts.map((a, i) => (
          <li key={i}>
            <span className="font-black text-slate-900 uppercase underline decoration-2 decoration-slate-300">
              {a.titulo || a.nome || `Atividade ${i + 1}`}
            </span>
            {a.descricao ? ` — ${a.descricao}` : null}
            {a.duracao ? (
              <span className="text-xs font-black bg-slate-900 text-white px-2 py-0.5 rounded ml-2 shadow-[2px_2px_0px_0px_#cbd5e1]">
                {a.duracao}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    );
  };

  const renderEncounterDetails = (encontros) => {
    if (!encontros || !encontros.length) return null;
    return (
      <div className="space-y-4">
        {encontros.map((enc, i) => (
          <article
            key={`${enc.numero || i}-${enc.titulo || `enc-${i}`}`}
            className="rounded-xl border-4 border-slate-900 bg-white p-5 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all"
          >
            <div className="inline-block bg-yellow-300 border-2 border-slate-900 px-3 py-1 shadow-[2px_2px_0px_0px_#0f172a] transform -rotate-1 mb-3">
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-900">
                {enc.numero ? `Encontro ${enc.numero}` : `Encontro ${i + 1}`}
              </p>
            </div>
            
            <h6 className="text-lg font-black text-slate-900 leading-tight">
              {enc.titulo || `Etapa ${i + 1}`}
            </h6>
            
            {enc.foco ? (
              <p className="text-xs text-slate-800 font-bold mt-2 bg-slate-100 p-2 rounded-md border-2 border-slate-900 inline-block">
                <span className="font-black uppercase">Foco:</span> {enc.foco}
              </p>
            ) : null}

            {enc.descricao_linhas?.length > 0 ? (
              <ul className="list-disc list-outside ml-4 mt-4 text-sm font-bold text-slate-800 space-y-2 marker:text-slate-900">
                {enc.descricao_linhas.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
            ) : enc.descricao ? (
              <p className="text-sm font-bold text-slate-800 mt-4 leading-relaxed">{enc.descricao}</p>
            ) : null}
          </article>
        ))}
      </div>
    );
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#F4F4F0] flex items-center justify-center">
        <Orbit className="w-16 h-16 text-slate-900 animate-spin" />
      </div>
    );

  return (
    <>
      <div className="min-h-screen bg-[#F4F4F0] text-slate-900 pb-32 font-sans selection:bg-teal-400 selection:text-slate-900 overflow-x-hidden relative">
        
        {/* PADRÃO DE FUNDO - GRID (BLUEPRINT) NEO-BRUTALISTA */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a15_2px,transparent_2px),linear-gradient(to_bottom,#0f172a15_2px,transparent_2px)] bg-[size:40px_40px]"></div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-16 space-y-24 relative ">
          
          {/* --- HEADER --- */}
          <ScrollReveal>
            <header className="text-center space-y-6">
              <div className="mx-auto max-w-3xl">
                <p className="inline-block bg-yellow-300 border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] text-slate-900 px-6 py-3 rounded-xl text-sm md:text-base font-black leading-tight uppercase tracking-wider transform -rotate-1">
                  {selectedLevel?.legal}
                </p>
              </div>
              
              <div className="flex flex-col items-center justify-center gap-4 mt-6">
                <div className="w-20 h-20 bg-teal-400 border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] rounded-2xl flex items-center justify-center transform rotate-3">
                  <Brain className="w-10 h-10 text-slate-900 stroke-[2.5]" />
                </div>
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 uppercase leading-[0.9] mt-4 bg-white/60 px-4 py-2 backdrop-blur-sm rounded-2xl border-4 border-slate-900/10">
                  Sua Jornada Em <br />
                  <span className="inline-block bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] px-6 py-2 mt-4 transform -rotate-1">
                    {selectedLevel?.headingAccent || "CT&I"}
                  </span>
                </h1>
              </div>
              
              <p className="text-slate-800 text-xl max-w-2xl mx-auto font-bold mt-8 bg-white p-6 border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] rounded-xl text-left transform rotate-1">
                {selectedLevel?.headingDescription}
              </p>
              
              <p className="text-xs text-slate-500 max-w-xl mx-auto font-black uppercase tracking-widest mt-6 bg-[#F4F4F0] px-4 py-1 rounded-full border-2 border-slate-900/20">
                * Estas são apenas sugestões de atividades e recursos. O(a) professor(a) tem autonomia para adaptar, rejeitar ou reorganizar conforme a realidade da turma.
              </p>
            </header>
          </ScrollReveal>

          {/* --- SELETOR DE ETAPA DE ENSINO --- */}
          <ScrollReveal delay={100}>
            <section className="relative z-30">
              <div className="rounded-[2rem] bg-white border-4 border-slate-900 shadow-[12px_12px_0px_0px_#0f172a] p-6 md:p-10">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                    <Asterisk className="w-6 h-6 stroke-[3]" /> Selecione a Etapa
                  </h2>
                  <span className="text-xs bg-slate-900 text-white font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-[2px_2px_0px_0px_#cbd5e1]">
                    {areas.length} áreas • {totalObjectives} objetivos
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {TRILHA_LEVELS.map((level) => {
                    const active = level.id === selectedLevelId;
                    return (
                      <button
                        key={level.id}
                        onClick={() => handleSelectLevel(level.id)}
                        className={`text-left rounded-2xl px-6 py-6 border-4 transition-all duration-200 flex flex-col justify-center ${
                          active
                            ? "bg-teal-400 border-slate-900 text-slate-900 shadow-[8px_8px_0px_0px_#0f172a] -translate-y-1 -translate-x-1"
                            : "bg-white border-slate-900 text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_#0f172a] hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-2xl font-black tracking-tight uppercase">
                          {level.label}
                        </p>
                        <p className={`text-sm font-bold mt-2 leading-relaxed ${active ? "text-slate-900" : "text-slate-600"}`}>
                          {level.subtitle}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </ScrollReveal>

          {/* PARTE 1: ÁREAS */}
          <section className="space-y-12 relative z-30">
            <ScrollReveal>
              <div className="flex flex-col items-center gap-4 justify-center mb-8">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white font-black text-2xl shadow-[4px_4px_0px_0px_#cbd5e1] transform -rotate-3">
                  1
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter text-center bg-white/60 px-4 py-2 backdrop-blur-sm rounded-xl">
                  Bloco de Conhecimento
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
                      className={`w-full h-full relative p-8 rounded-3xl flex flex-col justify-center items-center gap-4 text-center border-4 border-slate-900 transition-all duration-200
                        ${
                          isSelected
                            ? "bg-blue-400 text-slate-900 shadow-[8px_8px_0px_0px_#0f172a] -translate-y-2 -translate-x-2"
                            : "bg-white text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_#0f172a] hover:bg-blue-50"
                        }
                      `}
                    >
                      <div className={`p-5 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transition-colors ${isSelected ? "bg-white" : "bg-yellow-300 group-hover:bg-yellow-400"}`}>
                        {getAreaIcon(area.area_de_conhecimento)}
                      </div>
                      <span className="font-black text-xl tracking-tight break-words uppercase leading-none">
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
            <div ref={objectivesRef} className="pt-12 space-y-12 relative z-20">
              <ScrollReveal>
                <div className="flex justify-center animate-bounce text-slate-900 mb-12">
                  <ArrowDown className="w-12 h-12 stroke-[3]" />
                </div>
                
                <div className="flex flex-col items-center gap-4 justify-center mb-8">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white font-black text-2xl shadow-[4px_4px_0px_0px_#cbd5e1] transform rotate-3">
                    2
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter text-center bg-white/60 px-4 py-2 backdrop-blur-sm rounded-xl">
                    Objetivo da Investigação
                  </h2>
                </div>
              </ScrollReveal>

              <div className="grid sm:grid-cols-2 gap-6">
                {objectives.map((obj, idx) => {
                  const objId = obj.id || idx;
                  const isSelected = selectedObjectiveId === objId;

                  return (
                    <ScrollReveal key={objId} delay={idx * 100}>
                      <button
                        onClick={() => handleSelectObjective(objId)}
                        className={`w-full p-8 rounded-[2rem] text-left transition-all duration-200 flex items-start gap-5 border-4 border-slate-900
                          ${
                            isSelected
                              ? "bg-slate-900 text-white shadow-[8px_8px_0px_0px_#14b8a6] -translate-y-2 -translate-x-2"
                              : "bg-white text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_#0f172a]"
                          }
                        `}
                      >
                        <div className={`p-3 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] shrink-0 mt-0.5 ${isSelected ? "bg-teal-400" : "bg-white"}`}>
                           <Target className={`w-6 h-6 stroke-[3] ${isSelected ? "text-slate-900" : "text-slate-900"}`} />
                        </div>
                        <span className="font-black text-lg leading-snug">
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
            <div ref={projectsRef} className="pt-12 space-y-12 relative ">
              <ScrollReveal>
                <div className="flex justify-center animate-bounce text-slate-900 mb-12">
                  <ArrowDown className="w-12 h-12 stroke-[3]" />
                </div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 bg-white p-8 rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a]">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white font-black text-2xl shadow-[4px_4px_0px_0px_#cbd5e1] transform -rotate-3">
                      3
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter">
                      Explore a Trilha
                    </h2>
                  </div>

                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-900 stroke-[3]" />
                    <input
                      type="text"
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      placeholder="FILTRAR PROJETOS..."
                      className="w-full pl-14 pr-4 py-4 bg-[#F4F4F0] border-4 border-slate-900 rounded-2xl text-sm font-black text-slate-900 focus:outline-none focus:shadow-[4px_4px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all shadow-[4px_4px_0px_0px_#0f172a] uppercase placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </ScrollReveal>

              <div className="relative pl-6 md:pl-10">
                {/* Linha Central da Timeline Neo-Brutalista */}
                <div className="absolute left-6 md:left-10 top-4 bottom-0 w-2 bg-slate-900 rounded-full"></div>

                <div className="space-y-12">
                  {filteredProjects.map((projeto, index) => {
                    const q = projeto.qualidades_do_projeto || {};
                    const theme = getThemeVars(q.foco || q.focus);
                    const isExpanded = expandedProjectId === index;
                    const selectedAction = selectedProjectAction[index];

                    return (
                      <ScrollReveal key={index} delay={100}>
                        <div className="relative pl-8 md:pl-14 group">
                          
                          {/* Ponto na linha do tempo */}
                          <div
                            className={`absolute left-[-11px] md:left-[-11px] top-10 w-8 h-8 rounded-full border-4 border-slate-900  transition-all duration-300 ${
                              isExpanded
                                ? `${theme.dot} scale-125 shadow-[2px_2px_0px_0px_#0f172a]`
                                : "bg-white hover:bg-slate-200 hover:scale-110 shadow-[2px_2px_0px_0px_#0f172a]"
                            }`}
                          ></div>

                          {/* Card do Projeto */}
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
                            className={`bg-white rounded-[2.5rem] border-4 border-slate-900 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col relative
                              ${
                                isExpanded
                                  ? "shadow-[16px_16px_0px_0px_#0f172a] -translate-y-2 -translate-x-2"
                                  : "shadow-[8px_8px_0px_0px_#0f172a] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[12px_12px_0px_0px_#0f172a]"
                              }
                            `}
                          >
                            <div className="p-8 md:p-10">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span
                                    className={`px-4 py-2 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] rounded-lg text-xs font-black uppercase tracking-widest text-slate-900 ${theme.accent}`}
                                  >
                                    {q.foco || q.focus || "Geral"}
                                  </span>
                                  <span className="px-4 py-2 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] rounded-lg text-xs font-black uppercase tracking-widest bg-slate-100 text-slate-900">
                                    {selectedLevel?.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="text-3xl font-black text-slate-300">#{String(index + 1).padStart(2, "0")}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenResourcesIndex(openResourcesIndex === index ? null : index);
                                    }}
                                    className="p-3 rounded-xl border-2 border-slate-900 bg-white shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all"
                                    aria-label="Ver recursos"
                                  >
                                    <BookOpen className="w-5 h-5 text-slate-900 stroke-[2.5]" />
                                  </button>
                                </div>
                              </div>

                              <h3 className="text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter leading-[1.1] mb-4">
                                {projeto.titulo}
                              </h3>

                              {/* Resumo curto do projeto */}
                              {projeto.resumo && (
                                <p className="text-base font-bold text-slate-600 max-w-4xl border-l-4 border-slate-900 pl-4 bg-slate-50 p-4 rounded-r-xl">
                                  {projeto.resumo.length > 160 ? projeto.resumo.slice(0, 160) + '...' : projeto.resumo}
                                </p>
                              )}

                              {!isExpanded && (
                                <div className="mt-8 flex items-center gap-2 text-sm font-black text-slate-900 uppercase tracking-widest bg-yellow-300 w-max px-4 py-2 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
                                  Desvendar Projeto
                                  <ChevronRight className="w-5 h-5 stroke-[3]" />
                                </div>
                              )}
                            </div>

                            {/* Especificações (Conteúdo Expandido) */}
                            <div
                              className={`grid transition-all duration-500 ease-in-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                            >
                              <div className="overflow-hidden bg-[#F4F4F0] border-t-4 border-slate-900">
                                <div className="p-8 md:p-10 space-y-8">
                                  {!selectedAction ? (
                                    <div className="space-y-6">
                                      <p className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                                        Escolha o seu caminho de ação:
                                      </p>
                                      <div className="grid sm:grid-cols-3 gap-4">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedProjectAction((prev) => ({ ...prev, [index]: "investigacao" }));
                                          }}
                                          className="px-4 py-4 flex flex-col items-center justify-center gap-3 rounded-2xl border-4 border-slate-900 bg-teal-400 text-slate-900 font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all text-sm"
                                        >
                                          <Microscope className="w-8 h-8 stroke-[2.5]" />
                                          Investigação
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedProjectAction((prev) => ({ ...prev, [index]: "inovacao" }));
                                          }}
                                          className="px-4 py-4 flex flex-col items-center justify-center gap-3 rounded-2xl border-4 border-slate-900 bg-orange-400 text-slate-900 font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all text-sm"
                                        >
                                          <Lightbulb className="w-8 h-8 stroke-[2.5]" />
                                          Inovação
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedProjectAction((prev) => ({ ...prev, [index]: "tecnologia" }));
                                          }}
                                          className="px-4 py-4 flex flex-col items-center justify-center gap-3 rounded-2xl border-4 border-slate-900 bg-pink-400 text-slate-900 font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all text-sm"
                                        >
                                          <Code className="w-8 h-8 stroke-[2.5]" />
                                          Tecnologia
                                        </button>
                                      </div>
                                      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                                        * Selecione uma trilha para ver os detalhes operacionais.
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="space-y-8">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-4 border-slate-900 pb-6">
                                        <span className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                                          {selectedAction === "investigacao" ? "Investigação Científica" : selectedAction === "inovacao" ? "Processo de Inovação" : "Desenvolvimento Tecnológico"}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedProjectAction((prev) => ({ ...prev, [index]: null }));
                                          }}
                                          className="px-4 py-2 bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] text-xs font-black uppercase tracking-widest text-slate-900 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all"
                                        >
                                          Voltar Opções
                                        </button>
                                      </div>
                                      
                                      <p className="text-slate-900 font-bold text-lg leading-relaxed bg-white p-6 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
                                        {selectedAction === "investigacao"
                                          ? q.a_investigação_científica || "Não especificado."
                                          : selectedAction === "inovacao"
                                            ? q.inovação || "Não especificado."
                                            : q.o_componente_tecnológico || "Não especificado."}
                                      </p>

                                      {/* Detalhes Investigação */}
                                      {selectedAction === "investigacao" && (
                                        <div className="mt-8 space-y-8">
                                          {projeto.objetivos_especificos?.length > 0 && (
                                            <div className="bg-white p-6 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
                                              <p className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
                                                Objetivos de investigação
                                              </p>
                                              {renderList(projeto.objetivos_especificos)}
                                            </div>
                                          )}

                                          {projeto.metodologias?.length > 0 && (
                                            <div className="bg-white p-6 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
                                              <p className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
                                                Metodologias
                                              </p>
                                              <p className="text-slate-800 font-bold text-base">
                                                {projeto.metodologias.join(", ")}
                                              </p>
                                            </div>
                                          )}

                                          {projeto.avaliacao?.indicadores?.length > 0 && (
                                            <div className="bg-white p-6 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
                                              <p className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
                                                Avaliação
                                              </p>
                                              <p className="text-slate-800 font-black mb-4">
                                                Métodos: {projeto.avaliacao.metodos?.join(", ")}
                                              </p>
                                              {renderList(projeto.avaliacao.indicadores)}
                                            </div>
                                          )}

                                          {projeto.atividades?.length > 0 && (
                                            <div className="bg-white p-6 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
                                              <p className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
                                                Atividades de investigação
                                              </p>
                                              {renderActivities(projeto.atividades)}
                                            </div>
                                          )}

                                          {projeto.recursos_necessarios?.length > 0 && (
                                            <div className="bg-white p-6 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
                                              <p className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
                                                Recursos de pesquisa
                                              </p>
                                              {renderList(projeto.recursos_necessarios)}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Detalhes Inovação */}
                                      {selectedAction === "inovacao" && (
                                        <div className="mt-8 space-y-8">
                                          {projeto.impacto_esperado && (
                                            <div className="bg-white p-6 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
                                              <p className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
                                                Impacto esperado
                                              </p>
                                              <p className="text-slate-800 font-bold text-base">
                                                {projeto.impacto_esperado}
                                              </p>
                                            </div>
                                          )}

                                          {projeto.atividades?.length > 0 && (
                                            <div className="bg-white p-6 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
                                              <p className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
                                                Atividades de inovação
                                              </p>
                                              {renderActivities(projeto.atividades)}
                                            </div>
                                          )}

                                          {projeto.recursos_necessarios?.length > 0 && (
                                            <div className="bg-white p-6 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
                                              <p className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
                                                Recursos necessários
                                              </p>
                                              {renderList(projeto.recursos_necessarios)}
                                            </div>
                                          )}

                                          {projeto.parcerias?.length > 0 && (
                                            <div className="bg-white p-6 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
                                              <p className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
                                                Parcerias
                                              </p>
                                              {renderList(projeto.parcerias)}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Detalhes Tecnologia */}
                                      {selectedAction === "tecnologia" && (
                                        <div className="mt-8 space-y-8">
                                          <div>
                                            <div className="bg-white p-6 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
                                              <p className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
                                                Componente tecnológico
                                              </p>
                                              <p className="text-slate-800 font-bold text-base">
                                                {q.o_componente_tecnológico || "Não especificado."}
                                              </p>
                                            </div>
                                          </div>

                                          {projeto.recursos_necessarios?.length > 0 && (
                                            <div className="bg-white p-6 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
                                              <p className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
                                                Recursos necessários
                                              </p>
                                              {renderList(projeto.recursos_necessarios)}
                                            </div>
                                          )}

                                          {projeto.cronograma?.fases?.length > 0 && (
                                            <div className="bg-white p-6 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
                                              <p className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
                                                Cronograma
                                              </p>
                                              <ul className="list-disc list-outside ml-4 text-slate-800 text-sm font-bold space-y-2 marker:text-slate-900">
                                                {projeto.cronograma.fases.map((f, i) => (
                                                  <li key={i}>
                                                    <span className="font-black underline decoration-2 decoration-slate-300">{f.fase}</span>
                                                    {f.duracao_semanas ? <span className="bg-yellow-300 border-2 border-slate-900 px-2 py-0.5 ml-2 rounded text-[10px] font-black"> {f.duracao_semanas} semanas</span> : ""}
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}

                                          {projeto.competencias?.length > 0 && (
                                            <div className="bg-white p-6 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
                                              <p className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
                                                Competências técnicas
                                              </p>
                                              <div className="flex flex-wrap gap-3">
                                                {projeto.competencias.map((c, i) => (
                                                  <span
                                                    key={i}
                                                    className="px-3 py-1.5 bg-blue-300 text-slate-900 font-black uppercase text-[10px] tracking-widest rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]"
                                                  >
                                                    {c}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {projeto.acessibilidade?.adaptacoes?.length > 0 && (
                                            <div className="bg-white p-6 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
                                              <p className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
                                                Acessibilidade
                                              </p>
                                              {renderList(projeto.acessibilidade.adaptacoes)}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Encontros (Global) */}
                                      {projeto.encontros?.length > 0 && (
                                        <div className="mt-12 pt-8 border-t-4 border-slate-900 border-dashed">
                                          <p className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-8">
                                            Roteiro de Encontros
                                          </p>
                                          {renderEncounterDetails(projeto.encontros)}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* FOOTER DO CARD EXPANDIDO: Tags e Copiar */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-8 border-t-4 border-slate-900">
                                    <div className="flex flex-wrap gap-3">
                                      {projeto.tags?.map((tag, i) => (
                                        <span
                                          key={i}
                                          className="px-3 py-1.5 bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]"
                                        >
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>
                                    <button
                                      onClick={(e) => copyToClipboard(projeto.titulo, index, e)}
                                      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:shadow-none active:translate-y-0 active:translate-x-0 ${
                                        copiedId === index
                                          ? "bg-teal-400 text-slate-900"
                                          : "bg-yellow-300 text-slate-900"
                                      }`}
                                    >
                                      {copiedId === index ? (
                                        <><Check className="w-5 h-5 stroke-[3]" /> COPIADO</>
                                      ) : (
                                        <><Copy className="w-5 h-5 stroke-[3]" /> COPIAR TÍTULO</>
                                      )}
                                    </button>
                                  </div>

                                  {/* Popover de Recursos (agora Brutalista) */}
                                  {openResourcesIndex === index && projeto.recursos && (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className="absolute right-8 top-8 z-50 w-80 md:w-96 bg-white border-4 border-slate-900 rounded-3xl shadow-[8px_8px_0px_0px_#0f172a] p-8 text-sm text-slate-900 animate-in zoom-in-95 duration-200"
                                    >
                                      <div className="flex justify-between items-start mb-6 border-b-4 border-slate-900 pb-4">
                                        <h5 className="font-black uppercase tracking-tighter text-2xl">Recursos</h5>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenResourcesIndex(null);
                                          }}
                                          className="w-8 h-8 rounded-lg bg-slate-100 border-2 border-slate-900 flex items-center justify-center font-black hover:bg-red-400 shadow-[2px_2px_0px_0px_#0f172a] transition-colors"
                                        >
                                          X
                                        </button>
                                      </div>

                                      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                        {projeto.recursos.referencias?.length > 0 && (
                                          <div>
                                            <p className="text-xs font-black text-slate-900 uppercase tracking-widest bg-yellow-300 inline-block px-2 py-1 border-2 border-slate-900 mb-3">Referências</p>
                                            <ul className="list-disc list-outside ml-4 text-slate-800 text-sm font-bold space-y-2 marker:text-slate-900">
                                              {projeto.recursos.referencias.map((ref, i) => (
                                                <li key={`ref-${i}`}>{ref}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}

                                        {projeto.recursos.imagens?.length > 0 && (
                                          <div>
                                            <p className="text-xs font-black text-slate-900 uppercase tracking-widest bg-teal-400 inline-block px-2 py-1 border-2 border-slate-900 mb-3">Imagens</p>
                                            <ul className="list-disc list-outside ml-4 text-slate-800 text-sm font-bold space-y-2 marker:text-slate-900">
                                              {projeto.recursos.imagens.map((img, i) => (
                                                <li key={`img-${i}`}>
                                                  <span className="font-black bg-slate-100 px-1 border border-slate-300">{img.descricao}</span>
                                                  {img.fonte_sugerida && ` — ${img.fonte_sugerida}`}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}

                                        {projeto.recursos.conteudo_adicional && (
                                          <div>
                                            <p className="text-xs font-black text-slate-900 uppercase tracking-widest bg-pink-400 inline-block px-2 py-1 border-2 border-slate-900 mb-3">Conteúdo extra</p>
                                            <div className="text-slate-800 text-sm font-bold space-y-3">
                                              {Object.entries(projeto.recursos.conteudo_adicional).map(([key, value]) => (
                                                <p key={key} className="bg-slate-50 p-3 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_#cbd5e1]">
                                                  <span className="font-black uppercase tracking-wider block mb-1">{key.replace(/_/g, " ")}:</span> {value}
                                                </p>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
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
        
        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #0f172a; border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
        `}</style>
      </div>
    </>
  );
}