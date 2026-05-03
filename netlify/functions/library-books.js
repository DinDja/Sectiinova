const LIBRARY_BOT_LOG_TAG = "[library-books-bot]";
const GUTENDEX_API_URL = "https://gutendex.com/books";
const OPEN_LIBRARY_API_URL = "https://openlibrary.org/search.json";
const WIKISOURCE_API_URL = "https://pt.wikisource.org/w/api.php";
const ARCHIVE_ADVANCED_SEARCH_API_URL = "https://archive.org/advancedsearch.php";
const BOT_USER_AGENT = "SECTI-Library-Bot/1.0";
const REQUEST_TIMEOUT_MS = 10000;
const ROBOT_FETCH_DEADLINE_MS = 7000;
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_KEY_VERSION = "books-v2";
const SECTI_MAGAZINE_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_SEARCH_TERMS = 8;
const TERM_FETCH_CONCURRENCY = 4;
const TERM_FETCH_MAX_ATTEMPTS = 2;
const OPEN_LIBRARY_TERMS_LIMIT = 1;
const WIKISOURCE_TERMS_LIMIT = 1;
const ARCHIVE_TERMS_LIMIT = 2;
const OPEN_LIBRARY_LIMIT_PER_TERM = 8;
const WIKISOURCE_LIMIT_PER_TERM = 8;
const ARCHIVE_LIMIT_PER_TERM = 12;
const DEFAULT_LIMIT = 18;
const MAX_LIMIT = 40;
const MIN_RELEVANCE_SCORE = 0.33;
const RELAXED_MIN_RELEVANCE_SCORE = 0.2;
const PORTUGUESE_PRIORITY_RATIO = 0.7;
const SOURCE_UNAVAILABLE_MESSAGE =
  "Nao foi possivel consultar fontes de livros livres no momento. Tente novamente em instantes.";
const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const DEFAULT_INTENT =
  "Formacao cientifica escolar com foco em ciencia, tecnologia e inovacao";
const SECTI_PORTAL_URL = "https://www.ba.gov.br/secti/";
const SECTI_MAGAZINE_SOURCE_URLS = [
  "https://www.ba.gov.br/secti/banner/revista-bfc-1",
  "https://www.ba.gov.br/secti/",
  "https://www.ba.gov.br/secti/revistas",
];
const DEFAULT_SECTI_MAGAZINE = {
  title: "Revista Bahia Faz Ciencia",
  description:
    "Publicacao oficial da SECTI com destaques de ciencia aplicada e inovacao na Bahia.",
  editionLabel: "Edicao mais recente",
  pdfUrl:
    "https://www.ba.gov.br/secti/sites/site-secti/files/2025-10/REVISTA_A4_BFC2025_FINAL-BFC_SITE%20%281%29.pdf",
  previewImageUrl:
    "https://www.ba.gov.br/secti/sites/site-secti/files/styles/banner_1400x310/public/2025-10/BAN_1400x310px_LANCAMENTO.jpg",
  portalUrl: SECTI_PORTAL_URL,
  sourceUrl: "https://www.ba.gov.br/secti/banner/revista-bfc-1",
  lastCheckedAt: "",
};
const OPEN_LIBRARY_FIELDS = [
  "key",
  "title",
  "author_name",
  "language",
  "ebook_access",
  "has_fulltext",
  "public_scan_b",
  "subject",
  "cover_i",
  "ia",
  "edition_count",
  "first_publish_year",
  "readinglog_count",
].join(",");

const PORTUGUESE_PORTALS = [
  {
    id: "archive-pt",
    name: "Internet Archive (acervo em português)",
    url: "https://archive.org/details/texts?and[]=languageSorter%3A%22Portuguese%22",
    note: "Biblioteca digital aberta com download livre e leitura online.",
  },
  {
    id: "openlibrary-pt",
    name: "Open Library (Português)",
    url: "https://openlibrary.org/search?language=por&mode=ebooks",
    note: "Busca com livros digitais em portugues e leitura online.",
  },
  {
    id: "wikisource-pt",
    name: "Wikisource em Português",
    url: "https://pt.wikisource.org/wiki/Wikisource:Obras",
    note: "Biblioteca livre com obras em dominio publico.",
  },
  {
    id: "dominio-publico-mec",
    name: "Portal Domínio Público (MEC)",
    url: "https://portal.mec.gov.br/dominio-publico",
    note: "Acervo brasileiro oficial de obras de dominio publico.",
  },
];

const PORTUGUESE_BASE_SEARCH_TERMS = [
  "ciencia tecnologia inovacao educacao",
  "experimentos cientificos escola",
  "matematica fisica quimica biologia",
  "engenharia robotica programacao",
  "metodo cientifico estudantes",
  "divulgacao cientifica brasil",
  "educacao cientifica brasileira",
  "tecnologia social sustentabilidade",
];

const INTERNATIONAL_BASE_SEARCH_TERMS = [
  "science education",
  "technology innovation",
  "engineering mathematics",
  "biology chemistry physics",
  "scientific method",
  "inventors inventions",
  "experiments for students",
  "environment sustainability",
];

const CORE_DOMAIN_HINTS = [
  "science",
  "scientific",
  "technology",
  "engineering",
  "mathematics",
  "math",
  "physics",
  "chemistry",
  "biology",
  "astronomy",
  "innovation",
  "invention",
  "research",
  "experiment",
  "computer",
  "programming",
  "robot",
  "education",
  "ciencia",
  "tecnologia",
  "inovacao",
  "pesquisa",
  "experimento",
  "robotica",
  "programacao",
  "engenharia",
  "matematica",
  "fisica",
  "quimica",
  "biologia",
];

const SCHOOL_FOCUS_HINTS = [
  "school",
  "student",
  "students",
  "teaching",
  "teacher",
  "classroom",
  "education",
  "didactic",
  "pedagogy",
  "escola",
  "escolar",
  "aluno",
  "alunos",
  "estudante",
  "estudantes",
  "professor",
  "professora",
  "educacao",
  "didatico",
  "pedagog",
];

const NEGATIVE_HINTS = [
  "romance",
  "novel",
  "fiction",
  "poetry",
  "poem",
  "drama",
  "fairy",
  "tale",
  "love story",
  "conto de fadas",
];

const STRICT_SCIENCE_HINTS = [
  "science",
  "scientific",
  "stem",
  "technology",
  "engineering",
  "mathematics",
  "math",
  "physics",
  "chemistry",
  "biology",
  "astronomy",
  "research",
  "experiment",
  "laboratory",
  "robot",
  "robotics",
  "computer science",
  "programming",
  "coding",
  "data science",
  "inovacao",
  "ciencia",
  "cientifico",
  "cientifica",
  "tecnologia",
  "engenharia",
  "matematica",
  "fisica",
  "quimica",
  "biologia",
  "astronomia",
  "pesquisa",
  "experimento",
  "laboratorio",
  "robotica",
  "computacao",
  "programacao",
  "analise de dados",
];

const EXPLICIT_ADULT_HINTS = [
  // --- Termos Originais ---
  "porn", "porno", "pornograf", "xxx", "hentai", "nsfw",
  "sex tape", "erotic", "erotico", "erotica", "conteudo adulto explicito",
  "adult content", "adulto explicito", "fetish", "bdsm", "camgirl", "onlyfans",

  // --- Plataformas, Tags e Sites Conhecidos ---
  "pornhub", "xvideos", "redtube", "xhamster", "brazzers", "chaturbate",
  "stripchat", "camsoda", "myfreecams", "privacy", "fansly", "rule34", "r34", "e621",

  // --- Termos Gerais e Atos (Inglês) ---
  "sex", "sexy", "nude", "nudes", "nudity", "hardcore", "softcore",
  "amateur", "milf", "orgy", "gangbang", "blowjob", "handjob", "cum",
  "cumshot", "squirt", "masturbate", "masturbation", "dildo", "vibrator",
  "anal", "deepthroat", "bukkake", "cuckold", "escort", "hooker", "slut", "whore",
  "boobs", "tits", "pussy", "dick", "cock", "vagina", "penis",

  // --- Termos Gerais e Atos (Português) ---
  "sexo", "nua", "nuas", "pelada", "peladas", "putaria", "puta", "prostituta",
  "acompanhante", "garota de programa", "suruba", "orgia", "foda", "foder",
  "transa", "transar", "masturbação", "masturbacao", "punheta", "siririca",
  "boquete", "chupada", "gozada", "buceta", "xoxota", "peitos", "mamas",
  "rola", "pinto", "caralho", "caceta", "tesão", "tesao", "novinha",
  "coroas", "amador", "amadora", 

  // --- Variações e Indicadores de Idade ---
  "conteudo +18", "conteúdo +18", "+18", "18+", "maiores de 18", "over 18",
  // --- Termos Gerais e Ideologia ---
  "direita", "conservador", "conservadora", "conservadorismo", 
  "centro-direita", "extrema-direita", "nova direita", "direita raiz",
  "reacionário", "reacionaria", "nacionalismo", "nacionalista",

  // --- Valores e Pautas Sociais ---
  "deus pátria e família", "deus pátria família", "pró-vida", "pro vida",
  "anti-aborto", "contra o aborto", "pró-armas", "pro armas", "legítima defesa",
  "família tradicional", "valores cristãos", "contra ideologia de gênero",
  "escola sem partido", "liberdade de expressão",

  // --- Economia (Liberalismo / Libertarianismo) ---
  "liberal", "liberalismo", "estado mínimo", "livre mercado", 
  "privatização", "privatize já", "capitalismo", "menos impostos",
  "libertário", "libertarianismo", "ancap", "anarcocapitalismo", "imposto é roubo",

  // --- Movimentos, Oposição e Política Brasileira ---
  "patriota", "patriotas", "anticomunismo", "anticomunista", 
  "antipetismo", "antipetista", "anti-esquerda", "fora pt", 
  "bolsonaro", "bolsonarismo", "bolsonarista", "olavismo", "olavo tem razão",
  "mbl", "partido liberal", "pl"
];

