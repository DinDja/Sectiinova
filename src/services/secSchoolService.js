async function requestSecSchool(payload) {
  const response = await fetch("/api/sec-escola/servidores", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.error
      || data?.message
      || "Falha ao consultar dados da SEC.",
    );
  }

  return data;
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
