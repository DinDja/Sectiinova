import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
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
  LoaderCircle,
  Loader2,
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
  getClubsTotalCount,
} from "../services/forumService";
import { FORUM_EXPLORE_PAGE_SIZE } from "../constants/appConstants";
import ForumThread from "./ForumThread";

// ─── Constantes e Helpers ─────────────────────────────────────────
const TABS = [
  { id: "meu", label: "Meu Fórum", icon: Coffee },
  { id: "aceitos", label: "Fóruns Aceitos", icon: Users },
  { id: "explorar", label: "Explorar", icon: Globe },
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

// ─── Sub-Componentes Memorizados ──────────────────────────────────
const EmptyBox = memo(({ message, icon: Icon = Coffee }) => (
  <div className="premium-card p-10 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 bg-slate-50/50">
    <div className="w-16 h-16 bg-[#5AC8C8]/20 rounded-full flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-[#5AC8C8]" />
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
        className="premium-card p-4 hover:shadow-md hover:border-[#5AC8C8]/60 transition-all cursor-pointer group bg-white relative overflow-hidden"
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
                  className="w-4 h-4 text-[#5AC8C8] shrink-0 fill-[#5AC8C8]"
                  title="Tópico Fixado"
                />
              )}
              {topic.locked && (
                <Lock
                  className="w-4 h-4 text-red-400 shrink-0"
                  title="Tópico Bloqueado"
                />
              )}
              <h3 className="font-bold text-slate-800 truncate group-hover:text-[#5AC8C8] transition-colors">
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
                className={`p-2 rounded-lg transition-colors focus:ring-2 focus:ring-[#5AC8C8]/40 outline-none ${topic.pinned ? "bg-[#5AC8C8]/20 text-[#5AC8C8]" : "hover:bg-slate-100 text-slate-400 hover:text-[#5AC8C8]"}`}
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

const ClubExploreCard = memo(({ club, onRequestJoin, requesting }) => (
  <div className="premium-card p-5 flex flex-col justify-between hover:shadow-md transition-shadow bg-white">
    <div>
      <h3 className="font-bold text-slate-800 text-lg mb-1">{club.nome}</h3>
      {club.escola_id && (
        <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#5AC8C8]/60"></span>
          Escola: {club.escola_id}
        </p>
      )}
    </div>
    <button
      onClick={() => onRequestJoin(club.id)}
      disabled={requesting}
      className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-[#5AC8C8]/10 text-[#5AC8C8] rounded-xl hover:bg-[#5AC8C8]/20 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {requesting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <LogIn className="w-4 h-4" />
      )}
      {requesting ? "Solicitando..." : "Solicitar Entrada"}
    </button>
  </div>
));
ClubExploreCard.displayName = "ClubExploreCard";

