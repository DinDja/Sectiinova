export const MAX_INPI_SAVED_SEARCHES = 20;
export const MAX_INPI_TRACKING_ALERTS = 20;

export const INPI_TRACKER_FIELDS = {
  savedSearches: "inpi_saved_searches",
  alerts: "inpi_tracking_alerts",
  monitoringCount: "inpi_tracking_monitoring_count",
  updatedAt: "inpi_tracking_updated_at",
  lastWatchRunAt: "inpi_tracking_last_watch_run_at",
  lastWatchSummary: "inpi_tracking_last_watch_summary",
};

function normalizeText(value = "") {
  return String(value || "").trim();
}

export function createSearchIdentity(processNumber, sourceId) {
  const normalizedNumber = normalizeText(processNumber)
    .toUpperCase()
    .replace(/\s+/g, "");
  const normalizedSource = normalizeText(sourceId) || "automatico";
  return `${normalizedSource}::${normalizedNumber}`;
}

export function normalizeStoredSearches(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      processNumber: normalizeText(entry.processNumber),
      sourceId: normalizeText(entry.sourceId) || "automatico",
      sourceLabel: normalizeText(entry.sourceLabel) || "INPI",
      title: normalizeText(entry.title),
      statusLabel: normalizeText(entry.statusLabel),
      statusTone: normalizeText(entry.statusTone) || "slate",
      officialSearchUrl: normalizeText(entry.officialSearchUrl),
      fetchedAt: normalizeText(entry.fetchedAt),
      updatedAt: normalizeText(entry.updatedAt),
      watchEnabled: Boolean(entry.watchEnabled),
      lastKnownContentHash: normalizeText(entry.lastKnownContentHash),
      lastKnownSnapshotKey: normalizeText(entry.lastKnownSnapshotKey),
      lastKnownStatusLabel: normalizeText(entry.lastKnownStatusLabel),
      lastKnownDispatchKey: normalizeText(entry.lastKnownDispatchKey),
      lastDispatchDescription: normalizeText(entry.lastDispatchDescription),
      lastDispatchDate: normalizeText(entry.lastDispatchDate),
      lastCheckedAt: normalizeText(entry.lastCheckedAt),
      lastChangedAt: normalizeText(entry.lastChangedAt),
      lastError: normalizeText(entry.lastError),
    }))
    .filter((entry) => entry.processNumber);
}

export function normalizeStoredAlerts(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      id: normalizeText(entry.id),
      processNumber: normalizeText(entry.processNumber),
      sourceId: normalizeText(entry.sourceId) || "automatico",
      sourceLabel: normalizeText(entry.sourceLabel) || "INPI",
      title: normalizeText(entry.title),
      detectedAt: normalizeText(entry.detectedAt),
      message: normalizeText(entry.message),
      officialSearchUrl: normalizeText(entry.officialSearchUrl),
      statusLabel: normalizeText(entry.statusLabel),
      statusTone: normalizeText(entry.statusTone) || "slate",
    }))
    .filter((entry) => entry.id && entry.processNumber);
}

export function buildResultSnapshotKey(result) {
  const latestDispatch = result?.latestDispatch || {};
  const statusLabel = normalizeText(result?.status?.label);
  const processNumber =
    normalizeText(result?.summary?.processNumber) || normalizeText(result?.query);
  const sourceId = normalizeText(result?.sourceId) || "automatico";
  const contentHash = normalizeText(result?.contentHash);

  return [
    sourceId,
    processNumber,
    contentHash,
    normalizeText(latestDispatch.rpiEdition),
    normalizeText(latestDispatch.rpiDate),
    normalizeText(latestDispatch.code),
    normalizeText(latestDispatch.description),
    normalizeText(latestDispatch.complement),
    statusLabel,
  ]
    .filter(Boolean)
    .join("|");
}

