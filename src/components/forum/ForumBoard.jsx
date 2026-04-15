import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import Select from "react-select";
import {
  Coffee,
  MessageCircle,
  Plus,
  Users,
  Lock,
  Pin,
  Trash2,
  UserPlus,
  CheckCircle,
  XCircle,
  LogIn,
  ArrowLeft,
  Search,
  Globe,
  Building2,
  LoaderCircle,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import Toast from "./Toast";
import {
  subscribeToTopics,
  createTopic,
  togglePinTopic,
  toggleLockTopic,
  deleteTopic,
  subscribeToJoinRequests,
  requestJoinForum,
  respondJoinRequest,
  subscribeToExternalMembers,
  removeExternalMember,
  getForumsWhereAccepted,
  fetchClubsPage,
  subscribeToModerationAlerts,
  markModerationAlertAsRead,
  deleteModerationAlert,
} from "../../services/forumService";
import { getUserClubIds, getUserSchoolIds } from "../../services/projectService";
import { FORUM_EXPLORE_PAGE_SIZE } from "../../constants/appConstants";
import ForumThread from "./ForumThread";
import { auth } from "../../../firebase";

// ─── Constantes e Helpers ─────────────────────────────────────────
const TABS = [
  { id: "meu", label: "Meu Fórum", icon: Coffee },
  { id: "aceitos", label: "Fóruns Aceitos", icon: Users },
  { id: "explorar", label: "Explorar", icon: Globe },
];

const MODERATION_ALERTS_PAGE_SIZE = 6;

const normalizeId = (value) => String(value || "").trim();

const normalizeUniqueIds = (values) =>
  [...new Set((values || []).map((value) => normalizeId(value)).filter(Boolean))];

const getInitials = (value) =>
  String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "CL";

const getClubLogoUrl = (club) => String(club?.logo_url || club?.logo || "").trim();

const getClubBannerUrl = (club) => String(club?.banner_url || club?.banner || "").trim();

const getClubMemberCount = (club) => {
  const inferredMembers = normalizeUniqueIds([
    ...(club?.membros_ids || []),
    ...(club?.clubistas_ids || []),
    ...(club?.orientador_ids || []),
    ...(club?.coorientador_ids || []),
    club?.mentor_id,
  ]).length;

  if (inferredMembers > 0) {
    return inferredMembers;
  }

  const explicitCount = Number(
    club?.membros_count || club?.membrosCount || club?.memberCount || 0,
  );

  return Number.isFinite(explicitCount) && explicitCount > 0 ? explicitCount : 0;
};

const FORUM_EXPLORE_BANNER_FALLBACKS = [
  "/images/BG_1.png",
  "/images/BG_2.png",
  "/images/BG_3.png",
];

const formatSafeDate = (dateObj) => {
  if (!dateObj) return "";
  const date =
    typeof dateObj.toDate === "function" ? dateObj.toDate() : new Date(dateObj);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const hashString = (value) => {
  const input = String(value || "");
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const hslToRgbString = (h, s, l) => {
  const hue = Number(h) % 360;
  const saturation = Math.max(0, Math.min(100, Number(s))) / 100;
  const lightness = Math.max(0, Math.min(100, Number(l))) / 100;

  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const section = hue / 60;
  const x = chroma * (1 - Math.abs((section % 2) - 1));

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (section >= 0 && section < 1) {
    rPrime = chroma;
    gPrime = x;
  } else if (section >= 1 && section < 2) {
    rPrime = x;
    gPrime = chroma;
  } else if (section >= 2 && section < 3) {
    gPrime = chroma;
    bPrime = x;
  } else if (section >= 3 && section < 4) {
    gPrime = x;
    bPrime = chroma;
  } else if (section >= 4 && section < 5) {
    rPrime = x;
    bPrime = chroma;
  } else {
    rPrime = chroma;
    bPrime = x;
  }

  const m = lightness - chroma / 2;
  const toChannel = (value) => Math.round((value + m) * 255);

  return `rgb(${toChannel(rPrime)}, ${toChannel(gPrime)}, ${toChannel(bPrime)})`;
};

const normalizeColorValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const hexMatch = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    if (hexMatch[1].length === 3) {
      const [r, g, b] = hexMatch[1].split("");
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    return raw;
  }

  const rgbMatch = raw.match(
    /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i,
  );
  if (!rgbMatch) return "";

  const rgbValues = rgbMatch.slice(1).map((channel) => Number(channel));
  if (rgbValues.some((channel) => Number.isNaN(channel) || channel > 255)) {
    return "";
  }

  return `rgb(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]})`;
};

const parseColorToRgbTuple = (color) => {
  const normalized = normalizeColorValue(color);
  if (!normalized) return null;

  if (normalized.startsWith("#")) {
    return [
      Number.parseInt(normalized.slice(1, 3), 16),
      Number.parseInt(normalized.slice(3, 5), 16),
      Number.parseInt(normalized.slice(5, 7), 16),
    ];
  }

  const rgbMatch = normalized.match(
    /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i,
  );
  if (!rgbMatch) return null;

  return rgbMatch.slice(1).map((channel) => Number(channel));
};

const withAlpha = (color, alpha = 1) => {
  const tuple = parseColorToRgbTuple(color) || [90, 200, 200];
  const normalizedAlpha = Math.max(0, Math.min(1, Number(alpha)));
  return `rgba(${tuple[0]}, ${tuple[1]}, ${tuple[2]}, ${normalizedAlpha})`;
};

const resolveClubThemeColor = (club, keys) => {
  for (const key of keys) {
    const normalizedColor = normalizeColorValue(club?.[key]);
    if (normalizedColor) return normalizedColor;
  }
  return "";
};

const buildSeedColor = (seed, hueOffset = 0, saturation = 62, lightness = 44) => {
  const hue = (hashString(seed) + Number(hueOffset || 0)) % 360;
  return hslToRgbString(hue, saturation, lightness);
};

const buildForumTheme = (club) => {
  const seed = normalizeId(club?.id || club?.nome || club?.escola_id || "forum");
  const primaryColor =
    resolveClubThemeColor(club, [
      "cor_primaria",
      "corPrincipal",
      "cor_tema",
      "theme_color",
      "primary_color",
      "accent_color",
      "cor",
    ]) || buildSeedColor(seed, 0, 58, 44);

  let secondaryColor =
    resolveClubThemeColor(club, [
      "cor_secundaria",
      "corSecundaria",
      "theme_secondary_color",
      "secondary_color",
      "accent_secondary_color",
    ]) || buildSeedColor(`${seed}:secondary`, 38, 64, 40);

  if (secondaryColor === primaryColor) {
    secondaryColor = buildSeedColor(`${seed}:alt`, 76, 62, 38);
  }

  return {
    primary: primaryColor,
    secondary: secondaryColor,
    bannerUrl: getClubBannerUrl(club),
  };
};

const buildForumClubSelectStyles = (primaryColor) => ({
  control: (base, state) => ({
    ...base,
    minHeight: 42,
    borderRadius: 12,
    borderColor: state.isFocused ? primaryColor : "#e2e8f0",
    boxShadow: state.isFocused
      ? `0 0 0 4px ${withAlpha(primaryColor, 0.16)}`
      : "none",
    backgroundColor: "#ffffff",
    "&:hover": {
      borderColor: primaryColor,
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "2px 10px",
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    boxShadow: "0 14px 36px rgba(15, 23, 42, 0.16)",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? withAlpha(primaryColor, 0.16)
      : state.isFocused
        ? "#f8fafc"
        : "#ffffff",
    color: "#0f172a",
    padding: "10px 12px",
    cursor: "pointer",
  }),
});

// ─── Sub-Componentes Memorizados ──────────────────────────────────
const EmptyBox = memo(({ message, icon: Icon = Coffee }) => (
  <div className="premium-card p-10 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 bg-slate-50/50">
    <div
      className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
      style={{ backgroundColor: "var(--forum-primary-soft, rgba(90, 200, 200, 0.2))" }}
    >
      <Icon
        className="w-8 h-8"
        style={{ color: "var(--forum-primary, #5AC8C8)" }}
      />
    </div>
    <p className="text-slate-500 font-medium max-w-sm">{message}</p>
  </div>
));
EmptyBox.displayName = "EmptyBox";

const TopicItem = memo(
  ({ topic, onSelect, isModerator, onTogglePin, onToggleLock, onDelete }) => {
    const formattedDate = formatSafeDate(topic.createdAt);

    return (
      <div
        className="premium-card p-4 hover:shadow-md hover:border-[var(--forum-primary-soft-strong)] transition-all cursor-pointer group bg-white relative overflow-hidden"
        onClick={() => onSelect(topic.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSelect(topic.id);
        }}
      >
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              {topic.pinned && (
                <Pin
                  className="w-4 h-4 shrink-0"
                  style={{
                    color: "var(--forum-primary, #5AC8C8)",
                    fill: "var(--forum-primary, #5AC8C8)",
                  }}
                  title="Tópico Fixado"
                />
              )}
              {topic.locked && (
                <Lock
                  className="w-4 h-4 text-red-400 shrink-0"
                  title="Tópico Bloqueado"
                />
              )}
              <h3 className="font-bold text-slate-800 truncate group-hover:text-[var(--forum-primary)] transition-colors">
                {topic.titulo}
              </h3>
            </div>
            {topic.descricao && (
              <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-2">
                {topic.descricao}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs font-medium text-slate-400">
              <span className="text-slate-600">{topic.autor_nome}</span>
              <span>•</span>
              <span>{formattedDate}</span>
              <span>•</span>
              <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">
                <MessageCircle className="w-3.5 h-3.5" />
                {topic.mensagens_count || 0}
              </span>
            </div>
          </div>

          {/* Ações de moderador */}
          {isModerator && (
            <div
              className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => onTogglePin(topic.id, topic.pinned)}
                className={`p-2 rounded-lg transition-colors focus:ring-2 focus:ring-[var(--forum-primary-ring)] outline-none ${topic.pinned ? "bg-[var(--forum-primary-soft)] text-[var(--forum-primary)]" : "hover:bg-slate-100 text-slate-400 hover:text-[var(--forum-primary)]"}`}
                aria-label={topic.pinned ? "Desafixar tópico" : "Fixar tópico"}
                title={topic.pinned ? "Desafixar" : "Fixar"}
              >
                <Pin className="w-4 h-4" />
              </button>
              <button
                onClick={() => onToggleLock(topic.id, topic.locked)}
                className={`p-2 rounded-lg transition-colors focus:ring-2 focus:ring-red-200 outline-none ${topic.locked ? "bg-red-100 text-red-700" : "hover:bg-slate-100 text-slate-400 hover:text-red-600"}`}
                aria-label={
                  topic.locked ? "Desbloquear tópico" : "Bloquear tópico"
                }
                title={topic.locked ? "Desbloquear" : "Bloquear"}
              >
                <Lock className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(topic.id)}
                className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors focus:ring-2 focus:ring-red-200 outline-none"
                aria-label="Excluir tópico"
                title="Excluir tópico"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  },
);
TopicItem.displayName = "TopicItem";

const ClubExploreCard = memo(({ club, index, onRequestJoin, requesting }) => {
  const logoUrl = getClubLogoUrl(club);
  const bannerUrl = getClubBannerUrl(club);
  const displayBanner =
    bannerUrl ||
    FORUM_EXPLORE_BANNER_FALLBACKS[
      Number(index || 0) % FORUM_EXPLORE_BANNER_FALLBACKS.length
    ];
  const memberCount = getClubMemberCount(club);
  const schoolLabel = String(club?.escola_nome || club?.escola_id || "").trim();

  return (
    <div className="premium-card p-0 overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow bg-white border border-slate-100">
      <div className="relative h-32 overflow-visible">
        <img
          src={displayBanner}
          alt={`Banner do clube ${club?.nome || ""}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/20 to-transparent" />
        {!bannerUrl && (
          <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider text-white bg-black/45 px-2 py-1 rounded-full">
            Banner ilustrativo
          </span>
        )}

        <div className="absolute -bottom-6 left-4 w-12 h-12 rounded-2xl border-2 border-white bg-white overflow-hidden shadow-lg flex items-center justify-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`Logo do clube ${club?.nome || ""}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs font-black text-slate-700">
              {getInitials(club?.nome)}
            </span>
          )}
        </div>
      </div>

      <div className="p-5 pt-8 flex-1 flex flex-col">
        <h3 className="font-bold text-slate-800 text-lg mb-1 line-clamp-2">{club?.nome}</h3>

        {schoolLabel && (
          <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            {schoolLabel}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3E0] text-[#FF5722] border border-[#FF5722]/20 px-2.5 py-1 text-xs font-semibold">
            <Users className="w-3.5 h-3.5" />
            {memberCount} membro{memberCount === 1 ? "" : "s"}
          </span>
        </div>

        <button
          onClick={() => onRequestJoin(club.id)}
          disabled={requesting}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-xl transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--forum-primary-soft)] text-[var(--forum-primary)] hover:brightness-95"
        >
          {requesting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          {requesting ? "Solicitando..." : "Solicitar Entrada"}
        </button>
      </div>
    </div>
  );
});
ClubExploreCard.displayName = "ClubExploreCard";

const AcceptedClubCard = memo(({ club, index, onSelect }) => {
  const logoUrl = getClubLogoUrl(club);
  const bannerUrl = getClubBannerUrl(club);
  const displayBanner =
    bannerUrl ||
    FORUM_EXPLORE_BANNER_FALLBACKS[
      Number(index || 0) % FORUM_EXPLORE_BANNER_FALLBACKS.length
    ];
  const memberCount = getClubMemberCount(club);
  const schoolLabel = String(club?.escola_nome || club?.escola_id || "").trim();

  return (
    <button
      type="button"
      onClick={() => onSelect(club.id)}
      className="premium-card p-0 overflow-hidden group text-left bg-white border border-slate-100 hover:shadow-lg transition-all"
    >
      <div className="relative h-36 overflow-visible">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={displayBanner}
            alt={`Banner do clube ${club?.nome || ""}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-900/20 to-transparent" />
          {!bannerUrl && (
            <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider text-white bg-black/45 px-2 py-1 rounded-full">
              Banner ilustrativo
            </span>
          )}
        </div>

        <div className="absolute -bottom-8 left-4 z-10 w-16 h-16 rounded-3xl border-2 border-white bg-white overflow-hidden shadow-lg flex items-center justify-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`Logo do clube ${club?.nome || ""}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs font-black text-slate-700">
              {getInitials(club?.nome)}
            </span>
          )}
        </div>
      </div>

      <div className="p-5 pt-10 flex-1 flex flex-col">
        <h3 className="font-bold text-slate-800 text-lg mb-1 line-clamp-2">
          {club?.nome}
        </h3>

        {schoolLabel && (
          <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            {schoolLabel}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3E0] text-[#FF5722] border border-[#FF5722]/20 px-3 py-1 text-xs font-semibold">
            <Users className="w-3.5 h-3.5" />
            {memberCount} membro{memberCount === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-3 py-1">
            Acessar fórum
          </span>
        </div>
      </div>
    </button>
  );
});
AcceptedClubCard.displayName = "AcceptedClubCard";

// ─── Componente Principal ─────────────────────────────────────────
export default function ForumBoard({
  loggedUser,
  myClubId,
  myClubIds = [],
  myClub,
  mentorManagedClubs = [],
  clubs,
  users,
}) {
  const [activeTab, setActiveTab] = useState("meu");
  const [topics, setTopics] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [externalMembers, setExternalMembers] = useState([]);
  const [acceptedForums, setAcceptedForums] = useState([]);
  const [moderationAlerts, setModerationAlerts] = useState([]);
  const [moderationAlertsPage, setModerationAlertsPage] = useState(0);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const [viewingForumClubId, setViewingForumClubId] = useState(null);
  const [selectedMyForumClubId, setSelectedMyForumClubId] = useState(() => normalizeId(myClubId));
  const [selectedTopicId, setSelectedTopicId] = useState(null);

  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicDesc, setNewTopicDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searchForumInput, setSearchForumInput] = useState("");
  const [searchForum, setSearchForum] = useState("");
  const [toast, setToast] = useState({ message: "", type: "error" });
  const searchForumLower = useMemo(() => String(searchForum || "").trim().toLowerCase(), [searchForum]);
  const [confirmModal, setConfirmModal] = useState({ open: false, title: "", description: "", onConfirm: null });

  const handleForumSearch = useCallback(() => {
    const term = searchForumInput.trim();
    setSearchForum(term);
  }, [searchForumInput]);

  const handleClearForumSearch = useCallback(() => {
    setSearchForumInput("");
    setSearchForum("");
  }, []);
  const [requestingClubs, setRequestingClubs] = useState(new Set()); // Para loading individual dos botões

  // ─── Paginação Explorar ──────────────────────────────────
  const [exploreClubs, setExploreClubs] = useState([]);
  const [exploreCursor, setExploreCursor] = useState(null);
  const exploreCursorRef = useRef(null);
  const [exploreHasMore, setExploreHasMore] = useState(true);
  const exploreHasMoreRef = useRef(true);
  const [exploreFetching, setExploreFetching] = useState(false);
  const exploreFetchingRef = useRef(false);
  const [exploreTotalCount, setExploreTotalCount] = useState(0);
  const [exploreLoadMoreNode, setExploreLoadMoreNode] = useState(null);

  const exploreLoadMoreRef = useCallback(
    (node) => setExploreLoadMoreNode(node),
    [],
  );

  const isMentor = useMemo(() => {
    const perfil = String(loggedUser?.perfil || "")
      .trim()
      .toLowerCase();
    return perfil === "orientador" || perfil === "coorientador";
  }, [loggedUser]);

  const unreadModerationAlerts = useMemo(
    () =>
      moderationAlerts.filter(
        (alert) => String(alert?.status || "unread").toLowerCase() === "unread",
      ),
    [moderationAlerts],
  );

  const alertRecipientId = useMemo(
    () =>
      String(
        auth?.currentUser?.uid || loggedUser?.uid || loggedUser?.id || "",
      ).trim(),
    [loggedUser?.uid, loggedUser?.id],
  );

  const forumUserId = useMemo(
    () => normalizeId(loggedUser?.id || auth?.currentUser?.uid || loggedUser?.uid),
    [loggedUser?.id, loggedUser?.uid],
  );

  const profileClubIds = useMemo(
    () => normalizeUniqueIds([normalizeId(myClubId), ...getUserClubIds(loggedUser)]),
    [myClubId, loggedUser],
  );

  const normalizedMyClubIds = useMemo(
    () => normalizeUniqueIds(myClubIds),
    [myClubIds],
  );

  const allUserClubIds = useMemo(
    () => normalizeUniqueIds([...normalizedMyClubIds, ...profileClubIds]),
    [normalizedMyClubIds, profileClubIds],
  );

  const allUserClubIdSet = useMemo(
    () => new Set(allUserClubIds),
    [allUserClubIds],
  );

  const userSchoolIds = useMemo(
    () => normalizeUniqueIds(getUserSchoolIds(loggedUser)),
    [loggedUser],
  );

  const hasAnyUserClub = allUserClubIds.length > 0;
  const restrictExploreToOwnSchool = !hasAnyUserClub && userSchoolIds.length > 0;

  const acceptedClubIds = useMemo(
    () => normalizeUniqueIds(acceptedForums.map((af) => af?.clube_id)),
    [acceptedForums],
  );

  const acceptedClubIdSet = useMemo(
    () => new Set(acceptedClubIds),
    [acceptedClubIds],
  );

  const mentorManagedClubIds = useMemo(
    () => normalizeUniqueIds((mentorManagedClubs || []).map((club) => club?.id)),
    [mentorManagedClubs],
  );

  const mentorManagedClubIdSet = useMemo(
    () => new Set(mentorManagedClubIds),
    [mentorManagedClubIds],
  );

  const myForumClubIds = useMemo(() => {
    if (isMentor) {
      return normalizeUniqueIds([...mentorManagedClubIds, ...allUserClubIds]);
    }
    return normalizeUniqueIds([...allUserClubIds, ...acceptedClubIds]);
  }, [isMentor, mentorManagedClubIds, allUserClubIds, acceptedClubIds]);

  const myForumClubIdSet = useMemo(
    () => new Set(myForumClubIds),
    [myForumClubIds],
  );

  const acceptedOrMemberClubIds = useMemo(() => {
    return normalizeUniqueIds([...acceptedClubIds, ...allUserClubIds]);
  }, [acceptedClubIds, allUserClubIds]);

  const acceptedOrMemberClubIdSet = useMemo(
    () => new Set(acceptedOrMemberClubIds),
    [acceptedOrMemberClubIds],
  );

  const canExploreClub = useCallback(
    (club) => {
      const clubId = normalizeId(club?.id);
      if (!clubId) return false;
      if (allUserClubIdSet.has(clubId)) return false;
      if (acceptedClubIdSet.has(clubId)) return false;

      if (!restrictExploreToOwnSchool) {
        return true;
      }

      const clubSchoolId = normalizeId(club?.escola_id);
      return clubSchoolId ? userSchoolIds.includes(clubSchoolId) : false;
    },
    [allUserClubIdSet, acceptedClubIdSet, restrictExploreToOwnSchool, userSchoolIds],
  );

  const matchesExploreSearch = useCallback(
    (club) => {
      if (!searchForumLower) return true;
      const nome = String(club?.nome || "").toLowerCase();
      const escola = String(club?.escola_nome || club?.escola_id || "").toLowerCase();
      return nome.includes(searchForumLower) || escola.includes(searchForumLower);
    },
    [searchForumLower],
  );

  const currentForumClubId =
    activeTab === "meu" ? selectedMyForumClubId : viewingForumClubId;

  const moderationAlertsPageCount = Math.max(
    1,
    Math.ceil(moderationAlerts.length / MODERATION_ALERTS_PAGE_SIZE),
  );

  const pagedModerationAlerts = moderationAlerts.slice(
    moderationAlertsPage * MODERATION_ALERTS_PAGE_SIZE,
    (moderationAlertsPage + 1) * MODERATION_ALERTS_PAGE_SIZE,
  );

  useEffect(() => {
    if (moderationAlertsPage > 0 && moderationAlertsPage >= moderationAlertsPageCount) {
      setModerationAlertsPage(moderationAlertsPageCount - 1);
    }
  }, [moderationAlertsPage, moderationAlertsPageCount]);

  useEffect(() => {
    const normalizedSelectedClubId = normalizeId(selectedMyForumClubId);
    if (normalizedSelectedClubId && myForumClubIdSet.has(normalizedSelectedClubId)) {
      return;
    }

    const preferredClubId = normalizeId(myClubId);
    if (preferredClubId && myForumClubIdSet.has(preferredClubId)) {
      setSelectedMyForumClubId(preferredClubId);
      return;
    }

    setSelectedMyForumClubId(myForumClubIds[0] || "");
  }, [selectedMyForumClubId, myForumClubIdSet, myForumClubIds, myClubId]);

  useEffect(() => {
    if (!viewingForumClubId) return;
    if (acceptedOrMemberClubIdSet.has(normalizeId(viewingForumClubId))) return;
    setViewingForumClubId(null);
    setSelectedTopicId(null);
  }, [viewingForumClubId, acceptedOrMemberClubIdSet]);

  // ─── Subscriptions ──────────────────────────────────────
  useEffect(() => {
    if (!currentForumClubId) {
      setTopics([]);
      setSelectedTopicId(null);
      return;
    }
    return subscribeToTopics(currentForumClubId, setTopics);
  }, [currentForumClubId]);

  useEffect(() => {
    if (!selectedMyForumClubId || !isMentor) {
      setJoinRequests([]);
      return;
    }
    return subscribeToJoinRequests(selectedMyForumClubId, setJoinRequests);
  }, [selectedMyForumClubId, isMentor]);

  useEffect(() => {
    if (!selectedMyForumClubId || !isMentor || !alertRecipientId) {
      setModerationAlerts([]);
      return;
    }

    return subscribeToModerationAlerts({
      clubeId: selectedMyForumClubId,
      recipientId: alertRecipientId,
      callback: setModerationAlerts,
      unreadOnly: false,
    });
  }, [selectedMyForumClubId, isMentor, alertRecipientId]);

  useEffect(() => {
    if (!selectedMyForumClubId || !isMentor) {
      setExternalMembers([]);
      return;
    }
    return subscribeToExternalMembers(selectedMyForumClubId, setExternalMembers);
  }, [selectedMyForumClubId, isMentor]);

  useEffect(() => {
    if (!forumUserId) return;
    return getForumsWhereAccepted(forumUserId, setAcceptedForums);
  }, [forumUserId]);

  // ─── Fetch explore page ─────────────────────────────────
  const fetchExplorePage = useCallback(async (reset = false) => {
    if (exploreFetchingRef.current) return;
    if (!reset && !exploreHasMoreRef.current) return;

    try {
      exploreFetchingRef.current = true;
      setExploreFetching(true);

      const cursor = reset ? null : exploreCursorRef.current;
      const { docs, lastDoc, hasMore } = await fetchClubsPage(
        FORUM_EXPLORE_PAGE_SIZE,
        cursor,
      );

      setExploreClubs((prev) => {
        if (reset) return docs;
        const merged = [...prev, ...docs];
        return merged.filter(
          (c, i, arr) => arr.findIndex((x) => x.id === c.id) === i,
        );
      });

      exploreCursorRef.current = lastDoc;
      setExploreCursor(lastDoc);
      exploreHasMoreRef.current = hasMore;
      setExploreHasMore(hasMore);
    } catch (err) {
      console.error("Erro ao carregar clubes paginados:", err);
    } finally {
      exploreFetchingRef.current = false;
      setExploreFetching(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "explorar") return;
    fetchExplorePage(true);

    const filteredCount = (clubs || []).filter(
      (club) => canExploreClub(club) && matchesExploreSearch(club),
    ).length;
    setExploreTotalCount(filteredCount);
  }, [activeTab, fetchExplorePage, clubs, canExploreClub, matchesExploreSearch]);

  useEffect(() => {
    if (!exploreLoadMoreNode || activeTab !== "explorar") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        if (exploreFetchingRef.current || !exploreHasMoreRef.current) return;
        fetchExplorePage(false);
      },
      { rootMargin: "300px 0px", threshold: 0 },
    );

    observer.observe(exploreLoadMoreNode);
    return () => observer.disconnect();
  }, [exploreLoadMoreNode, activeTab, fetchExplorePage]);

  // ─── Derived State ────────────────────────────────────────
  const myForumClubs = useMemo(
    () =>
      (clubs || [])
        .filter((club) => myForumClubIdSet.has(normalizeId(club?.id)))
        .sort((a, b) =>
          String(a?.nome || "").localeCompare(String(b?.nome || ""), "pt-BR"),
        ),
    [clubs, myForumClubIdSet],
  );

  const myForumSelectOptions = useMemo(
    () =>
      myForumClubs.map((club) => ({
        value: normalizeId(club?.id),
        label: String(club?.nome || "Clube"),
        logoUrl: String(club?.logo_url || club?.logo || "").trim(),
      })),
    [myForumClubs],
  );

  const selectedMyForumSelectOption = useMemo(
    () =>
      myForumSelectOptions.find(
        (option) => option.value === normalizeId(selectedMyForumClubId),
      ) || null,
    [myForumSelectOptions, selectedMyForumClubId],
  );

  const acceptedClubs = useMemo(
    () =>
      (clubs || [])
        .filter((club) => acceptedOrMemberClubIdSet.has(normalizeId(club?.id)))
        .sort((a, b) =>
          String(a?.nome || "").localeCompare(String(b?.nome || ""), "pt-BR"),
        ),
    [clubs, acceptedOrMemberClubIdSet],
  );

  const explorableClubs = useMemo(() => {
    if (searchForumLower) {
      return (clubs || []).filter(
        (club) => canExploreClub(club) && matchesExploreSearch(club),
      );
    }

    return exploreClubs.filter(canExploreClub);
  }, [exploreClubs, clubs, canExploreClub, matchesExploreSearch, searchForumLower]);

  const currentForumClub = useMemo(
    () =>
      (clubs || []).find(
        (club) => normalizeId(club?.id) === normalizeId(currentForumClubId),
      ) || myClub,
    [clubs, currentForumClubId, myClub],
  );

  const currentForumTheme = useMemo(
    () => buildForumTheme(currentForumClub),
    [currentForumClub],
  );

  const forumClubSelectStyles = useMemo(
    () => buildForumClubSelectStyles(currentForumTheme.primary),
    [currentForumTheme.primary],
  );

  const forumWrapperStyle = useMemo(() => {
    const hasBanner = Boolean(currentForumTheme.bannerUrl);
    const bannerBackdrop = hasBanner
      ? `linear-gradient(130deg, ${withAlpha(currentForumTheme.primary, 0.72)} 0%, ${withAlpha(currentForumTheme.secondary, 0.58)} 45%, rgba(15, 23, 42, 0.58) 100%), url("${currentForumTheme.bannerUrl}")`
      : `radial-gradient(circle at 8% 12%, ${withAlpha(currentForumTheme.primary, 0.22)} 0%, transparent 42%), radial-gradient(circle at 88% 10%, ${withAlpha(currentForumTheme.secondary, 0.18)} 0%, transparent 38%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)`;

    return {
      "--forum-primary": currentForumTheme.primary,
      "--forum-secondary": currentForumTheme.secondary,
      "--forum-primary-soft": withAlpha(currentForumTheme.primary, 0.14),
      "--forum-primary-soft-strong": withAlpha(currentForumTheme.primary, 0.26),
      "--forum-primary-ring": withAlpha(currentForumTheme.primary, 0.36),
      "--forum-overlay": hasBanner
        ? "rgba(255, 255, 255, 0.64)"
        : "rgba(255, 255, 255, 0.82)",
      backgroundImage: bannerBackdrop,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: hasBanner ? "fixed" : "scroll",
    };
  }, [currentForumTheme]);

  const forumHeroStyle = useMemo(() => {
    if (currentForumTheme.bannerUrl) {
      return {
        backgroundImage: `linear-gradient(112deg, ${withAlpha(currentForumTheme.primary, 0.82)} 0%, ${withAlpha(currentForumTheme.secondary, 0.7)} 48%, rgba(15, 23, 42, 0.56) 100%), url("${currentForumTheme.bannerUrl}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }

    return {
      backgroundImage: `linear-gradient(112deg, ${currentForumTheme.primary} 0%, ${currentForumTheme.secondary} 100%)`,
    };
  }, [currentForumTheme]);

  const selectedTopic = useMemo(
    () => topics.find((t) => t.id === selectedTopicId) || null,
    [topics, selectedTopicId],
  );

  const exploreScopeLabel = restrictExploreToOwnSchool
    ? "da sua unidade escolar"
    : "da plataforma";

  const canParticipate = useMemo(() => {
    if (!loggedUser || !currentForumClubId) return false;
    const normalizedCurrentForumClubId = normalizeId(currentForumClubId);
    if (allUserClubIdSet.has(normalizedCurrentForumClubId)) return true;
    if (mentorManagedClubIdSet.has(normalizedCurrentForumClubId)) return true;
    return acceptedClubIdSet.has(normalizedCurrentForumClubId);
  }, [loggedUser, currentForumClubId, allUserClubIdSet, mentorManagedClubIdSet, acceptedClubIdSet]);

  const isModeratorOfCurrent = useMemo(
    () =>
      isMentor && mentorManagedClubIdSet.has(normalizeId(currentForumClubId)),
    [isMentor, currentForumClubId, mentorManagedClubIdSet],
  );

  // ─── Handlers Otimizados (useCallback) ─────────────────────
  const handleCreateTopic = useCallback(
    async (e) => {
      e.preventDefault();
      if (!newTopicTitle.trim() || !currentForumClubId || submitting) return;
      setSubmitting(true);
      try {
        await createTopic({
          clubeId: currentForumClubId,
          titulo: newTopicTitle.trim(),
          descricao: newTopicDesc.trim(),
          autor: loggedUser,
        });
        setNewTopicTitle("");
        setNewTopicDesc("");
        setShowNewTopic(false);
      } catch (error) {
        setToast({
          message: error?.message || "Erro ao criar o tópico. Tente novamente.",
          type: "error",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [newTopicTitle, newTopicDesc, currentForumClubId, loggedUser, submitting],
  );

  const handleRequestJoin = useCallback(
    async (clubeId) => {
      if (!loggedUser) return;
      setRequestingClubs((prev) => new Set(prev).add(clubeId));
      try {
        await requestJoinForum({ clubeId, solicitante: loggedUser });
        setToast({ message: "Solicitação enviada com sucesso!", type: "success" });
      } catch (error) {
        setToast({ message: "Erro ao enviar solicitação.", type: "error" });
      } finally {
        setRequestingClubs((prev) => {
          const newSet = new Set(prev);
          newSet.delete(clubeId);
          return newSet;
        });
      }
    },
    [loggedUser],
  );

  const handleRespondRequest = useCallback(
    async (requestId, accepted) => {
      if (!loggedUser) return;
      await respondJoinRequest(requestId, accepted, loggedUser.id);
    },
    [loggedUser],
  );

  const handleMarkAlertAsRead = useCallback(
    async (alertId) => {
      if (!alertRecipientId) return;

      try {
        await markModerationAlertAsRead(alertId, alertRecipientId);
        setModerationAlerts((prev) =>
          prev.map((alert) =>
            alert.id === alertId
              ? { ...alert, status: "read", read_by: alertRecipientId }
              : alert,
          ),
        );
      } catch (error) {
        setToast({
          message: error?.message || "Erro ao atualizar alerta de moderação.",
          type: "error",
        });
      }
    },
    [alertRecipientId],
  );

  const handleMarkAllAsRead = useCallback(async () => {
    if (!alertRecipientId || markingAllRead) return;

    const unreadAlerts = moderationAlerts.filter(
      (alert) => String(alert?.status || "unread").toLowerCase() === "unread",
    );
    if (!unreadAlerts.length) return;

    setMarkingAllRead(true);
    try {
      await Promise.all(
        unreadAlerts.map((alert) =>
          markModerationAlertAsRead(alert.id, alertRecipientId),
        ),
      );
      setModerationAlerts((prev) =>
        prev.map((alert) =>
          String(alert?.status || "").toLowerCase() === "unread"
            ? { ...alert, status: "read", read_by: alertRecipientId }
            : alert,
        ),
      );
      setToast({ message: "Todos os alertas foram marcados como lidos.", type: "success" });
    } catch (error) {
      setToast({
        message: error?.message || "Falha ao marcar todos os alertas como lidos.",
        type: "error",
      });
    } finally {
      setMarkingAllRead(false);
    }
  }, [alertRecipientId, markingAllRead, moderationAlerts]);

  const handleDeleteModerationAlert = useCallback(
    (alertId) => {
      if (!alertId) return;

      setConfirmModal({
        open: true,
        title: "Excluir alerta de moderação",
        description: "Tem certeza que deseja excluir este alerta da central de irregularidades?",
        onConfirm: async () => {
          try {
            await deleteModerationAlert(alertId);
            setModerationAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
            setToast({ message: "Alerta excluído.", type: "success" });
          } catch (error) {
            setToast({
              message: error?.message || "Falha ao excluir alerta.",
              type: "error",
            });
          } finally {
            setConfirmModal((prev) => ({ ...prev, open: false }));
          }
        },
      });
    },
    [],
  );

  const handleRemoveExternal = useCallback(
    async (memberId) => {
      if (!selectedMyForumClubId) return;
      setConfirmModal({
        open: true,
        title: "Remover membro externo",
        description: "Tem certeza que deseja remover este membro externo?",
        onConfirm: async () => {
          await removeExternalMember(memberId, selectedMyForumClubId);
          setConfirmModal((prev) => ({ ...prev, open: false }));
        },
      });
    },
    [selectedMyForumClubId],
  );

  // Handlers do TopicItem
  const handleTogglePin = useCallback(
    (id, pinned) => togglePinTopic(id, pinned),
    [],
  );
  const handleToggleLock = useCallback(
    (id, locked) => toggleLockTopic(id, locked),
    [],
  );
  const handleDeleteTopic = useCallback((id) => {
    setConfirmModal({
      open: true,
      title: "Excluir tópico",
      description: "Excluir este tópico e todas as mensagens permanentemente?",
      onConfirm: async () => {
        await deleteTopic(id);
        setConfirmModal((prev) => ({ ...prev, open: false }));
      },
    });
  }, []);

  // ─── Render: Thread View ─────────────────────────────────
  if (selectedTopic) {
    return (
      <ForumThread
        topic={selectedTopic}
        clubeId={currentForumClubId}
        forumTheme={currentForumTheme}
        loggedUser={loggedUser}
        users={users}
        canParticipate={canParticipate}
        isModerator={isModeratorOfCurrent}
        onBack={() => setSelectedTopicId(null)}
      />
    );
  }

  // Modal de confirmação
  const ConfirmModal = () => {
    if (!confirmModal.open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-6 w-11/12 shadow-lg">
          <h2 className="text-lg font-bold mb-2">{confirmModal.title}</h2>
          <p className="text-sm text-slate-600 mb-4">{confirmModal.description}</p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
              className="px-4 py-2 bg-slate-100 rounded-lg font-medium hover:bg-slate-200"
            >
              Cancelar
            </button>
            <button
              onClick={() => confirmModal.onConfirm?.()}
              className="px-4 py-2 text-white rounded-lg font-medium transition-colors bg-[var(--forum-primary)] hover:brightness-95"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Render: Main View ───────────────────────────────────
  return (
    <>
      {/* Fundo animado de cubos 3D (trilha pedagógica) */}
      <style>{`
        .forum-pattern-grid {
          background-image:
            linear-gradient(30deg, rgba(255,255,255,0.2) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.2) 87.5%, rgba(255,255,255,0.2)),
            linear-gradient(150deg, rgba(255,255,255,0.2) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.2) 87.5%, rgba(255,255,255,0.2)),
            linear-gradient(30deg, rgba(255,255,255,0.2) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.2) 87.5%, rgba(255,255,255,0.2)),
            linear-gradient(150deg, rgba(255,255,255,0.2) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.2) 87.5%, rgba(255,255,255,0.2)),
            linear-gradient(60deg, rgba(241,245,249,0.24) 25%, transparent 25.5%, transparent 75%, rgba(241,245,249,0.24) 75%, rgba(241,245,249,0.24)),
            linear-gradient(60deg, rgba(241,245,249,0.24) 25%, transparent 25.5%, transparent 75%, rgba(241,245,249,0.24) 75%, rgba(241,245,249,0.24));
          background-size: 80px 140px;
          background-position: 0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px;
          animation: panCubes 60s linear infinite;
        }
        @keyframes panCubes {
          0% { background-position: 0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px; }
          100% { background-position: 80px 140px, 80px 140px, 120px 210px, 120px 210px, 80px 140px, 120px 210px; }
        }
      `}</style>
      <ConfirmModal />
      
      {/* NOVA DIV WRAPPER: Ocupa a tela inteira (min-h-screen w-full) e recebe o fundo */}
      <div
        className="min-h-screen w-full forum-pattern-grid relative overflow-x-hidden"
        style={forumWrapperStyle}
      >
        {/* Overlay sutil para garantir leitura perfeita (agora com fixed para cobrir o scroll) */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{ backgroundColor: "var(--forum-overlay, rgba(255, 255, 255, 0.82))" }}
        ></div>
        
        {/* DIV DO CONTEÚDO: Limita a largura e centraliza */}
        <div className="max-w-5xl mx-auto space-y-6 pb-12 pt-6 relative z-10 px-4 md:px-0">
          
          {/* Hero & Tabs */}
          <div className="premium-card overflow-hidden bg-white shadow-sm border border-slate-100">
            <div
              className="p-8 text-white relative overflow-hidden"
              style={forumHeroStyle}
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="flex items-center gap-4 mb-2 relative z-10">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <img src="./cafe.svg" alt="" className="w-12 h-12" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    POP Café
                  </h1>
                  <p className="text-white/90 text-sm mt-1 font-medium">
                    Fórum de discussão e colaboração entre clubes
                  </p>
                </div>
              </div>
            </div>

            <nav className="flex border-b border-slate-200" role="tablist">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSelectedTopicId(null);
                      if (tab.id === "meu") setViewingForumClubId(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold transition-all
                                        ${
                                          isActive
                                            ? "text-[var(--forum-primary)] border-b-2 border-[var(--forum-primary)] bg-[var(--forum-primary-soft)]"
                                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                                        }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${isActive ? "text-[var(--forum-primary)]" : "text-slate-400"}`}
                    />
                    {tab.label}
                    {tab.id === "meu" && isMentor && (
                      <>
                        {unreadModerationAlerts.length > 0 && (
                          <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center shadow-sm">
                            {unreadModerationAlerts.length}
                          </span>
                        )}
                        {joinRequests.length > 0 && (
                          <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center shadow-sm">
                            {joinRequests.length}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {isMentor && moderationAlerts.length > 0 && (
            <div className="premium-card p-5 border border-amber-200 bg-gradient-to-r from-amber-50 to-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                  Central de Irregularidades do Fórum
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-full w-fit">
                    {unreadModerationAlerts.length} não lido(s)
                  </div>
                  {unreadModerationAlerts.length > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      disabled={markingAllRead}
                      className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {markingAllRead ? "Marcando..." : "Marcar todos como lido"}
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm text-slate-600 mb-4">
                Orientadores e coorientadores recebem em tempo real os alertas de conteúdo irregular no fórum.
              </p>

              <div className="space-y-3">
                {pagedModerationAlerts.map((alert) => {
                  const isUnread =
                    String(alert?.status || "unread").toLowerCase() === "unread";

                  return (
                    <div
                      key={alert.id}
                      className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 bg-white border border-amber-100 rounded-xl p-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-slate-700">
                            {alert.actor_nome || "Aluno"}
                          </p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isUnread ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                            {isUnread ? "NÃO LIDO" : "LIDO"}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2">
                          {alert.reason ||
                            "Conteúdo sinalizado pela moderação inteligente."}
                        </p>

                        {alert.excerpt && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">
                            Trecho: "{alert.excerpt}"
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col sm:items-end gap-2">
                        {isUnread ? (
                          <button
                            onClick={() => handleMarkAlertAsRead(alert.id)}
                            className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors text-xs font-semibold"
                          >
                            Marcar como lido
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">
                            Já visualizado
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteModerationAlert(alert.id)}
                          className="shrink-0 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-700 transition-colors text-xs font-semibold"
                        >
                          Excluir alerta
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {moderationAlertsPageCount > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                  <div className="text-xs text-slate-500">
                    Página {moderationAlertsPage + 1} de {moderationAlertsPageCount}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setModerationAlertsPage((prev) => Math.max(0, prev - 1))}
                      disabled={moderationAlertsPage === 0}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() =>
                        setModerationAlertsPage((prev) => Math.min(moderationAlertsPageCount - 1, prev + 1))
                      }
                      disabled={moderationAlertsPage === moderationAlertsPageCount - 1}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Tab: Meu Fórum ──────────────────────────── */}
          {activeTab === "meu" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              {!selectedMyForumClubId ? (
                <EmptyBox
                  message={
                    isMentor
                      ? "Voce ainda nao possui foruns administrados para visualizar."
                      : "Voce ainda nao participa de nenhum forum."
                  }
                  icon={Coffee}
                />
              ) : (
                <>
              {isMentor && joinRequests.length > 0 && (
                <div className="premium-card p-5 border-l-4 bg-white" style={{ borderLeftColor: "var(--forum-primary, #5AC8C8)" }}>
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-[var(--forum-primary)]" />
                    Solicitações Pendentes ({joinRequests.length})
                  </h3>
                  <div className="space-y-3">
                    {joinRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-3"
                      >
                        <div>
                          <span className="font-semibold text-slate-700 block">
                            {req.solicitante_nome}
                          </span>
                          <span className="text-xs font-medium text-slate-500">
                            Clube:{" "}
                            {(clubs || []).find(
                              (c) => c.id === req.solicitante_clube_id,
                            )?.nome || "Desconhecido"}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRespondRequest(req.id, true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors text-sm font-medium"
                          >
                            <CheckCircle className="w-4 h-4" /> Aceitar
                          </button>
                          <button
                            onClick={() => handleRespondRequest(req.id, false)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors text-sm font-medium"
                          >
                            <XCircle className="w-4 h-4" /> Recusar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isMentor && externalMembers.length > 0 && (
                <div className="premium-card p-5 bg-white">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    Membros Externos ({externalMembers.length})
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {externalMembers.map((m) => (
                      <span
                        key={m.id}
                        className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-sm font-medium border border-blue-100"
                      >
                        {m.membro_nome}
                        <button
                          onClick={() => handleRemoveExternal(m.membro_id)}
                          className="text-blue-400 hover:text-red-500 transition-colors outline-none focus:ring-2 focus:ring-red-200 rounded-full"
                          title="Remover membro externo"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="text-slate-800 badge">Tópicos</span> — {currentForumClub?.nome || "Meu Clube"}
                </h2>
                {myForumClubs.length > 1 && (
                  <div className="min-w-[260px]">
                    <Select
                      inputId="forum-club-select"
                      classNamePrefix="forum-club-select"
                      styles={forumClubSelectStyles}
                      value={selectedMyForumSelectOption}
                      options={myForumSelectOptions}
                      isSearchable={myForumSelectOptions.length > 6}
                      onChange={(option) => {
                        const nextClubId = normalizeId(option?.value);
                        setSelectedMyForumClubId(nextClubId);
                        setSelectedTopicId(null);
                        setShowNewTopic(false);
                      }}
                      formatOptionLabel={(option) => (
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                            {option.logoUrl ? (
                              <img
                                src={option.logoUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-slate-500">
                                {String(option.label || "C").trim().charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="text-sm font-medium text-slate-800 truncate">
                            {option.label}
                          </span>
                        </div>
                      )}
                    />
                  </div>
                )}
                {canParticipate && (
                  <button
                    onClick={() => setShowNewTopic(true)}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--forum-primary)] text-white rounded-xl hover:brightness-95 active:scale-95 transition-all text-sm font-semibold shadow-sm focus:ring-4 focus:ring-[var(--forum-primary-ring)]"
                  >
                    <Plus className="w-4 h-4" />
                    Criar Tópico
                  </button>
                )}
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-slate-700">
                <img src="/Lobo.svg" alt="Agente Guia" className="w-8 h-8 shrink-0" />
                <div className="leading-snug">
                  <p className="font-semibold text-slate-900">AGENTE GUIÁ está protegendo o chat.</p>
                  <p className="text-slate-600">Suas mensagens são monitoradas para manter o ambiente seguro e respeitoso.</p>
                </div>
              </div>

              {showNewTopic && (
                <form
                  onSubmit={handleCreateTopic}
                  className="premium-card p-5 space-y-4 bg-white border-2 border-[var(--forum-primary-soft-strong)] animate-in fade-in slide-in-from-top-2"
                >
                  <h3 className="font-bold text-slate-700 text-lg">
                    Iniciando uma nova discussão
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Qual o assunto do tópico?"
                      value={newTopicTitle}
                      onChange={(e) => setNewTopicTitle(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-[var(--forum-primary-soft)] focus:border-[var(--forum-primary)] outline-none text-sm transition-all font-medium"
                      maxLength={200}
                      required
                      autoFocus
                    />
                    <textarea
                      placeholder="Adicione mais detalhes (opcional)..."
                      value={newTopicDesc}
                      onChange={(e) => setNewTopicDesc(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-[var(--forum-primary-soft)] focus:border-[var(--forum-primary)] outline-none text-sm resize-none transition-all"
                      rows={3}
                      maxLength={1000}
                    />
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewTopic(false);
                        setNewTopicTitle("");
                        setNewTopicDesc("");
                      }}
                      className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !newTopicTitle.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[var(--forum-primary)] text-white rounded-xl hover:brightness-95 transition-colors disabled:opacity-50"
                    >
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      {submitting ? "Publicando..." : "Publicar Tópico"}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {topics.length === 0 ? (
                  <EmptyBox
                    message="Nenhum tópico criado ainda. Seja o primeiro a iniciar uma conversa!"
                    icon={MessageCircle}
                  />
                ) : (
                  topics.map((topic) => (
                    <TopicItem
                      key={topic.id}
                      topic={topic}
                      onSelect={setSelectedTopicId}
                      isModerator={isModeratorOfCurrent}
                      onTogglePin={handleTogglePin}
                      onToggleLock={handleToggleLock}
                      onDelete={handleDeleteTopic}
                    />
                  ))
                )}
              </div>
                </>
              )}
            </div>
          )}

          {/* ─── Tab: Fóruns Aceitos ─────────────────────── */}
          {activeTab === "aceitos" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              {!viewingForumClubId ? (
                <>
                  <h2 className="text-xl font-bold text-slate-800">
                    Fóruns disponíveis para você
                  </h2>
                  {acceptedClubs.length === 0 ? (
                    <EmptyBox
                      message="Você ainda não tem acesso a fóruns além do seu clube principal."
                      icon={Users}
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {acceptedClubs.map((club, index) => (
                        <AcceptedClubCard
                          key={club.id}
                          club={club}
                          index={index}
                          onSelect={setViewingForumClubId}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4 pb-2 border-b border-slate-200">
                    <button
                      onClick={() => {
                        setViewingForumClubId(null);
                        setSelectedTopicId(null);
                      }}
                      className="p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors outline-none focus:ring-2 focus:ring-[var(--forum-primary-ring)]"
                      aria-label="Voltar para lista de clubes"
                    >
                      <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-slate-800">
                        Tópicos — {currentForumClub?.nome || "Fórum"}
                      </h2>
                    </div>
                    {canParticipate && (
                      <button
                        onClick={() => setShowNewTopic(true)}
                        className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[var(--forum-primary)] text-white rounded-xl hover:brightness-95 transition-colors text-sm font-semibold shadow-sm"
                      >
                        <Plus className="w-4 h-4" /> Novo Tópico
                      </button>
                    )}
                  </div>

                  {/* Mobile Novo Topico Button */}
                  {canParticipate && (
                    <button
                      onClick={() => setShowNewTopic(true)}
                      className="sm:hidden w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-[var(--forum-primary)] text-white rounded-xl hover:brightness-95 transition-colors text-sm font-semibold shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Novo Tópico
                    </button>
                  )}

                  {showNewTopic && (
                    <form
                      onSubmit={handleCreateTopic}
                      className="premium-card p-5 space-y-4 bg-white border-2 border-[var(--forum-primary-soft-strong)]"
                    >
                      {/* (Mesmo form de Novo Tópico acima, renderizado dinamicamente) */}
                      <input
                        type="text"
                        placeholder="Título do tópico"
                        value={newTopicTitle}
                        onChange={(e) => setNewTopicTitle(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-[var(--forum-primary-soft)] focus:border-[var(--forum-primary)] outline-none text-sm font-medium"
                        maxLength={200}
                        required
                      />
                      <textarea
                        placeholder="Descrição (opcional)"
                        value={newTopicDesc}
                        onChange={(e) => setNewTopicDesc(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-[var(--forum-primary-soft)] focus:border-[var(--forum-primary)] outline-none text-sm resize-none"
                        rows={3}
                        maxLength={1000}
                      />
                      <div className="flex gap-3 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewTopic(false);
                            setNewTopicTitle("");
                            setNewTopicDesc("");
                          }}
                          className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={submitting || !newTopicTitle.trim()}
                          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[var(--forum-primary)] text-white rounded-xl hover:brightness-95 disabled:opacity-50"
                        >
                          {submitting && (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          )}
                          {submitting ? "Criando..." : "Criar Tópico"}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-3">
                    {topics.length === 0 ? (
                      <EmptyBox
                        message="Nenhum tópico encontrado neste fórum."
                        icon={MessageCircle}
                      />
                    ) : (
                      topics.map((topic) => (
                        <TopicItem
                          key={topic.id}
                          topic={topic}
                          onSelect={setSelectedTopicId}
                          isModerator={false} // Não é moderador de outros clubes
                        />
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─── Tab: Explorar Fóruns ────────────────────── */}
          {activeTab === "explorar" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    Explorar Outros Clubes
                  </h2>
                  {exploreTotalCount > 0 && (
                    <p className="text-sm text-slate-500 font-medium mt-1">
                      Descubra discussões em outros {exploreTotalCount} clubes da
                      {" "}
                      {exploreScopeLabel}
                    </p>
                  )}
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar clube..."
                    value={searchForumInput}
                    onChange={(e) => setSearchForumInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleForumSearch();
                    }}
                    className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-[var(--forum-primary-soft)] focus:border-[var(--forum-primary)] outline-none text-sm font-medium transition-all"
                  />
                  <button
                    onClick={handleForumSearch}
                    className="absolute right-10 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                    aria-label="Buscar"
                  >
                    Buscar
                  </button>
                  {searchForumInput && (
                    <button
                      onClick={handleClearForumSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                      aria-label="Limpar busca"
                    >
                      <XCircle className="w-4 h-4 text-slate-400" />
                    </button>
                  )}
                </div>
              </div>

              {explorableClubs.length === 0 && !exploreFetching ? (
                <EmptyBox
                  message={
                    searchForumLower
                      ? "Nenhum clube encontrado com este nome."
                      : restrictExploreToOwnSchool
                        ? "Não há novos clubes da sua unidade escolar para explorar no momento."
                        : "Não há novos clubes para explorar no momento."
                  }
                  icon={Globe}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {explorableClubs.map((club, index) => (
                    <ClubExploreCard
                      key={club.id}
                      club={club}
                      index={index}
                      onRequestJoin={handleRequestJoin}
                      requesting={requestingClubs.has(club.id)}
                    />
                  ))}
                </div>
              )}

              {/* Sentinela do scroll infinito */}
              {exploreHasMore && (
                <div
                  ref={exploreLoadMoreRef}
                  className="flex items-center justify-center py-8"
                >
                  {exploreFetching && (
                    <div className="flex items-center gap-2 text-[var(--forum-primary)] font-medium text-sm bg-[var(--forum-primary-soft)] px-4 py-2 rounded-full">
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                      Carregando mais clubes...
                    </div>
                  )}
                </div>
              )}

              {!exploreHasMore && explorableClubs.length > 0 && (
                <p className="text-center text-sm font-medium text-slate-400 py-8">
                  Você chegou ao fim da lista.
                </p>
              )}
            </div>
          )}

          {toast.message && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast({ message: '', type: 'error' })}
            />
          )}
        </div>
      </div>
    </>
  );
}

