import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {

  Bookmark,

  BookmarkCheck,
  Bell,
  BellRing,

  CalendarDays,
  ChevronLeft,
  ChevronRight,

  ExternalLink,

  Filter,

  LoaderCircle,

  Search,

  Sparkles,
  Info,
  Zap,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
} from "lucide-react";

import { doc, onSnapshot, setDoc } from "firebase/firestore";



import { db } from "../../../firebase";

import { fetchPopEventos, runPopEventosAlertSweep } from "../../services/popEventosService";

import { normalizeUiStyleId } from "../../constants/uiPreferences";



const TARGET_YEAR = 2026;

const EVENTS_PER_PAGE = 10;

const MAX_SAVED_EVENTS = 80;

const SAVED_EVENTS_FIELD = "pop_eventos_saved";
const POP_EVENT_ALERT_SUBSCRIPTIONS_FIELD = "pop_eventos_alert_subscriptions";
const POP_EVENT_ALERT_SUBSCRIPTIONS_COUNT_FIELD = "pop_eventos_alert_subscriptions_count";
const POP_EVENT_ALERTS_FIELD = "pop_eventos_alerts";
const MAX_POP_EVENT_ALERT_SUBSCRIPTIONS = 120;
const MAX_POP_EVENT_ALERTS = 120;
const CALENDAR_WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const DESCRIPTION_PREVIEW_LIMIT = 240;
const RADAR_CACHE_STORAGE_KEY = "pop_eventos_radar_cache_v2";
const RADAR_CACHE_MAX_EVENTS = 180;
const RADAR_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const RADAR_BACKGROUND_REFRESH_INTERVAL_MS = 3 * 60 * 1000;

const EVENT_IDENTITY_BY_GROUP = {

  protagonismo_feminino: { tone: "women", label: "Trilha Elas em Foco" },

  fapesb: { tone: "research", label: "Trilha Pesquisa e Bolsas" },

  bahia: { tone: "regional", label: "Trilha Bahia" },

  governo_federal: { tone: "public", label: "Trilha Governo Federal" },

  olimpiadas: { tone: "challenge", label: "Trilha Olimpiadas" },

  sistema_s: { tone: "career", label: "Trilha Formacao Tecnica" },

  universidades: { tone: "academia", label: "Trilha Universitaria" },

  inovacao: { tone: "innovation", label: "Trilha Inovacao" },

  agregadores: { tone: "curation", label: "Trilha Curadoria" },

};

const WOMEN_PROTAGONISM_FALLBACK_KEYWORDS = [

  "protagonismo feminino",

  "lideranca feminina",

  "mulheres na ciencia",

  "mulheres na tecnologia",

  "meninas na tecnologia",

  "publico feminino",

  "equidade de genero",

  "mulheres",

  "mulher",

  "meninas",

  "menina",

  "feminino",

  "feminina",

];



const MODE_OPTIONS = [

  { value: "quick", label: "Varredura rápida" },

  { value: "full", label: "Varredura completa" },

];



const GROUP_OPTIONS = [

  { value: "", label: "Todas as fontes" },

  { value: "protagonismo_feminino", label: "Protagonismo feminino" },

  { value: "fapesb", label: "FAPESB" },

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



function toIsoDateOnly(value = "") {

  const normalized = normalizeText(value);
  if (!normalized) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);

}



function toMonthKey(dateValue) {

  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;

}



function formatCalendarMonthLabel(dateValue) {

  return dateValue.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

}



function buildMonthCalendarGrid(dateValue) {

  const year = dateValue.getFullYear();
  const monthIndex = dateValue.getMonth();
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const firstWeekday = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, monthIndex, 0).getDate();
  const grid = [];

  for (let cellIndex = 0; cellIndex < 42; cellIndex += 1) {
    const relativeDay = cellIndex - firstWeekday + 1;
    let cellYear = year;
    let cellMonthIndex = monthIndex;
    let dayNumber = relativeDay;
    let inCurrentMonth = true;

    if (relativeDay <= 0) {
      inCurrentMonth = false;
      cellMonthIndex = monthIndex - 1;
      if (cellMonthIndex < 0) {
        cellMonthIndex = 11;
        cellYear -= 1;
      }
      dayNumber = daysInPreviousMonth + relativeDay;
    } else if (relativeDay > daysInMonth) {
      inCurrentMonth = false;
      cellMonthIndex = monthIndex + 1;
      if (cellMonthIndex > 11) {
        cellMonthIndex = 0;
        cellYear += 1;
      }
      dayNumber = relativeDay - daysInMonth;
    }

    const monthNumber = String(cellMonthIndex + 1).padStart(2, "0");
    const dayLabel = String(dayNumber).padStart(2, "0");

    grid.push({
      isoDate: `${cellYear}-${monthNumber}-${dayLabel}`,
      dayNumber,
      inCurrentMonth,
    });
  }

  return grid;

}



function getTodayIsoDate() {

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;

}



function normalizeText(value = "") {

  return String(value || "").trim();

}



function normalizeHttpUrl(value = "") {

  const normalized = normalizeText(value);

  if (!normalized) return "";

  return /^https?:\/\//i.test(normalized) ? normalized : "";

}



function resolveRootUiStyleId() {

  if (typeof document === "undefined") {

    return "";

  }



  return normalizeUiStyleId(document.documentElement?.getAttribute("data-ui-style"));

}



function summarizeDescription(value = "", limit = DESCRIPTION_PREVIEW_LIMIT) {

  const normalized = normalizeText(value);

  if (!normalized) {

    return {

      preview: "Sem descricao disponivel.",

      full: "Sem descricao disponivel.",

      isTruncated: false,

    };

  }



  if (normalized.length <= limit) {

    return {

      preview: normalized,

      full: normalized,

      isTruncated: false,

    };

  }



  const shortened = normalized.slice(0, limit).replace(/\s+\S*$/, "").trim();

  return {

    preview: `${shortened}...`,

    full: normalized,

    isTruncated: true,

  };

}



function resolveEventIdentity(event = {}) {

  const groupKeyRaw = normalizeText(

    event?.sourceGroup || event?.sourceGroupKey || event?.group || event?.source_group,

  )

    .toLowerCase()

    .replace(/\s+/g, "_");

  if (EVENT_IDENTITY_BY_GROUP[groupKeyRaw]) {

    return EVENT_IDENTITY_BY_GROUP[groupKeyRaw];

  }



  const label = normalizeText(event?.sourceGroupLabel).toLowerCase();

  if (label.includes("femin")) return EVENT_IDENTITY_BY_GROUP.protagonismo_feminino;

  if (label.includes("olimpi")) return EVENT_IDENTITY_BY_GROUP.olimpiadas;

  if (label.includes("universi") || label.includes("institut")) return EVENT_IDENTITY_BY_GROUP.universidades;

  if (label.includes("inov")) return EVENT_IDENTITY_BY_GROUP.inovacao;

  if (label.includes("governo") || label.includes("federal")) return EVENT_IDENTITY_BY_GROUP.governo_federal;

  if (label.includes("bahia")) return EVENT_IDENTITY_BY_GROUP.bahia;



  return {

    tone: "general",

    label: "Trilha Oportunidades Gerais",

  };

}



function resolveWomenProtagonism(event = {}) {

  if (typeof event?.womenProtagonism === "boolean") {

    return event.womenProtagonism;

  }



  const normalizedContext = normalizeText(

    [

      event?.title,

      event?.description,

      event?.sourceName,

      event?.sourceGroupLabel,

      event?.womenProtagonismLabel,

    ]

      .filter(Boolean)

      .join(" "),

  ).toLowerCase();



  if (!normalizedContext) {

    return false;

  }



  return WOMEN_PROTAGONISM_FALLBACK_KEYWORDS.some((keyword) =>

    normalizedContext.includes(keyword),

  );

}



