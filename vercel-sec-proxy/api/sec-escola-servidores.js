import {
  fetchSecSchoolStaffFlow,
  validateSecTeacherByMatricula,
} from "../lib/secSchoolStaffProxy.js";

const SEC_MATRICULA_GUARD_TIMEOUT_MS = (() => {
  const parsed = Number.parseInt(String(process.env.SEC_MATRICULA_GUARD_TIMEOUT_MS || "22000"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 22000;
})();
const SEC_MATRICULA_ATTEMPT_TIMEOUT_MS = (() => {
  const parsed = Number.parseInt(String(process.env.SEC_MATRICULA_ATTEMPT_TIMEOUT_MS || "12000"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 12000;
})();

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

function parseJsonSafely(value) {
  const raw = String(value || "").trim();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function getBodyPayload(req) {
  const body = req?.body;

  if (!body) return {};

  if (typeof body === "object" && !Buffer.isBuffer(body)) {
    return body;
  }

  if (Buffer.isBuffer(body)) {
    return parseJsonSafely(body.toString("utf8"));
  }

  return parseJsonSafely(body);
}

function getMergedPayload(req) {
  const queryPayload = req?.query && typeof req.query === "object"
    ? req.query
    : {};
  const bodyPayload = getBodyPayload(req);

  return {
    ...queryPayload,
    ...bodyPayload,
  };
}

function hasMatricula(payload = {}) {
  return String(payload?.matricula || "").trim().length > 0;
}

function extractErrorMessage(error) {
  if (error instanceof Error) {
    return String(error.message || "").trim();
  }

  return String(error || "").trim();
}

function isClientPayloadError(message = "") {
  const normalized = String(message || "").trim().toLowerCase();
  return (
    normalized.startsWith("informe ")
    || normalized.includes("nao foi possivel identificar a unidade escolar")
    || normalized.includes("para consultar servidores da escola")
  );
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

function sendJson(res, statusCode, payload) {
  res.status(statusCode);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.send(JSON.stringify(payload));
}

export default async function handler(req, res) {
  const method = String(req?.method || "").toUpperCase();

  if (method === "OPTIONS") {
    res.status(204);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.end();
    return;
  }

  if (!method || !["GET", "POST"].includes(method)) {
    sendJson(res, 405, {
      error: "Metodo nao suportado. Use GET ou POST.",
    });
    return;
  }

  const payload = getMergedPayload(req);
  const shouldValidateMatricula = hasMatricula(payload);

  try {
    const result = shouldValidateMatricula
      ? await runMatriculaValidationWithGuard(payload)
      : await fetchSecSchoolStaffFlow(payload, {
          transportPreference: "node-only",
        });

    sendJson(res, 200, result);
    return;
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
