import {
  fetchSecSchoolStaffFlow,
  validateSecTeacherByMatricula,
} from "../../scripts/secSchoolStaffProxy.js";
import { getAdminDb } from "./firebaseAdminShared.js";

const SEC_MATRICULA_GUARD_TIMEOUT_MS = (() => {
  const parsed = Number.parseInt(String(process.env.SEC_MATRICULA_GUARD_TIMEOUT_MS || "22000"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 22000;
})();
const SEC_MATRICULA_ATTEMPT_TIMEOUT_MS = (() => {
  const parsed = Number.parseInt(String(process.env.SEC_MATRICULA_ATTEMPT_TIMEOUT_MS || "12000"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 12000;
})();
const SEC_EXTERNAL_PROXY_URL = String(process.env.SEC_EXTERNAL_PROXY_URL || "").trim();
const SEC_EXTERNAL_PROXY_TOKEN = String(process.env.SEC_EXTERNAL_PROXY_TOKEN || "").trim();
const SEC_EXTERNAL_PROXY_TIMEOUT_MS = (() => {
  const parsed = Number.parseInt(String(process.env.SEC_EXTERNAL_PROXY_TIMEOUT_MS || "12000"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 12000;
})();
const SEC_STAFF_PERSISTENT_CACHE_COLLECTION = "sec_escola_staff_cache";
const SEC_STAFF_PERSISTENT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SEC_BACKGROUND_WARMUP_TRIGGER_TIMEOUT_MS = 1200;

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  };
}

function parseBody(event) {
  if (!event?.body) return {};

  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(String(event.body || ""), "base64").toString("utf8")
      : String(event.body || "");

    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getMergedPayload(event) {
  const queryPayload = event?.queryStringParameters || {};
  const bodyPayload = parseBody(event);
  return {
    ...queryPayload,
    ...bodyPayload,
  };
}

function hasMatricula(payload = {}) {
  return String(payload?.matricula || "").trim().length > 0;
}

function normalizeUrlBase(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, "");
  return `https://${raw.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

function buildWarmupPayload(payload = {}) {
  return {
    codigoMec: String(payload?.codigoMec || payload?.codigo_mec || "").trim(),
    codigoSec: String(payload?.codigoSec || payload?.codigo_sec || "").trim(),
    anexo: String(payload?.anexo || payload?.seq_anexo || "00").trim() || "00",
    nomeEscola: String(payload?.nomeEscola || payload?.nome_escola || "").trim(),
    municipio: String(payload?.municipio || "").trim(),
  };
}

function canTriggerWarmup(payload = {}) {
  const warmupPayload = buildWarmupPayload(payload);
  return Boolean(warmupPayload.codigoMec && warmupPayload.codigoSec);
}

async function triggerBackgroundWarmup(payload = {}, event = {}) {
  if (!canTriggerWarmup(payload)) {
    return false;
  }

  const headers = event?.headers || {};
  const rawUrl = String(event?.rawUrl || "").trim();
  let derivedFromRequest = "";

  if (rawUrl) {
    try {
      derivedFromRequest = new URL(rawUrl).origin;
    } catch {
      derivedFromRequest = "";
    }
  }

  if (!derivedFromRequest) {
    const proto = String(headers["x-forwarded-proto"] || headers["X-Forwarded-Proto"] || "https").trim() || "https";
    const host = String(
      headers["x-forwarded-host"]
      || headers["X-Forwarded-Host"]
      || headers.host
      || headers.Host
      || "",
    ).trim();

    if (host) {
      derivedFromRequest = `${proto}://${host}`;
    }
  }

  const siteBase =
    normalizeUrlBase(derivedFromRequest)
    ||
    normalizeUrlBase(process.env.URL)
    || normalizeUrlBase(process.env.DEPLOY_PRIME_URL)
    || normalizeUrlBase(process.env.DEPLOY_URL);

  if (!siteBase) {
    return false;
  }

  const endpoint = `${siteBase}/.netlify/functions/sec-escola-cache-warm-background`;
  const warmupPayload = buildWarmupPayload(payload);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, SEC_BACKGROUND_WARMUP_TRIGGER_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "x-sec-cache-warm-trigger": "1",
      },
      body: JSON.stringify(warmupPayload),
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeDigits(value) {
  return String(value || "").replace(/\D+/g, "");
}

function normalizeComparableText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function inferIsProfessor(staffRow = {}) {
  const combined = `${normalizeComparableText(staffRow?.cargo || "")} ${normalizeComparableText(staffRow?.funcao || "")}`.trim();
  if (!combined) return false;
  return combined.includes("PROFESSOR") || combined.includes("DOCENTE");
}

function buildCacheKeyFromPayload(payload = {}) {
  const codigoMec = String(payload?.codigoMec || payload?.codigo_mec || "").trim();
  const codigoSec = String(payload?.codigoSec || payload?.codigo_sec || "").trim();
  const anexo = String(payload?.anexo || payload?.seq_anexo || "00").trim() || "00";

  if (!codigoMec || !codigoSec) return "";

  return `${codigoMec}|${codigoSec}|${anexo}`;
}

function buildCacheKeyFromSchool(selectedSchool = {}) {
  const codigoMec = String(selectedSchool?.codigoMec || "").trim();
  const codigoSec = String(selectedSchool?.codigoSec || "").trim();
  const anexo = String(selectedSchool?.anexo || "00").trim() || "00";

  if (!codigoMec || !codigoSec) return "";

  return `${codigoMec}|${codigoSec}|${anexo}`;
}

function sanitizeSelectedSchoolForStorage(selectedSchool = {}) {
  return {
    codigoMec: String(selectedSchool?.codigoMec || "").trim(),
    codigoSec: String(selectedSchool?.codigoSec || "").trim(),
    anexo: String(selectedSchool?.anexo || "00").trim() || "00",
    codigoMecAnexo: String(selectedSchool?.codigoMecAnexo || "").trim(),
    nome: String(selectedSchool?.nome || "").trim(),
    depAdm: String(selectedSchool?.depAdm || "").trim(),
    situacaoFuncional: String(selectedSchool?.situacaoFuncional || "").trim(),
    direc: String(selectedSchool?.direc || "").trim(),
    municipio: String(selectedSchool?.municipio || "").trim(),
    projeto: String(selectedSchool?.projeto || "").trim(),
    modalidade: String(selectedSchool?.modalidade || "").trim(),
  };
}

function sanitizeServidoresForStorage(rawRows = []) {
  if (!Array.isArray(rawRows)) return [];

  return rawRows
    .map((row) => ({
      cadastro: String(row?.cadastro || row?.matricula || "").trim(),
      matricula: normalizeDigits(row?.matricula || row?.cadastro || ""),
      nome: String(row?.nome || "").trim(),
      cargo: String(row?.cargo || "").trim(),
      funcao: String(row?.funcao || "").trim(),
      nivel: String(row?.nivel || "").trim(),
      situacao: String(row?.situacao || "").trim(),
    }))
    .filter((row) => row.matricula.length >= 5);
}

function isCacheFresh(updatedAtMs) {
  const numeric = Number(updatedAtMs);
  if (!Number.isFinite(numeric) || numeric <= 0) return false;
  return Date.now() - numeric <= SEC_STAFF_PERSISTENT_CACHE_TTL_MS;
}

function sanitizeValidationResultForClient(result = {}) {
  const sanitized = { ...result };
  delete sanitized.internalStaffSnapshot;
  return sanitized;
}

async function readPersistentStaffCache(payload = {}) {
  const key = buildCacheKeyFromPayload(payload);
  if (!key) return null;

  const db = getAdminDb();
  const snap = await db.collection(SEC_STAFF_PERSISTENT_CACHE_COLLECTION).doc(key).get();
  if (!snap.exists) return null;

  const data = snap.data() || {};
  const updatedAtMs = Number(data.updatedAtMs || data.updatedAt || 0);
  const cacheAgeMs = Number.isFinite(updatedAtMs) && updatedAtMs > 0
    ? Math.max(0, Date.now() - updatedAtMs)
    : null;

  return {
    key,
    selectedSchool: data.selectedSchool || null,
    servidores: Array.isArray(data.servidores) ? data.servidores : [],
    updatedAtMs,
    cacheAgeMs,
    cacheFresh: isCacheFresh(updatedAtMs),
  };
}

function buildCachedValidationResult(payload = {}, cacheEntry = {}) {
  const targetMatricula = normalizeDigits(payload?.matricula || "");
  const servidores = Array.isArray(cacheEntry?.servidores) ? cacheEntry.servidores : [];
  const selectedSchool = cacheEntry?.selectedSchool || null;

  const matchingRows = servidores.filter((row) => normalizeDigits(row?.matricula || row?.cadastro || "") === targetMatricula);
  const chosenServidor =
    matchingRows.find((row) => normalizeComparableText(row?.situacao || "").includes("ATIVIDADE"))
    || matchingRows[0]
    || null;

  const hasMatch = Boolean(chosenServidor);

  return {
    ok: true,
    query: {
      codigoMec: selectedSchool?.codigoMec || "",
      codigoSec: selectedSchool?.codigoSec || "",
      anexo: selectedSchool?.anexo || "00",
    },
    selectedSchool,
    candidateSchools: selectedSchool ? [selectedSchool] : [],
    totalServidores: servidores.length,
    valid: hasMatch,
    reason: hasMatch
      ? "Matricula validada como servidor na unidade selecionada (cache local)."
      : "Matricula nao localizada no quadro de servidores da unidade selecionada (cache local).",
    matricula: targetMatricula,
    matchedByMatricula: hasMatch,
    matchingRows: matchingRows.length,
    sameSchool: Boolean(selectedSchool),
    isProfessor: chosenServidor ? inferIsProfessor(chosenServidor) : false,
    servidor: chosenServidor,
    fromPersistentCache: true,
    cacheFresh: Boolean(cacheEntry?.cacheFresh),
    cacheAgeMs: Number.isFinite(cacheEntry?.cacheAgeMs) ? cacheEntry.cacheAgeMs : null,
  };
}

async function writePersistentStaffCache(payload = {}, result = {}) {
  const selectedSchool = result?.selectedSchool || null;
  const rawStaffRows = Array.isArray(result?.internalStaffSnapshot)
    ? result.internalStaffSnapshot
    : null;

  if (!selectedSchool || !Array.isArray(rawStaffRows)) {
    return;
  }

  const key = buildCacheKeyFromSchool(selectedSchool) || buildCacheKeyFromPayload(payload);
  if (!key) {
    return;
  }

  const servidores = sanitizeServidoresForStorage(rawStaffRows);
  const db = getAdminDb();

  await db.collection(SEC_STAFF_PERSISTENT_CACHE_COLLECTION).doc(key).set({
    key,
    selectedSchool: sanitizeSelectedSchoolForStorage(selectedSchool),
    servidores,
    totalServidores: servidores.length,
    updatedAtMs: Date.now(),
    updatedAtIso: new Date().toISOString(),
    source: "sec-escola-servidores",
  }, { merge: true });
}

function isClientPayloadError(message = "") {
  const normalized = String(message || "").trim().toLowerCase();
  return (
    normalized.startsWith("informe ")
    || normalized.includes("nao foi possivel identificar a unidade escolar")
    || normalized.includes("para consultar servidores da escola")
  );
}

function createTimeoutSignal(timeoutMs) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(timeoutMs);
  }
  return undefined;
}