function resolveWomenProtagonismLabel(event = {}, isWomenProtagonism = false) {

  const explicitLabel = normalizeText(event?.womenProtagonismLabel);

  if (explicitLabel) {

    return explicitLabel;

  }



  return isWomenProtagonism

    ? "Protagonismo Feminino"

    : "Sem protagonismo feminino";

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



function isLikelySocialMediaIconUrl(value = "") {

  const normalized = normalizeText(value).toLowerCase();

  if (!normalized) return false;

  const hasSocialKeyword =
    /(facebook|instagram|twitter|linkedin|youtube|tiktok|whatsapp|telegram|pinterest|threads|social|face|insta)/.test(
      normalized,
    );

  const hasIconKeyword =
    /(icon|icone|favicon|sprite|logo|avatar|share|follow|btn|button|flink)/.test(normalized);

  if (hasSocialKeyword && hasIconKeyword) {
    return true;
  }

  return /(icone-face|icon-face|icone-facebook|icon-facebook|icone-inst|icon-inst|icone-twitter|icon-twitter)/.test(
    normalized,
  );

}



function resolveEventImageUrls(event = {}) {

  if (Array.isArray(event?.imageUrls)) {

    return event.imageUrls
      .map((value) => normalizeText(value))
      .filter(Boolean)
      .filter((value) => !isLikelySocialMediaIconUrl(value))
      .filter((value, index, array) => array.indexOf(value) === index)
      .slice(0, 3);

  }



  const imageUrl = normalizeText(event?.imageUrl);

  if (!imageUrl || isLikelySocialMediaIconUrl(imageUrl)) {

    return [];

  }

  return [imageUrl];

}



function createSavedEventSnapshot(event = {}) {

  const womenProtagonism = resolveWomenProtagonism(event);



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

    womenProtagonism,

    womenProtagonismLabel: resolveWomenProtagonismLabel(event, womenProtagonism).slice(0, 120),

    educationAudienceFocus: Boolean(event?.educationAudienceFocus),

    educationAudienceLabel: normalizeText(event?.educationAudienceLabel).slice(0, 120),

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

function createEventAlertSubscriptionSnapshot(event = {}) {
  return {
    eventKey: resolveEventKey(event),
    title: normalizeText(event?.title || "Evento sem titulo").slice(0, 240),
    startDate: toIsoDateOnly(event?.startDate),
    dateText: normalizeText(event?.dateText).slice(0, 80),
    url: normalizeHttpUrl(event?.url || event?.sourceUrl),
    sourceName: normalizeText(event?.sourceName || "Fonte oficial").slice(0, 120),
    sourceGroupLabel: normalizeText(event?.sourceGroupLabel || "Fonte").slice(0, 120),
    imageUrls: resolveEventImageUrls(event),
    womenProtagonism: Boolean(resolveWomenProtagonism(event)),
    notifiedMilestones: Array.isArray(event?.notifiedMilestones)
      ? [...new Set(
        event.notifiedMilestones
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value >= 0 && value <= 60)
          .map((value) => Math.trunc(value)),
      )].sort((a, b) => b - a)
      : [],
    subscribedAt: normalizeText(event?.subscribedAt || new Date().toISOString()),
  };
}

function normalizeEventAlertSubscriptions(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  const seenKeys = new Set();

  return entries
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => createEventAlertSubscriptionSnapshot(entry))
    .filter((entry) => {
      if (!entry?.eventKey || !entry?.startDate || seenKeys.has(entry.eventKey)) {
        return false;
      }
      seenKeys.add(entry.eventKey);
      return true;
    })
    .sort((left, right) => {
      const leftMs = new Date(left.startDate).getTime();
      const rightMs = new Date(right.startDate).getTime();
      const safeLeftMs = Number.isFinite(leftMs) ? leftMs : Number.MAX_SAFE_INTEGER;
      const safeRightMs = Number.isFinite(rightMs) ? rightMs : Number.MAX_SAFE_INTEGER;
      if (safeLeftMs !== safeRightMs) {
        return safeLeftMs - safeRightMs;
      }
      return String(left.title || "").localeCompare(String(right.title || ""), "pt-BR");
    })
    .slice(0, MAX_POP_EVENT_ALERT_SUBSCRIPTIONS);
}

function normalizeEventAlerts(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  const seenIds = new Set();

  return entries
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const id = normalizeText(entry?.id);
      const createdAt = normalizeText(entry?.createdAt || "");
      return {
        id,
        type: normalizeText(entry?.type || "pop_evento_alerta"),
        eventKey: normalizeText(entry?.eventKey),
        title: normalizeText(entry?.title || "Evento"),
        startDate: toIsoDateOnly(entry?.startDate),
        dateText: normalizeText(entry?.dateText),
        url: normalizeHttpUrl(entry?.url),
        sourceName: normalizeText(entry?.sourceName),
        sourceGroupLabel: normalizeText(entry?.sourceGroupLabel),
        milestoneDays: Number(entry?.milestoneDays || 0),
        message: normalizeText(entry?.message),
        read: Boolean(entry?.read),
        createdAt,
      };
    })
    .filter((entry) => {
      if (!entry.id || seenIds.has(entry.id)) return false;
      seenIds.add(entry.id);
      return true;
    })
    .sort((left, right) => {
      const leftMs = new Date(left.createdAt).getTime();
      const rightMs = new Date(right.createdAt).getTime();
      const safeLeftMs = Number.isFinite(leftMs) ? leftMs : 0;
      const safeRightMs = Number.isFinite(rightMs) ? rightMs : 0;
      return safeRightMs - safeLeftMs;
    })
    .slice(0, MAX_POP_EVENT_ALERTS);
}

function normalizeScanMetaPayload(payload = {}, fallback = {}) {
  return {
    mode: String(payload?.mode || fallback?.mode || "quick").trim() || "quick",
    query: String(payload?.query || fallback?.query || "").trim(),
    generatedAt: String(payload?.generatedAt || fallback?.generatedAt || "").trim(),
    elapsedMs: Number(payload?.elapsedMs || fallback?.elapsedMs || 0),
    sourcesRequested: Number(payload?.sourcesRequested || fallback?.sourcesRequested || 0),
    sourcesScanned: Number(payload?.sourcesScanned || fallback?.sourcesScanned || 0),
    sourcesFailed: Number(payload?.sourcesFailed || fallback?.sourcesFailed || 0),
    sourcesSkippedByBudget: Number(payload?.sourcesSkippedByBudget || fallback?.sourcesSkippedByBudget || 0),
    eventsCount: Number(payload?.eventsCount || fallback?.eventsCount || 0),
  };
}

