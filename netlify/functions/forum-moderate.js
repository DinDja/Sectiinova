import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./firebaseAdminShared.js";

const PERSPECTIVE_API_URL =
  "https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "openai/gpt-4o-mini";
const OPENROUTER_TIMEOUT_MS = 12000;
const MAX_TEXT_LENGTH = 2000;
const FORUM_MODERATION_SERVER_LOG_TAG = "[forum-moderation-server]";
const FORUM_ENABLE_OPENROUTER_FALLBACK = /^(1|true|yes)$/i.test(
  String(process.env.FORUM_ENABLE_OPENROUTER_FALLBACK || "").trim(),
);

// Chaves embutidas em codigo, conforme solicitado.
const PERSPECTIVE_API_KEY_HARDCODED = "AIzaSyBGJRi5h4j9jjH1uQEDaQPabq3iE0C39Bg";
const OPENROUTER_API_KEY_HARDCODED = "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";

const DEFAULT_REVIEW_THRESHOLD = 0.35;
const DEFAULT_BLOCK_THRESHOLD = 0.78;
const CATEGORY_REVIEW_THRESHOLD_OVERRIDES = {
  profanity: 0.24,
  insult: 0.4,
  threat: 0.35,
  identity_attack: 0.35,
  sexually_explicit: 0.35,
  credential_bait: 0.4,
  suspicious_link: 0.45,
  obfuscation: 0.5,
  shouting: 0.55,
};
const CATEGORY_BLOCK_THRESHOLD_OVERRIDES = {
  profanity: 0.72,
  insult: 0.75,
  threat: 0.55,
  identity_attack: 0.55,
  severe_toxicity: 0.75,
  spam: 0.82,
  flood: 0.85,
  credential_bait: 0.82,
  suspicious_link: 0.8,
  obfuscation: 0.88,
};
const PERSPECTIVE_ATTRIBUTE_LABELS = {
  TOXICITY: "toxicidade geral",
  SEVERE_TOXICITY: "toxicidade severa",
  INSULT: "insulto ou humilhacao",
  THREAT: "ameaca",
  IDENTITY_ATTACK: "ataque de odio/discriminacao",
  PROFANITY: "linguagem ofensiva",
  SEXUALLY_EXPLICIT: "conteudo sexual explicito",
};
const PERSPECTIVE_REQUESTED_ATTRIBUTES = {
  TOXICITY: {},
  SEVERE_TOXICITY: {},
  INSULT: {},
  THREAT: {},
  IDENTITY_ATTACK: {},
  PROFANITY: {},
};

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
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

function summarizeTextForLog(value) {
  const text = String(value || "");
  return {
    length: text.length,
    preview: text.slice(0, 160),
  };
}

function normalizeProfile(profile) {
  return String(profile || "").trim().toLowerCase();
}

function isStudentProfile(profile) {
  const normalized = normalizeProfile(profile);
  return normalized !== "orientador" && normalized !== "coorientador";
}

function clampRiskScore(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(1, num));
}

function readThreshold(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return clampRiskScore(parsed);
}

function decisionToPriority(decision) {
  if (decision === "block") return 2;
  if (decision === "review") return 1;
  return 0;
}

function maxDecision(decisions) {
  let current = "allow";
  for (const decision of decisions) {
    if (decisionToPriority(decision) > decisionToPriority(current)) {
      current = decision;
    }
  }
  return current;
}

function getDecisionThresholds() {
  const reviewThreshold = readThreshold(
    process.env.PERSPECTIVE_REVIEW_THRESHOLD,
    DEFAULT_REVIEW_THRESHOLD,
  );
  const blockThreshold = readThreshold(
    process.env.PERSPECTIVE_BLOCK_THRESHOLD,
    DEFAULT_BLOCK_THRESHOLD,
  );

  return {
    review: Math.min(reviewThreshold, blockThreshold),
    block: Math.max(blockThreshold, reviewThreshold),
  };
}

