import { getAdminDb } from "./firebaseAdminShared.js";

const POP_EVENT_ALERT_SUBSCRIPTIONS_FIELD = "pop_eventos_alert_subscriptions";
const POP_EVENT_ALERT_SUBSCRIPTIONS_COUNT_FIELD = "pop_eventos_alert_subscriptions_count";
const POP_EVENT_ALERTS_FIELD = "pop_eventos_alerts";
const POP_EVENT_ALERTS_LAST_RUN_AT_FIELD = "pop_eventos_alerts_last_run_at";
const POP_EVENT_ALERTS_LAST_SUMMARY_FIELD = "pop_eventos_alerts_last_summary";

const ALERT_MILESTONES_DAYS = [14, 7, 3, 1, 0];
const MAX_STORED_ALERTS = 120;
const MAX_STORED_SUBSCRIPTIONS = 120;
const DEFAULT_RUNTIME_BUDGET_MS = 25000;

export function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(payload),
  };
}

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizeHttpUrl(value = "") {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  return /^https?:\/\//i.test(normalized) ? normalized : "";
}

function resolveEventImageUrls(entry = {}) {
  if (Array.isArray(entry?.imageUrls)) {
    return entry.imageUrls
      .map((value) => normalizeText(value))
      .filter((value) => /^https?:\/\//i.test(value))
      .slice(0, 3);
  }

  const imageUrl = normalizeHttpUrl(entry?.imageUrl);
  return imageUrl ? [imageUrl] : [];
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

function resolveEventKey(entry = {}) {
  const directKey = normalizeText(entry?.eventKey || entry?.id);
  if (directKey) return directKey;

  const eventUrl = normalizeHttpUrl(entry?.url || entry?.sourceUrl);
  if (eventUrl) return eventUrl.toLowerCase();

  const sourceKey = normalizeText(entry?.sourceName || entry?.sourceGroupLabel || "fonte")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 40);
  const titleKey = normalizeText(entry?.title || "evento")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 80);

  return `${sourceKey || "fonte"}::${titleKey || "evento"}`;
}

function normalizeMilestones(values) {
  if (!Array.isArray(values)) return [];

  return [...new Set(
    values
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value >= 0 && value <= 60)
      .map((value) => Math.trunc(value)),
  )]
    .sort((a, b) => b - a);
}

function normalizeAlertSubscriptions(entries) {
  if (!Array.isArray(entries)) return [];

  const seenKeys = new Set();

  return entries
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const eventKey = resolveEventKey(entry);
      const startDate = toIsoDateOnly(entry?.startDate);

      return {
        eventKey,
        title: normalizeText(entry?.title || "Evento sem titulo").slice(0, 240),
        startDate,
        dateText: normalizeText(entry?.dateText).slice(0, 120),
        url: normalizeHttpUrl(entry?.url || entry?.sourceUrl),
        sourceName: normalizeText(entry?.sourceName || "Fonte oficial").slice(0, 120),
        sourceGroupLabel: normalizeText(entry?.sourceGroupLabel || "Fonte").slice(0, 120),
        imageUrls: resolveEventImageUrls(entry),
        womenProtagonism: Boolean(entry?.womenProtagonism),
        subscribedAt: normalizeText(entry?.subscribedAt),
        notifiedMilestones: normalizeMilestones(entry?.notifiedMilestones),
      };
    })
    .filter((entry) => {
      if (!entry?.eventKey || !entry?.startDate) return false;
      if (seenKeys.has(entry.eventKey)) return false;
      seenKeys.add(entry.eventKey);
      return true;
    })
    .slice(0, MAX_STORED_SUBSCRIPTIONS);
}