function normalizeRadarEventEntry(entry = {}) {
  const womenProtagonism = resolveWomenProtagonism(entry);
  const eventKey = resolveEventKey(entry);

  return {
    ...entry,
    eventKey,
    title: normalizeText(entry?.title || "Evento sem titulo").slice(0, 240),
    description: normalizeText(entry?.description || entry?.pageTitle || "").slice(0, 1500),
    pageTitle: normalizeText(entry?.pageTitle || entry?.description || "").slice(0, 1500),
    startDate: normalizeText(entry?.startDate).slice(0, 32),
    dateText: normalizeText(entry?.dateText).slice(0, 80),
    url: normalizeHttpUrl(entry?.url || entry?.sourceUrl),
    sourceUrl: normalizeHttpUrl(entry?.sourceUrl || entry?.url),
    sourceName: normalizeText(entry?.sourceName || "Fonte oficial").slice(0, 120),
    sourceGroupLabel: normalizeText(entry?.sourceGroupLabel || "Fonte").slice(0, 120),
    sourceGroup: normalizeText(
      entry?.sourceGroup || entry?.sourceGroupKey || entry?.group || entry?.source_group,
    ).slice(0, 120),
    sourceGroupKey: normalizeText(
      entry?.sourceGroupKey || entry?.sourceGroup || entry?.group || entry?.source_group,
    ).slice(0, 120),
    imageUrls: resolveEventImageUrls(entry),
    womenProtagonism,
    womenProtagonismLabel: resolveWomenProtagonismLabel(entry, womenProtagonism).slice(0, 120),
    educationAudienceFocus: Boolean(entry?.educationAudienceFocus),
    educationAudienceLabel: normalizeText(entry?.educationAudienceLabel).slice(0, 120),
  };
}

function normalizeRadarEvents(entries) {
  if (!Array.isArray(entries)) return [];

  const seenKeys = new Set();
  const normalized = [];

  entries.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;

    const next = normalizeRadarEventEntry(entry);
    if (!next?.eventKey || seenKeys.has(next.eventKey)) return;

    seenKeys.add(next.eventKey);
    normalized.push(next);
  });

  return normalized;
}

function areSameEventSequence(left = [], right = []) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    if (resolveEventKey(left[index]) !== resolveEventKey(right[index])) {
      return false;
    }
  }

  return true;
}

function mergeEventsWithNewEntries(currentEntries = [], incomingEntries = []) {
  const normalizedCurrent = normalizeRadarEvents(currentEntries);
  const normalizedIncoming = normalizeRadarEvents(incomingEntries);
  const knownKeys = new Set(normalizedCurrent.map((entry) => resolveEventKey(entry)));
  const newcomers = normalizedIncoming.filter((entry) => !knownKeys.has(resolveEventKey(entry)));

  return normalizeRadarEvents([...newcomers, ...normalizedCurrent]).slice(0, RADAR_CACHE_MAX_EVENTS);
}

function buildRadarCachePayload({
  events = [],
  scanMeta = null,
  mode = "quick",
  group = "",
  query = "",
} = {}) {
  return {
    savedAt: new Date().toISOString(),
    filters: {
      mode: String(mode || "quick").trim() || "quick",
      group: String(group || "").trim(),
      query: String(query || "").trim(),
    },
    scanMeta: normalizeScanMetaPayload(scanMeta || {}, {
      mode,
      query,
      eventsCount: Array.isArray(events) ? events.length : 0,
    }),
    events: normalizeRadarEvents(events).slice(0, RADAR_CACHE_MAX_EVENTS),
  };
}