function readHardcodedKey(value, keyName) {
  const token = String(value || "").trim();
  if (!token || /^COLE_SUA_/i.test(token)) {
    throw new Error(`${keyName} nao configurada no codigo da function forum-moderate.`);
  }
  return token;
}

function extractJsonObjectFromText(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    // Tenta extrair de bloco markdown ou de trecho parcial.
  }

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1].trim());
    } catch {
      // segue para tentativa por recorte.
    }
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeCategoryId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

function normalizeCategories(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return {
          id: normalizeCategoryId(item),
          score: 0,
          evidence: "",
        };
      }

      return {
        id: normalizeCategoryId(item?.id || item?.name || "outro"),
        score: clampRiskScore(item?.score),
        evidence: String(item?.evidence || "").slice(0, 220),
      };
    })
    .filter((item) => Boolean(item.id));
}

function mergeCategories(...chunks) {
  const normalizedChunks = chunks.flatMap((chunk) => normalizeCategories(chunk));
  const byId = new Map();

  for (const category of normalizedChunks) {
    const previous = byId.get(category.id);
    if (!previous || category.score > previous.score) {
      byId.set(category.id, category);
    }
  }

  return Array.from(byId.values()).sort((a, b) => b.score - a.score);
}

function findPatternCount(text, pattern) {
  const expression = pattern instanceof RegExp ? pattern : new RegExp(String(pattern || ""), "gi");
  const flags = expression.flags.includes("g") ? expression.flags : `${expression.flags}g`;
  const withGlobal = new RegExp(expression.source, flags);
  const matches = String(text || "").match(withGlobal);
  return Array.isArray(matches) ? matches.length : 0;
}

function detectHeuristicAbuseSignals(text) {
  const rawText = String(text || "");
  const normalized = rawText.toLowerCase();
  const categories = [];

  const threatCount =
    findPatternCount(normalized, /\b(vou te matar|vou te pegar|te arrebento|te espanco|vou quebrar)\b/gi) +
    findPatternCount(normalized, /\b(ameaco|ameaca|amea[cs]o)\b/gi);
  if (threatCount > 0) {
    categories.push({
      id: "threat",
      score: 0.92,
      evidence: "linguagem de ameaca direta",
    });
  }

  const insultCount = findPatternCount(
    normalized,
    /\b(idiota|imbecil|retardad[oa]|burro|otario|otaria|lixo humano|vai se foder|vai tomar no cu)\b/gi,
  );
  if (insultCount > 0) {
    categories.push({
      id: "insult",
      score: insultCount >= 2 ? 0.82 : 0.64,
      evidence: "ofensa pessoal direta",
    });
  }

  const profanityCount = findPatternCount(
    normalized,
    /\b(caralho|porra|puta que pariu|merda|foder|foda-se|cacete|cu)\b/gi,
  );
  if (profanityCount > 0) {
    categories.push({
      id: "profanity",
      score: profanityCount >= 3 ? 0.78 : 0.55,
      evidence: "uso recorrente de palavroes",
    });
  }

  const sexualCount = findPatternCount(
    normalized,
    /\b(porno|pornografia|sexo explicito|nudez|nudes|conteudo adulto|sexo com)\b/gi,
  );
  if (sexualCount > 0) {
    categories.push({
      id: "sexually_explicit",
      score: 0.88,
      evidence: "conteudo sexual explicito",
    });
  }

  const identityAttackCount = findPatternCount(
    normalized,
    /\b(racista|racismo|homofob|xenofob|nazista|preto imundo|mulherzinha|macaco)\b/gi,
  );
  if (identityAttackCount > 0) {
    categories.push({
      id: "identity_attack",
      score: 0.9,
      evidence: "ataque discriminatorio ou de odio",
    });
  }

  const linkCount = findPatternCount(normalized, /https?:\/\/|www\./gi);
  const promoCount = findPatternCount(
    normalized,
    /\b(compre|promocao|promoc(?:ao)?|cupom|pix|ganhe dinheiro|renda extra|chama no pv)\b/gi,
  );
  if (linkCount >= 3 || (linkCount >= 1 && promoCount >= 2)) {
    categories.push({
      id: "spam",
      score: 0.86,
      evidence: "sinal de spam promocional",
    });
  } else if (linkCount >= 2 || promoCount >= 2) {
    categories.push({
      id: "spam",
      score: 0.62,
      evidence: "conteudo promocional potencialmente invasivo",
    });
  }

  if (rawText.length >= 250 && /(.)\1{7,}/.test(rawText)) {
    categories.push({
      id: "flood",
      score: 0.72,
      evidence: "padrao repetitivo/flood",
    });
  }

  return categories;
}

