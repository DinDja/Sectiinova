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
  X,
  Zap
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

// --- COMPONENTES AUXILIARES HQ DE AÇÃO ---
const ScreamTail = ({ className = "", fill = "#ffffff", flip = false }) => (
  <svg 
      className={`absolute z-20 pointer-events-none ${className} ${flip ? '-scale-x-100' : ''}`} 
      viewBox="0 0 40 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
  >
      <path d="M2 2 L16 38 L22 18 L36 2" fill={fill} stroke="#0f172a" strokeWidth="3" strokeLinejoin="miter" />
      <path d="M1.5 2 L36.5 2" stroke={fill} strokeWidth="6" strokeLinecap="square" />
  </svg>
);

const ScreamShards = ({ className = "", fill = "#ffffff", flip = false }) => (
  <div className={`absolute z-10 flex gap-1.5 pointer-events-none ${className}`}>
      <svg width="14" height="20" viewBox="0 0 14 20" className={`transform ${flip ? '-rotate-12' : 'rotate-12'}`}>
          <path d="M7 0 L14 20 L0 16 Z" fill={fill} stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="miter" />
      </svg>
      <svg width="20" height="28" viewBox="0 0 20 28" className={`transform ${flip ? 'rotate-45' : '-rotate-45'} mt-2`}>
          <path d="M10 0 L20 28 L0 22 Z" fill={fill} stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="miter" />
      </svg>
  </div>
);

// --- CONFIGURAÇÕES E HELPERS ---
const TABS = [
  { id: "meu", label: "Meu Fórum", icon: Coffee },
  { id: "aceitos", label: "Fóruns Aceitos", icon: Users },
  { id: "explorar", label: "Explorar", icon: Globe },
];

const MODERATION_ALERTS_PAGE_SIZE = 6;
const normalizeId = (value) => String(value || "").trim();
const normalizeUniqueIds = (values) => [...new Set((values || []).map((value) => normalizeId(value)).filter(Boolean))];
const getInitials = (value) => String(value || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "CL";
const getClubLogoUrl = (club) => String(club?.logo_url || club?.logo || "").trim();
const getClubBannerUrl = (club) => String(club?.banner_url || club?.banner || "").trim();

const getClubMemberCount = (club) => {
  const inferredMembers = normalizeUniqueIds([
    ...(club?.membros_ids || []), ...(club?.clubistas_ids || []), ...(club?.orientador_ids || []), ...(club?.coorientador_ids || []), club?.mentor_id,
  ]).length;
  if (inferredMembers > 0) return inferredMembers;
  const explicitCount = Number(club?.membros_count || club?.membrosCount || club?.memberCount || 0);
  return Number.isFinite(explicitCount) && explicitCount > 0 ? explicitCount : 0;
};

const formatSafeDate = (dateObj) => {
  if (!dateObj) return "";
  const date = typeof dateObj.toDate === "function" ? dateObj.toDate() : new Date(dateObj);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
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
  let rPrime = 0, gPrime = 0, bPrime = 0;

  if (section >= 0 && section < 1) { rPrime = chroma; gPrime = x; }
  else if (section >= 1 && section < 2) { rPrime = x; gPrime = chroma; }
  else if (section >= 2 && section < 3) { gPrime = chroma; bPrime = x; }
  else if (section >= 3 && section < 4) { gPrime = x; bPrime = chroma; }
  else if (section >= 4 && section < 5) { rPrime = x; bPrime = chroma; }
  else { rPrime = chroma; bPrime = x; }

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
  const rgbMatch = raw.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (!rgbMatch) return "";
  const rgbValues = rgbMatch.slice(1).map((channel) => Number(channel));
  if (rgbValues.some((channel) => Number.isNaN(channel) || channel > 255)) return "";
  return `rgb(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]})`;
};

const parseColorToRgbTuple = (color) => {
  const normalized = normalizeColorValue(color);
  if (!normalized) return null;
  if (normalized.startsWith("#")) {
    return [Number.parseInt(normalized.slice(1, 3), 16), Number.parseInt(normalized.slice(3, 5), 16), Number.parseInt(normalized.slice(5, 7), 16)];
  }
  const rgbMatch = normalized.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (!rgbMatch) return null;
  return rgbMatch.slice(1).map((channel) => Number(channel));
};

const withAlpha = (color, alpha = 1) => {
  const tuple = parseColorToRgbTuple(color) || [103, 232, 249]; // Fallback to cyan-300
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
  const primaryColor = resolveClubThemeColor(club, ["cor_primaria", "corPrincipal", "cor_tema", "theme_color", "primary_color", "accent_color", "cor"]) || buildSeedColor(seed, 0, 58, 44);
  let secondaryColor = resolveClubThemeColor(club, ["cor_secundaria", "corSecundaria", "theme_secondary_color", "secondary_color", "accent_secondary_color"]) || buildSeedColor(`${seed}:secondary`, 38, 64, 40);
  if (secondaryColor === primaryColor) secondaryColor = buildSeedColor(`${seed}:alt`, 76, 62, 38);
  return { primary: primaryColor, secondary: secondaryColor, bannerUrl: getClubBannerUrl(club) };
};

const buildForumClubSelectStyles = (primaryColor) => ({
  control: (base, state) => ({
    ...base,
    minHeight: 48,
    borderRadius: 24,
    border: '3px solid #0f172a',
    borderColor: '#0f172a',
    boxShadow: state.isFocused ? '0 0 0 4px rgba(103, 232, 249, 0.4)' : '0 1px 2px rgba(0,0,0,0.05)',
    backgroundColor: "#ffffff",
    fontWeight: '900',
    "&:hover": {
      borderColor: '#0f172a',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    },
    transition: 'all 0.2s ease',
  }),
  valueContainer: (base) => ({ ...base, padding: "2px 16px" }),
  indicatorSeparator: () => ({ display: "none" }),
  menu: (base) => ({
    ...base,
    borderRadius: 24,
    border: "3px solid #0f172a",
    overflow: "hidden",
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
    zIndex: 50
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? primaryColor : state.isFocused ? "#f8fafc" : "#ffffff",
    color: state.isSelected ? "#ffffff" : "#0f172a",
    fontWeight: '900',
    padding: "12px 20px",
    cursor: "pointer",
    borderBottom: '1px solid #e2e8f0'
  }),
});

// ─── Sub-Componentes Memorizados ───────────────────────────────────────────────
const EmptyBox = memo(({ message, icon: Icon = Coffee }) => (
  <div className="bg-white border-[3px] border-slate-900 shadow-sm rounded-[3rem] p-12 flex flex-col items-center justify-center text-center relative z-10 overflow-hidden group hover:shadow-md transition-shadow">
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '16px 16px' }}></div>
    <div className="w-20 h-20 bg-yellow-400 border-[3px] border-slate-900 rounded-full flex items-center justify-center mb-6 transform -rotate-6 group-hover:rotate-0 transition-transform shadow-sm">
      <Icon className="w-10 h-10 text-slate-900 stroke-[2.5]" />
    </div>
    <p className="text-slate-900 font-black uppercase tracking-widest text-sm max-w-sm leading-relaxed relative z-10">{message}</p>
  </div>
));
EmptyBox.displayName = "EmptyBox";

