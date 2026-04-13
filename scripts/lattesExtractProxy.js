import { handler as runLattesExtractHandler } from "../netlify/functions/lattes-extract.js";

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function createLattesExtractMiddleware() {
  return async (request, response, next) => {
    if (!request.url?.startsWith("/api/lattes/extract")) {
      next();
      return;
    }

    if ((request.method || "GET") !== "POST") {
      sendJson(response, 405, {
        success: false,
        error: "Método não suportado. Use POST.",
      });
      return;
    }

    try {
      const body = await readRequestBody(request);
      const result = await runLattesExtractHandler({
        httpMethod: "POST",
        headers: request.headers || {},
        body,
        isBase64Encoded: false,
      });

      response.statusCode = result.statusCode || 200;
      Object.entries(result.headers || {}).forEach(([key, value]) => {
        response.setHeader(key, value);
      });
      response.end(result.body || "");
    } catch (error) {
      sendJson(response, 500, {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha inesperada ao consultar dados do Lattes.",
      });
    }
  };
}

export function createLattesExtractProxyPlugin() {
  const middleware = createLattesExtractMiddleware();

  return {
    name: "lattes-extract-proxy",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

