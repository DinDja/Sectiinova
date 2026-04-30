import http from "node:http";
import https from "node:https";

const BOT_NAME = "SECTI-POP-Eventos-Bot/1.0";
const DEFAULT_YEAR = 2026;
const MIN_YEAR = 2020;
const MAX_YEAR = 2038;
const QUICK_MODE = "quick";
const FULL_MODE = "full";
const QUICK_TIME_BUDGET_MS = 16000;
const FULL_TIME_BUDGET_MS = 42000;
const QUICK_SOURCE_TIMEOUT_MS = 6500;
const FULL_SOURCE_TIMEOUT_MS = 9000;
const DEFAULT_MAX_EVENTS_PER_SOURCE = 4;
const WOMEN_FOCUS_MAX_EVENTS_PER_SOURCE = 8;
const DEFAULT_MAX_SOURCES = 28;
const MAX_MAX_SOURCES = 40;
const MAX_EVENTS_RETURNED = 140;
const MAX_ANCHOR_SCAN = 260;
const QUICK_MAX_CONCURRENT = 6;
const FULL_MAX_CONCURRENT = 8;
const MAX_DESCRIPTION_LENGTH = 1400;
const WOMEN_FOCUS_GROUP = "protagonismo_feminino";
const FAPESB_GROUP = "fapesb";
const FAPESB_SOURCE_ID = "fapesb";

const EVENT_KEYWORDS = [
  "evento",
  "eventos",
  "edital",
  "editais",
  "olimpiada",
  "olimpiadas",
  "competicao",
  "competicoes",
  "inscricao",
  "inscricoes",
  "hackathon",
  "desafio",
  "mostra",
  "feira",
  "jornada",
  "congresso",
  "forum",
  "programa",
  "chamada",
  "cronograma",
  "calendario",
  "prova",
  "premiacao",
  "trilha",
];

const DATE_KEYWORDS = [
  "inscricao",
  "inscricoes",
  "prazo",
  "data limite",
  "etapa",
  "resultado",
  "prova",
  "calendario",
  "cronograma",
  "edital",
];

const EXCLUDED_TITLE_HINTS = [
  "login",
  "entrar",
  "acessibilidade",
  "politica de privacidade",
  "cookies",
  "termos de uso",
  "fale conosco",
  "contato",
  "home",
  "inicio",
  "instagram",
  "facebook",
  "youtube",
  "linkedin",
  "whatsapp",
  "main menu",
  "mapa do site",
  "logomarcas",
  "galeria de fotos",
  "olimpiadas anteriores",
  "site de provas",
  "coordenacao nacional",
  "coordenacoes estaduais",
  "comite nacional",
  "comite internacional",
  "canal oba e obafog",
  "destaque geral",
  "aqui em pdf",
  "olimpiadas internacionais",
  "cartazes, certificados e medalhas",
  "downloads oba e obafog",
  "contato oba e obafog",
  "programa nacional olimpiadas de quimica",
  "site de provas/inscricoes",
  "estude com a obquimica",
];

const NAVIGATION_NOISE_HINTS = [
  "menu",
  "main menu",
  "contato",
  "contatos",
  "eventos",
  "editais",
  "inicio",
  "home",
  "acessibilidade",
  "atendimento",
  "imprensa",
  "institucional",
  "sobre",
];

const CATEGORY_TITLE_HINTS = [
  "dicas e tutoriais",
  "noticia",
  "noticias",
  "geral",
  "eventos",
  "ler mais",
  "main menu",
  "mapa do site",
  "logomarcas",
  "galeria de fotos",
  "olimpiadas anteriores",
  "coordenacao nacional",
  "coordenacoes estaduais",
  "comite nacional",
  "comite internacional",
  "canal oba e obafog",
  "destaque geral",
  "aqui em pdf",
  "olimpiadas internacionais",
  "cartazes, certificados e medalhas",
  "downloads oba e obafog",
  "contato oba e obafog",
  "programa nacional olimpiadas de quimica",
  "estude com a obquimica",
];

const TITLE_STRONG_EVENT_HINTS = [
  "regulamento",
  "edital",
  "inscricao",
  "seletiva",
  "resultado",
  "chamada",
  "prova",
  "hackathon",
  "convocatoria",
  "convocacao",
  "cronograma",
];

const TRACKING_NOISE_HINTS = [
  "wp-content",
  "srcset",
  "facebook_event_name",
  "gtag",
  "googletag",
  "google_tag",
  "onclick",
  "utm_",
  "data:image",
];

const WOMEN_PROTAGONISM_KEYWORDS = [
  "competicao feminina",
  "olimpiada feminina",
  "protagonismo feminino",
  "lideranca feminina",
  "mulheres na ciencia",
  "mulheres na tecnologia",
  "meninas na tecnologia",
  "programa para mulheres",
  "publico feminino",
  "equidade de genero",
  "igualdade de genero",
  "mulher",
  "mulheres",
  "menina",
  "meninas",
  "garota",
  "garotas",
  "alunas",
  "feminino",
  "feminina",
  "cf-obi",
];

const WOMEN_PROTAGONISM_LABEL = "Protagonismo Feminino";
const EDUCATION_AUDIENCE_LABEL = "Foco em Escolas e Clubes";

const EDUCATION_AUDIENCE_KEYWORDS = [
  "ensino medio",
  "ensino fundamental",
  "educacao basica",
  "educacao profissional e tecnologica",
  "rede estadual",
  "rede publica estadual",
  "clube de ciencias",
  "clubes de ciencias",
  "professor",
  "professora",
  "professores",
  "professoras",
  "estudante",
  "estudantes",
  "educacao cientifica",
  "popularizacao da ciencia",
  "iniciacao cientifica",
  "jovens",
  "escola",
  "escolas",
  "bahia faz ciencia na escola",
];

const MONTHS_PT = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  marcoo: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

