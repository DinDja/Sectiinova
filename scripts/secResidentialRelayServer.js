import http from "node:http";
import {
  fetchSecSchoolStaffFlow,
  validateSecTeacherByMatricula,
} from "./secSchoolStaffProxy.js";

const RELAY_PORT = (() => {
  const parsed = Number.parseInt(String(process.env.SEC_RELAY_PORT || "8787"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8787;
})();

const RELAY_HOST = String(process.env.SEC_RELAY_HOST || "0.0.0.0").trim() || "0.0.0.0";
const RELAY_TOKEN = String(process.env.SEC_RELAY_TOKEN || "").trim();

const SEC_MATRICULA_GUARD_TIMEOUT_MS = (() => {
  const parsed = Number.parseInt(String(process.env.SEC_MATRICULA_GUARD_TIMEOUT_MS || "22000"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 22000;
})();

const SEC_MATRICULA_ATTEMPT_TIMEOUT_MS = (() => {
  const parsed = Number.parseInt(String(process.env.SEC_MATRICULA_ATTEMPT_TIMEOUT_MS || "12000"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 12000;
})();

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-relay-token");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  setCorsHeaders(res);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function parseJsonSafely(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function extractErrorMessage(error) {
  if (error instanceof Error) {
    return String(error.message || "").trim();
  }

  return String(error || "").trim();
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

function isClientPayloadError(message = "") {
  const normalized = String(message || "").trim().toLowerCase();
  return (
    normalized.startsWith("informe ")
    || normalized.includes("nao foi possivel identificar a unidade escolar")
    || normalized.includes("para consultar servidores da escola")
  );
}

function hasMatricula(payload = {}) {
  return String(payload?.matricula || "").trim().length > 0;
}

function hasValidToken(req, requestUrl) {
  if (!RELAY_TOKEN) return true;

  const headerToken = String(req.headers?.["x-relay-token"] || "").trim();
  const queryToken = String(requestUrl.searchParams.get("token") || "").trim();

  return headerToken === RELAY_TOKEN || queryToken === RELAY_TOKEN;
}

async function readRequestBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
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
      transportPreference,
    });

    const roundErrors = [];

    for (let round = 1; round <= 2; round += 1) {
      const roundSignal = mergeSignals(
        controller.signal,
        createTimeoutSignal(SEC_MATRICULA_ATTEMPT_TIMEOUT_MS),
      );

      try {
        const result = await Promise.any([
          runAttempt("node-only", roundSignal),
          runAttempt("fetch-first", roundSignal),
        ]);

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

function isHandledPath(requestUrl) {
  return requestUrl.pathname === "/api/sec-escola/servidores";
}

async function handleRequest(req, res) {
  const method = String(req.method || "").toUpperCase();
  const requestUrl = new URL(req.url || "/", "http://localhost");

  if (!isHandledPath(requestUrl)) {
    sendJson(res, 404, {
      error: "Endpoint nao encontrado.",
    });
    return;
  }

  if (method === "OPTIONS") {
    res.statusCode = 204;
    setCorsHeaders(res);
    res.end();
    return;
  }

  if (!hasValidToken(req, requestUrl)) {
    sendJson(res, 401, {
      error: "Token de relay invalido.",
    });
    return;
  }

  if (!["GET", "POST"].includes(method)) {
    sendJson(res, 405, {
      error: "Metodo nao suportado. Use GET ou POST.",
    });
    return;
  }

  const queryPayload = Object.fromEntries(requestUrl.searchParams.entries());
  const bodyPayload = method === "POST"
    ? parseJsonSafely(await readRequestBody(req))
    : {};

  const payload = {
    ...queryPayload,
    ...bodyPayload,
  };

  const shouldValidateMatricula = hasMatricula(payload);

  try {
    const result = shouldValidateMatricula
      ? await runMatriculaValidationWithGuard(payload)
      : await fetchSecSchoolStaffFlow(payload, {
          transportPreference: "node-only",
        });

    sendJson(res, 200, result);
  } catch (error) {
    const message = extractErrorMessage(error) || "Falha inesperada ao consultar dados da SEC.";

    if (isClientPayloadError(message)) {
      sendJson(res, 400, {
        error: message,
      });
      return;
    }

    if (shouldValidateMatricula) {
      sendJson(res, 200, {
        ok: false,
        valid: false,
        temporarilyUnavailable: true,
        reason: "A SEC esta temporariamente indisponivel para consulta em tempo real. Tente novamente em instantes.",
        errorCode: "SEC_UPSTREAM_UNAVAILABLE_REALTIME",
        upstreamError: message,
        realtime: true,
      });
      return;
    }

    sendJson(res, 502, {
      error: message,
    });
  }
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    sendJson(res, 500, {
      error: extractErrorMessage(error) || "Falha inesperada no relay SEC.",
    });
  });
});

server.listen(RELAY_PORT, RELAY_HOST, () => {
  console.log("[sec-relay] running", {
    host: RELAY_HOST,
    port: RELAY_PORT,
    tokenEnabled: Boolean(RELAY_TOKEN),
    matriculaGuardMs: SEC_MATRICULA_GUARD_TIMEOUT_MS,
    matriculaAttemptMs: SEC_MATRICULA_ATTEMPT_TIMEOUT_MS,
  });
});
