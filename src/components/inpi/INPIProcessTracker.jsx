"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Bell,
  BellOff,
  Building2,
  Calendar,
  CheckCircle2,
  Clock3,
  Cloud,
  Code2,
  ExternalLink,
  FileText,
  LoaderCircle,
  RefreshCw,
  Search,
  Trash2,
  User,
  ChevronDown,
  HardDrive,
  Sparkles  
} from "lucide-react";

import {
  fetchInpiProcessByNumber,
  OFFICIAL_SEARCH_URL,
  OFFICIAL_SEARCH_URLS,
} from "../../services/inpiProcessTrackingService";
import {
  executeManualInpiWatchForUser,
  dismissInpiTrackingAlert,
  removeInpiSearch,
  saveInpiSearch,
  setInpiSearchWatchEnabled,
  subscribeToInpiTrackerState,
} from "../../services/inpiTrackerPreferencesService";
import { createSearchIdentity } from "../../services/inpiTrackingShared";
import { auth } from "../../../firebase";


// Estilos Neo-Brutalistas
const STATUS_STYLES = {
  emerald: "bg-teal-400 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]",
  amber: "bg-yellow-300 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]",
  red: "bg-red-400 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]",
  indigo: "bg-blue-400 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]",
  sky: "bg-sky-400 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]",
  slate: "bg-white text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]",
};

const TRACKING_SOURCE_OPTIONS = [
  {
    id: "automatico",
    label: "Detectar automaticamente",
    description:
      "O agente tenta localizar primeiro a base mais provável para o número informado.",
    placeholder: "Ex.: PI 0101161-8, 904155196 ou BR 51 2026 001439 5",
  },
  {
    id: "patente",
    label: "Patente",
    description: "Consulta diretamente a base de patentes do BuscaWeb.",
    placeholder: "Ex.: PI 0101161-8 ou BR 11 2012 012852 3",
  },
  {
    id: "marca",
    label: "Marca",
    description: "Consulta a base de marcas por número de processo.",
    placeholder: "Ex.: 904155196",
  },
  {
    id: "programa",
    label: "Programa de computador",
    description: "Consulta a base de registro de software do INPI.",
    placeholder: "Ex.: BR 51 2026 001439 5",
  },
];

const RECENT_SEARCHES_KEY = "inpi_process_tracker_recent";

function formatFetchedAt(isoString) {
  if (!isoString) return "-";

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("pt-BR");
}

function getStatusClassName(tone) {
  return STATUS_STYLES[tone] || STATUS_STYLES.slate;
}

function loadRecentSearches() {
  try {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(entries) {
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(entries));
}

function getSourceOption(sourceId) {
  return (
    TRACKING_SOURCE_OPTIONS.find((option) => option.id === sourceId) ||
    TRACKING_SOURCE_OPTIONS[0]
  );
}

function getSearchUrlBySource(sourceId) {
  if (!sourceId || sourceId === "automatico") {
    return OFFICIAL_SEARCH_URL;
  }

  return OFFICIAL_SEARCH_URLS[sourceId] || OFFICIAL_SEARCH_URL;
}

function createRecentEntry(result, sourceId) {
  return {
    processNumber: result?.summary?.processNumber || result?.query || "",
    title: result?.summary?.title || "",
    status: result?.status?.label || "Em tramitação",
    sourceId: sourceId || result?.requestedSourceId || result?.sourceId || "automatico",
    sourceLabel: result?.sourceLabel || "INPI",
    fetchedAt: result?.fetchedAt || new Date().toISOString(),
  };
}

function getSavedSearchKey(entry) {
  return createSearchIdentity(entry?.processNumber, entry?.sourceId);
}

function getNotFoundMessage(result, selectedSourceId) {
  if (selectedSourceId === "automatico") {
    const labels = (result?.searchedSources || [])
      .map((entry) => entry.sourceLabel)
      .filter(Boolean)
      .join(", ");

    if (labels) {
      return `A busca automática não encontrou resultado nas bases testadas: ${labels}.`;
    }

    return "A busca automática não encontrou resultado nas bases suportadas pelo agente.";
  }

  const selectedSource =
    result?.requestedSourceLabel || getSourceOption(selectedSourceId).label;

  return `A base pública de ${selectedSource.toLowerCase()} não retornou resultado para esse número.`;
}

function ResultInfoCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border-4 border-slate-900 bg-white p-6 shadow-[6px_6px_0px_0px_#0f172a] transform hover:-translate-y-1 transition-transform flex flex-col justify-between">
      <div className="inline-flex items-center gap-2 text-slate-900 text-[10px] font-black uppercase tracking-widest bg-yellow-300 border-2 border-slate-900 px-3 py-1 shadow-[2px_2px_0px_0px_#0f172a] w-fit mb-4 transform -">
        {icon}
        {label}
      </div>
      <p className="text-base font-bold text-slate-900 leading-relaxed break-words bg-slate-100 p-4 border-2 border-slate-900 rounded-xl">
        {value || "-"}
      </p>
    </div>
  );
}

