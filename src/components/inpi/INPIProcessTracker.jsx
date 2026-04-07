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

const RECENT_SEARCHES_KEY = "inpi_process_tracker_recent";

const TRACKING_SOURCE_OPTIONS = [
  {
    id: "automatico",
    label: "Detectar automaticamente",
    description:
      "O agente tenta localizar primeiro a base mais provavel para o numero informado.",
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
    description: "Consulta a base de marcas por numero de processo.",
    placeholder: "Ex.: 904155196",
  },
  {
    id: "programa",
    label: "Programa de computador",
    description: "Consulta a base de registro de software do INPI.",
    placeholder: "Ex.: BR 51 2026 001439 5",
  },
];

const STATUS_STYLES = {
  emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  red: "bg-red-100 text-red-800 border-red-200",
  indigo: "bg-indigo-100 text-indigo-800 border-indigo-200",
  sky: "bg-sky-100 text-sky-800 border-sky-200",
  slate: "bg-slate-100 text-slate-800 border-slate-200",
};

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
      return `A busca automatica nao encontrou resultado nas bases testadas: ${labels}.`;
    }

    return "A busca automatica nao encontrou resultado nas bases suportadas pelo agente.";
  }

  const selectedSource =
    result?.requestedSourceLabel || getSourceOption(selectedSourceId).label;

  return `A base publica de ${selectedSource.toLowerCase()} nao retornou resultado para esse numero.`;
}

function ResultInfoCard({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm text-slate-800 leading-relaxed break-words">
        {value || "-"}
      </p>
    </div>
  );
}

