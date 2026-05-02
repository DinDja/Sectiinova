const POP_EVENTOS_ENDPOINT = "/api/pop-eventos";
const POP_EVENTOS_ALERT_RUN_ENDPOINT = "/api/pop-eventos/alerts/run";

function toQueryString(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const normalized = String(value).trim();
    if (!normalized) return;
    searchParams.set(key, normalized);
  });
  return searchParams.toString();
}

export async function fetchPopEventos({
  year = 2026,
  mode = "quick",
  query = "",
  maxSources = 28,
  group = "",
} = {}) {
  const queryString = toQueryString({
    year,
    mode,
    query,
    maxSources,
    group,
  });

  const endpoint = queryString
    ? `${POP_EVENTOS_ENDPOINT}?${queryString}`
    : POP_EVENTOS_ENDPOINT;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      String(payload?.error || payload?.message || "Falha ao carregar eventos POP."),
    );
  }

  if (!payload || payload.success !== true) {
    throw new Error("Resposta invalida ao consultar eventos POP.");
  }

  return payload;
}

export async function runPopEventosAlertSweep({ userId = "" } = {}) {
  const queryString = toQueryString({
    userId,
  });

  const endpoint = queryString
    ? `${POP_EVENTOS_ALERT_RUN_ENDPOINT}?${queryString}`
    : POP_EVENTOS_ALERT_RUN_ENDPOINT;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      String(payload?.error || payload?.message || "Falha ao executar varredura de alertas POP."),
    );
  }

  return payload;
}
