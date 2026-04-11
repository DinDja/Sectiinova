import { handler as runForumModerationHandler } from "../netlify/functions/forum-moderate.js";
import { handler as runForumAlertsHandler } from "../netlify/functions/forum-alerts.js";

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function readRawBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function createForumModerationMiddleware() {
  return async (request, response, next) => {
    const requestUrl = String(request.url || "");
    const isModerationRoute = requestUrl.startsWith("/api/forum/moderate");
    const isAlertsRoute = requestUrl.startsWith("/api/forum/alerts");

    if (!isModerationRoute && !isAlertsRoute) {
      next();
      return;
    }

    if (isModerationRoute && request.method !== "POST") {
      sendJson(response, 405, {
        error: "Metodo nao suportado. Use POST.",
      });
      return;
    }

    if (isAlertsRoute && request.method !== "GET") {
      sendJson(response, 405, {
        error: "Metodo nao suportado. Use GET.",
      });
      return;
    }

    try {
      const parsedUrl = new URL(requestUrl, "http://localhost");

      const queryStringParameters = {};
      parsedUrl.searchParams.forEach((value, key) => {
        queryStringParameters[key] = value;
      });

      const rawBody = isModerationRoute ? await readRawBody(request) : "";

      const result = isModerationRoute
        ? await runForumModerationHandler({
            httpMethod: "POST",
            headers: request.headers || {},
            body: rawBody,
            isBase64Encoded: false,
          })
        : await runForumAlertsHandler({
            httpMethod: "GET",
            headers: request.headers || {},
            queryStringParameters,
            body: "",
            isBase64Encoded: false,
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
            : "Falha inesperada ao executar API do forum.",
      });
    }
  };
}

export function createForumModerationProxyPlugin() {
  const middleware = createForumModerationMiddleware();

  return {
    name: "forum-moderation-proxy",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