const POP_EVENT_SOURCES = [
  {
    id: "sec_ba",
    name: "Secretaria da Educacao do Estado da Bahia",
    group: "bahia",
    groupLabel: "Bahia",
    url: "https://www.ba.gov.br/educacao",
    priority: 1,
    tags: ["bahia", "educacao", "ept", "edital"],
  },
  {
    id: "iat_ba",
    name: "Instituto Anisio Teixeira",
    group: "bahia",
    groupLabel: "Bahia",
    url: "https://www.iat.educacao.ba.gov.br",
    priority: 2,
    tags: ["bahia", "evento", "formacao", "pedagogico"],
  },
  {
    id: "ifba",
    name: "Instituto Federal da Bahia (IFBA)",
    group: "universidades",
    groupLabel: "Institutos e Universidades",
    url: "https://portal.ifba.edu.br",
    priority: 3,
    tags: ["instituto federal", "ifba", "feira", "tecnologia"],
  },
  {
    id: "ifbaiano",
    name: "Instituto Federal Baiano",
    group: "universidades",
    groupLabel: "Institutos e Universidades",
    url: "https://www.ifbaiano.edu.br",
    priority: 4,
    tags: ["instituto federal", "if baiano", "evento"],
  },
  {
    id: "ufba",
    name: "Universidade Federal da Bahia (UFBA)",
    group: "universidades",
    groupLabel: "Institutos e Universidades",
    url: "https://www.ufba.br",
    priority: 5,
    tags: ["ufba", "semana academica", "feira"],
  },
  {
    id: "uneb",
    name: "Universidade do Estado da Bahia (UNEB)",
    group: "universidades",
    groupLabel: "Institutos e Universidades",
    url: "https://www.uneb.br",
    priority: 6,
    tags: ["uneb", "extensao", "evento"],
  },
  {
    id: "fapesb",
    name: "FAPESB",
    group: "bahia",
    groupLabel: "Bahia",
    url: "https://www.fapesb.ba.gov.br/?s=edital",
    apiUrl: "https://www.fapesb.ba.gov.br/wp-json/wp/v2/posts?per_page=100&_embed=1",
    apiSearchUrls: [
      "https://www.fapesb.ba.gov.br/wp-json/wp/v2/posts?per_page=50&search=clubes%20de%20ciencias%20bahia%20faz%20ciencia%20na%20escola&_embed=1",
      "https://www.fapesb.ba.gov.br/wp-json/wp/v2/posts?per_page=50&search=educacao%20basica%20professores%20rede%20estadual&_embed=1",
    ],
    allowInsecureTls: true,
    minTimeoutMs: 9000,
    maxEventsPerSource: 14,
    priority: 6.5,
    tags: [
      "fapesb",
      "edital",
      "chamada",
      "pesquisa",
      "inovacao",
      "ensino medio",
      "clube de ciencias",
      "professores da rede estadual",
      "bahia faz ciencia na escola",
    ],
  },
  {
    id: "mec",
    name: "Ministerio da Educacao",
    group: "governo_federal",
    groupLabel: "Governo Federal",
    url: "https://www.gov.br/mec",
    priority: 7,
    tags: ["mec", "edital", "programa"],
  },
  {
    id: "mcti",
    name: "Ministerio da Ciencia, Tecnologia e Inovacao",
    group: "governo_federal",
    groupLabel: "Governo Federal",
    url: "https://www.gov.br/mcti",
    priority: 8,
    tags: ["mcti", "inovacao", "olimpiada", "feira"],
  },
  {
    id: "capes",
    name: "CAPES",
    group: "governo_federal",
    groupLabel: "Governo Federal",
    url: "https://www.gov.br/capes",
    priority: 9,
    tags: ["capes", "programa", "edital"],
  },
  {
    id: "cnpq",
    name: "CNPq",
    group: "governo_federal",
    groupLabel: "Governo Federal",
    url: "https://www.gov.br/cnpq",
    priority: 10,
    tags: ["cnpq", "iniciacao cientifica", "chamada"],
  },
  {
    id: "finep",
    name: "FINEP",
    group: "governo_federal",
    groupLabel: "Governo Federal",
    url: "https://www.finep.gov.br/chamadas-publicas",
    priority: 10.5,
    tags: ["finep", "edital", "chamada", "inovacao", "subvencao"],
  },
  {
    id: "obmep",
    name: "OBMEP",
    group: "olimpiadas",
    groupLabel: "Olimpiadas",
    url: "https://www.obmep.org.br/calendario.htm",
    priority: 11,
    tags: ["obmep", "olimpiada", "calendario"],
  },
  {
    id: "oba",
    name: "OBA",
    group: "olimpiadas",
    groupLabel: "Olimpiadas",
    url: "http://www.oba.org.br/site",
    priority: 12,
    tags: ["oba", "olimpiada", "astronomia"],
  },
  {
    id: "obf",
    name: "OBF",
    group: "olimpiadas",
    groupLabel: "Olimpiadas",
    url: "https://www1.fisica.org.br/olimpiada/2026/index.php/calendario",
    priority: 13,
    tags: ["obf", "olimpiada", "fisica"],
  },
  {
    id: "obq",
    name: "OBQ",
    group: "olimpiadas",
    groupLabel: "Olimpiadas",
    url: "http://www.obquimica.org",
    priority: 14,
    tags: ["obq", "olimpiada", "quimica"],
  },
  {
    id: "obi",
    name: "OBI",
    group: "olimpiadas",
    groupLabel: "Olimpiadas",
    url: "https://olimpiada.ic.unicamp.br",
    priority: 15,
    tags: ["obi", "olimpiada", "informatica"],
  },
  {
    id: "onc",
    name: "ONC",
    group: "olimpiadas",
    groupLabel: "Olimpiadas",
    url: "https://www.onciencias.org",
    priority: 16,
    tags: ["onc", "olimpiada", "ciencias"],
  },
  {
    id: "obr",
    name: "OBR",
    group: "olimpiadas",
    groupLabel: "Olimpiadas",
    url: "http://www.obr.org.br",
    priority: 17,
    tags: ["obr", "olimpiada", "robotica"],
  },
  {
    id: "senai",
    name: "SENAI",
    group: "sistema_s",
    groupLabel: "Sistema S",
    url: "https://www.portaldaindustria.com.br/senai",
    priority: 18,
    tags: ["senai", "robotica", "tecnico"],
  },
  {
    id: "senac",
    name: "SENAC",
    group: "sistema_s",
    groupLabel: "Sistema S",
    url: "https://www.senac.br",
    priority: 19,
    tags: ["senac", "inovacao", "evento"],
  },
  {
    id: "sesi",
    name: "SESI",
    group: "sistema_s",
    groupLabel: "Sistema S",
    url: "https://www.portaldaindustria.com.br/sesi",
    priority: 20,
    tags: ["sesi", "educacao", "evento"],
  },
  {
    id: "sebrae",
    name: "SEBRAE",
    group: "inovacao",
    groupLabel: "Tecnologia e Inovacao",
    url: "https://sebrae.com.br/sites/PortalSebrae",
    priority: 21,
    tags: ["sebrae", "empreendedorismo", "competicao"],
  },
  {
    id: "campus_party",
    name: "Campus Party",
    group: "inovacao",
    groupLabel: "Tecnologia e Inovacao",
    url: "https://brasil.campus-party.org",
    priority: 22,
    tags: ["campus party", "tecnologia", "evento"],
  },
  {
    id: "hackathon_brasil",
    name: "Hackathon Brasil",
    group: "inovacao",
    groupLabel: "Tecnologia e Inovacao",
    url: "https://hackathonbrasil.com.br",
    priority: 23,
    tags: ["hackathon", "desafio", "tecnologia"],
  },
  {
    id: "google_edu",
    name: "Google for Education",
    group: "inovacao",
    groupLabel: "Tecnologia e Inovacao",
    url: "https://edu.google.com/intl/ALL_br",
    priority: 24,
    tags: ["google", "educacao", "programa"],
  },
  {
    id: "microsoft_learn",
    name: "Microsoft Learn",
    group: "inovacao",
    groupLabel: "Tecnologia e Inovacao",
    url: "https://learn.microsoft.com/pt-br/training",
    priority: 25,
    tags: ["microsoft", "learn", "desafio"],
  },
  {
    id: "sympla",
    name: "Sympla",
    group: "agregadores",
    groupLabel: "Agregadores",
    url: "https://www.sympla.com.br/eventos?s=educacao%202026",
    priority: 26,
    tags: ["sympla", "evento", "educacao"],
  },
  {
    id: "even3",
    name: "Even3",
    group: "agregadores",
    groupLabel: "Agregadores",
    url: "https://www.even3.com.br/eventos",
    priority: 27,
    tags: ["even3", "evento", "academico"],
  },
  {
    id: "doity",
    name: "Doity",
    group: "agregadores",
    groupLabel: "Agregadores",
    url: "https://doity.com.br/eventos",
    priority: 28,
    tags: ["doity", "evento", "inscricao"],
  },
];

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(payload),
  };
}

function clampYear(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_YEAR;
  return Math.max(MIN_YEAR, Math.min(MAX_YEAR, Math.trunc(parsed)));
}

function normalizeWhitespace(value = "") {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtmlEntities(value = "") {
  const named = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&ccedil;": "c",
    "&atilde;": "a",
    "&aacute;": "a",
    "&agrave;": "a",
    "&acirc;": "a",
    "&eacute;": "e",
    "&ecirc;": "e",
    "&iacute;": "i",
    "&oacute;": "o",
    "&ocirc;": "o",
    "&otilde;": "o",
    "&uacute;": "u",
  };

  let decoded = String(value || "");
  Object.entries(named).forEach(([entity, char]) => {
    decoded = decoded.split(entity).join(char);
  });

  decoded = decoded.replace(/&#(\d+);/g, (_, rawCode) => {
    const code = Number(rawCode);
    return Number.isFinite(code) ? String.fromCharCode(code) : "";
  });

  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (_, rawHex) => {
    const code = Number.parseInt(rawHex, 16);
    return Number.isFinite(code) ? String.fromCharCode(code) : "";
  });

  return decoded;
}

