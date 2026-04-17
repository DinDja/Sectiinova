function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  };
}

function decodeHtmlEntities(value = "") {
  const namedEntities = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&ccedil;": "\u00e7",
    "&Ccedil;": "\u00c7",
    "&atilde;": "\u00e3",
    "&Atilde;": "\u00c3",
    "&otilde;": "\u00f5",
    "&Otilde;": "\u00d5",
    "&aacute;": "\u00e1",
    "&Aacute;": "\u00c1",
    "&eacute;": "\u00e9",
    "&Eacute;": "\u00c9",
    "&iacute;": "\u00ed",
    "&Iacute;": "\u00cd",
    "&oacute;": "\u00f3",
    "&Oacute;": "\u00d3",
    "&uacute;": "\u00fa",
    "&Uacute;": "\u00da",
    "&agrave;": "\u00e0",
    "&Agrave;": "\u00c0",
    "&ecirc;": "\u00ea",
    "&Ecirc;": "\u00ca",
    "&ocirc;": "\u00f4",
    "&Ocirc;": "\u00d4",
    "&uuml;": "\u00fc",
    "&Uuml;": "\u00dc",
  };

  let decoded = String(value || "");
  Object.entries(namedEntities).forEach(([entity, char]) => {
    decoded = decoded.split(entity).join(char);
  });

  decoded = decoded.replace(/&#(\d+);/g, (_, code) => {
    const parsed = Number(code);
    return Number.isFinite(parsed) ? String.fromCharCode(parsed) : "";
  });

  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    const parsed = Number.parseInt(hex, 16);
    return Number.isFinite(parsed) ? String.fromCharCode(parsed) : "";
  });

  return decoded;
}

function decodeJavaScriptEscapes(value = "") {
  return String(value || "")
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => {
      const parsed = Number.parseInt(hex, 16);
      return Number.isFinite(parsed) ? String.fromCharCode(parsed) : "";
    })
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
      const parsed = Number.parseInt(hex, 16);
      return Number.isFinite(parsed) ? String.fromCharCode(parsed) : "";
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

function normalizeInlineWhitespace(value = "") {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTextBlock(value = "") {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripHtml(value = "") {
  return normalizeInlineWhitespace(
    decodeHtmlEntities(
      String(value || "")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, " "),
    ),
  );
}

function stripHtmlToText(value = "") {
  const withoutScripts = String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");

  const withLineBreaks = withoutScripts
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|table)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return normalizeTextBlock(fixCommonMojibake(decodeHtmlEntities(withLineBreaks)));
}

function toTextLines(value = "") {
  return normalizeTextBlock(value)
    .split("\n")
    .map((line) => normalizeInlineWhitespace(line))
    .filter(Boolean);
}

function uniqueNonEmpty(values = []) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    const normalized = normalizeInlineWhitespace(value);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function normalizeForSearch(value = "") {
  return fixCommonMojibake(decodeHtmlEntities(String(value || "")))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function sanitizeListItem(value = "") {
  return normalizeInlineWhitespace(
    String(value || "")
      .replace(/^[\-\*\u2022\u25aa\u25cf\d\.\)\s]+/, "")
      .replace(/[\s\u00a0]+/g, " "),
  );
}

function extractLattesNumericId(value = "") {
  const matched = String(value || "").match(/(\d{16})/);
  return matched?.[1] || "";
}

function extractLattesNumericIdFromHtml(html = "") {
  const text = String(html || "");
  return (
    text.match(/lattes\.cnpq\.br\/(\d{16})/i)?.[1]
    || text.match(/["']id_lattes["']\s*[:=]\s*["']?(\d{16})/i)?.[1]
    || ""
  );
}

function prepareHtmlInput(value = "") {
  const raw = String(value || "");
  let prepared = decodeJavaScriptEscapes(raw);

  const hasRealTags = /<(html|body|div|table|h[1-6]|p|li)\b/i.test(prepared);
  const hasEscapedTags = /&lt;(html|body|div|table|h[1-6]|p|li|!doctype)\b/i.test(
    prepared,
  );

  if (!hasRealTags && hasEscapedTags) {
    prepared = decodeHtmlEntities(prepared);
  }

  prepared = fixCommonMojibake(prepared);
  return prepared.trim();
}

