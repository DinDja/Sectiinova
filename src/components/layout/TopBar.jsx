import React, { startTransition, useState, useRef, useEffect } from "react";
import {
  Search,
  LogOut,
  X,
  ChevronDown,
  User,
  BookOpen,
  PanelLeft,
  Bell,
  Check,
  Sparkles,
} from "lucide-react";
import MeuPerfil from "./MeuPerfil";
import { useTutorial } from "../../contexts/TutorialContext";

function getInitials(value) {
  if (!value) return "?";
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export default function TopBar({
  searchTerm,
  setSearchTerm,
  loggedUser,
  leadUser,
  selectedClub,
  myClub,
  viewingClub,
  handleLogout,
  onSaveProfile,
  schools = [],
  users = [],
  clubJoinRequests = [],
  reviewingClubRequestIds = new Set(),
  onRespondClubJoinRequest = async () => {},
  canManageClubJoinRequests = false,
  onChangeClubCardTemplate = async () => {},
  currentView,
  setCurrentView,
  onToggleSidebar = () => {},
  isSidebarOpen = false,
  uiStyleId = "neo",
  fontSizeLevel = 2,
  onDecreaseFont = () => {},
  onResetFont = () => {},
  onIncreaseFont = () => {},
}) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchInputValue, setSearchInputValue] = useState(searchTerm);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationFeedback, setNotificationFeedback] = useState({
    type: "",
    message: "",
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileNavViewport, setIsMobileNavViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 1024;
  });
  const isMaterialStyle = uiStyleId === "material";
  const isModernStyle = uiStyleId === "modern";
  const {
    startTutorialFromCurrentView,
    startTutorialFromBeginning,
    hasCompletedTutorial,
  } = useTutorial();

  const searchInputRef = useRef(null);
  const userMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);

  useEffect(() => {
    setSearchInputValue(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");

    const handleViewportChange = (event) => {
      setIsMobileNavViewport(event.matches);
    };

    setIsMobileNavViewport(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleViewportChange);
      return () =>
        mediaQuery.removeEventListener("change", handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (
        notificationMenuRef.current &&
        !notificationMenuRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowUserMenu(false);
        setShowNotifications(false);
        setIsProfileOpen(false);
        setIsSearchExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    if (currentView !== "Projetos") return;

    startTransition(() => {
      setSearchTerm(searchInputValue.trim());
    });

    if (window.innerWidth < 640) {
      setIsSearchExpanded(false);
      searchInputRef.current?.blur();
    }
  };

  const handleClearSearch = () => {
    setSearchInputValue("");
    startTransition(() => {
      setSearchTerm("");
    });
    searchInputRef.current?.focus();
  };

  const normalizedClubJoinRequests = Array.isArray(clubJoinRequests)
    ? clubJoinRequests
    : [];
  const joinRequestsCount = normalizedClubJoinRequests.length;
  const shouldShowJoinRequestNotification = Boolean(canManageClubJoinRequests);

  const formatRequestDate = (dateValue) => {
    if (!dateValue) return "";
    const date =
      typeof dateValue?.toDate === "function"
        ? dateValue.toDate()
        : new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const setNotificationToast = (type, message) => {
    setNotificationFeedback({ type, message });
    window.setTimeout(() => {
      setNotificationFeedback((current) =>
        current.message === message ? { type: "", message: "" } : current,
      );
    }, 4000);
  };

  const handleJoinRequestDecision = async (requestId, accept) => {
    const normalizedRequestId = String(requestId || "").trim();
    if (!normalizedRequestId) return;

    try {
      await onRespondClubJoinRequest(normalizedRequestId, accept);
      setNotificationToast(
        "success",
        accept ? "Solicitação aceita com sucesso." : "Solicitação recusada.",
      );
    } catch (error) {
      const message =
        String(error?.message || "").trim() ||
        "Não foi possível processar esta solicitação.";
      setNotificationToast("error", message);
    }
  };

  const userName = loggedUser?.nome || leadUser?.nome || "Usuário";
  const userEmail = loggedUser?.email || leadUser?.email || "usuario@email.com";
  const userAvatar =
    loggedUser?.fotoBase64 ||
    loggedUser?.fotoUrl ||
    loggedUser?.avatar ||
    leadUser?.avatar ||
    null;
  const contextClub = myClub || viewingClub || selectedClub || null;
  const contextClubLogoUrl = String(
    contextClub?.logo_url || contextClub?.logo || "",
  ).trim();
  const contextClubName = String(contextClub?.nome || "").trim();
  const contextSchoolName = String(
    loggedUser?.escola_nome || contextClub?.escola_nome || "",
  ).trim();

  const isSearchDisabled = currentView !== "Projetos";
  const currentViewLabelMap = {
    Projetos: "Feed de Projetos",
    meusProjetos: "Meus Projetos",
    trilha: "Trilha Pedagogica",
    biblioteca: "Biblioteca Livre",
    popEventos: "POP Eventos",
    inpi: "PatentesLab",
    forum: "Forum",
    clube: "Meu Clube",
    diario: "Diário de Bordo",
  };
  const currentViewLabel = currentViewLabelMap[currentView] || "Workspace";
  const canDecreaseFont = fontSizeLevel > 1;
  const canIncreaseFont = fontSizeLevel < 4;

  const handleTutorialClick = (event) => {
    if (event?.shiftKey) {
      startTutorialFromBeginning();
      return;
    }

    startTutorialFromCurrentView();
  };

  const renderFontSizer = () => (
    <div
      className={`inline-flex items-center gap-1 p-1 shadow-sm ${
        isMaterialStyle
          ? "rounded-xl border border-slate-200 bg-white"
          : isModernStyle
            ? "rounded-lg border border-slate-200 bg-white"
            : "rounded-full border-[3px] border-slate-900 bg-white"
      }`}
      aria-label="Controle de tamanho da fonte"
    >
      <button
        type="button"
        onClick={onDecreaseFont}
        disabled={!canDecreaseFont}
        className={`inline-flex h-7 w-7 items-center justify-center text-slate-900 transition-transform active:scale-95 disabled:opacity-40 ${
          isMaterialStyle
            ? "rounded-lg hover:bg-slate-100"
            : isModernStyle
              ? "rounded-md hover:bg-slate-100"
              : "rounded-full border-[2px] border-slate-900 bg-yellow-300 hover:scale-105"
        }`}
        aria-label="Diminuir fonte"
        title="Diminuir fonte"
      >
        A-
      </button>
      <button
        type="button"
        onClick={onResetFont}
        className={`hidden h-7 min-w-[2.1rem] items-center justify-center px-2 text-[11px] text-slate-900 transition-transform active:scale-95 sm:inline-flex ${
          isMaterialStyle
            ? "rounded-lg border border-slate-200 bg-slate-50 font-semibold hover:bg-slate-100"
            : isModernStyle
              ? "rounded-md border border-slate-200 bg-slate-50 font-semibold hover:bg-slate-100"
              : "rounded-full border-[2px] border-slate-900 bg-white font-black uppercase tracking-wider hover:scale-105"
        }`}
        aria-label="Resetar fonte"
        title="Fonte padrão"
      >
        A
      </button>
      <button
        type="button"
        onClick={onIncreaseFont}
        disabled={!canIncreaseFont}
        className={`inline-flex h-7 w-7 items-center justify-center text-slate-900 transition-transform active:scale-95 disabled:opacity-40 ${
          isMaterialStyle
            ? "rounded-lg hover:bg-slate-100"
            : isModernStyle
              ? "rounded-md hover:bg-slate-100"
              : "rounded-full border-[2px] border-slate-900 bg-cyan-300 hover:scale-105"
        }`}
        aria-label="Aumentar fonte"
        title="Aumentar fonte"
      >
        A+
      </button>
    </div>
  );

  const renderSearchForm = (isMobile = false, tutorialAnchorId = "") => (
    <form
      onSubmit={handleSearchSubmit}
      className="relative flex items-center w-full group"
      data-tutorial-anchor={tutorialAnchorId || undefined}
    >
      <Search
        className={`absolute left-4 h-4 w-4 transition-colors duration-300 z-10 2xl:left-5 2xl:h-5 2xl:w-5 ${
          isSearchDisabled
            ? "text-slate-400"
            : isMaterialStyle
              ? "text-slate-400 group-focus-within:text-slate-600"
              : "stroke-[3] text-cyan-500 group-focus-within:text-pink-500"
        }`}
      />

      <input
        ref={searchInputRef}
        type="text"
        placeholder={
          isSearchDisabled
            ? "BUSCA RESTRITA AO FEED DE PROJETOS"
            : "BUSCAR PROJETOS, CLUBES, PESQUISADORES..."
        }
        className={`w-full outline-none transition-all duration-300 ${
          isMobile
            ? "py-3 pl-14 pr-24 text-xs"
            : "py-2.5 pl-12 pr-24 text-[11px] 2xl:py-3.5 2xl:pl-14 2xl:pr-28 2xl:text-sm"
        } ${
          isMaterialStyle
            ? "rounded-xl border px-0 font-semibold tracking-normal"
            : "rounded-full border-[3px] font-black uppercase tracking-widest"
        } ${
          isSearchDisabled
            ? "cursor-not-allowed border-slate-300 bg-slate-100 text-slate-500"
            : isMaterialStyle
              ? "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
              : "border-slate-900 bg-white text-slate-900 placeholder:text-slate-400 shadow-sm focus:ring-4 focus:ring-cyan-300/30 focus:border-cyan-400"
        }`}
        value={searchInputValue}
        onChange={(event) => setSearchInputValue(event.target.value)}
        aria-label="Campo de busca"
        disabled={isSearchDisabled}
        title={
          isSearchDisabled ? "A busca só está disponível no Feed de Projetos." : ""
        }
      />

      <div className="absolute right-2 flex items-center gap-1.5 2xl:gap-2">
        {searchInputValue && !isSearchDisabled && (
          <button
            type="button"
            onClick={handleClearSearch}
            className={`p-1.5 shadow-sm transition-transform active:scale-95 ${
              isMaterialStyle
                ? "rounded-lg border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "rounded-full border-[3px] border-slate-900 bg-pink-500 text-white hover:scale-110"
            }`}
            aria-label="Limpar busca"
          >
            <X className={`h-4 w-4 ${isMaterialStyle ? "" : "stroke-[3]"}`} />
          </button>
        )}

        <button
          type="submit"
          disabled={isSearchDisabled}
          className={`px-3 py-1.5 text-[11px] transition-transform 2xl:px-4 2xl:py-2 2xl:text-xs ${
            isMaterialStyle
              ? "rounded-lg border font-semibold tracking-normal"
              : "rounded-full border-[3px] font-black uppercase tracking-widest"
          } ${
            isSearchDisabled
              ? "cursor-not-allowed border-slate-300 bg-slate-200 text-slate-400"
              : isMaterialStyle
                ? "border-slate-200 bg-slate-900 text-white shadow-sm hover:bg-slate-800 active:scale-95"
                : "border-slate-900 bg-cyan-400 text-slate-900 shadow-sm hover:scale-105 hover:bg-cyan-300 active:scale-95"
          }`}
          aria-label="Buscar"
        >
          Buscar
        </button>
      </div>
    </form>
  );

  return (
    <>
      <header
        className={`z-40 w-full sticky top-0 transition-all duration-300 ${
          isMaterialStyle
            ? `border-b border-slate-200 bg-white/95 backdrop-blur-md ${
                isScrolled ? "shadow-[0_8px_30px_rgba(15,23,42,0.08)]" : ""
              }`
            : `border-b-[3px] border-slate-900 bg-white ${
                isScrolled ? "shadow-md bg-white/95 backdrop-blur-sm" : ""
              }`
        }`}
      >
        <div
          className={`mx-auto px-3 sm:px-4 lg:px-5 2xl:px-8 ${
            isMaterialStyle ? "max-w-[96rem]" : "max-w-[92rem]"
          }`}
        >
          <div
            className={`flex items-center justify-between transition-all duration-300 ${
              isMaterialStyle ? "gap-3 py-3" : "gap-2 2xl:gap-3"
            } ${
              isMaterialStyle ? "" : isScrolled ? "py-2" : "py-2.5 sm:py-3 2xl:py-4"
            }`}
          >
            <div
              className={`flex min-w-0 items-center ${
                isMaterialStyle ? "gap-3" : "gap-3"
              }`}
            >
              {isMobileNavViewport && (
                <button
                  type="button"
                  onClick={onToggleSidebar}
                  className={`inline-flex items-center justify-center text-slate-900 transition-transform active:scale-95 ${
                    isMaterialStyle
                      ? "rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm hover:bg-slate-100"
                      : "rounded-full border-[3px] border-slate-900 bg-yellow-400 p-2.5 shadow-sm hover:scale-105"
                  }`}
                  aria-label={isSidebarOpen ? "Fechar menu" : "Abrir menu"}
                >
                  {isSidebarOpen ? (
                    <X className="h-5 w-5 stroke-[3]" />
                  ) : (
                    <PanelLeft className="h-5 w-5 stroke-[3]" />
                  )}
                </button>
              )}

              <div
                className={`items-center transition-all duration-300 ${
                  isSearchExpanded ? "hidden sm:flex" : "flex"
                }`}
                data-tutorial-anchor="topbar-brand"
              >
                {isMaterialStyle ? (
                  <div className="flex items-center gap-3">
                    <img
                      src="/logo-sistema.svg"
                      alt="Logo do sistema"
                      className="w-[108px] shrink-0 object-contain sm:w-[122px] lg:w-[128px] xl:w-[136px]"
                      loading="lazy"
                    />
                    <div className="hidden min-w-0 md:block">
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                        {currentViewLabel}
                      </p>
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {contextClubName || "Ambiente geral"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <img
                    src="/logo-sistema.svg"
                    alt="Logo do sistema"
                    className="w-[112px] shrink-0 object-contain sm:w-[132px] lg:w-[128px] xl:w-[140px] 2xl:w-[160px] transform hover:rotate-2 transition-transform duration-300 origin-left"
                    loading="lazy"
                  />
                )}
              </div>
            </div>

            <div
              className={`hidden min-w-0 flex-1 max-w-xl sm:block mx-2 lg:mx-3 2xl:mx-4 2xl:max-w-2xl ${
                isMaterialStyle ? "sm:hidden" : ""
              }`}
            >
              {renderSearchForm(false, "topbar-search")}
            </div>

            <div
              className={`flex shrink-0 items-center ${
                isMaterialStyle ? "gap-2" : "gap-2 2xl:gap-3"
              }`}
            >
              <button
                type="button"
                onClick={handleTutorialClick}
                className={`inline-flex items-center gap-1.5 p-2.5 text-slate-900 transition-transform active:scale-95 ${
                  isMaterialStyle
                    ? "rounded-xl border border-slate-200 bg-white shadow-sm hover:bg-slate-100"
                    : isModernStyle
                      ? "rounded-lg border border-slate-200 bg-white hover:border-slate-300"
                      : "rounded-full border-[3px] border-slate-900 bg-cyan-300 hover:scale-105"
                }`}
                title="Abrir guia animado (Shift para tour completo)"
                aria-label="Abrir guia animado"
                data-tutorial-anchor="topbar-help"
              >
                <Sparkles className="h-4 w-4" />
                <span
                  className={`hidden text-[11px] font-semibold lg:inline ${
                    isMaterialStyle || isModernStyle ? "" : "font-black uppercase tracking-wide"
                  }`}
                >
                  {hasCompletedTutorial ? "Rever guia" : "Guia"}
                </span>
              </button>

              {renderFontSizer()}

              {shouldShowJoinRequestNotification && (
                <div className="relative" ref={notificationMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifications((open) => !open);
                      setShowUserMenu(false);
                    }}
                    aria-expanded={showNotifications}
                    aria-haspopup="true"
                    className={`relative inline-flex items-center justify-center p-2.5 text-slate-900 shadow-sm transition-transform active:scale-95 ${
                      isMaterialStyle
                        ? `rounded-xl border border-slate-200 ${
                            showNotifications ? "bg-slate-100" : "bg-white"
                          } hover:bg-slate-100`
                        : isModernStyle
                          ? `rounded-lg border border-slate-200 ${
                              showNotifications
                                ? "bg-slate-900 text-white"
                                : "bg-white text-slate-700"
                            } hover:border-slate-300`
                        : `rounded-full border-[3px] border-slate-900 ${
                            showNotifications ? "bg-yellow-400" : "bg-white"
                          } hover:scale-105`
                    }`}
                    title="Solicitações de entrada"
                  >
                    <Bell className="h-5 w-5 stroke-[3]" />
                    <span className="sr-only">Solicitações de entrada</span>
                    {joinRequestsCount > 0 && (
                      <span
                        className={`absolute -right-1.5 -top-1.5 inline-flex min-w-[1.35rem] items-center justify-center px-1 py-0.5 text-[10px] text-white ${
                          isMaterialStyle
                            ? "rounded-full bg-red-500 font-semibold"
                            : isModernStyle
                              ? "rounded-full bg-slate-700 font-semibold"
                            : "rounded-full border-[2px] border-slate-900 bg-pink-500 font-black"
                        }`}
                      >
                        {joinRequestsCount > 99 ? "99+" : joinRequestsCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div
                      className={`absolute right-0 mt-3 w-[min(26rem,calc(100vw-1rem))] overflow-hidden bg-white z-[9999] origin-top-right animate-in fade-in zoom-in duration-200 ${
                        isMaterialStyle
                          ? "rounded-2xl border border-slate-200 shadow-[0_18px_40px_rgba(15,23,42,0.16)]"
                          : isModernStyle
                            ? "rounded-xl border border-slate-200 shadow-[0_12px_30px_rgba(15,23,42,0.1)]"
                          : "rounded-[2rem] border-[3px] border-slate-900 shadow-2xl"
                      }`}
                    >
                      <div
                        className={`px-5 py-4 ${
                          isMaterialStyle
                            ? "border-b border-slate-200 bg-slate-50"
                            : isModernStyle
                              ? "border-b border-slate-200 bg-white"
                            : "border-b-[3px] border-slate-900 bg-yellow-400"
                        }`}
                      >
                        <p
                          className={`text-xs text-slate-900 ${
                            isMaterialStyle
                              ? "font-semibold tracking-normal"
                              : isModernStyle
                                ? "font-semibold tracking-wide uppercase"
                              : "font-black uppercase tracking-widest"
                          }`}
                        >
                          Solicitações de Entrada
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-slate-700">
                          {viewingClub?.nome
                            ? `Clube atual: ${viewingClub.nome}`
                            : "Clube selecionado"}
                        </p>
                      </div>

                      {notificationFeedback.message && (
                        <div
                          className={`px-4 py-3 text-[11px] ${
                            isMaterialStyle
                              ? "border-b border-slate-200 font-medium"
                              : isModernStyle
                                ? "border-b border-slate-200 font-medium"
                              : "border-b-[3px] border-slate-900 font-black uppercase tracking-wider"
                          } ${
                            notificationFeedback.type === "error"
                              ? "bg-pink-500 text-white"
                              : "bg-cyan-300 text-slate-900"
                          }`}
                        >
                          {notificationFeedback.message}
                        </div>
                      )}

                      <div
                        className={`max-h-[22rem] space-y-3 overflow-y-auto p-4 ${
                          isMaterialStyle ? "bg-white" : "bg-slate-50"
                        } ${
                          isModernStyle ? "bg-white" : ""
                        }`}
                      >
                        {normalizedClubJoinRequests.length === 0 ? (
                          <div
                            className={`rounded-[1.2rem] border border-dashed border-slate-300 bg-white px-4 py-7 text-center text-[11px] text-slate-500 ${
                              isMaterialStyle
                                ? "font-medium"
                                : isModernStyle
                                  ? "font-medium"
                                : "border-[3px] font-black uppercase tracking-widest"
                            }`}
                          >
                            Nenhuma solicitação pendente.
                          </div>
                        ) : (
                          normalizedClubJoinRequests.map((request) => {
                            const requestId = String(request?.id || "").trim();
                            const requesterName = String(
                              request?.solicitante_nome || "Estudante",
                            ).trim();
                            const requesterEmail = String(
                              request?.solicitante_email || "",
                            ).trim();
                            const requestDate = formatRequestDate(
                              request?.createdAt,
                            );
                            const isReviewing =
                              reviewingClubRequestIds instanceof Set &&
                              reviewingClubRequestIds.has(requestId);

                            return (
                              <article
                                key={requestId}
                                className={`rounded-[1.35rem] bg-white p-4 ${
                                  isMaterialStyle
                                    ? "border border-slate-200 shadow-sm"
                                    : isModernStyle
                                      ? "border border-slate-200 shadow-none"
                                    : "border-[3px] border-slate-900 shadow-sm"
                                }`}
                              >
                                <p
                                  className={`text-sm text-slate-900 ${
                                    isMaterialStyle
                                      ? "font-semibold"
                                      : isModernStyle
                                        ? "font-semibold"
                                      : "font-black uppercase"
                                  }`}
                                >
                                  {requesterName}
                                </p>
                                {requesterEmail && (
                                  <p className="mt-1 text-xs font-bold text-slate-600">
                                    {requesterEmail}
                                  </p>
                                )}
                                {requestDate && (
                                  <p
                                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] text-slate-900 ${
                                      isMaterialStyle
                                        ? "border border-slate-200 bg-slate-100 font-medium"
                                        : isModernStyle
                                          ? "border border-slate-200 bg-white font-medium"
                                        : "border-[2px] border-slate-900 bg-yellow-300 font-black uppercase tracking-wider"
                                    }`}
                                  >
                                    Solicitado em {requestDate}
                                  </p>
                                )}

                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleJoinRequestDecision(
                                        requestId,
                                        false,
                                      )
                                    }
                                    disabled={isReviewing}
                                    className={`inline-flex items-center justify-center rounded-full bg-white px-3 py-2 text-[10px] text-pink-600 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 ${
                                      isMaterialStyle
                                        ? "border border-slate-200 font-semibold"
                                        : isModernStyle
                                          ? "border border-slate-200 font-semibold hover:bg-slate-50"
                                        : "border-[3px] border-slate-900 font-black uppercase tracking-widest"
                                    }`}
                                  >
                                    Recusar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleJoinRequestDecision(
                                        requestId,
                                        true,
                                      )
                                    }
                                    disabled={isReviewing}
                                    className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[10px] text-slate-900 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 ${
                                      isMaterialStyle
                                        ? "border border-slate-200 bg-slate-100 font-semibold"
                                        : isModernStyle
                                          ? "border border-slate-200 bg-slate-900 text-white font-semibold hover:bg-slate-800"
                                        : "border-[3px] border-slate-900 bg-cyan-300 font-black uppercase tracking-widest"
                                    }`}
                                  >
                                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                                    {isReviewing ? "..." : "Aceitar"}
                                  </button>
                                </div>
                              </article>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isMaterialStyle && (
                <button
                  type="button"
                  onClick={() => setIsSearchExpanded((expanded) => !expanded)}
                  className="rounded-full border-[3px] border-slate-900 bg-cyan-400 p-2.5 text-slate-900 shadow-sm transition-transform active:scale-95 hover:scale-105 sm:hidden"
                  aria-label={isSearchExpanded ? "Fechar busca" : "Abrir busca"}
                >
                  {isSearchExpanded ? (
                    <X className="h-5 w-5 stroke-[3]" />
                  ) : (
                    <Search className="h-5 w-5 stroke-[3]" />
                  )}
                </button>
              )}

              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu((open) => !open);
                    setShowNotifications(false);
                  }}
                  aria-expanded={showUserMenu}
                  aria-haspopup="true"
                  data-tutorial-anchor="topbar-profile"
                  className={`group flex items-center gap-2 transition-all duration-300 sm:gap-2 sm:pr-3 ${
                    isMaterialStyle
                      ? `rounded-xl border p-1.5 pr-2 ${
                          showUserMenu
                            ? "border-slate-300 bg-slate-100 shadow-sm"
                            : "border-slate-200 bg-white shadow-sm hover:bg-slate-100"
                        }`
                      : isModernStyle
                        ? `rounded-lg border p-1.5 pr-2 ${
                            showUserMenu
                              ? "border-slate-300 bg-white shadow-sm"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`
                      : `rounded-full border-[3px] p-1 pr-2 2xl:gap-3 2xl:p-1.5 2xl:pr-4 ${
                          showUserMenu
                            ? "border-slate-900 bg-yellow-400 shadow-md scale-105"
                            : "border-slate-900 bg-slate-50 shadow-sm hover:scale-105 hover:bg-yellow-100"
                        }`
                  }`}
                >
                  <div className="relative">
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt={`Avatar de ${userName}`}
                        className={`h-9 w-9 rounded-full object-cover bg-white ${
                          isMaterialStyle
                            ? "border border-slate-300"
                            : isModernStyle
                              ? "border border-slate-300"
                            : "border-[3px] border-slate-900"
                        } 2xl:h-10 2xl:w-10`}
                      />
                    ) : (
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm text-slate-900 2xl:h-10 2xl:w-10 ${
                          isMaterialStyle
                            ? "border border-slate-300 bg-slate-100 font-semibold"
                            : isModernStyle
                              ? "border border-slate-300 bg-white font-semibold"
                            : "border-[3px] border-slate-900 bg-cyan-300 font-black"
                        }`}
                      >
                        {getInitials(userName)}
                      </div>
                    )}
                  </div>

                  <div className="hidden text-left xl:flex xl:flex-col xl:items-start">
                    <span
                      className={`text-xs leading-tight text-slate-900 ${
                        isMaterialStyle
                          ? "font-semibold tracking-normal"
                          : isModernStyle
                            ? "font-semibold tracking-normal"
                          : "font-black uppercase tracking-widest"
                      }`}
                    >
                      {userName.split(" ")[0]}
                    </span>
                  </div>

                  <ChevronDown
                    className={`hidden h-4 w-4 text-slate-900 transition-transform duration-300 xl:block ${
                      isMaterialStyle || isModernStyle ? "" : "stroke-[3]"
                    } ${
                      showUserMenu ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showUserMenu && (
                  <div
                    className={`absolute right-0 mt-3 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden bg-white z-[9999] origin-top-right animate-in fade-in zoom-in duration-200 ${
                      isMaterialStyle
                        ? "rounded-2xl border border-slate-200 shadow-[0_18px_40px_rgba(15,23,42,0.16)]"
                        : isModernStyle
                          ? "rounded-xl border border-slate-200 shadow-[0_12px_28px_rgba(15,23,42,0.1)]"
                        : "rounded-[2rem] border-[3px] border-slate-900 shadow-2xl"
                    }`}
                  >
                    <div
                      className={`p-6 relative overflow-hidden ${
                        isMaterialStyle
                          ? "border-b border-slate-200 bg-slate-50"
                          : isModernStyle
                            ? "border-b border-slate-200 bg-white"
                          : "border-b-[3px] border-slate-900 bg-yellow-400"
                      }`}
                    >
                      {!isMaterialStyle && !isModernStyle && (
                        <div
                          className="absolute inset-0 opacity-10 pointer-events-none"
                          style={{
                            backgroundImage:
                              "radial-gradient(#000 2.5px, transparent 2.5px)",
                            backgroundSize: "12px 12px",
                          }}
                        />
                      )}
                      <p
                        className={`truncate text-lg text-slate-900 relative z-10 ${
                          isMaterialStyle
                            ? "font-semibold tracking-normal"
                            : isModernStyle
                              ? "font-semibold tracking-normal"
                            : "font-black uppercase tracking-tighter"
                        }`}
                      >
                        {userName}
                      </p>
                      <p
                        className={`mt-1.5 inline-block max-w-full truncate rounded-full bg-white px-3 py-1 text-[10px] text-slate-700 relative z-10 ${
                          isMaterialStyle
                            ? "border border-slate-200 font-medium"
                            : isModernStyle
                              ? "border border-slate-200 font-medium"
                            : "border-[2.5px] border-slate-900 font-bold"
                        }`}
                      >
                        {userEmail}
                      </p>
                      <div
                        className={`relative z-10 mt-3 flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 ${
                          isMaterialStyle
                            ? "border border-slate-200"
                            : isModernStyle
                              ? "border border-slate-200"
                            : "border-[3px] border-slate-900"
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full ${
                            isMaterialStyle
                              ? "border border-slate-200 bg-slate-100"
                              : isModernStyle
                                ? "border border-slate-200 bg-white"
                              : "border-[3px] border-slate-900 bg-cyan-300"
                          }`}
                        >
                          {contextClubLogoUrl ? (
                            <img
                              src={contextClubLogoUrl}
                              alt={`Logo ${contextClubName || "do clube"}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] font-black text-slate-900">
                              {getInitials(contextClubName || contextSchoolName || "Clube")}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-[9px] text-slate-600 ${
                              isMaterialStyle
                                ? "font-medium uppercase tracking-[0.12em]"
                                : isModernStyle
                                  ? "font-medium uppercase tracking-[0.12em]"
                                : "font-black uppercase tracking-widest"
                            }`}
                          >
                            Clube
                          </p>
                          <p
                            className={`truncate text-xs text-slate-900 ${
                              isMaterialStyle
                                ? "font-semibold tracking-normal"
                                : isModernStyle
                                  ? "font-semibold tracking-normal"
                                : "font-black uppercase tracking-wider"
                            }`}
                          >
                            {contextClubName || "Sem clube vinculado"}
                          </p>
                          {contextSchoolName && (
                            <p className="mt-1 truncate text-[10px] font-bold text-slate-700">
                              {contextSchoolName}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`flex flex-col gap-2 p-4 ${
                        isMaterialStyle || isModernStyle ? "bg-white" : "bg-slate-50"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(true);
                          setShowUserMenu(false);
                        }}
                        className={`group/item flex w-full items-center gap-3 rounded-full bg-white px-5 py-3 text-xs text-slate-900 transition-all active:scale-95 ${
                          isMaterialStyle
                            ? "border border-slate-200 font-semibold hover:bg-slate-100"
                            : isModernStyle
                              ? "border border-slate-200 font-semibold hover:bg-slate-50"
                            : "border-[3px] border-slate-900 font-black uppercase tracking-widest hover:bg-cyan-300 hover:scale-[1.02]"
                        }`}
                        role="menuitem"
                      >
                        <User className="h-5 w-5 stroke-[2.5] group-hover/item:text-slate-900 text-cyan-500 transition-colors" />
                        Meu Perfil
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCurrentView("meusProjetos");
                          setShowUserMenu(false);
                        }}
                        className={`group/item flex w-full items-center gap-3 rounded-full bg-white px-5 py-3 text-xs text-slate-900 transition-all active:scale-95 ${
                          isMaterialStyle
                            ? "border border-slate-200 font-semibold hover:bg-slate-100"
                            : isModernStyle
                              ? "border border-slate-200 font-semibold hover:bg-slate-50"
                            : "border-[3px] border-slate-900 font-black uppercase tracking-widest hover:bg-pink-400 hover:text-white hover:scale-[1.02]"
                        }`}
                        role="menuitem"
                      >
                        <BookOpen className="h-5 w-5 stroke-[2.5] group-hover/item:text-white text-pink-500 transition-colors" />
                        Meus Projetos
                      </button>
                    </div>

                    <div
                      className={`p-4 ${
                        isMaterialStyle
                          ? "border-t border-slate-200 bg-slate-50"
                          : isModernStyle
                            ? "border-t border-slate-200 bg-white"
                          : "border-t-[3px] border-slate-900 bg-slate-100"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={handleLogout}
                        className={`modern-force-white flex w-full items-center justify-center gap-3 rounded-full px-5 py-3 text-xs text-white transition-all active:scale-95 ${
                          isMaterialStyle
                            ? "border border-slate-900 bg-slate-900 font-semibold hover:bg-slate-800"
                            : isModernStyle
                              ? "border border-slate-900 bg-slate-900 font-semibold hover:bg-slate-800"
                            : "border-[3px] border-slate-900 bg-slate-900 font-black uppercase tracking-widest hover:bg-red-500 hover:scale-[1.02]"
                        }`}
                        role="menuitem"
                      >
                        <LogOut className="h-4 w-4 stroke-[3]" />
                        Encerrar sessão
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {isMaterialStyle && (
            <div className="border-t border-slate-200 pb-3 pt-3">
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">{renderSearchForm(false, "topbar-search")}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                    Modulo: {currentViewLabel}
                  </span>
                  {contextSchoolName && (
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-500">
                      Escola: {contextSchoolName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {!isMaterialStyle && isSearchExpanded && (
            <div className="pb-4 pt-2 sm:hidden animate-in slide-in-from-top-2">
              {renderSearchForm(true, "topbar-search")}
            </div>
          )}
        </div>
      </header>

      {isProfileOpen && (
        <MeuPerfil
          loggedUser={loggedUser}
          myClub={myClub}
          schools={schools}
          users={users}
          onSaveProfile={onSaveProfile}
          onChangeClubCardTemplate={onChangeClubCardTemplate}
          onClose={() => setIsProfileOpen(false)}
        />
      )}
    </>
  );
}
