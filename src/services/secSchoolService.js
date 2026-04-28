const SEC_FETCH_TIMEOUT_MS = 25000;
const SEC_ENDPOINT_CANDIDATES = [
  "/api/sec-escola/servidores",
  "/.netlify/functions/sec-escola-servidores",
];

function shouldTryFallback(responseStatus) {
  return responseStatus === 404 || responseStatus === 405;
}

function createRequestTimeoutSignal(timeoutMs = SEC_FETCH_TIMEOUT_MS) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(timeoutMs);
  }
  return undefined;
}

async function requestSecSchool(payload) {
  const fallbackErrors = [];

  for (let index = 0; index < SEC_ENDPOINT_CANDIDATES.length; index += 1) {
    const endpoint = SEC_ENDPOINT_CANDIDATES[index];
    const isLastEndpoint = index === SEC_ENDPOINT_CANDIDATES.length - 1;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(payload),
        signal: createRequestTimeoutSignal(),
      });

      const rawResponse = await response.text();
      let data = {};

      try {
        data = rawResponse ? JSON.parse(rawResponse) : {};
      } catch {
        data = {};
      }

      if (response.ok) {
        return data;
      }

      if (!isLastEndpoint && shouldTryFallback(response.status)) {
        fallbackErrors.push(
          `${endpoint} retornou HTTP ${response.status}`,
        );
        continue;
      }

      throw new Error(
        data?.error
        || data?.message
        || `Falha ao consultar dados da SEC (HTTP ${response.status}).`,
      );
    } catch (error) {
      const message = String(error?.message || "").trim();
      const isAbortError = error?.name === "AbortError";

      if (!isLastEndpoint) {
        fallbackErrors.push(
          `${endpoint} falhou: ${isAbortError ? "timeout" : message || "erro de rede"}`,
        );
        continue;
      }

      if (isAbortError) {
        throw new Error(
          "A consulta da SEC excedeu o tempo limite. Tente novamente em instantes.",
        );
      }

      if (fallbackErrors.length > 0) {
        throw new Error(
          `Falha ao consultar a SEC. Tentativas: ${[...fallbackErrors, `${endpoint} falhou: ${message || "erro de rede"}`].join(" | ")}`,
        );
      }

      throw new Error(message || "Falha ao consultar dados da SEC.");
    }
  }

  throw new Error("Falha ao consultar dados da SEC.");
}

function buildSchoolPayload(schoolUnit = {}, redeAdministrativa = "estadual") {
  const normalizedRede = String(redeAdministrativa || "").trim().toLowerCase();

  const explicitCodigoSec = String(
    schoolUnit?.cod_sec
    || schoolUnit?.codigo_sec
    || schoolUnit?.codigoSec
    || "",
  ).trim();

  const codigoSec = explicitCodigoSec
    || (normalizedRede === "estadual" ? String(schoolUnit?.escola_id || "").trim() : "");

  const codigoMec = String(
    schoolUnit?.cod_inep
    || schoolUnit?.codigo_mec
    || schoolUnit?.inep
    || (normalizedRede === "municipal" ? schoolUnit?.escola_id : "")
    || "",
  ).trim();

  return {
    codigoSec,
    codigoMec,
    anexo: String(schoolUnit?.anexo || schoolUnit?.seq_anexo || "").trim(),
    nomeEscola: String(schoolUnit?.nome || schoolUnit?.escola_nome || "").trim(),
    municipio: String(schoolUnit?.municipio || schoolUnit?.escola_municipio || "").trim(),
  };
}

export async function validateTeacherRegistrationBySec({
  matricula,
  schoolUnit,
  redeAdministrativa,
}) {
  const normalizedMatricula = String(matricula || "").replace(/\D+/g, "").trim();
  if (!normalizedMatricula) {
    throw new Error("Informe a matricula para validacao na SEC.");
  }

  const schoolPayload = buildSchoolPayload(schoolUnit, redeAdministrativa);
  if (!schoolPayload.nomeEscola) {
    throw new Error("Nao foi possivel identificar a unidade escolar para validacao na SEC.");
  }

  return requestSecSchool({
    ...schoolPayload,
    matricula: normalizedMatricula,
  });
}
