import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "../../../firebase";
import {
  Clock3,
  FileText,
  RefreshCw,
  Zap,
  CheckCircle2,
  Inbox,
  ArrowUpRight,
  Activity,
  Fingerprint,
} from "lucide-react";

const STATUS_UI = {
  aberto: {
    label: "Aberto",
    color: "text-blue-600",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    glow: "shadow-[0_0_15px_rgba(59,130,246,0.5)]",
    step: 1,
    icon: Activity,
  },
  em_analise: {
    label: "Em análise",
    color: "text-amber-600",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    glow: "shadow-[0_0_15px_rgba(245,158,11,0.5)]",
    step: 2,
    icon: Clock3,
  },
  resolvido: {
    label: "Resolvido",
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    glow: "shadow-[0_0_15px_rgba(16,185,129,0.3)]",
    step: 3,
    icon: CheckCircle2,
  },
  arquivado: {
    label: "Arquivado",
    color: "text-slate-500",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    glow: "shadow-none",
    step: 3,
    icon: Inbox,
  },
};

const PRIORITY_UI = {
  baixa: { label: "Baixa", badge: "bg-slate-100 text-slate-600" },
  media: { label: "Média", badge: "bg-indigo-50 text-indigo-700" },
  alta: { label: "Alta", badge: "bg-orange-50 text-orange-700 border border-orange-200" },
  critica: {
    label: "Crítica",
    badge: "bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.4)] animate-pulse",
  },
};

const STATUS_STEPS = [1, 2, 3];
const BARCODE_COLUMNS = Array.from({ length: 15 }, (_, index) => index);

const formatDate = (date) => {
  if (!date) return "-";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return String(date);
  }
};

const shouldUseLowPowerMode = () => {
  if (typeof window === "undefined") return false;

  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const lowCpu =
    typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4;

  const lowMemory = typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4;

  return Boolean(reduceMotion || lowCpu || lowMemory);
};

const BoardingPassSkeleton = memo(function BoardingPassSkeleton({ lowPowerMode }) {
  return (
    <div
      className={`relative flex min-h-[12rem] w-full flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm sm:flex-row ${
        lowPowerMode ? "" : "animate-pulse"
      }`}
    >
      <div className="flex-1 p-8">
        <div className="h-4 w-20 rounded bg-slate-200" />
        <div className="mt-4 h-8 w-3/4 rounded bg-slate-200" />
        <div className="mt-6 h-12 w-full rounded-xl bg-slate-200" />
      </div>
      <div className="hidden w-0 border-l-2 border-dashed border-slate-300 sm:block" />
      <div className="flex w-full flex-col items-center justify-center bg-slate-50 p-8 sm:w-64">
        <div className="h-16 w-16 rounded-full bg-slate-200" />
        <div className="mt-4 h-4 w-24 rounded bg-slate-200" />
      </div>
    </div>
  );
});

