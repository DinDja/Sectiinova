const LIBRARY_BOOKS_ENDPOINT = "/api/library/books";

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

export async function fetchLibraryBooks({
  intent = "",
  query = "",
  limit = 18,
  forceRefresh = false,
} = {}) {
  const queryString = toQueryString({
    intent,
    query,
    limit,
    forceRefresh: forceRefresh ? "1" : "",
  });

  const endpoint = queryString
    ? `${LIBRARY_BOOKS_ENDPOINT}?${queryString}`
    : LIBRARY_BOOKS_ENDPOINT;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      String(payload?.error || payload?.message || "Falha ao carregar livros livres."),
    );
  }

  if (!payload || payload.success !== true || !Array.isArray(payload.books)) {
    throw new Error("Resposta invalida ao consultar biblioteca livre.");
  }

  return payload;
}
