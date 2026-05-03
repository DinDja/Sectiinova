import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  Download,
  ExternalLink,
  LoaderCircle,
  RefreshCcw,
  Search,
  Library,
  Bookmark,
  BookmarkCheck,
  BookType,
  X,
  Info
} from "lucide-react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

import { fetchLibraryBooks } from "../../services/libraryBooksService";
import { normalizeUiStyleId } from "../../constants/uiPreferences";
import { db } from "../../../firebase";

const DEFAULT_INTENT =
  "Foco em ciência, tecnologia e inovação na Bahia";

const SECTI_SCIENCE_MAGAZINE = {
  title: "Revista Bahia Faz Ciência",
  description:
    "Publicação oficial da SECTI com destaques de ciência aplicada e inovação na Bahia.",
  editionLabel: "Edição mais recente",
  pdfUrl:
    "https://www.ba.gov.br/secti/sites/site-secti/files/2025-10/REVISTA_A4_BFC2025_FINAL-BFC_SITE%20%281%29.pdf",
  previewImageUrl:
    "https://www.ba.gov.br/secti/sites/site-secti/files/styles/banner_1400x310/public/2025-10/BAN_1400x310px_LANCAMENTO.jpg",
  portalUrl: "https://www.ba.gov.br/secti/",
  sourceUrl: "https://www.ba.gov.br/secti/banner/revista-bfc-1",
  lastCheckedAt: "",
};
const MAX_SAVED_BOOKS = 80;
const SAVED_BOOKS_FIELD = "library_saved_books";
const EXPLICIT_ADULT_HINTS_UI = [
  "adult content",
  "adult-content",
  "conteudo adulto",
  "conteudo +18",
  "conteudo 18+",
  "erotica",
  "erotico",
  "erotic",
  "porn",
  "porno",
  "pornografia",
  "xxx",
  "hentai",
  "nsfw",
  "onlyfans",
  "fetish",
  "bdsm",
  "sex tape",
  "18+",
  "+18",
  "maiores de 18",
  "for adults",
];

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizeForSafetyCheck(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasExplicitAdultContent(book = {}) {
  const title = String(book?.title || "");
  const subjects = Array.isArray(book?.subjects) ? book.subjects.join(" ") : "";
  const bookshelves = Array.isArray(book?.bookshelves) ? book.bookshelves.join(" ") : "";
  const authors = Array.isArray(book?.authors)
    ? book.authors.map((author) => String(author?.name || "")).join(" ")
    : "";
  const sourceName = String(book?.sourceName || book?.source_name || "");
  const metadataText = normalizeForSafetyCheck(
    `${title} ${subjects} ${bookshelves} ${authors} ${sourceName}`,
  );

  if (!metadataText) return false;
  const paddedMetadata = ` ${metadataText} `;

  return EXPLICIT_ADULT_HINTS_UI.some((hint) => {
    const normalizedHint = normalizeForSafetyCheck(hint);
    if (!normalizedHint) return false;
    return paddedMetadata.includes(` ${normalizedHint} `);
  });
}

function sanitizeBooksForDisplay(entries = []) {
  if (!Array.isArray(entries)) return [];
  return entries.filter((book) => !hasExplicitAdultContent(book));
}

function formatAuthors(authors = []) {
  const names = (Array.isArray(authors) ? authors : [])
    .map((author) => String(author?.name || "").trim())
    .filter(Boolean);

  if (names.length === 0) return "Autor não informado";
  if (names.length <= 2) return names.join("; ");
  return `${names.slice(0, 2).join("; ")} e +${names.length - 2}`;
}

function formatScore(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return "--";
  return `${Math.round(value * 100)}%`;
}

function formatDownloads(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "0";
  return parsed.toLocaleString("pt-BR");
}

function formatGeneratedAt(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function toHttpsUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/^http:\/\//i, "https://");
  }
  return "";
}

