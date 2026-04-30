import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase";

const PRIORITY_VALUES = new Set(["baixa", "media", "alta", "critica"]);

const normalizeText = (value, maxLength) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  return normalized.slice(0, maxLength);
};

const normalizePriority = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return PRIORITY_VALUES.has(normalized) ? normalized : "media";
};

export async function createSupportTicket({
  currentView,
  moduleLabel,
  description,
  priority,
  contactEmail,
  contextClubName,
  pageUrl,
  loggedUser,
}) {
  const activeAuthUser = auth.currentUser;
  const reporterUid = normalizeText(loggedUser?.uid || activeAuthUser?.uid, 128);

  if (!reporterUid) {
    throw new Error("Usuario nao autenticado para abertura de chamado.");
  }

  const normalizedDescription = normalizeText(description, 4000);
  if (normalizedDescription.length < 15) {
    throw new Error("Descreva o problema com pelo menos 15 caracteres.");
  }

  const reporterEmail = normalizeText(
    loggedUser?.email || activeAuthUser?.email || contactEmail,
    160,
  );

  if (!reporterEmail) {
    throw new Error("Nao foi possivel identificar o email para contato.");
  }

  const payload = {
    module_id: normalizeText(currentView, 64) || "sistema",
    module_label: normalizeText(moduleLabel, 120) || "Sistema",
    description: normalizedDescription,
    priority: normalizePriority(priority),
    status: "aberto",
    reporter_uid: reporterUid,
    reporter_email: reporterEmail,
    platform: "web",
    source: "support_widget",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const reporterName = normalizeText(
    loggedUser?.nome || activeAuthUser?.displayName,
    160,
  );
  const normalizedContactEmail = normalizeText(contactEmail, 160);
  const normalizedContextClubName = normalizeText(contextClubName, 180);
  const normalizedPageUrl = normalizeText(pageUrl, 500);
  const normalizedUserAgent = normalizeText(
    typeof navigator !== "undefined" ? navigator.userAgent : "",
    400,
  );

  if (reporterName) payload.reporter_nome = reporterName;
  if (normalizedContactEmail) payload.contact_email = normalizedContactEmail;
  if (normalizedContextClubName) payload.context_clube_nome = normalizedContextClubName;
  if (normalizedPageUrl) payload.page_url = normalizedPageUrl;
  if (normalizedUserAgent) payload.browser_ua = normalizedUserAgent;

  const ticketRef = await addDoc(collection(db, "support_tickets"), payload);
  return ticketRef.id;
}
