import { doc, onSnapshot, runTransaction } from "firebase/firestore";

import { db } from "../../firebase";
import {
  INPI_TRACKER_FIELDS,
  countMonitoredSearches,
  createSearchIdentity,
  createStoredSearchFromResult,
  normalizeStoredAlerts,
  normalizeStoredSearches,
  removeStoredSearch,
  upsertStoredSearch,
} from "./inpiTrackingShared";

function getUserRef(userId) {
  return doc(db, "usuarios", String(userId || "").trim());
}

export function subscribeToInpiTrackerState(userId, onData, onError) {
  const normalizedUserId = String(userId || "").trim();

  if (!normalizedUserId) {
    onData?.({
      savedSearches: [],
      alerts: [],
      lastWatchRunAt: "",
      lastWatchSummary: "",
    });
    return () => {};
  }

  return onSnapshot(
    getUserRef(normalizedUserId),
    (snapshot) => {
      const data = snapshot.data() || {};

      onData?.({
        savedSearches: normalizeStoredSearches(data[INPI_TRACKER_FIELDS.savedSearches]),
        alerts: normalizeStoredAlerts(data[INPI_TRACKER_FIELDS.alerts]),
        lastWatchRunAt: String(data[INPI_TRACKER_FIELDS.lastWatchRunAt] || ""),
        lastWatchSummary: String(data[INPI_TRACKER_FIELDS.lastWatchSummary] || ""),
      });
    },
    onError,
  );
}

export async function saveInpiSearch(userId, result, options = {}) {
  const normalizedUserId = String(userId || "").trim();

  if (!normalizedUserId) {
    throw new Error("Usuário não identificado para salvar a pesquisa.");
  }

  if (!result?.found) {
    throw new Error("Somente pesquisas encontradas podem ser salvas.");
  }

  return runTransaction(db, async (transaction) => {
    const userRef = getUserRef(normalizedUserId);
    const snapshot = await transaction.get(userRef);
    const data = snapshot.data() || {};
    const savedSearches = normalizeStoredSearches(
      data[INPI_TRACKER_FIELDS.savedSearches],
    );
    const identity = createSearchIdentity(
      result?.summary?.processNumber || result?.query,
      result?.sourceId,
    );
    const previousEntry =
      savedSearches.find(
        (entry) => createSearchIdentity(entry.processNumber, entry.sourceId) === identity,
      ) || null;
    const nextEntry = createStoredSearchFromResult(result, {
      previousEntry,
      watchEnabled:
        typeof options.watchEnabled === "boolean"
          ? options.watchEnabled
          : previousEntry?.watchEnabled,
    });
    const nextSavedSearches = upsertStoredSearch(savedSearches, nextEntry);

    transaction.set(
      userRef,
      {
        [INPI_TRACKER_FIELDS.savedSearches]: nextSavedSearches,
        [INPI_TRACKER_FIELDS.monitoringCount]: countMonitoredSearches(nextSavedSearches),
        [INPI_TRACKER_FIELDS.updatedAt]: new Date().toISOString(),
      },
      { merge: true },
    );

    return nextEntry;
  });
}

export async function setInpiSearchWatchEnabled(
  userId,
  processNumber,
  sourceId,
  watchEnabled,
) {
  const normalizedUserId = String(userId || "").trim();

  if (!normalizedUserId) {
    throw new Error("Usuário não identificado para atualizar o monitoramento.");
  }

  return runTransaction(db, async (transaction) => {
    const userRef = getUserRef(normalizedUserId);
    const snapshot = await transaction.get(userRef);
    const data = snapshot.data() || {};
    const savedSearches = normalizeStoredSearches(
      data[INPI_TRACKER_FIELDS.savedSearches],
    );
    const targetIdentity = createSearchIdentity(processNumber, sourceId);

    let found = false;
    const nextSavedSearches = savedSearches.map((entry) => {
      if (createSearchIdentity(entry.processNumber, entry.sourceId) !== targetIdentity) {
        return entry;
      }

      found = true;
      return {
        ...entry,
        watchEnabled: Boolean(watchEnabled),
        updatedAt: new Date().toISOString(),
        lastError: "",
      };
    });

    if (!found) {
      throw new Error("Pesquisa salva não encontrada para monitoramento.");
    }

    transaction.set(
      userRef,
      {
        [INPI_TRACKER_FIELDS.savedSearches]: nextSavedSearches,
        [INPI_TRACKER_FIELDS.monitoringCount]: countMonitoredSearches(nextSavedSearches),
        [INPI_TRACKER_FIELDS.updatedAt]: new Date().toISOString(),
      },
      { merge: true },
    );
  });
}

export async function removeInpiSearch(userId, processNumber, sourceId) {
  const normalizedUserId = String(userId || "").trim();

  if (!normalizedUserId) {
    throw new Error("Usuário não identificado para remover a pesquisa.");
  }

  return runTransaction(db, async (transaction) => {
    const userRef = getUserRef(normalizedUserId);
    const snapshot = await transaction.get(userRef);
    const data = snapshot.data() || {};
    const savedSearches = normalizeStoredSearches(
      data[INPI_TRACKER_FIELDS.savedSearches],
    );
    const nextSavedSearches = removeStoredSearch(savedSearches, processNumber, sourceId);

    transaction.set(
      userRef,
      {
        [INPI_TRACKER_FIELDS.savedSearches]: nextSavedSearches,
        [INPI_TRACKER_FIELDS.monitoringCount]: countMonitoredSearches(nextSavedSearches),
        [INPI_TRACKER_FIELDS.updatedAt]: new Date().toISOString(),
      },
      { merge: true },
    );
  });
}

export async function dismissInpiTrackingAlert(userId, alertId) {
  const normalizedUserId = String(userId || "").trim();

  if (!normalizedUserId) {
    throw new Error("Usuário não identificado para atualizar os alertas.");
  }

  return runTransaction(db, async (transaction) => {
    const userRef = getUserRef(normalizedUserId);
    const snapshot = await transaction.get(userRef);
    const data = snapshot.data() || {};
    const alerts = normalizeStoredAlerts(data[INPI_TRACKER_FIELDS.alerts]);
    const nextAlerts = alerts.filter((entry) => entry.id !== alertId);

    transaction.set(
      userRef,
      {
        [INPI_TRACKER_FIELDS.alerts]: nextAlerts,
        [INPI_TRACKER_FIELDS.updatedAt]: new Date().toISOString(),
      },
      { merge: true },
    );
  });
}