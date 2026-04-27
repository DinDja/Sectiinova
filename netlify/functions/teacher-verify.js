import { getAdminAuth, getAdminDb } from "./firebaseAdminShared.js";
import {
  MEMBERSHIP_BARCODE_PREFIX,
  isExpiryYmdExpired,
  parseMembershipBarcodePayload,
  ymdToIsoDate,
} from "../../src/utils/membershipBarcode.js";

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
  if (!event?.body) return {};
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(String(event.body || ""), "base64").toString("utf8")
      : String(event.body || "");
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function normalizeProfile(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeIdList(values) {
  if (!Array.isArray(values)) return [];
  return [
    ...new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  ];
}

function getUserClubIds(userData) {
  const fromArray = normalizeIdList(userData?.clubes_ids);
  if (fromArray.length > 0) return fromArray;
  return normalizeIdList([userData?.clube_id]);
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
    if (!uid) throw new Error("auth-invalid");
    return uid;
  } catch {
    throw new Error("auth-invalid");
  }
}

async function getClubById(db, clubId) {
  const normalizedId = String(clubId || "").trim();
  if (!normalizedId) return null;

  const primaryRef = db.collection("clubes").doc(normalizedId);
  const primarySnap = await primaryRef.get();
  if (primarySnap.exists) {
    return {
      id: primarySnap.id,
      source: "clubes",
      data: primarySnap.data() || {},
    };
  }

  const legacyRef = db.collection("clubes_ciencia").doc(normalizedId);
  const legacySnap = await legacyRef.get();
  if (legacySnap.exists) {
    return {
      id: legacySnap.id,
      source: "clubes_ciencia",
      data: legacySnap.data() || {},
    };
  }

  return null;
}

function collectClubMemberIds(clubData = {}) {
  return normalizeIdList([
    ...(clubData?.membros_ids || []),
    ...(clubData?.clubistas_ids || []),
    ...(clubData?.orientador_ids || []),
    ...(clubData?.orientadores_ids || []),
    ...(clubData?.coorientador_ids || []),
    ...(clubData?.coorientadores_ids || []),
    clubData?.mentor_id,
  ]);
}

function collectClubMentorIds(clubData = {}) {
  return normalizeIdList([
    ...(clubData?.orientador_ids || []),
    ...(clubData?.orientadores_ids || []),
    ...(clubData?.coorientador_ids || []),
    ...(clubData?.coorientadores_ids || []),
    clubData?.mentor_id,
  ]);
}

function buildComparableSet(values = []) {
  const normalized = normalizeIdList(values);
  const exact = new Set(normalized);
  const lower = new Set(normalized.map((value) => value.toLowerCase()));
  return { exact, lower };
}

function hasTokenInSet(comparableSet, token) {
  const normalized = String(token || "").trim();
  if (!normalized) return false;
  return (
    comparableSet.exact.has(normalized) ||
    comparableSet.lower.has(normalized.toLowerCase())
  );
}

function buildUserTokens(docId, data = {}) {
  const raw = normalizeIdList([
    docId,
    data?.id,
    data?.uid,
    data?.email,
    data?.emailPrincipal,
    data?.email_usuario,
    data?.matricula,
    data?.matricula_escolar,
    data?.registro,
    data?.codigo,
  ]);

  const withEmailLower = raw.flatMap((value) => {
    if (String(value).includes("@")) {
      return [value, value.toLowerCase()];
    }
    return [value];
  });

  return normalizeIdList(withEmailLower);
}

async function resolveUserCandidatesByReference(db, reference) {
  const normalizedReference = String(reference || "").trim();
  if (!normalizedReference) return [];

  const candidates = [];
  const seenIds = new Set();

  async function pushIfExists(snap) {
    if (!snap?.exists) return;
    if (seenIds.has(snap.id)) return;
    seenIds.add(snap.id);
    candidates.push({
      id: snap.id,
      data: snap.data() || {},
      tokens: buildUserTokens(snap.id, snap.data() || {}),
    });
  }

  try {
    const byDocId = await db.collection("usuarios").doc(normalizedReference).get();
    await pushIfExists(byDocId);
  } catch {
    // noop
  }

  const fields = [
    "uid",
    "email",
    "emailPrincipal",
    "email_usuario",
    "matricula",
    "matricula_escolar",
    "registro",
    "codigo",
  ];

  for (const fieldName of fields) {
    try {
      const querySnap = await db
        .collection("usuarios")
        .where(fieldName, "==", normalizedReference)
        .limit(5)
        .get();

      for (const docSnap of querySnap.docs) {
        await pushIfExists(docSnap);
      }
    } catch {
      // noop
    }
  }

  return candidates;
}

