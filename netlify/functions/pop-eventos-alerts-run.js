import { json, runPopEventosAlertsJob } from "./popEventosAlertsShared.js";

function hasValidRunToken(event) {
  const requiredToken = String(process.env.POP_EVENTOS_ALERTS_RUN_TOKEN || "").trim();
  if (!requiredToken) return false;

  const headerToken = String(event?.headers?.["x-pop-alerts-token"] || "").trim();
  const queryToken = String(event?.queryStringParameters?.token || "").trim();

  return headerToken === requiredToken || queryToken === requiredToken;
}

export async function handler(event) {
  if (event.httpMethod && !["GET", "POST"].includes(event.httpMethod)) {
    return json(405, {
      error: "Metodo nao suportado. Use GET ou POST.",
    });
  }

  const targetUserId = String(event?.queryStringParameters?.userId || "").trim();
  const hasToken = hasValidRunToken(event);

  if (!targetUserId && !hasToken) {
    return json(400, {
      error:
        "Informe userId para executar sua varredura ou forneca token valido para rodar a varredura global.",
    });
  }

  try {
    const summary = await runPopEventosAlertsJob({ targetUserId });
    return json(200, summary);
  } catch (error) {
    return json(500, {
      error:
        error instanceof Error
          ? error.message
          : "Falha inesperada ao executar varredura manual de alertas POP.",
    });
  }
}
