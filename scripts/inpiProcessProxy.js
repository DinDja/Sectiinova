import https from "node:https";

const INPI_HOST = "busca.inpi.gov.br";
const LOGIN_PATH = "/pePI/servlet/LoginController?action=login";
const OFFICIAL_PORTAL_URL = `https://${INPI_HOST}/pePI/`;
const BASE_HEADERS = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "User-Agent": "Projeto-INPI-POC/1.0",
};

const INPI_SOURCES = {
  patente: {
    id: "patente",
    label: "Patentes",
    searchPath: "/pePI/servlet/PatenteServletController",
    detailController: "PatenteServletController",
    officialSearchUrl:
      "https://busca.inpi.gov.br/pePI/jsp/patentes/PatenteSearchBasico.jsp",
    buildSearchBody(number) {
      return new URLSearchParams({
        NumPedido: number,
        NumGru: "",
        NumProtocolo: "",
        FormaPesquisa: "todasPalavras",
        ExpressaoPesquisa: "",
        Coluna: "Titulo",
        RegisterPerPage: "20",
        Action: "SearchBasico",
        botao: "pesquisar",
      }).toString();
    },
  },
  marca: {
    id: "marca",
    label: "Marcas",
    searchPath: "/pePI/servlet/MarcasServletController",
    detailController: "MarcasServletController",
    officialSearchUrl:
      "https://busca.inpi.gov.br/pePI/jsp/marcas/Pesquisa_num_processo.jsp",
    buildSearchBody(number) {
      return new URLSearchParams({
        NumPedido: String(number || "").replace(/\D/g, "") || String(number || ""),
        NumGRU: "",
        NumProtocolo: "",
        NumInscricaoInternacional: "",
        Action: "searchMarca",
        tipoPesquisa: "BY_NUM_PROC",
        botao: "pesquisar",
      }).toString();
    },
  },
  programa: {
    id: "programa",
    label: "Programa de Computador",
    searchPath: "/pePI/servlet/ProgramaServletController",
    detailController: "ProgramaServletController",
    officialSearchUrl:
      "https://busca.inpi.gov.br/pePI/jsp/programas/ProgramaSearchBasico.jsp",
    buildSearchBody(number) {
      return new URLSearchParams({
        NumPedido: number,
        FormaPesquisa: "todasPalavras",
        ExpressaoPesquisa: "",
        Coluna: "TituloPrograma",
        RegisterPerPage: "20",
        Action: "SearchBasico",
        botao: "pesquisar",
      }).toString();
    },
  },
};

export function isSupportedInpiSourceId(sourceId = "automatico") {
  return sourceId === "automatico" || Object.hasOwn(INPI_SOURCES, sourceId);
}

function updateCookieJar(cookieJar, setCookieHeader = []) {
  const cookieList = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader].filter(Boolean);

  for (const cookieEntry of cookieList) {
    const [pair] = String(cookieEntry).split(";");
    const separatorIndex = pair.indexOf("=");

    if (separatorIndex <= 0) continue;

    const cookieName = pair.slice(0, separatorIndex).trim();
    const cookieValue = pair.slice(separatorIndex + 1).trim();

    if (cookieName) {
      cookieJar.set(cookieName, cookieValue);
    }
  }
}

function getCookieHeader(cookieJar) {
  return Array.from(cookieJar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function decodeLatin1(buffer) {
  return new TextDecoder("latin1").decode(buffer);
}

function requestInpi({ path, method = "GET", body = "", cookieJar, headers = {} }) {
  return new Promise((resolve, reject) => {
    const requestHeaders = {
      ...BASE_HEADERS,
      ...headers,
    };

    const cookieHeader = getCookieHeader(cookieJar);
    if (cookieHeader) {
      requestHeaders.Cookie = cookieHeader;
    }

    if (body) {
      requestHeaders["Content-Type"] = "application/x-www-form-urlencoded";
      requestHeaders["Content-Length"] = Buffer.byteLength(body);
    }

    const request = https.request(
      {
        hostname: INPI_HOST,
        path,
        method,
        headers: requestHeaders,
      },
      (response) => {
        const chunks = [];
        updateCookieJar(cookieJar, response.headers["set-cookie"]);

        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            statusCode: response.statusCode || 0,
            headers: response.headers,
            body: decodeLatin1(Buffer.concat(chunks)),
          });
        });
      },
    );

    request.on("error", reject);

    if (body) {
      request.write(body);
    }

    request.end();
  });
}

function extractDetailPath(searchHtml, source) {
  const detailMatch = searchHtml.match(
    new RegExp(
      `href=['\"]([^'\"]*${source.detailController}\\?Action=detail[^'\"]+)['\"]`,
      "i",
    ),
  );

  if (!detailMatch?.[1]) {
    return "";
  }

  return detailMatch[1].replace(/&amp;/g, "&");
}

function normalizeDetailPath(detailPath) {
  const normalizedUrl = new URL(detailPath, `https://${INPI_HOST}`);
  return `${normalizedUrl.pathname}${normalizedUrl.search}`;
}

function hasNoResults(searchHtml) {
  return /Foram encontrados\s*<b>\s*0\s*<\/b>\s*processos/i.test(searchHtml);
}

function getRequestedSource(sourceId) {
  if (!sourceId || sourceId === "automatico") {
    return null;
  }

  return INPI_SOURCES[sourceId] || null;
}