function getResultInfoCards(result) {
  if (result?.publicDataAvailable === false) {
    return [
      {
        icon: <CheckCircle2 className="w-4 h-4 stroke-[3]" />,
        label: "Situação",
        value: "O pedido foi localizado no INPI, mas o detalhe ainda não está aberto na consulta pública.",
      },
      {
        icon: <User className="w-4 h-4 stroke-[3]" />,
        label: "Acesso necessário",
        value: "Entre com seu login do INPI, refaça a busca e abra o resultado em Meus pedidos.",
      },
      {
        icon: <Cloud className="w-4 h-4 stroke-[3]" />,
        label: "Acompanhamento oficial",
        value: "Enquanto o detalhe público não aparecer, acompanhe as publicações pela RPI.",
      },
    ];
  }

  if (result?.sourceId === "marca") {
    return [
      {
        icon: <Calendar className="w-4 h-4 stroke-[3]" />,
        label: "Data do depósito",
        value: result.summary?.depositDate,
      },
      {
        icon: <Calendar className="w-4 h-4 stroke-[3]" />,
        label: "Data da concessão",
        value: result.summary?.grantDate,
      },
      {
        icon: <Calendar className="w-4 h-4 stroke-[3]" />,
        label: "Data de vigência",
        value: result.summary?.validityDate,
      },
      {
        icon: <Building2 className="w-4 h-4 stroke-[3]" />,
        label: "Titular",
        value: result.summary?.holder,
      },
      {
        icon: <User className="w-4 h-4 stroke-[3]" />,
        label: "Procurador",
        value: result.summary?.attorney,
      },
      {
        icon: <FileText className="w-4 h-4 stroke-[3]" />,
        label: "Classe",
        value:
          result.summary?.classes?.join(" • ") || result.summary?.classFromSearch,
      },
    ];
  }

  if (result?.sourceId === "programa") {
    return [
      {
        icon: <Calendar className="w-4 h-4 stroke-[3]" />,
        label: "Data do depósito",
        value: result.summary?.depositDate,
      },
      {
        icon: <Code2 className="w-4 h-4 stroke-[3]" />,
        label: "Linguagem",
        value: result.summary?.language,
      },
      {
        icon: <FileText className="w-4 h-4 stroke-[3]" />,
        label: "Campo de aplicação",
        value: result.summary?.applicationField?.display,
      },
      {
        icon: <FileText className="w-4 h-4 stroke-[3]" />,
        label: "Tipo de programa",
        value: result.summary?.programType?.display,
      },
      {
        icon: <Building2 className="w-4 h-4 stroke-[3]" />,
        label: "Titular",
        value: result.summary?.holder,
      },
      {
        icon: <User className="w-4 h-4 stroke-[3]" />,
        label: "Autor",
        value: result.summary?.author,
      },
    ];
  }

  return [
    {
      icon: <Calendar className="w-4 h-4 stroke-[3]" />,
      label: "Data do depósito",
      value: result.summary?.depositDate,
    },
    {
      icon: <Calendar className="w-4 h-4 stroke-[3]" />,
      label: "Data da publicação",
      value: result.summary?.publicationDate,
    },
    {
      icon: <Calendar className="w-4 h-4 stroke-[3]" />,
      label: "Data da concessão",
      value: result.summary?.grantDate,
    },
    {
      icon: <Building2 className="w-4 h-4 stroke-[3]" />,
      label: "Depositante",
      value: result.summary?.applicant,
    },
    {
      icon: <User className="w-4 h-4 stroke-[3]" />,
      label: "Inventores",
      value: result.summary?.inventors,
    },
    {
      icon: <FileText className="w-4 h-4 stroke-[3]" />,
      label: "IPC",
      value:
        result.summary?.ipcCodes?.join(" • ") || result.summary?.ipcFromSearch,
    },
  ];
}

