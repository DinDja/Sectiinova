import { handler as runInpiWatchHandler } from "../netlify/functions/inpi-watch-run.js";

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function toQueryParams(searchParams) {
  const entries = {};

  for (const [key, value] of searchParams.entries()) {
    entries[key] = value;
  }

  return entries;
}

function createInpiWatchMiddleware() {
  return async (request, response, next) => {
    if (!request.url?.startsWith("/api/inpi/watch")) {
      next();
      return;
    }

    if (!["GET", "POST"].includes(request.method || "GET")) {
      sendJson(response, 405, {
        error: "Método não suportado. Use GET ou POST.",
      });
      return;
    }

    try {
      const requestUrl = new URL(request.url, "http://localhost");
      const result = await runInpiWatchHandler({
        httpMethod: request.method || "GET",
        headers: request.headers || {},
        queryStringParameters: toQueryParams(requestUrl.searchParams),
      });

      response.statusCode = result.statusCode || 200;

      Object.entries(result.headers || {}).forEach(([key, value]) => {
        response.setHeader(key, value);
      });

      response.end(result.body || "");
    } catch (error) {
      sendJson(response, 500, {
        error:
          error instanceof Error
            ? error.message
            : "Falha inesperada ao executar o monitoramento manual do INPI.",
      });
    }
  };
}

export function createInpiWatchProxyPlugin() {
  const middleware = createInpiWatchMiddleware();

  return {
    name: "inpi-watch-proxy",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}