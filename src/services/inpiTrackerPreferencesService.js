import { doc, getDoc, onSnapshot, runTransaction } from "firebase/firestore";

import { db } from "../../firebase";
import { fetchInpiProcessByNumber } from "./inpiProcessTrackingService";
import {
  INPI_TRACKER_FIELDS,
  countMonitoredSearches,
  createSearchIdentity,
  createStoredSearchFromResult,
  createTrackingAlert,
  normalizeStoredAlerts,
  normalizeStoredSearches,
  prependTrackingAlerts,
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
      manualSync: true,
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

async function processManualWatchEntry(entry) {
  const nowIso = new Date().toISOString();

  try {
    const result = await fetchInpiProcessByNumber(entry.processNumber, entry.sourceId);

    if (!result?.found) {
      return {
        changed: false,
        nextEntry: {
          ...entry,
          lastCheckedAt: nowIso,
          lastError: "A varredura manual não encontrou o processo nesta rodada.",
        },
        alert: null,
      };
    }

    const contentChanged =
      Boolean(entry.lastKnownContentHash) &&
      Boolean(result.contentHash) &&
      entry.lastKnownContentHash !== result.contentHash;
    const nextEntry = createStoredSearchFromResult(result, {
      previousEntry: entry,
      watchEnabled: entry.watchEnabled,
      changed: contentChanged,
      manualSync: true,
    });

    return {
      changed: contentChanged,
      nextEntry,
      alert: contentChanged ? createTrackingAlert(entry, nextEntry) : null,
    };
  } catch (error) {
    return {
      changed: false,
      nextEntry: {
        ...entry,
        lastCheckedAt: nowIso,
        lastError:
          error instanceof Error
            ? error.message
            : "Falha inesperada ao monitorar o processo.",
      },
      alert: null,
    };
  }
}

export async function executeManualInpiWatchForUser(userId) {
  const normalizedUserId = String(userId || "").trim();

  if (!normalizedUserId) {
    throw new Error("Usuário não identificado para executar a varredura manual.");
  }

  const userRef = getUserRef(normalizedUserId);
  const initialSnapshot = await getDoc(userRef);
  const initialData = initialSnapshot.data() || {};
  const savedSearches = normalizeStoredSearches(
    initialData[INPI_TRACKER_FIELDS.savedSearches],
  );
  const monitoredSearches = savedSearches.filter((entry) => entry.watchEnabled);
  const nowIso = new Date().toISOString();
  const summary = {
    scope: "user",
    targetUserId: normalizedUserId,
    processedUsers: monitoredSearches.length ? 1 : 0,
    processedSearches: 0,
    changedSearches: 0,
    alertsCreated: 0,
    skippedUsers: monitoredSearches.length ? 0 : 1,
  };

  if (!monitoredSearches.length) {
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(userRef);
      const data = snapshot.data() || {};
      const currentSavedSearches = normalizeStoredSearches(
        data[INPI_TRACKER_FIELDS.savedSearches],
      );

      transaction.set(
        userRef,
        {
          [INPI_TRACKER_FIELDS.monitoringCount]: countMonitoredSearches(currentSavedSearches),
          [INPI_TRACKER_FIELDS.lastWatchRunAt]: nowIso,
          [INPI_TRACKER_FIELDS.lastWatchSummary]:
            "Varredura manual concluída: nenhuma busca monitorada ativa.",
          [INPI_TRACKER_FIELDS.updatedAt]: nowIso,
        },
        { merge: true },
      );
    });

    return summary;
  }

  const outcomes = [];

  for (const monitoredEntry of monitoredSearches) {
    summary.processedSearches += 1;

    const outcome = await processManualWatchEntry(monitoredEntry);
    outcomes.push({
      identity: createSearchIdentity(monitoredEntry.processNumber, monitoredEntry.sourceId),
      ...outcome,
    });

    if (outcome.changed) {
      summary.changedSearches += 1;
    }

    if (outcome.alert) {
      summary.alertsCreated += 1;
    }
  }

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    const data = snapshot.data() || {};
    const currentSavedSearches = normalizeStoredSearches(
      data[INPI_TRACKER_FIELDS.savedSearches],
    );
    const currentAlerts = normalizeStoredAlerts(data[INPI_TRACKER_FIELDS.alerts]);
    const outcomesByIdentity = new Map(
      outcomes.map((outcome) => [outcome.identity, outcome]),
    );
    const nextSavedSearches = currentSavedSearches.map((entry) => {
      const identity = createSearchIdentity(entry.processNumber, entry.sourceId);
      return outcomesByIdentity.get(identity)?.nextEntry || entry;
    });

    transaction.set(
      userRef,
      {
        [INPI_TRACKER_FIELDS.savedSearches]: nextSavedSearches,
        [INPI_TRACKER_FIELDS.alerts]: prependTrackingAlerts(
          currentAlerts,
          outcomes.map((outcome) => outcome.alert).filter(Boolean),
        ),
        [INPI_TRACKER_FIELDS.monitoringCount]: countMonitoredSearches(nextSavedSearches),
        [INPI_TRACKER_FIELDS.lastWatchRunAt]: nowIso,
        [INPI_TRACKER_FIELDS.lastWatchSummary]: `Varredura manual concluída: ${summary.processedSearches} busca(s) verificadas e ${summary.alertsCreated} alerta(s) novo(s).`,
        [INPI_TRACKER_FIELDS.updatedAt]: nowIso,
      },
      { merge: true },
    );
  });

  return summary;
}
