import {
  fetchSecSchoolStaffFlow,
  validateSecTeacherByMatricula,
} from "../../scripts/secSchoolStaffProxy.js";

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

  try {
    const result = hasMatricula(payload)
      ? await validateSecTeacherByMatricula(payload)
      : await fetchSecSchoolStaffFlow(payload);

    return json(200, result);
  } catch (error) {
    return json(502, {
      error:
        error instanceof Error
          ? error.message
          : "Falha inesperada ao consultar dados da SEC.",
    });
  }
}