function mergeSignals(primarySignal, secondarySignal) {
  if (!primarySignal) return secondarySignal;
  if (!secondarySignal) return primarySignal;

  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.any === "function") {
    return AbortSignal.any([primarySignal, secondarySignal]);
  }

  return primarySignal;
}

function extractErrorMessage(error) {
  if (error instanceof Error) {
    return String(error.message || "").trim();
  }
  return String(error || "").trim();
}

function isExternalProxyConfigured() {
  return /^https?:\/\//i.test(SEC_EXTERNAL_PROXY_URL);
}

async function runExternalProxyAttempt(payload, signal) {
  if (!isExternalProxyConfigured()) {
    throw new Error("External SEC proxy is not configured.");
  }

  const timeoutSignal = createTimeoutSignal(SEC_EXTERNAL_PROXY_TIMEOUT_MS);
  const mergedSignal = mergeSignals(signal, timeoutSignal);
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
  };

  if (SEC_EXTERNAL_PROXY_TOKEN) {
    headers["x-relay-token"] = SEC_EXTERNAL_PROXY_TOKEN;
  }

  const response = await fetch(SEC_EXTERNAL_PROXY_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: mergedSignal,
  });

  const raw = await response.text();
  let data = {};

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      String(data?.error || data?.message || `External SEC proxy returned HTTP ${response.status}.`).trim(),
    );
  }

  if (data?.temporarilyUnavailable) {
    throw new Error(
      String(data?.upstreamError || data?.reason || "External SEC proxy is temporarily unavailable.").trim(),
    );
  }

  return data;
}