function readArchiveIdentifier(book = {}) {
  const sourceUrl = String(book?.sourceUrl || "").trim();
  const sourceMatch = sourceUrl.match(/archive\.org\/details\/([^/?#]+)/i);
  if (sourceMatch?.[1]) {
    return decodeURIComponent(String(sourceMatch[1] || "").trim());
  }

  const idValue = String(book?.id || "").trim();
  if (idValue.startsWith("archive:")) {
    return idValue.slice("archive:".length).trim();
  }

  return "";
}

function readArchiveFallbackCoverUrl(book = {}) {
  const sourceId = String(book?.sourceId || "").trim().toLowerCase();
  if (sourceId !== "archive-pt") return "";

  const identifier = readArchiveIdentifier(book);
  if (!identifier) return "";

  return `https://archive.org/download/${encodeURIComponent(identifier)}/page/n1.jpg`;
}

function resolveBookKey(book = {}) {
  const directId = normalizeText(book?.bookKey || book?.id);
  if (directId) return directId;

  const sourceUrl = normalizeText(book?.sourceUrl);
  if (sourceUrl) return sourceUrl.toLowerCase();

  const title = normalizeText(book?.title || "livro").toLowerCase().slice(0, 140);
  const author = Array.isArray(book?.authors)
    ? normalizeText(book.authors[0]?.name || "").toLowerCase().slice(0, 80)
    : "";

  return `${title}::${author || "autor"}`;
}

function createSavedBookSnapshot(book = {}) {
  const bookKey = resolveBookKey(book);
  const authors = Array.isArray(book?.authors)
    ? book.authors
      .map((author) => normalizeText(author?.name).slice(0, 120))
      .filter(Boolean)
    : [];
  const languages = Array.isArray(book?.languages)
    ? book.languages.map((language) => normalizeText(language).slice(0, 20)).filter(Boolean)
    : [];
  const subjects = Array.isArray(book?.subjects)
    ? book.subjects.map((subject) => normalizeText(subject).slice(0, 120)).filter(Boolean).slice(0, 8)
    : [];
  const normalizedSourceUrl = toHttpsUrl(book?.sourceUrl);
  const normalizedCoverUrl = toHttpsUrl(book?.coverUrl);
  const normalizedDownloads = {
    pdf: toHttpsUrl(book?.downloads?.pdf),
    epub: toHttpsUrl(book?.downloads?.epub),
    html: toHttpsUrl(book?.downloads?.html),
    text: toHttpsUrl(book?.downloads?.text),
  };

  return {
    bookKey,
    id: normalizeText(book?.id).slice(0, 180),
    title: normalizeText(book?.title || "Livro sem titulo").slice(0, 240),
    authors: authors.map((name) => ({ name })),
    languages,
    subjects,
    downloadCount: Math.max(0, Math.trunc(Number(book?.downloadCount || 0))),
    relevanceScore: Number.isFinite(Number(book?.relevanceScore))
      ? Number(Number(book.relevanceScore).toFixed(2))
      : 0,
    coverUrl: normalizedCoverUrl || readArchiveFallbackCoverUrl(book),
    downloads: normalizedDownloads,
    sourceUrl: normalizedSourceUrl,
    sourceName: normalizeText(book?.sourceName || "Fonte livre").slice(0, 120),
    sourceId: normalizeText(book?.sourceId || "").slice(0, 60),
    savedAt: normalizeText(book?.savedAt || new Date().toISOString()),
  };
}

function normalizeSavedBooks(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  const seenKeys = new Set();

  return entries
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => createSavedBookSnapshot(entry))
    .filter((entry) => {
      if (!entry.bookKey || seenKeys.has(entry.bookKey)) {
        return false;
      }
      seenKeys.add(entry.bookKey);
      return true;
    })
    .sort((left, right) => {
      const leftMs = new Date(left.savedAt).getTime();
      const rightMs = new Date(right.savedAt).getTime();
      const safeLeftMs = Number.isFinite(leftMs) ? leftMs : 0;
      const safeRightMs = Number.isFinite(rightMs) ? rightMs : 0;
      return safeRightMs - safeLeftMs;
    })
    .slice(0, MAX_SAVED_BOOKS);
}

export default function LibraryBoard({ uiStyleId = "neo", loggedUser = null }) {
  const firestoreUserId = useMemo(
    () => normalizeText(loggedUser?.id || loggedUser?.uid),
    [loggedUser],
  );
  const [intent, setIntent] = useState(DEFAULT_INTENT);
  const [query, setQuery] = useState("Robótica espacial");
  const [limit, setLimit] = useState(12);
  const [activeTab, setActiveTab] = useState("catalog");
  const [books, setBooks] = useState([]);
  const [savedBooks, setSavedBooks] = useState([]);
  const [savedBooksError, setSavedBooksError] = useState("");
  const [pendingSaveBookKey, setPendingSaveBookKey] = useState("");
  const [robotMeta, setRobotMeta] = useState(null);
  const [generatedAt, setGeneratedAt] = useState("");
  const [sectiMagazine, setSectiMagazine] = useState(SECTI_SCIENCE_MAGAZINE);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [failedCoverById, setFailedCoverById] = useState({});
  const hasLoadedInitialBooksRef = useRef(false);

  // Novo estado para controlar qual livro está aberto no modal
  const [selectedBook, setSelectedBook] = useState(null);

  const styleId = normalizeUiStyleId(uiStyleId);
  const isMaterialStyle = styleId === "material";
  const isModernStyle = styleId === "modern";
  const isEditorialStyle = styleId === "editorial";

  const boardClassName = useMemo(() => {
    if (isMaterialStyle) return "rounded-3xl border border-slate-200 bg-[#fafafa] p-5 sm:p-6 mt-5";
    if (isModernStyle) return "rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm mt-5";
    if (isEditorialStyle) return "rounded-[1.7rem] border border-[#d9c7ad] bg-[#fbf7f1] p-5 sm:p-6 mt-5";
    return "rounded-[1.8rem] border-[3px] border-slate-900 bg-white p-5 sm:p-6 shadow-[8px_8px_0_0_rgba(15,23,42,1)] mt-5";
  }, [isEditorialStyle, isMaterialStyle, isModernStyle]);

  const panelClassName = useMemo(() => {
    if (isMaterialStyle || isModernStyle) return "rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm";
    if (isEditorialStyle) return "rounded-2xl border border-[#d9c7ad] bg-[#f5ebe0] p-4 sm:p-5";
    return "rounded-2xl border-[3px] border-slate-900 bg-cyan-50/50 p-4 sm:p-5";
  }, [isEditorialStyle, isMaterialStyle, isModernStyle]);

  const heroClassName = "pop-eventos-hero premium-card bg-home p-6 sm:p-7";
  const assistantCardClassName = "pop-eventos-assistant-card";
  const assistantIconClassName = "pop-eventos-assistant-icon";
  const statBadgeClassName = "pop-eventos-stat-badge";
  const formattedGeneratedAt = useMemo(() => formatGeneratedAt(generatedAt), [generatedAt]);
  const activeSourcesCount = useMemo(() => {
    const sourceStats = Array.isArray(robotMeta?.sourceStats) ? robotMeta.sourceStats : [];
    return sourceStats.filter((source) => Number(source?.candidates || 0) > 0).length;
  }, [robotMeta]);
  const savedBooksCount = savedBooks.length;
  const visibleBooks = activeTab === "saved" ? savedBooks : books;
  const savedBookKeySet = useMemo(
    () => new Set(savedBooks.map((entry) => resolveBookKey(entry))),
    [savedBooks],
  );

  const degradedWarning = useMemo(() => {
    if (!robotMeta?.degradedMode) return "";

    if (robotMeta?.fallbackSource === "cache") {
      return "As fontes externas oscilaram. A estante esta exibindo um acervo de contingencia com dados recentes em cache.";
    }

    if (robotMeta?.fallbackSource === "static") {
      return "As fontes externas estao instaveis no momento. A estante esta exibindo uma selecao de contingencia enquanto a consulta normaliza.";
    }

    return "As fontes externas estao instaveis no momento. Tente novamente em alguns instantes.";
  }, [robotMeta]);

  const loadBooks = useCallback(
    async ({ forceRefresh = false } = {}) => {
      setIsLoading(true);
      setErrorMessage("");
      setSelectedBook(null); // Fecha o modal ao recarregar

      try {
        const payload = await fetchLibraryBooks({
          intent,
          query,
          limit,
          forceRefresh,
        });

        setBooks(sanitizeBooksForDisplay(Array.isArray(payload?.books) ? payload.books : []));
        setRobotMeta(payload?.robot || null);
        setGeneratedAt(String(payload?.generatedAt || ""));
        setSectiMagazine(
          payload?.sectiMagazine && typeof payload.sectiMagazine === "object"
            ? {
              ...SECTI_SCIENCE_MAGAZINE,
              ...payload.sectiMagazine,
            }
            : SECTI_SCIENCE_MAGAZINE,
        );
      } catch (error) {
        console.error("Erro ao carregar biblioteca livre:", error);
        setBooks([]);
        setRobotMeta(null);
        setGeneratedAt("");
        setErrorMessage(
          String(error?.message || "Não foi possível acessar o acervo da biblioteca no momento."),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [intent, limit, query],
  );

  useEffect(() => {
    if (hasLoadedInitialBooksRef.current) {
      return;
    }

    hasLoadedInitialBooksRef.current = true;
    void loadBooks();
  }, [loadBooks]);

  useEffect(() => {
    if (!firestoreUserId) {
      setSavedBooks([]);
      setSavedBooksError("");
      setPendingSaveBookKey("");
      setActiveTab((current) => (current === "saved" ? "catalog" : current));
      return undefined;
    }

    const userRef = doc(db, "usuarios", firestoreUserId);
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        const data = snapshot.data() || {};
        setSavedBooks(sanitizeBooksForDisplay(normalizeSavedBooks(data?.[SAVED_BOOKS_FIELD])));
        setSavedBooksError("");
      },
      (error) => {
        console.error("Erro ao carregar livros salvos:", error);
        setSavedBooksError("Nao foi possivel carregar sua pastinha no momento.");
      },
    );

    return () => unsubscribe();
  }, [firestoreUserId]);

  const handleToggleSavedBook = useCallback(
    async (book) => {
      if (!firestoreUserId) {
        setSavedBooksError("Faca login para salvar livros na sua pastinha.");
        return;
      }

      const bookKey = resolveBookKey(book);
      if (!bookKey) {
        setSavedBooksError("Nao foi possivel identificar o livro para salvar.");
        return;
      }

      if (hasExplicitAdultContent(book)) {
        setSavedBooksError("Este livro foi bloqueado por conter conteudo improprio.");
        return;
      }

      const wasSaved = savedBooks.some((entry) => resolveBookKey(entry) === bookKey);
      const snapshot = createSavedBookSnapshot({
        ...book,
        bookKey,
        savedAt: new Date().toISOString(),
      });
      const nextSavedBooks = wasSaved
        ? savedBooks.filter((entry) => resolveBookKey(entry) !== bookKey)
        : sanitizeBooksForDisplay(normalizeSavedBooks([snapshot, ...savedBooks])).slice(0, MAX_SAVED_BOOKS);
      const previousSavedBooks = savedBooks;

      setPendingSaveBookKey(bookKey);
      setSavedBooks(nextSavedBooks);

      try {
        await setDoc(
          doc(db, "usuarios", firestoreUserId),
          { [SAVED_BOOKS_FIELD]: nextSavedBooks },
          { merge: true },
        );
        setSavedBooksError("");
      } catch (error) {
        console.error("Erro ao atualizar livros salvos:", error);
        setSavedBooks(previousSavedBooks);
        setSavedBooksError("Nao foi possivel salvar este livro na sua pastinha.");
      } finally {
        setPendingSaveBookKey("");
      }
    },
    [firestoreUserId, savedBooks],
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    void loadBooks({ forceRefresh: true });
  };

  // Trava o scroll do body quando o modal está aberto
  useEffect(() => {
    if (selectedBook) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedBook]);

  useEffect(() => {
    setFailedCoverById({});
  }, [books]);

  const getCoverPreviewUrl = useCallback((book) => {
    const mainCover = toHttpsUrl(book?.coverUrl);
    return mainCover || readArchiveFallbackCoverUrl(book);
  }, []);

  const handleCoverLoadError = useCallback((event, book) => {
    const fallbackUrl = readArchiveFallbackCoverUrl(book);
    const imageElement = event?.currentTarget;
    const currentSource = toHttpsUrl(imageElement?.getAttribute("src") || "");

    if (
      fallbackUrl
      && imageElement
      && currentSource !== fallbackUrl
      && imageElement.dataset.archiveFallbackTried !== "1"
    ) {
      imageElement.dataset.archiveFallbackTried = "1";
      imageElement.src = fallbackUrl;
      return;
    }

    const bookId = String(book?.id || "").trim();
    if (!bookId) return;

    setFailedCoverById((previous) => {
      if (previous[bookId]) return previous;
      return {
        ...previous,
        [bookId]: true,
      };
    });
  }, []);

  const selectedBookKey = resolveBookKey(selectedBook || {});
  const isSelectedBookSaved = selectedBook ? savedBookKeySet.has(selectedBookKey) : false;
  const isSelectedBookPendingSave = pendingSaveBookKey === selectedBookKey;

  const modalNode = selectedBook ? (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 sm:p-6">
      {/* Overlay escuro que fecha o modal ao clicar fora */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => setSelectedBook(null)}
      ></div>

      {/* Conteúdo do Modal */}
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={() => setSelectedBook(null)}
          className="absolute right-4 top-4 z-20 rounded-full bg-slate-100 p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col sm:flex-row">
          {/* Coluna da Capa (Modal) */}
          <div className="flex shrink-0 items-center justify-center bg-slate-100 p-6 sm:w-64">
            {getCoverPreviewUrl(selectedBook) && !failedCoverById[String(selectedBook?.id || "").trim()] ? (
              <img
                src={getCoverPreviewUrl(selectedBook)}
                alt={selectedBook.title}
                className="h-64 w-44 rounded shadow-lg object-cover"
                referrerPolicy="no-referrer"
                onError={(event) => handleCoverLoadError(event, selectedBook)}
              />
            ) : (
              <div className="flex h-64 w-44 flex-col items-center justify-center rounded bg-slate-300 text-slate-500 shadow-lg">
                <BookOpen className="h-10 w-10 opacity-50" />
                <span className="mt-2 text-xs">Sem capa</span>
              </div>
            )}
          </div>

          {/* Coluna das Informações (Modal) */}
          <div className="flex flex-1 flex-col p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="pr-6 font-serif text-2xl font-bold leading-tight text-slate-900">
              {selectedBook?.title || "Obra sem título"}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-800">Autor(es):</span> {formatAuthors(selectedBook?.authors)}
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide">
              <span className="rounded bg-blue-50 px-2.5 py-1 font-bold text-blue-700">
                {selectedBook?.sourceName || "Fonte livre"}
              </span>
              <span className="rounded bg-slate-100 px-2.5 py-1 font-bold text-slate-700">
                {Array.isArray(selectedBook?.languages) && selectedBook.languages.length > 0 ? selectedBook.languages.join(", ") : "N/A"}
              </span>
              <span className="rounded bg-slate-100 px-2.5 py-1 text-slate-700">
                {formatDownloads(selectedBook?.downloadCount)} Downloads
              </span>
              <span className="rounded bg-emerald-100 px-2.5 py-1 font-bold text-emerald-800">
                Score: {formatScore(selectedBook?.relevanceScore)}
              </span>
            </div>

            {Array.isArray(selectedBook?.subjects) && selectedBook.subjects.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-bold uppercase text-slate-400">Assuntos / Tags</h4>
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedBook.subjects.slice(0, 5).map((sub, i) => (
                    <span key={i} className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600">
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(selectedBook?.matchReason) && selectedBook.matchReason.length > 0 && (
              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 border border-amber-100">
                <div className="mb-1 flex items-center gap-1 font-bold">
                  <Info className="h-3.5 w-3.5" />
                  Por que este livro foi escolhido?
                </div>
                <ul className="list-inside list-disc opacity-90 space-y-0.5">
                  {selectedBook.matchReason.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => void handleToggleSavedBook(selectedBook)}
                disabled={isSelectedBookPendingSave}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition ${isSelectedBookSaved
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {isSelectedBookSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                {isSelectedBookPendingSave ? "Salvando..." : isSelectedBookSaved ? "Salvo" : "Salvar"}
              </button>
              {selectedBook?.downloads?.pdf && (
                <a href={selectedBook.downloads.pdf} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 shadow-md">
                  <Download className="h-4 w-4" /> PDF
                </a>
              )}
              {selectedBook?.downloads?.epub && (
                <a href={selectedBook.downloads.epub} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                  <Download className="h-4 w-4" /> EPUB
                </a>
              )}
              {selectedBook?.downloads?.html && (
                <a href={selectedBook.downloads.html} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                  <ExternalLink className="h-4 w-4" /> Ler Online
                </a>
              )}
              {selectedBook?.sourceUrl && (
                <a href={selectedBook.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100">
                  <ExternalLink className="h-4 w-4" /> Fonte
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <section className={boardClassName}>
      <header className={`${heroClassName} mb-6`}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3.5">
            <p className="premium-chip">
              <Library className="h-3.5 w-3.5" />
              Acervo Digital Livre
            </p>
            <h2 className="text-2xl font-black text-slate-900 sm:text-3xl lg:text-[2.05rem]">
              Estante Científica Escolar
            </h2>
            <p className="max-w-3xl text-sm font-bold leading-relaxed text-slate-700 sm:text-base">
              Nossa curadoria automatizada consulta acervos de domínio público para entregar
              literatura com alta aderência ao seu foco pedagógico e científico.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto">
            <div className={assistantCardClassName}>
              <div className={assistantIconClassName}>
                <img
                  src="/Lobo.svg"
                  alt="Logo do GUIA"
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-600">
                  Assistente de curadoria
                </p>
                <p className="text-sm font-black uppercase tracking-wide text-slate-900">
                  GUIÁ
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-black uppercase tracking-wide text-slate-900 sm:grid-cols-1 sm:text-right">
              <span className={statBadgeClassName}>
                Livros: {books.length} | Fontes: {activeSourcesCount}
              </span>
              {formattedGeneratedAt ? (
                <span className={statBadgeClassName}>
                  Atualizado: {formattedGeneratedAt}
                </span>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => void loadBooks({ forceRefresh: true })}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-800 shadow-[3px_3px_0_0_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Reorganizar Estante
            </button>
          </div>
        </div>
      </header>

      {/* Painel de Busca */}
      <form onSubmit={handleSubmit} className={`${panelClassName} mb-8`}>
        <div className="mb-3 flex items-center gap-2 text-slate-800">
          <BookType className="h-4 w-4" />
          <h3 className="text-sm font-bold uppercase tracking-wider">Filtros da Estante</h3>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_10rem_auto]">
          <label className="space-y-1.5">
            <span className="block text-xs font-semibold text-slate-700">Intenção de Estudo</span>
            <input
              type="text"
              value={intent}
              onChange={(event) => setIntent(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              placeholder="Ex.: projetos de ciencia para ensino medio"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-xs font-semibold text-slate-700">Tema Específico</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                placeholder="Ex.: robótica espacial"
              />
            </div>
          </label>

          <label className="space-y-1.5">
            <span className="block text-xs font-semibold text-slate-700">Obras exibidas</span>
            <select
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value) || 18)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            >
              <option value={12}>12 obras</option>
              <option value={18}>18 obras</option>
              <option value={24}>24 obras</option>
              <option value={30}>30 obras</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex h-[42px] items-center justify-center gap-2 self-end rounded-xl border border-slate-900 bg-slate-900 px-5 text-sm font-bold text-white shadow-md transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Consultar
          </button>
        </div>
      </form>

      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("catalog")}
          className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.1em] transition ${activeTab === "catalog"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
        >
          Estante Geral ({books.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("saved")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.1em] transition ${activeTab === "saved"
              ? "bg-emerald-700 text-white shadow-sm"
              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
        >
          Salvos
          <span className="flex all items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 ">
            <svg fill="none" height="24" viewBox="0 0 24 24" width="24" className="svg-icon">
              <g
                ClipRule="evenodd"
                FillRule="evenodd"
                stroke="#047857"
                stroke-linecap="round"
                stroke-width="2"
              >
                <path
                  d="m3 7h17c.5523 0 1 .44772 1 1v11c0 .5523-.4477 1-1 1h-16c-.55228 0-1-.4477-1-1z"
                ></path>
                <path
                  d="m3 4.5c0-.27614.22386-.5.5-.5h6.29289c.13261 0 .25981.05268.35351.14645l2.8536 2.85355h-10z"
                ></path>
              </g>
            </svg> ({savedBooksCount})
          </span>
        </button>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
          {errorMessage}
        </div>
      )}

      {savedBooksError && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          {savedBooksError}
        </div>
      )}

      {!errorMessage && degradedWarning && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          {degradedWarning}
        </div>
      )}

      {isLoading && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-16 text-center text-sm text-slate-600 shadow-inner">
          <LoaderCircle className="mx-auto mb-3 h-8 w-8 animate-spin text-slate-400" />
          <p className="font-serif text-lg">O bibliotecário virtual está organizando as prateleiras...</p>
        </div>
      )}

      {!isLoading && visibleBooks.length === 0 && !errorMessage && (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-16 text-center text-sm text-slate-600">
          <Library className="mx-auto mb-3 h-8 w-8 text-slate-400 opacity-50" />
          <p className="font-serif text-lg">
            {activeTab === "saved"
              ? "Sua pastinha ainda esta vazia."
              : "A estante esta vazia para este filtro."}
          </p>
          <p className="mt-1">
            {activeTab === "saved"
              ? "Use o botao Salvar nos livros para montar sua selecao favorita."
              : "Tente ajustar a intencao de estudo ou o tema especifico."}
          </p>
        </div>
      )}
      {/* ESTANTE VIRTUAL */}
      {!isLoading && visibleBooks.length > 0 && (
        <div className="relative rounded-2xl border-x-[12px] border-t-[12px] border-[#8a684b] bg-[#e6d5c3] p-6 shadow-inner pb-12">

          {/* Magazine em Destaque no topo da estante */}
          <div className="mb-12 flex justify-center">
            <div className="relative flex w-full max-w-2xl flex-col gap-4 rounded-lg bg-white/90 p-4 shadow-md backdrop-blur-sm sm:flex-row sm:items-center">
              <a
                href={sectiMagazine.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="group block w-full shrink-0 sm:w-auto"
                aria-label="Abrir revista Bahia Faz Ciência"
              >
                {sectiMagazine?.previewImageUrl ? (
                  <img
                    src={sectiMagazine.previewImageUrl}
                    alt={`Prévia da capa - ${sectiMagazine.title}`}
                    className="h-28 w-full rounded-md border border-slate-200 object-cover shadow-sm transition group-hover:opacity-90 sm:w-44"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-28 w-full items-center justify-center rounded-md bg-slate-900 text-white shadow-inner sm:w-44">
                    <Bookmark className="h-6 w-6" />
                  </div>
                )}
              </a>

              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Destaque Oficial</p>
                <h4 className="font-serif text-sm font-bold text-slate-900">{sectiMagazine.title}</h4>
                {sectiMagazine?.editionLabel && (
                  <p className="mt-1 text-[11px] font-semibold text-emerald-700">{sectiMagazine.editionLabel}</p>
                )}
                <p className="mt-1 line-clamp-2 text-xs text-slate-600">{sectiMagazine.description}</p>

                <div className="mt-2 flex flex-wrap gap-3">
                  <a href={sectiMagazine.pdfUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-600 hover:underline">Baixar PDF</a>
                  <a href={sectiMagazine.portalUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-slate-600 hover:underline">Portal</a>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-12">
            {visibleBooks.map((book) => {
              const bookId = String(book?.id || "").trim();
              const bookKey = resolveBookKey(book);
              const isSaved = savedBookKeySet.has(bookKey);
              const isPendingSave = pendingSaveBookKey === bookKey;
              const coverPreviewUrl = getCoverPreviewUrl(book);
              const hasCoverImage = Boolean(coverPreviewUrl) && !failedCoverById[bookId];

              return (
                <div
                  key={String(book?.id || Math.random())}
                  className="group relative flex cursor-pointer flex-col items-center"
                  onClick={() => setSelectedBook(book)}
                >
                  {/* Visual da Prateleira (Abaixo do Livro) */}
                  <div className="absolute -bottom-2 -left-3 -right-3 z-0 h-3 rounded-sm bg-[#5c422c] shadow-[0_4px_6px_rgba(0,0,0,0.3)]"></div>
                  <div className="absolute -bottom-4 -left-3 -right-3 z-0 h-2 rounded-b-sm bg-[#3a291b]"></div>

                  {/* Capa do Livro */}
                  <div className="relative z-10 h-44 w-28 transition-all duration-300 group-hover:-translate-y-4 group-hover:scale-105">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleToggleSavedBook(book);
                      }}
                      disabled={isPendingSave}
                      className={`absolute right-1 top-1 z-40 inline-flex h-7 w-7 items-center justify-center rounded-full border text-white shadow-md transition ${isSaved
                          ? "border-emerald-300 bg-emerald-600 hover:bg-emerald-700"
                          : "border-slate-200 bg-slate-900/80 hover:bg-slate-900"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      aria-label={isSaved ? "Remover da pastinha" : "Salvar na pastinha"}
                    >
                      {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                    </button>

                    {/* Sombra realista do livro */}
                    <div className="absolute inset-0 z-20 shadow-[inset_4px_0_10px_rgba(255,255,255,0.2),inset_-4px_0_15px_rgba(0,0,0,0.4)] pointer-events-none rounded-r-md rounded-l-sm"></div>

                    {hasCoverImage ? (
                      <img
                        src={coverPreviewUrl}
                        alt={book.title}
                        className="h-full w-full rounded-r-md rounded-l-sm object-cover shadow-lg"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(event) => handleCoverLoadError(event, book)}
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-r-md rounded-l-sm border border-[#2c3e50] bg-[#34495e] p-2 text-center shadow-lg">
                        <BookOpen className="h-6 w-6 text-white/50" />
                        <span className="line-clamp-4 text-[10px] font-bold text-white/90">
                          {book?.title || "Sem Título"}
                        </span>
                      </div>
                    )}

                    {/* Indicador visual de hover (clique para abrir) */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-[10px] font-bold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-30">
                      Clique para detalhes
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES DO LIVRO */}
      {modalNode && typeof document !== "undefined" ? createPortal(modalNode, document.body) : null}
    </section>
  );
}