function getSourceOrder(number, requestedSourceId = "automatico") {
  const requestedSource = getRequestedSource(requestedSourceId);

  if (requestedSource) {
    return [requestedSource];
  }

  const normalizedNumber = String(number || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

  const looksLikeProgram =
    normalizedNumber.startsWith("BR 51") || /^\d{5}-\d$/.test(normalizedNumber);
  const looksLikeMark = /^\d{9}$/.test(normalizedNumber.replace(/\D/g, ""));

  if (looksLikeProgram) {
    return [INPI_SOURCES.programa, INPI_SOURCES.patente, INPI_SOURCES.marca];
  }

  if (looksLikeMark) {
    return [INPI_SOURCES.marca, INPI_SOURCES.patente, INPI_SOURCES.programa];
  }

  return [INPI_SOURCES.patente, INPI_SOURCES.marca, INPI_SOURCES.programa];
}

async function fetchFromSource(number, source) {
  const trimmedNumber = String(number || "").trim();

  if (!trimmedNumber) {
    throw new Error("Informe um número de pedido válido.");
  }

  const cookieJar = new Map();

  await requestInpi({
    path: LOGIN_PATH,
    cookieJar,
  });

  const searchBody = source.buildSearchBody(trimmedNumber);

  const searchResponse = await requestInpi({
    path: source.searchPath,
    method: "POST",
    body: searchBody,
    cookieJar,
    headers: {
      Referer: `https://${INPI_HOST}${LOGIN_PATH}`,
    },
  });

  if (searchResponse.statusCode < 200 || searchResponse.statusCode >= 300) {
    throw new Error("Falha ao consultar o BuscaWeb do INPI.");
  }

  const detailPath = extractDetailPath(searchResponse.body, source);

  if (!detailPath || hasNoResults(searchResponse.body)) {
    return {
      found: false,
      sourceId: source.id,
      sourceLabel: source.label,
      query: trimmedNumber,
      fetchedAt: new Date().toISOString(),
      officialSearchUrl: source.officialSearchUrl,
      searchHtml: searchResponse.body,
      detailHtml: "",
      detailPath: "",
    };
  }

  const detailResponse = await requestInpi({
    path: normalizeDetailPath(detailPath),
    cookieJar,
    headers: {
      Referer: `https://${INPI_HOST}${source.searchPath}`,
    },
  });

  if (detailResponse.statusCode < 200 || detailResponse.statusCode >= 300) {
    throw new Error("Falha ao consultar o detalhe do pedido no INPI.");
  }

  return {
    found: true,
    sourceId: source.id,
    sourceLabel: source.label,
    query: trimmedNumber,
    fetchedAt: new Date().toISOString(),
    officialSearchUrl: source.officialSearchUrl,
    searchHtml: searchResponse.body,
    detailHtml: detailResponse.body,
    detailPath,
  };
}

export async function fetchInpiProcessFlow(number, requestedSourceId = "automatico") {
  const trimmedNumber = String(number || "").trim();
  const sourceOrder = getSourceOrder(trimmedNumber, requestedSourceId);
  const requestedSource = getRequestedSource(requestedSourceId);
  const attempts = [];

  for (const source of sourceOrder) {
    const result = await fetchFromSource(trimmedNumber, source);
    attempts.push({
      sourceId: source.id,
      sourceLabel: source.label,
      found: result.found,
    });

    if (result.found) {
      return {
        ...result,
        requestedSourceId: requestedSourceId || "automatico",
        requestedSourceLabel: requestedSource?.label || "Busca automatica",
        searchedSources: attempts,
      };
    }
  }

  return {
    found: false,
    query: trimmedNumber,
    fetchedAt: new Date().toISOString(),
    officialSearchUrl: requestedSource?.officialSearchUrl || OFFICIAL_PORTAL_URL,
    requestedSourceId: requestedSourceId || "automatico",
    requestedSourceLabel: requestedSource?.label || "Busca automatica",
    searchedSources: attempts,
    searchHtml: "",
    detailHtml: "",
    detailPath: "",
  };
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function createInpiProcessMiddleware() {
  return async (request, response, next) => {
    if (!request.url?.startsWith("/api/inpi/process")) {
      next();
      return;
    }

    if (request.method !== "GET") {
      sendJson(response, 405, {
        error: "Método não suportado. Use GET.",
      });
      return;
    }

    try {
      const requestUrl = new URL(request.url, "http://localhost");
      const processNumber = requestUrl.searchParams.get("number") || "";
      const requestedSourceId =
        requestUrl.searchParams.get("source") || "automatico";

      if (!processNumber.trim()) {
        sendJson(response, 400, {
          error: "Informe o número do pedido na query string.",
        });
        return;
      }

      if (!isSupportedInpiSourceId(requestedSourceId)) {
        sendJson(response, 400, {
          error: "Base do INPI inválida para a consulta.",
        });
        return;
      }

      const result = await fetchInpiProcessFlow(
        processNumber,
        requestedSourceId,
      );
      sendJson(response, 200, result);
    } catch (error) {
      sendJson(response, 502, {
        error:
          error instanceof Error
            ? error.message
            : "Falha inesperada ao consultar o INPI.",
      });
    }
  };
}

export function createInpiProcessProxyPlugin() {
  const middleware = createInpiProcessMiddleware();

  return {
    name: "inpi-process-proxy",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}