import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./firebaseAdminShared.js";

const PERSPECTIVE_API_URL =
  "https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "openai/gpt-4o-mini";
const OPENROUTER_TIMEOUT_MS = 12000;
const MAX_TEXT_LENGTH = 2000;

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
};
const CATEGORY_BLOCK_THRESHOLD_OVERRIDES = {
  profanity: 0.72,
  insult: 0.75,
  threat: 0.55,
  identity_attack: 0.55,
  severe_toxicity: 0.75,
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
  SEXUALLY_EXPLICIT: {},
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

  const digitalCrimeCategories = detectDigitalCrimeSignals(text);
  const categories = mergeCategories(perspectiveCategories, digitalCrimeCategories);

  return {
    ...buildModerationDecision(categories, thresholds),
    provider: "perspective",
    model: "google-perspective",
  };
}

async function runOpenRouterModeration(text) {
  const apiKey = readHardcodedKey(
    OPENROUTER_API_KEY_HARDCODED,
    "OPENROUTER_API_KEY_HARDCODED",
  );
  const thresholds = getDecisionThresholds();
  const snippet = String(text || "").slice(0, MAX_TEXT_LENGTH);

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

  return {
    decision: finalDecision,
    riskScore: finalRiskScore,
    reason,
    categories,
    provider: "openrouter",
    model: OPENROUTER_MODEL,
  };
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
  if (!clubeId || !actor?.id || !isStudentProfile(actor?.perfil)) {
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
    return 0;
  }

  const mentorDocs = Array.from(usersById.values()).filter((mentorDoc) => {
    const mentorData = mentorDoc.data() || {};
    const perfil = normalizeProfile(mentorData.perfil);
    return perfil === "orientador" || perfil === "coorientador";
  });

  if (!mentorDocs.length) {
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
        recipient_nome: String(mentorData.nome || ""),
        actor_id: String(actor.id || ""),
        actor_nome: String(actor.nome || "Anonimo"),
        actor_perfil: normalizeProfile(actor.perfil),
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
      actor_id: String(actor.id || ""),
      action: `moderation.${moderation.decision}`,
      target_user_id: String(actor.id || ""),
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
  return notifiedMentorsCount;
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Metodo nao suportado. Use POST." });
  }

  const payload = parseBody(event);
  const text = String(payload.text || payload.content || "").trim();
  const clubeId = String(payload.clubeId || "").trim();
  const actor = payload.actor && typeof payload.actor === "object" ? payload.actor : {};
  const source = String(payload.source || "message").trim();
  const topicId = String(payload.topicId || "").trim();
  const topicTitle = String(payload.topicTitle || "").trim();

  if (!text) {
    return json(400, { error: "Campo text obrigatorio." });
  }

  if (!clubeId) {
    return json(400, { error: "Campo clubeId obrigatorio." });
  }

  if (!actor?.id) {
    return json(400, { error: "Campo actor.id obrigatorio." });
  }

  const providerErrors = [];
  let moderation = null;

  try {
    moderation = await runPerspectiveModeration(text);
  } catch (perspectiveError) {
    const perspectiveMessage =
      perspectiveError instanceof Error
        ? perspectiveError.message
        : String(perspectiveError || "falha desconhecida");
    providerErrors.push(`perspective: ${perspectiveMessage}`);

    try {
      moderation = await runOpenRouterModeration(text);
    } catch (openRouterError) {
      const openRouterMessage =
        openRouterError instanceof Error
          ? openRouterError.message
          : String(openRouterError || "falha desconhecida");
      providerErrors.push(`openrouter: ${openRouterMessage}`);
    }
  }

  if (!moderation) {
    console.error("Falha ao usar provedores de moderacao:", providerErrors);
    return json(503, {
      error:
        "Moderacao inteligente indisponivel no momento. Configure as chaves embutidas de Perspective e OpenRouter.",
      providerErrors,
    });
  }

  const shouldNotify = moderation.decision === "block" || moderation.decision === "review";
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
    fallbackUsed: String(moderation.provider || "") === "openrouter",
    primaryProvider: "perspective",
    providerErrors,
    notifiedMentors,
  });
}
