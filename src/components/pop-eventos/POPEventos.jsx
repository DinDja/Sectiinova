import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  ExternalLink,
  Filter,
  LoaderCircle,
  Search,
  Sparkles,
} from "lucide-react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

import { db } from "../../../firebase";
import { fetchPopEventos } from "../../services/popEventosService";

const TARGET_YEAR = 2026;
const EVENTS_PER_PAGE = 10;
const MAX_SAVED_EVENTS = 80;
const SAVED_EVENTS_FIELD = "pop_eventos_saved";

const MODE_OPTIONS = [
  { value: "quick", label: "Varredura rápida" },
  { value: "full", label: "Varredura completa" },
];

const GROUP_OPTIONS = [
  { value: "", label: "Todas as fontes" },
  { value: "bahia", label: "Bahia" },
  { value: "governo_federal", label: "Governo federal" },
  { value: "olimpiadas", label: "Olimpíadas" },
  { value: "sistema_s", label: "Sistema S" },
  { value: "universidades", label: "Institutos e universidades" },
  { value: "inovacao", label: "Tecnologia e inovação" },
  { value: "agregadores", label: "Agregadores" },
];

function formatIsoDate(value = "") {
  const normalized = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return "";
  }

  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
}

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizeHttpUrl(value = "") {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  return /^https?:\/\//i.test(normalized) ? normalized : "";
}

function resolveEventKey(event = {}) {
  const directKey = normalizeText(event?.eventKey || event?.id);
  if (directKey) return directKey;

  const eventUrl = normalizeHttpUrl(event?.url || event?.sourceUrl);
  if (eventUrl) return eventUrl.toLowerCase();

  const sourceKey = normalizeText(event?.sourceName || event?.sourceGroupLabel || "fonte")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 40);
  const titleKey = normalizeText(event?.title || "evento")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 80);

  return `${sourceKey || "fonte"}::${titleKey || "evento"}`;
}

function resolveEventImageUrls(event = {}) {
  if (Array.isArray(event?.imageUrls)) {
    return event.imageUrls
      .map((value) => normalizeText(value))
      .filter(Boolean)
      .slice(0, 3);
  }

  const imageUrl = normalizeText(event?.imageUrl);
  return imageUrl ? [imageUrl] : [];
}

function createSavedEventSnapshot(event = {}) {
  return {
    eventKey: resolveEventKey(event),
    title: normalizeText(event?.title || "Evento sem titulo").slice(0, 240),
    description: normalizeText(event?.description || event?.pageTitle || "").slice(0, 1200),
    startDate: normalizeText(event?.startDate).slice(0, 32),
    dateText: normalizeText(event?.dateText).slice(0, 80),
    url: normalizeHttpUrl(event?.url || event?.sourceUrl),
    sourceUrl: normalizeHttpUrl(event?.sourceUrl || event?.url),
    sourceName: normalizeText(event?.sourceName || "Fonte oficial").slice(0, 120),
    sourceGroupLabel: normalizeText(event?.sourceGroupLabel || "Fonte").slice(0, 120),
    imageUrls: resolveEventImageUrls(event),
    savedAt: normalizeText(event?.savedAt),
  };
}

function normalizeSavedEvents(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  const seenKeys = new Set();
  return entries
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => createSavedEventSnapshot(entry))
    .filter((entry) => {
      if (!entry.eventKey || seenKeys.has(entry.eventKey)) {
        return false;
      }

      seenKeys.add(entry.eventKey);
      return true;
    })
    .sort((left, right) => {
      const leftMs = new Date(left.savedAt).getTime();
      const rightMs = new Date(right.savedAt).getTime();
      const safeLeftMs = Number.isFinite(leftMs) ? leftMs : 0;
      const safeRightMs = Number.isFinite(rightMs) ? rightMs : 0;
      return safeRightMs - safeLeftMs;
    })
    .slice(0, MAX_SAVED_EVENTS);
}