function serializeUser(candidate) {
  if (!candidate) return null;
  const data = candidate.data || {};

  return {
    id: String(candidate.id || "").trim(),
    uid: String(data.uid || "").trim(),
    nome: String(data.nome || "").trim(),
    email: String(
      data.email || data.emailPrincipal || data.email_usuario || "",
    ).trim(),
    matricula: String(
      data.matricula || data.matricula_escolar || data.registro || data.codigo || "",
    ).trim(),
    perfil: String(data.perfil || "").trim(),
  };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: "",
    };
  }

  if (!["GET", "POST"].includes(String(event.httpMethod || "").toUpperCase())) {
    return json(405, {
      error: "Metodo nao suportado. Use GET ou POST.",
    });
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

  const body = parseBody(event);
  const queryParams = event?.queryStringParameters || {};
  const rawCode = String(
    body?.code ||
      body?.barcode ||
      body?.payload ||
      queryParams?.code ||
      queryParams?.barcode ||
      "",
  ).trim();

  if (!rawCode) {
    return json(400, {
      error: "Codigo da carteirinha obrigatorio.",
    });
  }

  const parsed = parseMembershipBarcodePayload(rawCode);
  if (!parsed.ok) {
    return json(400, {
      error: parsed.error || "Codigo da carteirinha invalido.",
      valid: false,
    });
  }

  if (String(parsed.prefix || "").trim() !== MEMBERSHIP_BARCODE_PREFIX) {
    return json(400, {
      error: "Prefixo invalido no codigo da carteirinha.",
      valid: false,
    });
  }

  const db = getAdminDb();

  const callerCandidates = await resolveUserCandidatesByReference(db, callerUid);
  const caller = callerCandidates[0] || null;
  if (!caller) {
    return json(403, {
      error: "Usuario autenticado nao encontrado para validacao.",
    });
  }

  const clubRecord = await getClubById(db, parsed.clubId);
  if (!clubRecord) {
    return json(200, {
      valid: false,
      status: "invalid",
      reason: "Clube nao encontrado.",
      checkedAt: new Date().toISOString(),
      card: {
        code: parsed.raw,
        prefix: parsed.prefix,
        clubId: parsed.clubId,
        memberId: parsed.memberId,
        role: parsed.roleCode === "M" ? "mentor" : "clubista",
        expiryYmd: parsed.expiryYmd,
        expiryDate: ymdToIsoDate(parsed.expiryYmd),
        expired: isExpiryYmdExpired(parsed.expiryYmd),
      },
      caller: serializeUser(caller),
    });
  }

  const clubData = clubRecord.data || {};
  const clubMemberIds = collectClubMemberIds(clubData);
  const clubMentorIds = collectClubMentorIds(clubData);
  const clubMemberComparableSet = buildComparableSet(clubMemberIds);
  const clubMentorComparableSet = buildComparableSet(clubMentorIds);

  const callerTokens = buildUserTokens(caller.id, caller.data);
  const callerHasClubLink = callerTokens.some((token) =>
    hasTokenInSet(clubMemberComparableSet, token),
  );
  const callerClubIds = getUserClubIds(caller.data);
  const callerHasClubId = callerClubIds.includes(clubRecord.id);

  if (!callerHasClubLink && !callerHasClubId) {
    return json(403, {
      error: "Voce nao possui permissao para validar carteirinhas deste clube.",
    });
  }

  const memberCandidates = await resolveUserCandidatesByReference(db, parsed.memberId);
  const memberCandidateByClubToken = memberCandidates.find((candidate) =>
    candidate.tokens.some((token) => hasTokenInSet(clubMemberComparableSet, token)),
  );
  const resolvedMember = memberCandidateByClubToken || memberCandidates[0] || null;

  const parsedMemberIsInClub =
    hasTokenInSet(clubMemberComparableSet, parsed.memberId) ||
    Boolean(
      resolvedMember &&
        resolvedMember.tokens.some((token) =>
          hasTokenInSet(clubMemberComparableSet, token),
        ),
    );

  const parsedMemberIsMentor =
    hasTokenInSet(clubMentorComparableSet, parsed.memberId) ||
    Boolean(
      resolvedMember &&
        resolvedMember.tokens.some((token) =>
          hasTokenInSet(clubMentorComparableSet, token),
        ),
    );

  const expectedMentorRole = parsed.roleCode === "M";
  const roleMatch = expectedMentorRole
    ? parsedMemberIsMentor
    : parsedMemberIsInClub && !parsedMemberIsMentor;

  const expired = isExpiryYmdExpired(parsed.expiryYmd);
  const valid = parsedMemberIsInClub && roleMatch && !expired;

  const reason = !parsedMemberIsInClub
    ? "Membro nao vinculado ao clube informado."
    : expired
      ? "Carteirinha expirada."
      : !roleMatch
        ? "Perfil do membro nao corresponde ao tipo da carteirinha."
        : "Carteirinha valida.";

  return json(200, {
    valid,
    status: valid ? "valid" : "invalid",
    reason,
    checkedAt: new Date().toISOString(),
    card: {
      code: parsed.raw,
      prefix: parsed.prefix,
      clubId: parsed.clubId,
      memberId: parsed.memberId,
      role: parsed.roleCode === "M" ? "mentor" : "clubista",
      expiryYmd: parsed.expiryYmd,
      expiryDate: ymdToIsoDate(parsed.expiryYmd),
      expired,
      checksum: parsed.checksum,
    },
    club: {
      id: clubRecord.id,
      sourceCollection: clubRecord.source,
      nome: String(clubData?.nome || "").trim(),
      escola_nome: String(clubData?.escola_nome || "").trim(),
    },
    member: serializeUser(resolvedMember),
    caller: serializeUser(caller),
    validation: {
      memberInClub: parsedMemberIsInClub,
      roleMatch,
      callerAuthorized: true,
    },
  });
}