export function createStoredSearchFromResult(result, options = {}) {
  const nowIso = normalizeText(options.nowIso) || new Date().toISOString();
  const latestDispatch = result?.latestDispatch || {};
  const previousEntry = options.previousEntry || null;
  const processNumber =
    normalizeText(result?.summary?.processNumber) || normalizeText(result?.query);
  const sourceId = normalizeText(result?.sourceId) || "automatico";

  return {
    processNumber,
    sourceId,
    sourceLabel: normalizeText(result?.sourceLabel) || previousEntry?.sourceLabel || "INPI",
    title:
      normalizeText(result?.summary?.title) ||
      previousEntry?.title ||
      `Processo ${processNumber}`,
    statusLabel:
      normalizeText(result?.status?.label) || previousEntry?.statusLabel || "Acompanhando",
    statusTone:
      normalizeText(result?.status?.tone) || previousEntry?.statusTone || "slate",
    officialSearchUrl:
      normalizeText(result?.officialSearchUrl) || previousEntry?.officialSearchUrl,
    fetchedAt: normalizeText(result?.fetchedAt) || previousEntry?.fetchedAt || nowIso,
    updatedAt: nowIso,
    watchEnabled:
      typeof options.watchEnabled === "boolean"
        ? options.watchEnabled
        : Boolean(previousEntry?.watchEnabled),
    lastKnownContentHash:
      normalizeText(options.contentHash || result?.contentHash) ||
      previousEntry?.lastKnownContentHash ||
      "",
    lastKnownSnapshotKey:
      buildResultSnapshotKey(result) || previousEntry?.lastKnownSnapshotKey || "",
    lastKnownStatusLabel:
      normalizeText(result?.status?.label) || previousEntry?.lastKnownStatusLabel || "",
    lastKnownDispatchKey:
      [
        normalizeText(latestDispatch.rpiEdition),
        normalizeText(latestDispatch.rpiDate),
        normalizeText(latestDispatch.code),
        normalizeText(latestDispatch.description),
      ]
        .filter(Boolean)
        .join("|") || previousEntry?.lastKnownDispatchKey || "",
    lastDispatchDescription:
      normalizeText(latestDispatch.description) || previousEntry?.lastDispatchDescription || "",
    lastDispatchDate:
      normalizeText(latestDispatch.rpiDate) || previousEntry?.lastDispatchDate || "",
    lastCheckedAt: nowIso,
    lastChangedAt:
      options.changed === true
        ? nowIso
        : previousEntry?.lastChangedAt || previousEntry?.updatedAt || nowIso,
    lastError: normalizeText(options.lastError),
  };
}

export function upsertStoredSearch(entries, nextEntry) {
  const normalizedEntries = normalizeStoredSearches(entries);
  const nextIdentity = createSearchIdentity(nextEntry.processNumber, nextEntry.sourceId);

  return [nextEntry, ...normalizedEntries.filter(
    (entry) => createSearchIdentity(entry.processNumber, entry.sourceId) !== nextIdentity,
  )].slice(0, MAX_INPI_SAVED_SEARCHES);
}

export function removeStoredSearch(entries, processNumber, sourceId) {
  const identity = createSearchIdentity(processNumber, sourceId);
  return normalizeStoredSearches(entries).filter(
    (entry) => createSearchIdentity(entry.processNumber, entry.sourceId) !== identity,
  );
}

export function countMonitoredSearches(entries) {
  return normalizeStoredSearches(entries).filter((entry) => entry.watchEnabled).length;
}

export function createTrackingAlert(previousEntry, nextEntry) {
  const detectedAt = nextEntry?.lastCheckedAt || new Date().toISOString();
  const title = nextEntry?.title || previousEntry?.title || "Projeto monitorado";
  const processNumber = nextEntry?.processNumber || previousEntry?.processNumber || "";
  const sourceLabel = nextEntry?.sourceLabel || previousEntry?.sourceLabel || "INPI";
  const dispatchDescription =
    nextEntry?.lastDispatchDescription || previousEntry?.lastDispatchDescription || "";
  const statusLabel = nextEntry?.statusLabel || previousEntry?.statusLabel || "Atualizado";

  const message = dispatchDescription
    ? `Mudança detectada em ${sourceLabel}: ${dispatchDescription}.`
    : `Mudança detectada em ${sourceLabel} para o processo ${processNumber}.`;

  return {
    id: `${createSearchIdentity(processNumber, nextEntry?.sourceId || previousEntry?.sourceId)}::${Date.now()}`,
    processNumber,
    sourceId: nextEntry?.sourceId || previousEntry?.sourceId || "automatico",
    sourceLabel,
    title,
    detectedAt,
    message,
    officialSearchUrl: nextEntry?.officialSearchUrl || previousEntry?.officialSearchUrl || "",
    statusLabel,
    statusTone: nextEntry?.statusTone || previousEntry?.statusTone || "slate",
  };
}

export function prependTrackingAlerts(entries, nextAlerts) {
  const normalizedEntries = normalizeStoredAlerts(entries);
  const normalizedNextAlerts = normalizeStoredAlerts(nextAlerts);
  const seenIds = new Set();

  return [...normalizedNextAlerts, ...normalizedEntries]
    .filter((entry) => {
      if (seenIds.has(entry.id)) {
        return false;
      }

      seenIds.add(entry.id);
      return true;
    })
    .slice(0, MAX_INPI_TRACKING_ALERTS);
}