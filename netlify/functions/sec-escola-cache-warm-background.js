import { fetchSecSchoolStaffFlow } from "../../scripts/secSchoolStaffProxy.js";
import { getAdminDb } from "./firebaseAdminShared.js";

const SEC_STAFF_PERSISTENT_CACHE_COLLECTION = "sec_escola_staff_cache";

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

function getMergedPayload(event) {
  const queryPayload = event?.queryStringParameters || {};
  const bodyPayload = parseBody(event);
  return {
    ...queryPayload,
    ...bodyPayload,
  };
}

function normalizeDigits(value) {
  return String(value || "").replace(/\D+/g, "");
}

function sanitizeSelectedSchool(selectedSchool = {}) {
  return {
    codigoMec: String(selectedSchool?.codigoMec || "").trim(),
    codigoSec: String(selectedSchool?.codigoSec || "").trim(),
    anexo: String(selectedSchool?.anexo || "00").trim() || "00",
    codigoMecAnexo: String(selectedSchool?.codigoMecAnexo || "").trim(),
    nome: String(selectedSchool?.nome || "").trim(),
    depAdm: String(selectedSchool?.depAdm || "").trim(),
    situacaoFuncional: String(selectedSchool?.situacaoFuncional || "").trim(),
    direc: String(selectedSchool?.direc || "").trim(),
    municipio: String(selectedSchool?.municipio || "").trim(),
    projeto: String(selectedSchool?.projeto || "").trim(),
    modalidade: String(selectedSchool?.modalidade || "").trim(),
  };
}

function sanitizeServidores(rows = []) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => ({
      cadastro: String(row?.cadastro || row?.matricula || "").trim(),
      matricula: normalizeDigits(row?.matricula || row?.cadastro || ""),
      nome: String(row?.nome || "").trim(),
      cargo: String(row?.cargo || "").trim(),
      funcao: String(row?.funcao || "").trim(),
      nivel: String(row?.nivel || "").trim(),
      situacao: String(row?.situacao || "").trim(),
    }))
    .filter((row) => row.matricula.length >= 5);
}

function buildCacheKey(selectedSchool = {}) {
  const codigoMec = String(selectedSchool?.codigoMec || "").trim();
  const codigoSec = String(selectedSchool?.codigoSec || "").trim();
  const anexo = String(selectedSchool?.anexo || "00").trim() || "00";

  if (!codigoMec || !codigoSec) return "";

  return `${codigoMec}|${codigoSec}|${anexo}`;
}

export async function handler(event) {
  const method = String(event?.httpMethod || "").toUpperCase();

  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (!["POST"].includes(method)) {
    return json(405, {
      error: "Metodo nao suportado. Use POST.",
    });
  }

  const payload = getMergedPayload(event);
  const codigoMec = String(payload?.codigoMec || payload?.codigo_mec || "").trim();
  const codigoSec = String(payload?.codigoSec || payload?.codigo_sec || "").trim();
  const anexo = String(payload?.anexo || payload?.seq_anexo || "00").trim() || "00";

  if (!codigoMec || !codigoSec) {
    return json(400, {
      error: "Informe codigoMec e codigoSec para aquecer cache da SEC.",
    });
  }

  try {
    const flowResult = await fetchSecSchoolStaffFlow({
      codigoMec,
      codigoSec,
      anexo,
      nomeEscola: String(payload?.nomeEscola || payload?.nome_escola || "").trim(),
      municipio: String(payload?.municipio || "").trim(),
      maxEscolas: 1,
    });

    const selectedSchool = flowResult?.selectedSchool || null;
    if (!selectedSchool) {
      return json(200, {
        ok: false,
        warmed: false,
        reason: "Unidade nao encontrada para aquecimento de cache.",
      });
    }

    const key = buildCacheKey(selectedSchool);
    if (!key) {
      return json(200, {
        ok: false,
        warmed: false,
        reason: "Nao foi possivel montar chave de cache da unidade.",
      });
    }

    const servidores = sanitizeServidores(flowResult?.servidores || []);
    const db = getAdminDb();

    await db.collection(SEC_STAFF_PERSISTENT_CACHE_COLLECTION).doc(key).set({
      key,
      selectedSchool: sanitizeSelectedSchool(selectedSchool),
      servidores,
      totalServidores: servidores.length,
      updatedAtMs: Date.now(),
      updatedAtIso: new Date().toISOString(),
      source: "sec-escola-cache-warm-background",
    }, { merge: true });

    return json(200, {
      ok: true,
      warmed: true,
      key,
      totalServidores: servidores.length,
      selectedSchool: {
        codigoMec: selectedSchool.codigoMec,
        codigoSec: selectedSchool.codigoSec,
        anexo: selectedSchool.anexo,
        nome: selectedSchool.nome,
      },
    });
  } catch (error) {
    return json(502, {
      error: error instanceof Error ? error.message : "Falha ao aquecer cache SEC.",
    });
  }
}
