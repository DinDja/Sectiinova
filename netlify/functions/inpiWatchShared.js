import { getAdminDb } from "./firebaseAdminShared.js";

import { fetchInpiProcessFlow } from "../../scripts/inpiProcessProxy.js";
import {
  INPI_TRACKER_FIELDS,
  countMonitoredSearches,
  createStoredSearchFromResult,
  createTrackingAlert,
  normalizeStoredAlerts,
  normalizeStoredSearches,
  prependTrackingAlerts,
} from "../../src/services/inpiTrackingShared.js";

export function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  };
}

function buildWatchSummary(nextAlerts = []) {
  const total = Array.isArray(nextAlerts) ? nextAlerts.length : 0;

  if (!total) {
    return "Verificação concluída: nenhum alerta novo.";
  }

  const listedLabels = nextAlerts
    .slice(0, 3)
    .map((alert) => {
      const processNumber = String(alert?.processNumber || "").trim();
      const sourceLabel = String(alert?.sourceLabel || "").trim();

      if (processNumber && sourceLabel) {
        return `${processNumber} (${sourceLabel})`;
      }

      if (processNumber) {
        return processNumber;
      }

      return sourceLabel || "";
    })
    .filter(Boolean);

  if (!listedLabels.length) {
    return `Verificação concluída: ${total} alerta(s) novo(s).`;
  }

  const remaining = total - listedLabels.length;
  const remainingSuffix = remaining > 0 ? ` +${remaining} outro(s).` : ".";

  return `Verificação concluída: ${total} alerta(s) novo(s): ${listedLabels.join("; ")}${remainingSuffix}`;
}

async function processSavedSearch(entry) {
  const nowIso = new Date().toISOString();

  try {
    const result = await fetchInpiProcessFlow(entry.processNumber, entry.sourceId);

    if (!result?.found) {
      return {
        changed: false,
        nextEntry: {
          ...entry,
          lastCheckedAt: nowIso,
          lastError: "A verificação automática não encontrou o processo nesta rodada.",
        },
      };
    }

    const contentChanged =
      Boolean(entry.lastKnownContentHash) &&
      Boolean(result.contentHash) &&
      entry.lastKnownContentHash !== result.contentHash;
    const nextEntry = createStoredSearchFromResult(
      {
        found: true,
        query: entry.processNumber,
        sourceId: entry.sourceId,
        sourceLabel: entry.sourceLabel,
        officialSearchUrl: result.officialSearchUrl || entry.officialSearchUrl,
        fetchedAt: result.fetchedAt,
        contentHash: result.contentHash,
      },
      {
        previousEntry: entry,
        watchEnabled: entry.watchEnabled,
        changed: contentChanged,
        manualSync: false,
      },
    );

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
    };
  }
}

async function getUserDocsToProcess(db, targetUserId = "") {
  const normalizedUserId = String(targetUserId || "").trim();

  if (!normalizedUserId) {
    const userSnapshot = await db
      .collection("usuarios")
      .where(INPI_TRACKER_FIELDS.monitoringCount, ">", 0)
      .get();

    return userSnapshot.docs;
  }

  const userDoc = await db.collection("usuarios").doc(normalizedUserId).get();

  if (userDoc?.exists === false) {
    return [];
  }

  return userDoc ? [userDoc] : [];
}

function resolveRuntimeBudgetMs(targetUserId = "") {
  if (targetUserId) {
    return Number.POSITIVE_INFINITY;
  }

  const configuredValue = Number(process.env.INPI_WATCH_MAX_RUNTIME_MS || "");

  if (Number.isFinite(configuredValue) && configuredValue > 0) {
    return configuredValue;
  }

  return 25000;
}

export async function runWatchJob(options = {}) {
  const targetUserId = String(options.targetUserId || "").trim();
  const db = getAdminDb();
  const runStartedAtMs = Date.now();
  const runtimeBudgetMs = resolveRuntimeBudgetMs(targetUserId);
  const summary = {
    scope: targetUserId ? "user" : "all",
    targetUserId,
    processedUsers: 0,
    processedSearches: 0,
    changedSearches: 0,
    alertsCreated: 0,
    skippedUsers: 0,
  };
  let interrupted = false;
  let inspectedUserDocs = 0;

  const userDocs = await getUserDocsToProcess(db, targetUserId);

  if (targetUserId && !userDocs.length) {
    summary.skippedUsers = 1;
    return summary;
  }

  for (const userDoc of userDocs) {
    if (Date.now() - runStartedAtMs >= runtimeBudgetMs) {
      interrupted = true;
      break;
    }

    inspectedUserDocs += 1;
    const data = userDoc.data() || {};
    const savedSearches = normalizeStoredSearches(data[INPI_TRACKER_FIELDS.savedSearches]);
    const monitoredSearches = savedSearches.filter((entry) => entry.watchEnabled);

    if (!monitoredSearches.length) {
      summary.skippedUsers += 1;
      continue;
    }

    summary.processedUsers += 1;

    const nextAlerts = [];
    const nextSavedSearches = [...savedSearches];

    for (const monitoredEntry of monitoredSearches) {
      if (Date.now() - runStartedAtMs >= runtimeBudgetMs) {
        interrupted = true;
        break;
      }

      summary.processedSearches += 1;
      const outcome = await processSavedSearch(monitoredEntry);
      const index = nextSavedSearches.findIndex(
        (entry) =>
          entry.processNumber === monitoredEntry.processNumber &&
          entry.sourceId === monitoredEntry.sourceId,
      );

      if (index >= 0) {
        nextSavedSearches[index] = outcome.nextEntry;
      }

      if (outcome.changed) {
        summary.changedSearches += 1;
      }

      if (outcome.alert) {
        nextAlerts.push(outcome.alert);
      }
    }

    summary.alertsCreated += nextAlerts.length;

    await userDoc.ref.set(
      {
        [INPI_TRACKER_FIELDS.savedSearches]: nextSavedSearches,
        [INPI_TRACKER_FIELDS.alerts]: prependTrackingAlerts(
          normalizeStoredAlerts(data[INPI_TRACKER_FIELDS.alerts]),
          nextAlerts,
        ),
        [INPI_TRACKER_FIELDS.monitoringCount]: countMonitoredSearches(nextSavedSearches),
        [INPI_TRACKER_FIELDS.lastWatchRunAt]: new Date().toISOString(),
        [INPI_TRACKER_FIELDS.lastWatchSummary]: buildWatchSummary(nextAlerts),
      },
      { merge: true },
    );

    if (interrupted) {
      break;
    }
  }

  if (interrupted) {
    summary.interrupted = true;
    summary.interruptedReason =
      "Execução interrompida para respeitar o limite de tempo do agendamento.";
    summary.remainingUsers = Math.max(userDocs.length - inspectedUserDocs, 0);
  }

  return summary;
}