function formatSavedAt(value = "") {
  const normalized = normalizeText(value);
  if (!normalized) return "";

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function POPEventos({ uiStyleId = "neo", loggedUser = null }) {
  const isMaterialStyle = uiStyleId === "material";
  const isModernStyle = uiStyleId === "modern";
  const isEditorialStyle = uiStyleId === "editorial";
  const firestoreUserId = useMemo(
    () => normalizeText(loggedUser?.id || loggedUser?.uid),
    [loggedUser],
  );

  const sectionClassName = isMaterialStyle
    ? "pop-eventos-board space-y-5"
    : isModernStyle
      ? "pop-eventos-board space-y-5"
      : isEditorialStyle
        ? "pop-eventos-board space-y-6"
        : "pop-eventos-board space-y-6";

  const heroClassName = isMaterialStyle
    ? "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    : isModernStyle
      ? "rounded-xl border border-slate-200 bg-slate-50 p-6"
      : isEditorialStyle
        ? "rounded-lg border border-[#d7c7b2] bg-[#fcf6ea] p-6 shadow-[0_10px_26px_rgba(83,63,39,0.12)]"
        : "premium-card bg-home p-6";

  const panelClassName = isMaterialStyle
    ? "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    : isModernStyle
      ? "rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
      : isEditorialStyle
        ? "rounded-lg border border-[#d7c7b2] bg-[#fff9ef] p-4 shadow-[0_8px_20px_rgba(83,63,39,0.1)] sm:p-5"
        : "premium-card p-4 sm:p-5";

  const eventCardClassName = isMaterialStyle
    ? "pop-eventos-event-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    : isModernStyle
      ? "pop-eventos-event-card overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
      : isEditorialStyle
        ? "pop-eventos-event-card overflow-hidden rounded-lg border border-[#d7c7b2] bg-[#fffaf2] shadow-[0_8px_20px_rgba(83,63,39,0.1)]"
        : "premium-card pop-eventos-event-card overflow-hidden";

  const pagerClassName = isMaterialStyle
    ? "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs font-black uppercase tracking-wide text-slate-800 shadow-sm"
    : isModernStyle
      ? "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-black uppercase tracking-wide text-slate-800"
      : isEditorialStyle
        ? "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#d7c7b2] bg-[#fff8ee] p-4 text-xs font-black uppercase tracking-wide text-slate-800 shadow-[0_8px_18px_rgba(83,63,39,0.08)]"
        : "premium-card flex flex-wrap items-center justify-between gap-3 p-4 text-xs font-black uppercase tracking-wide text-slate-800";

  const assistantCardClassName = isMaterialStyle
    ? "pop-eventos-assistant-card flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
    : isModernStyle
      ? "pop-eventos-assistant-card flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
      : isEditorialStyle
        ? "pop-eventos-assistant-card flex items-center gap-3 rounded-lg border border-[#d7c7b2] bg-[#fff8ee] px-3 py-2 shadow-[0_6px_16px_rgba(83,63,39,0.08)]"
        : "pop-eventos-assistant-card flex items-center gap-3 rounded-2xl border-2 border-slate-900 px-3 py-2 shadow-[3px_3px_0px_0px_#0f172a]";

  const assistantIconClassName = isMaterialStyle
    ? "pop-eventos-assistant-icon h-12 w-12 shrink-0 rounded-xl border border-slate-200 p-1.5"
    : isModernStyle
      ? "pop-eventos-assistant-icon h-12 w-12 shrink-0 rounded-xl border border-slate-200 p-1.5"
      : isEditorialStyle
        ? "pop-eventos-assistant-icon h-12 w-12 shrink-0 rounded-lg border border-[#d7c7b2] p-1.5"
        : "pop-eventos-assistant-icon h-12 w-12 shrink-0 rounded-xl border-2 border-slate-900 p-1.5";

  const statBadgeClassName = isMaterialStyle
    ? "rounded-xl border border-slate-200 bg-white px-3 py-2"
    : isModernStyle
      ? "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
      : isEditorialStyle
        ? "rounded-lg border border-[#d7c7b2] bg-[#fff8ee] px-3 py-2"
        : "rounded-xl border-2 border-slate-900 bg-white px-3 py-2";

  const primaryButtonClassName = isMaterialStyle
    ? "h-[2.7rem] self-end whitespace-nowrap rounded-xl border border-slate-900 bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
    : isModernStyle
      ? "h-[2.7rem] self-end whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
      : isEditorialStyle
        ? "h-[2.7rem] self-end whitespace-nowrap rounded-md border border-[#8f7558] bg-[#e9d5b7] px-4 text-sm font-semibold text-[#4a3828] transition-colors hover:bg-[#dcc19e] disabled:cursor-not-allowed disabled:opacity-70"
        : "premium-button h-[2.7rem] self-end whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-70";

  const openEventButtonClassName = isMaterialStyle
    ? "pop-eventos-button-ghost inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
    : isModernStyle
      ? "pop-eventos-button-ghost inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
      : isEditorialStyle
        ? "pop-eventos-button-ghost inline-flex items-center justify-center gap-2 rounded-md border border-[#bca384] bg-[#fff8ee] px-3 py-2 text-xs font-semibold text-[#5a4633] transition-colors hover:bg-[#f3e5d2]"
        : "premium-button-soft !px-3 !py-2 text-xs";

  const pagerButtonClassName = isMaterialStyle
    ? "pop-eventos-button-ghost rounded-xl border border-slate-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
    : isModernStyle
      ? "pop-eventos-button-ghost rounded-lg border border-slate-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
      : isEditorialStyle
        ? "pop-eventos-button-ghost rounded-md border border-[#bca384] px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
        : "pop-eventos-button-ghost rounded-xl border-2 border-slate-900 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50";

  const tabListClassName = isMaterialStyle
    ? "flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
    : isModernStyle
      ? "flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2"
      : isEditorialStyle
        ? "flex flex-wrap items-center gap-2 rounded-lg border border-[#d7c7b2] bg-[#fff8ee] p-2 shadow-[0_8px_18px_rgba(83,63,39,0.08)]"
        : "premium-card flex flex-wrap items-center gap-2 p-2";

  const tabButtonClassName = isMaterialStyle
    ? "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700"
    : isModernStyle
      ? "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700"
      : isEditorialStyle
        ? "inline-flex items-center justify-center rounded-md border border-[#bca384] bg-[#fffdf7] px-3 py-2 text-xs font-black uppercase tracking-wide text-[#5a4633]"
        : "inline-flex items-center justify-center rounded-xl border-2 border-slate-900 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700";

  const tabButtonActiveClassName = isMaterialStyle
    ? "inline-flex items-center justify-center rounded-xl border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-black uppercase tracking-wide text-white"
    : isModernStyle
      ? "inline-flex items-center justify-center rounded-lg border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-black uppercase tracking-wide text-white"
      : isEditorialStyle
        ? "inline-flex items-center justify-center rounded-md border border-[#8f7558] bg-[#e9d5b7] px-3 py-2 text-xs font-black uppercase tracking-wide text-[#4a3828]"
        : "inline-flex items-center justify-center rounded-xl border-2 border-slate-900 bg-yellow-200 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-900";

  const saveEventButtonClassName = isMaterialStyle
    ? "inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
    : isModernStyle
      ? "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      : isEditorialStyle
        ? "inline-flex items-center justify-center gap-1.5 rounded-md border border-[#bca384] bg-[#fff8ee] px-3 py-2 text-xs font-semibold text-[#5a4633] transition-colors hover:bg-[#f3e5d2] disabled:cursor-not-allowed disabled:opacity-60"
        : "premium-button-soft inline-flex items-center justify-center gap-1.5 !px-3 !py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60";

  const savedEventButtonClassName = isMaterialStyle
    ? "inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-700 bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
    : isModernStyle
      ? "inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-700 bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
      : isEditorialStyle
        ? "inline-flex items-center justify-center gap-1.5 rounded-md border border-[#6a8d50] bg-[#7c9b63] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#6c8a55] disabled:cursor-not-allowed disabled:opacity-60"
        : "premium-button inline-flex items-center justify-center gap-1.5 !px-3 !py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60";

  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState("radar");
  const [savedEvents, setSavedEvents] = useState([]);
  const [savedEventsError, setSavedEventsError] = useState("");
  const [pendingSaveEventKey, setPendingSaveEventKey] = useState("");
  const [scanMeta, setScanMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [scanMode, setScanMode] = useState("quick");
  const [currentPage, setCurrentPage] = useState(1);
  const [imageIndexByEventId, setImageIndexByEventId] = useState({});

  const runScan = useCallback(
    async ({ nextMode = scanMode, nextGroup = groupFilter, nextQuery = queryInput } = {}) => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const payload = await fetchPopEventos({
          year: TARGET_YEAR,
          mode: nextMode,
          query: nextQuery,
          group: nextGroup,
        });

        setEvents(Array.isArray(payload?.events) ? payload.events : []);
        setCurrentPage(1);
        setImageIndexByEventId({});
        setScanMeta({
          mode: String(payload?.mode || nextMode || "quick"),
          query: String(payload?.query || nextQuery || "").trim(),
          generatedAt: String(payload?.generatedAt || ""),
          elapsedMs: Number(payload?.elapsedMs || 0),
          sourcesRequested: Number(payload?.sourcesRequested || 0),
          sourcesScanned: Number(payload?.sourcesScanned || 0),
          sourcesFailed: Number(payload?.sourcesFailed || 0),
          sourcesSkippedByBudget: Number(payload?.sourcesSkippedByBudget || 0),
          eventsCount: Number(payload?.eventsCount || 0),
        });
        setActiveQuery(String(payload?.query || nextQuery || "").trim());
      } catch (error) {
        setErrorMessage(
          String(error?.message || "Nao foi possivel carregar os eventos no momento."),
        );
        setEvents([]);
        setCurrentPage(1);
        setImageIndexByEventId({});
      } finally {
        setIsLoading(false);
      }
    },
    [groupFilter, queryInput, scanMode],
  );

  useEffect(() => {
    void runScan({ nextMode: "quick", nextGroup: "", nextQuery: "" });
  }, [runScan]);

  useEffect(() => {
    if (!firestoreUserId) {
      setSavedEvents([]);
      setSavedEventsError("");
      return undefined;
    }

    const userRef = doc(db, "usuarios", firestoreUserId);
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        const nextSaved = normalizeSavedEvents(snapshot.data()?.[SAVED_EVENTS_FIELD]);
        setSavedEvents(nextSaved);
        setSavedEventsError("");
      },
      (error) => {
        console.error("Erro ao carregar eventos salvos:", error);
        setSavedEventsError("Nao foi possivel carregar seus eventos salvos no momento.");
      },
    );

    return () => unsubscribe();
  }, [firestoreUserId]);

  const formattedGeneratedAt = useMemo(() => {
    const rawDate = String(scanMeta?.generatedAt || "").trim();
    if (!rawDate) return "";
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [scanMeta]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await runScan({
      nextMode: scanMode,
      nextGroup: groupFilter,
      nextQuery: queryInput,
    });
  };

  const handleToggleSavedEvent = useCallback(
    async (eventItem) => {
      if (!firestoreUserId) {
        setSavedEventsError("Faca login para salvar eventos no perfil.");
        return;
      }

      const eventKey = resolveEventKey(eventItem);
      if (!eventKey) {
        setSavedEventsError("Nao foi possivel identificar o evento para salvar.");
        return;
      }

      const wasSaved = savedEvents.some((entry) => entry.eventKey === eventKey);
      const savedSnapshot = createSavedEventSnapshot({
        ...eventItem,
        eventKey,
        savedAt: new Date().toISOString(),
      });
      const nextSavedEvents = wasSaved
        ? savedEvents.filter((entry) => entry.eventKey !== eventKey)
        : normalizeSavedEvents([savedSnapshot, ...savedEvents]).slice(0, MAX_SAVED_EVENTS);
      const previousSavedEvents = savedEvents;

      setPendingSaveEventKey(eventKey);
      setSavedEvents(nextSavedEvents);

      try {
        await setDoc(
          doc(db, "usuarios", firestoreUserId),
          {
            [SAVED_EVENTS_FIELD]: nextSavedEvents,
          },
          { merge: true },
        );
        setSavedEventsError("");
      } catch (error) {
        console.error("Erro ao atualizar eventos salvos:", error);
        setSavedEvents(previousSavedEvents);
        setSavedEventsError("Nao foi possivel salvar este evento no seu perfil.");
      } finally {
        setPendingSaveEventKey("");
      }
    },
    [firestoreUserId, savedEvents],
  );

  const scanEventsCount = Number(scanMeta?.eventsCount || events.length || 0);
  const savedEventsCount = savedEvents.length;
  const visibleEvents = activeTab === "saved" ? savedEvents : events;
  const totalPages = Math.max(1, Math.ceil(visibleEvents.length / EVENTS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const pagedEvents = useMemo(() => {
    const start = (page - 1) * EVENTS_PER_PAGE;
    return visibleEvents.slice(start, start + EVENTS_PER_PAGE);
  }, [visibleEvents, page]);

  const savedEventKeySet = useMemo(
    () => new Set(savedEvents.map((entry) => entry.eventKey)),
    [savedEvents],
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
    setImageIndexByEventId({});
  }, [activeTab]);

  const handleImageError = useCallback((eventId, imageCount) => {
    setImageIndexByEventId((previous) => {
      const currentIndex = Number(previous?.[eventId] ?? 0);
      const nextIndex = currentIndex + 1;
      const safeCount = Math.max(0, Number(imageCount) || 0);
      return {
        ...previous,
        [eventId]: nextIndex >= safeCount ? -1 : nextIndex,
      };
    });
  }, []);

  return (
    <section className={sectionClassName}>
      <header className={heroClassName}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="premium-chip pop-eventos-pill pop-eventos-pill--neutral">
              <Sparkles className="h-4 w-4" />
              GUIA • POP eventos
            </p>
            <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">
              Radar GUIA de Eventos {TARGET_YEAR} para mentores e clubistas
            </h2>
            <p className="max-w-3xl text-sm font-bold text-slate-700 sm:text-base">
              A GUIA varre fontes oficiais e agregadores para reunir eventos,
              editais, olimpiadas e chamadas com foco em {TARGET_YEAR}, incluindo
              descricao, data, links e imagem quando disponivel.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto">
            <div className={assistantCardClassName}>
              <div className={assistantIconClassName}>
                <img
                  src="/Lobo.svg"
                  alt="Logo do GUIA"
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                  Assistente de curadoria
                </p>
                <p className="text-sm font-black uppercase tracking-wide text-slate-900">
                  GUIA
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-black uppercase tracking-wide text-slate-900 sm:grid-cols-1 sm:text-right">
              <span className={statBadgeClassName}>
                Radar: {scanEventsCount}
              </span>
              <span className={statBadgeClassName}>
                Fontes: {Number(scanMeta?.sourcesScanned || 0)}/{Number(scanMeta?.sourcesRequested || 0)}
              </span>
              <span className={statBadgeClassName}>
                Salvos: {savedEventsCount}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className={tabListClassName}>
        <button
          type="button"
          onClick={() => setActiveTab("radar")}
          className={activeTab === "radar" ? tabButtonActiveClassName : tabButtonClassName}
        >
          Radar de eventos ({scanEventsCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("saved")}
          className={activeTab === "saved" ? tabButtonActiveClassName : tabButtonClassName}
        >
          Eventos salvos ({savedEventsCount})
        </button>
      </div>

      {activeTab === "radar" && (
        <form onSubmit={handleSubmit} className={panelClassName}>
          <div className="grid gap-3 lg:grid-cols-[11rem_14rem_minmax(0,1fr)_auto]">
            <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-wide text-slate-700">
              Modo
              <select
                value={scanMode}
                onChange={(event) => setScanMode(event.target.value)}
                className="rounded-xl border-2 border-slate-900 bg-white px-3 py-2 text-sm font-bold text-slate-900"
              >
                {MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-wide text-slate-700">
              Fonte
              <select
                value={groupFilter}
                onChange={(event) => setGroupFilter(event.target.value)}
                className="rounded-xl border-2 border-slate-900 bg-white px-3 py-2 text-sm font-bold text-slate-900"
              >
                {GROUP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-wide text-slate-700">
              Busca livre
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={queryInput}
                  onChange={(event) => setQueryInput(event.target.value)}
                  placeholder="Ex.: IA, edital, olimpiada"
                  className="w-full rounded-xl border-2 border-slate-900 bg-white py-2 pl-10 pr-3 text-sm font-bold text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className={primaryButtonClassName}
            >
              {isLoading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Varrendo...
                </>
              ) : (
                <>
                  <Filter className="h-4 w-4" />
                  Atualizar
                </>
              )}
            </button>
          </div>

          {(scanMeta || activeQuery) && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
              {activeQuery && (
                <span className="pop-eventos-pill pop-eventos-pill--accent rounded-full border-2 border-slate-900 px-3 py-1 text-slate-800">
                  Filtro: {activeQuery}
                </span>
              )}
              {formattedGeneratedAt && (
                <span className="pop-eventos-pill pop-eventos-pill--warning rounded-full border-2 border-slate-900 px-3 py-1 text-slate-800">
                  Atualizado em {formattedGeneratedAt}
                </span>
              )}
              {Number(scanMeta?.sourcesSkippedByBudget || 0) > 0 && (
                <span className="pop-eventos-pill pop-eventos-pill--danger rounded-full border-2 border-slate-900 px-3 py-1 text-slate-800">
                  Puladas por tempo: {Number(scanMeta?.sourcesSkippedByBudget || 0)}
                </span>
              )}
            </div>
          )}
        </form>
      )}

      {savedEventsError && (
        <div className="premium-card border-amber-400 bg-amber-50 p-4 text-sm font-bold text-amber-700">
          {savedEventsError}
        </div>
      )}

      {activeTab === "radar" && errorMessage && (
        <div className="premium-card border-red-400 bg-red-50 p-4 text-sm font-bold text-red-700">
          {errorMessage}
        </div>
      )}

      {activeTab === "radar" && isLoading && events.length === 0 && (
        <div className="premium-card p-8 text-center">
          <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-slate-700" />
          <p className="mt-3 text-sm font-bold text-slate-700">
            GUIA coletando eventos nas fontes oficiais...
          </p>
        </div>
      )}

      {activeTab === "radar" && !isLoading && !errorMessage && events.length === 0 && (
        <div className="premium-card p-6 text-sm font-bold text-slate-700">
          Nenhum evento de {TARGET_YEAR} encontrado com os filtros atuais.
        </div>
      )}

      {activeTab === "saved" && savedEvents.length === 0 && (
        <div className="premium-card p-6 text-sm font-bold text-slate-700">
          Voce ainda nao salvou eventos. Use o botao "Salvar no perfil" nos cards do radar.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {pagedEvents.map((event) => {
          const eventKey = resolveEventKey(event);
          const imageUrls = resolveEventImageUrls(event);
          const imageIndex = Number(imageIndexByEventId?.[eventKey] ?? 0);
          const previewImage = imageIndex >= 0 ? imageUrls[imageIndex] || "" : "";
          const formattedDate = formatIsoDate(event?.startDate || "");
          const dateLabel = formattedDate || String(event?.dateText || "Data nao informada");
          const eventUrl = normalizeHttpUrl(event?.url || event?.sourceUrl);
          const sourceUrl = normalizeHttpUrl(event?.sourceUrl || "");
          const isSaved = savedEventKeySet.has(eventKey);
          const isSavingThisEvent = pendingSaveEventKey === eventKey;
          const savedAtLabel = formatSavedAt(event?.savedAt);
          const isWomenProtagonism = Boolean(event?.womenProtagonism);
          const womenBadgeLabel = String(
            event?.womenProtagonismLabel || "Protagonismo Feminino",
          );
          const cardClassName = isWomenProtagonism
            ? `${eventCardClassName} pop-eventos-event-card--women`
            : eventCardClassName;
          const saveButtonLabel = !firestoreUserId
            ? "Entrar para salvar"
            : isSaved
              ? "Remover dos salvos"
              : "Salvar no perfil";

          return (
            <article key={eventKey} className={cardClassName}>
              {previewImage ? (
                <div className="relative">
                  <img
                    src={previewImage}
                    alt={`Imagem de apoio do evento ${event?.title || ""}`}
                    className="h-40 w-full border-b-2 border-slate-900 object-cover"
                    loading="lazy"
                    onError={() => handleImageError(eventKey, imageUrls.length)}
                  />
                  {isWomenProtagonism ? (
                    <span className="pop-eventos-seal-women absolute left-3 top-3 inline-flex items-center rounded-full border-2 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide">
                      selo: elas em foco
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-4 p-4 sm:p-5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-wide">
                    <span className="pop-eventos-pill pop-eventos-pill--accent rounded-full border-2 border-slate-900 px-2.5 py-1 text-slate-900">
                      {String(event?.sourceGroupLabel || "Fonte")}
                    </span>
                    <span className="pop-eventos-pill pop-eventos-pill--warning rounded-full border-2 border-slate-900 px-2.5 py-1 text-slate-900">
                      {String(event?.sourceName || "Fonte oficial")}
                    </span>
                    <span className="pop-eventos-pill pop-eventos-pill--soft rounded-full border-2 border-slate-900 px-2.5 py-1 text-slate-900">
                      GUIA IA
                    </span>
                    {isWomenProtagonism ? (
                      <span className="pop-eventos-pill pop-eventos-pill--women rounded-full border-2 px-2.5 py-1">
                        {womenBadgeLabel}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="text-lg font-black leading-tight text-slate-900">
                    {String(event?.title || "Evento sem titulo")}
                  </h3>
                </div>

                <p className="text-sm font-bold leading-relaxed text-slate-700">
                  {String(event?.description || event?.pageTitle || "Sem descricao disponivel.")}
                </p>

                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
                  <span className="pop-eventos-pill pop-eventos-pill--neutral inline-flex items-center gap-1 rounded-full border-2 border-slate-900 px-3 py-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {dateLabel}
                  </span>
                  {savedAtLabel && (
                    <span className="pop-eventos-pill pop-eventos-pill--soft inline-flex items-center gap-1 rounded-full border-2 border-slate-900 px-3 py-1">
                      Salvo em {savedAtLabel}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {eventUrl ? (
                    <a
                      href={eventUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={openEventButtonClassName}
                    >
                      Abrir evento
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="rounded-xl border-2 border-slate-300 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
                      Link indisponivel
                    </span>
                  )}



                  <button
                    type="button"
                    onClick={() => {
                      void handleToggleSavedEvent(event);
                    }}
                    disabled={isSavingThisEvent || !firestoreUserId}
                    className={isSaved ? savedEventButtonClassName : saveEventButtonClassName}
                  >
                    {isSaved ? (
                      <BookmarkCheck className="h-3.5 w-3.5" />
                    ) : (
                      <Bookmark className="h-3.5 w-3.5" />
                    )}
                    {saveButtonLabel}
                  </button>
                  {sourceUrl && (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-black uppercase tracking-wide text-slate-600 underline decoration-2"
                    >
                      Fonte principal
                    </a>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {visibleEvents.length > EVENTS_PER_PAGE && (
        <div className={pagerClassName}>
          <span>
            Pagina {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
              disabled={page <= 1}
              className={pagerButtonClassName}
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((previous) => Math.min(totalPages, previous + 1))}
              disabled={page >= totalPages}
              className={pagerButtonClassName}
            >
              Proxima
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
