import http from "node:http";
import https from "node:https";

const SEC_BASE_URL = "http://www.sec.ba.gov.br/siig/sistemaescolar";
const SEARCH_PAGE_URL = `${SEC_BASE_URL}/asp/pesquisaEscola/pesquisaescola.asp`;
const SEARCH_RESULTS_URL = `${SEC_BASE_URL}/asp/pesquisaEscola/resultadoPesquisa.asp?OrigemTela=`;
const SCHOOL_DETAIL_URL = `${SEC_BASE_URL}/asp/principal/consulta_escola.asp`;
const STAFF_NOMINAL_URL = `${SEC_BASE_URL}/asp/servidores/listar_servidores_nominal.asp`;
const SEC_NETWORK_TIMEOUT_MS = 25000;

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
};

const HTML_ENTITY_MAP = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  ccedil: "\u00e7",
  Ccedil: "\u00c7",
  atilde: "\u00e3",
  Atilde: "\u00c3",
  aacute: "\u00e1",
  Aacute: "\u00c1",
  eacute: "\u00e9",
  Eacute: "\u00c9",
  iacute: "\u00ed",
  Iacute: "\u00cd",
  oacute: "\u00f3",
  Oacute: "\u00d3",
  uacute: "\u00fa",
  Uacute: "\u00da",
  acirc: "\u00e2",
  Acirc: "\u00c2",
  ecirc: "\u00ea",
  Ecirc: "\u00ca",
  ocirc: "\u00f4",
  Ocirc: "\u00d4",
  agrave: "\u00e0",
  Agrave: "\u00c0",
  otilde: "\u00f5",
  Otilde: "\u00d5",
  uuml: "\u00fc",
  Uuml: "\u00dc",
  ordm: "\u00ba",
  ordf: "\u00aa",
  copy: "\u00a9",
};

function createAbortError(message = "request aborted") {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

function createNetworkTimeoutSignal(timeoutMs = SEC_NETWORK_TIMEOUT_MS) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(timeoutMs);
  }
  return undefined;
}

function combineSignals(externalSignal, timeoutSignal) {
  if (!externalSignal) return timeoutSignal;
  if (!timeoutSignal) return externalSignal;

  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.any === "function") {
    return AbortSignal.any([externalSignal, timeoutSignal]);
  }

  return externalSignal;
}

function isTimeoutNetworkError(error) {
  const name = String(error?.name || "").trim().toLowerCase();
  const message = String(error?.message || "").trim().toLowerCase();

  if (name === "aborterror") return true;

  return (
    message.includes("timed out")
    || message.includes("timeout")
    || message.includes("request timeout")
    || message.includes("signal timed out")
    || message.includes("tempo limite")
  );
}

function decodeHtmlEntities(value) {
  if (!value) return "";

  return String(value).replace(/&(#x?[0-9a-fA-F]+|[A-Za-z]+);/g, (match, entity) => {
    if (!entity) return match;

    if (entity[0] === "#") {
      const isHex = entity[1]?.toLowerCase() === "x";
      const numeric = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (Number.isFinite(numeric) && numeric > 0) {
        return String.fromCodePoint(numeric);
      }
      return match;
    }

    return Object.prototype.hasOwnProperty.call(HTML_ENTITY_MAP, entity)
      ? HTML_ENTITY_MAP[entity]
      : match;
  });
}

function fixCommonMojibake(value = "") {
  const input = String(value || "");
  if (!/[\u00c3\u00c2\u00e2]/.test(input)) {
    return input;
  }

  try {
    const repaired = Buffer.from(input, "latin1").toString("utf8");
    const inputNoise = (input.match(/[\u00c3\u00c2\u00e2]/g) || []).length;
    const repairedNoise = (repaired.match(/[\u00c3\u00c2\u00e2]/g) || []).length;
    return repairedNoise <= inputNoise ? repaired : input;
  } catch {
    return input;
  }
}

