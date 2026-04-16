"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  LoaderCircle,
  Play,
  Square,
  Sparkles,
  CheckCircle2,
  CircleAlert,
  ChevronDown,
} from "lucide-react";

import {
  AGENT_PHASES,
  DEFAULT_MODEL,
  PRESET_PROJECTS,
  runAutonomousInpiAgent,
} from "../../services/openRouterAgentService";

const INITIAL_PHASE_STATE = AGENT_PHASES.reduce((accumulator, phase) => {
  accumulator[phase.id] = {
    status: "idle",
    output: "",
  };
  return accumulator;
}, {});

// --- FUNÇÕES DE RENDERIZAÇÃO DO MARKDOWN (Agora Neo-Brutalistas) ---
function isTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isTableDivider(line) {
  return /^\s*\|\s*(:?-+:?\s*\|\s*)+$/.test(line);
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isHtmlString(value) {
  if (!value || typeof value !== "string") return false;
  return /<\s*(h[1-6]|p|ul|ol|li|table|thead|tbody|tr|td|th|strong|em|br|a|div)\b/i.test(
    value,
  );
}

function renderOutputContent(text) {
  if (!text) {
    return null;
  }

  if (isHtmlString(text)) {
    return (
      <div
        className="prose prose-slate max-w-none mt-6 bg-white p-6 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]"
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  }

  return renderMarkdownWithTables(text);
}

function renderTextBlock(text) {
  const lines = String(text).split("\n");
  const elements = [];
  let currentList = null;
  let currentListType = null;

  const flushList = () => {
    if (!currentList) return;
    elements.push(
      React.createElement(
        currentListType === "ol" ? "ol" : "ul",
        { className: "list-none space-y-4 mb-6 ml-2" },
        currentList.map((item, idx) =>
          React.createElement(
            "li",
            {
              key: `li-${idx}`,
              className:
                "font-bold text-slate-900 bg-yellow-300 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] px-4 py-2 rounded-xl inline-block transform hover:-translate-y-0.5 transition-transform",
            },
            item,
          ),
        ),
      ),
    );
    currentList = null;
    currentListType = null;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    const orderedMatch = trimmed.match(/^\s*(\d+)[\.)]\s+(.*)$/);
    const unorderedMatch = trimmed.match(/^\s*(?:[-*+]\s+|✔️\s+)(.*)$/);

    if (orderedMatch) {
      if (currentListType !== "ol") {
        flushList();
        currentListType = "ol";
        currentList = [];
      }
      currentList.push(`${orderedMatch[1]}. ${orderedMatch[2]}`);
      return;
    }

    if (unorderedMatch) {
      if (currentListType !== "ul") {
        flushList();
        currentListType = "ul";
        currentList = [];
      }
      currentList.push(unorderedMatch[1]);
      return;
    }

    flushList();

    // Títulos (Headings)
    if (/^\d+\)/.test(trimmed) || trimmed.startsWith("#")) {
      const cleanTitle = trimmed.replace(/^#+\s*/, "");
      elements.push(
        <h4
          key={`h4-${idx}`}
          className="text-xl font-black uppercase tracking-tighter text-slate-900 mt-8 mb-4 bg-white inline-block px-4 py-2 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform -"
        >
          {cleanTitle}
        </h4>,
      );
      return;
    }

    // Parágrafos Normais
    elements.push(
      <p
        key={`p-${idx}`}
        className="text-base font-bold text-slate-800 leading-relaxed mb-6 bg-white/70 p-5 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#cbd5e1] border-l-8 border-l-teal-400"
      >
        {trimmed}
      </p>,
    );
  });

  flushList();

  if (!elements.length) {
    return null;
  }

  return <div className="space-y-2">{elements}</div>;
}

