import { json, runWatchJob } from "./inpiWatchShared.js";

function hasValidRunToken(event) {
  const requiredToken = String(process.env.INPI_WATCH_RUN_TOKEN || "").trim();

  if (!requiredToken) {
    return false;
  }

  const headerToken = String(event.headers?.["x-inpi-watch-token"] || "").trim();
  const queryToken = String(event.queryStringParameters?.token || "").trim();

  return headerToken === requiredToken || queryToken === requiredToken;
}

export async function handler(event) {
  if (event.httpMethod && !["GET", "POST"].includes(event.httpMethod)) {
    return json(405, {
      error: "Método não suportado. Use GET ou POST.",
    });
  }

  const targetUserId = String(event.queryStringParameters?.userId || "").trim();
  const hasToken = hasValidRunToken(event);

  if (!targetUserId && !hasToken) {
    return json(400, {
      error:
        "Informe userId para executar a sua varredura ou forneça um token válido para rodar a varredura global.",
    });
  }

  try {
    const summary = await runWatchJob({ targetUserId });
    return json(200, summary);
  } catch (error) {
    return json(500, {
      error:
        error instanceof Error
          ? error.message
          : "Falha inesperada ao executar o monitoramento manual do INPI.",
    });
  }
}