function detectCredentialBaitSignals(text) {
  const normalized = String(text || "").toLowerCase();
  const categories = [];

  const sensitiveTokenCount = findPatternCount(
    normalized,
    /\b(senha|password|token|codigo de verificacao|codigo de seguranca|cpf|cartao|pix)\b/gi,
  );
  const imperativeCount = findPatternCount(
    normalized,
    /\b(envie|manda|passe|compartilhe|informe|digite|confirme|atualize)\b/gi,
  );
  const linkCount = findPatternCount(normalized, /https?:\/\/|www\./gi);
  const shortenerCount = findPatternCount(
    normalized,
    /\b(bit\.ly|tinyurl\.com|t\.co|goo\.gl|shorturl\.at)\b/gi,
  );

  if (sensitiveTokenCount >= 1 && imperativeCount >= 1) {
    categories.push({
      id: "credential_bait",
      score: linkCount > 0 ? 0.94 : 0.82,
      evidence: "pedido para compartilhar dado sensivel",
    });
  } else if (sensitiveTokenCount >= 1) {
    categories.push({
      id: "credential_bait",
      score: 0.58,
      evidence: "texto cita dado sensivel",
    });
  }

  if ((shortenerCount >= 1 && imperativeCount >= 1) || linkCount >= 4) {
    categories.push({
      id: "suspicious_link",
      score: linkCount >= 4 ? 0.86 : 0.74,
      evidence: "link suspeito/encurtado com linguagem de acao",
    });
  } else if (shortenerCount >= 1 || linkCount >= 3) {
    categories.push({
      id: "suspicious_link",
      score: 0.56,
      evidence: "volume incomum de links",
    });
  }

  return categories;
}