function toMillisSafe(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value?._seconds === "number") return value._seconds * 1000;
  const parsed = new Date(value);
  const ms = parsed.getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function normalizeStoredAlerts(entries) {
  if (!Array.isArray(entries)) return [];

  const seenIds = new Set();

  return entries
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const id = normalizeText(entry?.id);
      const createdAt = normalizeText(entry?.createdAt);

      return {
        id,
        type: normalizeText(entry?.type || "pop_evento_alerta"),
        eventKey: normalizeText(entry?.eventKey),
        title: normalizeText(entry?.title || "Evento"),
        startDate: toIsoDateOnly(entry?.startDate),
        url: normalizeHttpUrl(entry?.url),
        sourceName: normalizeText(entry?.sourceName),
        sourceGroupLabel: normalizeText(entry?.sourceGroupLabel),
        milestoneDays: Number(entry?.milestoneDays || 0),
        message: normalizeText(entry?.message),
        read: Boolean(entry?.read),
        createdAt,
        createdAtMs: toMillisSafe(createdAt),
      };
    })
    .filter((entry) => {
      if (!entry.id || seenIds.has(entry.id)) return false;
      seenIds.add(entry.id);
      return true;
    })
    .sort((left, right) => right.createdAtMs - left.createdAtMs)
    .slice(0, MAX_STORED_ALERTS);
}

function getTodayIsoDateUtc() {
  return new Date().toISOString().slice(0, 10);
}

function toUtcDayStartMs(isoDate) {
  const normalized = toIsoDateOnly(isoDate);
  if (!normalized) return 0;
  const [yearRaw, monthRaw, dayRaw] = normalized.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return 0;
  }
  return Date.UTC(year, month - 1, day);
}

function diffDaysBetweenIsoDates(fromIsoDate, toIsoDate) {
  const fromMs = toUtcDayStartMs(fromIsoDate);
  const toMs = toUtcDayStartMs(toIsoDate);
  if (!fromMs || !toMs) return Number.NaN;
  return Math.round((toMs - fromMs) / (24 * 60 * 60 * 1000));
}

function sanitizeIdChunk(value = "") {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function buildAlertId(subscription, milestoneDays, todayIsoDate) {
  const eventChunk = sanitizeIdChunk(subscription?.eventKey || subscription?.title || "evento");
  const dayChunk = sanitizeIdChunk(subscription?.startDate || "sem-data");
  return `pop-alert-${eventChunk}-${dayChunk}-${milestoneDays}-${todayIsoDate}`;
}

function buildAlertMessage(subscription, milestoneDays) {
  const title = normalizeText(subscription?.title || "Evento");
  const startDate = toIsoDateOnly(subscription?.startDate);

  if (milestoneDays === 0) {
    return `Hoje e o dia de "${title}" (${startDate}).`;
  }

  if (milestoneDays === 1) {
    return `Falta 1 dia para "${title}" (${startDate}).`;
  }

  return `Faltam ${milestoneDays} dias para "${title}" (${startDate}).`;
}

function mergeAlerts(newAlerts = [], existingAlerts = []) {
  const normalizedExisting = normalizeStoredAlerts(existingAlerts);
  const normalizedNew = normalizeStoredAlerts(newAlerts);
  const seen = new Set();
  const merged = [];

  [...normalizedNew, ...normalizedExisting].forEach((entry) => {
    if (!entry?.id || seen.has(entry.id)) return;
    seen.add(entry.id);
    merged.push(entry);
  });

  return merged
    .sort((left, right) => right.createdAtMs - left.createdAtMs)
    .slice(0, MAX_STORED_ALERTS);
}

function resolveRuntimeBudgetMs(targetUserId = "") {
  if (targetUserId) return Number.POSITIVE_INFINITY;

  const configured = Number(process.env.POP_EVENTOS_ALERTS_MAX_RUNTIME_MS || "");
  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }

  return DEFAULT_RUNTIME_BUDGET_MS;
}

async function getUserDocsToProcess(db, targetUserId = "") {
  const normalizedUserId = normalizeText(targetUserId);

  if (normalizedUserId) {
    const userDoc = await db.collection("usuarios").doc(normalizedUserId).get();
    if (!userDoc.exists) return [];
    return [userDoc];
  }

  const snapshot = await db
    .collection("usuarios")
    .where(POP_EVENT_ALERT_SUBSCRIPTIONS_COUNT_FIELD, ">", 0)
    .get();

  return snapshot.docs;
}

