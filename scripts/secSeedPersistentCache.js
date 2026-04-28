import { fetchSecSchoolStaffFlow } from "./secSchoolStaffProxy.js";
import { getAdminDb } from "../netlify/functions/firebaseAdminShared.js";

const COLLECTION_NAME = "sec_escola_staff_cache";

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index < 0) return "";
  return String(process.argv[index + 1] || "").trim();
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

  if (!codigoMec || !codigoSec) {
    throw new Error("Nao foi possivel montar a chave de cache sem codigoMec/codigoSec.");
  }

  return `${codigoMec}|${codigoSec}|${anexo}`;
}

function printUsage() {
  console.log([
    "Uso:",
    "  node scripts/secSeedPersistentCache.js --codigoMec <codigo> --codigoSec <codigo> [--anexo 00] [--nomeEscola \"NOME\"] [--municipio \"MUNICIPIO\"]",
    "",
    "Exemplo:",
    "  node scripts/secSeedPersistentCache.js --codigoMec 29199387 --codigoSec 1103778 --anexo 00",
  ].join("\n"));
}

async function main() {
  const codigoMec = readArg("--codigoMec");
  const codigoSec = readArg("--codigoSec");
  const anexo = readArg("--anexo") || "00";
  const nomeEscola = readArg("--nomeEscola");
  const municipio = readArg("--municipio");

  if (!codigoMec || !codigoSec) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const query = {
    codigoMec,
    codigoSec,
    anexo,
    nomeEscola,
    municipio,
    maxEscolas: 1,
  };

  const result = await fetchSecSchoolStaffFlow(query);
  const selectedSchool = result?.selectedSchool;

  if (!selectedSchool) {
    throw new Error("SEC nao retornou unidade selecionada para os codigos informados.");
  }

  const servidores = sanitizeServidores(result?.servidores || []);
  const key = buildCacheKey(selectedSchool);
  const db = getAdminDb();

  await db.collection(COLLECTION_NAME).doc(key).set({
    key,
    selectedSchool: sanitizeSelectedSchool(selectedSchool),
    servidores,
    totalServidores: servidores.length,
    updatedAtMs: Date.now(),
    updatedAtIso: new Date().toISOString(),
    source: "sec-seed-local-script",
  }, { merge: true });

  console.log(JSON.stringify({
    ok: true,
    key,
    totalServidores: servidores.length,
    selectedSchool: {
      codigoMec: selectedSchool.codigoMec,
      codigoSec: selectedSchool.codigoSec,
      anexo: selectedSchool.anexo,
      nome: selectedSchool.nome,
    },
  }, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[sec-seed-cache] erro:", message);
  process.exitCode = 1;
});