const TOKEN_TRANSLATIONS = {
  ciencia: "science",
  cientifica: "scientific",
  tecnologia: "technology",
  tecnologica: "technology",
  inovacao: "innovation",
  escola: "school",
  escolar: "school",
  educacao: "education",
  estudante: "student",
  alunos: "students",
  robotica: "robotics",
  engenharia: "engineering",
  matematica: "mathematics",
  fisica: "physics",
  quimica: "chemistry",
  biologia: "biology",
  pesquisa: "research",
  experimento: "experiment",
  computacao: "computer",
  programacao: "programming",
  sustentabilidade: "sustainability",
  ambiente: "environment",
  sexo: "sex",
  sexual: "sexual",
  sexualidade: "sexuality",
  sexologia: "sexology",
  reproducao: "reproduction",
  reprodutiva: "reproductive",
  puberdade: "puberty",
  contracepcao: "contraception",
};

const PORTUGUESE_CONTENT_HINTS = [
  " de ",
  " para ",
  " com ",
  " em ",
  " ciencia",
  " tecnolog",
  " inovacao",
  " educacao",
  " escola",
  " estudante",
  " laboratorio",
  " experimento",
  " introducao",
  " manual",
];

const STATIC_FALLBACK_BOOKS = [
  {
    id: "36553",
    title: "Education in England in the Middle Ages",
    authors: [{ name: "A. F. Leach", birthYear: null, deathYear: null }],
    languages: ["en"],
    subjects: [
      "Education -- England -- History",
      "Schools -- England -- History",
    ],
    bookshelves: ["Education"],
    downloadCount: 6670,
    relevanceScore: 0.51,
    matchReason: [
      "conteudo educacional para ambiente escolar",
      "fallback de contingencia com foco em educacao",
    ],
    isPortugueseSource: false,
    coverUrl: "https://www.gutenberg.org/cache/epub/36553/pg36553.cover.medium.jpg",
    downloads: {
      pdf: "",
      epub: "https://www.gutenberg.org/ebooks/36553.epub3.images",
      html: "https://www.gutenberg.org/ebooks/36553.html.images",
      text: "https://www.gutenberg.org/files/36553/36553-8.txt",
    },
    sourceUrl: "https://www.gutenberg.org/ebooks/36553",
    publicDomain: true,
  },
  {
    id: "7150",
    title: "Science & Education: Essays",
    authors: [{ name: "Thomas H. Huxley", birthYear: null, deathYear: null }],
    languages: ["en"],
    subjects: [
      "Science",
      "Education",
      "Scientific method",
    ],
    bookshelves: ["Science", "Education"],
    downloadCount: 980,
    relevanceScore: 0.57,
    matchReason: [
      "tema relacionado a ciencia e tecnologia",
      "conteudo educacional para ambiente escolar",
    ],
    isPortugueseSource: false,
    coverUrl: "https://www.gutenberg.org/cache/epub/7150/pg7150.cover.medium.jpg",
    downloads: {
      pdf: "",
      epub: "https://www.gutenberg.org/ebooks/7150.epub3.images",
      html: "https://www.gutenberg.org/ebooks/7150.html.images",
      text: "https://www.gutenberg.org/files/7150/7150-8.txt",
    },
    sourceUrl: "https://www.gutenberg.org/ebooks/7150",
    publicDomain: true,
  },
  {
    id: "18451",
    title: "Ontario Normal School Manuals: Science of Education",
    authors: [{ name: "Ontario Department of Education", birthYear: null, deathYear: null }],
    languages: ["en"],
    subjects: [
      "Education",
      "Teaching",
      "School management",
    ],
    bookshelves: ["Education"],
    downloadCount: 818,
    relevanceScore: 0.52,
    matchReason: [
      "conteudo educacional para ambiente escolar",
      "aderente ao intuito informado",
    ],
    isPortugueseSource: false,
    coverUrl: "https://www.gutenberg.org/cache/epub/18451/pg18451.cover.medium.jpg",
    downloads: {
      pdf: "",
      epub: "https://www.gutenberg.org/ebooks/18451.epub3.images",
      html: "https://www.gutenberg.org/ebooks/18451.html.images",
      text: "https://www.gutenberg.org/files/18451/18451-8.txt",
    },
    sourceUrl: "https://www.gutenberg.org/ebooks/18451",
    publicDomain: true,
  },
  {
    id: "20557",
    title: "Ontario Teachers' Manuals: Household Science in Rural Schools",
    authors: [{ name: "Ontario Department of Education", birthYear: null, deathYear: null }],
    languages: ["en"],
    subjects: [
      "School science",
      "Household science",
      "Teaching",
    ],
    bookshelves: ["Education"],
    downloadCount: 681,
    relevanceScore: 0.49,
    matchReason: [
      "tema relacionado a ciencia e tecnologia",
      "conteudo educacional para ambiente escolar",
    ],
    isPortugueseSource: false,
    coverUrl: "https://www.gutenberg.org/cache/epub/20557/pg20557.cover.medium.jpg",
    downloads: {
      pdf: "",
      epub: "https://www.gutenberg.org/ebooks/20557.epub3.images",
      html: "https://www.gutenberg.org/ebooks/20557.html.images",
      text: "https://www.gutenberg.org/files/20557/20557-8.txt",
    },
    sourceUrl: "https://www.gutenberg.org/ebooks/20557",
    publicDomain: true,
  },
  {
    id: "38025",
    title: "Natural Science Stories",
    authors: [{ name: "Leo Tolstoy", birthYear: null, deathYear: null }],
    languages: ["en"],
    subjects: [
      "Natural science",
      "Stories for children",
      "Popular education",
    ],
    bookshelves: ["Science", "Children"],
    downloadCount: 1652,
    relevanceScore: 0.5,
    matchReason: [
      "tema relacionado a ciencia e tecnologia",
      "conteudo educacional para ambiente escolar",
    ],
    isPortugueseSource: false,
    coverUrl: "https://www.gutenberg.org/cache/epub/38025/pg38025.cover.medium.jpg",
    downloads: {
      pdf: "",
      epub: "https://www.gutenberg.org/ebooks/38025.epub3.images",
      html: "https://www.gutenberg.org/ebooks/38025.html.images",
      text: "https://www.gutenberg.org/files/38025/38025-0.txt",
    },
    sourceUrl: "https://www.gutenberg.org/ebooks/38025",
    publicDomain: true,
  },
  {
    id: "31360",
    title: "Anthropology: As a Science and as a Branch of University Education",
    authors: [{ name: "Franz Boas", birthYear: null, deathYear: null }],
    languages: ["en"],
    subjects: [
      "Anthropology",
      "University education",
      "Science",
    ],
    bookshelves: ["Science", "Education"],
    downloadCount: 413,
    relevanceScore: 0.44,
    matchReason: [
      "tema relacionado a ciencia e tecnologia",
      "aderente ao intuito informado",
    ],
    isPortugueseSource: false,
    coverUrl: "https://www.gutenberg.org/cache/epub/31360/pg31360.cover.medium.jpg",
    downloads: {
      pdf: "",
      epub: "https://www.gutenberg.org/ebooks/31360.epub3.images",
      html: "https://www.gutenberg.org/ebooks/31360.html.images",
      text: "https://www.gutenberg.org/files/31360/31360-8.txt",
    },
    sourceUrl: "https://www.gutenberg.org/ebooks/31360",
    publicDomain: true,
  },
];

function json(statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  };
}

