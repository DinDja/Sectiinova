import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

function getServiceAccount() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const rawBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (rawJson) {
    const parsed = JSON.parse(rawJson);
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  }

  if (rawBase64) {
    const parsed = JSON.parse(Buffer.from(rawBase64, "base64").toString("utf8"));
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Configure FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_BASE64 ou as variáveis FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL e FIREBASE_ADMIN_PRIVATE_KEY na Netlify.",
    );
  }

  return {
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey.replace(/\\n/g, "\n"),
  };
}

function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert(getServiceAccount()),
    });
  }

  return getFirestore();
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

export async function runWatchJob(options = {}) {
  const targetUserId = String(options.targetUserId || "").trim();
  const db = getAdminDb();
  const summary = {
    scope: targetUserId ? "user" : "all",
    targetUserId,
    processedUsers: 0,
    processedSearches: 0,
    changedSearches: 0,
    alertsCreated: 0,
    skippedUsers: 0,
  };

  const userDocs = await getUserDocsToProcess(db, targetUserId);

  if (targetUserId && !userDocs.length) {
    summary.skippedUsers = 1;
    return summary;
  }

  for (const userDoc of userDocs) {
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
        [INPI_TRACKER_FIELDS.lastWatchSummary]: `Verificação concluída: ${nextAlerts.length} alerta(s) novo(s).`,
      },
      { merge: true },
    );
  }

  return summary;
}