const TicketCard = memo(function TicketCard({ ticket, lowPowerMode }) {
  const statusInfo = STATUS_UI[ticket.status] || STATUS_UI.aberto;
  const priorityInfo = PRIORITY_UI[ticket.priority] || PRIORITY_UI.baixa;
  const StatusIcon = statusInfo.icon;
  const isCritical = ticket.priority === "critica";
  const priorityBadgeClass = lowPowerMode
    ? priorityInfo.badge.replace(" animate-pulse", "")
    : priorityInfo.badge;

  return (
    <div
      className={`group relative flex min-h-[14rem] flex-col overflow-hidden rounded-[2rem] border sm:flex-row ${
        lowPowerMode
          ? "border-slate-200 bg-white shadow-sm"
          : "border-white/60 bg-white/60 shadow-lg backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-xl"
      } ${isCritical ? "xl:col-span-2" : ""}`}
    >
      <div className="flex flex-1 flex-col justify-between p-6 sm:p-8">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${priorityBadgeClass}`}
            >
              {priorityInfo.label}
            </span>

            <div className="flex items-center gap-1 opacity-60">
              {STATUS_STEPS.map((step) => (
                <div
                  key={step}
                  className={`h-1.5 w-6 rounded-full ${
                    step <= statusInfo.step ? "bg-slate-800" : "bg-slate-200"
                  }`}
                />
              ))}
            </div>
          </div>

          <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            {ticket.module_label || "Sem Módulo"}
          </h2>
          {ticket.context_clube_nome && (
            <p className="mt-1 font-medium text-slate-500">{ticket.context_clube_nome}</p>
          )}
        </div>

        <div
          className={`mt-6 rounded-2xl p-4 font-mono text-sm leading-relaxed text-slate-700 ${
            lowPowerMode ? "bg-slate-50" : "bg-white/50 shadow-inner"
          }`}
        >
          {String(ticket.description || "").trim() || "Sem descrição."}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-400">
          <div className="flex items-center gap-1">
            <Fingerprint className="h-4 w-4" />
            ID: {ticket.id.slice(0, 8)}...
          </div>
          {ticket.page_url && (
            <a
              href={ticket.page_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-indigo-500 transition-colors hover:text-indigo-700"
            >
              <FileText className="h-4 w-4" />
              Acessar Contexto <ArrowUpRight className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      <div className="relative hidden w-0 border-l-2 border-dashed border-slate-300 sm:block">
        <div className="absolute -left-4 -top-4 h-8 w-8 rounded-full bg-[#f8fafc] shadow-inner" />
        <div className="absolute -bottom-4 -left-4 h-8 w-8 rounded-full bg-[#f8fafc] shadow-inner" />
      </div>

      <div
        className={`relative flex flex-col items-center justify-center gap-4 p-8 text-center sm:w-72 ${statusInfo.bg}`}
      >
        <div
          className={`flex h-20 w-20 items-center justify-center rounded-full border bg-white ${statusInfo.border} ${
            lowPowerMode ? "" : `${statusInfo.glow} transition-all duration-500 group-hover:scale-110`
          }`}
        >
          <StatusIcon className={`h-10 w-10 ${statusInfo.color}`} />
        </div>

        <div>
          <h3 className={`text-xl font-bold uppercase tracking-widest ${statusInfo.color}`}>
            {statusInfo.label}
          </h3>
          <p className="mt-2 flex items-center justify-center gap-1 text-sm font-medium text-slate-500">
            <Clock3 className="h-4 w-4" />
            {ticket.formattedCreatedAt}
          </p>
        </div>

        {!lowPowerMode && (
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1 opacity-20">
            {BARCODE_COLUMNS.map((bar) => (
              <div
                key={bar}
                className={`h-6 w-1 bg-slate-900 ${bar % 3 === 0 ? "h-8" : ""} ${
                  bar % 5 === 0 ? "w-2" : ""
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default function SupportTickets({ loggedUser }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lowPowerMode, setLowPowerMode] = useState(false);

  const reporterUid = useMemo(
    () => String(loggedUser?.uid || loggedUser?.id || "").trim(),
    [loggedUser?.uid, loggedUser?.id]
  );

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError("");

    if (!reporterUid) {
      setTickets([]);
      setLoading(false);
      setError("Autenticação necessária.");
      return;
    }

    try {
      const ticketsQuery = query(
        collection(db, "support_tickets"),
        where("reporter_uid", "==", reporterUid),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(ticketsQuery);
      setTickets(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch {
      setError("Falha na matriz de dados. Tente reconectar.");
    } finally {
      setLoading(false);
    }
  }, [reporterUid]);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    const updateMode = () => setLowPowerMode(shouldUseLowPowerMode());

    updateMode();

    if (typeof window.matchMedia !== "function") return undefined;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (typeof motionQuery.addEventListener === "function") {
      motionQuery.addEventListener("change", updateMode);
      return () => motionQuery.removeEventListener("change", updateMode);
    }

    motionQuery.addListener(updateMode);
    return () => motionQuery.removeListener(updateMode);
  }, []);

  const ticketsWithDerivedData = useMemo(
    () =>
      tickets.map((ticket) => ({
        ...ticket,
        formattedCreatedAt: formatDate(ticket.createdAt?.toDate?.() ?? ticket.createdAt),
      })),
    [tickets]
  );

  return (
    <div
      className={`mt-5 relative mx-auto w-full max-w-[90rem] overflow-hidden rounded-[3rem] bg-[#f8fafc] p-6 sm:p-12 ${
        lowPowerMode ? "shadow-lg" : "shadow-2xl"
      }`}
    >
      {!lowPowerMode && (
        <>
          <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-indigo-300/30 blur-[120px]" />
          <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-300/30 blur-[120px]" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200/20 blur-[150px]" />
        </>
      )}

      <div className="relative z-10">
        <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 sm:text-5xl md:text-6xl">
              Meus Chamados.
            </h1>
          </div>

          <button
            onClick={fetchTickets}
            disabled={loading}
            className={`group relative flex items-center gap-3 overflow-hidden rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-xl transition-all disabled:pointer-events-none disabled:opacity-50 ${
              lowPowerMode ? "" : "hover:scale-105 hover:bg-slate-800"
            }`}
          >
            <span className="relative z-10 flex items-center gap-2">
              <RefreshCw
                className={`h-4 w-4 ${
                  loading
                    ? "animate-spin"
                    : lowPowerMode
                    ? ""
                    : "group-hover:rotate-180 transition-transform duration-700"
                }`}
              />
              Sincronizar
            </span>
          </button>
        </div>

        {error && (
          <div
            className={`mb-8 rounded-2xl border border-rose-200 bg-rose-50/80 p-6 text-rose-800 ${
              lowPowerMode ? "" : "backdrop-blur-sm"
            }`}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-6">
            <BoardingPassSkeleton lowPowerMode={lowPowerMode} />
            <BoardingPassSkeleton lowPowerMode={lowPowerMode} />
          </div>
        ) : ticketsWithDerivedData.length === 0 ? (
          <div
            className={`flex min-h-[40vh] flex-col items-center justify-center rounded-[3rem] border border-dashed border-slate-300 ${
              lowPowerMode ? "bg-white" : "bg-white/30 backdrop-blur-xl"
            }`}
          >
            <div
              className={`relative mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white ${
                lowPowerMode ? "" : "shadow-xl"
              }`}
            >
              <Zap className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-slate-900">
              Nenhuma anomalia detectada
            </h3>
            <p className="mt-2 text-slate-500">
              Seu ambiente está limpo. Não há chamados em aberto.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {ticketsWithDerivedData.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} lowPowerMode={lowPowerMode} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