function detectObfuscationBypassSignals(text) {
  const raw = String(text || "");
  const categories = [];
  const hasInvisibleChars = /[\u200B-\u200D\uFEFF]/.test(raw);
  const denseSymbols = findPatternCount(raw, /[@$!#%^&*()_+=\\/[\\]{}|:;"'<>,.?~-]/g) >= 8;

  const normalizedForBypass = raw
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[0@]/g, "o")
    .replace(/[1!]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[4]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/[\W_]+/g, "");

  const obfuscatedInsult = /(vsf|vtnc|foder|idiota|otario|burro|imbecil)/i.test(normalizedForBypass);
  if (hasInvisibleChars || (denseSymbols && obfuscatedInsult)) {
    categories.push({
      id: "obfuscation",
      score: obfuscatedInsult ? 0.9 : 0.62,
      evidence: "sinal de tentativa de burlar filtro por ofuscacao",
    });
  }

  return categories;
}

function detectFormattingRiskSignals(text) {
  const raw = String(text || "");
  const categories = [];
  const letters = (raw.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
  const uppercase = (raw.match(/[A-ZÀ-Ý]/g) || []).length;
  const uppercaseRatio = letters > 0 ? uppercase / letters : 0;
  const repeatedPunctuation = /([!?.,])\1{5,}/.test(raw);

  if (letters >= 24 && uppercaseRatio >= 0.85) {
    categories.push({
      id: "shouting",
      score: 0.62,
      evidence: "uso excessivo de caixa alta",
    });
  }

  if (repeatedPunctuation) {
    categories.push({
      id: "shouting",
      score: 0.58,
      evidence: "pontuacao excessivamente repetitiva",
    });
  }

  return categories;
}

function collectRuleBasedCategories(text) {
  return mergeCategories(
    detectHeuristicAbuseSignals(text),
    detectDigitalCrimeSignals(text),
    detectCredentialBaitSignals(text),
    detectObfuscationBypassSignals(text),
    detectFormattingRiskSignals(text),
  );
}

function detectDigitalCrimeSignals(text) {
  const normalized = String(text || "").toLowerCase();
  const categories = [];

  if (/(phishing|golpe|engenharia social|clonar cartao|roubar senha|conta hackeada)/i.test(normalized)) {
    categories.push({
      id: "crime_digital",
      score: 0.95,
      evidence: "sinal de golpe/phishing ou invasao de conta",
    });
  }

  if (/(ransomware|ddos|botnet|malware|trojan|spyware)/i.test(normalized)) {
    categories.push({
      id: "malware_ataque",
      score: 0.98,
      evidence: "sinal de instrucao para ataque digital/malware",
    });
  }

  if (/(cpf|rg|cartao|senha|token|codigo de verificacao).*(manda|envia|passa|compartilha)/i.test(normalized)) {
    categories.push({
      id: "captura_dados_sensiveis",
      score: 0.9,
      evidence: "pedido de dado sensivel",
    });
  }

  if (/(doxx|vazar endereco|vazar telefone|expor dados|dados pessoais de)/i.test(normalized)) {
    categories.push({
      id: "exposicao_de_dados",
      score: 0.9,
      evidence: "risco de exposicao de dados pessoais",
    });
  }

  return categories;
}

function buildModerationDecision(categories, thresholds) {
  const riskScore = categories.length
    ? Math.max(...categories.map((item) => clampRiskScore(item.score)))
    : 0;

  const hasCategoryBlockSignal = categories.some((item) => {
    const categoryThreshold = CATEGORY_BLOCK_THRESHOLD_OVERRIDES[item.id];
    return Number.isFinite(categoryThreshold) && item.score >= categoryThreshold;
  });

  const hasCategoryReviewSignal = categories.some((item) => {
    const categoryThreshold = CATEGORY_REVIEW_THRESHOLD_OVERRIDES[item.id];
    return Number.isFinite(categoryThreshold) && item.score >= categoryThreshold;
  });

  let decision = "allow";
  if (riskScore >= thresholds.block || hasCategoryBlockSignal) {
    decision = "block";
  } else if (riskScore >= thresholds.review || hasCategoryReviewSignal) {
    decision = "review";
  }

  const topReasons = categories
    .filter((item) => {
      const categoryThreshold = CATEGORY_REVIEW_THRESHOLD_OVERRIDES[item.id];
      const minReviewScore = Number.isFinite(categoryThreshold)
        ? Math.min(thresholds.review, categoryThreshold)
        : thresholds.review;
      return item.score >= minReviewScore;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => String(item.evidence || item.id));

  const reason = topReasons.join(", ").slice(0, 500);

  return {
    decision,
    riskScore,
    reason,
    categories,
  };
}

async function runPerspectiveModeration(text) {
  const apiKey = readHardcodedKey(
    PERSPECTIVE_API_KEY_HARDCODED,
    "PERSPECTIVE_API_KEY_HARDCODED",
  );
  const thresholds = getDecisionThresholds();

  const snippet = String(text || "").slice(0, MAX_TEXT_LENGTH);

  console.log(FORUM_MODERATION_SERVER_LOG_TAG, "runPerspectiveModeration:start", {
    text: summarizeTextForLog(snippet),
    thresholds,
  });

  const response = await fetch(`${PERSPECTIVE_API_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      comment: { text: snippet },
      languages: ["pt", "en"],
      doNotStore: true,
      requestedAttributes: PERSPECTIVE_REQUESTED_ATTRIBUTES,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(FORUM_MODERATION_SERVER_LOG_TAG, "runPerspectiveModeration:http_error", {
      status: response.status,
      body: String(body || "").slice(0, 500),
    });
    throw new Error(
      `Falha na Perspective API (${response.status}): ${String(body || "").slice(0, 500)}`,
    );
  }

  const data = await response.json();
  const attributeScores = data?.attributeScores || {};
  const perspectiveCategories = Object.entries(attributeScores)
    .map(([attribute, scores]) => ({
      id: String(attribute || "outro"),
      score: clampRiskScore(scores?.summaryScore?.value),
      evidence:
        PERSPECTIVE_ATTRIBUTE_LABELS[attribute] ||
        String(attribute || "categoria de risco").toLowerCase(),
    }))
    .filter((item) => item.score > 0);

  const ruleBasedCategories = collectRuleBasedCategories(text);
  const categories = mergeCategories(perspectiveCategories, ruleBasedCategories);

  const moderation = {
    ...buildModerationDecision(categories, thresholds),
    provider: "perspective",
    model: "google-perspective",
  };

  console.log(FORUM_MODERATION_SERVER_LOG_TAG, "runPerspectiveModeration:success", {
    decision: moderation.decision,
    riskScore: moderation.riskScore,
    categoriesCount: moderation.categories.length,
  });

  return moderation;
}

async function runOpenRouterModeration(text) {
  const apiKey = readHardcodedKey(
    OPENROUTER_API_KEY_HARDCODED,
    "OPENROUTER_API_KEY_HARDCODED",
  );
  const thresholds = getDecisionThresholds();
  const snippet = String(text || "").slice(0, MAX_TEXT_LENGTH);

  console.log(FORUM_MODERATION_SERVER_LOG_TAG, "runOpenRouterModeration:start", {
    text: summarizeTextForLog(snippet),
    thresholds,
    timeoutMs: OPENROUTER_TIMEOUT_MS,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://sectiinova.local",
        "X-Title": "Sectiinova Forum Moderation",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "Voce e um moderador de comunidade. Responda SOMENTE JSON com os campos decision, riskScore, reason e categories.",
          },
          {
            role: "user",
            content: [
              "Analise o texto a seguir em portugues do Brasil.",
              "Decision deve ser allow, review ou block.",
              "riskScore entre 0 e 1.",
              "categories deve ser lista com objetos {id, score, evidence}.",
              "Palavroes e ofensas diretas (ex.: porra, puta, caralho, vai se foder) devem ser no minimo review.",
              `Texto: ${snippet}`,
            ].join("\n"),
          },
        ],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const body = await response.text();
    console.error(FORUM_MODERATION_SERVER_LOG_TAG, "runOpenRouterModeration:http_error", {
      status: response.status,
      body: String(body || "").slice(0, 500),
    });
    throw new Error(
      `Falha na OpenRouter (${response.status}): ${String(body || "").slice(0, 500)}`,
    );
  }

  const data = await response.json();
  const content = String(data?.choices?.[0]?.message?.content || "").trim();
  const parsed = extractJsonObjectFromText(content);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Resposta invalida da OpenRouter para moderacao.");
  }

  const modelDecisionRaw = String(parsed?.decision || "").trim().toLowerCase();
  const modelDecision = ["allow", "review", "block"].includes(modelDecisionRaw)
    ? modelDecisionRaw
    : "review";

  const modelRiskScore = clampRiskScore(parsed?.riskScore);
  const modelReason = String(parsed?.reason || "").trim();
  const openRouterCategories = normalizeCategories(parsed?.categories);
  const digitalCrimeCategories = detectDigitalCrimeSignals(text);
  const categories = mergeCategories(openRouterCategories, digitalCrimeCategories);

  const thresholdDecision = buildModerationDecision(categories, thresholds);
  const finalDecision = maxDecision([thresholdDecision.decision, modelDecision]);
  const minRiskFromDecision = finalDecision === "block" ? 0.85 : finalDecision === "review" ? 0.55 : 0;
  const finalRiskScore = Math.max(
    thresholdDecision.riskScore,
    modelRiskScore,
    minRiskFromDecision,
  );

  const reason = String(modelReason || thresholdDecision.reason || "").slice(0, 500);

  const moderation = {
    decision: finalDecision,
    riskScore: finalRiskScore,
    reason,
    categories,
    provider: "openrouter",
    model: OPENROUTER_MODEL,
  };

  console.log(FORUM_MODERATION_SERVER_LOG_TAG, "runOpenRouterModeration:success", {
    decision: moderation.decision,
    riskScore: moderation.riskScore,
    categoriesCount: moderation.categories.length,
    modelDecision,
    thresholdDecision: thresholdDecision.decision,
  });

  return moderation;
}

function runLocalRulesModeration(text) {
  const thresholds = getDecisionThresholds();
  const snippet = String(text || "").slice(0, MAX_TEXT_LENGTH);

  console.log(FORUM_MODERATION_SERVER_LOG_TAG, "runLocalRulesModeration:start", {
    text: summarizeTextForLog(snippet),
    thresholds,
  });

  const categories = collectRuleBasedCategories(snippet);

  const moderation = {
    ...buildModerationDecision(categories, thresholds),
    provider: "local_rules",
    model: "heuristic-v1",
  };

  console.log(FORUM_MODERATION_SERVER_LOG_TAG, "runLocalRulesModeration:success", {
    decision: moderation.decision,
    riskScore: moderation.riskScore,
    categoriesCount: moderation.categories.length,
  });

  return moderation;
}

function combineModerationResults(results) {
  const validResults = Array.isArray(results)
    ? results.filter((item) => item && typeof item === "object")
    : [];

  if (!validResults.length) {
    return null;
  }

  const decision = maxDecision(validResults.map((item) => String(item.decision || "allow")));
  const riskScore = validResults.reduce(
    (maxValue, item) => Math.max(maxValue, clampRiskScore(item.riskScore)),
    0,
  );

  const categories = mergeCategories(...validResults.map((item) => item.categories || []));
  const reason = validResults
    .map((item) => String(item.reason || "").trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(", ")
    .slice(0, 500);

  const providers = [...new Set(validResults.map((item) => String(item.provider || "")).filter(Boolean))];
  const models = [...new Set(validResults.map((item) => String(item.model || "")).filter(Boolean))];

  return {
    decision,
    riskScore,
    reason,
    categories,
    providers,
    models,
  };
}

async function notifyMentors({
  clubeId,
  actor,
  moderation,
  source,
  topicId,
  topicTitle,
  text,
}) {
  const actorId = String(actor?.id || actor?.uid || "").trim();
  const actorProfile = normalizeProfile(actor?.perfil);

  console.log(FORUM_MODERATION_SERVER_LOG_TAG, "notifyMentors:start", {
    clubeId: String(clubeId || ""),
    actorId,
    source: String(source || ""),
    decision: String(moderation?.decision || ""),
  });

  if (!clubeId || !actorId || !isStudentProfile(actorProfile)) {
    console.log(FORUM_MODERATION_SERVER_LOG_TAG, "notifyMentors:skip", {
      reason: "invalid_context_or_non_student",
      actorProfile,
    });
    return 0;
  }

  const db = getAdminDb();
  const [arrayMembershipSnap, legacyMembershipSnap] = await Promise.all([
    db
      .collection("usuarios")
      .where("clubes_ids", "array-contains", String(clubeId))
      .get(),
    db
      .collection("usuarios")
      .where("clube_id", "==", String(clubeId))
      .get(),
  ]);

  const usersById = new Map();
  for (const docSnap of arrayMembershipSnap.docs) {
    usersById.set(docSnap.id, docSnap);
  }
  for (const docSnap of legacyMembershipSnap.docs) {
    usersById.set(docSnap.id, docSnap);
  }

  if (usersById.size === 0) {
    console.log(FORUM_MODERATION_SERVER_LOG_TAG, "notifyMentors:skip", {
      reason: "no_users_found",
    });
    return 0;
  }

  const mentorDocs = Array.from(usersById.values()).filter((mentorDoc) => {
    const mentorData = mentorDoc.data() || {};
    const perfil = normalizeProfile(mentorData.perfil);
    return perfil === "orientador" || perfil === "coorientador";
  });

  if (!mentorDocs.length) {
    console.log(FORUM_MODERATION_SERVER_LOG_TAG, "notifyMentors:skip", {
      reason: "no_mentor_profiles",
    });
    return 0;
  }

  const excerpt = String(text || "").trim().slice(0, 220);
  const now = FieldValue.serverTimestamp();

  const writes = [];
  let notifiedMentorsCount = 0;

  for (const mentorDoc of mentorDocs) {
    const mentorData = mentorDoc.data() || {};
    const recipientId = String(mentorData.uid || mentorDoc.id || "").trim();

    if (!recipientId) {
      continue;
    }

    notifiedMentorsCount += 1;

    writes.push(
      db.collection("forum_moderation_alerts").add({
        clube_id: String(clubeId),
        recipient_id: recipientId,
        recipient_uid: String(mentorData.uid || recipientId || "").trim(),
        recipient_doc_id: String(mentorDoc.id || "").trim(),
        recipient_nome: String(mentorData.nome || ""),
        actor_id: actorId,
        actor_nome: String(actor.nome || "Anonimo"),
        actor_perfil: actorProfile,
        source: String(source || "message").slice(0, 40),
        topic_id: String(topicId || "").slice(0, 120),
        topic_title: String(topicTitle || "").slice(0, 200),
        decision: moderation.decision,
        risk_score: moderation.riskScore,
        reason: moderation.reason,
        categories: moderation.categories,
        excerpt,
        status: "unread",
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  writes.push(
    db.collection("forum_audit_logs").add({
      clube_id: String(clubeId),
      topic_id: String(topicId || "").slice(0, 120),
      actor_id: actorId,
      action: `moderation.${moderation.decision}`,
      target_user_id: actorId,
      details: {
        source: String(source || "message").slice(0, 40),
        riskScore: moderation.riskScore,
        reason: moderation.reason,
        categories: moderation.categories,
      },
      createdAt: now,
    }),
  );

  await Promise.all(writes);
  console.log(FORUM_MODERATION_SERVER_LOG_TAG, "notifyMentors:done", {
    notifiedMentorsCount,
    writesCount: writes.length,
  });
  return notifiedMentorsCount;
}

export async function handler(event) {
  console.log(FORUM_MODERATION_SERVER_LOG_TAG, "handler:start", {
    httpMethod: String(event?.httpMethod || ""),
    hasBody: Boolean(event?.body),
    bodyLength: String(event?.body || "").length,
  });

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Metodo nao suportado. Use POST." });
  }

  const payload = parseBody(event);
  const text = String(payload.text || payload.content || "").trim();
  const clubeId = String(payload.clubeId || "").trim();
  const rawActor = payload.actor && typeof payload.actor === "object" ? payload.actor : {};
  const actor = {
    ...rawActor,
    id: String(rawActor?.id || rawActor?.uid || "").trim(),
    uid: String(rawActor?.uid || rawActor?.id || "").trim(),
    perfil: String(rawActor?.perfil || "").trim(),
    nome: String(rawActor?.nome || "").trim(),
  };
  const source = String(payload.source || "message").trim();
  const topicId = String(payload.topicId || "").trim();
  const topicTitle = String(payload.topicTitle || "").trim();

  console.log(FORUM_MODERATION_SERVER_LOG_TAG, "handler:payload", {
    clubeId,
    actorId: String(actor?.id || ""),
    source,
    topicId,
    topicTitle: topicTitle.slice(0, 140),
    text: summarizeTextForLog(text),
  });

  if (!text) {
    return json(400, { error: "Campo text obrigatorio." });
  }

  if (!clubeId) {
    return json(400, { error: "Campo clubeId obrigatorio." });
  }

  if (!actor?.id) {
    return json(400, { error: "Campo actor.id (ou actor.uid) obrigatorio." });
  }

  const providerErrors = [];
  let moderation = null;
  let usedLocalFallback = false;
  let openRouterAttempted = false;
  const openRouterEnabled = FORUM_ENABLE_OPENROUTER_FALLBACK;

  try {
    console.log(FORUM_MODERATION_SERVER_LOG_TAG, "handler:trying_primary_provider", {
      provider: "perspective",
    });
    moderation = await runPerspectiveModeration(text);
  } catch (perspectiveError) {
    const perspectiveMessage =
      perspectiveError instanceof Error
        ? perspectiveError.message
        : String(perspectiveError || "falha desconhecida");
    providerErrors.push(`perspective: ${perspectiveMessage}`);

    console.warn(FORUM_MODERATION_SERVER_LOG_TAG, "handler:primary_provider_failed", {
      provider: "perspective",
      message: perspectiveMessage,
    });

    try {
      console.log(FORUM_MODERATION_SERVER_LOG_TAG, "handler:trying_fallback_provider", {
        provider: "local_rules",
      });
      moderation = runLocalRulesModeration(text);
      usedLocalFallback = true;
    } catch (localRulesError) {
      const localRulesMessage =
        localRulesError instanceof Error
          ? localRulesError.message
          : String(localRulesError || "falha desconhecida");
      providerErrors.push(`local_rules: ${localRulesMessage}`);

      console.error(FORUM_MODERATION_SERVER_LOG_TAG, "handler:fallback_provider_failed", {
        provider: "local_rules",
        message: localRulesMessage,
      });
    }

    if (!moderation && openRouterEnabled) {
      try {
        openRouterAttempted = true;
        console.log(FORUM_MODERATION_SERVER_LOG_TAG, "handler:trying_second_fallback_provider", {
          provider: "openrouter",
        });
        moderation = await runOpenRouterModeration(text);
      } catch (openRouterError) {
        const openRouterMessage =
          openRouterError instanceof Error
            ? openRouterError.message
            : String(openRouterError || "falha desconhecida");
        providerErrors.push(`openrouter: ${openRouterMessage}`);

        console.error(FORUM_MODERATION_SERVER_LOG_TAG, "handler:fallback_provider_failed", {
          provider: "openrouter",
          message: openRouterMessage,
        });
      }
    } else if (!openRouterEnabled) {
      providerErrors.push("openrouter: desativado por FORUM_ENABLE_OPENROUTER_FALLBACK");
    }
  }

  if (!moderation) {
    console.error("Falha ao usar provedores de moderacao:", providerErrors);
    return json(503, {
      error:
        "Moderacao inteligente indisponivel no momento. Verifique Perspective e fallback local.",
      providerErrors,
    });
  }

  const shouldNotify = moderation.decision === "block" || moderation.decision === "review";
  console.log(FORUM_MODERATION_SERVER_LOG_TAG, "handler:moderation_decision", {
    decision: moderation.decision,
    riskScore: moderation.riskScore,
    provider: String(moderation.provider || ""),
    model: String(moderation.model || ""),
    usedLocalFallback,
    openRouterAttempted,
    openRouterEnabled,
    shouldNotify,
    providerErrors,
  });

  const notifiedMentors = shouldNotify
    ? await notifyMentors({
        clubeId,
        actor,
        moderation,
        source,
        topicId,
        topicTitle,
        text,
      })
    : 0;

  console.log(FORUM_MODERATION_SERVER_LOG_TAG, "handler:done", {
    decision: moderation.decision,
    provider: String(moderation.provider || ""),
    notifiedMentors,
    fallbackUsed: String(moderation.provider || "") !== "perspective",
    usedLocalFallback,
    openRouterAttempted,
  });

  return json(200, {
    allowed: moderation.decision === "allow",
    decision: moderation.decision,
    riskScore: moderation.riskScore,
    reason: moderation.reason,
    categories: moderation.categories,
    provider: String(moderation.provider || ""),
    model: String(moderation.model || ""),
    providers: [String(moderation.provider || "")].filter(Boolean),
    models: [String(moderation.model || "")].filter(Boolean),
    fallbackUsed: String(moderation.provider || "") !== "perspective",
    usedLocalFallback,
    openRouterAttempted,
    openRouterEnabled,
    primaryProvider: "perspective",
    providerErrors,
    notifiedMentors,
  });
}
