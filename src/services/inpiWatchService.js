export async function runInpiWatchNow({ userId = "", token = "" } = {}) {
  const normalizedUserId = String(userId || "").trim();
  const normalizedToken = String(token || "").trim();
  const searchParams = new URLSearchParams();

  if (normalizedUserId) {
    searchParams.set("userId", normalizedUserId);
  }

  if (normalizedToken) {
    searchParams.set("token", normalizedToken);
  }

  const response = await fetch(
    `/api/inpi/watch${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
    {
      method: "POST",
    },
  );

  const rawResponse = await response.text();
  let payload = {};

  try {
    payload = rawResponse ? JSON.parse(rawResponse) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    if (!rawResponse.trim()) {
      throw new Error("O endpoint do monitoramento INPI não retornou conteúdo.");
    }

    throw new Error(payload?.error || "Falha ao executar a varredura manual do INPI.");
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("O endpoint do monitoramento INPI retornou um formato inválido.");
  }

  return payload;
}