function stripHtml(html) {
  return fixCommonMojibake(
    decodeHtmlEntities(String(html || "").replace(/<[^>]*>/g, " ")),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeComparableText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDigits(value) {
  return String(value || "").replace(/\D+/g, "");
}

function isTeacherRoleFromStaffRow(staffRow = {}) {
  const cargo = normalizeComparableText(staffRow?.cargo || "");
  const funcao = normalizeComparableText(staffRow?.funcao || "");
  const combined = `${cargo} ${funcao}`.trim();

  if (!combined) return false;

  return (
    combined.includes("PROFESSOR")
    || combined.includes("DOCENTE")
    || combined.includes("COORDENADOR PEDAGOGICO")
    || combined.includes("PEDAGOGICO")
  );
}

function normalizeSecRoleLabel(value = "") {
  const raw = fixCommonMojibake(String(value || "")).trim();
  if (!raw) return "";

  const formatted = raw
    .replace(/\s+/g, " ")
    .replace(/FUN[^:\s]*O\s*:/gi, "Função:")
    .replace(/FUNCAO\s*:/gi, "Função:")
    .replace(/FUNÇÃO\s*:/gi, "Função:")
    .replace(/CARG[^:\s]*O\s*:/gi, "Cargo:")
    .replace(/CARGO\s*:/gi, "Cargo:")
    .replace(/:\s*/g, ": ")
    .replace(/\.{2,}/g, ".")
    .trim();

  const [label, detail] = formatted.split(/:(.+)/);
  if (!detail) {
    return formatted
      .split(/\s+/)
      .map((token) => {
        const core = token.replace(/\.+$/, "");
        const lower = core.toLowerCase();
        if (lower === "prof") return "Prof";
        if (lower === "educ") return "Educ.";
        if (lower === "educ.") return "Educ.";
        if (lower === "profissional") return "Profissional";
        if (lower === "pedagogico") return "Pedagógico";
        if (lower === "coordenador") return "Coordenador";
        return `${core.charAt(0).toUpperCase()}${core.slice(1).toLowerCase()}`;
      })
      .join(" ");
  }

  const processedValue = detail
    .split(/[\.\s]+/)
    .filter(Boolean)
    .map((token) => {
      const core = token.replace(/\.+$/, "");
      const lower = core.toLowerCase();
      if (lower === "prof") return "Prof";
      if (lower === "educ") return "Educ.";
      if (lower === "educ.") return "Educ.";
      if (lower === "profissional") return "Profissional";
      if (lower === "pedagogico") return "Pedagógico";
      if (lower === "coordenador") return "Coordenador";
      return `${core.charAt(0).toUpperCase()}${core.slice(1).toLowerCase()}`;
    })
    .join(" ");

  return `${label.trim()}: ${processedValue}`;
}

function extractInputValue(html, inputName) {
  const escapedName = inputName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const inputRegex = new RegExp(`<input[^>]*name=["']${escapedName}["'][^>]*>`, "i");
  const match = String(html || "").match(inputRegex);
  if (!match) return "";

  const tag = match[0];
  const quotedValueMatch = tag.match(/value\s*=\s*(["'])([\s\S]*?)\1/i);
  if (quotedValueMatch) {
    return decodeHtmlEntities(quotedValueMatch[2] || "").trim();
  }

  const plainValueMatch = tag.match(/value\s*=\s*([^\s>]+)/i);
  if (plainValueMatch) {
    return decodeHtmlEntities(plainValueMatch[1] || "").trim();
  }

  return "";
}

function extractDetailLabelValue(html, labelRegexSource) {
  const pattern = new RegExp(`${labelRegexSource}[\\s\\S]{0,260}?<b>([\\s\\S]*?)<\\/b>`, "i");
  const match = String(html || "").match(pattern);
  if (!match) return "";
  return stripHtml(match[1] || "");
}

async function fetchLatin1Html(url, init = {}) {
  const timeoutSignal = createNetworkTimeoutSignal();
  const mergedSignal = combineSignals(init.signal, timeoutSignal);
  const requestInit = {
    ...init,
    headers: {
      ...DEFAULT_HEADERS,
      ...(init.headers || {}),
    },
    signal: mergedSignal,
  };

  try {
    const response = await fetch(url, requestInit);
    const buffer = Buffer.from(await response.arrayBuffer());
    const body = buffer.toString("latin1");

    return {
      status: response.status,
      ok: response.ok,
      body,
    };
  } catch (fetchError) {
    if (isTimeoutNetworkError(fetchError)) {
      throw new Error(`Timeout ao acessar SEC (${url}).`);
    }

    try {
      return await fetchLatin1HtmlWithNodeRequest(url, requestInit);
    } catch (nodeRequestError) {
      const fetchMessage = describeNetworkError(fetchError);
      const requestMessage = describeNetworkError(nodeRequestError);
      throw new Error(
        `Falha de rede ao acessar SEC (${url}). fetch: ${fetchMessage}. request: ${requestMessage}.`,
      );
    }
  }
}

function describeNetworkError(error) {
  const message = String(error?.message || "erro de rede").trim() || "erro de rede";
  const code = String(error?.code || error?.cause?.code || "").trim();
  const causeMessage = String(error?.cause?.message || "").trim();

  const details = [];
  details.push(message);

  if (code && !details.some((item) => item.includes(code))) {
    details.push(code);
  }

  if (causeMessage && !details.some((item) => item.includes(causeMessage))) {
    details.push(causeMessage);
  }

  return details.join(" | ");
}

async function fetchLatin1HtmlWithNodeRequest(url, init = {}) {
  const requestUrl = new URL(url);
  const transport = requestUrl.protocol === "https:" ? https : http;
  const method = String(init.method || "GET").toUpperCase();
  const externalSignal = init.signal;
  const headers = {
    ...DEFAULT_HEADERS,
    ...(init.headers || {}),
  };

  const hasBody = method !== "GET" && method !== "HEAD";
  const bodyText = hasBody && init.body != null ? String(init.body) : "";
  const bodyBuffer = bodyText ? Buffer.from(bodyText, "utf8") : null;

  if (bodyBuffer && !headers["Content-Length"] && !headers["content-length"]) {
    headers["Content-Length"] = String(bodyBuffer.byteLength);
  }

  if (externalSignal?.aborted) {
    throw createAbortError();
  }

  return await new Promise((resolve, reject) => {
    let settled = false;
    let abortHandler = null;

    const finalizeResolve = (payload) => {
      if (settled) return;
      settled = true;

      if (externalSignal && abortHandler) {
        externalSignal.removeEventListener("abort", abortHandler);
      }

      resolve(payload);
    };

    const finalizeReject = (error) => {
      if (settled) return;
      settled = true;

      if (externalSignal && abortHandler) {
        externalSignal.removeEventListener("abort", abortHandler);
      }

      reject(error);
    };

    const request = transport.request(
      requestUrl,
      {
        method,
        headers,
        timeout: SEC_NETWORK_TIMEOUT_MS,
      },
      (response) => {
        const chunks = [];

        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        response.on("end", () => {
          const buffer = Buffer.concat(chunks);
          const status = Number(response.statusCode || 0);
          finalizeResolve({
            status,
            ok: status >= 200 && status < 300,
            body: buffer.toString("latin1"),
          });
        });
      },
    );

    if (externalSignal && typeof externalSignal.addEventListener === "function") {
      abortHandler = () => {
        request.destroy(createAbortError());
      };
      externalSignal.addEventListener("abort", abortHandler, { once: true });
    }

    request.on("timeout", () => {
      request.destroy(new Error("request timeout"));
    });

    request.on("error", (error) => {
      finalizeReject(error);
    });

    if (bodyBuffer) {
      request.write(bodyBuffer);
    }

    request.end();
  });
}

function assertNoAspError(html, stageLabel) {
  const hasAspRuntimeError =
    /VBScript runtime\s+error/i.test(html) ||
    /Microsoft VBScript runtime\s+error/i.test(html) ||
    /Type mismatch:/i.test(html);

  if (hasAspRuntimeError) {
    throw new Error(`SEC retornou erro ASP na etapa: ${stageLabel}.`);
  }
}

function parseSchoolSearchRows(html) {
  const rows = [];
  const rowRegex = /<tr[^>]*OnClick="Retorne\('([^']*)','([^']*)','([^']*)'\);"[^>]*>([\s\S]*?)<\/tr>/gi;

  let match = rowRegex.exec(html);
  while (match) {
    const [, codigoMec, codigoSec, anexo, rowInnerHtml] = match;
    const cells = [...String(rowInnerHtml || "").matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(
      (cellMatch) => stripHtml(cellMatch[1]),
    );

    rows.push({
      codigoMec: String(codigoMec || "").trim(),
      codigoSec: String(codigoSec || "").trim(),
      anexo: String(anexo || "").trim(),
      codigoMecAnexo: cells[0] || "",
      nome: cells[2] || "",
      depAdm: cells[3] || "",
      situacaoFuncional: cells[4] || "",
      direc: cells[5] || "",
      municipio: cells[6] || "",
      projeto: cells[7] || "",
      modalidade: cells[8] || "",
    });

    match = rowRegex.exec(html);
  }

  return rows;
}

function chooseBestSchool(schools, criteria = {}) {
  if (!Array.isArray(schools) || schools.length === 0) {
    return null;
  }

  const codigoSec = String(criteria.codigoSec || "").trim();
  const codigoMec = String(criteria.codigoMec || "").trim();
  const anexo = String(criteria.anexo || "").trim();
  const nomeEscola = String(criteria.nomeEscola || "").trim();
  const municipio = String(criteria.municipio || "").trim();

  if (codigoSec) {
    const bySec = schools.filter((school) => school.codigoSec === codigoSec);
    if (bySec.length === 1) return bySec[0];
    if (codigoMec) {
      const bySecAndMec = bySec.find((school) => school.codigoMec === codigoMec);
      if (bySecAndMec) return bySecAndMec;
    }
    if (anexo) {
      const bySecAndAnexo = bySec.find((school) => school.anexo === anexo);
      if (bySecAndAnexo) return bySecAndAnexo;
    }
    if (bySec.length > 0) return bySec[0];
  }

  if (codigoMec) {
    const byMec = schools.filter((school) => school.codigoMec === codigoMec);
    if (byMec.length === 1) return byMec[0];
    if (anexo) {
      const byMecAndAnexo = byMec.find((school) => school.anexo === anexo);
      if (byMecAndAnexo) return byMecAndAnexo;
    }
    if (byMec.length > 0) return byMec[0];
  }

  const normalizedTargetName = normalizeText(nomeEscola);
  const normalizedTargetMunicipio = normalizeText(municipio);

  if (normalizedTargetName) {
    const exactNameMatches = schools.filter(
      (school) => normalizeText(school.nome) === normalizedTargetName,
    );
    if (normalizedTargetMunicipio && exactNameMatches.length > 1) {
      const exactNameAndCityMatch = exactNameMatches.find(
        (school) => normalizeText(school.municipio) === normalizedTargetMunicipio,
      );
      if (exactNameAndCityMatch) return exactNameAndCityMatch;
    }
    if (exactNameMatches.length > 0) return exactNameMatches[0];

    const partialMatches = schools.filter((school) =>
      normalizeText(school.nome).includes(normalizedTargetName),
    );
    if (normalizedTargetMunicipio && partialMatches.length > 1) {
      const partialAndCityMatch = partialMatches.find(
        (school) => normalizeText(school.municipio) === normalizedTargetMunicipio,
      );
      if (partialAndCityMatch) return partialAndCityMatch;
    }
    if (partialMatches.length > 0) return partialMatches[0];
  }

  return schools[0] || null;
}

function parseStaffRows(html) {
  const rows = [];
  const tableRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;

  let rowMatch = tableRowRegex.exec(html);
  while (rowMatch) {
    const rowInnerHtml = rowMatch[1] || "";
    const cells = [...rowInnerHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) =>
      stripHtml(match[1]),
    );

    if (cells.length === 7) {
      const cadastroRaw = String(cells[0] || "").trim();
      const matricula = normalizeDigits(cadastroRaw);

      if (matricula.length >= 5) {
        rows.push({
          cadastro: cadastroRaw,
          matricula,
          nome: cells[1] || "",
          cargo: normalizeSecRoleLabel(cells[2] || ""),
          funcao: cells[3] || "",
          nivel: cells[4] || "",
          situacao: cells[5] || "",
          certificados: cells[6] || "",
        });
      }
    }

    rowMatch = tableRowRegex.exec(html);
  }

  return rows;
}

async function runSchoolSearch(criteria) {
  const params = new URLSearchParams();
  params.set("hdProxyLet", "");
  params.set("strCorLinhaTitulo", "#DBEAF5");
  params.set("strCorTexto", "#104A7B");
  params.set("nomeEscola", String(criteria.nomeEscola || ""));
  params.set("direc", String(criteria.direc || ""));
  params.set("Polo", String(criteria.polo || ""));
  params.set("municipio", String(criteria.municipioCodigo || ""));
  params.set("depAdm", String(criteria.depAdm || ""));
  params.set("sitFunc", String(criteria.sitFunc || ""));
  params.set("slProjeto", String(criteria.slProjeto || "0"));
  params.set("slModalidade", String(criteria.slModalidade || "0"));
  params.set("selPorte", String(criteria.selPorte || ""));
  params.set("sitImovel", String(criteria.sitImovel || "0"));

  const { ok, status, body } = await fetchLatin1Html(SEARCH_RESULTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: SEARCH_PAGE_URL,
      Origin: "http://www.sec.ba.gov.br",
    },
    body: params.toString(),
  });

  if (!ok) {
    throw new Error(`Falha ao consultar busca de escolas na SEC (HTTP ${status}).`);
  }

  assertNoAspError(body, "busca de escolas");

  return parseSchoolSearchRows(body);
}

async function loadSchoolDetail(selectedSchool) {
  const detailUrl = new URL(SCHOOL_DETAIL_URL);
  detailUrl.searchParams.set("codigo_mec", selectedSchool.codigoMec);
  detailUrl.searchParams.set("codigo_secretaria", selectedSchool.codigoSec);
  detailUrl.searchParams.set("SeqAnexo", selectedSchool.anexo || "00");

  const { ok, status, body } = await fetchLatin1Html(detailUrl.toString(), {
    method: "GET",
    headers: {
      Referer: SEARCH_PAGE_URL,
    },
  });

  if (!ok) {
    throw new Error(`Falha ao abrir detalhe da escola na SEC (HTTP ${status}).`);
  }

  assertNoAspError(body, "detalhe da escola");

  return {
    html: body,
    codigoSIA: extractInputValue(body, "codigo_SIA"),
    tipoEscola: extractInputValue(body, "tipo_escola"),
    hdCodAnexo: extractInputValue(body, "hdCodAnexo"),
    unidade: extractInputValue(body, "unidade"),
    municipio: extractInputValue(body, "municipio"),
    direc: extractInputValue(body, "direc"),
    sitAdm: extractInputValue(body, "sitadm"),
    projeto: extractDetailLabelValue(body, "Projeto\\s*:"),
    modalidade: extractDetailLabelValue(body, "Oferta\\s*de\\s*Ensino\\s*:"),
  };
}

async function loadSchoolStaffNominal(selectedSchool, detailData) {
  const listUrl = new URL(STAFF_NOMINAL_URL);
  listUrl.searchParams.set("codigo_escola", selectedSchool.codigoMec);
  listUrl.searchParams.set("codigo_secretaria", selectedSchool.codigoSec);
  listUrl.searchParams.set("SeqAnexo", selectedSchool.anexo || detailData.hdCodAnexo || "00");

  if (detailData.codigoSIA) {
    listUrl.searchParams.set("codigo_SIA", detailData.codigoSIA);
  }

  if (detailData.tipoEscola) {
    listUrl.searchParams.set("tipo_escola", detailData.tipoEscola);
  }

  if (detailData.hdCodAnexo) {
    listUrl.searchParams.set("hdCodAnexo", detailData.hdCodAnexo);
  }

  const { ok, status, body } = await fetchLatin1Html(listUrl.toString(), {
    method: "GET",
    headers: {
      Referer: SCHOOL_DETAIL_URL,
    },
  });

  if (!ok) {
    throw new Error(`Falha ao consultar quadro de servidores na SEC (HTTP ${status}).`);
  }

  assertNoAspError(body, "quadro de servidores");

  return {
    html: body,
    servidores: parseStaffRows(body),
  };
}

function buildSchoolSearchCriteria(input = {}) {
  const maxEscolasParsed = Number.parseInt(String(input.maxEscolas || "20"), 10);

  return {
    nomeEscola: String(input.nomeEscola || "").trim(),
    codigoMec: String(input.codigoMec || "").trim(),
    codigoSec: String(input.codigoSec || "").trim(),
    anexo: String(input.anexo || "").trim(),
    municipio: String(input.municipio || "").trim(),
    direc: String(input.direc || "").trim(),
    polo: String(input.polo || "").trim(),
    municipioCodigo: String(input.municipioCodigo || "").trim(),
    depAdm: String(input.depAdm || "").trim(),
    sitFunc: String(input.sitFunc || "").trim(),
    selPorte: String(input.selPorte || "").trim(),
    slProjeto: String(input.slProjeto || "0").trim(),
    slModalidade: String(input.slModalidade || "0").trim(),
    sitImovel: String(input.sitImovel || "0").trim(),
    maxEscolas: Number.isFinite(maxEscolasParsed) && maxEscolasParsed > 0 ? maxEscolasParsed : 20,
  };
}

function validateInput(criteria) {
  const hasSchoolCodes = Boolean(criteria.codigoMec && criteria.codigoSec);
  const hasSchoolName = Boolean(criteria.nomeEscola);

  if (!hasSchoolCodes && !hasSchoolName) {
    throw new Error(
      "Informe nomeEscola ou os dois codigos (codigoMec e codigoSec) para consultar servidores da escola.",
    );
  }
}

function buildSchoolFromCodes(criteria) {
  return {
    codigoMec: criteria.codigoMec,
    codigoSec: criteria.codigoSec,
    anexo: criteria.anexo || "00",
    codigoMecAnexo: `${criteria.codigoMec}/${criteria.anexo || "00"}`,
    nome: criteria.nomeEscola || "",
    depAdm: "",
    situacaoFuncional: "",
    direc: "",
    municipio: criteria.municipio || "",
    projeto: "",
    modalidade: "",
  };
}

async function resolveSchoolsForCriteria(criteria) {
  if (criteria.codigoMec && criteria.codigoSec) {
    return [buildSchoolFromCodes(criteria)];
  }

  if (criteria.nomeEscola) {
    return runSchoolSearch(criteria);
  }

  return [];
}

function buildEnrichedSelectedSchool(selectedSchool, criteria, detailData = {}) {
  return {
    ...selectedSchool,
    codigoMec: selectedSchool.codigoMec || criteria.codigoMec,
    codigoSec: selectedSchool.codigoSec || criteria.codigoSec,
    anexo: selectedSchool.anexo || criteria.anexo || detailData.hdCodAnexo || "00",
    codigoMecAnexo:
      selectedSchool.codigoMecAnexo
      || `${selectedSchool.codigoMec || criteria.codigoMec || ""}/${selectedSchool.anexo || criteria.anexo || detailData.hdCodAnexo || "00"}`,
    nome: selectedSchool.nome || detailData.unidade || criteria.nomeEscola || "",
    depAdm: selectedSchool.depAdm || detailData.tipoEscola || "",
    situacaoFuncional: selectedSchool.situacaoFuncional || detailData.sitAdm || "",
    direc: selectedSchool.direc || detailData.direc || "",
    municipio: selectedSchool.municipio || detailData.municipio || criteria.municipio || "",
    projeto: selectedSchool.projeto || detailData.projeto || "",
    modalidade: selectedSchool.modalidade || detailData.modalidade || "",
  };
}

async function loadStaffForValidation(selectedSchool) {
  try {
    const staffData = await loadSchoolStaffNominal(selectedSchool, {});
    return {
      staffData,
      detailData: null,
    };
  } catch {
    const detailData = await loadSchoolDetail(selectedSchool);
    const staffData = await loadSchoolStaffNominal(selectedSchool, detailData);
    return {
      staffData,
      detailData,
    };
  }
}

export async function fetchSecSchoolStaffFlow(input = {}) {
  const criteria = buildSchoolSearchCriteria(input);
  validateInput(criteria);

  const schools = await resolveSchoolsForCriteria(criteria);

  if (!schools.length) {
    return {
      ok: true,
      message: "Nenhuma escola encontrada para os filtros informados.",
      query: criteria,
      selectedSchool: null,
      candidateSchools: [],
      totalServidores: 0,
      servidores: [],
    };
  }

  const selectedSchool = chooseBestSchool(schools, criteria);
  if (!selectedSchool) {
    return {
      ok: true,
      message: "Nao foi possivel selecionar uma escola com os filtros enviados.",
      query: criteria,
      selectedSchool: null,
      candidateSchools: schools.slice(0, Math.max(1, criteria.maxEscolas)),
      totalServidores: 0,
      servidores: [],
    };
  }

  const detailData = await loadSchoolDetail(selectedSchool);
  const staffData = await loadSchoolStaffNominal(selectedSchool, detailData);
  const enrichedSelectedSchool = buildEnrichedSelectedSchool(selectedSchool, criteria, detailData);

  return {
    ok: true,
    query: criteria,
    selectedSchool: enrichedSelectedSchool,
    candidateSchools: schools.slice(0, Math.max(1, criteria.maxEscolas)),
    detail: {
      codigoSIA: detailData.codigoSIA,
      tipoEscola: detailData.tipoEscola,
      unidade: detailData.unidade,
      municipio: detailData.municipio,
      direc: detailData.direc,
      sitAdm: detailData.sitAdm,
      projeto: detailData.projeto,
      modalidade: detailData.modalidade,
    },
    totalServidores: staffData.servidores.length,
    servidores: staffData.servidores,
    metadata: {
      source: "SEC/BA - SIIG Sistema Escolar",
      endpoints: {
        search: SEARCH_RESULTS_URL,
        detail: SCHOOL_DETAIL_URL,
        staffNominal: STAFF_NOMINAL_URL,
      },
      fetchedAt: new Date().toISOString(),
    },
  };
}

export async function validateSecTeacherByMatricula(input = {}) {
  const targetMatricula = normalizeDigits(input.matricula);
  if (!targetMatricula) {
    throw new Error("Informe a matricula para validar na SEC.");
  }

  const criteria = buildSchoolSearchCriteria(input);
  validateInput(criteria);

  const schools = await resolveSchoolsForCriteria(criteria);

  if (!schools.length) {
    return {
      ok: true,
      message: "Nenhuma escola encontrada para os filtros informados.",
      query: criteria,
      selectedSchool: null,
      candidateSchools: [],
      totalServidores: 0,
      valid: false,
      reason: "Unidade escolar nao encontrada na SEC.",
      matricula: targetMatricula,
      matchedByMatricula: false,
      matchingRows: 0,
      sameSchool: false,
      isProfessor: false,
      servidor: null,
    };
  }

  const selectedSchool = chooseBestSchool(schools, criteria);

  if (!selectedSchool) {
    return {
      ok: true,
      message: "Nao foi possivel selecionar uma escola com os filtros enviados.",
      query: criteria,
      selectedSchool: null,
      candidateSchools: schools.slice(0, Math.max(1, criteria.maxEscolas)),
      totalServidores: 0,
      valid: false,
      reason: "Unidade escolar nao encontrada na SEC.",
      matricula: targetMatricula,
      matchedByMatricula: false,
      matchingRows: 0,
      sameSchool: false,
      isProfessor: false,
      servidor: null,
    };
  }

  const { staffData, detailData } = await loadStaffForValidation(selectedSchool);
  const servidores = Array.isArray(staffData?.servidores) ? staffData.servidores : [];
  const enrichedSelectedSchool = buildEnrichedSelectedSchool(selectedSchool, criteria, detailData || {});

  const expectedCodigoSec = String(criteria.codigoSec || "").trim();
  const expectedCodigoMec = String(criteria.codigoMec || "").trim();

  const sameSchool = Boolean(enrichedSelectedSchool)
    && (!expectedCodigoSec || String(enrichedSelectedSchool.codigoSec || "").trim() === expectedCodigoSec)
    && (!expectedCodigoMec || String(enrichedSelectedSchool.codigoMec || "").trim() === expectedCodigoMec);

  const matchingRows = servidores.filter((servidor) => {
    const matriculaRow = normalizeDigits(servidor?.matricula || servidor?.cadastro || "");
    return matriculaRow === targetMatricula;
  });

  const chosenServidor =
    matchingRows.find((servidor) => normalizeComparableText(servidor?.situacao || "").includes("ATIVIDADE"))
    || matchingRows[0]
    || null;

  const isProfessor = chosenServidor ? isTeacherRoleFromStaffRow(chosenServidor) : false;
  const hasMatch = Boolean(chosenServidor);
  const valid = Boolean(enrichedSelectedSchool && sameSchool && hasMatch);

  let reason = "";
  if (!enrichedSelectedSchool) {
    reason = "Unidade escolar nao encontrada na SEC.";
  } else if (!sameSchool) {
    reason = "A matricula foi encontrada, mas em unidade diferente da unidade selecionada.";
  } else if (!hasMatch) {
    reason = "Matricula nao localizada no quadro de servidores da unidade selecionada.";
  } else {
    reason = "Matricula validada como servidor na unidade selecionada.";
  }

  return {
    ok: true,
    query: criteria,
    selectedSchool: enrichedSelectedSchool,
    candidateSchools: schools.slice(0, Math.max(1, criteria.maxEscolas)),
    totalServidores: servidores.length,
    valid,
    reason,
    matricula: targetMatricula,
    matchedByMatricula: hasMatch,
    matchingRows: matchingRows.length,
    sameSchool,
    isProfessor,
    servidor: chosenServidor,
  };
}