function buildRunSummaryMessage(newAlerts = []) {
  const total = Array.isArray(newAlerts) ? newAlerts.length : 0;
  if (!total) {
    return "Varredura de alertas POP concluida sem novos avisos.";
  }

  return `Varredura de alertas POP concluiu ${total} novo(s) aviso(s).`;
}

export async function runPopEventosAlertsJob(options = {}) {
  const targetUserId = normalizeText(options?.targetUserId);
  const db = getAdminDb();
  const startedAtMs = Date.now();
  const todayIsoDate = getTodayIsoDateUtc();
  const runtimeBudgetMs = resolveRuntimeBudgetMs(targetUserId);
  const summary = {
    scope: targetUserId ? "user" : "all",
    targetUserId,
    processedUsers: 0,
    processedSubscriptions: 0,
    alertsCreated: 0,
    skippedUsers: 0,
    interrupted: false,
  };
  const userDocs = await getUserDocsToProcess(db, targetUserId);

  if (targetUserId && userDocs.length === 0) {
    summary.skippedUsers = 1;
    return summary;
  }

  let inspectedUsers = 0;

  for (const userDoc of userDocs) {
    if (Date.now() - startedAtMs >= runtimeBudgetMs) {
      summary.interrupted = true;
      break;
    }

    inspectedUsers += 1;
    const userData = userDoc.data() || {};
    const subscriptions = normalizeAlertSubscriptions(userData?.[POP_EVENT_ALERT_SUBSCRIPTIONS_FIELD]);
    if (!subscriptions.length) {
      summary.skippedUsers += 1;
      continue;
    }

    summary.processedUsers += 1;
    summary.processedSubscriptions += subscriptions.length;

    const existingAlerts = normalizeStoredAlerts(userData?.[POP_EVENT_ALERTS_FIELD]);
    const newAlerts = [];
    const nowIso = new Date().toISOString();

    const nextSubscriptions = subscriptions.map((subscription) => {
      const daysUntilEvent = diffDaysBetweenIsoDates(todayIsoDate, subscription.startDate);

      if (!Number.isFinite(daysUntilEvent)) {
        return subscription;
      }

      if (!ALERT_MILESTONES_DAYS.includes(daysUntilEvent)) {
        return subscription;
      }

      const previousMilestones = normalizeMilestones(subscription.notifiedMilestones);
      if (previousMilestones.includes(daysUntilEvent)) {
        return subscription;
      }

      const nextMilestones = normalizeMilestones([...previousMilestones, daysUntilEvent]);
      const alertId = buildAlertId(subscription, daysUntilEvent, todayIsoDate);
      newAlerts.push({
        id: alertId,
        type: "pop_evento_alerta",
        eventKey: subscription.eventKey,
        title: subscription.title,
        startDate: subscription.startDate,
        url: subscription.url,
        sourceName: subscription.sourceName,
        sourceGroupLabel: subscription.sourceGroupLabel,
        milestoneDays: daysUntilEvent,
        message: buildAlertMessage(subscription, daysUntilEvent),
        read: false,
        createdAt: nowIso,
      });

      return {
        ...subscription,
        notifiedMilestones: nextMilestones,
      };
    });

    summary.alertsCreated += newAlerts.length;

    await userDoc.ref.set(
      {
        [POP_EVENT_ALERT_SUBSCRIPTIONS_FIELD]: nextSubscriptions,
        [POP_EVENT_ALERT_SUBSCRIPTIONS_COUNT_FIELD]: nextSubscriptions.length,
        [POP_EVENT_ALERTS_FIELD]: mergeAlerts(newAlerts, existingAlerts),
        [POP_EVENT_ALERTS_LAST_RUN_AT_FIELD]: nowIso,
        [POP_EVENT_ALERTS_LAST_SUMMARY_FIELD]: buildRunSummaryMessage(newAlerts),
      },
      { merge: true },
    );
  }

  if (summary.interrupted) {
    summary.remainingUsers = Math.max(userDocs.length - inspectedUsers, 0);
    summary.interruptedReason =
      "Execucao interrompida para respeitar o limite de tempo do agendamento.";
  }

  summary.elapsedMs = Date.now() - startedAtMs;
  return summary;
}