async function runMatriculaValidationWithGuard(payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, SEC_MATRICULA_GUARD_TIMEOUT_MS);

  try {
    const runAttempt = (transportPreference, signal) => validateSecTeacherByMatricula(payload, {
      signal,
      allowDetailFallback: false,
      disableStaffCache: true,
      includeInternalStaffSnapshot: true,
      transportPreference,
    });

    const roundErrors = [];

    for (let round = 1; round <= 2; round += 1) {
      const roundSignal = mergeSignals(
        controller.signal,
        createTimeoutSignal(SEC_MATRICULA_ATTEMPT_TIMEOUT_MS),
      );

      const attempts = [
        runAttempt("node-only", roundSignal),
        runAttempt("fetch-first", roundSignal),
      ];

      if (isExternalProxyConfigured()) {
        attempts.push(runExternalProxyAttempt(payload, roundSignal));
      }

      try {
        const result = await Promise.any(attempts);
        controller.abort();
        return result;
      } catch (aggregateError) {
        const aggregateErrors = Array.isArray(aggregateError?.errors)
          ? aggregateError.errors
          : [aggregateError];

        const message = aggregateErrors
          .map((entry) => extractErrorMessage(entry))
          .find((entry) => entry.length > 0);

        if (message) {
          roundErrors.push(`rodada ${round}: ${message}`);
        }

        if (controller.signal.aborted) {
          break;
        }
      }
    }

    throw new Error(
      roundErrors[0] || "Falha ao consultar SEC para validar matricula.",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function handler(event) {
  const method = String(event?.httpMethod || "").toUpperCase();

  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: "",
    };
  }

  if (!["GET", "POST"].includes(method)) {
    return json(405, {
      error: "Metodo nao suportado. Use GET ou POST.",
    });
  }

  const payload = getMergedPayload(event);
  const shouldValidateMatricula = hasMatricula(payload);

  if (shouldValidateMatricula) {
    try {
      const realtimeResult = await runMatriculaValidationWithGuard(payload);
      try {
        await writePersistentStaffCache(payload, realtimeResult);
      } catch {
        // cache persistence should never block the realtime response
      }

      return json(200, sanitizeValidationResultForClient(realtimeResult));
    } catch (error) {
      const message =
        error instanceof Error
          ? String(error.message || "").trim()
          : "Falha inesperada ao consultar dados da SEC.";

      if (isClientPayloadError(message)) {
        return json(400, {
          error: message,
        });
      }

      try {
        const cacheEntry = await readPersistentStaffCache(payload);
        if (cacheEntry) {
          const cachedResult = buildCachedValidationResult(payload, cacheEntry);
          return json(200, sanitizeValidationResultForClient({
            ...cachedResult,
            realtime: false,
            temporarilyUnavailable: true,
            upstreamError: message,
            fallbackSource: "persistent-cache",
          }));
        }
      } catch {
        // cache read failure should not hide the realtime unavailability response
      }

      try {
        await triggerBackgroundWarmup(payload, event);
      } catch {
        // noop
      }

      return json(200, {
        ok: false,
        valid: false,
        temporarilyUnavailable: true,
        reason: "A SEC esta temporariamente indisponivel para consulta em tempo real. Tente novamente em instantes.",
        errorCode: "SEC_UPSTREAM_UNAVAILABLE_REALTIME",
        upstreamError: message,
        realtime: true,
      });
    }
  }

  try {
    const result = await fetchSecSchoolStaffFlow(payload);

    return json(200, sanitizeValidationResultForClient(result));
  } catch (error) {
    const message =
      error instanceof Error
        ? String(error.message || "").trim()
        : "Falha inesperada ao consultar dados da SEC.";

    if (isClientPayloadError(message)) {
      return json(400, {
        error: message,
      });
    }

    return json(502, {
      error: message || "Falha inesperada ao consultar dados da SEC.",
    });
  }
}