function readRadarCacheSafely() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(RADAR_CACHE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const savedAt = String(parsed?.savedAt || "").trim();
    const savedAtMs = new Date(savedAt).getTime();
    if (!savedAt || !Number.isFinite(savedAtMs)) return null;
    if (Date.now() - savedAtMs > RADAR_CACHE_MAX_AGE_MS) return null;

    const events = normalizeRadarEvents(parsed?.events);
    if (!events.length) return null;

    const filters = {
      mode: String(parsed?.filters?.mode || "quick").trim() || "quick",
      group: String(parsed?.filters?.group || "").trim(),
      query: String(parsed?.filters?.query || "").trim(),
    };

    const scanMeta = normalizeScanMetaPayload(parsed?.scanMeta || {}, {
      mode: filters.mode,
      query: filters.query,
      eventsCount: events.length,
    });

    return {
      savedAt,
      filters,
      scanMeta,
      events,
    };
  } catch {
    return null;
  }
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

  const firestoreUserId = useMemo(

    () => normalizeText(loggedUser?.id || loggedUser?.uid),

    [loggedUser],

  );

  const [normalizedStyleId, setNormalizedStyleId] = useState(() =>

    normalizeUiStyleId(uiStyleId || resolveRootUiStyleId()),

  );



  useEffect(() => {

    setNormalizedStyleId(normalizeUiStyleId(uiStyleId || resolveRootUiStyleId()));

  }, [uiStyleId]);



  useEffect(() => {

    if (typeof document === "undefined") {

      return undefined;

    }



    const root = document.documentElement;

    const observer = new MutationObserver(() => {

      const nextStyleId = normalizeUiStyleId(root.getAttribute("data-ui-style"));

      setNormalizedStyleId((previous) => (previous === nextStyleId ? previous : nextStyleId));

    });



    observer.observe(root, {

      attributes: true,

      attributeFilter: ["data-ui-style"],

    });



    return () => observer.disconnect();

  }, []);



  const sectionClassName = `pop-eventos-board pop-eventos-board--${normalizedStyleId} `;

  const heroClassName = "pop-eventos-hero premium-card bg-home p-6 sm:p-7";

  const panelClassName = "pop-eventos-filter-panel";

  const eventCardClassName = "pop-eventos-event-card";

  const pagerClassName = "pop-eventos-pager";

  const assistantCardClassName = "pop-eventos-assistant-card";

  const assistantIconClassName = "pop-eventos-assistant-icon";

  const statBadgeClassName = "pop-eventos-stat-badge";

  const primaryButtonClassName = "pop-eventos-primary-button";

  const openEventButtonClassName = "pop-eventos-button-ghost";

  const pagerButtonClassName = "pop-eventos-pager-button";

  const tabListClassName = "pop-eventos-tab-list";

  const tabButtonClassName = "pop-eventos-tab-button";

  const tabButtonActiveClassName = "pop-eventos-tab-button pop-eventos-tab-button--active";

  const saveEventButtonClassName = "pop-eventos-save-button";

  const savedEventButtonClassName = "pop-eventos-save-button pop-eventos-save-button--active";



  const [events, setEvents] = useState([]);

  const [activeTab, setActiveTab] = useState("radar");

  const [savedEvents, setSavedEvents] = useState([]);

  const [savedEventsError, setSavedEventsError] = useState("");

  const [pendingSaveEventKey, setPendingSaveEventKey] = useState("");

  const [scanMeta, setScanMeta] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [backgroundRefreshNotice, setBackgroundRefreshNotice] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  const [queryInput, setQueryInput] = useState("");

  const [activeQuery, setActiveQuery] = useState("");
  const [activeScanMode, setActiveScanMode] = useState("quick");
  const [activeGroupFilter, setActiveGroupFilter] = useState("");

  const [groupFilter, setGroupFilter] = useState("");

  const [scanMode, setScanMode] = useState("quick");

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [expandedDescriptionByEvent, setExpandedDescriptionByEvent] = useState({});

  const [expandedDetailsByEvent, setExpandedDetailsByEvent] = useState({});

  const [currentPage, setCurrentPage] = useState(1);
  const [eventAlertSubscriptions, setEventAlertSubscriptions] = useState([]);
  const [eventAlerts, setEventAlerts] = useState([]);
  const [eventAlertsError, setEventAlertsError] = useState("");
  const [pendingAlertEventKey, setPendingAlertEventKey] = useState("");
  const [isRunningAlertSweep, setIsRunningAlertSweep] = useState(false);
  const [alertSweepNotice, setAlertSweepNotice] = useState("");
  const [calendarCursorDate, setCalendarCursorDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState("");
  const [alertCarouselIndex, setAlertCarouselIndex] = useState(0);
  const todayIsoDate = useMemo(() => getTodayIsoDate(), []);

  const hasBootstrappedScanRef = useRef(false);
  const isScanInFlightRef = useRef(false);
  const eventsRef = useRef([]);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);



  const runScan = useCallback(
    async ({
      nextMode = scanMode,
      nextGroup = groupFilter,
      nextQuery = queryInput,
      background = false,
      applyOnlyIfNew = false,
      forceRefresh = false,
    } = {}) => {
      if (isScanInFlightRef.current && background) {
        return;
      }

      isScanInFlightRef.current = true;

      if (background) {
        setIsBackgroundRefreshing(true);
      } else {
        setIsLoading(true);
        setErrorMessage("");
      }

      let shouldScheduleForcedRefresh = false;
      try {
        const payload = await fetchPopEventos({
          year: TARGET_YEAR,
          mode: nextMode,
          query: nextQuery,
          group: nextGroup,
          forceRefresh,
        });

        const normalizedIncomingEvents = normalizeRadarEvents(payload?.events);
        const previousEvents = eventsRef.current;
        const shouldApplyNewOnly = background && applyOnlyIfNew && previousEvents.length > 0;
        const mergedEvents = shouldApplyNewOnly
          ? mergeEventsWithNewEntries(previousEvents, normalizedIncomingEvents)
          : normalizedIncomingEvents;
        const hasNewEntries = shouldApplyNewOnly
          ? mergedEvents.length > previousEvents.length
          : false;
        const nextEvents = shouldApplyNewOnly && !hasNewEntries
          ? previousEvents
          : mergedEvents;
        const didEventSequenceChange = !areSameEventSequence(previousEvents, nextEvents);

        const normalizedQuery = String(payload?.query || nextQuery || "").trim();
        const nextScanMeta = normalizeScanMetaPayload(payload, {
          mode: nextMode,
          query: normalizedQuery,
          eventsCount: nextEvents.length,
        });

        if (didEventSequenceChange) {
          eventsRef.current = nextEvents;
          setEvents(nextEvents);

          if (!background) {
            setCurrentPage(1);
            setExpandedDescriptionByEvent({});
            setExpandedDetailsByEvent({});
          }
        }

        if (!background || didEventSequenceChange) {
          setScanMeta(nextScanMeta);
        }

        setActiveQuery(normalizedQuery);
        setActiveScanMode(String(nextMode || "quick").trim() || "quick");
        setActiveGroupFilter(String(nextGroup || "").trim());

        if (background && hasNewEntries) {
          const newcomersCount = Math.max(1, mergedEvents.length - previousEvents.length);
          setBackgroundRefreshNotice(
            `${newcomersCount} novo(s) evento(s) entrou(aram) no radar em segundo plano.`,
          );
        }

        shouldScheduleForcedRefresh = Boolean(
          !background
          && !forceRefresh
          && payload?.sharedCache?.servedFromCache === true
          && payload?.sharedCache?.revalidateRecommended === true,
        );
      } catch (error) {
        if (!background) {
          setErrorMessage(
            String(error?.message || "Nao foi possivel carregar os eventos no momento."),
          );
          setEvents([]);
          setCurrentPage(1);
        }
      } finally {
        isScanInFlightRef.current = false;
        if (background) {
          setIsBackgroundRefreshing(false);
        } else {
          setIsLoading(false);
        }

        if (shouldScheduleForcedRefresh) {
          setTimeout(() => {
            void runScan({
              nextMode,
              nextGroup,
              nextQuery,
              background: true,
              applyOnlyIfNew: true,
              forceRefresh: true,
            });
          }, 0);
        }
      }
    },
    [groupFilter, queryInput, scanMode],
  );

  useEffect(() => {
    if (hasBootstrappedScanRef.current) {
      return;
    }

    hasBootstrappedScanRef.current = true;
    const cachePayload = readRadarCacheSafely();

    if (cachePayload?.events?.length) {
      eventsRef.current = cachePayload.events;
      setEvents(cachePayload.events);
      setScanMeta(cachePayload.scanMeta || null);
      setScanMode(cachePayload.filters.mode || "quick");
      setGroupFilter(cachePayload.filters.group || "");
      setQueryInput(cachePayload.filters.query || "");
      setActiveQuery(cachePayload.filters.query || "");
      setActiveScanMode(cachePayload.filters.mode || "quick");
      setActiveGroupFilter(cachePayload.filters.group || "");

      void runScan({
        nextMode: cachePayload.filters.mode || "quick",
        nextGroup: cachePayload.filters.group || "",
        nextQuery: cachePayload.filters.query || "",
        background: true,
        applyOnlyIfNew: true,
        forceRefresh: true,
      });
      return;
    }

    void runScan({ nextMode: "quick", nextGroup: "", nextQuery: "" });
  }, [runScan]);

  useEffect(() => {
    if (!hasBootstrappedScanRef.current) return undefined;
    if (!["radar", "calendar"].includes(activeTab)) return undefined;

    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }

      void runScan({
        nextMode: activeScanMode,
        nextGroup: activeGroupFilter,
        nextQuery: activeQuery,
        background: true,
        applyOnlyIfNew: true,
        forceRefresh: true,
      });
    }, RADAR_BACKGROUND_REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [activeGroupFilter, activeQuery, activeScanMode, activeTab, runScan]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!Array.isArray(events) || events.length <= 0) return;

    const payload = buildRadarCachePayload({
      events,
      scanMeta,
      mode: activeScanMode,
      group: activeGroupFilter,
      query: activeQuery,
    });

    try {
      window.localStorage.setItem(RADAR_CACHE_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore cache write errors (quota / blocked storage)
    }
  }, [activeGroupFilter, activeQuery, activeScanMode, events, scanMeta]);

  useEffect(() => {
    if (!backgroundRefreshNotice) return undefined;

    const timeoutId = setTimeout(() => {
      setBackgroundRefreshNotice("");
    }, 6500);

    return () => clearTimeout(timeoutId);
  }, [backgroundRefreshNotice]);

  useEffect(() => {
    if (!alertSweepNotice) return undefined;

    const timeoutId = setTimeout(() => {
      setAlertSweepNotice("");
    }, 6500);

    return () => clearTimeout(timeoutId);
  }, [alertSweepNotice]);

  useEffect(() => {
    if (!firestoreUserId) {

      setSavedEvents([]);

      setSavedEventsError("");
      setEventAlertSubscriptions([]);
      setEventAlerts([]);
      setEventAlertsError("");
      setAlertSweepNotice("");

      return undefined;

    }



    const userRef = doc(db, "usuarios", firestoreUserId);

    const unsubscribe = onSnapshot(

      userRef,

      (snapshot) => {

        const data = snapshot.data() || {};
        const nextSaved = normalizeSavedEvents(data?.[SAVED_EVENTS_FIELD]);
        const nextAlertSubscriptions = normalizeEventAlertSubscriptions(
          data?.[POP_EVENT_ALERT_SUBSCRIPTIONS_FIELD],
        );
        const nextAlerts = normalizeEventAlerts(data?.[POP_EVENT_ALERTS_FIELD]);

        setSavedEvents(nextSaved);
        setEventAlertSubscriptions(nextAlertSubscriptions);
        setEventAlerts(nextAlerts);

        setSavedEventsError("");
        setEventAlertsError("");

      },

      (error) => {

        console.error("Erro ao carregar eventos salvos:", error);

        setSavedEventsError("Nao foi possivel carregar seus eventos salvos no momento.");
        setEventAlertsError("Nao foi possivel carregar seus alertas de calendario no momento.");

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

  const handleToggleEventAlertSubscription = useCallback(
    async (eventItem) => {
      if (!firestoreUserId) {
        setEventAlertsError("Faca login para ativar avisos de calendario.");
        return;
      }

      const eventKey = resolveEventKey(eventItem);
      if (!eventKey) {
        setEventAlertsError("Nao foi possivel identificar o evento para criar o aviso.");
        return;
      }

      const nextSnapshot = createEventAlertSubscriptionSnapshot({
        ...eventItem,
        eventKey,
        subscribedAt: new Date().toISOString(),
      });

      if (!nextSnapshot.startDate) {
        setEventAlertsError("Esse evento ainda nao possui data valida para alerta.");
        return;
      }

      const wasSubscribed = eventAlertSubscriptions.some((entry) => entry.eventKey === eventKey);
      const nextSubscriptions = wasSubscribed
        ? eventAlertSubscriptions.filter((entry) => entry.eventKey !== eventKey)
        : normalizeEventAlertSubscriptions([nextSnapshot, ...eventAlertSubscriptions]).slice(
          0,
          MAX_POP_EVENT_ALERT_SUBSCRIPTIONS,
        );
      const previousSubscriptions = eventAlertSubscriptions;

      setPendingAlertEventKey(eventKey);
      setEventAlertSubscriptions(nextSubscriptions);

      try {
        await setDoc(
          doc(db, "usuarios", firestoreUserId),
          {
            [POP_EVENT_ALERT_SUBSCRIPTIONS_FIELD]: nextSubscriptions,
            [POP_EVENT_ALERT_SUBSCRIPTIONS_COUNT_FIELD]: nextSubscriptions.length,
          },
          { merge: true },
        );

        setEventAlertsError("");
      } catch (error) {
        console.error("Erro ao atualizar inscricoes de alerta POP:", error);
        setEventAlertSubscriptions(previousSubscriptions);
        setEventAlertsError("Nao foi possivel atualizar o aviso deste evento.");
      } finally {
        setPendingAlertEventKey("");
      }
    },
    [eventAlertSubscriptions, firestoreUserId],
  );

  const handleRunAlertSweep = useCallback(async () => {
    if (!firestoreUserId) {
      setEventAlertsError("Faca login para rodar a verificacao de avisos.");
      return;
    }

    setIsRunningAlertSweep(true);
    setEventAlertsError("");

    try {
      const summary = await runPopEventosAlertSweep({ userId: firestoreUserId });
      setAlertSweepNotice(
        `Verificacao concluida: ${Number(summary?.alertsCreated || 0)} novo(s) aviso(s) criado(s).`,
      );
    } catch (error) {
      setEventAlertsError(
        String(error?.message || "Nao foi possivel executar a verificacao de avisos agora."),
      );
    } finally {
      setIsRunningAlertSweep(false);
    }
  }, [firestoreUserId]);



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

  const womenEventsCount = useMemo(
    () => visibleEvents.filter((entry) => resolveWomenProtagonism(entry)).length,
    [visibleEvents],
  );

  const eventAlertSubscriptionKeySet = useMemo(
    () => new Set(eventAlertSubscriptions.map((entry) => entry.eventKey)),
    [eventAlertSubscriptions],
  );

  const calendarMonthLabel = useMemo(
    () => formatCalendarMonthLabel(calendarCursorDate),
    [calendarCursorDate],
  );

  const calendarMonthKey = useMemo(() => toMonthKey(calendarCursorDate), [calendarCursorDate]);

  const calendarGridCells = useMemo(
    () => buildMonthCalendarGrid(calendarCursorDate),
    [calendarCursorDate],
  );

  const calendarEventsByDate = useMemo(() => {
    const grouped = new Map();

    normalizeRadarEvents(events).forEach((eventEntry) => {
      const isoDate = toIsoDateOnly(eventEntry?.startDate);
      if (!isoDate) return;

      const existing = grouped.get(isoDate) || [];
      existing.push(eventEntry);
      grouped.set(isoDate, existing);
    });

    grouped.forEach((groupEntries, isoDate) => {
      grouped.set(
        isoDate,
        [...groupEntries].sort((left, right) => {
          const leftTitle = String(left?.title || "");
          const rightTitle = String(right?.title || "");
          return leftTitle.localeCompare(rightTitle, "pt-BR");
        }),
      );
    });

    return grouped;
  }, [events]);

  const calendarMonthEventDateKeys = useMemo(
    () =>
      [...calendarEventsByDate.keys()]
        .filter((isoDate) => isoDate.startsWith(`${calendarMonthKey}-`))
        .sort(),
    [calendarEventsByDate, calendarMonthKey],
  );

  const selectedCalendarEvents = useMemo(
    () => calendarEventsByDate.get(selectedCalendarDate) || [],
    [calendarEventsByDate, selectedCalendarDate],
  );

  const unreadCalendarAlerts = useMemo(
    () => eventAlerts.filter((entry) => !entry.read).slice(0, 5),
    [eventAlerts],
  );

  const alertCarouselSubscriptions = useMemo(
    () => eventAlertSubscriptions.slice(0, 8),
    [eventAlertSubscriptions],
  );

  const eventImageByEventKey = useMemo(() => {
    const imageMap = new Map();

    [...normalizeRadarEvents(events), ...normalizeRadarEvents(savedEvents)].forEach((entry) => {
      const entryKey = resolveEventKey(entry);
      if (!entryKey || imageMap.has(entryKey)) return;

      const firstImage = resolveEventImageUrls(entry)[0] || "";
      if (!firstImage) return;
      imageMap.set(entryKey, firstImage);
    });

    return imageMap;
  }, [events, savedEvents]);

  const handleGoToPreviousMonth = useCallback(() => {
    setCalendarCursorDate(
      (previous) => new Date(previous.getFullYear(), previous.getMonth() - 1, 1),
    );
  }, []);

  const handleGoToNextMonth = useCallback(() => {
    setCalendarCursorDate(
      (previous) => new Date(previous.getFullYear(), previous.getMonth() + 1, 1),
    );
  }, []);

  const handleGoToCurrentMonth = useCallback(() => {
    const now = new Date();
    setCalendarCursorDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedCalendarDate(getTodayIsoDate());
  }, []);

  const handleAlertCarouselPrevious = useCallback(() => {
    setAlertCarouselIndex((previous) => {
      if (alertCarouselSubscriptions.length <= 0) return 0;
      if (previous <= 0) return alertCarouselSubscriptions.length - 1;
      return previous - 1;
    });
  }, [alertCarouselSubscriptions.length]);

  const handleAlertCarouselNext = useCallback(() => {
    setAlertCarouselIndex((previous) => {
      if (alertCarouselSubscriptions.length <= 0) return 0;
      return (previous + 1) % alertCarouselSubscriptions.length;
    });
  }, [alertCarouselSubscriptions.length]);

  useEffect(() => {
    if (selectedCalendarDate && selectedCalendarDate.startsWith(`${calendarMonthKey}-`)) {
      return;
    }

    if (calendarMonthEventDateKeys.length > 0) {
      setSelectedCalendarDate(calendarMonthEventDateKeys[0]);
      return;
    }

    setSelectedCalendarDate(`${calendarMonthKey}-01`);
  }, [calendarMonthEventDateKeys, calendarMonthKey, selectedCalendarDate]);

  useEffect(() => {
    if (alertCarouselSubscriptions.length <= 0) {
      if (alertCarouselIndex !== 0) setAlertCarouselIndex(0);
      return;
    }

    if (alertCarouselIndex >= alertCarouselSubscriptions.length) {
      setAlertCarouselIndex(alertCarouselSubscriptions.length - 1);
    }
  }, [alertCarouselIndex, alertCarouselSubscriptions]);

  useEffect(() => {

    if (currentPage > totalPages) {

      setCurrentPage(totalPages);

    }

  }, [currentPage, totalPages]);



  useEffect(() => {

    setCurrentPage(1);

    setExpandedDescriptionByEvent({});

    setExpandedDetailsByEvent({});

  }, [activeTab]);



  const handleToggleDescription = useCallback((eventKey) => {

    setExpandedDescriptionByEvent((previous) => ({

      ...previous,

      [eventKey]: !previous?.[eventKey],

    }));

  }, []);



  const handleToggleCardDetails = useCallback((eventKey) => {

    setExpandedDetailsByEvent((previous) => ({

      ...previous,

      [eventKey]: !previous?.[eventKey],

    }));

  }, []);



  return (

    <section className={sectionClassName} data-ui-style={normalizedStyleId}>
      <div className="pop-eventos-content ">

        <header className={heroClassName}>

          <div className="flex items-start justify-between gap-4">

            <div className="space-y-3.5">

              {/* WARNING */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3 text-amber-800 shadow-sm">
                <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Aviso de Desenvolvimento</p>
                  <p className="text-sm font-medium">O módulo ainda está em fase de testes. A ferramenta pode apresentar falhas ou resultados incompletos. Use com critério.</p>
                </div>
              </div>

              <h2 className="text-2xl font-black text-slate-900 sm:text-3xl lg:text-[2.05rem]">

                Radar GUIA de Eventos {TARGET_YEAR} para mentores e clubistas

              </h2>

              <p className="max-w-3xl text-sm font-bold leading-relaxed text-slate-700 sm:text-base">

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

                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-600">

                    Assistente de curadoria

                  </p>

                  <p className="text-sm font-black uppercase tracking-wide text-slate-900">

                    GUIA

                  </p>

                </div>

              </div>



              <div className="grid grid-cols-2 gap-2 text-xs font-black uppercase tracking-wide text-slate-900 sm:grid-cols-1 sm:text-right">

                <span className={statBadgeClassName}>

                  Eventos: {scanEventsCount}

                </span>

                <span className={statBadgeClassName}>

                  Salvos: {savedEventsCount}

                </span>

                {formattedGeneratedAt ? (

                  <span className={statBadgeClassName}>

                    Atualizado: {formattedGeneratedAt}

                  </span>

                ) : null}
                {isBackgroundRefreshing ? (
                  <span className={statBadgeClassName}>
                    <RefreshCcw className="mr-1 inline h-3 w-3 animate-spin" />
                    Sincronizando radar
                  </span>
                ) : null}

              </div>

            </div>

          </div>

        </header>

        {errorMessage ? (
          <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {errorMessage}
          </div>
        ) : null}
        {savedEventsError ? (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
            {savedEventsError}
          </div>
        ) : null}
        {eventAlertsError ? (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
            {eventAlertsError}
          </div>
        ) : null}
        {backgroundRefreshNotice ? (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
            {backgroundRefreshNotice}
          </div>
        ) : null}
        {alertSweepNotice ? (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
            {alertSweepNotice}
          </div>
        ) : null}
        {/* TABS (Segmented Control Premium) */}
        <div className="flex justify-center mb-8 relative z-20">
          <div className="inline-flex bg-slate-200/50 backdrop-blur-sm p-1.5 rounded-2xl shadow-inner border border-slate-200/50">
            <button
              onClick={() => setActiveTab("radar")}
              className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === "radar" ? "bg-white text-indigo-700 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.2)]" : "text-slate-500 hover:text-slate-800"
                }`}
            >
              <Zap className={`w-4 h-4 ${activeTab === "radar" ? "text-indigo-500" : "text-slate-400"}`} />
              Descobertas
            </button>
            <button
              onClick={() => setActiveTab("saved")}
              className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === "saved" ? "bg-white text-indigo-700 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.2)]" : "text-slate-500 hover:text-slate-800"
                }`}
            >
              <Bookmark className={`w-4 h-4 ${activeTab === "saved" ? "text-indigo-500" : "text-slate-400"}`} />
              Minha Coleção
              {savedEvents.length > 0 && (
                <span className="bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-md text-[10px] ml-1">{savedEvents.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === "calendar" ? "bg-white text-indigo-700 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.2)]" : "text-slate-500 hover:text-slate-800"
                }`}
            >
              <CalendarDays className={`w-4 h-4 ${activeTab === "calendar" ? "text-indigo-500" : "text-slate-400"}`} />
              Calendario
              {eventAlertSubscriptions.length > 0 && (
                <span className="bg-emerald-100 text-emerald-700 py-0.5 px-2 rounded-md text-[10px] ml-1">
                  {eventAlertSubscriptions.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* FILTER PANEL */}
        {activeTab === "radar" && (
          <form onSubmit={handleSubmit} className="bg-white rounded-[1.5rem] p-6 mb-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 transition-all">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative flex-grow w-full group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                <input
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="Ex: Inteligência Artificial, FAPESB, Liderança..."
                  className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm rounded-2xl focus:ring-2 focus:ring-indigo-500 block pl-12 p-4 transition-all font-medium placeholder:text-slate-400"
                />
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="flex-1 sm:flex-none px-5 py-4 bg-white ring-1 ring-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition-all"
                >
                  Refinar
                  {showAdvancedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 sm:flex-none px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:from-slate-400 disabled:to-slate-400 text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 active:translate-y-0"
                >
                  {isLoading ? <><LoaderCircle className="w-4 h-4 animate-spin" /> Processando</> : <><Filter className="w-4 h-4" /> Buscar</>}
                </button>
              </div>
            </div>

            {showAdvancedFilters && (
              <div className="grid sm:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">Intensidade da Busca</label>
                  <select value={scanMode} onChange={(e) => setScanMode(e.target.value)} className="w-full bg-slate-50 ring-1 ring-slate-200 border-0 text-slate-700 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 p-3 font-medium cursor-pointer">
                    {MODE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">Filtrar por Trilha</label>
                  <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="w-full bg-slate-50 ring-1 ring-slate-200 border-0 text-slate-700 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 p-3 font-medium cursor-pointer">
                    {GROUP_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>
            )}
          </form>
        )}

        {activeTab === "calendar" ? (
          <div className="mb-8 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Calendario POP
                  </p>
                  <h3 className="text-xl font-black capitalize text-slate-900 sm:text-2xl">
                    {calendarMonthLabel}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGoToPreviousMonth}
                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:border-indigo-200 hover:text-indigo-600"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleGoToCurrentMonth}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-700 transition-colors hover:border-indigo-200 hover:text-indigo-600"
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={handleGoToNextMonth}
                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:border-indigo-200 hover:text-indigo-600"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mb-2 grid grid-cols-7 gap-2">
                {CALENDAR_WEEKDAY_LABELS.map((label) => (
                  <span
                    key={`weekday-${label}`}
                    className="text-center text-[11px] font-black uppercase tracking-[0.12em] text-slate-400"
                  >
                    {label}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarGridCells.map((calendarDay) => {
                  const dayEvents = calendarEventsByDate.get(calendarDay.isoDate) || [];
                  const eventsCount = dayEvents.length;
                  const isCurrentMonthDay = calendarDay.inCurrentMonth;
                  const isSelectedDay = selectedCalendarDate === calendarDay.isoDate;
                  const isToday = calendarDay.isoDate === todayIsoDate;

                  return (
                    <button
                      key={`calendar-day-${calendarDay.isoDate}`}
                      type="button"
                      onClick={() => setSelectedCalendarDate(calendarDay.isoDate)}
                      className={`group flex min-h-[86px] flex-col justify-between rounded-2xl border px-2.5 py-2 text-left transition-all ${isSelectedDay
                          ? "border-indigo-400 bg-indigo-50 shadow-[0_10px_24px_-18px_rgba(79,70,229,0.8)]"
                          : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40"
                        } ${!isCurrentMonthDay ? "opacity-45" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-sm font-black ${isToday ? "text-indigo-700" : "text-slate-800"}`}>
                          {calendarDay.dayNumber}
                        </span>
                        {eventsCount > 0 ? (
                          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">
                            {eventsCount}
                          </span>
                        ) : null}
                      </div>

                      {eventsCount > 0 ? (
                        <p className="line-clamp-2 text-[10px] font-bold leading-tight text-slate-600">
                          {dayEvents[0]?.title || "Evento"}
                        </p>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300">Sem eventos</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <aside className="space-y-5">
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Avisos do gestor
                </p>
                <h3 className="mt-1 text-base font-black text-slate-900">
                  {selectedCalendarDate
                    ? `Eventos em ${formatIsoDate(selectedCalendarDate)}`
                    : "Selecione um dia"}
                </h3>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Ative aviso apenas para os eventos que voce quer acompanhar.
                </p>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleRunAlertSweep}
                    disabled={!firestoreUserId || isRunningAlertSweep || eventAlertSubscriptions.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isRunningAlertSweep ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                    Verificar avisos agora
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {selectedCalendarEvents.length > 0 ? (
                    selectedCalendarEvents.map((eventEntry) => {
                      const eventKey = resolveEventKey(eventEntry);
                      const isAlertEnabled = eventAlertSubscriptionKeySet.has(eventKey);
                      const isPendingAlert = pendingAlertEventKey === eventKey;

                      return (
                        <article
                          key={`calendar-event-${eventKey}`}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                        >
                          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                            {eventEntry?.sourceName || "Fonte oficial"}
                          </p>
                          <h4 className="mt-1 text-sm font-black text-slate-900">
                            {eventEntry?.title || "Evento sem titulo"}
                          </h4>

                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleEventAlertSubscription(eventEntry)}
                              disabled={!firestoreUserId || isPendingAlert}
                              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] transition-colors ${isAlertEnabled
                                  ? "border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                  : "border-indigo-300 bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              {isAlertEnabled ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                              {isPendingAlert ? "Salvando..." : isAlertEnabled ? "Aviso ativo" : "Ativar aviso"}
                            </button>

                            {eventEntry?.url || eventEntry?.sourceUrl ? (
                              <a
                                href={normalizeHttpUrl(eventEntry?.url || eventEntry?.sourceUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.08em] text-slate-600 underline decoration-2"
                              >
                                Abrir <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            ) : null}
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-bold text-slate-500">
                      Sem eventos neste dia. Clique em outro dia do calendario.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Avisos recentes
                </p>
                <div className="mt-3 space-y-2.5">
                  {unreadCalendarAlerts.length > 0 ? (
                    unreadCalendarAlerts.map((alertEntry) => (
                      <div
                        key={`calendar-alert-${alertEntry.id}`}
                        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3"
                      >
                        <p className="text-xs font-black text-emerald-800">
                          {alertEntry.message || alertEntry.title}
                        </p>
                        <p className="mt-1 text-[11px] font-bold text-emerald-700">
                          {formatSavedAt(alertEntry.createdAt)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-500">
                      Ainda nao ha avisos gerados para seus eventos monitorados.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Eventos salvos para alerta
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {eventAlertSubscriptions.length} evento(s) monitorado(s) no seu perfil.
                </p>

                <div className="mt-3">
                  {alertCarouselSubscriptions.length > 0 ? (
                    <>
                      <div className="relative h-[clamp(340px,48vw,430px)] overflow-x-hidden overflow-y-visible">
                        {alertCarouselSubscriptions.map((subscription, index) => {
                          const eventKey = resolveEventKey(subscription);
                          const isPendingAlert = pendingAlertEventKey === eventKey;
                          const hasCalendarDate = Boolean(subscription?.startDate);
                          const subscriptionImageUrl = resolveEventImageUrls(subscription)[0]
                            || eventImageByEventKey.get(eventKey)
                            || "";
                          const subscriptionEventUrl = normalizeHttpUrl(subscription?.url);
                          const totalCards = alertCarouselSubscriptions.length;
                          let offset = index - alertCarouselIndex;

                          if (offset > totalCards / 2) offset -= totalCards;
                          if (offset < -totalCards / 2) offset += totalCards;

                          const absOffset = Math.abs(offset);
                          const isActive = offset === 0;
                          const isVisible = absOffset <= 2;
                          const xOffsetPercent = offset === 0
                            ? 0
                            : offset === -1
                              ? -35
                              : offset === 1
                                ? 35
                                : offset === -2
                                  ? -52
                                  : offset === 2
                                    ? 52
                                    : 0;
                          const scaleValue = absOffset === 0 ? 1 : absOffset === 1 ? 0.95 : 0.9;
                          const opacityValue = absOffset === 0 ? 1 : absOffset === 1 ? 0.6 : absOffset === 2 ? 0.25 : 0;
                          const cardTransform = `translateX(calc(-50% + ${xOffsetPercent}%)) scale(${scaleValue})`;
                          const depthClass = absOffset === 0 ? "z-30" : absOffset === 1 ? "z-20" : "z-10";

                          return (
                            <article
                              key={`calendar-saved-alert-${eventKey}`}
                              className={`absolute left-1/2 top-0 w-[84%] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-400 ${depthClass} ${isVisible ? "" : "pointer-events-none"} ${isActive ? "" : "pointer-events-none"}`}
                              style={{
                                transform: cardTransform,
                                opacity: opacityValue,
                              }}
                            >
                              <div className="relative">
                                <div className="relative aspect-[16/10] overflow-hidden">
                                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white">
                                    <div className="text-center">
                                      <Sparkles className="mx-auto mb-1.5 h-5 w-5 opacity-80" />
                                      <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-80">
                                        Sem imagem
                                      </p>
                                    </div>
                                  </div>
                                  {subscriptionImageUrl ? (
                                    <img
                                      src={subscriptionImageUrl}
                                      alt={subscription?.title || "Imagem do evento"}
                                      className="relative z-10 h-full w-full object-cover"
                                      loading="lazy"
                                      onError={(imageEvent) => {
                                        imageEvent.currentTarget.style.display = "none";
                                      }}
                                    />
                                  ) : null}
                                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-900/10 to-transparent" />
                                </div>

                                <div className="absolute left-3 top-3 z-20">
                                  <span className="rounded-full border border-white/35 bg-slate-900/65 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white backdrop-blur">
                                    {subscription?.sourceGroupLabel || "Fonte"}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-2.5 p-3">
                                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                                  {formatIsoDate(subscription?.startDate) || "Data a confirmar"}
                                </p>
                                <h4 className="line-clamp-2 text-sm font-black text-slate-900">
                                  {subscription?.title || "Evento"}
                                </h4>
                                <p className="text-[11px] font-bold text-slate-500">
                                  {subscription?.sourceName || "Fonte oficial"}
                                </p>

                                {isActive ? (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleEventAlertSubscription(subscription)}
                                      disabled={!firestoreUserId || isPendingAlert}
                                      className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {isPendingAlert ? "Salvando..." : "Remover aviso"}
                                    </button>

                                    {hasCalendarDate ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const targetDate = new Date(`${subscription.startDate}T00:00:00`);
                                          if (!Number.isNaN(targetDate.getTime())) {
                                            setCalendarCursorDate(
                                              new Date(targetDate.getFullYear(), targetDate.getMonth(), 1),
                                            );
                                            setSelectedCalendarDate(subscription.startDate);
                                          }
                                        }}
                                        className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-indigo-700 transition-colors hover:bg-indigo-100"
                                      >
                                        Ir para data
                                      </button>
                                    ) : null}

                                    {subscriptionEventUrl ? (
                                      <a
                                        href={subscriptionEventUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-indigo-600"
                                      >
                                        Acessar <ExternalLink className="h-3 w-3" />
                                      </a>
                                    ) : (
                                      <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">
                                        Sem link
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="h-7 rounded-xl bg-slate-200/60" />
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={handleAlertCarouselPrevious}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-700 transition-colors hover:border-indigo-200 hover:text-indigo-700"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          Anterior
                        </button>

                        <div className="flex items-center gap-1.5">
                          {alertCarouselSubscriptions.map((subscription, index) => {
                            const eventKey = resolveEventKey(subscription);
                            const isActiveDot = index === alertCarouselIndex;

                            return (
                              <button
                                key={`alert-carousel-dot-${eventKey}`}
                                type="button"
                                onClick={() => setAlertCarouselIndex(index)}
                                className={`h-2.5 w-2.5 rounded-full transition-all ${isActiveDot ? "bg-indigo-600" : "bg-slate-300 hover:bg-slate-400"}`}
                                aria-label={`Ir para evento ${index + 1}`}
                              />
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={handleAlertCarouselNext}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-700 transition-colors hover:border-indigo-200 hover:text-indigo-700"
                        >
                          Proximo
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <p className="mt-2 text-center text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                        Evento {Math.min(alertCarouselIndex + 1, alertCarouselSubscriptions.length)} de {alertCarouselSubscriptions.length}
                      </p>
                    </>
                  ) : (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-500">
                      Voce ainda nao salvou eventos para receber alerta.
                    </p>
                  )}
                </div>
              </div>
            </aside>
          </div>
        ) : null}

        {activeTab === "radar" || activeTab === "saved" ? (
          <>
        {womenEventsCount > 0 ? (
          <div className="mb-6 rounded-3xl border border-rose-200 bg-gradient-to-r from-rose-50 via-white to-fuchsia-50 px-5 py-4 shadow-[0_12px_30px_-24px_rgba(236,72,153,0.55)]">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-rose-200 bg-rose-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-rose-700">
                Elas em foco
              </span>
              <p className="text-sm font-bold text-slate-700">
                {womenEventsCount} evento(s) com protagonismo feminino em destaque neste radar.
              </p>
            </div>
          </div>
        ) : null}

        {/* EVENT GRID */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
          {pagedEvents.map((event) => {
            const eventKey = resolveEventKey(event);
            const isSaved = savedEventKeySet.has(eventKey);
            const isWomenProtagonism = resolveWomenProtagonism(event);
            const identity = resolveEventIdentity(event);
            const descriptionData = summarizeDescription(event?.description || event?.pageTitle);
            const isDescExpanded = expandedDescriptionByEvent[eventKey];
            const primaryImageUrl = resolveEventImageUrls(event)[0] || "";

            return (
              <article
                key={eventKey}
                className={`group relative overflow-hidden rounded-[2rem] border bg-white shadow-[0_10px_28px_-20px_rgba(15,23,42,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-22px_rgba(15,23,42,0.35)] ${isWomenProtagonism
                    ? "border-rose-200 ring-1 ring-rose-100/80 shadow-[0_16px_44px_-24px_rgba(236,72,153,0.4)]"
                    : "border-slate-200"
                  }`}
              >
                {isWomenProtagonism ? (
                  <div className="absolute left-0 top-0 z-30 h-1.5 w-full bg-gradient-to-r from-rose-500 via-fuchsia-500 to-amber-400" />
                ) : null}

                <div className="relative">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white">
                      <div className="text-center">
                        <Sparkles className="mx-auto mb-2 h-6 w-6 opacity-80" />
                        <p className="text-xs font-black uppercase tracking-[0.2em] opacity-80">
                          Sem imagem oficial
                        </p>
                      </div>
                    </div>
                    {primaryImageUrl ? (
                      <img
                        src={primaryImageUrl}
                        alt={event?.title || "Imagem do evento"}
                        className="relative z-10 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                        onError={(imageEvent) => {
                          imageEvent.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-900/10 to-transparent" />
                  </div>

                  <div className="absolute left-4 top-4 z-20 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/30 bg-slate-900/65 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white backdrop-blur">
                      {event?.sourceGroupLabel || "Fonte"}
                    </span>
                    {isWomenProtagonism ? (
                      <span className="rounded-full border border-rose-200/60 bg-rose-500/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white backdrop-blur">
                        Elas em Foco
                      </span>
                    ) : null}
                  </div>

                  <div className="absolute bottom-4 left-4 z-20">
                    <span className="rounded-full border border-white/40 bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-800 backdrop-blur">
                      {identity.label}
                    </span>
                  </div>
                </div>

                <div className="relative flex flex-1 flex-col gap-4 p-6">
                  <div>
                    <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                      {event?.sourceName || "Fonte oficial"}
                    </p>
                    <h3
                      className={`text-xl font-black leading-snug text-slate-900 transition-colors ${isWomenProtagonism ? "group-hover:text-rose-700" : "group-hover:text-indigo-700"
                        }`}
                      title={event?.title}
                    >
                      {event?.title || "Evento sem titulo"}
                    </h3>
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-medium leading-relaxed text-slate-600">
                      {isDescExpanded ? descriptionData.full : descriptionData.preview}
                    </p>
                    {descriptionData.isTruncated ? (
                      <button
                        onClick={() => handleToggleDescription(eventKey)}
                        className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-indigo-600 transition-colors hover:text-indigo-800"
                      >
                        {isDescExpanded ? "Ocultar resumo" : "Ler resumo completo"}
                      </button>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                      <CalendarDays className="h-4 w-4 text-indigo-500" />
                    </div>
                    <span className="text-xs font-bold text-slate-600">
                      {formatIsoDate(event?.startDate) || event?.dateText || "Data flexivel ou nao informada"}
                    </span>
                    {isWomenProtagonism ? (
                      <span className="ml-auto rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rose-700">
                        Protagonismo feminino
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-auto flex items-center gap-3">
                    <button
                      onClick={() => handleToggleSavedEvent(event)}
                      disabled={pendingSaveEventKey === eventKey}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold transition-all duration-300 ${isSaved
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-indigo-700"
                        }`}
                    >
                      {isSaved ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                      {isSaved ? "Salvo" : "Salvar"}
                    </button>

                    {event?.url || event?.sourceUrl ? (
                      <a
                        href={normalizeHttpUrl(event?.url || event?.sourceUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold text-white shadow-md transition-colors ${isWomenProtagonism
                            ? "bg-gradient-to-r from-rose-600 to-fuchsia-600 hover:from-rose-700 hover:to-fuchsia-700"
                            : "bg-slate-900 hover:bg-indigo-600"
                          }`}
                      >
                        Acessar <ExternalLink className="h-4 w-4 opacity-80" />
                      </a>
                    ) : (
                      <span className="flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-400">
                        Sem link
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {!isLoading && pagedEvents.length === 0 ? (
            <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <p className="text-base font-black text-slate-700">Nenhum evento encontrado para esse filtro.</p>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Ajuste os termos da busca ou aguarde a proxima sincronizacao em segundo plano.
              </p>
            </div>
          ) : null}
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 p-5 bg-white rounded-3xl shadow-sm ring-1 ring-slate-200">
            <span className="text-sm font-bold text-slate-400 px-2">
              Página <span className="text-slate-800">{page}</span> de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-6 py-3 bg-white ring-1 ring-slate-200 text-slate-700 font-bold text-sm rounded-2xl hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-6 py-3 bg-white ring-1 ring-slate-200 text-slate-700 font-bold text-sm rounded-2xl hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
          </>
        ) : null}
      </div>
    </section>
  );
}



