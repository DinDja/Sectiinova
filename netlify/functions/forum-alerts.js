import { getAdminAuth, getAdminDb } from "./firebaseAdminShared.js";

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  };
}

function parseBoolean(value, defaultValue = false) {
  if (typeof value === "boolean") return value;
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return defaultValue;
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function toMillisSafe(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }
  if (typeof value._seconds === "number") {
    return value._seconds * 1000;
  }

  const date = new Date(value);
  const ms = date.getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function serializeAlert(docSnap) {
  const data = docSnap.data() || {};

  return {
    id: docSnap.id,
    clube_id: String(data.clube_id || ""),
    recipient_id: String(data.recipient_id || ""),
    recipient_uid: String(data.recipient_uid || ""),
    recipient_doc_id: String(data.recipient_doc_id || ""),
    recipient_nome: String(data.recipient_nome || ""),
    actor_id: String(data.actor_id || ""),
    actor_nome: String(data.actor_nome || ""),
    actor_perfil: String(data.actor_perfil || ""),
    source: String(data.source || ""),
    topic_id: String(data.topic_id || ""),
    topic_title: String(data.topic_title || ""),
    decision: String(data.decision || ""),
    risk_score: Number(data.risk_score || 0),
    reason: String(data.reason || ""),
    excerpt: String(data.excerpt || ""),
    status: String(data.status || "unread"),
    categories: Array.isArray(data.categories) ? data.categories : [],
    read_by: String(data.read_by || ""),
    createdAtMs: toMillisSafe(data.createdAt),
    updatedAtMs: toMillisSafe(data.updatedAt),
    readAtMs: toMillisSafe(data.readAt),
  };
}

function normalizeProfile(value) {
  return String(value || "").trim().toLowerCase();
}

function getUserClubIds(userData) {
  const fromArray = Array.isArray(userData?.clubes_ids)
    ? userData.clubes_ids.map((value) => String(value || "").trim()).filter(Boolean)
    : [];

  if (fromArray.length > 0) {
    return [...new Set(fromArray)];
  }

  const legacy = String(userData?.clube_id || "").trim();
  return legacy ? [legacy] : [];
}

function getBearerToken(event) {
  const headerValue =
    event?.headers?.authorization || event?.headers?.Authorization || "";
  const raw = String(headerValue || "").trim();
  if (!raw) return "";

  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ? String(match[1]).trim() : "";
}

async function resolveCallerUid(event) {
  const token = getBearerToken(event);
  if (!token) {
    throw new Error("auth-missing");
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const uid = String(decoded?.uid || "").trim();
    if (!uid) {
      throw new Error("auth-invalid");
    }
    return uid;
  } catch {
    throw new Error("auth-invalid");
  }
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
      },
      body: "",
    };
  }

  let callerUid = "";
  try {
    callerUid = await resolveCallerUid(event);
  } catch (error) {
    if (error instanceof Error && error.message === "auth-missing") {
      return json(401, {
        error: "Token de autenticacao ausente. Envie Authorization: Bearer <token>.",
      });
    }

    return json(401, {
      error: "Token de autenticacao invalido.",
    });
  }

  const db = getAdminDb();
  let callerUserData = null;
  try {
    const callerUserSnap = await db.collection("usuarios").doc(callerUid).get();
    callerUserData = callerUserSnap.exists ? callerUserSnap.data() || null : null;
  } catch {
    callerUserData = null;
  }

  const callerDocIdToken = String(callerUid || "").trim();
  const callerUidToken = String(callerUserData?.uid || callerUid || "").trim();
  const callerLegacyIdToken = String(callerUserData?.id || "").trim();
  const callerIdentityTokens = [...new Set([callerDocIdToken, callerUidToken, callerLegacyIdToken].filter(Boolean))];

  if (event.httpMethod === "DELETE") {
    let body = {};
    try {
      body = JSON.parse(event.body || "{}") || {};
    } catch {
      return json(400, {
        error: "Corpo invalido. Envie JSON com alertId.",
      });
    }

    const alertId = String(body.alertId || "").trim();
    if (!alertId) {
      return json(400, {
        error: "alertId obrigatorio.",
      });
    }

    try {
      const alertRef = db.collection("forum_moderation_alerts").doc(alertId);
      const alertSnap = await alertRef.get();
      if (!alertSnap.exists) {
        return json(404, {
          error: "Alerta nao encontrado.",
        });
      }

      const alertData = alertSnap.data() || {};
      const recipientId = String(alertData.recipient_id || "").trim();
      const clubId = String(alertData.clube_id || "").trim();

      let allowed = callerUid === recipientId;
      if (!allowed) {
        const userSnap = await db.collection("usuarios").doc(callerUid).get();
        if (userSnap.exists) {
          const userData = userSnap.data() || {};
          const perfil = normalizeProfile(userData.perfil);
          const userClubIds = getUserClubIds(userData);
          allowed =
            (perfil === "orientador" || perfil === "coorientador") &&
            userClubIds.includes(clubId);
        }
      }

      if (!allowed) {
        return json(403, {
          error: "Voce nao tem permissao para excluir este alerta.",
        });
      }

      await alertRef.delete();
      return json(200, {
        deletedId: alertId,
      });
    } catch (error) {
      return json(500, {
        error:
          error instanceof Error
            ? error.message
            : "Falha inesperada ao excluir alerta.",
      });
    }
  }

  if (event.httpMethod !== "GET") {
    return json(405, {
      error: "Metodo nao suportado. Use GET ou DELETE.",
    });
  }

  const params = event.queryStringParameters || {};
  const clubeId = String(params.clubeId || "").trim();
  const requestedRecipientId = String(params.recipientId || "").trim();
  const unreadOnly = parseBoolean(params.unreadOnly, false);
  const pageLimit = Math.max(1, Math.min(100, Number(params.limit) || 30));

  if (requestedRecipientId && !callerIdentityTokens.includes(requestedRecipientId)) {
    return json(403, {
      error: "Voce nao pode acessar alertas de outro usuario.",
    });
  }

  try {
    const db = getAdminDb();

    const seen = new Set();
    const alertsRaw = [];

    for (const token of callerIdentityTokens) {
      const candidateQueries = [
        db.collection("forum_moderation_alerts").where("recipient_id", "==", token),
        db.collection("forum_moderation_alerts").where("recipient_uid", "==", token),
        db.collection("forum_moderation_alerts").where("recipient_doc_id", "==", token),
      ];

      for (const queryRef of candidateQueries) {
        const snap = await queryRef.get();
        for (const docSnap of snap.docs) {
          if (seen.has(docSnap.id)) continue;
          seen.add(docSnap.id);
          alertsRaw.push(serializeAlert(docSnap));
        }
      }
    }

    const alerts = alertsRaw
      .filter((entry) => (clubeId ? String(entry?.clube_id || "") === clubeId : true))
      .filter((entry) =>
        unreadOnly ? String(entry?.status || "unread").toLowerCase() === "unread" : true,
      )
      .sort((a, b) => b.createdAtMs - a.createdAtMs)
      .slice(0, pageLimit);

    return json(200, {
      recipientId: callerUid,
      alerts,
      count: alerts.length,
    });
  } catch (error) {
    return json(500, {
      error:
        error instanceof Error
          ? error.message
          : "Falha inesperada ao listar alertas de moderacao.",
    });
  }
}
