function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

export function createTeacherVerifyProxyPlugin() {
  const middleware = async (request, response, next) => {
    const requestUrl = String(request.url || "");
    const isTeacherVerifyRoute = requestUrl.startsWith("/api/teacher/verify");

    if (!isTeacherVerifyRoute) {
      next();
      return;
    }

    sendJson(response, 404, {
      error:
        "Teacher verify proxy is not implemented in this branch. Add a /netlify/functions/teacher-verify.js function or remove the plugin from vite.config.js.",
    });
  };

  return {
    name: "teacher-verify-proxy",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