const ForumNoClubState = memo(({ title = "Nenhum fórum disponível", message, icon: Icon = Coffee }) => (
  <div className="relative overflow-hidden rounded-[3rem] border-[3px] border-slate-900 bg-pink-400 p-8 sm:p-12 shadow-lg flex flex-col items-center text-center transform transition-transform hover:-translate-y-1">
  
    
    <div className="relative flex flex-col items-center z-10">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border-[3px] border-slate-900 bg-white px-5 py-2.5 shadow-sm transform rotate-2">
        <span className="h-3 w-3 rounded-full bg-cyan-300 border-[2px] border-slate-900 animate-pulse" />
        <span className="text-xs font-black uppercase tracking-[0.15em] text-slate-900">Forum Hub</span>
      </div>

      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border-[3px] border-slate-900 bg-white shadow-sm transform -rotate-3">
        <Icon className="h-10 w-10 text-slate-900 stroke-[2.5]" />
      </div>

      <h3 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase text-white mb-4 drop-shadow-md">
        {title}
      </h3>
      <p className="max-w-xl text-base sm:text-lg font-bold text-slate-900 bg-yellow-400 p-5 rounded-[2rem] border-[3px] border-slate-900 shadow-sm transform">
        {message}
      </p>

      <div className="mt-8 inline-flex items-center gap-3 rounded-full border-[3px] border-slate-900 bg-cyan-300 px-8 py-4 text-sm font-black uppercase tracking-widest text-slate-900 shadow-sm hover:scale-105 active:scale-95 transition-transform">
        <Building2 className="h-5 w-5 stroke-[2.5]" />
        Convide seu clube para iniciar discussões
      </div>
    </div>
  </div>
));
ForumNoClubState.displayName = "ForumNoClubState";