function extractIdHash(html = "") {
  return (
    html.match(/name=["']id["'][^>]*value=["']([^"']+)["']/i)?.[1]
    || html.match(/id=["']id["'][^>]*value=["']([^"']+)["']/i)?.[1]
    || html.match(/name=["']id_hash["'][^>]*value=["']([^"']+)["']/i)?.[1]
    || ""
  );
}

function findFirstMatch(value = "", patterns = []) {
  let bestMatch = null;

  for (const pattern of patterns) {
    const safePattern = new RegExp(pattern.source, pattern.flags.replace(/g/g, ""));
    const match = safePattern.exec(value);
    if (!match || !Number.isInteger(match.index)) {
      continue;
    }

    if (!bestMatch || match.index < bestMatch.index) {
      bestMatch = match;
    }
  }

  return bestMatch;
}

function extractSectionChunk(
  html = "",
  startPatterns = [],
  boundaryPatterns = [],
  maxLength = 28000,
) {
  const startMatch = findFirstMatch(html, startPatterns);
  if (!startMatch || !Number.isInteger(startMatch.index)) {
    return "";
  }

  const afterStart = html.slice(startMatch.index + startMatch[0].length);
  let endOffset = afterStart.length;

  for (const pattern of boundaryPatterns) {
    const safePattern = new RegExp(pattern.source, pattern.flags.replace(/g/g, ""));
    const boundaryMatch = safePattern.exec(afterStart);
    if (!boundaryMatch || !Number.isInteger(boundaryMatch.index)) {
      continue;
    }

    if (boundaryMatch.index < endOffset) {
      endOffset = boundaryMatch.index;
    }
  }

  if (Number.isFinite(maxLength)) {
    endOffset = Math.min(endOffset, maxLength);
  }

  return html.slice(
    startMatch.index,
    startMatch.index + startMatch[0].length + Math.max(0, endOffset),
  );
}

function extractListItemsFromHtml(sectionHtml = "") {
  const items = [];
  const listMatches = sectionHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);

  for (const match of listMatches) {
    const text = sanitizeListItem(stripHtml(match[1]));
    if (text) {
      items.push(text);
    }
  }

  if (items.length > 0) {
    return [...new Set(items)];
  }

  const tableRowMatches = sectionHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  for (const rowMatch of tableRowMatches) {
    const columns = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((match) => sanitizeListItem(stripHtml(match[1])))
      .filter(Boolean);

    if (columns.length > 0) {
      items.push(columns.join(" | "));
    }
  }

  return [...new Set(items)];
}

function removeHeadingLikeLines(lines = [], headingTerms = []) {
  return lines.filter((line) => {
    const normalized = normalizeForSearch(line);
    const isHeading = headingTerms.some((term) => {
      return (
        normalized === term
        || normalized.startsWith(`${term}:`)
        || (normalized.startsWith(term) && normalized.length <= term.length + 40)
      );
    });

    if (!isHeading) {
      return true;
    }

    return line.length > 140;
  });
}

function splitPotentialListLine(line = "") {
  if (line.includes(" | ")) {
    return line.split(" | ");
  }
  if (line.includes(" ; ")) {
    return line.split(" ; ");
  }
  if (line.includes("; ")) {
    return line.split("; ");
  }
  if (line.includes(" \u00b7 ")) {
    return line.split(" \u00b7 ");
  }
  return [line];
}

function extractListItemsFromSection(sectionHtml = "", headingTerms = []) {
  const fromHtml = extractListItemsFromHtml(sectionHtml);
  if (fromHtml.length > 0) {
    return uniqueNonEmpty(fromHtml);
  }

  const textLines = toTextLines(stripHtmlToText(sectionHtml));
  const contentLines = removeHeadingLikeLines(textLines, headingTerms)
    .flatMap((line) => splitPotentialListLine(line))
    .map((line) => sanitizeListItem(line))
    .filter(Boolean)
    .filter((line) => line.length >= 3)
    .filter((line) => {
      const normalized = normalizeForSearch(line);
      return !headingTerms.some((term) => normalized === term);
    });

  return uniqueNonEmpty(contentLines);
}

function cleanPotentialName(value = "") {
  let cleaned = stripHtml(value)
    .replace(/\s*-\s*curr[i\u00ed]culo.*$/i, "")
    .replace(/^curr[i\u00ed]culo.*\(([^)]+)\).*$/i, "$1")
    .trim();

  if (cleaned.includes("|")) {
    cleaned = cleaned.split("|")[0].trim();
  }

  return cleaned;
}

function isLikelyPersonName(value = "") {
  const cleaned = normalizeInlineWhitespace(value);
  if (!cleaned || cleaned.length < 4 || cleaned.length > 140) {
    return false;
  }

  if ((cleaned.match(/\d/g) || []).length >= 5) {
    return false;
  }

  const normalized = normalizeForSearch(cleaned);
  const forbidden = [
    "curriculo",
    "lattes",
    "erro",
    "problema",
    "pagina",
    "sistema",
    "servico",
    "acesso negado",
  ];

  return !forbidden.some((term) => normalized.includes(term));
}

function extractNome(html = "") {
  const candidates = [
    html.match(/Curr[i\u00ed]culo do Sistema de Curr[i\u00ed]culos Lattes\s*\(([^)]+)\)/i)?.[1],
    html.match(/<h[12][^>]*class=["'][^"']*nome[^"']*["'][^>]*>([\s\S]*?)<\/h[12]>/i)?.[1],
    html.match(/<span[^>]*class=["'][^"']*nome[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1],
    html.match(/<div[^>]*class=["'][^"']*nome[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1],
    html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1],
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
  ]
    .map((item) => cleanPotentialName(item || ""))
    .filter(Boolean);

  const valid = candidates.find((candidate) => isLikelyPersonName(candidate));
  return valid || "";
}

const SECTION_BOUNDARIES = [
  /<h[1-6][^>]*>/i,
  /Resumo informado pelo autor/i,
  /[\u00c1A]reas?\s+de\s+atua[\u00e7c][\u00e3a]o/i,
  /Forma[\u00e7c][\u00e3a]o\s+acad[\u00eae]mica/i,
  /Atua[\u00e7c][\u00e3a]o\s+profissional/i,
  /Produ[\u00e7c][\u00e3a]o\s+bibliogr[a\u00e1]fica/i,
  /Projetos?\s+de\s+pesquisa/i,
  /Idiomas?/i,
];

function decodeJsonLikeValue(value = "") {
  return normalizeInlineWhitespace(
    fixCommonMojibake(
      decodeHtmlEntities(
        decodeJavaScriptEscapes(String(value || ""))
          .replace(/\\n/g, " ")
          .replace(/\\r/g, " ")
          .replace(/\\t/g, " ")
          .replace(/\\\//g, "/")
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'"),
      ),
    ),
  );
}

function extractJsonLikeString(html = "", keys = []) {
  for (const key of keys) {
    const pattern = new RegExp(
      `["']${key}["']\\s*:\\s*["']([\\s\\S]{4,6000}?)['"]`,
      "i",
    );
    const matched = html.match(pattern)?.[1] || "";
    const decoded = decodeJsonLikeValue(matched);
    if (decoded) {
      return decoded;
    }
  }

  return "";
}

function extractJsonLikeList(html = "", keys = []) {
  for (const key of keys) {
    const pattern = new RegExp(
      `["']${key}["']\\s*:\\s*\\[([\\s\\S]{4,12000}?)\\]`,
      "i",
    );
    const listBlock = html.match(pattern)?.[1] || "";
    if (!listBlock) {
      continue;
    }

    const quotedItems = [...listBlock.matchAll(/["']([\\s\\S]*?)["']/g)]
      .map((match) => decodeJsonLikeValue(match[1]))
      .map((item) => sanitizeListItem(item))
      .filter(Boolean);

    if (quotedItems.length > 0) {
      return uniqueNonEmpty(quotedItems);
    }

    const separated = listBlock
      .split(",")
      .map((item) => decodeJsonLikeValue(item))
      .map((item) => sanitizeListItem(item))
      .filter(Boolean);

    if (separated.length > 0) {
      return uniqueNonEmpty(separated);
    }
  }

  return [];
}

function extractResumo(html = "") {
  const resumoSection = extractSectionChunk(
    html,
    [
      /Resumo informado pelo autor/i,
      />\s*Resumo\s*</i,
      /class=["'][^"']*resumo[^"']*["']/i,
      /id=["']resumo["']/i,
    ],
    SECTION_BOUNDARIES,
    22000,
  );

  if (!resumoSection) {
    return "";
  }

  const paragraphCandidate = stripHtml(
    resumoSection.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || "",
  );
  if (paragraphCandidate && paragraphCandidate.length > 25) {
    return paragraphCandidate.slice(0, 4000);
  }

  const classCandidate = stripHtml(
    resumoSection.match(/<div[^>]*class=["'][^"']*resumo[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] || "",
  );
  if (classCandidate && classCandidate.length > 25) {
    return classCandidate.slice(0, 4000);
  }

  const jsonResumo = extractJsonLikeString(html, [
    "resumo",
    "resumo_profissional",
    "resumoProfissional",
    "summary",
    "biografia",
  ]);
  if (jsonResumo && jsonResumo.length > 25) {
    return jsonResumo.slice(0, 4000);
  }

  const textLines = removeHeadingLikeLines(
    toTextLines(stripHtmlToText(resumoSection)),
    ["resumo", "resumo informado pelo autor"],
  );

  return normalizeInlineWhitespace(textLines.join(" ")).slice(0, 4000);
}

function extractAreasAtuacao(html = "") {
  const areasSection = extractSectionChunk(
    html,
    [
      /[\u00c1A]reas?\s+de\s+atua[\u00e7c][\u00e3a]o/i,
      /Areas?\s+de\s+atuacao/i,
      /class=["'][^"']*(areas?|atuacao)[^"']*["']/i,
    ],
    SECTION_BOUNDARIES,
    30000,
  );

  const items = extractListItemsFromSection(areasSection, [
    "areas de atuacao",
    "area de atuacao",
  ]);

  if (items.length > 0) {
    return uniqueNonEmpty(items).slice(0, 80);
  }

  const jsonItems = extractJsonLikeList(html, [
    "areas_atuacao",
    "areasAtuacao",
    "areas",
    "area_atuacao",
    "atuacoes",
  ]);

  if (jsonItems.length > 0) {
    return uniqueNonEmpty(jsonItems).slice(0, 80);
  }

  return [];
}

function extractFormacaoAcademica(html = "") {
  const formacaoSection = extractSectionChunk(
    html,
    [
      /Forma[\u00e7c][\u00e3a]o\s+acad[\u00eae]mica\/titula[\u00e7c][\u00e3a]o/i,
      /Formacao\s+academica\/titulacao/i,
      /Forma[\u00e7c][\u00e3a]o\s+acad[\u00eae]mica/i,
      /class=["'][^"']*(formacao|titulacao|educacao)[^"']*["']/i,
    ],
    SECTION_BOUNDARIES,
    36000,
  );

  const items = extractListItemsFromSection(formacaoSection, [
    "formacao academica",
    "formacao academica/titulacao",
  ]);

  if (items.length > 0) {
    return uniqueNonEmpty(items).slice(0, 120);
  }

  const jsonItems = extractJsonLikeList(html, [
    "formacao_academica",
    "formacaoAcademica",
    "formacao",
    "titulacao",
    "educacao",
  ]);

  if (jsonItems.length > 0) {
    return uniqueNonEmpty(jsonItems).slice(0, 120);
  }

  return [];
}

function extractUltimaAtualizacao(html = "") {
  const candidates = [
    html.match(/[\u00daU]ltima atualiza[\u00e7c][\u00e3a]o do curr[i\u00ed]culo em\s*([^<\n]+)/i)?.[1],
    html.match(/ultima atualizacao(?: do curriculo)?\s*[:\-]\s*([^<\n]+)/i)?.[1],
    html.match(/atualizado em\s*([^<\n]+)/i)?.[1],
  ]
    .map((value) => stripHtml(value || ""))
    .filter(Boolean);

  return candidates[0] || "";
}

function detectCaptchaPage(html = "") {
  return /tokenCaptchar|divCaptcha|c[o\u00f3]digo de seguran[\u00e7c]a|g-recaptcha|hcaptcha|captcha|cf-chl/i.test(
    html,
  );
}

function detectErrorPage(html = "") {
  if (/<title[^>]*>\s*erro\s*<\/title>/i.test(html)) {
    return "O portal do CNPq retornou uma pagina de erro ao abrir o curriculo.";
  }

  const normalizedText = normalizeForSearch(stripHtmlToText(html).slice(0, 4500));
  const errorMarkers = [
    "ocorreu um problema ao exibir a pagina requisitada",
    "servico temporariamente indisponivel",
    "acesso negado",
    "access denied",
    "forbidden",
    "attention required",
    "pagina nao encontrada",
  ];

  if (errorMarkers.some((marker) => normalizedText.includes(marker))) {
    return "O portal do CNPq respondeu com pagina de erro/bloqueio e nao com o curriculo.";
  }

  return "";
}

function detectIframeShellOnly(html = "") {
  const raw = String(html || "");
  const hasIframeLattes = /<iframe[\s\S]*lattes\.cnpq\.br\/\d{16}[\s\S]*>/i.test(raw);
  if (!hasIframeLattes) {
    return false;
  }

  const curriculumMarkers = /curr[i\u00ed]culo|resumo informado|[\u00e1a]reas? de atua[\u00e7c][\u00e3a]o|forma[\u00e7c][\u00e3a]o acad|ultima atualiza[\u00e7c][\u00e3a]o|id_lattes/i;
  const visibleText = stripHtmlToText(raw);

  return !curriculumMarkers.test(raw) && visibleText.length < 300;
}

function parseLattesHtml(rawHtml = "", normalizedLink = "", idLattes = "") {
  const html = prepareHtmlInput(rawHtml);
  const inferredId = idLattes || extractLattesNumericIdFromHtml(html);
  const idHash = extractIdHash(html);

  if (!html) {
    return {
      success: false,
      requiresCaptcha: false,
      message: "Nenhum HTML valido foi informado para extracao.",
      data: {
        id_lattes: inferredId || "",
        id_hash: idHash,
        link: normalizedLink,
      },
    };
  }

  if (detectIframeShellOnly(html)) {
    return {
      success: false,
      requiresCaptcha: false,
      message:
        "Foi recebido apenas o elemento iframe, sem o HTML interno do curriculo. Copie o codigo-fonte completo da pagina do curriculo dentro do iframe.",
      data: {
        id_lattes: inferredId || "",
        id_hash: idHash,
        link: normalizedLink,
      },
    };
  }

  if (detectCaptchaPage(html)) {
    return {
      success: false,
      requiresCaptcha: true,
      message:
        "O portal do CNPq solicitou CAPTCHA e bloqueou a leitura automatica. Tente novamente mais tarde.",
      data: {
        id_lattes: inferredId || "",
        id_hash: idHash,
        link: normalizedLink,
      },
    };
  }

  const errorMessage = detectErrorPage(html);
  if (errorMessage) {
    return {
      success: false,
      requiresCaptcha: false,
      message: errorMessage,
      data: {
        id_lattes: inferredId || "",
        id_hash: idHash,
        link: normalizedLink,
      },
    };
  }

  const nome = extractNome(html);
  const resumo = extractResumo(html);
  const areasAtuacao = extractAreasAtuacao(html);
  const formacaoAcademica = extractFormacaoAcademica(html);
  const ultimaAtualizacao = extractUltimaAtualizacao(html);

  const hasUsefulData = Boolean(
    nome
      || resumo
      || ultimaAtualizacao
      || areasAtuacao.length > 0
      || formacaoAcademica.length > 0,
  );

  if (!hasUsefulData) {
    return {
      success: false,
      requiresCaptcha: false,
      message:
        "Nao foi possivel extrair campos do curriculo a partir do conteudo informado.",
      data: {
        id_lattes: inferredId || "",
        id_hash: idHash,
        link: normalizedLink,
      },
    };
  }

  return {
    success: true,
    requiresCaptcha: false,
    message: "",
    data: {
      id_lattes: inferredId || "",
      id_hash: idHash,
      link: normalizedLink,
      nome,
      resumo,
      areas_atuacao: areasAtuacao,
      formacao_academica: formacaoAcademica,
      ultima_atualizacao: ultimaAtualizacao,
      fonte: "lattes-cnpq",
      sincronizado_em: new Date().toISOString(),
    },
  };
}

async function extractLattesFromLink(link = "") {
  const trimmedLink = String(link || "").trim();
  if (!trimmedLink) {
    return {
      success: false,
      requiresCaptcha: false,
      message: "Informe o link do Curriculo Lattes.",
      data: null,
    };
  }

  let normalizedLink = trimmedLink;
  const numericId = extractLattesNumericId(trimmedLink);

  if (numericId) {
    normalizedLink = `https://lattes.cnpq.br/${numericId}`;
  } else {
    try {
      const parsed = new URL(trimmedLink);
      if (!/^https?:$/i.test(parsed.protocol)) {
        throw new Error("Protocolo invalido");
      }
      normalizedLink = parsed.toString();
    } catch {
      return {
        success: false,
        requiresCaptcha: false,
        message: "Link do Lattes invalido.",
        data: null,
      };
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  let response;
  try {
    response = await fetch(normalizedLink, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "SECTI-Lattes-Extractor/1.1",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
  } catch (error) {
    clearTimeout(timeout);
    return {
      success: false,
      requiresCaptcha: false,
      message:
        error?.name === "AbortError"
          ? "Tempo limite excedido ao consultar o link do Lattes."
          : "Falha de rede ao consultar o link do Lattes.",
      data: null,
    };
  }

  clearTimeout(timeout);

  if (!response.ok) {
    return {
      success: false,
      requiresCaptcha: false,
      message: `Falha ao consultar o link do Lattes (HTTP ${response.status}).`,
      data: null,
    };
  }

  const html = await response.text();
  const effectiveLink = response.url || normalizedLink;
  const effectiveId = extractLattesNumericId(effectiveLink) || numericId;
  return parseLattesHtml(html, effectiveLink, effectiveId);
}

function extractLattesFromHtml({ link = "", html = "" }) {
  const rawHtml = String(html || "");
  if (!rawHtml.trim()) {
    return {
      success: false,
      requiresCaptcha: false,
      message: "Informe o HTML da pagina do curriculo para extracao.",
      data: null,
    };
  }

  const trimmedLink = String(link || "").trim();
  const htmlId = extractLattesNumericIdFromHtml(rawHtml);
  const linkId = extractLattesNumericId(trimmedLink);
  const effectiveId = linkId || htmlId;
  const normalizedLink = effectiveId
    ? `https://lattes.cnpq.br/${effectiveId}`
    : trimmedLink;

  const parsed = parseLattesHtml(rawHtml, normalizedLink, effectiveId);
  if (parsed.success) {
    return {
      ...parsed,
      data: {
        ...(parsed.data || {}),
        fonte: "lattes-cnpq-html-colado",
      },
    };
  }

  return parsed;
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, {
      success: false,
      error: "Metodo nao suportado. Use POST.",
    });
  }

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(String(event.body || ""), "base64").toString("utf8")
      : String(event.body || "");
    const body = rawBody ? JSON.parse(rawBody) : {};
    const link = String(body?.link || "");
    const html = String(body?.html || "");

    const result = html.trim()
      ? extractLattesFromHtml({ link, html })
      : await extractLattesFromLink(link);

    return json(200, result);
  } catch (error) {
    return json(502, {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Falha inesperada ao consultar dados do Lattes.",
    });
  }
}