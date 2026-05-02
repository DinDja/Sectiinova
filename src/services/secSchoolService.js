const SEC_FETCH_TIMEOUT_MS = 45000;
const SEC_ENDPOINT_CANDIDATES = [
  "/api/sec-escola/servidores",
  "/.netlify/functions/sec-escola-servidores",
];

function resolveEndpointCandidates() {
  return SEC_ENDPOINT_CANDIDATES;
}

function shouldTryFallback(responseStatus) {
  return [404, 405, 408, 500, 502, 503, 504].includes(Number(responseStatus));
}

function createRequestTimeoutSignal(timeoutMs = SEC_FETCH_TIMEOUT_MS) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(timeoutMs);
  }
  return undefined;
}

function isTimeoutLikeError(error) {
  const name = String(error?.name || "").trim().toLowerCase();
  const message = String(error?.message || "").trim().toLowerCase();

  if (name === "aborterror") return true;

  return (
    message.includes("timed out")
    || message.includes("timeout")
    || message.includes("tempo limite")
    || message.includes("signal timed out")
  );
}

function createRequestSignal(timeoutMs, externalSignal) {
  const timeoutSignal = createRequestTimeoutSignal(timeoutMs);

  if (!externalSignal) return timeoutSignal;
  if (!timeoutSignal) return externalSignal;

  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.any === "function") {
    return AbortSignal.any([externalSignal, timeoutSignal]);
  }

  return externalSignal;
}

async function requestSecSchool(payload, options = {}) {
  const fallbackErrors = [];
  const endpointCandidates = resolveEndpointCandidates();
  const timeoutMsInput = Number(options?.timeoutMs);
  const timeoutMs = Number.isFinite(timeoutMsInput) && timeoutMsInput > 0
    ? timeoutMsInput
    : SEC_FETCH_TIMEOUT_MS;
  const externalSignal = options?.signal;
  const allowEndpointFallback = options?.allowEndpointFallback !== false;

  for (let index = 0; index < endpointCandidates.length; index += 1) {
    const endpoint = endpointCandidates[index];
    const isLastEndpoint = index === endpointCandidates.length - 1;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(payload),
        signal: createRequestSignal(timeoutMs, externalSignal),
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

      if (!isLastEndpoint && allowEndpointFallback && shouldTryFallback(response.status)) {
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
      if (externalSignal?.aborted) {
        const abortError = new Error("Request aborted");
        abortError.name = "AbortError";
        throw abortError;
      }

      const message = String(error?.message || "").trim();
      const isTimeoutError = isTimeoutLikeError(error);

      if (isTimeoutError) {
        if (!isLastEndpoint && allowEndpointFallback) {
          fallbackErrors.push(
            `${endpoint} excedeu o tempo limite`,
          );
          continue;
        }

        throw new Error(
          "A consulta da SEC excedeu o tempo limite. Tente novamente em instantes.",
        );
      }

      if (!isLastEndpoint && allowEndpointFallback) {
        fallbackErrors.push(
          `${endpoint} falhou: ${message || "erro de rede"}`,
        );
        continue;
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
}, options = {}) {
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
  }, options);
}