function parseBody(event) {
  if (!event?.body) {
    return {};
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(String(event.body || ""), "base64").toString("utf8")
    : String(event.body || "");

  if (!rawBody.trim()) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return {};
  }
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeText(value) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function uniqueItems(items) {
  const output = [];
  const seen = new Set();

  for (const item of items) {
    const key = String(item || "").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(key);
  }

  return output;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toBoolean(value) {
  return /^(1|true|yes|y)$/i.test(String(value || "").trim());
}

function toSafeString(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function readLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return clamp(Math.trunc(parsed), 1, MAX_LIMIT);
}

function translateToken(token) {
  const normalized = normalizeText(token);
  if (!normalized) return "";

  for (const [source, target] of Object.entries(TOKEN_TRANSLATIONS)) {
    if (normalized.includes(source)) {
      return target;
    }
  }

  return normalized;
}

function buildContext(intent, query) {
  const normalizedIntent = toSafeString(intent || DEFAULT_INTENT, 280);
  const normalizedQuery = toSafeString(query, 140);

  const intentTokens = tokenizeText(normalizedIntent);
  const queryTokens = tokenizeText(normalizedQuery);
  const translatedIntentTokens = uniqueItems(intentTokens.map(translateToken));
  const translatedQueryTokens = uniqueItems(queryTokens.map(translateToken));
  const contextTokens = uniqueItems([
    ...intentTokens,
    ...queryTokens,
    ...translatedIntentTokens,
    ...translatedQueryTokens,
  ]).filter((token) => token.length >= 3);
  const queryTokensForMatch = uniqueItems([
    ...queryTokens,
    ...translatedQueryTokens,
  ]).filter((token) => token.length >= 3);

  const prioritizedPortugueseTerms = [];
  const prioritizedInternationalTerms = [];

  for (const token of [...queryTokens, ...intentTokens]) {
    if (token.length >= 4) {
      prioritizedPortugueseTerms.push(token);
    }
  }

  for (const token of [...translatedQueryTokens, ...translatedIntentTokens]) {
    if (token.length >= 4) {
      prioritizedInternationalTerms.push(token);
    }
  }

  if (queryTokens.length >= 2) {
    prioritizedPortugueseTerms.push(`${queryTokens[0]} ${queryTokens[1]}`);
  }

  if (intentTokens.length >= 2) {
    prioritizedPortugueseTerms.push(`${intentTokens[0]} ${intentTokens[1]}`);
  }

  if (translatedQueryTokens.length >= 2) {
    prioritizedInternationalTerms.push(`${translatedQueryTokens[0]} ${translatedQueryTokens[1]}`);
  }

  if (translatedIntentTokens.length >= 2) {
    prioritizedInternationalTerms.push(`${translatedIntentTokens[0]} ${translatedIntentTokens[1]}`);
  }

  const portugueseTerms = uniqueItems([
    ...prioritizedPortugueseTerms,
    ...PORTUGUESE_BASE_SEARCH_TERMS,
  ]).slice(0, MAX_SEARCH_TERMS);

  const internationalTerms = uniqueItems([
    ...prioritizedInternationalTerms,
    ...INTERNATIONAL_BASE_SEARCH_TERMS,
  ]).slice(0, MAX_SEARCH_TERMS);

  const terms = uniqueItems([
    ...portugueseTerms,
    ...internationalTerms,
  ]).slice(0, MAX_SEARCH_TERMS);

  return {
    intent: normalizedIntent,
    query: normalizedQuery,
    terms,
    portugueseTerms,
    internationalTerms,
    contextTokens,
    translatedQueryTokens,
    queryTokensForMatch,
  };
}

function buildSourceTermPlan(context = {}) {
  const portugueseTerms = Array.isArray(context?.portugueseTerms) ? context.portugueseTerms : [];
  const internationalTerms = Array.isArray(context?.internationalTerms) ? context.internationalTerms : [];
  const query = toSafeString(context?.query || "", 140);

  const gutendexTerms = uniqueItems([
    query,
    ...portugueseTerms.slice(0, 3),
    ...internationalTerms.slice(0, 1),
  ]).filter((term) => String(term || "").length >= 3).slice(0, 5);

  const openLibraryTerms = uniqueItems([
    query,
    ...portugueseTerms,
  ]).filter((term) => String(term || "").length >= 3).slice(0, OPEN_LIBRARY_TERMS_LIMIT);

  const wikisourceTerms = uniqueItems([
    query,
    ...portugueseTerms,
  ]).filter((term) => String(term || "").length >= 3).slice(0, WIKISOURCE_TERMS_LIMIT);

  const archiveTerms = uniqueItems([
    query,
    ...portugueseTerms,
  ]).filter((term) => String(term || "").length >= 3).slice(0, ARCHIVE_TERMS_LIMIT);

  return {
    gutendexTerms,
    openLibraryTerms,
    wikisourceTerms,
    archiveTerms,
  };
}

function stripHtmlTags(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function getCacheStore() {
  if (!globalThis.__libraryBooksCache || !(globalThis.__libraryBooksCache instanceof Map)) {
    globalThis.__libraryBooksCache = new Map();
  }
  return globalThis.__libraryBooksCache;
}

function getInflightStore() {
  if (!globalThis.__libraryBooksInflight || !(globalThis.__libraryBooksInflight instanceof Map)) {
    globalThis.__libraryBooksInflight = new Map();
  }
  return globalThis.__libraryBooksInflight;
}

function getSectiMagazineCacheStore() {
  if (!globalThis.__sectiMagazineCache || !(globalThis.__sectiMagazineCache instanceof Map)) {
    globalThis.__sectiMagazineCache = new Map();
  }
  return globalThis.__sectiMagazineCache;
}

function getSectiMagazineInflightStore() {
  if (!globalThis.__sectiMagazineInflight || !(globalThis.__sectiMagazineInflight instanceof Map)) {
    globalThis.__sectiMagazineInflight = new Map();
  }
  return globalThis.__sectiMagazineInflight;
}

function readCache(cacheKey) {
  const store = getCacheStore();
  const entry = store.get(cacheKey);
  if (!entry) return null;

  const age = Date.now() - Number(entry.createdAt || 0);
  if (!Number.isFinite(age) || age < 0 || age > CACHE_TTL_MS) {
    store.delete(cacheKey);
    return null;
  }

  const payload = entry.payload;
  if (!payload || payload.success !== true || !Array.isArray(payload.books)) {
    return payload;
  }

  const safeBooks = sanitizeBooksForSafety(payload.books);
  if (safeBooks.length === 0) {
    store.delete(cacheKey);
    return null;
  }

  if (safeBooks.length !== payload.books.length) {
    const sanitizedPayload = {
      ...payload,
      books: safeBooks,
    };
    store.set(cacheKey, {
      createdAt: Number(entry.createdAt || Date.now()),
      payload: sanitizedPayload,
    });
    return sanitizedPayload;
  }

  return payload;
}

function readAnyRecentCachePayload() {
  const store = getCacheStore();
  let freshest = null;
  let freshestSafeBooks = null;

  for (const [cacheKey, entry] of store.entries()) {
    const age = Date.now() - Number(entry?.createdAt || 0);
    if (!Number.isFinite(age) || age < 0 || age > CACHE_TTL_MS) {
      store.delete(cacheKey);
      continue;
    }

    const payload = entry?.payload;
    if (!payload || payload.success !== true || !Array.isArray(payload.books)) {
      continue;
    }

    const safeBooks = sanitizeBooksForSafety(payload.books);
    if (safeBooks.length === 0) {
      continue;
    }

    if (!freshest || Number(entry.createdAt || 0) > Number(freshest.createdAt || 0)) {
      freshest = entry;
      freshestSafeBooks = safeBooks;
    }
  }

  if (!freshest?.payload || !Array.isArray(freshestSafeBooks)) {
    return null;
  }

  const payload = freshest.payload;
  if (freshestSafeBooks.length !== payload.books.length) {
    return {
      ...payload,
      books: freshestSafeBooks,
    };
  }

  return payload;
}

function writeCache(cacheKey, payload) {
  const store = getCacheStore();
  store.set(cacheKey, {
    createdAt: Date.now(),
    payload,
  });
}

function readInflight(cacheKey) {
  const store = getInflightStore();
  return store.get(cacheKey) || null;
}

function writeInflight(cacheKey, promise) {
  const store = getInflightStore();
  store.set(cacheKey, promise);
}

function clearInflight(cacheKey) {
  const store = getInflightStore();
  store.delete(cacheKey);
}

function readSectiMagazineCache() {
  const store = getSectiMagazineCacheStore();
  const entry = store.get("latest");
  if (!entry) return null;

  const age = Date.now() - Number(entry.createdAt || 0);
  if (!Number.isFinite(age) || age < 0 || age > SECTI_MAGAZINE_CACHE_TTL_MS) {
    store.delete("latest");
    return null;
  }

  return entry.payload;
}

function writeSectiMagazineCache(payload) {
  const store = getSectiMagazineCacheStore();
  store.set("latest", {
    createdAt: Date.now(),
    payload,
  });
}

function readSectiMagazineInflight() {
  const store = getSectiMagazineInflightStore();
  return store.get("latest") || null;
}

function writeSectiMagazineInflight(promise) {
  const store = getSectiMagazineInflightStore();
  store.set("latest", promise);
}

function clearSectiMagazineInflight() {
  const store = getSectiMagazineInflightStore();
  store.delete("latest");
}

function normalizeHtmlEntityUrl(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .trim();
}

function absolutizeUrl(value, baseUrl) {
  const raw = normalizeHtmlEntityUrl(value);
  if (!raw) return "";

  try {
    return new URL(raw, baseUrl).toString();
  } catch {
    return "";
  }
}

function parsePublicationStampFromUrl(value) {
  const decoded = normalizeHtmlEntityUrl(decodeURIComponent(String(value || "")));
  if (!decoded) return 0;

  const monthMatch = decoded.match(/\/(20\d{2})-(0[1-9]|1[0-2])\//i);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const month = Number(monthMatch[2]);
    if (Number.isFinite(year) && Number.isFinite(month)) {
      return year * 100 + month;
    }
  }

  const bfcYearMatch = decoded.match(/bfc[^0-9]*(20\d{2})/i);
  if (bfcYearMatch) {
    const year = Number(bfcYearMatch[1]);
    if (Number.isFinite(year)) return year * 100;
  }

  const genericYearMatch = decoded.match(/\b(20\d{2})\b/);
  if (genericYearMatch) {
    const year = Number(genericYearMatch[1]);
    if (Number.isFinite(year)) return year * 100;
  }

  return 0;
}

function buildMagazineEditionLabel(value) {
  const decoded = normalizeHtmlEntityUrl(decodeURIComponent(String(value || "")));
  const monthMatch = decoded.match(/\/(20\d{2})-(0[1-9]|1[0-2])\//i);
  if (monthMatch) {
    return `Edicao ${monthMatch[2]}/${monthMatch[1]}`;
  }

  const bfcYearMatch = decoded.match(/bfc[^0-9]*(20\d{2})/i);
  if (bfcYearMatch) {
    return `Edicao ${bfcYearMatch[1]}`;
  }

  return DEFAULT_SECTI_MAGAZINE.editionLabel;
}

function extractPdfLinksFromHtml(html, baseUrl) {
  const rawLinks = [];
  const sourceHtml = String(html || "");
  const hrefPattern = /href=["']([^"']+)["']/gi;
  const absolutePdfPattern = /https?:\/\/[^\s"'<>]+\.pdf(?:[?#][^\s"'<>]*)?/gi;

  let match;
  while ((match = hrefPattern.exec(sourceHtml))) {
    const href = String(match[1] || "").trim();
    if (/\.pdf(?:[?#]|$)/i.test(href)) {
      rawLinks.push(href);
    }
  }

  while ((match = absolutePdfPattern.exec(sourceHtml))) {
    rawLinks.push(String(match[0] || ""));
  }

  return uniqueItems(
    rawLinks
      .map((candidate) => absolutizeUrl(candidate, baseUrl))
      .filter((candidate) => /^https?:\/\//i.test(candidate)),
  );
}

function extractImageEntriesFromHtml(html, baseUrl) {
  const sourceHtml = String(html || "");
  const imageTagPattern = /<img\b[^>]*>/gi;
  const entries = [];
  let match;

  while ((match = imageTagPattern.exec(sourceHtml))) {
    const tag = String(match[0] || "");
    const srcMatch = tag.match(/(?:src|data-src)=["']([^"']+)["']/i);
    const altMatch = tag.match(/alt=["']([^"']*)["']/i);
    const src = absolutizeUrl(srcMatch?.[1] || "", baseUrl);
    if (!src || !/\.(?:png|jpe?g|webp)(?:[?#].*)?$/i.test(src)) {
      continue;
    }

    entries.push({
      src,
      alt: toSafeString(altMatch?.[1] || "", 180),
    });
  }

  const deduped = new Map();
  for (const entry of entries) {
    if (!deduped.has(entry.src)) {
      deduped.set(entry.src, entry);
    }
  }

  return Array.from(deduped.values());
}

function scoreMagazinePdfLink(link) {
  const normalized = normalizeText(decodeURIComponent(String(link || "")));
  if (!normalized) return { keep: false, score: 0, stamp: 0 };

  const hasBfc = normalized.includes("bfc");
  const hasRevista = normalized.includes("revista");
  const hasBahiaFazCiencia = normalized.includes("bahia") && normalized.includes("ciencia");
  const hasPdf = normalized.includes(".pdf");

  if (!hasPdf || (!hasBfc && !hasBahiaFazCiencia && !hasRevista)) {
    return { keep: false, score: 0, stamp: 0 };
  }

  let score = 0;
  if (hasBfc) score += 6;
  if (hasRevista) score += 3;
  if (hasBahiaFazCiencia) score += 2;
  if (normalized.includes("final")) score += 1;
  if (normalized.includes("site")) score += 1;

  return {
    keep: true,
    score,
    stamp: parsePublicationStampFromUrl(link),
  };
}

function scoreMagazineImageEntry(entry = {}) {
  const normalizedSrc = normalizeText(decodeURIComponent(String(entry?.src || "")));
  const normalizedAlt = normalizeText(entry?.alt || "");
  const merged = `${normalizedSrc} ${normalizedAlt}`;
  if (!merged.trim()) return { keep: false, score: 0, stamp: 0 };

  const hasBfc = merged.includes("bfc");
  const hasRevista = merged.includes("revista");
  if (!hasBfc && !hasRevista) {
    return { keep: false, score: 0, stamp: 0 };
  }

  let score = 0;
  if (hasBfc) score += 5;
  if (hasRevista) score += 3;
  if (merged.includes("banner")) score += 1;
  if (merged.includes("card")) score += 1;

  return {
    keep: true,
    score,
    stamp: parsePublicationStampFromUrl(entry?.src || ""),
  };
}

function pickBestMagazinePdf(pdfs = []) {
  const ranked = [];
  for (const link of pdfs) {
    const scored = scoreMagazinePdfLink(link);
    if (!scored.keep) continue;
    ranked.push({
      link,
      score: scored.score,
      stamp: scored.stamp,
    });
  }

  ranked.sort((left, right) => {
    if (right.stamp !== left.stamp) return right.stamp - left.stamp;
    if (right.score !== left.score) return right.score - left.score;
    return String(left.link).localeCompare(String(right.link), "pt-BR");
  });

  return ranked[0] || null;
}

function pickBestMagazineImage(images = []) {
  const ranked = [];
  for (const entry of images) {
    const scored = scoreMagazineImageEntry(entry);
    if (!scored.keep) continue;
    ranked.push({
      ...entry,
      score: scored.score,
      stamp: scored.stamp,
    });
  }

  ranked.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (right.stamp !== left.stamp) return right.stamp - left.stamp;
    return String(left.src).localeCompare(String(right.src), "pt-BR");
  });

  return ranked[0] || null;
}

async function fetchTextWithTimeout(url, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": BOT_USER_AGENT,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error(`Fonte da revista retornou status ${response.status}.`);
      error.status = Number(response.status || 0);
      throw error;
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function fetchSectiMagazineCandidateFromPage(pageUrl, deadlineAt = Number.POSITIVE_INFINITY) {
  const remainingMs = Number.isFinite(deadlineAt)
    ? Math.max(0, Math.trunc(deadlineAt - Date.now()))
    : REQUEST_TIMEOUT_MS;

  if (remainingMs <= 0) {
    throw new Error("Prazo maximo para consulta da revista atingido.");
  }

  const effectiveTimeoutMs = Math.max(600, Math.min(REQUEST_TIMEOUT_MS, remainingMs));
  const html = await fetchTextWithTimeout(pageUrl, effectiveTimeoutMs);
  const pdfLinks = extractPdfLinksFromHtml(html, pageUrl);
  const imageEntries = extractImageEntriesFromHtml(html, pageUrl);
  const bestPdf = pickBestMagazinePdf(pdfLinks);
  const bestImage = pickBestMagazineImage(imageEntries);

  return {
    pageUrl,
    bestPdf,
    bestImage,
  };
}

async function resolveSectiScienceMagazine({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = readSectiMagazineCache();
    if (cached) return cached;
  }

  if (!forceRefresh) {
    const inflight = readSectiMagazineInflight();
    if (inflight) return inflight;
  }

  const task = (async () => {
    const deadlineAt = Date.now() + ROBOT_FETCH_DEADLINE_MS;
    const settled = await Promise.allSettled(
      SECTI_MAGAZINE_SOURCE_URLS.map((sourceUrl) =>
        fetchSectiMagazineCandidateFromPage(sourceUrl, deadlineAt)),
    );

    const pdfCandidates = [];
    const imageCandidates = [];

    for (const result of settled) {
      if (result.status !== "fulfilled") continue;
      if (result.value?.bestPdf) {
        pdfCandidates.push({
          ...result.value.bestPdf,
          pageUrl: result.value.pageUrl,
        });
      }
      if (result.value?.bestImage) {
        imageCandidates.push({
          ...result.value.bestImage,
          pageUrl: result.value.pageUrl,
        });
      }
    }

    pdfCandidates.sort((left, right) => {
      if (right.stamp !== left.stamp) return right.stamp - left.stamp;
      if (right.score !== left.score) return right.score - left.score;
      return String(left.link).localeCompare(String(right.link), "pt-BR");
    });

    imageCandidates.sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.stamp !== left.stamp) return right.stamp - left.stamp;
      return String(left.src).localeCompare(String(right.src), "pt-BR");
    });

    const bestPdf = pdfCandidates[0] || null;
    const bestImage = imageCandidates[0] || null;

    const selectedPdfUrl = toSafeString(bestPdf?.link || DEFAULT_SECTI_MAGAZINE.pdfUrl, 400);
    const selectedPreviewUrl = toSafeString(
      bestImage?.src || DEFAULT_SECTI_MAGAZINE.previewImageUrl,
      400,
    );

    const payload = {
      title: DEFAULT_SECTI_MAGAZINE.title,
      description: DEFAULT_SECTI_MAGAZINE.description,
      editionLabel: buildMagazineEditionLabel(selectedPdfUrl),
      pdfUrl: selectedPdfUrl,
      previewImageUrl: selectedPreviewUrl,
      portalUrl: SECTI_PORTAL_URL,
      sourceUrl: toSafeString(bestPdf?.pageUrl || DEFAULT_SECTI_MAGAZINE.sourceUrl, 320),
      lastCheckedAt: new Date().toISOString(),
    };

    writeSectiMagazineCache(payload);
    return payload;
  })().catch(() => {
    const fallback = {
      ...DEFAULT_SECTI_MAGAZINE,
      lastCheckedAt: new Date().toISOString(),
    };
    writeSectiMagazineCache(fallback);
    return fallback;
  });

  if (!forceRefresh) {
    writeSectiMagazineInflight(task);
  }

  try {
    return await task;
  } finally {
    if (!forceRefresh) {
      clearSectiMagazineInflight();
    }
  }
}

async function fetchJsonWithTimeout(url, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": BOT_USER_AGENT,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error(`Fonte de livros retornou status ${response.status}.`);
      error.status = Number(response.status || 0);
      throw error;
    }

    const payload = await response.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      throw new Error("Fonte de livros retornou payload invalido.");
    }

    return payload;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableFetchError(error) {
  const status = Number(error?.status || 0);
  if (RETRYABLE_HTTP_STATUSES.has(status)) {
    return true;
  }

  const normalizedName = normalizeText(error?.name || "");
  if (normalizedName.includes("abort")) {
    return true;
  }

  const normalizedMessage = normalizeText(error?.message || "");

  return (
    normalizedMessage.includes("fetch failed")
    || normalizedMessage.includes("timed out")
    || normalizedMessage.includes("socket")
    || normalizedMessage.includes("econn")
    || normalizedMessage.includes("network")
  );
}

async function fetchBooksByTerm(term, deadlineAt = Number.POSITIVE_INFINITY) {
  const searchTerm = encodeURIComponent(String(term || "").trim());
  const url = `${GUTENDEX_API_URL}?search=${searchTerm}`;

  let lastError = null;

  for (let attempt = 1; attempt <= TERM_FETCH_MAX_ATTEMPTS; attempt += 1) {
    try {
      const remainingMs = Number.isFinite(deadlineAt)
        ? Math.max(0, Math.trunc(deadlineAt - Date.now()))
        : REQUEST_TIMEOUT_MS;

      if (remainingMs <= 0) {
        throw new Error("Prazo maximo para consulta de fontes atingido.");
      }

      const effectiveTimeoutMs = Math.max(600, Math.min(REQUEST_TIMEOUT_MS, remainingMs));
      const payload = await fetchJsonWithTimeout(url, effectiveTimeoutMs);
      const rawResults = Array.isArray(payload?.results) ? payload.results : [];
      const results = rawResults.map((book) => {
        const id = String(book?.id || "").trim();
        return {
          ...book,
          source_url: id ? `https://www.gutenberg.org/ebooks/${id}` : "",
          source_name: "Gutendex / Projeto Gutenberg",
          source_id: "gutendex",
          source_kind: "api",
          source_weight: 0,
          match_tags: ["acervo internacional aberto"],
        };
      });
      return {
        term,
        results,
      };
    } catch (error) {
      lastError = error;
      const canRetry = attempt < TERM_FETCH_MAX_ATTEMPTS && isRetryableFetchError(error);
      if (!canRetry) {
        throw error;
      }

      await sleep(220 * attempt);
    }
  }

  throw lastError || new Error("Falha ao consultar termo de busca.");
}

async function fetchBooksByTerms(terms = [], deadlineAt = Number.POSITIVE_INFINITY) {
  const safeTerms = Array.isArray(terms) ? terms : [];
  const results = new Array(safeTerms.length);

  if (safeTerms.length === 0) {
    return results;
  }

  const workerCount = Math.max(
    1,
    Math.min(TERM_FETCH_CONCURRENCY, safeTerms.length),
  );

  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < safeTerms.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      const term = safeTerms[currentIndex];

      if (Number.isFinite(deadlineAt) && Date.now() >= deadlineAt) {
        results[currentIndex] = {
          status: "rejected",
          reason: new Error("Prazo maximo para consulta de fontes atingido."),
        };
        continue;
      }

      try {
        results[currentIndex] = {
          status: "fulfilled",
          value: await fetchBooksByTerm(term, deadlineAt),
        };
      } catch (reason) {
        results[currentIndex] = {
          status: "rejected",
          reason,
        };
      }
    }
  };

  await Promise.all(
    Array.from({ length: workerCount }, () => worker()),
  );

  return results;
}

function toNumericValue(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function readOpenLibraryCoverUrl(coverId) {
  const parsed = Number(coverId);
  if (!Number.isFinite(parsed) || parsed <= 0) return "";
  return `https://covers.openlibrary.org/b/id/${Math.trunc(parsed)}-L.jpg`;
}

function normalizeOpenLibraryBook(doc = {}) {
  const normalizedKey = toSafeString(doc?.key || "", 80);
  const openLibraryUrl = normalizedKey ? `https://openlibrary.org${normalizedKey}` : "";
  const iaIdentifier = Array.isArray(doc?.ia)
    ? toSafeString(doc.ia.find((entry) => String(entry || "").trim()), 120)
    : "";
  const archiveReadUrl = iaIdentifier ? `https://archive.org/details/${iaIdentifier}` : "";
  const subjectList = Array.isArray(doc?.subject)
    ? uniqueItems(doc.subject.map((subject) => toSafeString(subject, 120))).slice(0, 8)
    : [];

  const authorNames = Array.isArray(doc?.author_name)
    ? doc.author_name
    : [];
  const languageList = Array.isArray(doc?.language)
    ? doc.language
    : [];

  const rawId = normalizedKey
    ? normalizedKey.replace(/\//g, "-")
    : `openlibrary-${normalizeText(doc?.title || "sem-titulo")}`;
  const bookId = `openlibrary:${rawId}`;

  return {
    id: bookId,
    title: toSafeString(doc?.title || "Livro sem titulo", 220),
    authors: authorNames.map((name) => ({ name: toSafeString(name, 120) })).filter((author) => author.name),
    languages: languageList,
    subjects: subjectList,
    bookshelves: ["Open Library", "Biblioteca Digital"],
    download_count: Math.max(
      0,
      Math.trunc(
        toNumericValue(doc?.readinglog_count, 0)
        + toNumericValue(doc?.edition_count, 0) * 10,
      ),
    ),
    copyright: false,
    formats: {
      "text/html": archiveReadUrl || openLibraryUrl,
      "image/jpeg": readOpenLibraryCoverUrl(doc?.cover_i),
    },
    source_url: archiveReadUrl || openLibraryUrl,
    source_name: "Open Library",
    source_id: "openlibrary",
    source_kind: "api",
    source_weight: normalizeText(doc?.ebook_access || "") === "public" || doc?.public_scan_b === true
      ? 0.1
      : 0.05,
    match_tags: ["acervo em portugues", "fonte digital livre"],
  };
}

function normalizeWikisourceBook(entry = {}) {
  const pageId = Math.max(0, Math.trunc(toNumericValue(entry?.pageid, 0)));
  const title = toSafeString(entry?.title || "", 220) || "Obra sem titulo";
  const snippet = stripHtmlTags(entry?.snippet || "");
  const pageUrl = pageId > 0
    ? `https://pt.wikisource.org/?curid=${pageId}`
    : `https://pt.wikisource.org/wiki/${encodeURIComponent(title.replace(/\s+/g, "_"))}`;
  const id = pageId > 0
    ? `wikisource:${pageId}`
    : `wikisource:${normalizeText(title).slice(0, 80)}`;

  const looksLikeFragment = title.includes("/") || /\b(capitulo|art\.?|secao)\b/i.test(title);
  const scorePenalty = looksLikeFragment ? -0.1 : 0.05;

  return {
    id,
    title,
    authors: [],
    languages: ["pt"],
    subjects: uniqueItems([snippet, "Wikisource", "Dominio publico"]).slice(0, 6),
    bookshelves: ["Wikisource PT", "Dominio Publico"],
    download_count: Math.max(0, Math.trunc(toNumericValue(entry?.wordcount, 0))),
    copyright: false,
    formats: {
      "text/html": pageUrl,
    },
    source_url: pageUrl,
    source_name: "Wikisource PT",
    source_id: "wikisource-pt",
    source_kind: "api",
    source_weight: scorePenalty,
    match_tags: ["obra em portugues", "dominio publico"],
  };
}

function normalizeArchiveSubjects(subject) {
  if (Array.isArray(subject)) {
    return uniqueItems(subject.map((item) => toSafeString(item, 120))).slice(0, 8);
  }

  if (typeof subject === "string") {
    return uniqueItems(
      subject
        .split(/[;,]/g)
        .map((item) => toSafeString(item, 120))
        .filter(Boolean),
    ).slice(0, 8);
  }

  return [];
}

function normalizeArchiveAuthors(creator) {
  if (Array.isArray(creator)) {
    return creator
      .map((name) => ({ name: toSafeString(name, 120) }))
      .filter((author) => author.name);
  }

  const single = toSafeString(creator, 120);
  return single ? [{ name: single }] : [];
}

function readArchiveCoverUrl(identifier) {
  const normalized = toSafeString(identifier, 140);
  if (!normalized) return "";
  return `https://archive.org/services/img/${encodeURIComponent(normalized)}`;
}

function normalizeArchiveBook(doc = {}) {
  const identifier = toSafeString(doc?.identifier || "", 140);
  if (!identifier) return null;

  const detailsUrl = `https://archive.org/details/${identifier}`;
  const title = toSafeString(doc?.title || "Livro sem titulo", 220);
  const subjectList = normalizeArchiveSubjects(doc?.subject);
  const descriptionText = Array.isArray(doc?.description)
    ? stripHtmlTags(doc.description[0])
    : stripHtmlTags(doc?.description || "");

  return {
    id: `archive:${identifier}`,
    title,
    authors: normalizeArchiveAuthors(doc?.creator),
    languages: ["pt"],
    subjects: uniqueItems([...subjectList, descriptionText]).filter(Boolean).slice(0, 8),
    bookshelves: ["Archive.org", "Acervo Portugues Livre"],
    download_count: Math.max(0, Math.trunc(toNumericValue(doc?.downloads, 0))),
    copyright: false,
    formats: {
      "text/html": detailsUrl,
      "image/jpeg": readArchiveCoverUrl(identifier),
    },
    source_url: detailsUrl,
    source_name: "Internet Archive (PT)",
    source_id: "archive-pt",
    source_kind: "api",
    source_weight: 0.14,
    match_tags: ["acervo gratuito em portugues", "biblioteca digital aberta"],
  };
}

function escapeArchiveQueryTerm(term) {
  return String(term || "")
    .replace(/[()+\-!{}\[\]^"~*?:\\/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchOpenLibraryByTerm(term, deadlineAt = Number.POSITIVE_INFINITY) {
  const searchTerm = encodeURIComponent(String(term || "").trim());
  const url =
    `${OPEN_LIBRARY_API_URL}?q=${searchTerm}` +
    `&language=por&has_fulltext=true&limit=${OPEN_LIBRARY_LIMIT_PER_TERM}` +
    `&fields=${encodeURIComponent(OPEN_LIBRARY_FIELDS)}`;

  let lastError = null;

  for (let attempt = 1; attempt <= TERM_FETCH_MAX_ATTEMPTS; attempt += 1) {
    try {
      const remainingMs = Number.isFinite(deadlineAt)
        ? Math.max(0, Math.trunc(deadlineAt - Date.now()))
        : REQUEST_TIMEOUT_MS;

      if (remainingMs <= 0) {
        throw new Error("Prazo maximo para consulta de fontes atingido.");
      }

      const effectiveTimeoutMs = Math.max(600, Math.min(REQUEST_TIMEOUT_MS, remainingMs));
      const payload = await fetchJsonWithTimeout(url, effectiveTimeoutMs);
      const docs = Array.isArray(payload?.docs) ? payload.docs : [];
      return {
        term,
        results: docs.map((doc) => normalizeOpenLibraryBook(doc)).filter(Boolean),
      };
    } catch (error) {
      lastError = error;
      const canRetry = attempt < TERM_FETCH_MAX_ATTEMPTS && isRetryableFetchError(error);
      if (!canRetry) throw error;
      await sleep(220 * attempt);
    }
  }

  throw lastError || new Error("Falha ao consultar termo na Open Library.");
}

async function fetchWikisourceByTerm(term, deadlineAt = Number.POSITIVE_INFINITY) {
  const searchTerm = encodeURIComponent(String(term || "").trim());
  const url =
    `${WIKISOURCE_API_URL}?action=query&list=search&format=json` +
    `&srnamespace=0&srlimit=${WIKISOURCE_LIMIT_PER_TERM}` +
    `&srsearch=${searchTerm}&origin=*`;

  let lastError = null;

  for (let attempt = 1; attempt <= TERM_FETCH_MAX_ATTEMPTS; attempt += 1) {
    try {
      const remainingMs = Number.isFinite(deadlineAt)
        ? Math.max(0, Math.trunc(deadlineAt - Date.now()))
        : REQUEST_TIMEOUT_MS;

      if (remainingMs <= 0) {
        throw new Error("Prazo maximo para consulta de fontes atingido.");
      }

      const effectiveTimeoutMs = Math.max(600, Math.min(REQUEST_TIMEOUT_MS, remainingMs));
      const payload = await fetchJsonWithTimeout(url, effectiveTimeoutMs);
      const searchResults = Array.isArray(payload?.query?.search) ? payload.query.search : [];
      return {
        term,
        results: searchResults.map((entry) => normalizeWikisourceBook(entry)).filter(Boolean),
      };
    } catch (error) {
      lastError = error;
      const canRetry = attempt < TERM_FETCH_MAX_ATTEMPTS && isRetryableFetchError(error);
      if (!canRetry) throw error;
      await sleep(220 * attempt);
    }
  }

  throw lastError || new Error("Falha ao consultar termo no Wikisource.");
}

async function fetchArchiveByTerm(term, deadlineAt = Number.POSITIVE_INFINITY) {
  const safeTerm = escapeArchiveQueryTerm(term);
  const query = `language:(por OR \"pt-BR\" OR portuguese) AND mediatype:(texts) AND (${safeTerm})`;
  const params = new URLSearchParams();
  params.set("q", query);
  params.append("fl[]", "identifier");
  params.append("fl[]", "title");
  params.append("fl[]", "creator");
  params.append("fl[]", "downloads");
  params.append("fl[]", "subject");
  params.append("fl[]", "description");
  params.append("sort[]", "downloads desc");
  params.set("rows", String(ARCHIVE_LIMIT_PER_TERM));
  params.set("page", "1");
  params.set("output", "json");

  const url = `${ARCHIVE_ADVANCED_SEARCH_API_URL}?${params.toString()}`;
  let lastError = null;

  for (let attempt = 1; attempt <= TERM_FETCH_MAX_ATTEMPTS; attempt += 1) {
    try {
      const remainingMs = Number.isFinite(deadlineAt)
        ? Math.max(0, Math.trunc(deadlineAt - Date.now()))
        : REQUEST_TIMEOUT_MS;

      if (remainingMs <= 0) {
        throw new Error("Prazo maximo para consulta de fontes atingido.");
      }

      const effectiveTimeoutMs = Math.max(600, Math.min(REQUEST_TIMEOUT_MS, remainingMs));
      const payload = await fetchJsonWithTimeout(url, effectiveTimeoutMs);
      const docs = Array.isArray(payload?.response?.docs) ? payload.response.docs : [];
      return {
        term,
        results: docs.map((doc) => normalizeArchiveBook(doc)).filter(Boolean),
      };
    } catch (error) {
      lastError = error;
      const canRetry = attempt < TERM_FETCH_MAX_ATTEMPTS && isRetryableFetchError(error);
      if (!canRetry) throw error;
      await sleep(220 * attempt);
    }
  }

  throw lastError || new Error("Falha ao consultar termo no Internet Archive.");
}

async function fetchBooksFromSource({
  sourceId = "",
  terms = [],
  deadlineAt = Number.POSITIVE_INFINITY,
}) {
  const safeTerms = Array.isArray(terms) ? terms : [];
  const results = new Array(safeTerms.length);

  if (safeTerms.length === 0) {
    return results;
  }

  const workerCount = Math.max(
    1,
    Math.min(TERM_FETCH_CONCURRENCY, safeTerms.length),
  );

  let nextIndex = 0;
  const sourceKey = normalizeText(sourceId);

  const resolveFetcher = () => {
    if (sourceKey === "openlibrary") return fetchOpenLibraryByTerm;
    if (sourceKey === "wikisource-pt") return fetchWikisourceByTerm;
    if (sourceKey === "archive-pt") return fetchArchiveByTerm;
    return fetchBooksByTerm;
  };
  const fetcher = resolveFetcher();

  const worker = async () => {
    while (nextIndex < safeTerms.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const term = safeTerms[currentIndex];

      if (Number.isFinite(deadlineAt) && Date.now() >= deadlineAt) {
        results[currentIndex] = {
          status: "rejected",
          reason: new Error("Prazo maximo para consulta de fontes atingido."),
        };
        continue;
      }

      try {
        results[currentIndex] = {
          status: "fulfilled",
          value: await fetcher(term, deadlineAt),
        };
      } catch (reason) {
        results[currentIndex] = {
          status: "rejected",
          reason,
        };
      }
    }
  };

  await Promise.all(
    Array.from({ length: workerCount }, () => worker()),
  );

  return results;
}

function countHintHits(text, hints = []) {
  const normalizedText = normalizeText(text);
  if (!normalizedText) return 0;

  let hits = 0;
  const visited = new Set();

  for (const hint of hints) {
    const normalizedHint = normalizeText(hint);
    if (!normalizedHint || visited.has(normalizedHint)) continue;

    if (normalizedText.includes(normalizedHint)) {
      visited.add(normalizedHint);
      hits += 1;
    }
  }

  return hits;
}

function normalizeForHintMatch(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countHintHitsLoose(text, hints = []) {
  const normalizedText = normalizeForHintMatch(text);
  if (!normalizedText) return 0;
  const paddedText = ` ${normalizedText} `;

  let hits = 0;
  const visited = new Set();

  for (const hint of hints) {
    const normalizedHint = normalizeForHintMatch(hint);
    if (!normalizedHint || visited.has(normalizedHint)) continue;
    const paddedHint = ` ${normalizedHint} `;

    if (paddedText.includes(paddedHint)) {
      visited.add(normalizedHint);
      hits += 1;
    }
  }

  return hits;
}

function readDownloadLinks(formats = {}) {
  const entries = Object.entries(formats || {});

  const pick = (matcher) => {
    const match = entries.find(([mime, link]) => {
      return matcher(String(mime || "").toLowerCase()) && /^https?:\/\//i.test(String(link || ""));
    });

    return match ? String(match[1]) : "";
  };

  return {
    pdf: pick((mime) => mime.includes("application/pdf")),
    epub: pick((mime) => mime.includes("application/epub+zip")),
    html: pick((mime) => mime.includes("text/html")),
    text: pick((mime) => mime.startsWith("text/plain")),
  };
}

function buildBookMetadataText(book = {}) {
  const title = String(book?.title || "");
  const subjects = Array.isArray(book?.subjects) ? book.subjects.join(" ") : "";
  const bookshelves = Array.isArray(book?.bookshelves) ? book.bookshelves.join(" ") : "";
  const authors = Array.isArray(book?.authors)
    ? book.authors.map((author) => String(author?.name || "")).join(" ")
    : "";
  const sourceName = String(book?.source_name || book?.sourceName || "");
  const matchTags = Array.isArray(book?.match_tags)
    ? book.match_tags.join(" ")
    : "";

  return `${title} ${subjects} ${bookshelves} ${authors} ${sourceName} ${matchTags}`;
}

function hasExplicitAdultContent(book = {}) {
  const metadataText = buildBookMetadataText(book);
  const explicitAdultHits = countHintHitsLoose(metadataText, EXPLICIT_ADULT_HINTS);
  return explicitAdultHits > 0;
}

function hasStrictScienceFit(book = {}) {
  const metadataText = buildBookMetadataText(book);
  const scienceHits = countHintHitsLoose(metadataText, STRICT_SCIENCE_HINTS);
  return scienceHits > 0;
}

function sanitizeBooksForSafety(books = []) {
  if (!Array.isArray(books)) return [];
  return books.filter((book) => !hasExplicitAdultContent(book) && hasStrictScienceFit(book));
}

function isLikelyPortugueseBook(book = {}, metadataText = "") {
  const languages = Array.isArray(book?.languages)
    ? book.languages.map((lang) => normalizeText(lang))
    : [];

  if (languages.includes("pt") || languages.includes("pt-br") || languages.includes("por")) {
    return true;
  }

  const normalizedMetadata = normalizeText(metadataText);
  if (!normalizedMetadata) {
    return false;
  }

  const hintHits = countHintHits(normalizedMetadata, PORTUGUESE_CONTENT_HINTS);
  return hintHits >= 2;
}

function scoreBook(book = {}, context) {
  const metadataText = buildBookMetadataText(book);
  const languages = Array.isArray(book?.languages)
    ? book.languages.map((lang) => normalizeText(lang))
    : [];
  const links = readDownloadLinks(book?.formats || {});
  const hasDownloadableFile = Boolean(links.pdf || links.epub || links.html || links.text);
  const downloadCount = Number(book?.download_count || 0);
  const isPortugueseBook = isLikelyPortugueseBook(book, metadataText);

  const coreHits = countHintHits(metadataText, CORE_DOMAIN_HINTS);
  const schoolHits = countHintHits(metadataText, SCHOOL_FOCUS_HINTS);
  const contextHits = countHintHits(metadataText, context.contextTokens);
  const queryHits = countHintHits(metadataText, context.queryTokensForMatch);
  const negativeHits = countHintHits(metadataText, NEGATIVE_HINTS);
  const strictScienceHits = countHintHitsLoose(metadataText, STRICT_SCIENCE_HINTS);
  const explicitAdultHits = countHintHitsLoose(metadataText, EXPLICIT_ADULT_HINTS);
  const sourceId = normalizeText(book?.source_id || "");
  const sourceWeight = clamp(toNumericValue(book?.source_weight, 0), -0.2, 0.2);

  let score = 0;
  const reasons = [];

  if (coreHits > 0) {
    score += Math.min(coreHits * 0.14, 0.56);
    reasons.push("tema relacionado a ciencia e tecnologia");
  }

  if (schoolHits > 0) {
    score += Math.min(schoolHits * 0.1, 0.3);
    reasons.push("conteudo educacional para ambiente escolar");
  }

  if (contextHits > 0) {
    score += Math.min(contextHits * 0.11, 0.33);
    reasons.push("aderente ao intuito informado");
  }

  if (context.queryTokensForMatch.length > 0 && queryHits > 0) {
    score += Math.min(queryHits * 0.16, 0.32);
    reasons.push("alinhado ao tema especifico da busca");
  }

  if (strictScienceHits > 0) {
    score += Math.min(strictScienceHits * 0.12, 0.24);
    reasons.push("conteudo cientifico identificavel");
  }


  if (isPortugueseBook) {
    score += 0.3;
    reasons.push("disponivel em portugues");
  } else if (languages.includes("en")) {
    score += 0.05;
  }

  if (hasDownloadableFile) {
    score += 0.1;
    reasons.push("possui arquivo livre para download");
  }

  if (downloadCount >= 800) {
    score += 0.08;
  }

  if (downloadCount >= 3000) {
    score += 0.06;
  }

  if (sourceWeight !== 0) {
    score += sourceWeight;
  }

  if (sourceId === "openlibrary") {
    reasons.push("fonte em portugues com leitura online gratuita");
  } else if (sourceId === "wikisource-pt") {
    reasons.push("obra de dominio publico em portugues");
  } else if (sourceId === "archive-pt") {
    reasons.push("acervo gratuito em portugues no Internet Archive");
  }

  if (negativeHits > 0 && coreHits === 0 && schoolHits === 0 && contextHits === 0) {
    score -= 0.5;
  } else if (negativeHits > 0 && coreHits <= 1) {
    score -= 0.15;
  }

  const blockByExplicitAdultContent = explicitAdultHits > 0;
  const hasStrictScienceContent = strictScienceHits > 0;

  const hasDomainFit = coreHits > 0 || schoolHits > 0 || contextHits > 0;
  const hasQueryFit = context.queryTokensForMatch.length === 0 || queryHits > 0;
  const trustedPortugueseSource =
    (sourceId === "openlibrary" || sourceId === "wikisource-pt" || sourceId === "archive-pt")
    && isPortugueseBook;
  const allowTrustedPortugueseFallback =
    trustedPortugueseSource
    && (queryHits > 0 || contextHits > 0 || coreHits > 0 || schoolHits > 0);
  const publicDomain = book?.copyright !== true;
  const scoreClamped = clamp(score, 0, 1);

  return {
    include:
      publicDomain
      && hasDownloadableFile
      && !blockByExplicitAdultContent
      && hasStrictScienceContent
      && (hasDomainFit || allowTrustedPortugueseFallback)
      && hasQueryFit
      && scoreClamped >= MIN_RELEVANCE_SCORE,
    score: scoreClamped,
    reasons: uniqueItems(reasons).slice(0, 4),
    links,
    isPortugueseBook,
    hasStrictScienceContent,
  };
}

function normalizeAuthors(authors = []) {
  return (Array.isArray(authors) ? authors : [])
    .map((author) => {
      const name = toSafeString(author?.name || "", 120);
      if (!name) return null;

      const birthYear = Number(author?.birth_year);
      const deathYear = Number(author?.death_year);

      return {
        name,
        birthYear: Number.isFinite(birthYear) ? Math.trunc(birthYear) : null,
        deathYear: Number.isFinite(deathYear) ? Math.trunc(deathYear) : null,
      };
    })
    .filter(Boolean);
}

function normalizeLanguages(languages = []) {
  return uniqueItems(
    (Array.isArray(languages) ? languages : []).map((lang) => normalizeText(lang).slice(0, 8)),
  );
}

function mapBook(book, evaluated) {
  const subjects = Array.isArray(book?.subjects)
    ? uniqueItems(book.subjects.map((subject) => toSafeString(subject, 140))).slice(0, 6)
    : [];
  const bookshelves = Array.isArray(book?.bookshelves)
    ? uniqueItems(book.bookshelves.map((shelf) => toSafeString(shelf, 120))).slice(0, 4)
    : [];
  const coverUrl = toSafeString(book?.formats?.["image/jpeg"] || "", 300);
  const id = String(book?.id || "").trim();
  const sourceUrl = toSafeString(
    book?.source_url
      || (id && /^\d+$/.test(id) ? `https://www.gutenberg.org/ebooks/${id}` : ""),
    300,
  );
  const sourceName = toSafeString(book?.source_name || "Fonte livre", 80);
  const sourceId = toSafeString(book?.source_id || "gutendex", 60);

  return {
    id,
    title: toSafeString(book?.title || "Livro sem titulo", 220),
    authors: normalizeAuthors(book?.authors),
    languages: normalizeLanguages(book?.languages),
    subjects,
    bookshelves,
    downloadCount: Math.max(0, Math.trunc(Number(book?.download_count || 0))),
    relevanceScore: Number(evaluated.score.toFixed(2)),
    matchReason: evaluated.reasons,
    isPortugueseSource: Boolean(evaluated.isPortugueseBook),
    coverUrl,
    downloads: evaluated.links,
    sourceUrl,
    sourceName,
    sourceId,
    publicDomain: true,
  };
}

function cloneFallbackBook(book = {}) {
  return {
    id: String(book.id || ""),
    title: toSafeString(book.title || "Livro livre", 220),
    authors: normalizeAuthors(book.authors),
    languages: normalizeLanguages(book.languages),
    subjects: uniqueItems(Array.isArray(book.subjects) ? book.subjects : []).slice(0, 6),
    bookshelves: uniqueItems(Array.isArray(book.bookshelves) ? book.bookshelves : []).slice(0, 4),
    downloadCount: Math.max(0, Math.trunc(Number(book.downloadCount || 0))),
    relevanceScore: clamp(Number(book.relevanceScore || 0.35), 0, 1),
    matchReason: uniqueItems(Array.isArray(book.matchReason) ? book.matchReason : []).slice(0, 4),
    isPortugueseSource: Boolean(book.isPortugueseSource),
    coverUrl: toSafeString(book.coverUrl || "", 300),
    downloads: {
      pdf: toSafeString(book?.downloads?.pdf || "", 300),
      epub: toSafeString(book?.downloads?.epub || "", 300),
      html: toSafeString(book?.downloads?.html || "", 300),
      text: toSafeString(book?.downloads?.text || "", 300),
    },
    sourceUrl: toSafeString(book.sourceUrl || "", 300),
    sourceName: toSafeString(book.sourceName || "", 80),
    sourceId: toSafeString(book.sourceId || "", 60),
    publicDomain: true,
  };
}

function buildStaticFallbackSelection(limit = DEFAULT_LIMIT) {
  const safeLimit = readLimit(limit);
  return STATIC_FALLBACK_BOOKS
    .map((book) => cloneFallbackBook(book))
    .slice(0, safeLimit);
}

function selectBooksWithPortuguesePriority(books = [], limit = DEFAULT_LIMIT) {
  const safeLimit = readLimit(limit);
  const portugueseBooks = books.filter((book) => book?.isPortugueseSource === true);
  const internationalBooks = books.filter((book) => book?.isPortugueseSource !== true);

  if (safeLimit <= 0) {
    return [];
  }

  if (portugueseBooks.length === 0) {
    return books.slice(0, safeLimit);
  }

  const selected = [];
  const usedIds = new Set();

  const addFromQueue = (queue, maxCount = Number.POSITIVE_INFINITY) => {
    let added = 0;
    for (const item of queue) {
      const id = String(item?.id || "").trim();
      if (!id || usedIds.has(id)) continue;
      if (added >= maxCount || selected.length >= safeLimit) break;

      selected.push(item);
      usedIds.add(id);
      added += 1;
    }
    return added;
  };

  const targetPortugueseCount = Math.min(
    portugueseBooks.length,
    Math.ceil(safeLimit * PORTUGUESE_PRIORITY_RATIO),
  );
  addFromQueue(portugueseBooks, targetPortugueseCount);

  const initialInternationalCap = Math.max(1, Math.floor(safeLimit * (1 - PORTUGUESE_PRIORITY_RATIO)));
  addFromQueue(internationalBooks, initialInternationalCap);

  while (selected.length < safeLimit) {
    const ptCount = selected.filter((item) => item?.isPortugueseSource === true).length;
    const intlCount = selected.length - ptCount;
    const shouldPreferPortuguese = ptCount <= intlCount;

    const added = shouldPreferPortuguese
      ? addFromQueue(portugueseBooks, 1) || addFromQueue(internationalBooks, 1)
      : addFromQueue(internationalBooks, 1) || addFromQueue(portugueseBooks, 1);

    if (!added) break;
  }

  return selected.slice(0, safeLimit);
}

function summarizeError(error) {
  return String(error?.message || "Falha inesperada ao consultar livros livres.").slice(0, 240);
}

async function runLibraryRobot({ intent, query, limit, forceRefresh }) {
  const context = buildContext(intent, query);
  const sourceTermPlan = buildSourceTermPlan(context);
  const safeLimit = readLimit(limit);
  const cacheKey = `${CACHE_KEY_VERSION}|${normalizeText(context.intent)}|${normalizeText(context.query)}|${safeLimit}`;

  if (!forceRefresh) {
    const cachedPayload = readCache(cacheKey);
    if (cachedPayload) {
      const sectiMagazine = await resolveSectiScienceMagazine({ forceRefresh: false });
      return {
        ...cachedPayload,
        sectiMagazine,
        cacheHit: true,
      };
    }
  }
  if (!forceRefresh) {
    const inflightPromise = readInflight(cacheKey);
    if (inflightPromise) {
      return inflightPromise;
    }
  }

  const robotTask = (async () => {
    const fetchDeadlineAt = Date.now() + ROBOT_FETCH_DEADLINE_MS;
    const sectiMagazinePromise = resolveSectiScienceMagazine({ forceRefresh });
    const sourcePlans = [
      {
        sourceId: "gutendex",
        sourceName: "Gutendex",
        terms: sourceTermPlan.gutendexTerms,
      },
      {
        sourceId: "openlibrary",
        sourceName: "Open Library",
        terms: sourceTermPlan.openLibraryTerms,
      },
      {
        sourceId: "wikisource-pt",
        sourceName: "Wikisource PT",
        terms: sourceTermPlan.wikisourceTerms,
      },
      {
        sourceId: "archive-pt",
        sourceName: "Internet Archive (PT)",
        terms: sourceTermPlan.archiveTerms,
      },
    ];

    const [sourceResults, sectiMagazine] = await Promise.all([
      Promise.all(
        sourcePlans.map(async (sourcePlan) => ({
          ...sourcePlan,
          fetchResults: await fetchBooksFromSource({
            sourceId: sourcePlan.sourceId,
            terms: sourcePlan.terms,
            deadlineAt: fetchDeadlineAt,
          }),
        })),
      ),
      sectiMagazinePromise,
    ]);

    const warnings = [];
    const candidates = [];
    const perTerm = [];
    const perSource = [];
    let fulfilledFetchCount = 0;

    for (const sourceResult of sourceResults) {
      let sourceFulfilled = 0;
      let sourceRejected = 0;
      let sourceCandidates = 0;
      const sourceTermsStats = [];

      for (let index = 0; index < sourceResult.fetchResults.length; index += 1) {
        const term = sourceResult.terms[index];
        const result = sourceResult.fetchResults[index];

        if (result.status === "fulfilled") {
          sourceFulfilled += 1;
          fulfilledFetchCount += 1;
          const books = Array.isArray(result.value?.results) ? result.value.results : [];
          sourceCandidates += books.length;
          sourceTermsStats.push({ term, candidates: books.length });
          perTerm.push({
            sourceId: sourceResult.sourceId,
            sourceName: sourceResult.sourceName,
            term,
            candidates: books.length,
          });
          candidates.push(...books);
          continue;
        }

        sourceRejected += 1;
        warnings.push(
          `Falha em ${sourceResult.sourceName} no termo '${term}': ${summarizeError(result.reason)}`,
        );
      }

      perSource.push({
        sourceId: sourceResult.sourceId,
        sourceName: sourceResult.sourceName,
        termsAttempted: sourceResult.terms.length,
        termsSucceeded: sourceFulfilled,
        termsFailed: sourceRejected,
        candidates: sourceCandidates,
        termsStats: sourceTermsStats,
      });
    }

    const dedupedById = new Map();
    for (const book of candidates) {
      const id = String(book?.id || "").trim();
      if (!id) continue;
      if (!dedupedById.has(id)) {
        dedupedById.set(id, book);
      }
    }

    const evaluatedBooks = [];

    for (const book of dedupedById.values()) {
      const evaluated = scoreBook(book, context);
      if (!evaluated.include) continue;

      evaluatedBooks.push(mapBook(book, evaluated));
    }

    evaluatedBooks.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }

      if (b.downloadCount !== a.downloadCount) {
        return b.downloadCount - a.downloadCount;
      }

      return a.title.localeCompare(b.title, "pt-BR");
    });

    let selectedBooks = selectBooksWithPortuguesePriority(evaluatedBooks, safeLimit);
    selectedBooks = sanitizeBooksForSafety(selectedBooks);

    if (selectedBooks.length === 0 && dedupedById.size > 0) {
      const relaxedBooks = [];

      for (const book of dedupedById.values()) {
        const evaluated = scoreBook(book, context);
        const includeRelaxed =
          book?.copyright !== true
          && Boolean(evaluated?.links?.pdf || evaluated?.links?.epub || evaluated?.links?.html || evaluated?.links?.text)
          && evaluated?.hasStrictScienceContent === true
          && (evaluated.score >= RELAXED_MIN_RELEVANCE_SCORE);

        if (!includeRelaxed) continue;
        relaxedBooks.push(mapBook(book, evaluated));
      }

      relaxedBooks.sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        if (b.downloadCount !== a.downloadCount) {
          return b.downloadCount - a.downloadCount;
        }
        return a.title.localeCompare(b.title, "pt-BR");
      });

      selectedBooks = selectBooksWithPortuguesePriority(relaxedBooks, safeLimit);
      selectedBooks = sanitizeBooksForSafety(selectedBooks);
      if (selectedBooks.length > 0) {
        warnings.push("A curadoria usou criterio de relevancia relaxado para evitar estante vazia.");
      }
    }

    const portugueseCandidates = evaluatedBooks.filter((book) => book?.isPortugueseSource === true).length;
    const allSourcesUnavailable = dedupedById.size === 0 && fulfilledFetchCount === 0;
    let degradedMode = allSourcesUnavailable;
    let fallbackSource = "none";

    if (selectedBooks.length === 0) {
      const stalePayload = readCache(cacheKey) || readAnyRecentCachePayload();
      const fallbackFromCache = Array.isArray(stalePayload?.books) ? stalePayload.books : [];

      if (fallbackFromCache.length > 0) {
        selectedBooks = fallbackFromCache
          .slice(0, safeLimit)
          .map((book) => cloneFallbackBook(book));
        fallbackSource = "cache";
      } else {
        selectedBooks = buildStaticFallbackSelection(safeLimit);
        fallbackSource = "static";
      }

      selectedBooks = sanitizeBooksForSafety(selectedBooks);
      if (selectedBooks.length === 0) {
        selectedBooks = buildStaticFallbackSelection(safeLimit);
        fallbackSource = "static";
      }

      degradedMode = true;
      warnings.push("A curadoria nao encontrou obras aderentes com as fontes online e ativou acervo de contingencia.");
    }

    if (allSourcesUnavailable) {
      const stalePayload = readCache(cacheKey) || readAnyRecentCachePayload();
      const fallbackFromCache = Array.isArray(stalePayload?.books) ? stalePayload.books : [];

      if (fallbackFromCache.length > 0) {
        selectedBooks = fallbackFromCache
          .slice(0, safeLimit)
          .map((book) => cloneFallbackBook(book));
        fallbackSource = "cache";
      } else {
        selectedBooks = buildStaticFallbackSelection(safeLimit);
        fallbackSource = "static";
      }

      selectedBooks = sanitizeBooksForSafety(selectedBooks);
      if (selectedBooks.length === 0) {
        selectedBooks = buildStaticFallbackSelection(safeLimit);
        fallbackSource = "static";
      }
    }

    const portugueseSelected = selectedBooks.filter((book) => book?.isPortugueseSource === true).length;
    const robotWarnings = uniqueItems(
      allSourcesUnavailable ? [...warnings, SOURCE_UNAVAILABLE_MESSAGE] : warnings,
    );

    if (allSourcesUnavailable && fallbackSource === "cache") {
      robotWarnings.push("Exibindo acervo de contingencia com base em cache recente.");
    }

    if (allSourcesUnavailable && fallbackSource === "static") {
      robotWarnings.push("Exibindo acervo de contingencia estatico enquanto as fontes normalizam.");
    }

    const payload = {
      success: true,
      source: "multi-source",
      generatedAt: new Date().toISOString(),
      cacheHit: false,
      intent: context.intent,
      query: context.query,
      sectiMagazine,
      robot: {
        termsUsed: {
          all: context.terms,
          gutendex: sourceTermPlan.gutendexTerms,
          openLibrary: sourceTermPlan.openLibraryTerms,
          wikisourcePt: sourceTermPlan.wikisourceTerms,
          archivePt: sourceTermPlan.archiveTerms,
        },
        termsStats: perTerm,
        sourceStats: perSource,
        totalCandidates: dedupedById.size,
        totalSelected: selectedBooks.length,
        portugueseCandidates,
        internationalCandidates: Math.max(0, evaluatedBooks.length - portugueseCandidates),
        portugueseSelected,
        internationalSelected: Math.max(0, selectedBooks.length - portugueseSelected),
        portuguesePriorityRatio: PORTUGUESE_PRIORITY_RATIO,
        minScore: MIN_RELEVANCE_SCORE,
        warnings: uniqueItems(robotWarnings),
        degradedMode,
        fallbackSource,
        portuguesePortals: PORTUGUESE_PORTALS,
      },
      books: selectedBooks,
    };

    if (!allSourcesUnavailable) {
      writeCache(cacheKey, payload);
    }

    return payload;
  })();

  if (!forceRefresh) {
    writeInflight(cacheKey, robotTask);
  }

  try {
    return await robotTask;
  } finally {
    if (!forceRefresh) {
      clearInflight(cacheKey);
    }
  }
}

export async function handler(event) {
  const startedAt = Date.now();
  const method = String(event?.httpMethod || "GET").toUpperCase();

  if (method !== "GET" && method !== "POST") {
    return json(
      405,
      { error: "Metodo nao permitido. Use GET ou POST." },
      { Allow: "GET, POST" },
    );
  }

  const queryStringParameters = event?.queryStringParameters || {};
  const body = method === "POST" ? parseBody(event) : {};

  const intent =
    body.intent
    ?? queryStringParameters.intent
    ?? DEFAULT_INTENT;
  const query =
    body.query
    ?? queryStringParameters.query
    ?? "";
  const limit =
    body.limit
    ?? queryStringParameters.limit
    ?? DEFAULT_LIMIT;
  const forceRefresh = toBoolean(
    body.forceRefresh
      ?? queryStringParameters.forceRefresh
      ?? "",
  );

  console.log(LIBRARY_BOT_LOG_TAG, "request:start", {
    method,
    intentPreview: toSafeString(intent, 120),
    queryPreview: toSafeString(query, 80),
    limit: readLimit(limit),
    forceRefresh,
  });

  try {
    const payload = await runLibraryRobot({
      intent,
      query,
      limit,
      forceRefresh,
    });

    console.log(LIBRARY_BOT_LOG_TAG, "request:success", {
      selected: Number(payload?.books?.length || 0),
      cacheHit: Boolean(payload?.cacheHit),
      elapsedMs: Date.now() - startedAt,
    });

    return json(200, payload);
  } catch (error) {
    console.error(LIBRARY_BOT_LOG_TAG, "request:error", {
      error,
      elapsedMs: Date.now() - startedAt,
    });

    return json(500, {
      success: false,
      error: summarizeError(error),
    });
  }
}