function getResultInfoCards(result) {
  if (result?.publicDataAvailable === false) {
    return [
      {
        icon: <CheckCircle2 className="w-4 h-4" />,
        label: "Situacao",
        value: "O pedido foi localizado no INPI, mas o detalhe ainda nao esta aberto na consulta publica.",
      },
      {
        icon: <User className="w-4 h-4" />,
        label: "Acesso necessario",
        value: "Entre com seu login do INPI, refaca a busca e abra o resultado em Meus pedidos.",
      },
      {
        icon: <Cloud className="w-4 h-4" />,
        label: "Acompanhamento oficial",
        value: "Enquanto o detalhe publico nao aparecer, acompanhe as publicacoes pela RPI.",
      },
    ];
  }

  if (result?.sourceId === "marca") {
    return [
      {
        icon: <Calendar className="w-4 h-4" />,
        label: "Data do deposito",
        value: result.summary?.depositDate,
      },
      {
        icon: <Calendar className="w-4 h-4" />,
        label: "Data da concessao",
        value: result.summary?.grantDate,
      },
      {
        icon: <Calendar className="w-4 h-4" />,
        label: "Data de vigencia",
        value: result.summary?.validityDate,
      },
      {
        icon: <Building2 className="w-4 h-4" />,
        label: "Titular",
        value: result.summary?.holder,
      },
      {
        icon: <User className="w-4 h-4" />,
        label: "Procurador",
        value: result.summary?.attorney,
      },
      {
        icon: <FileText className="w-4 h-4" />,
        label: "Classe",
        value:
          result.summary?.classes?.join(" • ") || result.summary?.classFromSearch,
      },
    ];
  }

  if (result?.sourceId === "programa") {
    return [
      {
        icon: <Calendar className="w-4 h-4" />,
        label: "Data do deposito",
        value: result.summary?.depositDate,
      },
      {
        icon: <Code2 className="w-4 h-4" />,
        label: "Linguagem",
        value: result.summary?.language,
      },
      {
        icon: <FileText className="w-4 h-4" />,
        label: "Campo de aplicacao",
        value: result.summary?.applicationField?.display,
      },
      {
        icon: <FileText className="w-4 h-4" />,
        label: "Tipo de programa",
        value: result.summary?.programType?.display,
      },
      {
        icon: <Building2 className="w-4 h-4" />,
        label: "Titular",
        value: result.summary?.holder,
      },
      {
        icon: <User className="w-4 h-4" />,
        label: "Autor",
        value: result.summary?.author,
      },
    ];
  }

  return [
    {
      icon: <Calendar className="w-4 h-4" />,
      label: "Data do deposito",
      value: result.summary?.depositDate,
    },
    {
      icon: <Calendar className="w-4 h-4" />,
      label: "Data da publicacao",
      value: result.summary?.publicationDate,
    },
    {
      icon: <Calendar className="w-4 h-4" />,
      label: "Data da concessao",
      value: result.summary?.grantDate,
    },
    {
      icon: <Building2 className="w-4 h-4" />,
      label: "Depositante",
      value: result.summary?.applicant,
    },
    {
      icon: <User className="w-4 h-4" />,
      label: "Inventores",
      value: result.summary?.inventors,
    },
    {
      icon: <FileText className="w-4 h-4" />,
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              <Clock3 className="w-3.5 h-3.5" />
              Agente de acompanhamento
            </div>
            <h2 className="mt-4 text-2xl font-bold text-slate-800">
              Consultar andamento público por número do pedido
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Este agente consulta a base publica escolhida no INPI antes de
              pesquisar, evitando que um numero de marca seja tratado como
              patente ou que um registro de software caia na base errada.
            </p>
          </div>

          <a
            href={result?.officialSearchUrl || getSearchUrlBySource(selectedSourceId)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir BuscaWeb
          </a>
        </div>

        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 leading-relaxed">
          O acompanhamento continua sendo oficialmente publicado na RPI. Este
          Agente facilita a leitura do processo, mas não substitui a conferência
          formal no portal do INPI.
        </div>

        <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 leading-relaxed">
          {firestoreUserId
            ? "As consultas encontradas ficam salvas automaticamente no documento do usuário em usuarios. Você pode ativar o monitoramento automático e o sistema vai verificar mudanças sem precisar consultar manualmente."
            : "Entre com uma conta para salvar consultas no Firebase e ativar o monitoramento automático dos projetos do INPI."}
        </div>

        {(trackerMessage || trackerError) && (
          <div
            className={`mt-4 rounded-xl border p-4 text-sm ${
              trackerError
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {trackerError || trackerMessage}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 lg:flex-row lg:items-end"
        >
          <div className="lg:w-72">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Base de pesquisa
            </label>
            <select
              value={selectedSourceId}
              onChange={(event) => setSelectedSourceId(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            >
              {TRACKING_SOURCE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Número do pedido
            </label>
            <input
              type="text"
              value={processNumber}
              onChange={(event) => setProcessNumber(event.target.value)}
              placeholder={getSourceOption(selectedSourceId).placeholder}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <LoaderCircle className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
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
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
                Atualizar
              </button>
            )}
          </div>
        </form>

        {!!recentSearches.length && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Consultas recentes
            </p>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((entry) => (
                <button
                  key={`${entry.sourceId || "automatico"}-${entry.processNumber}`}
                  type="button"
                  onClick={() => runSavedSearch(entry)}
                  className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {entry.processNumber} • {entry.sourceLabel}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>

      {firestoreUserId && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Pesquisas salvas
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-3xl">
                Cada consulta encontrada é gravada no seu documento em usuarios. Ative o sino apenas nos processos que realmente precisam de acompanhamento automático.
              </p>
            </div>

            <div className="flex flex-wrap items-start gap-3">
              {lastWatchRunAt && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Última varredura do monitoramento
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatFetchedAt(lastWatchRunAt)}
                  </p>
                  {lastWatchSummary && (
                    <p className="mt-1 text-xs text-slate-500">{lastWatchSummary}</p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleRunWatchNow}
                disabled={isRunningWatch || isPersisting}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRunningWatch ? "animate-spin" : ""}`}
                />
                {isRunningWatch ? "Executando..." : "Executar minha varredura"}
              </button>
            </div>
          </div>

          {savedSearches.length ? (
            <div className="mt-5 grid gap-3">
              {savedSearches.map((entry) => (
                <div
                  key={getSavedSearchKey(entry)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                          {entry.sourceLabel}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClassName(
                            entry.statusTone,
                          )}`}
                        >
                          {entry.statusLabel || "Acompanhando"}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${
                            entry.watchEnabled
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-white text-slate-500"
                          }`}
                        >
                          {entry.watchEnabled ? (
                            <Bell className="w-3.5 h-3.5" />
                          ) : (
                            <BellOff className="w-3.5 h-3.5" />
                          )}
                          {entry.watchEnabled ? "Monitorando" : "Somente salvo"}
                        </span>
                      </div>

                      <h4 className="mt-3 text-base font-bold text-slate-900">
                        {entry.title || entry.processNumber}
                      </h4>
                      <p className="mt-1 text-sm text-slate-600">
                        {entry.processNumber}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Última sincronização manual: {formatFetchedAt(entry.updatedAt || entry.fetchedAt)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Última checagem automática: {formatFetchedAt(entry.lastCheckedAt || entry.updatedAt || entry.fetchedAt)}
                      </p>
                      {entry.lastError && (
                        <p className="mt-2 text-xs font-medium text-amber-700">
                          {entry.lastError}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => runSavedSearch(entry)}
                        disabled={isLoading || isPersisting}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reconsultar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleWatch(entry, !entry.watchEnabled)}
                        disabled={isPersisting}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70 ${
                          entry.watchEnabled
                            ? "bg-amber-600 hover:bg-amber-700"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        {entry.watchEnabled ? (
                          <BellOff className="w-4 h-4" />
                        ) : (
                          <Bell className="w-4 h-4" />
                        )}
                        {entry.watchEnabled ? "Pausar alerta" : "Ativar alerta"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSavedSearch(entry)}
                        disabled={isPersisting}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">
              Nenhuma pesquisa foi salva ainda. Faça uma consulta bem-sucedida e ela será gravada automaticamente no seu perfil.
            </p>
          )}
        </div>
      )}

      {firestoreUserId && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Alertas automáticos
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-3xl">
                Quando o sistema detectar alteração em uma busca monitorada, o alerta aparecerá aqui sem você precisar consultar manualmente o número do processo.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              <Cloud className="w-3.5 h-3.5" />
              Verificação automática a cada 30 minutos
            </div>
          </div>

          {trackingAlerts.length ? (
            <div className="mt-5 grid gap-3">
              {trackingAlerts.map((alertEntry) => (
                <div
                  key={alertEntry.id}
                  className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
                          {alertEntry.sourceLabel}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClassName(
                            alertEntry.statusTone,
                          )}`}
                        >
                          {alertEntry.statusLabel || "Mudança detectada"}
                        </span>
                      </div>
                      <h4 className="mt-3 text-base font-bold text-emerald-950">
                        {alertEntry.title || alertEntry.processNumber}
                      </h4>
                      <p className="mt-1 text-sm text-emerald-900">
                        {alertEntry.message}
                      </p>
                      <p className="mt-2 text-xs text-emerald-700">
                        Detectado em {formatFetchedAt(alertEntry.detectedAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          runSavedSearch({
                            processNumber: alertEntry.processNumber,
                            sourceId: alertEntry.sourceId,
                          })
                        }
                        disabled={isLoading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Abrir resultado
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDismissAlert(alertEntry.id)}
                        disabled={isPersisting}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <Trash2 className="w-4 h-4" />
                        Dispensar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">
              Nenhuma mudança detectada até agora nas buscas com monitoramento automático ativo.
            </p>
          )}
        </div>
      )}

      {result && !result.found && !error && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800">
            Nenhum processo encontrado
          </h3>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            {getNotFoundMessage(result, selectedSourceId)} Vale conferir a
            formatacao e, se necessario, repetir a consulta diretamente no
            BuscaWeb.
          </p>
        </div>
      )}

      {result?.found && (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-4xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    {result.sourceLabel}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClassName(
                      result.status?.tone,
                    )}`}
                  >
                    {result.status?.label}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Consulta realizada em {formatFetchedAt(result.fetchedAt)}
                  </span>
                </div>

                <h3 className="mt-4 text-2xl font-bold text-slate-800 leading-tight">
                  {result.summary?.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {result.summary?.presentationType}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Número do pedido
                </p>
                <p className="mt-1 font-bold text-slate-900">
                  {result.summary?.processNumber}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {getResultInfoCards(result).map((item) => (
                <ResultInfoCard
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  value={item.value}
                />
              ))}
            </div>

            {result.notice?.message && (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 leading-relaxed">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">
                      {result.notice.title || "Acesso restrito no INPI"}
                    </p>
                    <p className="mt-1">{result.notice.message}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <Cloud className="w-4 h-4 text-sky-600" />
              {firestoreUserId ? (
                <>
                  <span>
                    Busca salva automaticamente no seu perfil após a consulta bem-sucedida.
                  </span>
                  <button
                    type="button"
                    onClick={handleEnableCurrentResultWatch}
                    disabled={isPersisting}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70 ${
                      currentSavedSearch?.watchEnabled
                        ? "bg-amber-600 hover:bg-amber-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {currentSavedSearch?.watchEnabled ? (
                      <BellOff className="w-4 h-4" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                    {currentSavedSearch?.watchEnabled
                      ? "Pausar alerta automático"
                      : "Ativar alerta automático"}
                  </button>
                </>
              ) : (
                <span>Entre com uma conta para salvar esta busca no seu perfil e ativar alertas automáticos.</span>
              )}
            </div>
          </div>

          {result.publicDataAvailable !== false && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800">
                  Ultima publicacao identificada
                </h3>

                {result.latestDispatch ? (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-emerald-800">
                      {result.latestDispatch.code ? (
                        <span className="rounded-full bg-white px-3 py-1 border border-emerald-200">
                          Código {result.latestDispatch.code}
                        </span>
                      ) : (
                        <span className="rounded-full bg-white px-3 py-1 border border-emerald-200">
                          Despacho textual
                        </span>
                      )}
                      <span>RPI {result.latestDispatch.rpiEdition}</span>
                      <span>•</span>
                      <span>{result.latestDispatch.rpiDate}</span>
                    </div>

                    <p className="mt-4 text-sm text-emerald-950 leading-relaxed">
                      {result.latestDispatch.description}
                    </p>

                    {result.latestDispatch.complement && (
                      <div className="mt-4 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-900">
                        <span className="font-semibold">Complemento:</span>{" "}
                        {result.latestDispatch.complement}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">
                    Nao foi possivel extrair a publicacao mais recente desta
                    consulta.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800">
                  Historico recente de publicacoes
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Ultimos eventos publicos identificados na base do INPI para esse
                  pedido.
                </p>

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                      <tr>
                        <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          RPI
                        </th>
                        <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Data
                        </th>
                        <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Despacho
                        </th>
                        <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Complemento
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.dispatches.map((dispatch) => (
                        <tr
                          key={`${dispatch.rpiEdition}-${dispatch.code}-${dispatch.rpiDate}`}
                        >
                          <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                            {dispatch.rpiEdition}
                          </td>
                          <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                            {dispatch.rpiDate}
                          </td>
                          <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                            <div className="font-semibold text-slate-900">
                              {dispatch.code || "-"}
                            </div>
                            <div className="mt-1 leading-relaxed">
                              {dispatch.description}
                            </div>
                          </td>
                          <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700 leading-relaxed">
                            {dispatch.complement || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {!!result.petitions?.length && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800">
                    Petições registradas
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Eventos protocolados identificados no detalhe publico do
                    processo.
                  </p>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-0">
                      <thead>
                        <tr>
                          <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Status
                          </th>
                          <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Protocolo
                          </th>
                          <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Data
                          </th>
                          <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Servico
                          </th>
                          <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Cliente
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.petitions.map((petition) => (
                          <tr
                            key={`${petition.protocol}-${petition.serviceCode}-${petition.date}`}
                          >
                            <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                              {petition.paymentStatus || "-"}
                            </td>
                            <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                              {petition.protocol}
                            </td>
                            <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                              {petition.date}
                            </td>
                            <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                              <div className="font-semibold text-slate-900">
                                {petition.serviceCode}
                              </div>
                              <div className="mt-1 leading-relaxed">
                                {petition.serviceDescription || "-"}
                              </div>
                            </td>
                            <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                              {petition.client || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