// ─── Componente Principal ─────────────────────────────────────────
export default function ForumBoard({
  loggedUser,
  myClubId,
  myClub,
  clubs,
  users,
}) {
  const [activeTab, setActiveTab] = useState("meu");
  const [topics, setTopics] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [externalMembers, setExternalMembers] = useState([]);
  const [acceptedForums, setAcceptedForums] = useState([]);

  const [viewingForumClubId, setViewingForumClubId] = useState(null);
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

  const currentForumClubId =
    activeTab === "meu" ? myClubId : viewingForumClubId;

  // ─── Subscriptions ──────────────────────────────────────
  useEffect(() => {
    if (!currentForumClubId) return;
    return subscribeToTopics(currentForumClubId, setTopics);
  }, [currentForumClubId]);

  useEffect(() => {
    if (!myClubId || !isMentor) return;
    return subscribeToJoinRequests(myClubId, setJoinRequests);
  }, [myClubId, isMentor]);

  useEffect(() => {
    if (!myClubId) return;
    return subscribeToExternalMembers(myClubId, setExternalMembers);
  }, [myClubId]);

  useEffect(() => {
    if (!loggedUser?.id) return;
    return getForumsWhereAccepted(loggedUser.id, setAcceptedForums);
  }, [loggedUser?.id]);

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

    if (searchForumLower) {
      const filtered = (clubs || []).filter((c) => {
        const nome = String(c.nome || "").toLowerCase();
        const escola = String(c.escola_nome || c.escola_id || "").toLowerCase();
        return nome.includes(searchForumLower) || escola.includes(searchForumLower);
      });
      setExploreTotalCount(filtered.length);
      return;
    }

    getClubsTotalCount()
      .then((count) => setExploreTotalCount(count || 0))
      .catch(() => {});
  }, [activeTab, fetchExplorePage, searchForumLower, clubs]);

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
  const acceptedClubIds = useMemo(
    () => acceptedForums.map((af) => af.clube_id),
    [acceptedForums],
  );

  const acceptedClubs = useMemo(
    () => (clubs || []).filter((c) => acceptedClubIds.includes(c.id)),
    [clubs, acceptedClubIds],
  );

  const explorableClubs = useMemo(() => {
    const baseExclude = (c) => c.id !== myClubId && !acceptedClubIds.includes(c.id);

    // Com busca: filtra do array completo `clubs` (todos em memória)
    if (searchForumLower) {
      return (clubs || []).filter((c) => {
        if (!baseExclude(c)) return false;
        const nome = String(c.nome || "").toLowerCase();
        const escola = String(c.escola_nome || c.escola_id || "").toLowerCase();
        return nome.includes(searchForumLower) || escola.includes(searchForumLower);
      });
    }

    // Sem busca: usa paginação normal
    return exploreClubs.filter(baseExclude);
  }, [exploreClubs, clubs, myClubId, acceptedClubIds, searchForumLower]);

  const currentForumClub = useMemo(
    () => (clubs || []).find((c) => c.id === currentForumClubId) || myClub,
    [clubs, currentForumClubId, myClub],
  );

  const selectedTopic = useMemo(
    () => topics.find((t) => t.id === selectedTopicId) || null,
    [topics, selectedTopicId],
  );

  const canParticipate = useMemo(() => {
    if (!loggedUser || !currentForumClubId) return false;
    if (String(loggedUser.clube_id) === String(currentForumClubId)) return true;
    return acceptedClubIds.includes(currentForumClubId);
  }, [loggedUser, currentForumClubId, acceptedClubIds]);

  const isModeratorOfCurrent = useMemo(
    () =>
      isMentor && String(loggedUser?.clube_id) === String(currentForumClubId),
    [isMentor, loggedUser, currentForumClubId],
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

  const handleRemoveExternal = useCallback(
    async (memberId) => {
      if (!myClubId) return;
      setConfirmModal({
        open: true,
        title: "Remover membro externo",
        description: "Tem certeza que deseja remover este membro externo?",
        onConfirm: async () => {
          await removeExternalMember(memberId, myClubId);
          setConfirmModal((prev) => ({ ...prev, open: false }));
        },
      });
    },
    [myClubId],
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
        <div className="bg-white rounded-2xl p-6 w-11/12 max-w-md shadow-lg">
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
              className="px-4 py-2 bg-[#5AC8C8] text-white rounded-lg font-medium hover:bg-[#4bb4b4]"
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
      <ConfirmModal />
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Hero & Tabs */}
      <div className="premium-card overflow-hidden bg-white shadow-sm border border-slate-100">
        <div className="bg-gradient-to-r from-[#5AC8C8] via-[#5AC8C8] to-[#3DB0B0] p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="flex items-center gap-4 mb-2 relative z-10">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <img src="./cafe.svg" alt="" className="w-12 h-12" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Café Digital
              </h1>
              <p className="text-[#5AC8C8]/90 text-sm mt-1 font-medium">
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
                                        ? "text-[#5AC8C8] border-b-2 border-[#5AC8C8] bg-[#5AC8C8]/20"
                                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                                    }`}
              >
                <Icon
                  className={`w-4 h-4 ${isActive ? "text-[#5AC8C8]" : "text-slate-400"}`}
                />
                {tab.label}
                {tab.id === "meu" && isMentor && joinRequests.length > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                    {joinRequests.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ─── Tab: Meu Fórum ──────────────────────────── */}
      {activeTab === "meu" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          {isMentor && joinRequests.length > 0 && (
            <div className="premium-card p-5 border-l-4 border-l-[#5AC8C8]/70 bg-white">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#5AC8C8]" />
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
            {canParticipate && (
              <button
                onClick={() => setShowNewTopic(true)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#5AC8C8] text-white rounded-xl hover:bg-[#4bb4b4] active:scale-95 transition-all text-sm font-semibold shadow-sm focus:ring-4 focus:ring-[#5AC8C8]/25"
              >
                <Plus className="w-4 h-4" />
                Criar Tópico
              </button>
            )}
          </div>

          {showNewTopic && (
            <form
              onSubmit={handleCreateTopic}
              className="premium-card p-5 space-y-4 bg-white border-2 border-[#5AC8C8]/25 animate-in fade-in slide-in-from-top-2"
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
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-[#5AC8C8]/10 focus:border-[#5AC8C8] outline-none text-sm transition-all font-medium"
                  maxLength={200}
                  required
                  autoFocus
                />
                <textarea
                  placeholder="Adicione mais detalhes (opcional)..."
                  value={newTopicDesc}
                  onChange={(e) => setNewTopicDesc(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-[#5AC8C8]/10 focus:border-[#5AC8C8] outline-none text-sm resize-none transition-all"
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
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#5AC8C8] text-white rounded-xl hover:bg-[#4bb4b4] transition-colors disabled:opacity-50"
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
        </div>
      )}

      {/* ─── Tab: Fóruns Aceitos ─────────────────────── */}
      {activeTab === "aceitos" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          {!viewingForumClubId ? (
            <>
              <h2 className="text-xl font-bold text-slate-800">
                Fóruns em que fui aceito
              </h2>
              {acceptedClubs.length === 0 ? (
                <EmptyBox
                  message="Você ainda não faz parte de fóruns de outros clubes."
                  icon={Users}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {acceptedClubs.map((club) => (
                    <button
                      key={club.id}
                      onClick={() => setViewingForumClubId(club.id)}
                      className="premium-card p-5 text-left hover:shadow-lg hover:border-[#5AC8C8]/40 transition-all group bg-white focus:outline-none focus:ring-4 focus:ring-[#5AC8C8]/25"
                    >
                      <div className="w-10 h-10 bg-[#5AC8C8]/20 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Users className="w-5 h-5 text-[#5AC8C8]" />
                      </div>
                      <h3 className="font-bold text-slate-800 group-hover:text-[#5AC8C8] transition-colors text-lg line-clamp-1">
                        {club.nome}
                      </h3>
                      <p className="text-xs font-medium text-slate-500 mt-2 flex items-center gap-1">
                        Acessar discussões &rarr;
                      </p>
                    </button>
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
                  className="p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors outline-none focus:ring-2 focus:ring-[#5AC8C8]/40"
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
                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#5AC8C8] text-white rounded-xl hover:bg-[#4bb4b4] transition-colors text-sm font-semibold shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Novo Tópico
                  </button>
                )}
              </div>

              {/* Mobile Novo Topico Button */}
              {canParticipate && (
                <button
                  onClick={() => setShowNewTopic(true)}
                  className="sm:hidden w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-[#5AC8C8] text-white rounded-xl hover:bg-[#4bb4b4] transition-colors text-sm font-semibold shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Novo Tópico
                </button>
              )}

              {showNewTopic && (
                <form
                  onSubmit={handleCreateTopic}
                  className="premium-card p-5 space-y-4 bg-white border-2 border-[#5AC8C8]/25"
                >
                  {/* (Mesmo form de Novo Tópico acima, renderizado dinamicamente) */}
                  <input
                    type="text"
                    placeholder="Título do tópico"
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-[#5AC8C8]/10 focus:border-[#5AC8C8] outline-none text-sm font-medium"
                    maxLength={200}
                    required
                  />
                  <textarea
                    placeholder="Descrição (opcional)"
                    value={newTopicDesc}
                    onChange={(e) => setNewTopicDesc(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-[#5AC8C8]/10 focus:border-[#5AC8C8] outline-none text-sm resize-none"
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
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#5AC8C8] text-white rounded-xl hover:bg-[#4bb4b4] disabled:opacity-50"
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
                  plataforma
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
                className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-[#5AC8C8]/10 focus:border-[#5AC8C8] outline-none text-sm font-medium transition-all"
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
                  : "Não há novos clubes para explorar no momento."
              }
              icon={Globe}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {explorableClubs.map((club) => (
                <ClubExploreCard
                  key={club.id}
                  club={club}
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
                <div className="flex items-center gap-2 text-[#5AC8C8] font-medium text-sm bg-[#5AC8C8]/10 px-4 py-2 rounded-full">
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
  </>
  );
}
