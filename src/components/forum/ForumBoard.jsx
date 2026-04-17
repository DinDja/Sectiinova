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
  X
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
  const tuple = parseColorToRgbTuple(color) || [20, 184, 166]; // Fallback to teal-500
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
    minHeight: 48,
    borderRadius: 12,
    border: '4px solid #0f172a',
    borderColor: '#0f172a',
    boxShadow: state.isFocused ? '4px 4px 0px 0px #14b8a6' : '4px 4px 0px 0px #0f172a',
    backgroundColor: "#ffffff",
    fontWeight: '900',
    "&:hover": {
      borderColor: '#0f172a',
      boxShadow: '6px 6px 0px 0px #0f172a',
      transform: 'translate(-2px, -2px)'
    },
    transition: 'all 0.2s ease',
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
    borderRadius: 16,
    border: "4px solid #0f172a",
    overflow: "hidden",
    boxShadow: "8px 8px 0px 0px #0f172a",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? primaryColor
      : state.isFocused
        ? "#f8fafc"
        : "#ffffff",
    color: state.isSelected ? "#ffffff" : "#0f172a",
    fontWeight: '900',
    padding: "12px 16px",
    cursor: "pointer",
    borderBottom: '2px solid #e2e8f0'
  }),
});

// ─── Sub-Componentes Memorizados ───────────────────────────────────────────────
const EmptyBox = memo(({ message, icon: Icon = Coffee }) => (
  <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] rounded-3xl p-10 flex flex-col items-center justify-center text-center">
    <div className="w-20 h-20 bg-yellow-300 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] rounded-2xl flex items-center justify-center mb-6 transform -rotate-3">
      <Icon className="w-10 h-10 text-slate-900 stroke-[3]" />
    </div>
    <p className="text-slate-900 font-black uppercase tracking-wider text-sm max-w-sm leading-relaxed">{message}</p>
  </div>
));
EmptyBox.displayName = "EmptyBox";