function removeDiacritics(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeForSearch(value = "") {
  return removeDiacritics(decodeHtmlEntities(String(value || "")))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function containsTrackingOrAssetNoise(value = "") {
  const normalized = removeDiacritics(String(value || "").toLowerCase());
  if (!normalized) return false;

  if (TRACKING_NOISE_HINTS.some((hint) => normalized.includes(hint))) {
    return true;
  }
  if (/\.(?:jpg|jpeg|png|webp|gif|svg)(?:\?[^ ]*)?(?:\s+\d+w)?\b/i.test(normalized)) {
    return true;
  }
  if (/\b[\w.-]+\.(?:com|com\.br|org|org\.br|gov|gov\.br|edu|edu\.br)\/\S*/i.test(normalized)) {
    return true;
  }

  return false;
}

function looksLikeEmail(value = "") {
  return /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(String(value || ""));
}

function removeHtmlAttributeNoise(value = "") {
  const raw = String(value || "");
  if (!raw) return "";

  return raw
    .replace(
      /\b(?:class|style|id|role|name|href|src|srcset|action|method|target|rel|type|value|placeholder|title)\s*=\s*["'][^"']*["']\s*>?/gi,
      " ",
    )
    .replace(/\b(?:data|aria)-[a-z0-9_-]+\s*=\s*["'][^"']*["']\s*>?/gi, " ")
    .replace(/\b[a-z0-9_-]+=["'][^"']*["']\s*>?/gi, " ");
}

function stripCssClassLikeTokens(value = "") {
  return String(value || "")
    .replace(/\b[a-z0-9]+(?:-[a-z0-9]+){2,}\b/gi, " ")
    .replace(/\B-[a-z0-9_-]+\b/gi, " ");
}

function cleanupExtractedLine(value = "") {
  return normalizeWhitespace(
    stripCssClassLikeTokens(removeHtmlAttributeNoise(String(value || "")))
      .replace(
        /\b(?:href|src|name|class|style|id|action|method|target|rel|type|value|placeholder|title|data-[a-z0-9_-]+|aria-[a-z0-9_-]+)\s*=\s*["'][^"']*(?:["']|$)/gi,
        " ",
      )
      .replace(/\bhttps?:\/\/\S+/gi, " ")
      .replace(/\b[\w.-]+\.(?:com|com\.br|org|org\.br|gov|gov\.br|edu|edu\.br)\/\S*/gi, " ")
      .replace(/\S+\.(?:jpg|jpeg|png|webp|gif|svg)(?:\?[^ ]*)?(?:\s+\d+w)?/gi, " ")
      .replace(/\b(?:facebook_event_name|facebook|gtag|googletag|google_tag|srcset|onclick|utm_[a-z_]+)\b[:=]?\S*/gi, " ")
      .replace(/\\u[0-9a-f]{4}/gi, " ")
      .replace(/&quot;|&amp;/gi, " ")
      .replace(/:\s*[a-z]{2}-[a-z]{2}\s*;?/gi, " ")
      .replace(/\b(?:small|medium|large)\s*;?/gi, " ")
      .replace(/\b[a-z-]{2,}\s*:\s*[^;.,]+;?/gi, " ")
      .replace(/\s-\s*[a-z0-9_-]+\b/gi, " ")
      .replace(/[<>]/g, " "),
  );
}

function lineLooksLikeNoise(value = "") {
  const normalized = normalizeWhitespace(String(value || ""));
  if (!normalized) return true;
  if (normalized.length <= 3) return true;
  if (/^[\W_]+$/.test(normalized)) return true;
  if (/^["'`]/.test(normalized) && !/\b20\d{2}\b/.test(normalized)) return true;
  if (/^\.?[a-z0-9.-]+\.[a-z]{2,}$/i.test(normalized)) return true;
  if (/^[a-z\u00e0-\u00ff]{1,24}'\s+[A-Z\u00c0-\u00df]/.test(normalized)) return true;
  if (looksLikeEmail(normalized)) return true;
  if (containsTrackingOrAssetNoise(normalized)) return true;

  if (/^(?:a|img|form|input|button|select|option|textarea|script|style)$/i.test(normalized)) {
    return true;
  }
  if (/\b[a-z0-9]+(?:-[a-z0-9]+){2,}\b/i.test(normalized)) {
    return true;
  }

  const lowered = removeDiacritics(normalized.toLowerCase());
  const navHintCount = NAVIGATION_NOISE_HINTS.reduce((total, hint) => {
    return lowered.includes(removeDiacritics(hint.toLowerCase())) ? total + 1 : total;
  }, 0);
  const hasYear = /\b20\d{2}\b/.test(normalized);
  const tokenCount = lowered.split(/\s+/).filter(Boolean).length;
  const hasSentencePunctuation = /[.:;!?]/.test(normalized);
  if (tokenCount <= 2 && !hasYear && countKeywordMatches(normalized, EVENT_KEYWORDS) === 0) {
    return true;
  }
  const categoryHintCount = CATEGORY_TITLE_HINTS.reduce((total, hint) => {
    return lowered.includes(removeDiacritics(hint.toLowerCase())) ? total + 1 : total;
  }, 0);
  if (categoryHintCount > 0 && tokenCount <= 6 && !hasYear) {
    return true;
  }
  if (navHintCount >= 1 && tokenCount <= 2 && !hasYear) {
    return true;
  }
  if (navHintCount >= 3 && !hasYear && !hasSentencePunctuation && tokenCount <= 16) {
    return true;
  }

  const hasKeyword = countKeywordMatches(normalized, EVENT_KEYWORDS) > 0 || /\b20\d{2}\b/.test(normalized);
  if (!hasKeyword && /^[A-Z0-9_ -]{4,}$/.test(removeDiacritics(normalized))) {
    return true;
  }

  const hasAttributePattern = /(?:\b[a-z0-9_-]+\s*=|["']\s*$|^\s*\/\s*$)/i.test(normalized);
  if (hasAttributePattern && !hasKeyword) {
    return true;
  }

  return false;
}

function isWeakEventTitle(title = "", sourceName = "") {
  const normalizedTitle = normalizeWhitespace(cleanupExtractedLine(title));
  if (!normalizedTitle) return true;
  if (lineLooksLikeNoise(normalizedTitle)) return true;

  const loweredTitle = removeDiacritics(normalizedTitle.toLowerCase());
  const loweredSource = removeDiacritics(normalizeWhitespace(sourceName).toLowerCase());
  const tokenCount = loweredTitle.split(/\s+/).filter(Boolean).length;
  const hasYear = /\b20\d{2}\b/.test(loweredTitle);
  const hasStrongHint = TITLE_STRONG_EVENT_HINTS.some((hint) => {
    return loweredTitle.includes(removeDiacritics(hint.toLowerCase()));
  });

  if (loweredSource && (loweredTitle === loweredSource || loweredTitle.startsWith(`${loweredSource} -`))) {
    return true;
  }

  const categoryHintCount = CATEGORY_TITLE_HINTS.reduce((total, hint) => {
    return loweredTitle.includes(removeDiacritics(hint.toLowerCase())) ? total + 1 : total;
  }, 0);
  if (categoryHintCount > 0 && tokenCount <= 8 && !/\b20\d{2}\b/.test(loweredTitle)) {
    return true;
  }

  if (!hasYear && !hasStrongHint && tokenCount <= 4) {
    return true;
  }

  if (tokenCount <= 2 && countKeywordMatches(loweredTitle, EVENT_KEYWORDS) === 0) {
    return true;
  }

  return false;
}

function looksLikeHtmlNoise(value = "") {
  const normalized = String(value || "");
  if (!normalized) return false;

  const noiseMatches = normalized.match(
    /(?:\b[a-z0-9_-]+\s*=\s*["'][^"']*["']|<\/?[a-z][^>]*>|<[^>]*$|^[^<]*>\s*$)/gi,
  );
  const noiseCount = Array.isArray(noiseMatches) ? noiseMatches.length : 0;
  return noiseCount >= 2;
}

function stripHtml(value = "") {
  const decoded = decodeHtmlEntities(String(value || ""));
  const withoutScripts = decoded
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");

  const blockAware = withoutScripts
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|section|article|h[1-6]|tr|td|ul|ol|header|footer|nav|form)>/gi, "\n");

  return normalizeWhitespace(
    removeHtmlAttributeNoise(
      blockAware
        .replace(/<[^>]+>/g, " ")
        .replace(/[<>]/g, " "),
    ),
  );
}

function truncateText(value = "", maxLength = 220) {
  const normalized = normalizeWhitespace(String(value || ""));
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

function safeResolveUrl(baseUrl, nextUrl = "") {
  try {
    const normalizedNext = String(nextUrl || "").trim();
    if (!normalizedNext) {
      return "";
    }

    const resolved = new URL(normalizedNext, String(baseUrl || "").trim());
    return resolved.toString();
  } catch {
    return "";
  }
}

function extractMetaContent(html = "", attribute, value) {
  const quotedValue = String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const quotedAttribute = String(attribute || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const firstPattern = new RegExp(
    `<meta[^>]*${quotedAttribute}\\s*=\\s*["']${quotedValue}["'][^>]*content\\s*=\\s*["']([^"']+)["'][^>]*>`,
    "i",
  );
  const secondPattern = new RegExp(
    `<meta[^>]*content\\s*=\\s*["']([^"']+)["'][^>]*${quotedAttribute}\\s*=\\s*["']${quotedValue}["'][^>]*>`,
    "i",
  );

  return (
    decodeHtmlEntities(html.match(firstPattern)?.[1] || "").trim()
    || decodeHtmlEntities(html.match(secondPattern)?.[1] || "").trim()
  );
}

function extractPageTitle(html = "") {
  return truncateText(stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ""), 160);
}

function extractMetaImage(html = "", baseUrl = "") {
  const image = extractMetaContent(html, "property", "og:image")
    || extractMetaContent(html, "name", "og:image")
    || extractMetaContent(html, "name", "twitter:image")
    || extractMetaContent(html, "property", "twitter:image");

  return safeResolveUrl(baseUrl, image);
}

function slugify(value = "") {
  return normalizeForSearch(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function countKeywordMatches(text = "", keywords = []) {
  const normalizedText = normalizeForSearch(text);
  return keywords.reduce((count, keyword) => {
    return normalizedText.includes(normalizeForSearch(keyword)) ? count + 1 : count;
  }, 0);
}

function parseNumericDate(dayValue, monthValue, yearValue) {
  const day = Number(dayValue);
  const month = Number(monthValue);
  const year = Number(yearValue);

  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
    return "";
  }
  if (year < 1900 || year > 2100) return "";
  if (month < 1 || month > 12) return "";
  if (day < 1 || day > 31) return "";

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year
    || candidate.getUTCMonth() !== month - 1
    || candidate.getUTCDate() !== day
  ) {
    return "";
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthNameToNumber(rawMonth = "") {
  const normalized = removeDiacritics(String(rawMonth || "").toLowerCase()).trim();
  if (normalized === "marco") return 3;
  if (normalized === "marcoo") return 3;
  return MONTHS_PT[normalized] || 0;
}

function extractDateDetails(text = "", targetYear = DEFAULT_YEAR) {
  const raw = normalizeWhitespace(text);
  const normalized = removeDiacritics(raw.toLowerCase());
  const candidates = [];

  const rangeRegex = /\b([0-3]?\d)\s*(?:a|ate)\s*([0-3]?\d)\s+de\s+([a-z\u00c0-\u017f]+)\s+de\s+((?:19|20)\d{2})\b/gi;
  for (const match of raw.matchAll(rangeRegex)) {
    const year = Number(match[4]);
    const month = monthNameToNumber(match[3]);
    const startIso = parseNumericDate(match[1], month, year);
    const endIso = parseNumericDate(match[2], month, year);
    if (!startIso || !endIso) continue;
    candidates.push({
      dateText: match[0],
      startDate: startIso,
      endDate: endIso,
      year,
      confidence: 4,
    });
  }

  const numericRegex = /\b([0-3]?\d)[\/.-]([0-1]?\d)[\/.-]((?:19|20)\d{2})\b/g;
  for (const match of raw.matchAll(numericRegex)) {
    const iso = parseNumericDate(match[1], match[2], match[3]);
    if (!iso) continue;
    candidates.push({
      dateText: match[0],
      startDate: iso,
      endDate: "",
      year: Number(match[3]),
      confidence: 3,
    });
  }

  const longRegex = /\b([0-3]?\d)\s+de\s+([a-z\u00c0-\u017f]+)\s+de\s+((?:19|20)\d{2})\b/gi;
  for (const match of raw.matchAll(longRegex)) {
    const year = Number(match[3]);
    const month = monthNameToNumber(match[2]);
    const iso = parseNumericDate(match[1], month, year);
    if (!iso) continue;
    candidates.push({
      dateText: match[0],
      startDate: iso,
      endDate: "",
      year,
      confidence: 3,
    });
  }

  const monthYearRegex = /\b([a-z\u00c0-\u017f]+)\s+de\s+((?:19|20)\d{2})\b/gi;
  for (const match of raw.matchAll(monthYearRegex)) {
    const year = Number(match[2]);
    const month = monthNameToNumber(match[1]);
    if (!month) continue;
    candidates.push({
      dateText: match[0],
      startDate: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`,
      endDate: "",
      year,
      confidence: 2,
    });
  }

  let best = null;
  for (const candidate of candidates) {
    const yearBoost = candidate.year === targetYear ? 10 : 0;
    const score = candidate.confidence * 10 + yearBoost;
    if (!best || score > best.score) {
      best = { ...candidate, score };
    }
  }

  const hasTargetYear = normalized.includes(String(targetYear));
  if (!best) {
    if (hasTargetYear) {
      return {
        dateText: String(targetYear),
        startDate: "",
        endDate: "",
        matchesTargetYear: true,
      };
    }
    return {
      dateText: "",
      startDate: "",
      endDate: "",
      matchesTargetYear: false,
    };
  }

  return {
    dateText: best.dateText,
    startDate: best.startDate,
    endDate: best.endDate,
    matchesTargetYear: best.year === targetYear || hasTargetYear,
  };
}

function extractImageUrlsFromChunk(chunkHtml = "", baseUrl = "", fallbackImage = "") {
  const images = [];

  const imgRegex = /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi;
  for (const match of chunkHtml.matchAll(imgRegex)) {
    const resolved = safeResolveUrl(baseUrl, decodeHtmlEntities(match[1]));
    if (resolved) {
      images.push(resolved);
    }
  }

  const srcSetRegex = /<img[^>]+srcset=["']([^"']+)["'][^>]*>/gi;
  for (const match of chunkHtml.matchAll(srcSetRegex)) {
    const firstEntry = String(match[1] || "").split(",")[0] || "";
    const firstUrl = firstEntry.trim().split(/\s+/)[0] || "";
    const resolved = safeResolveUrl(baseUrl, decodeHtmlEntities(firstUrl));
    if (resolved) {
      images.push(resolved);
    }
  }

  if (fallbackImage) {
    images.push(fallbackImage);
  }

  return [...new Set(images)]
    .filter((candidate) => /^https?:\/\//i.test(String(candidate || "").trim()))
    .slice(0, 4);
}

function buildDescription(title = "", contextText = "") {
  const normalizedTitle = normalizeWhitespace(title);
  const seen = new Set();
  const contextLines = String(contextText || "")
    .split("\n")
    .map((line) => cleanupExtractedLine(line))
    .filter((line) => !lineLooksLikeNoise(line))
    .filter((line) => {
      const signature = normalizeForSearch(line);
      if (!signature || seen.has(signature)) return false;
      seen.add(signature);
      return true;
    });

  const normalizedContext = normalizeWhitespace(contextLines.join("\n"));
  let description = normalizedContext;
  if (!description) return "";

  const titleLower = normalizeForSearch(normalizedTitle);
  const descriptionLower = normalizeForSearch(description);
  if (titleLower && descriptionLower.startsWith(titleLower)) {
    description = description.slice(normalizedTitle.length).trim();
  }

  if (description.length < 40) {
    description = normalizeWhitespace(
      String(contextText || "")
        .split("\n")
        .map((line) => cleanupExtractedLine(line))
        .filter((line) => !lineLooksLikeNoise(line))
        .join("\n"),
    );
  }

  if (looksLikeHtmlNoise(description)) {
    return "";
  }

  return truncateText(description, MAX_DESCRIPTION_LENGTH);
}

function resolveEventTitle(rawTitle = "", description = "", sourceName = "") {
  const cleanedTitle = truncateText(cleanupExtractedLine(rawTitle), 150);
  if (!isWeakEventTitle(cleanedTitle, sourceName)) {
    return cleanedTitle;
  }

  const candidates = String(description || "")
    .split("\n")
    .map((line) => truncateText(cleanupExtractedLine(line), 150))
    .filter((line) => line.length >= 16 && !lineLooksLikeNoise(line))
    .filter((line) => !isWeakEventTitle(line, sourceName));

  let bestTitle = "";
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeForSearch(candidate);
    let candidateScore = 0;

    if (/\b20\d{2}\b/.test(candidate)) {
      candidateScore += 4;
    }
    candidateScore += countKeywordMatches(candidate, DATE_KEYWORDS) * 2;
    candidateScore += countKeywordMatches(candidate, EVENT_KEYWORDS) * 2;

    const strongHintMatches = TITLE_STRONG_EVENT_HINTS.reduce((total, hint) => {
      return normalizedCandidate.includes(normalizeForSearch(hint)) ? total + 1 : total;
    }, 0);
    candidateScore += strongHintMatches * 3;

    if (EXCLUDED_TITLE_HINTS.some((hint) => normalizedCandidate.includes(normalizeForSearch(hint)))) {
      candidateScore -= 6;
    }
    if (containsTrackingOrAssetNoise(candidate)) {
      candidateScore -= 8;
    }

    if (candidateScore > bestScore) {
      bestScore = candidateScore;
      bestTitle = candidate;
    }
  }

  return truncateText(bestTitle || cleanedTitle, 150);
}

function detectWomenProtagonism({
  title = "",
  description = "",
  contextText = "",
  sourceTags = [],
} = {}) {
  const haystack = normalizeForSearch([
    title,
    description,
    contextText,
    ...(Array.isArray(sourceTags) ? sourceTags : []),
  ].join(" "));

  if (!haystack) return false;

  const keywordHits = WOMEN_PROTAGONISM_KEYWORDS.reduce((total, keyword) => {
    const normalizedKeyword = normalizeForSearch(keyword);
    return normalizedKeyword && haystack.includes(normalizedKeyword) ? total + 1 : total;
  }, 0);

  const hasWomenIdentityTerm = /\b(?:mulher(?:es)?|menina(?:s)?|garota(?:s)?|feminin[ao]s?)\b/i.test(haystack);
  const hasProgramContext = /\b(?:competicao|programa|premiacao|premio|edital|inscricao|seletiva|chamada|bolsa|mentoria|olimpiada)\b/i.test(haystack);

  if (/\bcf-?obi\b/i.test(haystack)) {
    return true;
  }

  if (keywordHits >= 2) {
    return true;
  }

  if (hasWomenIdentityTerm && hasProgramContext) {
    return true;
  }

  return false;
}

function detectEducationAudienceFocus({
  title = "",
  description = "",
  contextText = "",
  sourceTags = [],
} = {}) {
  const haystack = normalizeForSearch([
    title,
    description,
    contextText,
    ...(Array.isArray(sourceTags) ? sourceTags : []),
  ].join(" "));

  if (!haystack) return false;

  const keywordHits = EDUCATION_AUDIENCE_KEYWORDS.reduce((total, keyword) => {
    const normalizedKeyword = normalizeForSearch(keyword);
    return normalizedKeyword && haystack.includes(normalizedKeyword) ? total + 1 : total;
  }, 0);

  if (keywordHits >= 2) {
    return true;
  }

  const hasTeacherOrStudent = /\b(?:professor(?:a|es|as)?|estudante(?:s)?)\b/i.test(haystack);
  const hasSchoolContext = /\b(?:escola(?:s)?|ensino|rede estadual|educacao basica|clube(?:s)? de ciencias)\b/i.test(haystack);
  if (hasTeacherOrStudent && hasSchoolContext) {
    return true;
  }

  return false;
}

function computeEventScore({
  title,
  contextText,
  year,
  sourceTags = [],
  url = "",
  sourceName = "",
  womenProtagonism = false,
  educationAudienceFocus = false,
}) {
  const normalizedTitle = normalizeForSearch(title);
  const normalizedText = normalizeForSearch(`${title} ${contextText} ${url}`);
  let score = 0;

  const keywordCount = countKeywordMatches(normalizedText, EVENT_KEYWORDS);
  score += Math.min(keywordCount * 2, 10);

  const dateKeywordCount = countKeywordMatches(normalizedText, DATE_KEYWORDS);
  score += Math.min(dateKeywordCount, 4);

  if (normalizedText.includes(String(year))) {
    score += 7;
  }

  const sourceTagBoost = sourceTags.reduce((total, tag) => {
    const normalizedTag = normalizeForSearch(tag);
    return normalizedText.includes(normalizedTag) ? total + 1 : total;
  }, 0);
  score += Math.min(sourceTagBoost, 4);

  if (normalizedTitle.length >= 14 && normalizedTitle.length <= 160) {
    score += 2;
  }

  const strongHintCount = TITLE_STRONG_EVENT_HINTS.reduce((total, hint) => {
    return normalizedText.includes(normalizeForSearch(hint)) ? total + 1 : total;
  }, 0);
  score += Math.min(strongHintCount * 2, 8);

  if (isWeakEventTitle(title, sourceName)) {
    score -= 12;
  }

  if (containsTrackingOrAssetNoise(contextText)) {
    score -= 10;
  }

  if (EXCLUDED_TITLE_HINTS.some((hint) => normalizedTitle.includes(normalizeForSearch(hint)))) {
    score -= 12;
  }

  if (normalizedTitle.length <= 6) {
    score -= 4;
  }

  if (womenProtagonism) {
    score += 4;
  }

  if (educationAudienceFocus) {
    score += 6;
  }

  return score;
}

function buildEventId(sourceId, title, startDate, url, fallbackIndex = 0) {
  const seed = `${sourceId}-${title}-${startDate}-${url}-${fallbackIndex}`;
  const slug = slugify(seed);
  if (slug) {
    return slug.slice(0, 96);
  }
  return `${sourceId}-event-${fallbackIndex + 1}`;
}

function eventLooksLike2026Candidate({
  title = "",
  contextText = "",
  url = "",
  dateDetails = {},
  year = DEFAULT_YEAR,
}) {
  const cleanContext = cleanupExtractedLine(contextText);
  const normalizedText = normalizeForSearch(`${title} ${cleanContext} ${url}`);
  const hasStartInYear = String(dateDetails?.startDate || "").startsWith(`${year}-`);
  const hasEndInYear = String(dateDetails?.endDate || "").startsWith(`${year}-`);
  if (hasStartInYear || hasEndInYear) return true;

  const titleAndContext = normalizeForSearch(`${title} ${cleanContext}`);
  const eventKeywordHits = countKeywordMatches(titleAndContext, EVENT_KEYWORDS);
  const titleHasYear = normalizeForSearch(title).includes(String(year));
  const hasSpecificDateText = /\b(?:[0-3]?\d[\/.-][0-1]?\d[\/.-](?:19|20)\d{2}|[0-3]?\d\s+de\s+[a-z\u00c0-\u017f]+\s+de\s+(?:19|20)\d{2}|[0-3]?\d,\s*[a-z\u00c0-\u017f]+\s+(?:19|20)\d{2}|[a-z\u00c0-\u017f]+\s+de\s+(?:19|20)\d{2})\b/i.test(cleanContext);
  const hasStrongEventTerms = /\b(?:inscricao|edital|seletiva|prova|resultado|chamada|hackathon|regulamento|convocad[oa])\b/i.test(titleAndContext);
  const hasOlympiadWithContext =
    /\bolimpiad[ao]s?\b/i.test(titleAndContext)
    && /\b(?:seletiva|resultado|prova|inscricao|regulamento|cronograma|edital)\b/i.test(titleAndContext);

  if (titleHasYear && eventKeywordHits > 0) {
    return true;
  }
  if (!normalizedText.includes(String(year))) return false;
  if (hasSpecificDateText && (hasStrongEventTerms || hasOlympiadWithContext)) return true;

  if (eventKeywordHits >= 3 && (hasStrongEventTerms || hasOlympiadWithContext) && !isWeakEventTitle(title)) {
    return true;
  }

  return false;
}

function extractAnchorEventsFromPage({
  html = "",
  source = {},
  year = DEFAULT_YEAR,
  pageUrl = "",
  pageImage = "",
}) {
  const events = [];
  const anchorRegex = /<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;
  let match = null;
  let scannedAnchors = 0;

  while ((match = anchorRegex.exec(html)) !== null && scannedAnchors < MAX_ANCHOR_SCAN) {
    scannedAnchors += 1;

    const rawHref = decodeHtmlEntities(String(match[2] || "").trim());
    if (!rawHref || rawHref.startsWith("#") || rawHref.toLowerCase().startsWith("javascript:")) {
      continue;
    }

    const rawTitle = truncateText(stripHtml(match[3]), 220);
    if (!rawTitle || rawTitle.length < 3) {
      continue;
    }
    if (looksLikeEmail(rawTitle)) {
      continue;
    }
    if (lineLooksLikeNoise(rawTitle) && rawTitle.length < 12) {
      continue;
    }

    const resolvedUrl = safeResolveUrl(pageUrl || source.url, rawHref);
    if (!resolvedUrl) {
      continue;
    }

    const sliceStart = Math.max(0, match.index - 900);
    const sliceEnd = Math.min(html.length, match.index + match[0].length + 2600);
    const chunkHtml = html.slice(sliceStart, sliceEnd);
    const chunkText = stripHtml(chunkHtml);
    const description = buildDescription(rawTitle, chunkText);
    const resolvedTitle = resolveEventTitle(rawTitle, description, source.name);
    if (!resolvedTitle || isWeakEventTitle(resolvedTitle, source.name)) {
      continue;
    }
    const normalizedResolvedTitle = normalizeForSearch(resolvedTitle);
    if (EXCLUDED_TITLE_HINTS.some((hint) => normalizedResolvedTitle.includes(normalizeForSearch(hint)))) {
      continue;
    }

    const contextForEvaluation = description || truncateText(chunkText, 680);
    if (!contextForEvaluation || contextForEvaluation.length < 24) {
      continue;
    }

    const womenProtagonism = detectWomenProtagonism({
      title: resolvedTitle,
      description,
      contextText: contextForEvaluation,
      sourceTags: source.tags || [],
    });
    const educationAudienceFocus = detectEducationAudienceFocus({
      title: resolvedTitle,
      description,
      contextText: contextForEvaluation,
      sourceTags: [],
    });

    const dateDetails = extractDateDetails(`${resolvedTitle}\n${contextForEvaluation}`, year);
    const score = computeEventScore({
      title: resolvedTitle,
      contextText: contextForEvaluation,
      year,
      sourceTags: source.tags || [],
      url: resolvedUrl,
      sourceName: source.name,
      womenProtagonism,
      educationAudienceFocus,
    });

    if (score < 8) {
      continue;
    }

    const inTargetYear = eventLooksLike2026Candidate({
      title: resolvedTitle,
      contextText: contextForEvaluation,
      url: resolvedUrl,
      dateDetails,
      year,
    });

    if (!inTargetYear) {
      continue;
    }

    events.push({
      title: resolvedTitle,
      description: description || truncateText(contextForEvaluation, MAX_DESCRIPTION_LENGTH),
      url: resolvedUrl,
      dateText: dateDetails.dateText || "",
      startDate: dateDetails.startDate || "",
      endDate: dateDetails.endDate || "",
      imageUrls: extractImageUrlsFromChunk(chunkHtml, pageUrl || source.url, pageImage),
      womenProtagonism,
      womenProtagonismLabel: womenProtagonism ? WOMEN_PROTAGONISM_LABEL : "",
      educationAudienceFocus,
      educationAudienceLabel: educationAudienceFocus ? EDUCATION_AUDIENCE_LABEL : "",
      score,
    });
  }

  return events;
}

function extractTextLinesFromHtml(html = "") {
  const normalized = decodeHtmlEntities(String(html || ""))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|section|article|h[1-6]|tr|td|ul|ol)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return normalizeWhitespace(removeHtmlAttributeNoise(normalized))
    .split("\n")
    .map((line) => cleanupExtractedLine(line))
    .filter((line) => !lineLooksLikeNoise(line));
}

function extractFallbackEventsFromLines({
  html = "",
  source = {},
  year = DEFAULT_YEAR,
  pageUrl = "",
  pageImage = "",
}) {
  const lines = extractTextLinesFromHtml(html);
  const candidates = [];

  for (const line of lines) {
    if (line.length < 30 || line.length > 640) {
      continue;
    }

    const normalizedLine = normalizeForSearch(line);
    if (!normalizedLine.includes(String(year))) {
      continue;
    }

    if (countKeywordMatches(normalizedLine, EVENT_KEYWORDS) === 0) {
      continue;
    }

    if (looksLikeEmail(line) || isWeakEventTitle(line, source.name)) {
      continue;
    }
    const normalizedFallbackTitle = normalizeForSearch(line);
    if (EXCLUDED_TITLE_HINTS.some((hint) => normalizedFallbackTitle.includes(normalizeForSearch(hint)))) {
      continue;
    }

    const dateDetails = extractDateDetails(line, year);
    const womenProtagonism = detectWomenProtagonism({
      title: line,
      description: line,
      contextText: line,
      sourceTags: source.tags || [],
    });
    const educationAudienceFocus = detectEducationAudienceFocus({
      title: line,
      description: line,
      contextText: line,
      sourceTags: [],
    });

    const score = computeEventScore({
      title: line,
      contextText: line,
      year,
      sourceTags: source.tags || [],
      url: pageUrl || source.url,
      sourceName: source.name,
      womenProtagonism,
      educationAudienceFocus,
    });

    if (score < 8) {
      continue;
    }

    candidates.push({
      title: truncateText(line, 140),
      description: truncateText(line, 900),
      url: pageUrl || source.url,
      dateText: dateDetails.dateText || "",
      startDate: dateDetails.startDate || "",
      endDate: dateDetails.endDate || "",
      imageUrls: pageImage ? [pageImage] : [],
      womenProtagonism,
      womenProtagonismLabel: womenProtagonism ? WOMEN_PROTAGONISM_LABEL : "",
      educationAudienceFocus,
      educationAudienceLabel: educationAudienceFocus ? EDUCATION_AUDIENCE_LABEL : "",
      score,
    });
  }

  return candidates.slice(0, 2);
}

function dedupeEvents(events = []) {
  const byKey = new Map();
  for (const event of events) {
    const normalizedUrl = normalizeForSearch(
      String(event.url || "")
        .split("#")[0]
        .split("?")[0],
    );
    const normalizedTitle = normalizeForSearch(event.title || "");
    const normalizedDate = normalizeForSearch(event.startDate || event.dateText || "");

    const key = [
      normalizeForSearch(event.sourceId || ""),
      normalizedUrl || normalizedTitle,
      normalizedDate || normalizedTitle,
    ].join("|");

    const existing = byKey.get(key);
    if (!existing || Number(event.score || 0) > Number(existing.score || 0)) {
      byKey.set(key, event);
    }
  }

  const bySemantic = new Map();
  for (const event of byKey.values()) {
    const semanticKey = [
      normalizeForSearch(event.sourceId || ""),
      normalizeForSearch(event.title || ""),
    ].join("|");

    const existing = bySemantic.get(semanticKey);
    const currentScore = Number(event.score || 0);
    const existingScore = Number(existing?.score || 0);
    const currentDescriptionLength = String(event.description || "").length;
    const existingDescriptionLength = String(existing?.description || "").length;

    if (
      !existing
      || currentScore > existingScore
      || (currentScore === existingScore && currentDescriptionLength > existingDescriptionLength)
    ) {
      bySemantic.set(semanticKey, event);
    }
  }

  return [...bySemantic.values()];
}

function sortEvents(events = []) {
  return [...events].sort((a, b) => {
    const aHasImage = Array.isArray(a.imageUrls) && a.imageUrls.length > 0 ? 1 : 0;
    const bHasImage = Array.isArray(b.imageUrls) && b.imageUrls.length > 0 ? 1 : 0;
    if (aHasImage !== bHasImage) {
      return bHasImage - aHasImage;
    }

    const aIsWomenFocus = Boolean(a.womenProtagonism) ? 1 : 0;
    const bIsWomenFocus = Boolean(b.womenProtagonism) ? 1 : 0;
    if (aIsWomenFocus !== bIsWomenFocus) {
      return bIsWomenFocus - aIsWomenFocus;
    }

    const aIsSchoolFocus = Boolean(a.educationAudienceFocus) ? 1 : 0;
    const bIsSchoolFocus = Boolean(b.educationAudienceFocus) ? 1 : 0;
    if (aIsSchoolFocus !== bIsSchoolFocus) {
      return bIsSchoolFocus - aIsSchoolFocus;
    }

    const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
    if (scoreDiff !== 0) return scoreDiff;

    const dateA = String(a.startDate || "");
    const dateB = String(b.startDate || "");
    if (dateA && dateB) {
      return dateA.localeCompare(dateB);
    }
    if (dateA) return -1;
    if (dateB) return 1;

    return String(a.title || "").localeCompare(String(b.title || ""));
  });
}

function requestTextOnce(url, { timeoutMs = 4000, allowInsecureTls = false, acceptHeader = "*/*" } = {}) {
  return new Promise((resolve, reject) => {
    let parsedUrl = null;
    try {
      parsedUrl = new URL(String(url || "").trim());
    } catch {
      reject(new Error("URL invalida."));
      return;
    }

    const isHttps = parsedUrl.protocol === "https:";
    const client = isHttps ? https : http;
    const requestOptions = {
      method: "GET",
      headers: {
        "User-Agent": BOT_NAME,
        Accept: acceptHeader,
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "identity",
        "Cache-Control": "no-cache",
      },
      timeout: Math.max(1000, Number(timeoutMs) || 4000),
      rejectUnauthorized: isHttps ? !allowInsecureTls : undefined,
    };

    const req = client.request(parsedUrl, requestOptions, (response) => {
      const chunks = [];

      response.on("data", (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk || ""), "utf8"));
      });

      response.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        resolve({
          statusCode: Number(response.statusCode || 0),
          headers: response.headers || {},
          body,
          finalUrl: parsedUrl.toString(),
        });
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error("Tempo limite por fonte excedido."));
    });
    req.on("error", reject);
    req.end();
  });
}

async function requestTextWithRedirects(
  url,
  {
    timeoutMs = 4000,
    allowInsecureTls = false,
    acceptHeader = "*/*",
    maxRedirects = 4,
  } = {},
) {
  let currentUrl = String(url || "").trim();
  let redirectsLeft = Math.max(0, Number(maxRedirects) || 0);

  while (currentUrl) {
    const response = await requestTextOnce(currentUrl, {
      timeoutMs,
      allowInsecureTls,
      acceptHeader,
    });

    const statusCode = Number(response.statusCode || 0);
    const locationHeader = String(response.headers?.location || "").trim();
    const shouldRedirect = [301, 302, 303, 307, 308].includes(statusCode) && locationHeader;

    if (shouldRedirect && redirectsLeft > 0) {
      currentUrl = safeResolveUrl(currentUrl, locationHeader);
      redirectsLeft -= 1;
      continue;
    }

    return response;
  }

  throw new Error("Nao foi possivel resolver redirecionamento da fonte.");
}

async function fetchHtmlWithTimeout(url, timeoutMs = 4000, options = {}) {
  const allowInsecureTls = Boolean(options?.allowInsecureTls);
  const safeTimeoutMs = Math.max(1000, Number(timeoutMs) || 4000);
  const headers = {
    "User-Agent": BOT_NAME,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "no-cache",
  };

  const parseAndValidateHtml = (responseBody, finalUrl, contentType, statusCode) => {
    const normalizedType = String(contentType || "").toLowerCase();
    const normalizedStatus = Number(statusCode || 0);
    if (normalizedStatus < 200 || normalizedStatus >= 400) {
      throw new Error(`HTTP ${normalizedStatus || 0}`);
    }
    if (!normalizedType.includes("text/html") && !normalizedType.includes("application/xhtml+xml")) {
      throw new Error(`Conteudo nao HTML (${normalizedType || "desconhecido"})`);
    }

    return {
      html: String(responseBody || ""),
      finalUrl,
      contentType: normalizedType,
    };
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), safeTimeoutMs);

  try {
    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers,
      });
      const html = await response.text();
      return parseAndValidateHtml(
        html,
        response.url || String(url || ""),
        response.headers.get("content-type") || "",
        response.status,
      );
    } catch (error) {
      if (!allowInsecureTls) {
        throw error;
      }

      const fallbackResponse = await requestTextWithRedirects(url, {
        timeoutMs: safeTimeoutMs,
        allowInsecureTls: true,
        acceptHeader: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        maxRedirects: 5,
      });

      return parseAndValidateHtml(
        fallbackResponse.body,
        fallbackResponse.finalUrl || String(url || ""),
        fallbackResponse.headers?.["content-type"] || "",
        fallbackResponse.statusCode,
      );
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJsonWithTimeout(url, timeoutMs = 4000, options = {}) {
  const allowInsecureTls = Boolean(options?.allowInsecureTls);
  const safeTimeoutMs = Math.max(1000, Number(timeoutMs) || 4000);
  const headers = {
    "User-Agent": BOT_NAME,
    Accept: "application/json,text/plain,*/*",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "no-cache",
  };

  const parseJsonPayload = (payloadText = "", statusCode = 0) => {
    const status = Number(statusCode || 0);
    if (status < 200 || status >= 400) {
      throw new Error(`HTTP ${status || 0}`);
    }
    try {
      return JSON.parse(String(payloadText || ""));
    } catch (error) {
      throw new Error(`Resposta JSON invalida: ${error?.message || "parse error"}`);
    }
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), safeTimeoutMs);

  try {
    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers,
      });
      const raw = await response.text();
      return {
        payload: parseJsonPayload(raw, response.status),
        finalUrl: response.url || String(url || ""),
      };
    } catch (error) {
      if (!allowInsecureTls) {
        throw error;
      }

      const fallbackResponse = await requestTextWithRedirects(url, {
        timeoutMs: safeTimeoutMs,
        allowInsecureTls: true,
        acceptHeader: "application/json,text/plain,*/*",
        maxRedirects: 5,
      });

      return {
        payload: parseJsonPayload(fallbackResponse.body, fallbackResponse.statusCode),
        finalUrl: fallbackResponse.finalUrl || String(url || ""),
      };
    }
  } finally {
    clearTimeout(timeout);
  }
}

function toIsoDateOnly(value = "") {
  const candidate = new Date(String(value || "").trim());
  if (Number.isNaN(candidate.getTime())) return "";

  const year = candidate.getUTCFullYear();
  const month = String(candidate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(candidate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function extractWordPressEventsFromPosts({
  posts = [],
  source = {},
  year = DEFAULT_YEAR,
}) {
  if (!Array.isArray(posts) || posts.length === 0) {
    return [];
  }

  const events = [];
  const lowerBoundYear = Math.max(MIN_YEAR, year - 1);

  for (const post of posts) {
    const rawTitle = stripHtml(post?.title?.rendered || "");
    const title = resolveEventTitle(rawTitle, "", source.name);
    if (!title || isWeakEventTitle(title, source.name)) {
      continue;
    }

    const excerpt = stripHtml(post?.excerpt?.rendered || "");
    const content = truncateText(stripHtml(post?.content?.rendered || ""), 1800);
    const termNames = Array.isArray(post?._embedded?.["wp:term"])
      ? post._embedded["wp:term"].flat().map((term) => cleanupExtractedLine(term?.name || "")).filter(Boolean)
      : [];

    const description = buildDescription(
      title,
      normalizeWhitespace([excerpt, content].filter(Boolean).join("\n")),
    ) || truncateText(normalizeWhitespace([excerpt, content].filter(Boolean).join(" ")), MAX_DESCRIPTION_LENGTH);

    const contextForEvaluation = normalizeWhitespace(
      [description, content, termNames.join(" ")].filter(Boolean).join("\n"),
    );
    if (!contextForEvaluation || contextForEvaluation.length < 24) {
      continue;
    }

    const postDateIso = toIsoDateOnly(post?.date || post?.date_gmt || "");
    const dateDetails = extractDateDetails(
      `${title}\n${contextForEvaluation}\n${postDateIso}\n${termNames.join(" ")}`,
      year,
    );

    const womenProtagonism = detectWomenProtagonism({
      title,
      description,
      contextText: contextForEvaluation,
      sourceTags: [...(source.tags || []), ...termNames],
    });
    const educationAudienceFocus = detectEducationAudienceFocus({
      title,
      description,
      contextText: contextForEvaluation,
      sourceTags: termNames,
    });

    const resolvedUrl = safeResolveUrl(source.url, post?.link || "");
    const score = computeEventScore({
      title,
      contextText: contextForEvaluation,
      year,
      sourceTags: [...(source.tags || []), ...termNames],
      url: resolvedUrl,
      sourceName: source.name,
      womenProtagonism,
      educationAudienceFocus,
    });

    const normalizedEducationContext = normalizeForSearch(`${title} ${contextForEvaluation}`);
    const educationPriorityMatch = /\b(?:clubes?\s+de\s+ciencias?|bahia\s+faz\s+ciencia\s+na\s+escola|professores?\s+coordenadores?|rede\s+publica\s+estadual|educacao\s+basica|ensino\s+medio)\b/i.test(normalizedEducationContext);
    const strictYearMatch = eventLooksLike2026Candidate({
      title,
      contextText: contextForEvaluation,
      url: resolvedUrl,
      dateDetails: {
        dateText: dateDetails.dateText || postDateIso || "",
        startDate: dateDetails.startDate || postDateIso || "",
        endDate: dateDetails.endDate || "",
      },
      year,
    });
    const postYear = Number(String(postDateIso || "").slice(0, 4)) || 0;
    const audienceCarryOverMatch =
      educationAudienceFocus
      && postYear >= lowerBoundYear
      && postYear <= year;
    const educationOverrideMatch =
      String(source?.id || "").toLowerCase() === "fapesb"
      && educationPriorityMatch
      && postYear >= lowerBoundYear
      && postYear <= year;

    if (!strictYearMatch && !audienceCarryOverMatch && !educationOverrideMatch) {
      continue;
    }

    const minimumScore = educationOverrideMatch ? 4 : educationAudienceFocus ? 6 : 8;
    if (score < minimumScore) {
      continue;
    }

    const featuredMedia = post?._embedded?.["wp:featuredmedia"];
    const imageFromMedia = Array.isArray(featuredMedia)
      ? String(featuredMedia?.[0]?.source_url || "").trim()
      : "";
    const imageUrls = imageFromMedia && /^https?:\/\//i.test(imageFromMedia)
      ? [imageFromMedia]
      : [];

    events.push({
      title: truncateText(title, 150),
      description: description || truncateText(contextForEvaluation, MAX_DESCRIPTION_LENGTH),
      url: resolvedUrl || source.url,
      dateText: dateDetails.dateText || postDateIso || "",
      startDate: dateDetails.startDate || postDateIso || "",
      endDate: dateDetails.endDate || "",
      imageUrls,
      womenProtagonism,
      womenProtagonismLabel: womenProtagonism ? WOMEN_PROTAGONISM_LABEL : "",
      educationAudienceFocus,
      educationAudienceLabel: educationAudienceFocus ? EDUCATION_AUDIENCE_LABEL : "",
      score,
    });
  }

  return events;
}

async function scanSourceForEvents(source, options = {}) {
  const startedAt = Date.now();
  const year = clampYear(options.year);
  const perSourceTimeoutMs = Math.max(1200, Number(options.perSourceTimeoutMs) || QUICK_SOURCE_TIMEOUT_MS);
  const effectiveTimeoutMs = Math.max(
    perSourceTimeoutMs,
    Number(source?.minTimeoutMs || 0) || 0,
  );
  const defaultMaxEventsPerSource = Math.max(1, Number(options.maxEventsPerSource) || DEFAULT_MAX_EVENTS_PER_SOURCE);
  const maxEventsPerSource = Math.max(
    1,
    Number(source?.maxEventsPerSource || defaultMaxEventsPerSource) || defaultMaxEventsPerSource,
  );

  try {
    const allowInsecureTls = Boolean(source?.allowInsecureTls);
    let events = [];
    let pageTitle = source.name;
    let pageImage = "";
    let fetchedUrl = source.url;

    if (source?.apiUrl) {
      try {
        const jsonResult = await fetchJsonWithTimeout(source.apiUrl, effectiveTimeoutMs, {
          allowInsecureTls,
        });
        const basePosts = Array.isArray(jsonResult?.payload) ? jsonResult.payload : [];
        const apiSearchUrls = Array.isArray(source?.apiSearchUrls)
          ? source.apiSearchUrls.filter((candidate) => String(candidate || "").trim())
          : [];
        const limitedApiSearchUrls = perSourceTimeoutMs <= QUICK_SOURCE_TIMEOUT_MS
          ? apiSearchUrls.slice(0, 1)
          : apiSearchUrls;
        const extraPosts = [];

        for (const apiSearchUrl of limitedApiSearchUrls) {
          try {
            const searchResult = await fetchJsonWithTimeout(apiSearchUrl, effectiveTimeoutMs, {
              allowInsecureTls,
            });
            if (Array.isArray(searchResult?.payload)) {
              extraPosts.push(...searchResult.payload);
            }
          } catch {
            // ignora falhas pontuais nas buscas complementares
          }
        }

        const dedupedPostsById = new Map();
        [...basePosts, ...extraPosts].forEach((post, index) => {
          const postId = String(post?.id || `fapesb-post-${index}`);
          if (!dedupedPostsById.has(postId)) {
            dedupedPostsById.set(postId, post);
          }
        });

        events = extractWordPressEventsFromPosts({
          posts: [...dedupedPostsById.values()],
          source,
          year,
        });
        fetchedUrl = String(jsonResult?.finalUrl || source.apiUrl || source.url);
        pageTitle = `${source.name} (API)`;
      } catch {
        // fallback para HTML abaixo
      }
    }

    if (events.length === 0) {
      const page = await fetchHtmlWithTimeout(source.url, effectiveTimeoutMs, {
        allowInsecureTls,
      });
      pageTitle = extractPageTitle(page.html) || source.name;
      pageImage = extractMetaImage(page.html, page.finalUrl);
      fetchedUrl = page.finalUrl || source.url;

      events = extractAnchorEventsFromPage({
        html: page.html,
        source,
        year,
        pageUrl: page.finalUrl,
        pageImage,
      });

      if (events.length === 0) {
        events = extractFallbackEventsFromLines({
          html: page.html,
          source,
          year,
          pageUrl: page.finalUrl,
          pageImage,
        });
      }
    }

    const dedupedEvents = dedupeEvents(events);
    const isFapesbSource = String(source?.id || "").toLowerCase() === "fapesb";
    const schoolPriorityRegex = /\b(?:clubes?\s+de\s+ciencias?|bahia\s+faz\s+ciencia\s+na\s+escola|professores?\s+coordenadores?|rede\s+publica\s+estadual|educacao\s+basica|ensino\s+medio)\b/i;
    const priorityEvents = isFapesbSource
      ? dedupedEvents.filter((event) => {
        if (!event?.educationAudienceFocus) return false;
        const normalized = normalizeForSearch(`${event?.title || ""} ${event?.description || ""}`);
        return schoolPriorityRegex.test(normalized);
      })
      : [];

    const priorityKeys = new Set(
      priorityEvents.map((event) => {
        return normalizeForSearch(`${event?.url || ""}|${event?.title || ""}`);
      }),
    );
    const remainingEvents = dedupedEvents.filter((event) => {
      const key = normalizeForSearch(`${event?.url || ""}|${event?.title || ""}`);
      return !priorityKeys.has(key);
    });

    const curatedEvents = [
      ...sortEvents(priorityEvents),
      ...sortEvents(remainingEvents),
    ];

    const sourceEvents = curatedEvents
      .slice(0, maxEventsPerSource)
      .map((event, index) => ({
        id: buildEventId(source.id, event.title, event.startDate, event.url, index),
        sourceId: source.id,
        sourceName: source.name,
        sourceGroup: source.group,
        sourceGroupLabel: source.groupLabel,
        sourceUrl: source.url,
        fetchedUrl,
        pageTitle,
        title: event.title,
        description: event.description,
        url: event.url,
        dateText: event.dateText,
        startDate: event.startDate,
        endDate: event.endDate,
        imageUrls: Array.isArray(event.imageUrls)
          ? [...new Set(
            event.imageUrls.filter((candidate) => /^https?:\/\//i.test(String(candidate || "").trim())),
          )].slice(0, 4)
          : [],
        womenProtagonism: Boolean(event.womenProtagonism),
        womenProtagonismLabel: event.womenProtagonism
          ? String(event.womenProtagonismLabel || WOMEN_PROTAGONISM_LABEL)
          : "",
        educationAudienceFocus: Boolean(event.educationAudienceFocus),
        educationAudienceLabel: event.educationAudienceFocus
          ? String(event.educationAudienceLabel || EDUCATION_AUDIENCE_LABEL)
          : "",
        score: Number(event.score || 0),
      }));

    return {
      sourceId: source.id,
      sourceName: source.name,
      sourceUrl: source.url,
      status: "ok",
      elapsedMs: Date.now() - startedAt,
      eventsFound: sourceEvents.length,
      events: sourceEvents,
    };
  } catch (error) {
    const errorMessage = error?.name === "AbortError"
      ? "Tempo limite por fonte excedido."
      : String(error?.message || "Falha ao varrer fonte.");

    return {
      sourceId: source.id,
      sourceName: source.name,
      sourceUrl: source.url,
      status: "error",
      elapsedMs: Date.now() - startedAt,
      eventsFound: 0,
      error: errorMessage,
      events: [],
    };
  }
}

function parseSourceIds(value = "") {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function parseRequestPayload(event) {
  const query = event?.queryStringParameters || {};
  const isPost = String(event?.httpMethod || "").toUpperCase() === "POST";
  let body = {};

  if (isPost && event?.body) {
    try {
      const rawBody = event.isBase64Encoded
        ? Buffer.from(String(event.body), "base64").toString("utf8")
        : String(event.body);
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      body = {};
    }
  }

  const modeInput = String(body.mode || query.mode || QUICK_MODE).trim().toLowerCase();
  const mode = modeInput === FULL_MODE ? FULL_MODE : QUICK_MODE;
  const year = clampYear(body.year ?? query.year ?? DEFAULT_YEAR);
  const queryTerm = String(body.query || query.query || "").trim();
  const maxSourcesRaw = Number(body.maxSources ?? query.maxSources ?? DEFAULT_MAX_SOURCES);
  const maxSources = Number.isFinite(maxSourcesRaw)
    ? Math.min(MAX_MAX_SOURCES, Math.max(1, Math.trunc(maxSourcesRaw)))
    : DEFAULT_MAX_SOURCES;
  const sourceIds = parseSourceIds(body.sourceIds || query.sourceIds || "");
  const group = String(body.group || query.group || "").trim().toLowerCase();

  return {
    mode,
    year,
    queryTerm,
    maxSources,
    sourceIds,
    group,
  };
}

function isWomenFocusGroup(group = "") {
  return String(group || "").trim().toLowerCase() === WOMEN_FOCUS_GROUP;
}

function isFapesbGroup(group = "") {
  return String(group || "").trim().toLowerCase() === FAPESB_GROUP;
}

function resolveScanSettings(mode = QUICK_MODE) {
  if (mode === FULL_MODE) {
    return {
      timeBudgetMs: FULL_TIME_BUDGET_MS,
      perSourceTimeoutMs: FULL_SOURCE_TIMEOUT_MS,
      maxConcurrent: FULL_MAX_CONCURRENT,
    };
  }

  return {
    timeBudgetMs: QUICK_TIME_BUDGET_MS,
    perSourceTimeoutMs: QUICK_SOURCE_TIMEOUT_MS,
    maxConcurrent: QUICK_MAX_CONCURRENT,
  };
}

function resolveSourcesToScan({ sourceIds = [], group = "", maxSources = DEFAULT_MAX_SOURCES }) {
  const normalizedGroup = String(group || "").trim().toLowerCase();
  const sourceIdSet = new Set(sourceIds.map((item) => item.toLowerCase()));
  const hasSourceFilter = sourceIdSet.size > 0;
  const hasGroupFilter = Boolean(normalizedGroup);

  const sorted = [...POP_EVENT_SOURCES].sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0));
  const filtered = sorted.filter((source) => {
    if (hasSourceFilter && !sourceIdSet.has(String(source.id || "").toLowerCase())) {
      return false;
    }
    if (hasGroupFilter && isFapesbGroup(normalizedGroup)) {
      return String(source.id || "").toLowerCase() === FAPESB_SOURCE_ID;
    }
    if (hasGroupFilter && isWomenFocusGroup(normalizedGroup)) {
      return true;
    }
    if (hasGroupFilter && String(source.group || "").toLowerCase() !== normalizedGroup) {
      return false;
    }
    return true;
  });

  return filtered.slice(0, Math.max(1, Number(maxSources) || DEFAULT_MAX_SOURCES));
}

function filterEventsByQuery(events = [], queryTerm = "") {
  const normalizedQuery = normalizeForSearch(queryTerm);
  if (!normalizedQuery) {
    return events;
  }

  return events.filter((event) => {
    const haystack = normalizeForSearch([
      event.title,
      event.description,
      event.sourceName,
      event.sourceGroupLabel,
      event.dateText,
    ].join(" "));

    return haystack.includes(normalizedQuery);
  });
}

function filterEventsByGroupFocus(events = [], group = "") {
  const normalizedGroup = String(group || "").trim().toLowerCase();

  if (isFapesbGroup(normalizedGroup)) {
    return events.filter((event) => String(event?.sourceId || "").trim().toLowerCase() === FAPESB_SOURCE_ID);
  }

  if (isWomenFocusGroup(normalizedGroup)) {
    return events.filter((event) => event?.womenProtagonism === true);
  }

  return events;
}

async function runConcurrentScans({
  sources = [],
  year = DEFAULT_YEAR,
  perSourceTimeoutMs = QUICK_SOURCE_TIMEOUT_MS,
  maxEventsPerSource = DEFAULT_MAX_EVENTS_PER_SOURCE,
  maxConcurrent = QUICK_MAX_CONCURRENT,
  deadline = 0,
}) {
  const reports = [];
  const events = [];
  const orderMap = new Map(
    sources.map((source, index) => [String(source.id || ""), index]),
  );

  let sourceCursor = 0;
  const activeTasks = new Set();

  const launchTaskIfPossible = () => {
    if (sourceCursor >= sources.length) return false;

    if (deadline > 0 && Date.now() >= deadline) {
      return false;
    }

    const source = sources[sourceCursor];
    sourceCursor += 1;

    const task = scanSourceForEvents(source, {
      year,
      perSourceTimeoutMs,
      maxEventsPerSource,
    })
      .then((sourceReport) => {
        reports.push({
          sourceId: sourceReport.sourceId,
          sourceName: sourceReport.sourceName,
          sourceUrl: sourceReport.sourceUrl,
          status: sourceReport.status,
          elapsedMs: sourceReport.elapsedMs,
          eventsFound: sourceReport.eventsFound,
          error: sourceReport.error || "",
        });

        if (Array.isArray(sourceReport.events) && sourceReport.events.length > 0) {
          events.push(...sourceReport.events);
        }
      })
      .finally(() => {
        activeTasks.delete(task);
      });

    activeTasks.add(task);
    return true;
  };

  const safeMaxConcurrent = Math.max(1, Number(maxConcurrent) || QUICK_MAX_CONCURRENT);
  while (activeTasks.size < safeMaxConcurrent && launchTaskIfPossible()) {
    // preencher janela inicial
  }

  while (activeTasks.size > 0) {
    await Promise.race(activeTasks);
    while (activeTasks.size < safeMaxConcurrent && launchTaskIfPossible()) {
      // manter janela de concorrencia ativa
    }
  }

  if (sourceCursor < sources.length) {
    for (let index = sourceCursor; index < sources.length; index += 1) {
      const source = sources[index];
      reports.push({
        sourceId: source.id,
        sourceName: source.name,
        sourceUrl: source.url,
        status: "skipped_time_budget",
        elapsedMs: 0,
        eventsFound: 0,
      });
    }
  }

  reports.sort((left, right) => {
    const leftOrder = orderMap.get(String(left.sourceId || "")) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = orderMap.get(String(right.sourceId || "")) ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder;
  });

  return { reports, events };
}

export async function handler(event) {
  const method = String(event?.httpMethod || "").toUpperCase();
  if (!["GET", "POST"].includes(method)) {
    return json(405, {
      success: false,
      error: "Metodo nao suportado. Use GET ou POST.",
    });
  }

  const startedAt = Date.now();
  const payload = parseRequestPayload(event);
  const womenFocusEnabled = isWomenFocusGroup(payload.group);
  const effectiveMode = womenFocusEnabled ? FULL_MODE : payload.mode;
  const effectiveMaxSources = womenFocusEnabled
    ? POP_EVENT_SOURCES.length
    : payload.maxSources;
  const effectiveMaxEventsPerSource = womenFocusEnabled
    ? WOMEN_FOCUS_MAX_EVENTS_PER_SOURCE
    : DEFAULT_MAX_EVENTS_PER_SOURCE;

  const scanSettings = resolveScanSettings(effectiveMode);
  const sourcesToScan = resolveSourcesToScan({
    ...payload,
    maxSources: effectiveMaxSources,
  });
  const deadline = startedAt + scanSettings.timeBudgetMs;
  const { reports, events: collectedEvents } = await runConcurrentScans({
    sources: sourcesToScan,
    year: payload.year,
    perSourceTimeoutMs: scanSettings.perSourceTimeoutMs,
    maxEventsPerSource: effectiveMaxEventsPerSource,
    maxConcurrent: scanSettings.maxConcurrent,
    deadline,
  });

  const dedupedEvents = dedupeEvents(collectedEvents);
  const filteredByGroupFocus = filterEventsByGroupFocus(dedupedEvents, payload.group);
  const filteredByQuery = filterEventsByQuery(filteredByGroupFocus, payload.queryTerm);
  const sortedEvents = sortEvents(filteredByQuery).slice(0, MAX_EVENTS_RETURNED);
  const successSources = reports.filter((item) => item.status === "ok").length;
  const errorSources = reports.filter((item) => item.status === "error").length;
  const skippedSources = reports.filter((item) => item.status === "skipped_time_budget").length;

  return json(200, {
    success: true,
    generatedAt: new Date().toISOString(),
    year: payload.year,
    mode: effectiveMode,
    requestedMode: payload.mode,
    query: payload.queryTerm,
    group: payload.group,
    womenFocusEnabled,
    sourcesRequested: sourcesToScan.length,
    sourcesScanned: successSources + errorSources,
    sourcesSucceeded: successSources,
    sourcesFailed: errorSources,
    sourcesSkippedByBudget: skippedSources,
    elapsedMs: Date.now() - startedAt,
    eventsCount: sortedEvents.length,
    scanLimitMs: scanSettings.timeBudgetMs,
    reports,
    availableSources: POP_EVENT_SOURCES.map((source) => ({
      id: source.id,
      name: source.name,
      group: source.group,
      groupLabel: source.groupLabel,
      url: source.url,
    })),
    events: sortedEvents,
  });
}