function renderMarkdownWithTables(text) {
  if (!text) {
    return null;
  }

  const lines = String(text).split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const currentLine = lines[index];

    if (
      isTableRow(currentLine) &&
      index + 1 < lines.length &&
      isTableDivider(lines[index + 1])
    ) {
      const header = splitTableRow(currentLine);
      index += 2;
      const rows = [];

      while (index < lines.length && isTableRow(lines[index])) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }

      blocks.push({ type: "table", header, rows });
      continue;
    }

    const chunk = [];
    while (
      index < lines.length &&
      !(
        isTableRow(lines[index]) &&
        index + 1 < lines.length &&
        isTableDivider(lines[index + 1])
      )
    ) {
      chunk.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: "text", text: chunk.join("\n") });
  }

  return blocks.map((block, idx) => {
    if (block.type === "table") {
      return (
        <div
          key={`tbl-${idx}`}
          className="overflow-x-auto py-6 neo-scrollbar-x w-full"
        >
          <table className="w-full text-sm border-4 border-slate-900 rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_#0f172a] bg-white">
            <thead className="bg-teal-400 border-b-4 border-slate-900">
              <tr>
                {block.header.map((cell, cIdx) => (
                  <th
                    key={cIdx}
                    className="border-r-4 border-slate-900 px-6 py-4 text-left font-black uppercase tracking-widest text-slate-900 last:border-r-0"
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className={rIdx % 2 === 0 ? "bg-white" : "bg-slate-100"}
                >
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="border-r-4 border-t-4 border-slate-900 px-6 py-4 text-left font-bold text-slate-800 last:border-r-0"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (!block.text.trim()) {
      return null;
    }

    return (
      <div
        key={`txt-${idx}`}
        className="bg-[#FAFAFA] border-4 border-slate-900 rounded-[2rem] p-8 mb-8 shadow-[8px_8px_0px_0px_#0f172a]"
      >
        {renderTextBlock(block.text)}
      </div>
    );
  });
}

// --- COMPONENTE PRINCIPAL ---
export default function AutonomousINPIAgent({ clubProjects = [] }) {
  const [objective, setObjective] = useState("");
  const [context, setContext] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [summary, setSummary] = useState("");
  const [phaseState, setPhaseState] = useState(INITIAL_PHASE_STATE);

  const abortControllerRef = useRef(null);

  const selectedProject = useMemo(
    () =>
      clubProjects.find(
        (project) => String(project.id) === String(selectedProjectId),
      ) || null,
    [clubProjects, selectedProjectId],
  );

  const canRun = useMemo(() => {
    return Boolean(
      selectedProject &&
      selectedPreset &&
      objective.trim().length >= 10 &&
      !isRunning,
    );
  }, [selectedProject, selectedPreset, objective, isRunning]);

  const resetPhases = () => {
    setPhaseState(INITIAL_PHASE_STATE);
    setSummary("");
    setErrorMessage("");
  };

  const applyPreset = (presetId) => {
    const preset = PRESET_PROJECTS.find((item) => item.id === presetId);
    if (!preset) {
      setSelectedPreset("");
      setObjective("");
      setContext("");
      return;
    }

    setSelectedPreset(presetId);
    setObjective(preset.objective);
    setContext(preset.context);
    setErrorMessage("");
  };

  const handleRunAgent = async () => {
    if (!canRun) {
      return;
    }

    resetPhases();
    setIsRunning(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const result = await runAutonomousInpiAgent({
        objective: objective.trim(),
        context: context.trim(),
        selectedProjectContext: [
          `ID: ${selectedProject?.id || ""}`,
          `Título: ${selectedProject?.titulo || selectedProject?.nome || ""}`,
          `Descrição: ${selectedProject?.descricao || "Não informada."}`,
          `Área temática: ${selectedProject?.area_tematica || "Não informada."}`,
          `Tipo: ${selectedProject?.tipo || "Não informado."}`,
        ].join("\n"),
        signal: abortController.signal,
        onPhaseUpdate: ({ phaseId, status, output }) => {
          setPhaseState((previousState) => ({
            ...previousState,
            [phaseId]: {
              ...previousState[phaseId],
              status,
              output: output ?? previousState[phaseId].output,
            },
          }));
        },
      });

      setSummary(result.summary);
    } catch (error) {
      if (error?.message === "AbortError" || error?.name === "AbortError") {
        setErrorMessage(
          "Execução interrompida. Você pode ajustar os dados e iniciar novamente.",
        );
      } else {
        setErrorMessage(
          error?.message || "Falha ao executar o agente autônomo.",
        );
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopAgent = () => {
    abortControllerRef.current?.abort();
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 font-sans">
      <style>{`
                .neo-scrollbar-x::-webkit-scrollbar { height: 12px; }
                .neo-scrollbar-x::-webkit-scrollbar-track { background: transparent; }
                .neo-scrollbar-x::-webkit-scrollbar-thumb { background: #0f172a; border-radius: 10px; border: 3px solid #FAFAFA; }
            `}</style>

      {/* PAINEL DE CONFIGURAÇÃO DO AGENTE */}
      <div className="bg-orange-400 border-4 border-slate-900 shadow-[12px_12px_0px_0px_#0f172a] rounded-[2.5rem] p-8 md:p-12 transform  hover:rotate-0 transition-transform duration-300">
        <div className="flex items-center gap-3 mb-6 bg-white px-5 py-3 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] w-fit transform -rotate-2">
          <Sparkles className="w-8 h-8 stroke-[3] text-slate-900" />
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">
            GUIÁ
          </h2>
        </div>

        <p className="text-base font-bold text-slate-900 mb-10 bg-white/70 p-5 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
          Este agente não cria projetos. Ele prepara instruções e petições
          automaticamente com base no escopo técnico de um projeto existente do
          seu clube de ciências.
        </p>

        <div className="space-y-8">
          <label className="block">
            <span className="block text-sm font-black uppercase tracking-widest text-slate-900 mb-3 bg-white px-3 py-1 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] w-fit transform ">
              1. Projeto do seu clube
            </span>
            <div className="relative">
              <select
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                className="w-full p-5 rounded-2xl border-4 border-slate-900 font-black uppercase text-sm text-slate-900 bg-white shadow-[6px_6px_0px_0px_#0f172a] focus:shadow-[8px_8px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all outline-none appearance-none cursor-pointer"
              >
                <option value="">-- Selecione um projeto do radar --</option>
                {clubProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.titulo || project.nome || `Projeto ${project.id}`}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 stroke-[3] text-slate-900 pointer-events-none" />
            </div>
          </label>

          <label className="block">
            <span className="block text-sm font-black uppercase tracking-widest text-slate-900 mb-3 bg-white px-3 py-1 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] w-fit transform -">
              2. Prompt padrão INPI
            </span>
            <div className="relative">
              <select
                value={selectedPreset}
                onChange={(event) => applyPreset(event.target.value)}
                className="w-full p-5 rounded-2xl border-4 border-slate-900 font-black uppercase text-sm text-slate-900 bg-white shadow-[6px_6px_0px_0px_#0f172a] focus:shadow-[8px_8px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all outline-none appearance-none cursor-pointer"
              >
                <option value="">
                  -- Selecione o tipo de petição/documento --
                </option>
                {PRESET_PROJECTS.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 stroke-[3] text-slate-900 pointer-events-none" />
            </div>
          </label>

          <div className="grid md:grid-cols-2 gap-8">
            <label className="block">
              <span className="block text-sm font-black uppercase tracking-widest text-slate-900 mb-3">
                Objetivo principal
              </span>
              <textarea
                value={objective}
                readOnly
                placeholder="Selecione um prompt padrão acima..."
                rows={5}
                className="w-full p-5 rounded-2xl border-4 border-slate-900 font-bold text-slate-700 bg-slate-100 shadow-inner resize-none outline-none cursor-not-allowed"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-black uppercase tracking-widest text-slate-900 mb-3">
                Contexto (Opcional)
              </span>
              <textarea
                value={context}
                readOnly
                placeholder="Contexto técnico do prompt..."
                rows={5}
                className="w-full p-5 rounded-2xl border-4 border-slate-900 font-bold text-slate-700 bg-slate-100 shadow-inner resize-none outline-none cursor-not-allowed"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-4 border-t-4 border-slate-900 border-dashed">
            <button
              onClick={handleRunAgent}
              disabled={!canRun}
              className="inline-flex items-center justify-center gap-3 w-full sm:w-auto bg-teal-400 border-4 border-slate-900 text-slate-900 font-black uppercase tracking-widest px-8 py-5 rounded-2xl shadow-[6px_6px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isRunning ? (
                <LoaderCircle className="w-6 h-6 animate-spin stroke-[3]" />
              ) : (
                <Play className="w-6 h-6 stroke-[3]" />
              )}
              Executar Agente
            </button>

            <button
              onClick={handleStopAgent}
              disabled={!isRunning}
              className="inline-flex items-center justify-center gap-3 w-full sm:w-auto bg-red-400 border-4 border-slate-900 text-slate-900 font-black uppercase tracking-widest px-8 py-5 rounded-2xl shadow-[6px_6px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              <Square className="w-6 h-6 stroke-[3]" />
              Parar
            </button>
          </div>

          {!clubProjects.length && (
            <p className="mt-6 text-sm font-black uppercase tracking-widest text-slate-900 bg-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] rounded-xl px-6 py-4 transform -">
              <CircleAlert className="w-5 h-5 inline-block mr-2 -mt-1 stroke-[3] text-red-500" />
              Nenhum projeto detectado no radar. O agente requer um projeto base
              para análise.
            </p>
          )}
        </div>
      </div>

      {/* MENSAGEM DE ERRO */}
      {errorMessage && (
        <div className="bg-red-400 border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] p-6 rounded-[2rem] font-black text-slate-900 uppercase tracking-widest flex items-start gap-4 transform ">
          <CircleAlert className="w-8 h-8 shrink-0 stroke-[3]" />
          <span className="mt-1">{errorMessage}</span>
        </div>
      )}

      {/* FASES AUTOMÁTICAS */}
      <div className="bg-white border-4 border-slate-900 shadow-[12px_12px_0px_0px_#0f172a] rounded-[2.5rem] p-8 md:p-12 transform - hover:rotate-0 transition-transform duration-300">
        <h3 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter mb-8 bg-yellow-300 inline-block px-4 py-2 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform rotate-2">
          Fases de Análise
        </h3>

        <div className="space-y-8">
          {AGENT_PHASES.map((phase, index) => {
            const item = phaseState[phase.id];

            return (
              <article
                key={phase.id}
                className="rounded-[2rem] border-4 border-slate-900 bg-[#FAFAFA] p-8 md:p-10 shadow-[6px_6px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0f172a] transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <p className="text-3xl font-black uppercase tracking-tighter text-slate-900">
                      <span className="text-teal-500 mr-2">{index + 1}.</span>
                      {phase.title}
                    </p>
                    <p className="text-base font-bold text-slate-600 mt-2 bg-white px-3 py-1 border-2 border-slate-900 inline-block">
                      {phase.goal}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <PhaseStatusBadge status={item.status} />
                  </div>
                </div>

                {item.output && (
                  <div className="mt-8 border-t-4 border-slate-900 border-dashed pt-6">
                    {renderOutputContent(item.output)}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {/* RESUMO FINAL (CONSOLIDADO) */}
      {summary && (
        <div className="bg-blue-300 border-4 border-slate-900 shadow-[16px_16px_0px_0px_#0f172a] rounded-[2.5rem] p-8 md:p-12 mt-16 transform ">
          <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 mb-10 bg-white inline-block px-6 py-3 border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] transform -rotate-2">
            Consolidado Final
          </h3>
          <div className="bg-white border-4 border-slate-900 rounded-[2rem] p-8 md:p-10 shadow-inner">
            {renderOutputContent(summary)}
          </div>
        </div>
      )}
    </div>
  );
}

function PhaseStatusBadge({ status }) {
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-2 rounded-xl bg-yellow-300 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] px-5 py-3 text-sm font-black uppercase tracking-widest text-slate-900 transform -rotate-2">
        <LoaderCircle className="w-5 h-5 animate-spin stroke-[3]" />
        Em execução
      </span>
    );
  }

  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-2 rounded-xl bg-teal-400 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] px-5 py-3 text-sm font-black uppercase tracking-widest text-slate-900 transform rotate-2">
        <CheckCircle2 className="w-5 h-5 stroke-[3]" />
        Concluída
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-xl bg-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] px-5 py-3 text-sm font-black uppercase tracking-widest text-slate-500 opacity-70">
      Aguardando
    </span>
  );
}