const ForumNoClubState = memo(
  ({ title = "Nenhum forum disponivel", message, icon: Icon = Coffee }) => (
    <div className="relative overflow-hidden rounded-[2rem] border-4 border-slate-900 bg-pink-400 p-8 sm:p-12 shadow-[12px_12px_0px_0px_#0f172a] flex flex-col items-center text-center transform - hover:rotate-0 transition-transform">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMwZjE3MmEiLz48L3N2Zz4=')] opacity-10"></div>
      <div className="relative  flex flex-col items-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-white px-4 py-2 shadow-[4px_4px_0px_0px_#0f172a] transform rotate-2">
          <span className="h-3 w-3 rounded-full bg-teal-400 border-2 border-slate-900 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-900">
            Forum Hub
          </span>
        </div>

        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-slate-900 bg-white shadow-[6px_6px_0px_0px_#0f172a] transform -rotate-3">
          <Icon className="h-12 w-12 text-slate-900 stroke-[2.5]" />
        </div>

        <h3 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase text-slate-900 mb-4 bg-white/80 inline-block px-4 py-2 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
          {title}
        </h3>
        <p className="max-w-xl text-base sm:text-lg font-bold text-slate-900 bg-yellow-300 p-4 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform ">
          {message}
        </p>

        <div className="mt-8 inline-flex items-center gap-3 rounded-2xl border-4 border-slate-900 bg-teal-400 px-6 py-3 text-sm font-black uppercase tracking-widest text-slate-900 shadow-[6px_6px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0f172a] transition-all">
          <Building2 className="h-5 w-5 stroke-[3]" />
          Convide seu clube para iniciar discussões
        </div>
      </div>
    </div>
  ),
);
ForumNoClubState.displayName = "ForumNoClubState";

const TopicItem = memo(
  ({ topic, onSelect, isModerator, onTogglePin, onToggleLock, onDelete }) => {
    const formattedDate = formatSafeDate(topic.createdAt);

    return (
      <div
        className="bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] hover:shadow-[12px_12px_0px_0px_#0f172a] hover:-translate-y-1 hover:-translate-x-1 rounded-[1.5rem] p-6 transition-all cursor-pointer group relative overflow-hidden"
        onClick={() => onSelect(topic.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSelect(topic.id);
        }}
      >
        <div className="flex items-start justify-between gap-4 relative ">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              {topic.pinned && (
                <div className="bg-yellow-300 border-2 border-slate-900 p-1.5 rounded-lg shadow-[2px_2px_0px_0px_#0f172a] transform -rotate-6">
                  <Pin className="w-4 h-4 text-slate-900 stroke-[3]" title="Tópico Fixado" />
                </div>
              )}
              {topic.locked && (
                <div className="bg-red-400 border-2 border-slate-900 p-1.5 rounded-lg shadow-[2px_2px_0px_0px_#0f172a]">
                  <Lock className="w-4 h-4 text-slate-900 stroke-[3]" title="Tópico Bloqueado" />
                </div>
              )}
              <h3 className="font-black text-xl md:text-2xl uppercase tracking-tighter text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                {topic.titulo}
              </h3>
            </div>
            {topic.descricao && (
              <p className="text-sm font-bold text-slate-600 line-clamp-2 leading-relaxed mb-4">
                {topic.descricao}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-900">
              <span className="bg-teal-400 border-2 border-slate-900 px-3 py-1 rounded-lg shadow-[2px_2px_0px_0px_#0f172a]">
                {topic.autor_nome}
              </span>
              <span className="bg-slate-100 border-2 border-slate-900 px-3 py-1 rounded-lg shadow-[2px_2px_0px_0px_#0f172a]">
                {formattedDate}
              </span>
              <span className="flex items-center gap-2 bg-pink-400 border-2 border-slate-900 px-3 py-1 rounded-lg shadow-[2px_2px_0px_0px_#0f172a]">
                <MessageCircle className="w-4 h-4 stroke-[3]" />
                {topic.mensagens_count || 0}
              </span>
            </div>
          </div>

          {/* Ações de moderador */}
          {isModerator && (
            <div
              className="flex flex-col sm:flex-row gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity bg-slate-100 border-2 border-slate-900 p-2 rounded-xl shadow-[4px_4px_0px_0px_#0f172a]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => onTogglePin(topic.id, topic.pinned)}
                className={`p-2 border-2 border-slate-900 rounded-lg transition-colors focus:ring-4 focus:ring-slate-900/20 outline-none ${topic.pinned ? "bg-yellow-300 text-slate-900 shadow-[2px_2px_0px_0px_#0f172a]" : "bg-white text-slate-900 hover:bg-yellow-300 shadow-[2px_2px_0px_0px_#0f172a]"}`}
                aria-label={topic.pinned ? "Desafixar tópico" : "Fixar tópico"}
                title={topic.pinned ? "Desafixar" : "Fixar"}
              >
                <Pin className="w-4 h-4 stroke-[3]" />
              </button>
              <button
                onClick={() => onToggleLock(topic.id, topic.locked)}
                className={`p-2 border-2 border-slate-900 rounded-lg transition-colors focus:ring-4 focus:ring-slate-900/20 outline-none ${topic.locked ? "bg-red-400 text-slate-900 shadow-[2px_2px_0px_0px_#0f172a]" : "bg-white text-slate-900 hover:bg-red-400 shadow-[2px_2px_0px_0px_#0f172a]"}`}
                aria-label={topic.locked ? "Desbloquear tópico" : "Bloquear tópico"}
                title={topic.locked ? "Desbloquear" : "Bloquear"}
              >
                <Lock className="w-4 h-4 stroke-[3]" />
              </button>
              <button
                onClick={() => onDelete(topic.id)}
                className="p-2 border-2 border-slate-900 rounded-lg bg-white hover:bg-slate-900 hover:text-white transition-colors focus:ring-4 focus:ring-slate-900/20 outline-none shadow-[2px_2px_0px_0px_#0f172a]"
                aria-label="Excluir tópico"
                title="Excluir tópico"
              >
                <Trash2 className="w-4 h-4 stroke-[3]" />
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
  const forumTheme = buildForumTheme(club);
  const memberCount = getClubMemberCount(club);
  const schoolLabel = String(club?.escola_nome || club?.escola_id || "").trim();

  return (
    <div className="bg-white border-4 border-slate-900 rounded-[2rem] overflow-hidden flex flex-col justify-between shadow-[8px_8px_0px_0px_#0f172a] hover:shadow-[12px_12px_0px_0px_#0f172a] hover:-translate-y-1 hover:-translate-x-1 transition-all group">
      <div className="relative h-36 overflow-visible border-b-4 border-slate-900 bg-slate-100">
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt={`Banner do clube ${club?.nome || ""}`}
            className="w-full h-full object-cover mix-blend-luminosity opacity-90 group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${withAlpha(forumTheme.primary, 0.92)} 0%, ${withAlpha(forumTheme.secondary, 0.92)} 100%)`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-yellow-300/20 mix-blend-multiply" />
        {!bannerUrl && (
          <span className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-widest text-slate-900 bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] px-3 py-1">
            Sem banner
          </span>
        )}

        <div className="absolute -bottom-8 left-6 w-16 h-16 rounded-2xl border-4 border-slate-900 bg-white overflow-hidden shadow-[4px_4px_0px_0px_#0f172a] flex items-center justify-center transform -rotate-3 ">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`Logo do clube ${club?.nome || ""}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl font-black text-slate-900">
              {getInitials(club?.nome)}
            </span>
          )}
        </div>
      </div>

      <div className="p-6 pt-12 flex-1 flex flex-col bg-[#FAFAFA]">
        <h3 className="font-black uppercase tracking-tighter text-slate-900 text-xl md:text-2xl mb-2 line-clamp-2 leading-[1.1]">{club?.nome}</h3>

        {schoolLabel && (
          <p className="text-xs font-bold text-slate-600 flex items-center gap-2 mb-4 bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] p-2 w-fit">
            <Building2 className="w-4 h-4 stroke-[3] text-slate-900" />
            {schoolLabel}
          </p>
        )}

        <div className="mt-auto flex items-center gap-3 mb-6">
          <span className="inline-flex items-center gap-2 bg-teal-400 border-2 border-slate-900 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
            <Users className="w-4 h-4 stroke-[3]" />
            {memberCount} membro{memberCount === 1 ? "" : "s"}
          </span>
        </div>

        <button
          onClick={() => onRequestJoin(club.id)}
          disabled={requesting}
          className="w-full flex items-center justify-center gap-2 px-4 py-4 text-sm font-black uppercase tracking-widest bg-blue-400 border-4 border-slate-900 text-slate-900 rounded-xl shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a] transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          {requesting ? (
            <Loader2 className="w-5 h-5 animate-spin stroke-[3]" />
          ) : (
            <LogIn className="w-5 h-5 stroke-[3]" />
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
  const forumTheme = buildForumTheme(club);
  const memberCount = getClubMemberCount(club);
  const schoolLabel = String(club?.escola_nome || club?.escola_id || "").trim();

  return (
    <button
      type="button"
      onClick={() => onSelect(club.id)}
      className="bg-white border-4 border-slate-900 rounded-[2rem] overflow-hidden flex flex-col justify-between shadow-[8px_8px_0px_0px_#0f172a] hover:shadow-[12px_12px_0px_0px_#0f172a] hover:-translate-y-1 hover:-translate-x-1 transition-all group text-left w-full"
    >
      <div className="relative h-40 overflow-visible border-b-4 border-slate-900 bg-slate-100">
        <div className="absolute inset-0 overflow-hidden">
          {bannerUrl ? (
            <img
              src={bannerUrl}
              alt={`Banner do clube ${club?.nome || ""}`}
              className="w-full h-full object-cover mix-blend-luminosity opacity-90 transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${withAlpha(forumTheme.primary, 0.92)} 0%, ${withAlpha(forumTheme.secondary, 0.92)} 100%)`,
              }}
            />
          )}
          <div className="absolute inset-0 bg-blue-300/30 mix-blend-multiply" />
          {!bannerUrl && (
            <span className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-widest text-slate-900 bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] px-3 py-1">
              Sem banner
            </span>
          )}
        </div>

        <div className="absolute -bottom-8 left-6  w-20 h-20 rounded-2xl border-4 border-slate-900 bg-white overflow-hidden shadow-[4px_4px_0px_0px_#0f172a] flex items-center justify-center transform rotate-3 group-hover:rotate-0 transition-transform">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`Logo do clube ${club?.nome || ""}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl font-black text-slate-900">
              {getInitials(club?.nome)}
            </span>
          )}
        </div>
      </div>

      <div className="p-6 pt-12 flex-1 flex flex-col bg-[#FAFAFA]">
        <h3 className="font-black uppercase tracking-tighter text-slate-900 text-xl md:text-2xl mb-3 line-clamp-2 leading-[1.1]">
          {club?.nome}
        </h3>

        {schoolLabel && (
          <p className="text-xs font-bold text-slate-600 flex items-center gap-2 mb-6 bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] p-2 w-fit">
            <Building2 className="w-4 h-4 stroke-[3] text-slate-900" />
            {schoolLabel}
          </p>
        )}

        <div className="mt-auto flex flex-wrap gap-3 items-center">
          <span className="inline-flex items-center gap-2 bg-yellow-300 border-2 border-slate-900 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
            <Users className="w-4 h-4 stroke-[3]" />
            {memberCount} Membro{memberCount === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white bg-slate-900 border-2 border-slate-900 px-4 py-2 shadow-[2px_2px_0px_0px_#cbd5e1] hover:bg-teal-400 hover:text-slate-900 transition-colors">
            Acessar Fórum
          </span>
        </div>
      </div>
    </button>
  );
});
AcceptedClubCard.displayName = "AcceptedClubCard";


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
  const selectedTopic = useMemo(
    () => topics.find((topic) => topic?.id === selectedTopicId) || null,
    [topics, selectedTopicId],
  );

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

  const isModeratorOfCurrent = useMemo(
    () => {
      if (!currentForumClubId) return false;
      return mentorManagedClubIdSet.has(normalizeId(currentForumClubId));
    },
    [currentForumClubId, mentorManagedClubIdSet],
  );

  const canParticipate = useMemo(() => {
    if (!currentForumClubId) return false;
    const normalized = normalizeId(currentForumClubId);
    return (
      acceptedOrMemberClubIdSet.has(normalized)
      || mentorManagedClubIdSet.has(normalized)
    );
  }, [currentForumClubId, acceptedOrMemberClubIdSet, mentorManagedClubIdSet]);

  const forumClubSelectStyles = useMemo(
    () => buildForumClubSelectStyles(currentForumTheme.primary),
    [currentForumTheme.primary],
  );

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

  const ConfirmModal = () => {
    if (!confirmModal.open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
        <div className="bg-[#FAFAFA] border-4 border-slate-900 shadow-[16px_16px_0px_0px_#0f172a] rounded-3xl p-8 w-full max-w-md animate-in zoom-in-[0.95]">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">{confirmModal.title}</h2>
          <p className="text-sm font-bold text-slate-700 mb-8">{confirmModal.description}</p>
          <div className="flex justify-end gap-4">
            <button
              onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
              className="px-6 py-3 bg-white border-2 border-slate-900 rounded-xl font-black text-slate-900 uppercase text-xs tracking-widest shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:shadow-none active:translate-y-0 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={() => confirmModal.onConfirm?.()}
              className="px-6 py-3 bg-teal-400 border-2 border-slate-900 rounded-xl font-black text-slate-900 uppercase text-xs tracking-widest shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:shadow-none active:translate-y-0 transition-all"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    );
  };


  return (
    <>
      {/* Estilos para a scrollbar Neo-Brutalista */}
      <style>{`
        .neo-scrollbar::-webkit-scrollbar { width: 8px; }
        .neo-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .neo-scrollbar::-webkit-scrollbar-thumb { background: #0f172a; border-radius: 10px; border: 2px solid #fff; }
      `}</style>
      
      <ConfirmModal />
      
      <div className="min-h-screen w-full bg-[#FAFAFA] text-slate-900 font-sans relative overflow-x-hidden">
        
        {/* PADRÃO DE FUNDO - GRID (BLUEPRINT) NEO-BRUTALISTA */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a15_2px,transparent_2px),linear-gradient(to_bottom,#0f172a15_2px,transparent_2px)] bg-[size:40px_40px]"></div>
        </div>
        
        {/* DIV DO CONTEÚDO: Limita a largura e centraliza */}
        <div className="max-w-5xl mx-auto space-y-10 pb-16 pt-10 relative  px-4 md:px-0">
          
          {/* Hero & Tabs */}
          <div className="bg-white border-4 border-slate-900 shadow-[12px_12px_0px_0px_#0f172a] rounded-[2rem] overflow-hidden transition-transform duration-300">
            
            {/* Cabecalho de Cor */}
            <div className="p-8 md:p-10 relative overflow-hidden bg-yellow-300 border-b-4 border-slate-900">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="flex items-center gap-6 relative ">
                <div className="p-4 bg-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] rounded-2xl transform rotate-3">
                         <img
                src="/cafe.svg"
                alt="SECTI"
                className="h-20 object-contain opacity-95 hover:opacity-100 transition-opacity duration-300"
                loading="lazy"
              />
                </div>
                <div>
                  <h1 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">
                    POP Café
                  </h1>
                  <p className="text-slate-900 font-bold bg-white inline-block px-3 py-1 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] text-xs uppercase tracking-widest transform -">
                    Fórum de discussão e colaboração
                  </p>
                </div>
              </div>
            </div>

            <nav className="flex flex-col sm:flex-row border-b-4 border-slate-900 bg-slate-100" role="tablist">
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
                    className={`flex-1 flex items-center justify-center gap-3 px-6 py-5 text-xs sm:text-sm font-black uppercase tracking-widest transition-all border-b-4 sm:border-b-0 sm:border-r-4 border-slate-900 last:border-0
                                        ${
                                          isActive
                                            ? "bg-teal-400 text-slate-900 shadow-[inset_0_-4px_0_0_#0f172a]"
                                            : "bg-white text-slate-500 hover:bg-yellow-300 hover:text-slate-900"
                                        }`}
                  >
                    <Icon
                      className={`w-5 h-5 stroke-[3] ${isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-900"}`}
                    />
                    {tab.label}
                    {tab.id === "meu" && isMentor && (
                      <>
                        {unreadModerationAlerts.length > 0 && (
                          <span className="ml-2 bg-red-400 border-2 border-slate-900 text-slate-900 text-[10px] font-black rounded-lg min-w-[24px] h-6 px-1 flex items-center justify-center shadow-[2px_2px_0px_0px_#0f172a]">
                            {unreadModerationAlerts.length}
                          </span>
                        )}
                        {joinRequests.length > 0 && (
                          <span className="ml-2 bg-blue-400 border-2 border-slate-900 text-slate-900 text-[10px] font-black rounded-lg min-w-[24px] h-6 px-1 flex items-center justify-center shadow-[2px_2px_0px_0px_#0f172a]">
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
            <div className="bg-red-400 border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] rounded-[2rem] p-6 sm:p-8 transform transition-transform duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                  <ShieldAlert className="w-8 h-8 text-slate-900 stroke-[3]" />
                  Central de Irregularidades
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-xs font-black uppercase tracking-widest text-slate-900 bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] px-4 py-2 rounded-xl">
                    {unreadModerationAlerts.length} NÃO LIDO(S)
                  </div>
                  {unreadModerationAlerts.length > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      disabled={markingAllRead}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#ffffff] text-xs font-black uppercase tracking-widest hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#ffffff] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {markingAllRead ? "MARCANDO..." : "MARCAR TODOS COMO LIDO"}
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm font-bold text-slate-900 mb-6 bg-white/50 p-3 border-2 border-slate-900 rounded-xl inline-block shadow-[2px_2px_0px_0px_#0f172a]">
                Orientadores e coorientadores recebem em tempo real os alertas de conteúdo irregular no fórum.
              </p>

              <div className="space-y-4">
                {pagedModerationAlerts.map((alert) => {
                  const isUnread =
                    String(alert?.status || "unread").toLowerCase() === "unread";

                  return (
                    <div
                      key={alert.id}
                      className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 bg-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] rounded-2xl p-5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-lg font-black text-slate-900 uppercase">
                            {alert.actor_nome || "Aluno"}
                          </p>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] ${isUnread ? "bg-yellow-300 text-slate-900" : "bg-slate-200 text-slate-500"}`}>
                            {isUnread ? "NÃO LIDO" : "LIDO"}
                          </span>
                        </div>

                        <p className="text-sm font-bold text-slate-700 line-clamp-2">
                          {alert.reason ||
                            "Conteúdo sinalizado pela moderação inteligente."}
                        </p>

                        {alert.excerpt && (
                          <p className="text-xs font-bold text-slate-500 mt-2 bg-slate-100 p-3 border-2 border-slate-300 rounded-lg italic">
                            Trecho: "{alert.excerpt}"
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col sm:items-end gap-3 shrink-0">
                        {isUnread ? (
                          <button
                            onClick={() => handleMarkAlertAsRead(alert.id)}
                            className="px-4 py-2 rounded-xl bg-teal-400 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all text-xs font-black uppercase tracking-widest w-full sm:w-auto"
                          >
                            MARCAR COMO LIDO
                          </button>
                        ) : (
                          <span className="text-xs font-black text-slate-500 uppercase tracking-widest border-2 border-dashed border-slate-300 px-3 py-1 rounded-lg">
                            JÁ VISUALIZADO
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteModerationAlert(alert.id)}
                          className="px-4 py-2 rounded-xl bg-white text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:bg-red-400 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all text-xs font-black uppercase tracking-widest w-full sm:w-auto"
                        >
                          EXCLUIR ALERTA
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {moderationAlertsPageCount > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 pt-6 border-t-4 border-slate-900 border-dashed">
                  <div className="text-sm font-black text-slate-900 uppercase bg-white border-2 border-slate-900 px-3 py-1 shadow-[2px_2px_0px_0px_#0f172a] inline-block w-fit">
                    Página {moderationAlertsPage + 1} de {moderationAlertsPageCount}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setModerationAlertsPage((prev) => Math.max(0, prev - 1))}
                      disabled={moderationAlertsPage === 0}
                      className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-2 border-slate-900 bg-white text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() =>
                        setModerationAlertsPage((prev) => Math.min(moderationAlertsPageCount - 1, prev + 1))
                      }
                      disabled={moderationAlertsPage === moderationAlertsPageCount - 1}
                      className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-2 border-slate-900 bg-white text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "meu" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {!selectedMyForumClubId ? (
                <ForumNoClubState
                  title="SEU FÓRUM ESTÁ VAZIO"
                  message={
                    isMentor
                      ? "Você ainda não possui fóruns administrados para visualizar."
                      : "Você ainda não participa de nenhum fórum."
                  }
                  icon={Coffee}
                />
              ) : (
                <>
              {isMentor && joinRequests.length > 0 && (
                <div className="bg-blue-300 border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] rounded-[2rem] p-6 sm:p-8">
                  <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-3">
                    <UserPlus className="w-8 h-8 stroke-[3]" />
                    Solicitações Pendentes <span className="bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] px-3 py-1 text-sm">{joinRequests.length}</span>
                  </h3>
                  <div className="space-y-4">
                    {joinRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] rounded-2xl p-5 gap-4"
                      >
                        <div>
                          <span className="font-black text-xl text-slate-900 uppercase block mb-1">
                            {req.solicitante_nome}
                          </span>
                          <span className="text-xs font-bold text-slate-700 bg-slate-100 border-2 border-slate-900 px-2 py-1 rounded-lg shadow-[2px_2px_0px_0px_#0f172a] inline-block">
                            Clube:{" "}
                            {(clubs || []).find(
                              (c) => c.id === req.solicitante_clube_id,
                            )?.nome || "Desconhecido"}
                          </span>
                        </div>
                        <div className="flex gap-3 shrink-0">
                          <button
                            onClick={() => handleRespondRequest(req.id, true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-400 border-2 border-slate-900 text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all text-xs font-black uppercase tracking-widest w-full sm:w-auto justify-center"
                          >
                            <CheckCircle className="w-4 h-4 stroke-[3]" /> ACEITAR
                          </button>
                          <button
                            onClick={() => handleRespondRequest(req.id, false)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-400 border-2 border-slate-900 text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all text-xs font-black uppercase tracking-widest w-full sm:w-auto justify-center"
                          >
                            <XCircle className="w-4 h-4 stroke-[3]" /> RECUSAR
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isMentor && externalMembers.length > 0 && (
                <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] rounded-[2rem] p-6 sm:p-8">
                  <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-3">
                    <Users className="w-8 h-8 stroke-[3] text-blue-500" />
                    Membros Externos <span className="bg-yellow-300 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] px-3 py-1 text-sm">{externalMembers.length}</span>
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    {externalMembers.map((m) => (
                      <span
                        key={m.id}
                        className="inline-flex items-center gap-3 bg-blue-300 border-2 border-slate-900 text-slate-900 px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_#0f172a]"
                      >
                        {m.membro_nome}
                        <button
                          onClick={() => handleRemoveExternal(m.membro_id)}
                          className="bg-white border-2 border-slate-900 rounded-lg p-1 hover:bg-red-400 transition-colors outline-none shadow-[2px_2px_0px_0px_#0f172a] active:shadow-none active:translate-y-0.5 active:translate-x-0.5"
                          title="Remover membro externo"
                        >
                          <XCircle className="w-4 h-4 stroke-[3]" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white border-4 border-slate-900 shadow-[12px_12px_0px_0px_#0f172a] rounded-[2rem] p-6 md:p-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 border-b-4 border-slate-900 pb-6">
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
                        <MessageCircle className="w-8 h-8 stroke-[3]" /> Tópicos
                    </h2>
                    {myForumClubs.length > 1 && (
                    <div className="min-w-[280px] relative z-20">
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
                            <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-100 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] shrink-0">
                                {option.logoUrl ? (
                                <img
                                    src={option.logoUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                                ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-black text-slate-900">
                                    {String(option.label || "C").trim().charAt(0).toUpperCase()}
                                </div>
                                )}
                            </div>
                            <span className="text-sm font-black uppercase text-slate-900 truncate">
                                {option.label}
                            </span>
                            </div>
                        )}
                        />
                    </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-3 bg-yellow-300 border-4 border-slate-900 p-4 rounded-2xl shadow-[4px_4px_0px_0px_#0f172a] w-full sm:w-auto">
                      <img src="/Lobo.svg" alt="Agente Guia" className="w-10 h-10 shrink-0 border-2 border-slate-900 rounded-full bg-white" />
                      <div>
                      <p className="font-black uppercase text-sm text-slate-900">AGENTE GUIA PROTEGE O CHAT</p>
                      <p className="text-xs font-bold text-slate-800 mt-1">Monitorização inteligente ativa.</p>
                      </div>
                  </div>

                  {canParticipate && (
                      <button
                      onClick={() => setShowNewTopic(true)}
                      className="flex items-center justify-center gap-3 px-8 py-4 bg-teal-400 border-4 border-slate-900 text-slate-900 rounded-2xl hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] shadow-[4px_4px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a] transition-all text-sm font-black uppercase tracking-widest shrink-0 w-full sm:w-auto"
                      >
                      <Plus className="w-5 h-5 stroke-[3]" />
                      Novo Tópico
                      </button>
                  )}
                </div>

              {showNewTopic && (
                <form
                  onSubmit={handleCreateTopic}
                  className="bg-pink-300 p-6 md:p-8 rounded-3xl border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] space-y-6 mb-10 animate-in fade-in slide-in-from-top-4 duration-500 transform "
                >
                  <h3 className="font-black text-slate-900 text-2xl uppercase tracking-tighter bg-white inline-block px-4 py-2 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform -rotate-2">
                    Iniciar Discussão
                  </h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Qual o assunto do tópico? *"
                      value={newTopicTitle}
                      onChange={(e) => setNewTopicTitle(e.target.value)}
                      className="w-full px-5 py-4 rounded-xl border-4 border-slate-900 focus:shadow-[6px_6px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 outline-none text-base transition-all font-black text-slate-900 placeholder:text-slate-500 shadow-[4px_4px_0px_0px_#0f172a]"
                      maxLength={200}
                      required
                      autoFocus
                    />
                    <textarea
                      placeholder="Adicione detalhes (opcional)..."
                      value={newTopicDesc}
                      onChange={(e) => setNewTopicDesc(e.target.value)}
                      className="w-full px-5 py-4 rounded-xl border-4 border-slate-900 focus:shadow-[6px_6px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 outline-none text-base transition-all font-bold text-slate-900 placeholder:text-slate-500 shadow-[4px_4px_0px_0px_#0f172a] resize-y"
                      rows={4}
                      maxLength={1000}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewTopic(false);
                        setNewTopicTitle("");
                        setNewTopicDesc("");
                      }}
                      className="px-8 py-4 text-sm font-black uppercase tracking-widest bg-white border-4 border-slate-900 text-slate-900 hover:bg-slate-100 rounded-xl shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a] transition-all text-center"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !newTopicTitle.trim()}
                      className="flex items-center justify-center gap-3 px-8 py-4 text-sm font-black uppercase tracking-widest bg-blue-400 border-4 border-slate-900 text-slate-900 rounded-xl shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a] transition-all disabled:opacity-50 disabled:pointer-events-none text-center"
                    >
                      {submitting && <Loader2 className="w-5 h-5 animate-spin stroke-[3]" />}
                      {submitting ? "Publicando..." : "Publicar Tópico"}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-6">
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
              </div>
                </>
              )}
            </div>
          )}

          {/* ─── Tab: Fóruns Aceitos ───────────────────────────────────────── */}
          {activeTab === "aceitos" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {!viewingForumClubId ? (
                <>
                  <div className="bg-white border-4 border-slate-900 shadow-[12px_12px_0px_0px_#0f172a] rounded-[2rem] p-8 md:p-12 mb-8 transform ">
                      <h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter mb-4">
                        Fóruns Aprovados
                      </h2>
                      <p className="text-slate-800 font-bold text-lg bg-yellow-300 inline-block px-4 py-2 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
                        Acesso liberado. Explore as discussões destes clubes.
                      </p>
                  </div>
                  {acceptedClubs.length === 0 ? (
                    <ForumNoClubState
                      title="SEM FÓRUNS APROVADOS"
                      message="Você ainda não tem acesso a fóruns além do seu clube principal."
                      icon={Users}
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
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
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b-4 border-slate-900 mb-8">
                    <button
                      onClick={() => {
                        setViewingForumClubId(null);
                        setSelectedTopicId(null);
                      }}
                      className="p-3 border-4 border-slate-900 bg-white rounded-xl hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all outline-none"
                      aria-label="Voltar para lista de clubes"
                    >
                      <ArrowLeft className="w-6 h-6 stroke-[3] text-slate-900" />
                    </button>
                    <div className="flex-1">
                      <h2 className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none bg-yellow-300 inline-block px-4 py-2 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform -">
                        Tópicos <span className="text-white [-webkit-text-stroke:2px_#0f172a] ml-2">{currentForumClub?.nome || "Fórum"}</span>
                      </h2>
                    </div>
                    {canParticipate && (
                      <button
                        onClick={() => setShowNewTopic(true)}
                        className="flex items-center justify-center gap-3 px-6 py-4 bg-teal-400 border-4 border-slate-900 text-slate-900 font-black uppercase tracking-widest text-xs rounded-xl shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a] transition-all w-full sm:w-auto"
                      >
                        <Plus className="w-5 h-5 stroke-[3]" /> Novo Tópico
                      </button>
                    )}
                  </div>

                  {showNewTopic && (
                    <form
                      onSubmit={handleCreateTopic}
                      className="bg-pink-300 p-6 md:p-8 rounded-3xl border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] space-y-6 mb-10 animate-in fade-in slide-in-from-top-4 duration-500 transform "
                    >
                      {/* (Mesmo form de Novo Tópico Neo-Brutalista) */}
                      <h3 className="font-black text-slate-900 text-2xl uppercase tracking-tighter bg-white inline-block px-4 py-2 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform -rotate-2">
                        Iniciar Discussão
                      </h3>
                      <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Qual o assunto do tópico? *"
                            value={newTopicTitle}
                            onChange={(e) => setNewTopicTitle(e.target.value)}
                            className="w-full px-5 py-4 rounded-xl border-4 border-slate-900 focus:shadow-[6px_6px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 outline-none text-base transition-all font-black text-slate-900 placeholder:text-slate-500 shadow-[4px_4px_0px_0px_#0f172a]"
                            maxLength={200}
                            required
                            autoFocus
                        />
                        <textarea
                            placeholder="Adicione detalhes (opcional)..."
                            value={newTopicDesc}
                            onChange={(e) => setNewTopicDesc(e.target.value)}
                            className="w-full px-5 py-4 rounded-xl border-4 border-slate-900 focus:shadow-[6px_6px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 outline-none text-base transition-all font-bold text-slate-900 placeholder:text-slate-500 shadow-[4px_4px_0px_0px_#0f172a] resize-y"
                            rows={4}
                            maxLength={1000}
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewTopic(false);
                            setNewTopicTitle("");
                            setNewTopicDesc("");
                          }}
                          className="px-8 py-4 text-sm font-black uppercase tracking-widest bg-white border-4 border-slate-900 text-slate-900 hover:bg-slate-100 rounded-xl shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all text-center"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={submitting || !newTopicTitle.trim()}
                          className="flex items-center justify-center gap-3 px-8 py-4 text-sm font-black uppercase tracking-widest bg-blue-400 border-4 border-slate-900 text-slate-900 rounded-xl shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all disabled:opacity-50 disabled:pointer-events-none text-center"
                        >
                          {submitting && <Loader2 className="w-5 h-5 animate-spin stroke-[3]" />}
                          {submitting ? "Publicando..." : "Publicar Tópico"}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-6">
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
                          isModerator={false} // Não é moderador de outros clubes
                        />
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─── Tab: Explorar Fóruns ─────────────────────────────────────── */}
          {activeTab === "explorar" && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white border-4 border-slate-900 shadow-[12px_12px_0px_0px_#0f172a] rounded-[2rem] p-8 md:p-12 flex flex-col md:flex-row md:items-end justify-between gap-8 transform ">
                <div>
                  <h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-4">
                    Explorar <br/>Outros Clubes
                  </h2>
                  {exploreTotalCount > 0 && (
                    <p className="text-sm font-black uppercase tracking-widest text-slate-900 bg-yellow-300 inline-block px-3 py-1.5 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transform -rotate-2">
                      {exploreTotalCount} clubes {exploreScopeLabel}
                    </p>
                  )}
                </div>
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-900 stroke-[3]" />
                  <input
                    type="text"
                    placeholder="Buscar clube..."
                    value={searchForumInput}
                    onChange={(e) => setSearchForumInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleForumSearch();
                    }}
                    className="w-full pl-14 pr-24 py-4 rounded-xl border-4 border-slate-900 focus:shadow-[4px_4px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 outline-none text-base font-black text-slate-900 uppercase placeholder:text-slate-400 transition-all shadow-[4px_4px_0px_0px_#0f172a]"
                  />
                  <button
                    onClick={handleForumSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-slate-900 bg-teal-400 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all"
                    aria-label="Buscar"
                  >
                    Buscar
                  </button>
                  {searchForumInput && (
                    <button
                      onClick={handleClearForumSearch}
                      className="absolute right-24 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-red-400 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all"
                      aria-label="Limpar busca"
                    >
                      <XCircle className="w-4 h-4 text-slate-900 stroke-[3]" />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
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
                  className="flex items-center justify-center py-12"
                >
                  {exploreFetching && (
                    <div className="flex items-center gap-3 text-sm text-slate-900 font-black uppercase tracking-widest bg-yellow-300 border-4 border-slate-900 px-6 py-3 rounded-xl shadow-[4px_4px_0px_0px_#0f172a]">
                      <LoaderCircle className="w-5 h-5 animate-spin stroke-[3]" />
                      Carregando mais clubes...
                    </div>
                  )}
                </div>
              )}

              {!exploreHasMore && explorableClubs.length > 0 && (
                <p className="text-center text-xs font-black uppercase tracking-widest text-slate-900 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] px-6 py-3 rounded-xl mt-8 mx-auto w-fit">
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
