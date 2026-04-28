import { NextResponse } from "next/server";
import {
  fetchSecSchoolStaffFlow,
  validateSecTeacherByMatricula,
} from "../../../../scripts/secSchoolStaffProxy.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEC_MATRICULA_GUARD_TIMEOUT_MS = (() => {
  const parsed = Number.parseInt(String(process.env.SEC_MATRICULA_GUARD_TIMEOUT_MS || "28000"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 28000;
})();

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

async function runMatriculaValidationWithGuard(payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, SEC_MATRICULA_GUARD_TIMEOUT_MS);

  try {
    return await validateSecTeacherByMatricula(payload, {
      signal: controller.signal,
      allowDetailFallback: false,
      disableStaffCache: true,
    });
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