const TopicItem = memo(({ topic, onSelect, isModerator, onTogglePin, onToggleLock, onDelete }) => {
  const formattedDate = formatSafeDate(topic.createdAt);

  return (
    <div
      className="bg-white border-[3px] border-slate-900 shadow-sm hover:shadow-md hover:-translate-y-1 rounded-[2.5rem] p-6 sm:p-8 transition-all cursor-pointer group relative overflow-hidden"
      onClick={() => onSelect(topic.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onSelect(topic.id); }}
    >
      <div className="flex items-start justify-between gap-4 relative z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-4">
            {topic.pinned && (
              <div className="bg-yellow-400 border-[3px] border-slate-900 p-2 rounded-full shadow-sm transform -rotate-6">
                <Pin className="w-4 h-4 text-slate-900 stroke-[3]" title="Tópico Fixado" />
              </div>
            )}
            {topic.locked && (
              <div className="bg-pink-400 border-[3px] border-slate-900 p-2 rounded-full shadow-sm">
                <Lock className="w-4 h-4 text-white stroke-[3]" title="Tópico Bloqueado" />
              </div>
            )}
            <h3 className="font-black text-xl md:text-2xl uppercase tracking-tight text-slate-900 truncate group-hover:text-pink-500 transition-colors">
              {topic.titulo}
            </h3>
          </div>
          
          {topic.descricao && (
            <p className="text-sm font-bold text-slate-600 line-clamp-2 leading-relaxed mb-6">
              {topic.descricao}
            </p>
          )}
          
          <div className="flex flex-wrap items-center gap-3 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-900">
            <span className="bg-cyan-300 border-[3px] border-slate-900 px-4 py-2 rounded-full shadow-sm">
              {topic.autor_nome}
            </span>
            <span className="bg-slate-100 border-[3px] border-slate-900 px-4 py-2 rounded-full shadow-sm text-slate-600">
              {formattedDate}
            </span>
            <span className="flex items-center gap-2 bg-yellow-400 border-[3px] border-slate-900 px-4 py-2 rounded-full shadow-sm">
              <MessageCircle className="w-4 h-4 stroke-[3]" />
              {topic.mensagens_count || 0}
            </span>
          </div>
        </div>

        {isModerator && (
          <div
            className="flex flex-col sm:flex-row gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity bg-slate-50 border-[3px] border-slate-900 p-2.5 rounded-full shadow-sm shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onTogglePin(topic.id, topic.pinned)}
              className={`p-2.5 rounded-full transition-colors focus:ring-4 focus:ring-cyan-300/40 outline-none ${topic.pinned ? "bg-yellow-400 text-slate-900" : "bg-white text-slate-500 hover:bg-yellow-400 hover:text-slate-900"}`}
              title={topic.pinned ? "Desafixar" : "Fixar"}
            >
              <Pin className="w-4 h-4 stroke-[3]" />
            </button>
            <button
              onClick={() => onToggleLock(topic.id, topic.locked)}
              className={`p-2.5 rounded-full transition-colors focus:ring-4 focus:ring-cyan-300/40 outline-none ${topic.locked ? "bg-pink-400 text-white" : "bg-white text-slate-500 hover:bg-pink-400 hover:text-white"}`}
              title={topic.locked ? "Desbloquear" : "Bloquear"}
            >
              <Lock className="w-4 h-4 stroke-[3]" />
            </button>
            <button
              onClick={() => onDelete(topic.id)}
              className="p-2.5 rounded-full bg-white text-slate-500 hover:bg-slate-900 hover:text-white transition-colors focus:ring-4 focus:ring-cyan-300/40 outline-none"
              title="Excluir tópico"
            >
              <Trash2 className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
TopicItem.displayName = "TopicItem";

const ClubExploreCard = memo(({ club, index, onRequestJoin, requesting }) => {
  const logoUrl = getClubLogoUrl(club);
  const bannerUrl = getClubBannerUrl(club);
  const forumTheme = buildForumTheme(club);
  const memberCount = getClubMemberCount(club);
  const schoolLabel = String(club?.escola_nome || club?.escola_id || "").trim();

  return (
    <div className="bg-white border-[3px] border-slate-900 rounded-[3rem] overflow-hidden flex flex-col justify-between shadow-md hover:shadow-xl hover:-translate-y-2 transition-all group">
      <div className="relative h-40 overflow-visible border-b-[3px] border-slate-900 bg-slate-50">
        {bannerUrl ? (
          <img src={bannerUrl} alt={`Banner do clube ${club?.nome || ""}`} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${withAlpha(forumTheme.primary, 0.92)} 0%, ${withAlpha(forumTheme.secondary, 0.92)} 100%)` }} />
        )}
        <div className="absolute inset-0 bg-yellow-300/10 mix-blend-multiply pointer-events-none" />
        
        {!bannerUrl && (
          <span className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-widest text-slate-900 bg-white border-[3px] border-slate-900 rounded-full px-3 py-1.5 shadow-sm">
            Sem banner
          </span>
        )}

        <div className="absolute -bottom-8 left-8 w-20 h-20 rounded-[1.5rem] border-[3px] border-slate-900 bg-white overflow-hidden shadow-sm flex items-center justify-center transform -rotate-3 group-hover:rotate-0 transition-transform">
          {logoUrl ? (
            <img src={logoUrl} alt={`Logo do clube`} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-black text-slate-900">{getInitials(club?.nome)}</span>
          )}
        </div>
      </div>

      <div className="p-8 pt-12 flex-1 flex flex-col bg-white">
        <h3 className="font-black uppercase tracking-tight text-slate-900 text-xl md:text-2xl mb-3 line-clamp-2 leading-[1.1]">{club?.nome}</h3>

        {schoolLabel && (
          <p className="text-[10px] sm:text-xs font-bold text-slate-600 flex items-center gap-2 mb-6 bg-slate-50 border-[3px] border-slate-200 rounded-full px-4 py-2 w-fit">
            <Building2 className="w-4 h-4 stroke-[2.5] text-slate-400" />
            {schoolLabel}
          </p>
        )}

        <div className="mt-auto flex items-center gap-3 mb-8">
          <span className="inline-flex items-center gap-2 bg-cyan-300 border-[3px] border-slate-900 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-900 shadow-sm">
            <Users className="w-4 h-4 stroke-[3]" />
            {memberCount} membro{memberCount === 1 ? "" : "s"}
          </span>
        </div>

        <button
          onClick={() => onRequestJoin(club.id)}
          disabled={requesting}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 text-sm font-black uppercase tracking-widest bg-yellow-400 border-[3px] border-slate-900 text-slate-900 rounded-full shadow-sm hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:pointer-events-none"
        >
          {requesting ? <Loader2 className="w-5 h-5 animate-spin stroke-[3]" /> : <LogIn className="w-5 h-5 stroke-[3]" />}
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
      className="bg-white border-[3px] border-slate-900 rounded-[3rem] overflow-hidden flex flex-col justify-between shadow-md hover:shadow-xl hover:-translate-y-2 transition-all group text-left w-full"
    >
      <div className="relative h-40 overflow-visible border-b-[3px] border-slate-900 bg-slate-50">
        <div className="absolute inset-0 overflow-hidden">
          {bannerUrl ? (
            <img src={bannerUrl} alt="Banner do clube" className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${withAlpha(forumTheme.primary, 0.92)} 0%, ${withAlpha(forumTheme.secondary, 0.92)} 100%)` }} />
          )}
          <div className="absolute inset-0 bg-blue-300/10 mix-blend-multiply pointer-events-none" />
        </div>

        <div className="absolute -bottom-8 left-8 w-20 h-20 rounded-[1.5rem] border-[3px] border-slate-900 bg-white overflow-hidden shadow-sm flex items-center justify-center transform rotate-3 group-hover:rotate-0 transition-transform">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo do clube" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-black text-slate-900">{getInitials(club?.nome)}</span>
          )}
        </div>
      </div>

      <div className="p-8 pt-12 flex-1 flex flex-col bg-white">
        <h3 className="font-black uppercase tracking-tight text-slate-900 text-xl md:text-2xl mb-4 line-clamp-2 leading-[1.1]">
          {club?.nome}
        </h3>

        {schoolLabel && (
          <p className="text-[10px] sm:text-xs font-bold text-slate-600 flex items-center gap-2 mb-8 bg-slate-50 border-[3px] border-slate-200 rounded-full px-4 py-2 w-fit">
            <Building2 className="w-4 h-4 stroke-[2.5] text-slate-400" />
            {schoolLabel}
          </p>
        )}

        <div className="mt-auto flex flex-wrap gap-3 items-center">
          <span className="inline-flex items-center gap-2 bg-yellow-400 border-[3px] border-slate-900 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-900 shadow-sm">
            <Users className="w-4 h-4 stroke-[3]" />
            {memberCount} Membro{memberCount === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white bg-slate-900 border-[3px] border-slate-900 rounded-full px-5 py-2 shadow-sm group-hover:bg-cyan-300 group-hover:text-slate-900 transition-colors">
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
  const selectedTopic = useMemo(() => topics.find((topic) => topic?.id === selectedTopicId) || null, [topics, selectedTopicId]);

  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicDesc, setNewTopicDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searchForumInput, setSearchForumInput] = useState("");
  const [searchForum, setSearchForum] = useState("");
  const [toast, setToast] = useState({ message: "", type: "error" });
  const searchForumLower = useMemo(() => String(searchForum || "").trim().toLowerCase(), [searchForum]);
  const [confirmModal, setConfirmModal] = useState({ open: false, title: "", description: "", onConfirm: null });

  const handleForumSearch = useCallback(() => setSearchForum(searchForumInput.trim()), [searchForumInput]);
  const handleClearForumSearch = useCallback(() => { setSearchForumInput(""); setSearchForum(""); }, []);
  const [requestingClubs, setRequestingClubs] = useState(new Set());

  const [exploreClubs, setExploreClubs] = useState([]);
  const [exploreCursor, setExploreCursor] = useState(null);
  const exploreCursorRef = useRef(null);
  const [exploreHasMore, setExploreHasMore] = useState(true);
  const exploreHasMoreRef = useRef(true);
  const [exploreFetching, setExploreFetching] = useState(false);
  const exploreFetchingRef = useRef(false);
  const [exploreTotalCount, setExploreTotalCount] = useState(0);
  const [exploreLoadMoreNode, setExploreLoadMoreNode] = useState(null);

  const exploreLoadMoreRef = useCallback((node) => setExploreLoadMoreNode(node), []);

  const isMentor = useMemo(() => {
    const perfil = String(loggedUser?.perfil || "").trim().toLowerCase();
    return perfil === "orientador" || perfil === "coorientador";
  }, [loggedUser]);

  const unreadModerationAlerts = useMemo(() => moderationAlerts.filter((alert) => String(alert?.status || "unread").toLowerCase() === "unread"), [moderationAlerts]);
  const alertRecipientId = useMemo(() => String(auth?.currentUser?.uid || loggedUser?.uid || loggedUser?.id || "").trim(), [loggedUser?.uid, loggedUser?.id]);
  const forumUserId = useMemo(() => normalizeId(loggedUser?.id || auth?.currentUser?.uid || loggedUser?.uid), [loggedUser?.id, loggedUser?.uid]);

  const profileClubIds = useMemo(() => normalizeUniqueIds([normalizeId(myClubId), ...getUserClubIds(loggedUser)]), [myClubId, loggedUser]);
  const normalizedMyClubIds = useMemo(() => normalizeUniqueIds(myClubIds), [myClubIds]);
  const allUserClubIds = useMemo(() => normalizeUniqueIds([...normalizedMyClubIds, ...profileClubIds]), [normalizedMyClubIds, profileClubIds]);
  const allUserClubIdSet = useMemo(() => new Set(allUserClubIds), [allUserClubIds]);
  const userSchoolIds = useMemo(() => normalizeUniqueIds(getUserSchoolIds(loggedUser)), [loggedUser]);

  const hasAnyUserClub = allUserClubIds.length > 0;
  const restrictExploreToOwnSchool = !hasAnyUserClub && userSchoolIds.length > 0;

  const acceptedClubIds = useMemo(() => normalizeUniqueIds(acceptedForums.map((af) => af?.clube_id)), [acceptedForums]);
  const acceptedClubIdSet = useMemo(() => new Set(acceptedClubIds), [acceptedClubIds]);

  const mentorManagedClubIds = useMemo(() => normalizeUniqueIds((mentorManagedClubs || []).map((club) => club?.id)), [mentorManagedClubs]);
  const mentorManagedClubIdSet = useMemo(() => new Set(mentorManagedClubIds), [mentorManagedClubIds]);

  const myForumClubIds = useMemo(() => {
    if (isMentor) return normalizeUniqueIds([...mentorManagedClubIds, ...allUserClubIds]);
    return normalizeUniqueIds([...allUserClubIds, ...acceptedClubIds]);
  }, [isMentor, mentorManagedClubIds, allUserClubIds, acceptedClubIds]);

  const myForumClubIdSet = useMemo(() => new Set(myForumClubIds), [myForumClubIds]);

  const acceptedOrMemberClubIds = useMemo(() => normalizeUniqueIds([...acceptedClubIds, ...allUserClubIds]), [acceptedClubIds, allUserClubIds]);
  const acceptedOrMemberClubIdSet = useMemo(() => new Set(acceptedOrMemberClubIds), [acceptedOrMemberClubIds]);

  const canExploreClub = useCallback((club) => {
    const clubId = normalizeId(club?.id);
    if (!clubId) return false;
    if (allUserClubIdSet.has(clubId)) return false;
    if (acceptedClubIdSet.has(clubId)) return false;
    if (!restrictExploreToOwnSchool) return true;
    const clubSchoolId = normalizeId(club?.escola_id);
    return clubSchoolId ? userSchoolIds.includes(clubSchoolId) : false;
  }, [allUserClubIdSet, acceptedClubIdSet, restrictExploreToOwnSchool, userSchoolIds]);

  const matchesExploreSearch = useCallback((club) => {
    if (!searchForumLower) return true;
    const nome = String(club?.nome || "").toLowerCase();
    const escola = String(club?.escola_nome || club?.escola_id || "").toLowerCase();
    return nome.includes(searchForumLower) || escola.includes(searchForumLower);
  }, [searchForumLower]);

  const currentForumClubId = activeTab === "meu" ? selectedMyForumClubId : viewingForumClubId;
  const moderationAlertsPageCount = Math.max(1, Math.ceil(moderationAlerts.length / MODERATION_ALERTS_PAGE_SIZE));
  const pagedModerationAlerts = moderationAlerts.slice(moderationAlertsPage * MODERATION_ALERTS_PAGE_SIZE, (moderationAlertsPage + 1) * MODERATION_ALERTS_PAGE_SIZE);

  useEffect(() => {
    if (moderationAlertsPage > 0 && moderationAlertsPage >= moderationAlertsPageCount) setModerationAlertsPage(moderationAlertsPageCount - 1);
  }, [moderationAlertsPage, moderationAlertsPageCount]);

  useEffect(() => {
    const normalizedSelectedClubId = normalizeId(selectedMyForumClubId);
    if (normalizedSelectedClubId && myForumClubIdSet.has(normalizedSelectedClubId)) return;
    const preferredClubId = normalizeId(myClubId);
    if (preferredClubId && myForumClubIdSet.has(preferredClubId)) {
      setSelectedMyForumClubId(preferredClubId); return;
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
    if (!currentForumClubId) { setTopics([]); setSelectedTopicId(null); return; }
    return subscribeToTopics(currentForumClubId, setTopics);
  }, [currentForumClubId]);

  useEffect(() => {
    if (!selectedMyForumClubId || !isMentor) { setJoinRequests([]); return; }
    return subscribeToJoinRequests(selectedMyForumClubId, setJoinRequests);
  }, [selectedMyForumClubId, isMentor]);

  useEffect(() => {
    if (!selectedMyForumClubId || !isMentor || !alertRecipientId) { setModerationAlerts([]); return; }
    return subscribeToModerationAlerts({ clubeId: selectedMyForumClubId, recipientId: alertRecipientId, callback: setModerationAlerts, unreadOnly: false });
  }, [selectedMyForumClubId, isMentor, alertRecipientId]);

  useEffect(() => {
    if (!selectedMyForumClubId || !isMentor) { setExternalMembers([]); return; }
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
      const { docs, lastDoc, hasMore } = await fetchClubsPage(FORUM_EXPLORE_PAGE_SIZE, cursor);
      setExploreClubs((prev) => {
        if (reset) return docs;
        const merged = [...prev, ...docs];
        return merged.filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i);
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
    const filteredCount = (clubs || []).filter((club) => canExploreClub(club) && matchesExploreSearch(club)).length;
    setExploreTotalCount(filteredCount);
  }, [activeTab, fetchExplorePage, clubs, canExploreClub, matchesExploreSearch]);

  useEffect(() => {
    if (!exploreLoadMoreNode || activeTab !== "explorar") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      if (exploreFetchingRef.current || !exploreHasMoreRef.current) return;
      fetchExplorePage(false);
    }, { rootMargin: "300px 0px", threshold: 0 });
    observer.observe(exploreLoadMoreNode);
    return () => observer.disconnect();
  }, [exploreLoadMoreNode, activeTab, fetchExplorePage]);

  const myForumClubs = useMemo(() => (clubs || []).filter((club) => myForumClubIdSet.has(normalizeId(club?.id))).sort((a, b) => String(a?.nome || "").localeCompare(String(b?.nome || ""), "pt-BR")), [clubs, myForumClubIdSet]);
  const myForumSelectOptions = useMemo(() => myForumClubs.map((club) => ({ value: normalizeId(club?.id), label: String(club?.nome || "Clube"), logoUrl: String(club?.logo_url || club?.logo || "").trim() })), [myForumClubs]);
  const selectedMyForumSelectOption = useMemo(() => myForumSelectOptions.find((option) => option.value === normalizeId(selectedMyForumClubId)) || null, [myForumSelectOptions, selectedMyForumClubId]);
  const acceptedClubs = useMemo(() => (clubs || []).filter((club) => acceptedOrMemberClubIdSet.has(normalizeId(club?.id))).sort((a, b) => String(a?.nome || "").localeCompare(String(b?.nome || ""), "pt-BR")), [clubs, acceptedOrMemberClubIdSet]);
  const explorableClubs = useMemo(() => {
    if (searchForumLower) return (clubs || []).filter((club) => canExploreClub(club) && matchesExploreSearch(club));
    return exploreClubs.filter(canExploreClub);
  }, [exploreClubs, clubs, canExploreClub, matchesExploreSearch, searchForumLower]);

  const currentForumClub = useMemo(() => (clubs || []).find((club) => normalizeId(club?.id) === normalizeId(currentForumClubId)) || myClub, [clubs, currentForumClubId, myClub]);
  const currentForumTheme = useMemo(() => buildForumTheme(currentForumClub), [currentForumClub]);
  const isModeratorOfCurrent = useMemo(() => {
    if (!currentForumClubId) return false;
    return mentorManagedClubIdSet.has(normalizeId(currentForumClubId));
  }, [currentForumClubId, mentorManagedClubIdSet]);

  const canParticipate = useMemo(() => {
    if (!currentForumClubId) return false;
    const normalized = normalizeId(currentForumClubId);
    return acceptedOrMemberClubIdSet.has(normalized) || mentorManagedClubIdSet.has(normalized);
  }, [currentForumClubId, acceptedOrMemberClubIdSet, mentorManagedClubIdSet]);

  const forumClubSelectStyles = useMemo(() => buildForumClubSelectStyles(currentForumTheme.primary), [currentForumTheme.primary]);

  const handleCreateTopic = useCallback(async (e) => {
    e.preventDefault();
    if (!newTopicTitle.trim() || !currentForumClubId || submitting) return;
    setSubmitting(true);
    try {
      await createTopic({ clubeId: currentForumClubId, titulo: newTopicTitle.trim(), descricao: newTopicDesc.trim(), autor: loggedUser });
      setNewTopicTitle(""); setNewTopicDesc(""); setShowNewTopic(false);
    } catch (error) {
      setToast({ message: error?.message || "Erro ao criar o tópico. Tente novamente.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }, [newTopicTitle, newTopicDesc, currentForumClubId, loggedUser, submitting]);

  const handleRequestJoin = useCallback(async (clubeId) => {
    if (!loggedUser) return;
    setRequestingClubs((prev) => new Set(prev).add(clubeId));
    try {
      await requestJoinForum({ clubeId, solicitante: loggedUser });
      setToast({ message: "Solicitação enviada com sucesso!", type: "success" });
    } catch (error) {
      setToast({ message: "Erro ao enviar solicitação.", type: "error" });
    } finally {
      setRequestingClubs((prev) => { const newSet = new Set(prev); newSet.delete(clubeId); return newSet; });
    }
  }, [loggedUser]);

  const handleRespondRequest = useCallback(async (requestId, accepted) => {
    if (!loggedUser) return;
    await respondJoinRequest(requestId, accepted, loggedUser.id);
  }, [loggedUser]);

  const handleMarkAlertAsRead = useCallback(async (alertId) => {
    if (!alertRecipientId) return;
    try {
      await markModerationAlertAsRead(alertId, alertRecipientId);
      setModerationAlerts((prev) => prev.map((alert) => alert.id === alertId ? { ...alert, status: "read", read_by: alertRecipientId } : alert));
    } catch (error) {
      setToast({ message: error?.message || "Erro ao atualizar alerta de moderação.", type: "error" });
    }
  }, [alertRecipientId]);

  const handleMarkAllAsRead = useCallback(async () => {
    if (!alertRecipientId || markingAllRead) return;
    const unreadAlerts = moderationAlerts.filter((alert) => String(alert?.status || "unread").toLowerCase() === "unread");
    if (!unreadAlerts.length) return;
    setMarkingAllRead(true);
    try {
      await Promise.all(unreadAlerts.map((alert) => markModerationAlertAsRead(alert.id, alertRecipientId)));
      setModerationAlerts((prev) => prev.map((alert) => String(alert?.status || "").toLowerCase() === "unread" ? { ...alert, status: "read", read_by: alertRecipientId } : alert));
      setToast({ message: "Todos os alertas foram marcados como lidos.", type: "success" });
    } catch (error) {
      setToast({ message: error?.message || "Falha ao marcar todos os alertas como lidos.", type: "error" });
    } finally {
      setMarkingAllRead(false);
    }
  }, [alertRecipientId, markingAllRead, moderationAlerts]);

  const handleDeleteModerationAlert = useCallback((alertId) => {
    if (!alertId) return;
    setConfirmModal({
      open: true, title: "Excluir alerta", description: "Deseja excluir este alerta da central?",
      onConfirm: async () => {
        try {
          await deleteModerationAlert(alertId);
          setModerationAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
          setToast({ message: "Alerta excluído.", type: "success" });
        } catch (error) {
          setToast({ message: error?.message || "Falha ao excluir alerta.", type: "error" });
        } finally {
          setConfirmModal((prev) => ({ ...prev, open: false }));
        }
      }
    });
  }, []);

  const handleRemoveExternal = useCallback(async (memberId) => {
    if (!selectedMyForumClubId) return;
    setConfirmModal({
      open: true, title: "Remover membro", description: "Tem certeza que deseja remover este membro externo?",
      onConfirm: async () => {
        await removeExternalMember(memberId, selectedMyForumClubId);
        setConfirmModal((prev) => ({ ...prev, open: false }));
      }
    });
  }, [selectedMyForumClubId]);

  const handleTogglePin = useCallback((id, pinned) => togglePinTopic(id, pinned), []);
  const handleToggleLock = useCallback((id, locked) => toggleLockTopic(id, locked), []);
  const handleDeleteTopic = useCallback((id) => {
    setConfirmModal({
      open: true, title: "Excluir tópico", description: "Excluir este tópico e mensagens permanentemente?",
      onConfirm: async () => {
        await deleteTopic(id);
        setConfirmModal((prev) => ({ ...prev, open: false }));
      }
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white border-[3px] border-slate-900 shadow-2xl rounded-[3rem] p-10 w-full max-w-md animate-in zoom-in-[0.95]">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">{confirmModal.title}</h2>
          <p className="text-sm font-bold text-slate-700 mb-10">{confirmModal.description}</p>
          <div className="flex justify-end gap-4">
            <button onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))} className="px-8 py-3.5 bg-slate-100 border-[3px] border-slate-200 rounded-full font-black text-slate-500 hover:text-slate-900 uppercase tracking-widest hover:border-slate-900 hover:bg-white transition-all text-xs">Cancelar</button>
            <button onClick={() => confirmModal.onConfirm?.()} className="px-8 py-3.5 bg-cyan-300 border-[3px] border-slate-900 rounded-full font-black text-slate-900 uppercase tracking-widest shadow-sm hover:scale-105 active:scale-95 transition-transform text-xs">Confirmar</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        .hq-scrollbar::-webkit-scrollbar { width: 8px; }
        .hq-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .hq-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
        .hq-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
      
      <ConfirmModal />
      
      <div className="min-h-screen w-full bg-[#FDFDFD] text-slate-900 font-sans relative overflow-x-hidden isolate">
        
        {/* BACKGROUND HQ */}
        <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.85]">
            <div className="absolute inset-[-50%] animate-[spin_120s_linear_infinite]" style={{ background: 'repeating-conic-gradient(from 0deg, transparent 0deg 15deg, rgba(103, 232, 249, 0.12) 15deg 30deg)' }}></div>
            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '20px 20px' }}></div>
        </div>
        
        <div className="max-w-5xl mx-auto space-y-12 pb-16 pt-10 relative z-10 px-4 md:px-0">
          
          {/* HEADER HERO (POP Café) */}
          <div className="bg-cyan-300 border-[3px] border-slate-900 shadow-lg rounded-[3rem] p-8 md:p-12 relative flex flex-col md:flex-row items-center justify-between gap-8 z-10">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2.5px, transparent 2.5px)', backgroundSize: '16px 16px' }}></div>
            
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-24 h-24 bg-white border-[3px] border-slate-900 shadow-sm rounded-full flex items-center justify-center transform -rotate-6 hover:rotate-0 transition-transform shrink-0">
                 <img src="/cafe.svg" alt="Café" className="h-12 w-12 object-contain" loading="lazy" />
              </div>
              <div>
                <h1 className="text-5xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-3">
                  POP Café
                </h1>
                <p className="text-slate-900 font-bold bg-yellow-400 inline-block px-4 py-1.5 border-[3px] border-slate-900 shadow-sm text-xs uppercase tracking-widest rounded-full">
                  Fórum de discussão e colaboração
                </p>
              </div>
            </div>
          </div>

          {/* TABS DE NAVEGAÇÃO HQ */}
          <nav className="flex gap-3 mb-10 bg-white p-2.5 rounded-full border-[3px] border-slate-900 shadow-sm z-10 relative overflow-x-auto hq-scrollbar" role="tablist">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => { setActiveTab(tab.id); setSelectedTopicId(null); if (tab.id === "meu") setViewingForumClubId(null); }}
                  className={`flex-1 py-3.5 px-6 text-xs sm:text-sm font-black uppercase tracking-widest rounded-full transition-transform whitespace-nowrap text-center flex items-center justify-center gap-3 ${
                    isActive ? "bg-yellow-400 border-[3px] border-slate-900 text-slate-900 shadow-sm scale-100" : "bg-transparent border-[3px] border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className={`w-5 h-5 stroke-[2.5] ${isActive ? "text-slate-900" : "text-slate-400"}`} />
                  {tab.label}
                  {tab.id === "meu" && isMentor && (
                    <>
                      {unreadModerationAlerts.length > 0 && (
                        <span className="bg-pink-500 text-white text-[10px] font-black rounded-full min-w-[24px] h-6 px-2 flex items-center justify-center border-[2px] border-slate-900 shadow-sm">
                          {unreadModerationAlerts.length}
                        </span>
                      )}
                      {joinRequests.length > 0 && (
                        <span className="bg-cyan-300 text-slate-900 text-[10px] font-black rounded-full min-w-[24px] h-6 px-2 flex items-center justify-center border-[2px] border-slate-900 shadow-sm">
                          {joinRequests.length}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </nav>

          {/* CENTRAL DE MODERAÇÃO */}
          {isMentor && moderationAlerts.length > 0 && (
            <div className="bg-pink-500 border-[3px] border-slate-900 shadow-lg rounded-[3rem] p-8 sm:p-10 relative overflow-hidden z-10">
              <ScreamShards className="-top-4 right-10 scale-[2]" fill="#ffffff" flip />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 relative z-10">
                <h3 className="font-black text-3xl text-white uppercase tracking-tighter flex items-center gap-4">
                  <ShieldAlert className="w-8 h-8 stroke-[3]" /> Central de Alertas
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-xs font-black uppercase tracking-widest text-slate-900 bg-yellow-400 border-[3px] border-slate-900 shadow-sm px-5 py-2.5 rounded-full">
                    {unreadModerationAlerts.length} NÃO LIDO(S)
                  </div>
                  {unreadModerationAlerts.length > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      disabled={markingAllRead}
                      className="px-5 py-2.5 rounded-full bg-white text-slate-900 border-[3px] border-slate-900 shadow-sm text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {markingAllRead ? "MARCANDO..." : "MARCAR TODOS LIDOS"}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                {pagedModerationAlerts.map((alert) => {
                  const isUnread = String(alert?.status || "unread").toLowerCase() === "unread";
                  return (
                    <div key={alert.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 bg-white border-[3px] border-slate-900 shadow-sm rounded-[2rem] p-6 sm:p-8 hover:shadow-md transition-shadow">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-4 mb-3">
                          <p className="text-xl font-black text-slate-900 uppercase truncate">
                            {alert.actor_nome || "Aluno"}
                          </p>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border-[2px] border-slate-900 ${isUnread ? "bg-yellow-400 text-slate-900" : "bg-slate-100 text-slate-500 border-slate-300"}`}>
                            {isUnread ? "NÃO LIDO" : "LIDO"}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-700 mb-3 leading-relaxed">
                          {alert.reason || "Conteúdo sinalizado pela moderação inteligente."}
                        </p>
                        {alert.excerpt && (
                          <p className="text-xs font-bold text-slate-500 bg-slate-50 p-4 border-[2px] border-slate-200 rounded-2xl italic">
                            Trecho: "{alert.excerpt}"
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col sm:items-end gap-3 shrink-0">
                        {isUnread ? (
                          <button
                            onClick={() => handleMarkAlertAsRead(alert.id)}
                            className="px-5 py-3 rounded-full bg-cyan-300 text-slate-900 border-[3px] border-slate-900 shadow-sm hover:scale-105 active:scale-95 transition-transform text-[10px] font-black uppercase tracking-widest w-full sm:w-auto"
                          >
                            MARCAR LIDO
                          </button>
                        ) : (
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-[2px] border-dashed border-slate-300 px-4 py-2 rounded-full">
                            VISUALIZADO
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteModerationAlert(alert.id)}
                          className="px-5 py-3 rounded-full bg-white text-slate-500 border-[3px] border-slate-200 hover:border-slate-900 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest w-full sm:w-auto"
                        >
                          EXCLUIR
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {moderationAlertsPageCount > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-8 pt-8 border-t-[3px] border-white/30 border-dashed relative z-10">
                  <div className="text-sm font-black text-white uppercase tracking-widest">
                    Página {moderationAlertsPage + 1} de {moderationAlertsPageCount}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setModerationAlertsPage((prev) => Math.max(0, prev - 1))}
                      disabled={moderationAlertsPage === 0}
                      className="px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest border-[3px] border-slate-900 bg-white text-slate-900 shadow-sm hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setModerationAlertsPage((prev) => Math.min(moderationAlertsPageCount - 1, prev + 1))}
                      disabled={moderationAlertsPage === moderationAlertsPageCount - 1}
                      className="px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest border-[3px] border-slate-900 bg-white text-slate-900 shadow-sm hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: MEU FÓRUM */}
          {activeTab === "meu" && (
            <div className="space-y-10 animate-in fade-in duration-500 relative z-10">
              {!selectedMyForumClubId ? (
                <ForumNoClubState
                  title="SEU FÓRUM ESTÁ VAZIO"
                  message={isMentor ? "Você ainda não possui fóruns administrados para visualizar." : "Você ainda não participa de nenhum fórum."}
                  icon={Coffee}
                />
              ) : (
                <>
                  {isMentor && joinRequests.length > 0 && (
                    <div className="bg-cyan-100 border-[3px] border-slate-900 shadow-lg rounded-[3rem] p-8 sm:p-10">
                      <h3 className="font-black text-2xl md:text-3xl text-slate-900 uppercase tracking-tight mb-8 flex items-center gap-4">
                        <UserPlus className="w-8 h-8 stroke-[3] text-pink-500" />
                        Solicitações Pendentes 
                        <span className="bg-white border-[3px] border-slate-900 rounded-full shadow-sm px-4 py-1.5 text-lg">{joinRequests.length}</span>
                      </h3>
                      <div className="space-y-4">
                        {joinRequests.map((req) => (
                          <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border-[3px] border-slate-900 shadow-sm rounded-[2rem] p-6 gap-6">
                            <div>
                              <span className="font-black text-xl text-slate-900 uppercase block mb-2">{req.solicitante_nome}</span>
                              <span className="text-xs font-bold text-slate-600 bg-slate-50 border-[2px] border-slate-200 px-3 py-1.5 rounded-full inline-block">
                                Clube: {(clubs || []).find((c) => c.id === req.solicitante_clube_id)?.nome || "Desconhecido"}
                              </span>
                            </div>
                            <div className="flex gap-3 shrink-0">
                              <button onClick={() => handleRespondRequest(req.id, true)} className="flex items-center gap-2 px-5 py-3 rounded-full bg-yellow-400 border-[3px] border-slate-900 text-slate-900 shadow-sm hover:scale-105 active:scale-95 transition-transform text-xs font-black uppercase tracking-widest justify-center">
                                <CheckCircle className="w-4 h-4 stroke-[3]" /> ACEITAR
                              </button>
                              <button onClick={() => handleRespondRequest(req.id, false)} className="flex items-center gap-2 px-5 py-3 rounded-full bg-slate-100 border-[3px] border-slate-300 text-slate-500 hover:border-slate-900 hover:text-slate-900 hover:bg-white active:scale-95 transition-all text-xs font-black uppercase tracking-widest justify-center">
                                <XCircle className="w-4 h-4 stroke-[3]" /> RECUSAR
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isMentor && externalMembers.length > 0 && (
                    <div className="bg-white border-[3px] border-slate-900 shadow-lg rounded-[3rem] p-8 sm:p-10">
                      <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tight mb-8 flex items-center gap-4">
                        <Users className="w-8 h-8 stroke-[3] text-cyan-500" />
                        Membros Externos <span className="bg-yellow-400 border-[3px] border-slate-900 shadow-sm rounded-full px-4 py-1.5 text-lg">{externalMembers.length}</span>
                      </h3>
                      <div className="flex flex-wrap gap-4">
                        {externalMembers.map((m) => (
                          <span key={m.id} className="inline-flex items-center gap-3 bg-cyan-100 border-[3px] border-slate-900 text-slate-900 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm">
                            {m.membro_nome}
                            <button onClick={() => handleRemoveExternal(m.membro_id)} className="bg-white border-[2px] border-slate-900 rounded-full p-1.5 hover:bg-pink-400 hover:text-white transition-colors outline-none shadow-sm active:scale-95" title="Remover membro">
                              <XCircle className="w-4 h-4 stroke-[3]" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-white border-[3px] border-slate-900 shadow-xl rounded-[3rem] p-8 md:p-12">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 border-b-[3px] border-slate-900 pb-6">
                      <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-4">
                        <MessageCircle className="w-8 h-8 stroke-[3] text-yellow-500" /> Tópicos
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
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-50 border-[2px] border-slate-200 shrink-0">
                                  {option.logoUrl ? (
                                    <img src={option.logoUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-black text-slate-500">
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

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
                      <div className="flex items-center gap-4 bg-yellow-100 border-[3px] border-slate-900 p-4 rounded-[2rem] w-full sm:w-auto shadow-sm">
                        <img src="/Lobo.svg" alt="Agente Guia" className="w-12 h-12 shrink-0 border-[3px] border-slate-900 rounded-full bg-white" />
                        <div>
                          <p className="font-black uppercase text-xs text-slate-900 tracking-widest">Agente Guia no Chat</p>
                          <p className="text-xs font-bold text-slate-600 mt-1">Monitorização ativa.</p>
                        </div>
                      </div>

                      {canParticipate && (
                        <button
                          onClick={() => setShowNewTopic(true)}
                          className="flex items-center justify-center gap-3 px-8 py-4 bg-cyan-300 border-[3px] border-slate-900 text-slate-900 rounded-full hover:scale-105 active:scale-95 shadow-sm transition-transform text-sm font-black uppercase tracking-widest shrink-0 w-full sm:w-auto"
                        >
                          <Plus className="w-5 h-5 stroke-[3]" /> Novo Tópico
                        </button>
                      )}
                    </div>

                    {showNewTopic && (
                      <form
                        onSubmit={handleCreateTopic}
                        className="bg-slate-50 p-8 rounded-[2.5rem] border-[3px] border-slate-900 shadow-md space-y-6 mb-12 animate-in slide-in-from-top-4 duration-300 relative"
                      >
                        <h3 className="font-black text-slate-900 text-xl uppercase tracking-widest flex items-center gap-3">
                          <MessageCircle className="w-6 h-6 stroke-[3] text-pink-500" /> Iniciar Discussão
                        </h3>
                        <div className="space-y-5">
                          <input
                            type="text"
                            placeholder="Qual o assunto do tópico? *"
                            value={newTopicTitle}
                            onChange={(e) => setNewTopicTitle(e.target.value)}
                            className="w-full px-6 py-4 rounded-full border-[3px] border-slate-900 focus:ring-4 focus:ring-cyan-300/40 outline-none text-sm transition-all font-bold text-slate-900 placeholder:text-slate-400 shadow-sm"
                            maxLength={200}
                            required
                            autoFocus
                          />
                          <textarea
                            placeholder="Adicione detalhes (opcional)..."
                            value={newTopicDesc}
                            onChange={(e) => setNewTopicDesc(e.target.value)}
                            className="w-full px-6 py-4 rounded-[1.5rem] border-[3px] border-slate-900 focus:ring-4 focus:ring-cyan-300/40 outline-none text-sm transition-all font-bold text-slate-900 placeholder:text-slate-400 shadow-sm resize-y"
                            rows={4}
                            maxLength={1000}
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4">
                          <button
                            type="button"
                            onClick={() => { setShowNewTopic(false); setNewTopicTitle(""); setNewTopicDesc(""); }}
                            className="px-8 py-3.5 text-xs font-black uppercase tracking-widest bg-white border-[3px] border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-900 rounded-full active:scale-95 transition-all text-center"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={submitting || !newTopicTitle.trim()}
                            className="flex items-center justify-center gap-3 px-8 py-3.5 text-xs font-black uppercase tracking-widest bg-pink-400 border-[3px] border-slate-900 text-white rounded-full shadow-sm hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:pointer-events-none text-center"
                          >
                            {submitting && <Loader2 className="w-5 h-5 animate-spin stroke-[3]" />}
                            {submitting ? "Publicando..." : "Publicar Tópico"}
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="space-y-6">
                      {topics.length === 0 ? (
                        <EmptyBox message="Nenhum tópico criado ainda. Seja o primeiro a iniciar uma conversa!" icon={MessageCircle} />
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

          {/* TAB: FÓRUNS ACEITOS */}
          {activeTab === "aceitos" && (
            <div className="space-y-10 animate-in fade-in duration-500 relative z-10">
              {!viewingForumClubId ? (
                <>
                  <div className="bg-white border-[3px] border-slate-900 shadow-lg rounded-[3rem] p-8 md:p-12 mb-10">
                      <h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter mb-4">
                        Fóruns Aprovados
                      </h2>
                      <p className="text-slate-800 font-bold text-sm bg-cyan-100 inline-block px-5 py-2.5 border-[3px] border-slate-900 rounded-full">
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
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-8 border-b-[3px] border-slate-900 mb-10">
                    <button
                      onClick={() => { setViewingForumClubId(null); setSelectedTopicId(null); }}
                      className="p-3.5 border-[3px] border-slate-900 bg-white rounded-full hover:scale-110 active:scale-95 transition-transform outline-none shadow-sm"
                      aria-label="Voltar"
                    >
                      <ArrowLeft className="w-6 h-6 stroke-[3] text-slate-900" />
                    </button>
                    <div className="flex-1">
                      <h2 className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight bg-yellow-400 inline-block px-6 py-3 border-[3px] border-slate-900 rounded-full shadow-sm">
                        Tópicos <span className="text-white ml-2 drop-shadow-md">{currentForumClub?.nome || "Fórum"}</span>
                      </h2>
                    </div>
                    {canParticipate && (
                      <button
                        onClick={() => setShowNewTopic(true)}
                        className="flex items-center justify-center gap-3 px-6 py-4 bg-cyan-300 border-[3px] border-slate-900 text-slate-900 font-black uppercase tracking-widest text-xs rounded-full shadow-sm hover:scale-105 active:scale-95 transition-transform w-full sm:w-auto"
                      >
                        <Plus className="w-5 h-5 stroke-[3]" /> Novo Tópico
                      </button>
                    )}
                  </div>

                  {showNewTopic && (
                    <form
                      onSubmit={handleCreateTopic}
                      className="bg-slate-50 p-8 rounded-[2.5rem] border-[3px] border-slate-900 shadow-md space-y-6 mb-12 animate-in slide-in-from-top-4 duration-300 relative"
                    >
                      <h3 className="font-black text-slate-900 text-xl uppercase tracking-widest flex items-center gap-3">
                        <MessageCircle className="w-6 h-6 stroke-[3] text-pink-500" /> Iniciar Discussão
                      </h3>
                      <div className="space-y-5">
                        <input
                          type="text"
                          placeholder="Qual o assunto do tópico? *"
                          value={newTopicTitle}
                          onChange={(e) => setNewTopicTitle(e.target.value)}
                          className="w-full px-6 py-4 rounded-full border-[3px] border-slate-900 focus:ring-4 focus:ring-cyan-300/40 outline-none text-sm transition-all font-bold text-slate-900 placeholder:text-slate-400 shadow-sm"
                          maxLength={200}
                          required
                          autoFocus
                        />
                        <textarea
                          placeholder="Adicione detalhes (opcional)..."
                          value={newTopicDesc}
                          onChange={(e) => setNewTopicDesc(e.target.value)}
                          className="w-full px-6 py-4 rounded-[1.5rem] border-[3px] border-slate-900 focus:ring-4 focus:ring-cyan-300/40 outline-none text-sm transition-all font-bold text-slate-900 placeholder:text-slate-400 shadow-sm resize-y"
                          rows={4}
                          maxLength={1000}
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4">
                        <button
                          type="button"
                          onClick={() => { setShowNewTopic(false); setNewTopicTitle(""); setNewTopicDesc(""); }}
                          className="px-8 py-3.5 text-xs font-black uppercase tracking-widest bg-white border-[3px] border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-900 rounded-full active:scale-95 transition-all text-center"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={submitting || !newTopicTitle.trim()}
                          className="flex items-center justify-center gap-3 px-8 py-3.5 text-xs font-black uppercase tracking-widest bg-pink-400 border-[3px] border-slate-900 text-white rounded-full shadow-sm hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:pointer-events-none text-center"
                        >
                          {submitting && <Loader2 className="w-5 h-5 animate-spin stroke-[3]" />}
                          {submitting ? "Publicando..." : "Publicar Tópico"}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-6">
                    {topics.length === 0 ? (
                      <EmptyBox message="Nenhum tópico criado ainda. Seja o primeiro a iniciar uma conversa!" icon={MessageCircle} />
                    ) : (
                      topics.map((topic) => (
                        <TopicItem
                          key={topic.id}
                          topic={topic}
                          onSelect={setSelectedTopicId}
                          isModerator={false}
                        />
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB: EXPLORAR */}
          {activeTab === "explorar" && (
            <div className="space-y-10 animate-in fade-in duration-500 relative z-10">
              <div className="bg-white border-[3px] border-slate-900 shadow-lg rounded-[3rem] p-8 md:p-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div>
                  <h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-6">
                    Explorar <br/>Outros Clubes
                  </h2>
                  {exploreTotalCount > 0 && (
                    <p className="text-xs font-black uppercase tracking-widest text-slate-900 bg-cyan-300 inline-block px-4 py-2 border-[3px] border-slate-900 rounded-full shadow-sm transform -rotate-1">
                      {exploreTotalCount} clubes disponíveis
                    </p>
                  )}
                </div>
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 stroke-[3]" />
                  <input
                    type="text"
                    placeholder="Buscar clube..."
                    value={searchForumInput}
                    onChange={(e) => setSearchForumInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleForumSearch(); }}
                    className="w-full pl-14 pr-24 py-4 rounded-full border-[3px] border-slate-900 focus:ring-4 focus:ring-cyan-300/40 outline-none text-sm font-bold text-slate-900 uppercase placeholder:text-slate-400 transition-all shadow-sm"
                  />
                  <button
                    onClick={handleForumSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-900 bg-yellow-400 border-[3px] border-slate-900 shadow-sm hover:scale-105 active:scale-95 transition-transform"
                  >
                    Buscar
                  </button>
                  {searchForumInput && (
                    <button
                      onClick={handleClearForumSearch}
                      className="absolute right-24 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-100 text-slate-500 hover:text-pink-500 hover:bg-pink-50 transition-colors outline-none"
                    >
                      <XCircle className="w-4 h-4 stroke-[3]" />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">
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

              {exploreHasMore && (
                <div ref={exploreLoadMoreRef} className="flex items-center justify-center py-12">
                  {exploreFetching && (
                    <div className="flex items-center gap-3 text-xs text-slate-900 font-black uppercase tracking-widest bg-yellow-400 border-[3px] border-slate-900 px-6 py-3 rounded-full shadow-sm transform rotate-1">
                      <LoaderCircle className="w-5 h-5 animate-spin stroke-[3]" />
                      Carregando mais clubes...
                    </div>
                  )}
                </div>
              )}

              {!exploreHasMore && explorableClubs.length > 0 && (
                <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 border-[3px] border-dashed border-slate-300 px-6 py-3 rounded-full mt-8 mx-auto w-fit">
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