export default function INPIProcessTracker({ loggedUser = null }) {
  const [processNumber, setProcessNumber] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("automatico");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);
  const [trackingAlerts, setTrackingAlerts] = useState([]);
  const [trackerMessage, setTrackerMessage] = useState("");
  const [trackerError, setTrackerError] = useState("");
  const [isPersisting, setIsPersisting] = useState(false);
  const [isRunningWatch, setIsRunningWatch] = useState(false);
  const [lastWatchRunAt, setLastWatchRunAt] = useState("");
  const [lastWatchSummary, setLastWatchSummary] = useState("");

  const firestoreUserId = String(
    loggedUser?.id || loggedUser?.uid || auth.currentUser?.uid || "",
  ).trim();

  const currentResultIdentity = result?.found
    ? createSearchIdentity(result.summary?.processNumber || result.query, result.sourceId)
    : "";
  const currentSavedSearch = savedSearches.find(
    (entry) => getSavedSearchKey(entry) === currentResultIdentity,
  );

  useEffect(() => {
    setRecentSearches(loadRecentSearches());
  }, []);

  useEffect(() => {
    return subscribeToInpiTrackerState(
      firestoreUserId,
      ({ savedSearches: nextSavedSearches, alerts, lastWatchRunAt, lastWatchSummary }) => {
        setSavedSearches(nextSavedSearches);
        setTrackingAlerts(alerts);
        setLastWatchRunAt(lastWatchRunAt);
        setLastWatchSummary(lastWatchSummary);
      },
      (snapshotError) => {
        console.error("Erro ao carregar buscas salvas do INPI:", snapshotError);
        setTrackerError("Falha ao carregar buscas salvas do Firestore.");
      },
    );
  }, [firestoreUserId]);

  const persistFoundResult = async (nextResult, options = {}) => {
    if (!firestoreUserId || !nextResult?.found) {
      return;
    }

    setIsPersisting(true);
    setTrackerError("");

    try {
      await saveInpiSearch(firestoreUserId, nextResult, options);
      setTrackerMessage(
        options.watchEnabled
          ? "Busca salva e monitoramento automático ativado no Firebase."
          : "Busca salva automaticamente na sua conta do Firebase.",
      );
    } catch (persistError) {
      console.error("Erro ao salvar busca INPI no Firestore:", persistError);
      setTrackerError(
        persistError instanceof Error
          ? persistError.message
          : "Falha ao salvar a busca no Firestore.",
      );
    } finally {
      setIsPersisting(false);
    }
  };

  const handleToggleWatch = async (entry, watchEnabled) => {
    if (!firestoreUserId) {
      setTrackerError("Entre com uma conta para ativar alertas automáticos.");
      return;
    }

    setIsPersisting(true);
    setTrackerError("");

    try {
      await setInpiSearchWatchEnabled(
        firestoreUserId,
        entry.processNumber,
        entry.sourceId,
        watchEnabled,
      );
      setTrackerMessage(
        watchEnabled
          ? "Monitoramento automático ativado para esta busca."
          : "Monitoramento automático pausado para esta busca.",
      );
    } catch (persistError) {
      console.error("Erro ao atualizar monitoramento INPI:", persistError);
      setTrackerError(
        persistError instanceof Error
          ? persistError.message
          : "Falha ao atualizar o monitoramento automático.",
      );
    } finally {
      setIsPersisting(false);
    }
  };

  const handleEnableCurrentResultWatch = async () => {
    if (!result?.found) {
      return;
    }

    if (currentSavedSearch) {
      await handleToggleWatch(currentSavedSearch, !currentSavedSearch.watchEnabled);
      return;
    }

    await persistFoundResult(result, { watchEnabled: true });
  };

  const handleRemoveSavedSearch = async (entry) => {
    if (!firestoreUserId) {
      return;
    }

    setIsPersisting(true);
    setTrackerError("");

    try {
      await removeInpiSearch(firestoreUserId, entry.processNumber, entry.sourceId);
      setTrackerMessage("Busca removida da sua lista salva.");
    } catch (persistError) {
      console.error("Erro ao remover busca INPI:", persistError);
      setTrackerError(
        persistError instanceof Error
          ? persistError.message
          : "Falha ao remover a busca salva.",
      );
    } finally {
      setIsPersisting(false);
    }
  };

  const handleDismissAlert = async (alertId) => {
    if (!firestoreUserId) {
      return;
    }

    setIsPersisting(true);
    setTrackerError("");

    try {
      await dismissInpiTrackingAlert(firestoreUserId, alertId);
      setTrackerMessage("Alerta removido da sua fila.");
    } catch (persistError) {
      console.error("Erro ao remover alerta INPI:", persistError);
      setTrackerError(
        persistError instanceof Error
          ? persistError.message
          : "Falha ao remover o alerta.",
      );
    } finally {
      setIsPersisting(false);
    }
  };

  const handleRunWatchNow = async () => {
    if (!firestoreUserId) {
      setTrackerError("Entre com uma conta para executar a sua varredura manual.");
      return;
    }

    setIsRunningWatch(true);
    setTrackerError("");
    setTrackerMessage("");

    try {
      const summary = await executeManualInpiWatchForUser(firestoreUserId);
      setTrackerMessage(
        summary.processedSearches
          ? `Varredura manual concluída: ${summary.processedSearches} busca(s) verificadas e ${summary.alertsCreated} alerta(s) novo(s).`
          : "Varredura manual concluída, mas não havia buscas monitoradas ativas na sua conta.",
      );
    } catch (watchError) {
      console.error("Erro ao executar a varredura manual do INPI:", watchError);
      setTrackerError(
        watchError instanceof Error
          ? watchError.message
          : "Falha ao executar a varredura manual do INPI.",
      );
    } finally {
      setIsRunningWatch(false);
    }
  };

  const runSavedSearch = async (entry) => {
    setSelectedSourceId(entry.sourceId || "automatico");
    setProcessNumber(entry.processNumber);
    await runSearch(entry.processNumber, entry.sourceId || "automatico");
  };

  const runSearch = async (
    numberToSearch,
    sourceToSearch = selectedSourceId,
  ) => {
    const normalizedNumber = String(numberToSearch || "").trim();
    const normalizedSourceId = String(sourceToSearch || "automatico").trim();

    if (!normalizedNumber) {
      setError("Informe o número do pedido para consultar o andamento.");
      return;
    }

    setIsLoading(true);
    setError("");
    setTrackerError("");

    try {
      const nextResult = await fetchInpiProcessByNumber(
        normalizedNumber,
        normalizedSourceId,
      );
      setResult(nextResult);

      if (nextResult.found) {
        setRecentSearches((currentEntries) => {
          const resolvedSourceId = nextResult.sourceId || normalizedSourceId;
          const nextRecentSearches = [
            createRecentEntry(nextResult, resolvedSourceId),
            ...currentEntries.filter(
              (entry) =>
                !(
                  entry.processNumber === nextResult.summary.processNumber &&
                  entry.sourceId === resolvedSourceId
                ),
            ),
          ].slice(0, 6);

          saveRecentSearches(nextRecentSearches);
          return nextRecentSearches;
        });

        await persistFoundResult(nextResult);
      }
    } catch (searchError) {
      setResult(null);
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Falha ao consultar o andamento no INPI.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await runSearch(processNumber, selectedSourceId);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 font-sans text-slate-900">
      {/* HEADER DE CONSULTA */}
      <div className="bg-blue-300 border-4 border-slate-900 rounded-[2rem] p-8 md:p-12 shadow-[12px_12px_0px_0px_#0f172a] transform  hover:rotate-0 transition-transform">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 mb-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] text-[10px] font-black uppercase tracking-widest transform -rotate-2 mb-6">
              <Clock3 className="w-5 h-5 stroke-[3] text-slate-900" />
              Agente de acompanhamento
            </div>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter bg-white inline-block px-4 py-2 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] mb-6">
              Consultar andamento <br/> <span className="text-white [-webkit-text-stroke:2px_#0f172a] sm:[-webkit-text-stroke:3px_#0f172a]">público</span>
            </h2>
            <p className="font-bold text-slate-900 bg-white/60 p-5 border-2 border-slate-900 rounded-xl leading-relaxed text-base">
              Este agente consulta a base pública escolhida no INPI antes de
              pesquisar, evitando que um número de marca seja tratado como
              patente ou que um registro de software caia na base errada.
            </p>
          </div>

          <a
            href={result?.officialSearchUrl || getSearchUrlBySource(selectedSourceId)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-teal-400 border-4 border-slate-900 text-slate-900 px-6 py-4 font-black uppercase tracking-widest text-xs rounded-xl shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a] transition-all w-full lg:w-auto"
          >
            <ExternalLink className="w-5 h-5 stroke-[3]" />
            Abrir BuscaWeb
          </a>
        </div>

        <div className="mt-8 bg-pink-400 border-4 border-slate-900 rounded-2xl p-6 font-bold text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform -">
          <AlertCircle className="w-6 h-6 inline-block mr-2 -mt-1 stroke-[3]" />
          O acompanhamento continua sendo oficialmente publicado na RPI. Este
          Agente facilita a leitura do processo, mas não substitui a conferência
          formal no portal do INPI.
        </div>

        <div className="mt-6 bg-yellow-300 border-4 border-slate-900 rounded-2xl p-6 font-bold text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform ">
          <Cloud className="w-6 h-6 inline-block mr-2 -mt-1 stroke-[3]" />
          {firestoreUserId
            ? "As consultas encontradas ficam salvas automaticamente no documento do usuário em usuarios. Você pode ativar o monitoramento automático e o sistema vai verificar mudanças sem precisar consultar manualmente."
            : "Entre com uma conta para salvar consultas no Firebase e ativar o monitoramento automático dos projetos do INPI."}
        </div>

        {(trackerMessage || trackerError) && (
          <div
            className={`mt-8 border-4 border-slate-900 p-5 text-sm font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_#0f172a] flex items-center gap-3 ${
              trackerError
                ? "bg-red-400 text-slate-900"
                : "bg-teal-400 text-slate-900"
            }`}
          >
            {trackerError ? <AlertCircle className="w-6 h-6 stroke-[3]" /> : <CheckCircle2 className="w-6 h-6 stroke-[3]" />}
            {trackerError || trackerMessage}
          </div>
        )}
      </div>

      {/* FORMULÁRIO DE BUSCA */}
      <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] rounded-[2.5rem] p-8 md:p-12">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6 lg:flex-row lg:items-end"
        >
          <div className="lg:w-80">
            <label className="block text-xs font-black uppercase tracking-widest text-slate-900 mb-3">
              Base de pesquisa
            </label>
            <div className="relative">
              <select
                value={selectedSourceId}
                onChange={(event) => setSelectedSourceId(event.target.value)}
                className="w-full rounded-2xl border-4 border-slate-900 bg-white px-5 py-4 text-sm font-black uppercase tracking-widest text-slate-900 outline-none focus:shadow-[4px_4px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all shadow-[4px_4px_0px_0px_#0f172a] appearance-none cursor-pointer"
              >
                {TRACKING_SOURCE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 stroke-[3] text-slate-900 pointer-events-none" />
            </div>
          </div>

          <div className="flex-1">
            <label className="block text-xs font-black uppercase tracking-widest text-slate-900 mb-3">
              Número do pedido
            </label>
            <input
              type="text"
              value={processNumber}
              onChange={(event) => setProcessNumber(event.target.value)}
              placeholder={getSourceOption(selectedSourceId).placeholder}
              className="w-full rounded-2xl border-4 border-slate-900 bg-white px-5 py-4 text-sm font-black uppercase tracking-widest text-slate-900 outline-none focus:shadow-[4px_4px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all shadow-[4px_4px_0px_0px_#0f172a] placeholder:text-slate-400 placeholder:font-bold placeholder:normal-case"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 lg:pt-0">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-3 bg-teal-400 border-4 border-slate-900 text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a] px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50 disabled:pointer-events-none w-full sm:w-auto"
            >
              {isLoading ? (
                <LoaderCircle className="w-5 h-5 animate-spin stroke-[3]" />
              ) : (
                <Search className="w-5 h-5 stroke-[3]" />
              )}
              {isLoading ? "Consultando..." : "Consultar andamento"}
            </button>

            {result && (
              <button
                type="button"
                onClick={() =>
                  runSearch(
                    result.summary?.processNumber || processNumber,
                    result.requestedSourceId || result.sourceId || selectedSourceId,
                  )
                }
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-3 bg-yellow-300 border-4 border-slate-900 text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a] px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50 disabled:pointer-events-none w-full sm:w-auto"
              >
                <RefreshCw
                  className={`w-5 h-5 stroke-[3] ${isLoading ? "animate-spin" : ""}`}
                />
                Atualizar
              </button>
            )}
          </div>
        </form>

        {!!recentSearches.length && (
          <div className="mt-8 pt-8 border-t-4 border-slate-900 border-dashed">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-4 bg-slate-200 inline-block px-3 py-1 border-2 border-slate-900">
              Consultas recentes
            </p>
            <div className="flex flex-wrap gap-3">
              {recentSearches.map((entry) => (
                <button
                  key={`${entry.sourceId || "automatico"}-${entry.processNumber}`}
                  type="button"
                  onClick={() => runSavedSearch(entry)}
                  className="bg-white border-2 border-slate-900 px-4 py-2 font-black uppercase text-[10px] tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all flex items-center gap-2"
                >
                  <span className="text-teal-500">{entry.sourceLabel}</span> • {entry.processNumber} 
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-8 rounded-xl border-4 border-slate-900 bg-red-400 p-5 text-sm font-black uppercase tracking-widest text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] flex items-start gap-3 transform ">
            <AlertCircle className="w-6 h-6 shrink-0 stroke-[3]" />
            <span className="mt-0.5">{error}</span>
          </div>
        )}
      </div>

      {/* RESULTADO NADA ENCONTRADO */}
      {result && !result.found && !error && (
        <div className="bg-yellow-300 border-4 border-slate-900 rounded-[2rem] p-8 md:p-12 shadow-[8px_8px_0px_0px_#0f172a] transform -">
          <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-900 mb-4 flex items-center gap-3">
             <AlertCircle className="w-8 h-8 stroke-[3]" /> Nenhum processo encontrado
          </h3>
          <p className="text-base font-bold text-slate-900 bg-white p-5 border-2 border-slate-900 rounded-xl leading-relaxed shadow-[4px_4px_0px_0px_#0f172a]">
            {getNotFoundMessage(result, selectedSourceId)} Vale conferir a
            formatação e, se necessário, repetir a consulta diretamente no
            BuscaWeb.
          </p>
        </div>
      )}

      {/* RESULTADO ENCONTRADO */}
      {result?.found && (
        <div className="bg-white border-4 border-slate-900 rounded-[2.5rem] p-8 md:p-12 shadow-[12px_12px_0px_0px_#0f172a] animate-in slide-in-from-bottom-8">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-8 mb-10 border-b-4 border-slate-900 pb-8">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="bg-white border-2 border-slate-900 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
                  {result.sourceLabel}
                </span>
                <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest ${getStatusClassName(result.status?.tone)}`}>
                  {result.status?.label}
                </span>
                <span className="inline-flex items-center gap-2 bg-slate-100 border-2 border-slate-900 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
                  <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                  Consulta em {formatFetchedAt(result.fetchedAt)}
                </span>
              </div>

              <h3 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-4">
                {result.summary?.title}
              </h3>
              <p className="text-base font-bold text-slate-700 bg-slate-100 px-4 py-2 border-2 border-slate-900 inline-block rounded-xl">
                {result.summary?.presentationType}
              </p>
            </div>

            <div className="bg-yellow-300 border-4 border-slate-900 rounded-2xl p-6 shadow-[4px_4px_0px_0px_#0f172a] shrink-0 text-center transform rotate-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-2">
                Número do pedido
              </p>
              <p className="text-2xl font-black text-slate-900 bg-white px-4 py-2 border-2 border-slate-900 shadow-inner">
                {result.summary?.processNumber}
              </p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-10">
            {getResultInfoCards(result).map((item, idx) => (
              <ResultInfoCard
                key={idx}
                icon={item.icon}
                label={item.label}
                value={item.value}
              />
            ))}
          </div>

          {result.notice?.message && (
            <div className="bg-orange-400 border-4 border-slate-900 rounded-2xl p-6 md:p-8 font-bold text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] flex items-start gap-4 mb-10 transform -">
              <AlertCircle className="w-8 h-8 shrink-0 stroke-[3]" />
              <div>
                <p className="text-xl font-black uppercase tracking-tighter mb-2">
                  {result.notice.title || "Acesso restrito no INPI"}
                </p>
                <p className="text-base bg-white/60 p-4 border-2 border-slate-900 rounded-xl leading-relaxed">
                    {result.notice.message}
                </p>
              </div>
            </div>
          )}

          <div className="bg-slate-100 border-4 border-slate-900 rounded-2xl p-6 md:p-8 shadow-[4px_4px_0px_0px_#0f172a] flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-400 border-2 border-slate-900 rounded-xl flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_#0f172a] transform rotate-3">
                    <Cloud className="w-6 h-6 stroke-[3] text-slate-900" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                {firestoreUserId ? (
                    "Busca salva automaticamente no seu perfil. Ative o monitoramento para ser notificado de mudanças."
                ) : (
                    "Entre com uma conta para salvar esta busca no seu perfil e ativar alertas automáticos."
                )}
                </p>
            </div>
            
            {firestoreUserId && (
                <button
                    type="button"
                    onClick={handleEnableCurrentResultWatch}
                    disabled={isPersisting}
                    className={`inline-flex items-center justify-center gap-3 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a] px-6 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all w-full md:w-auto shrink-0 disabled:opacity-50 disabled:pointer-events-none ${
                        currentSavedSearch?.watchEnabled ? "bg-orange-400 text-slate-900" : "bg-teal-400 text-slate-900"
                    }`}
                >
                    {currentSavedSearch?.watchEnabled ? (
                        <BellOff className="w-5 h-5 stroke-[3]" />
                    ) : (
                        <Bell className="w-5 h-5 stroke-[3]" />
                    )}
                    {currentSavedSearch?.watchEnabled ? "Pausar Alerta" : "Ativar Alerta"}
                </button>
            )}
          </div>

          {result.publicDataAvailable !== false && (
            <div className="space-y-12">
              
              {/* DESPACHO MAIS RECENTE */}
              <div className="bg-white border-4 border-slate-900 rounded-[2rem] p-8 md:p-10 shadow-[8px_8px_0px_0px_#0f172a]">
                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-8 flex items-center gap-3">
                   <Sparkles className="w-8 h-8 stroke-[3] text-teal-500" />
                   Última publicação identificada
                </h3>

                {result.latestDispatch ? (
                  <div className="bg-teal-400 border-4 border-slate-900 rounded-2xl p-6 md:p-8 shadow-[4px_4px_0px_0px_#0f172a] transform ">
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                      {result.latestDispatch.code ? (
                        <span className="bg-white px-4 py-2 border-2 border-slate-900 font-black text-xs uppercase tracking-widest shadow-[2px_2px_0px_0px_#0f172a]">
                          Código {result.latestDispatch.code}
                        </span>
                      ) : (
                        <span className="bg-white px-4 py-2 border-2 border-slate-900 font-black text-xs uppercase tracking-widest shadow-[2px_2px_0px_0px_#0f172a]">
                          Despacho textual
                        </span>
                      )}
                      <span className="bg-slate-900 text-white px-4 py-2 border-2 border-slate-900 font-black text-xs uppercase tracking-widest shadow-[2px_2px_0px_0px_#cbd5e1]">
                        RPI {result.latestDispatch.rpiEdition}
                      </span>
                      <span className="bg-slate-100 text-slate-900 px-4 py-2 border-2 border-slate-900 font-black text-xs uppercase tracking-widest shadow-[2px_2px_0px_0px_#0f172a]">
                        {result.latestDispatch.rpiDate}
                      </span>
                    </div>

                    <p className="text-lg font-bold text-slate-900 leading-relaxed bg-white/70 p-5 rounded-xl border-2 border-slate-900">
                      {result.latestDispatch.description}
                    </p>

                    {result.latestDispatch.complement && (
                      <div className="mt-6 bg-yellow-300 border-2 border-slate-900 px-5 py-4 rounded-xl text-sm font-bold text-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
                        <span className="font-black uppercase tracking-widest block mb-1">Complemento:</span>
                        {result.latestDispatch.complement}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-bold text-slate-600 bg-slate-100 p-4 border-2 border-slate-900 border-dashed rounded-xl">
                    Não foi possível extrair a publicação mais recente desta consulta.
                  </p>
                )}
              </div>

              {/* HISTÓRICO DE DESPACHOS */}
              <div className="bg-white border-4 border-slate-900 rounded-[2rem] p-8 md:p-10 shadow-[8px_8px_0px_0px_#0f172a]">
                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-2">
                  Histórico recente de publicações
                </h3>
                <p className="text-sm font-bold text-slate-600 mb-8">
                  Últimos eventos públicos identificados na base do INPI para esse pedido.
                </p>

                <div className="overflow-x-auto neo-scrollbar-x w-full">
                  <table className="w-full text-sm border-4 border-slate-900 rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_#0f172a] bg-white">
                    <thead className="bg-blue-400 border-b-4 border-slate-900">
                      <tr>
                        <th className="border-r-4 border-slate-900 px-6 py-4 text-left font-black uppercase tracking-widest text-slate-900">RPI</th>
                        <th className="border-r-4 border-slate-900 px-6 py-4 text-left font-black uppercase tracking-widest text-slate-900">Data</th>
                        <th className="border-r-4 border-slate-900 px-6 py-4 text-left font-black uppercase tracking-widest text-slate-900">Despacho</th>
                        <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-slate-900">Complemento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.dispatches.map((dispatch, idx) => (
                        <tr key={`${dispatch.rpiEdition}-${dispatch.code}-${dispatch.rpiDate}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-100'}>
                          <td className="border-r-4 border-t-4 border-slate-900 px-6 py-4 font-bold text-slate-800 whitespace-nowrap">
                            {dispatch.rpiEdition}
                          </td>
                          <td className="border-r-4 border-t-4 border-slate-900 px-6 py-4 font-bold text-slate-800 whitespace-nowrap">
                            {dispatch.rpiDate}
                          </td>
                          <td className="border-r-4 border-t-4 border-slate-900 px-6 py-4 font-bold text-slate-800 min-w-[250px]">
                            <div className="font-black text-slate-900 mb-1 inline-block bg-yellow-300 px-2 border-2 border-slate-900">
                              {dispatch.code || "-"}
                            </div>
                            <div className="leading-relaxed">
                              {dispatch.description}
                            </div>
                          </td>
                          <td className="border-t-4 border-slate-900 px-6 py-4 font-bold text-slate-800 leading-relaxed min-w-[200px]">
                            {dispatch.complement || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PETIÇÕES */}
              {!!result.petitions?.length && (
                <div className="bg-white border-4 border-slate-900 rounded-[2rem] p-8 md:p-10 shadow-[8px_8px_0px_0px_#0f172a]">
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-2">
                    Petições Registradas
                  </h3>
                  <p className="text-sm font-bold text-slate-600 mb-8">
                    Eventos protocolados identificados no detalhe público do processo.
                  </p>

                  <div className="overflow-x-auto neo-scrollbar-x w-full">
                    <table className="w-full text-sm border-4 border-slate-900 rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_#0f172a] bg-white">
                      <thead className="bg-pink-400 border-b-4 border-slate-900">
                        <tr>
                          <th className="border-r-4 border-slate-900 px-6 py-4 text-left font-black uppercase tracking-widest text-slate-900">Status</th>
                          <th className="border-r-4 border-slate-900 px-6 py-4 text-left font-black uppercase tracking-widest text-slate-900">Protocolo</th>
                          <th className="border-r-4 border-slate-900 px-6 py-4 text-left font-black uppercase tracking-widest text-slate-900">Data</th>
                          <th className="border-r-4 border-slate-900 px-6 py-4 text-left font-black uppercase tracking-widest text-slate-900">Serviço</th>
                          <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-slate-900">Cliente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.petitions.map((petition, idx) => (
                          <tr key={`${petition.protocol}-${petition.serviceCode}-${petition.date}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-100'}>
                            <td className="border-r-4 border-t-4 border-slate-900 px-6 py-4 font-bold text-slate-800 whitespace-nowrap">
                              <span className="bg-white border-2 border-slate-900 px-2 py-1 shadow-[2px_2px_0px_0px_#0f172a]">{petition.paymentStatus || "-"}</span>
                            </td>
                            <td className="border-r-4 border-t-4 border-slate-900 px-6 py-4 font-bold text-slate-800 whitespace-nowrap">
                              {petition.protocol}
                            </td>
                            <td className="border-r-4 border-t-4 border-slate-900 px-6 py-4 font-bold text-slate-800 whitespace-nowrap">
                              {petition.date}
                            </td>
                            <td className="border-r-4 border-t-4 border-slate-900 px-6 py-4 font-bold text-slate-800 min-w-[250px]">
                              <div className="font-black text-slate-900 mb-1 inline-block bg-yellow-300 px-2 border-2 border-slate-900">
                                {petition.serviceCode}
                              </div>
                              <div className="leading-relaxed">
                                {petition.serviceDescription || "-"}
                              </div>
                            </td>
                            <td className="border-t-4 border-slate-900 px-6 py-4 font-bold text-slate-800 min-w-[150px]">
                              {petition.client || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ÁREA DO USUÁRIO LOGADO - PESQUISAS SALVAS & ALERTAS */}
      {firestoreUserId && (
        <div className="bg-white border-4 border-slate-900 shadow-[12px_12px_0px_0px_#0f172a] rounded-[2.5rem] p-8 md:p-12 transform  hover:rotate-0 transition-transform mt-16">
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8 mb-12 border-b-4 border-slate-900 pb-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-yellow-300 px-4 py-2 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] text-[10px] font-black uppercase tracking-widest transform - mb-4">
                <HardDrive className="w-5 h-5 stroke-[3] text-slate-900" />
                Painel do Usuário
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4">
                Pesquisas Salvas
              </h3>
              <p className="text-base font-bold text-slate-700 bg-slate-100 p-4 border-2 border-slate-900 rounded-xl leading-relaxed">
                Cada consulta encontrada é gravada no seu perfil. Ative o sino apenas nos processos que realmente precisam de acompanhamento automático (alertas).
              </p>
            </div>

            <div className="flex flex-col items-start xl:items-end gap-4 w-full xl:w-auto">
              {lastWatchRunAt && (
                <div className="rounded-2xl border-4 border-slate-900 bg-teal-400 p-5 shadow-[4px_4px_0px_0px_#0f172a] w-full transform ">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-1 bg-white px-2 inline-block border-2 border-slate-900">
                    Última varredura do monitoramento
                  </p>
                  <p className="font-black text-slate-900 text-lg">
                    {formatFetchedAt(lastWatchRunAt)}
                  </p>
                  {lastWatchSummary && (
                    <p className="mt-2 text-xs font-bold text-slate-900 bg-white/60 p-2 border-2 border-slate-900 rounded-lg">{lastWatchSummary}</p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleRunWatchNow}
                disabled={isRunningWatch || isPersisting}
                className="inline-flex items-center justify-center gap-3 rounded-xl border-4 border-slate-900 bg-white px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a] transition-all disabled:opacity-50 disabled:pointer-events-none w-full"
              >
                <RefreshCw
                  className={`w-5 h-5 stroke-[3] ${isRunningWatch ? "animate-spin" : ""}`}
                />
                {isRunningWatch ? "Executando..." : "Forçar Varredura Manual"}
              </button>
            </div>
          </div>

          {savedSearches.length ? (
            <div className="grid gap-6 md:grid-cols-2">
              {savedSearches.map((entry) => (
                <div
                  key={getSavedSearchKey(entry)}
                  className="rounded-2xl border-4 border-slate-900 bg-white p-6 md:p-8 shadow-[6px_6px_0px_0px_#0f172a] flex flex-col hover:-translate-y-1 transition-transform"
                >
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <span className="inline-flex items-center bg-white border-2 border-slate-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
                      {entry.sourceLabel}
                    </span>
                    <span
                      className={`inline-flex items-center border-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_#0f172a] ${getStatusClassName(
                        entry.statusTone,
                      )}`}
                    >
                      {entry.statusLabel || "Acompanhando"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-2 border-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_#0f172a] ${
                        entry.watchEnabled
                          ? "border-slate-900 bg-yellow-300 text-slate-900"
                          : "border-slate-900 bg-slate-100 text-slate-500"
                      }`}
                    >
                      {entry.watchEnabled ? (
                        <Bell className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <BellOff className="w-4 h-4 stroke-[3]" />
                      )}
                      {entry.watchEnabled ? "Monitorando" : "Somente salvo"}
                    </span>
                  </div>

                  <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">
                    {entry.title || entry.processNumber}
                  </h4>
                  <p className="text-base font-bold text-slate-600 bg-slate-100 px-3 py-1 border-2 border-slate-900 w-fit mb-6">
                    {entry.processNumber}
                  </p>
                  
                  <div className="bg-[#FAFAFA] p-4 border-4 border-slate-900 rounded-xl mb-8 flex-1">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                        Sincronização manual:
                      </p>
                      <p className="text-sm font-bold text-slate-900 mb-3">{formatFetchedAt(entry.lastManualSyncAt || entry.updatedAt || entry.fetchedAt)}</p>
                      
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                        Checagem automática:
                      </p>
                      <p className="text-sm font-bold text-slate-900">{formatFetchedAt(entry.lastCheckedAt || entry.updatedAt || entry.fetchedAt)}</p>

                      {entry.lastError && (
                        <p className="mt-4 text-xs font-black uppercase text-slate-900 bg-red-400 p-2 border-2 border-slate-900">
                          Erro: {entry.lastError}
                        </p>
                      )}
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => runSavedSearch(entry)}
                      disabled={isLoading || isPersisting}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-blue-400 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all disabled:opacity-50"
                    >
                      <RefreshCw className="w-4 h-4 stroke-[3]" />
                      Reconsultar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleWatch(entry, !entry.watchEnabled)}
                      disabled={isPersisting}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-900 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all disabled:opacity-50 ${
                        entry.watchEnabled
                          ? "bg-orange-400"
                          : "bg-teal-400"
                      }`}
                    >
                      {entry.watchEnabled ? (
                        <BellOff className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <Bell className="w-4 h-4 stroke-[3]" />
                      )}
                      {entry.watchEnabled ? "Pausar Alerta" : "Ativar Alerta"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSavedSearch(entry)}
                      disabled={isPersisting}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-red-400 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4 stroke-[3]" />
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-8 text-sm font-bold text-slate-900 bg-yellow-300 p-6 border-4 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_#0f172a] transform - text-center">
              Nenhuma pesquisa foi salva ainda. Faça uma consulta bem-sucedida e ela será gravada automaticamente no seu perfil.
            </p>
          )}

          {/* ALERTAS AUTOMÁTICOS */}
          <div className="mt-16 pt-12 border-t-4 border-slate-900 border-dashed">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 mb-2 flex items-center gap-3">
                    <Cloud className="w-8 h-8 stroke-[3] text-blue-500" /> Alertas Automáticos
                </h3>
                <p className="text-sm font-bold text-slate-700 bg-white border-2 border-slate-900 p-3 rounded-xl shadow-[2px_2px_0px_0px_#cbd5e1] max-w-3xl">
                  Quando o sistema detectar alteração em uma busca monitorada, o alerta aparecerá aqui sem você precisar consultar manualmente.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl border-4 border-slate-900 bg-teal-400 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform rotate-2 shrink-0">
                <RefreshCw className="w-4 h-4 stroke-[3] animate-spin" />
                Auto: 30 mins
              </div>
            </div>

            {trackingAlerts.length ? (
              <div className="grid gap-6">
                {trackingAlerts.map((alertEntry) => (
                  <div
                    key={alertEntry.id}
                    className="rounded-[2rem] border-4 border-slate-900 bg-white p-8 shadow-[8px_8px_0px_0px_#0f172a] transform hover:-translate-y-1 transition-transform"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <span className="inline-flex items-center bg-blue-300 border-2 border-slate-900 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transform -">
                            {alertEntry.sourceLabel}
                          </span>
                          <span
                            className={`inline-flex items-center border-2 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_#0f172a] ${getStatusClassName(
                              alertEntry.statusTone,
                            )}`}
                          >
                            {alertEntry.statusLabel || "Mudança detectada"}
                          </span>
                        </div>
                        
                        <h4 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">
                          {alertEntry.title || alertEntry.processNumber}
                        </h4>
                        <p className="text-base font-bold text-slate-900 leading-relaxed bg-slate-100 p-5 rounded-2xl border-2 border-slate-900">
                          {alertEntry.message}
                        </p>
                        <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-500 bg-white border-2 border-slate-900 px-3 py-1 inline-block shadow-[2px_2px_0px_0px_#0f172a]">
                          Detectado em {formatFetchedAt(alertEntry.detectedAt)}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col gap-4 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            runSavedSearch({
                              processNumber: alertEntry.processNumber,
                              sourceId: alertEntry.sourceId,
                            })
                          }
                          disabled={isLoading}
                          className="inline-flex items-center justify-center gap-3 rounded-xl border-4 border-slate-900 bg-teal-400 px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all disabled:opacity-50"
                        >
                          <RefreshCw className="w-5 h-5 stroke-[3]" />
                          Abrir resultado
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDismissAlert(alertEntry.id)}
                          disabled={isPersisting}
                          className="inline-flex items-center justify-center gap-3 rounded-xl border-4 border-slate-900 bg-white px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all disabled:opacity-50"
                        >
                          <Trash2 className="w-5 h-5 stroke-[3]" />
                          Dispensar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center bg-[#FAFAFA] border-4 border-dashed border-slate-900 rounded-[2rem] p-12">
                <BellOff className="w-16 h-16 stroke-[2] text-slate-400 mx-auto mb-4" />
                <p className="text-lg font-black uppercase tracking-widest text-slate-500">
                    Nenhuma mudança detectada até agora.
                </p>
                <p className="text-sm font-bold text-slate-500 mt-2">
                    Mantenha o monitoramento automático ligado nas buscas que deseja acompanhar.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}