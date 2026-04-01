import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock3,
  Code2,
  ExternalLink,
  FileText,
  LoaderCircle,
  RefreshCw,
  Search,
  User,
} from "lucide-react";

import {
  fetchInpiProcessByNumber,
  OFFICIAL_SEARCH_URL,
  OFFICIAL_SEARCH_URLS,
} from "../../services/inpiProcessTrackingService";

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

export default function INPIProcessTracker() {
  const [processNumber, setProcessNumber] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("automatico");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    setRecentSearches(loadRecentSearches());
  }, []);

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

    try {
      const nextResult = await fetchInpiProcessByNumber(
        normalizedNumber,
        normalizedSourceId,
      );
      setResult(nextResult);

      if (nextResult.found) {
        const nextRecentSearches = [
          createRecentEntry(nextResult, normalizedSourceId),
          ...recentSearches.filter(
            (entry) =>
              !(
                entry.processNumber === nextResult.summary.processNumber &&
                entry.sourceId === normalizedSourceId
              ),
          ),
        ].slice(0, 6);

        setRecentSearches(nextRecentSearches);
        saveRecentSearches(nextRecentSearches);
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
                  onClick={() => {
                    setSelectedSourceId(entry.sourceId || "automatico");
                    setProcessNumber(entry.processNumber);
                    runSearch(entry.processNumber, entry.sourceId || "automatico");
                  }}
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
          </div>

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
    </div>
  );
}
