import { NextResponse } from "next/server";
import {
  fetchSecSchoolStaffFlow,
  validateSecTeacherByMatricula,
} from "../../../../scripts/secSchoolStaffProxy.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
const SEC_MATRICULA_ALLOW_DETAIL_FALLBACK = String(
  process.env.SEC_MATRICULA_ALLOW_DETAIL_FALLBACK || "true",
).trim().toLowerCase() !== "false";
const SEC_MATRICULA_DISABLE_IN_MEMORY_STAFF_CACHE = String(
  process.env.SEC_MATRICULA_DISABLE_IN_MEMORY_STAFF_CACHE || "false",
).trim().toLowerCase() === "true";

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

function isExternalProxyConfigured() {
  return /^https?:\/\//i.test(SEC_EXTERNAL_PROXY_URL);
}

function getTransportOrderFromEnv() {
  const raw = String(process.env.SEC_MATRICULA_TRANSPORT_ORDER || "node-only,fetch-first")
    .trim()
    .toLowerCase();

  const parsed = raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item === "node-only" || item === "fetch-first" || item === "fetch-only");

  if (!parsed.length) {
    return ["node-only", "fetch-first"];
  }

  return parsed;
}

function extractErrorMessage(error) {
  if (error instanceof Error) {
    return String(error.message || "").trim();
  }
  return String(error || "").trim();
}

function buildCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

function isClientPayloadError(message = "") {
  const normalized = String(message || "").trim().toLowerCase();
  return (
    normalized.startsWith("informe ")
    || normalized.includes("nao foi possivel identificar a unidade escolar")
    || normalized.includes("para consultar servidores da escola")
  );
}

function parseJsonBodySafely(textBody = "") {
  const raw = String(textBody || "").trim();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function getMergedPayload(request) {
  const url = new URL(request.url);
  const queryPayload = Object.fromEntries(url.searchParams.entries());

  if (request.method === "GET" || request.method === "HEAD") {
    return queryPayload;
  }

  const bodyText = await request.text();
  const bodyPayload = parseJsonBodySafely(bodyText);

  return {
    ...queryPayload,
    ...bodyPayload,
  };
}

function hasMatricula(payload = {}) {
  return String(payload?.matricula || "").trim().length > 0;
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
      allowDetailFallback: SEC_MATRICULA_ALLOW_DETAIL_FALLBACK,
      disableStaffCache: SEC_MATRICULA_DISABLE_IN_MEMORY_STAFF_CACHE,
      transportPreference,
    });
    const transportOrder = getTransportOrderFromEnv();

    const roundErrors = [];

    for (let round = 1; round <= 2; round += 1) {
      const roundSignal = mergeSignals(
        controller.signal,
        createTimeoutSignal(SEC_MATRICULA_ATTEMPT_TIMEOUT_MS),
      );

      for (const transportPreference of transportOrder) {
        try {
          const result = await runAttempt(transportPreference, roundSignal);
          controller.abort();
          return result;
        } catch (transportError) {
          const transportMessage = extractErrorMessage(transportError);
          if (transportMessage) {
            roundErrors.push(`rodada ${round} (${transportPreference}): ${transportMessage}`);
          }
        }
      }

      if (isExternalProxyConfigured()) {
        try {
          const result = await runExternalProxyAttempt(payload, roundSignal);
          controller.abort();
          return result;
        } catch (proxyError) {
          const proxyMessage = extractErrorMessage(proxyError);
          if (proxyMessage) {
            roundErrors.push(`rodada ${round} (external-proxy): ${proxyMessage}`);
          }
        }
      }

      if (controller.signal.aborted) {
        break;
      }
    }

    throw new Error(
      roundErrors[0] || "Falha ao consultar SEC para validar matricula.",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

function toJsonResponse(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: buildCorsHeaders(),
  });
}

async function handleRequest(request) {
  const method = String(request?.method || "").toUpperCase();

  if (!method || !["GET", "POST"].includes(method)) {
    return toJsonResponse(
      { error: "Metodo nao suportado. Use GET ou POST." },
      405,
    );
  }

  const payload = await getMergedPayload(request);
  const shouldValidateMatricula = hasMatricula(payload);

  try {
    const result = shouldValidateMatricula
      ? await runMatriculaValidationWithGuard(payload)
      : await fetchSecSchoolStaffFlow(payload);

    return toJsonResponse(result, 200);
  } catch (error) {
    const message =
      error instanceof Error
        ? String(error.message || "").trim()
        : "Falha inesperada ao consultar dados da SEC.";

    if (isClientPayloadError(message)) {
      return toJsonResponse({ error: message }, 400);
    }

    if (shouldValidateMatricula) {
      return toJsonResponse(
        {
          ok: false,
          valid: false,
          temporarilyUnavailable: true,
          reason: "A SEC esta temporariamente indisponivel para consulta em tempo real. Tente novamente em instantes.",
          errorCode: "SEC_UPSTREAM_UNAVAILABLE_REALTIME",
          upstreamError: message,
          realtime: true,
        },
        200,
      );
    }

    return toJsonResponse(
      { error: message || "Falha inesperada ao consultar dados da SEC." },
      502,
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(),
  });
}

export async function GET(request) {
  return handleRequest(request);
}

export async function POST(request) {
  return handleRequest(request);
}
