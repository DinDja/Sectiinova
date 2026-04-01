import {
  fetchInpiProcessFlow,
  isSupportedInpiSourceId,
} from "../../scripts/inpiProcessProxy.js";

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  };
}

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return json(405, {
      error: "Método não suportado. Use GET.",
    });
  }

  const processNumber = String(event.queryStringParameters?.number || "");
  const requestedSourceId = String(
    event.queryStringParameters?.source || "automatico",
  );

  if (!processNumber.trim()) {
    return json(400, {
      error: "Informe o número do pedido na query string.",
    });
  }

  if (!isSupportedInpiSourceId(requestedSourceId)) {
    return json(400, {
      error: "Base do INPI inválida para a consulta.",
    });
  }

  try {
    const result = await fetchInpiProcessFlow(processNumber, requestedSourceId);
    return json(200, result);
  } catch (error) {
    return json(502, {
      error:
        error instanceof Error
          ? error.message
          : "Falha inesperada ao consultar o INPI.",
    });
  }
}