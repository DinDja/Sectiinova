import React, { startTransition, useState, useRef, useEffect } from "react";
import {
  Search,
  LogOut,
  X,
  ChevronDown,
  User,
  BookOpen,
  PanelLeft,
} from "lucide-react";
import MeuPerfil from "./MeuPerfil";

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
  currentView,
  setCurrentView,
  onToggleSidebar = () => {},
  isSidebarOpen = false,
}) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchInputValue, setSearchInputValue] = useState(searchTerm);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileNavViewport, setIsMobileNavViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 1024;
  });

  const searchInputRef = useRef(null);
  const userMenuRef = useRef(null);

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
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowUserMenu(false);
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

  const userName = loggedUser?.nome || leadUser?.nome || "Usuário";
  const userEmail = loggedUser?.email || leadUser?.email || "usuario@email.com";
  const userAvatar =
    loggedUser?.fotoBase64 ||
    loggedUser?.fotoUrl ||
    loggedUser?.avatar ||
    leadUser?.avatar ||
    null;
  const contextClub = myClub || null;
  const contextClubLogoUrl = String(
    contextClub?.logo_url || contextClub?.logo || "",
  ).trim();
  const contextName =
    myClub?.nome ||
    String(loggedUser?.escola_nome || "").trim() ||
    "UNIDADE NÃO VINCULADA";

  const contextParts = contextName.split(" ");
  const isCollege = contextName.toUpperCase().includes("COLÉGIO ESTADUAL");
  let contextLine1 = "";
  let contextLine2 = contextName;

  if (isCollege) {
    contextLine1 = contextParts.slice(0, 2).join(" ");
    contextLine2 = contextParts.slice(2).join(" ");
  } else {
    contextLine1 = contextName;
    contextLine2 = "";
  }

  const isSearchDisabled = currentView !== "Projetos";

  const renderSearchForm = (isMobile = false) => (
    <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
      <Search
        className={`absolute left-4 h-5 w-5 stroke-[3] transition-colors duration-200 ${
          isSearchDisabled ? "text-slate-400" : "text-slate-900"
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
        className={`w-full rounded-2xl border-4 outline-none transition-all duration-300 ${
          isMobile
            ? "py-3 pl-12 pr-24 text-xs"
            : "py-4 pl-12 pr-28 text-xs sm:text-sm"
        } font-black uppercase tracking-widest ${
          isSearchDisabled
            ? "cursor-not-allowed border-slate-400 bg-slate-200 text-slate-500"
            : "border-slate-900 bg-white text-slate-900 placeholder:text-slate-400 shadow-[4px_4px_0px_0px_#0f172a] focus:-translate-x-1 focus:-translate-y-1 focus:shadow-[4px_4px_0px_0px_#14b8a6]"
        }`}
        value={searchInputValue}
        onChange={(event) => setSearchInputValue(event.target.value)}
        aria-label="Campo de busca"
        disabled={isSearchDisabled}
        title={
          isSearchDisabled ? "A busca só está disponível no Feed de Projetos." : ""
        }
      />

      <div className="absolute right-2 flex items-center gap-2">
        {searchInputValue && !isSearchDisabled && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="rounded-lg border-2 border-slate-900 bg-red-400 p-1.5 text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#0f172a]"
            aria-label="Limpar busca"
          >
            <X className="h-4 w-4 stroke-[3]" />
          </button>
        )}

        <button
          type="submit"
          disabled={isSearchDisabled}
          className={`rounded-xl border-2 px-3 py-2 text-xs font-black uppercase tracking-widest transition-all ${
            isSearchDisabled
              ? "cursor-not-allowed border-slate-400 bg-slate-300 text-slate-500"
              : "border-slate-900 bg-teal-400 text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a]"
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
        className={`z-10 w-full border-b-4 border-slate-900 bg-[#FAFAFA] transition-all duration-300 ${
          isScrolled ? "shadow-[0_8px_0_0_#0f172a]" : ""
        }`}
      >
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div
            className={`flex items-center justify-between gap-3 ${
              isScrolled ? "py-2" : "py-3"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              {isMobileNavViewport && (
                <button
                  type="button"
                  onClick={onToggleSidebar}
                  className="inline-flex items-center justify-center rounded-xl border-4 border-slate-900 bg-yellow-300 p-2.5 text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transition-all active:translate-y-1 active:shadow-none"
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
                className={`items-center gap-2 transition-all duration-300 ${
                  isSearchExpanded ? "hidden sm:flex" : "flex"
                }`}
              >
                <img
                  src="/logo-sistema.svg"
                  alt="Logo do sistema"
                  className="mb-1 w-[112px] shrink-0 object-contain sm:mb-0 sm:w-[150px] lg:w-[170px]"
                  loading="lazy"
                />
              </div>
            </div>

            <div className="hidden flex-1 max-w-2xl sm:block">
              {renderSearchForm(false)}
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {contextName && (
                <div className="hidden items-center gap-3 rounded-2xl border-4 border-slate-900 bg-pink-400 px-3 py-2 shadow-[4px_4px_0px_0px_#0f172a] xl:flex">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-slate-900 bg-white shadow-[2px_2px_0px_0px_#0f172a]">
                    {contextClubLogoUrl ? (
                      <img
                        src={contextClubLogoUrl}
                        alt={`Logo ${contextName}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-black text-slate-900">
                        {getInitials(contextClub?.nome || contextName)}
                      </span>
                    )}
                  </div>
                  <div className="flex max-w-[120px] flex-col leading-none" title={contextLine1}>
                    <span className="line-clamp-1 text-xs font-black uppercase tracking-widest text-slate-900">
                      {contextLine1}
                    </span>
                    {contextLine2 && (
                      <span className="mt-1 line-clamp-1 text-[9px] font-bold uppercase tracking-widest text-slate-800">
                        {contextLine2}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsSearchExpanded((expanded) => !expanded)}
                className="rounded-xl border-4 border-slate-900 bg-yellow-300 p-2.5 text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transition-all active:translate-y-1 active:shadow-none sm:hidden"
                aria-label={isSearchExpanded ? "Fechar busca" : "Abrir busca"}
              >
                {isSearchExpanded ? (
                  <X className="h-5 w-5 stroke-[3]" />
                ) : (
                  <Search className="h-5 w-5 stroke-[3]" />
                )}
              </button>

              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowUserMenu((open) => !open)}
                  aria-expanded={showUserMenu}
                  aria-haspopup="true"
                  className={`group flex items-center gap-2 rounded-2xl border-4 p-1.5 pr-2.5 transition-all duration-300 sm:gap-3 sm:p-2 sm:pr-4 ${
                    showUserMenu
                      ? "translate-y-0 border-slate-900 bg-teal-400 shadow-[4px_4px_0px_0px_#0f172a]"
                      : "border-slate-900 bg-white shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a]"
                  }`}
                >
                  <div className="relative">
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt={`Avatar de ${userName}`}
                        className="h-9 w-9 rounded-xl border-2 border-slate-900 object-cover sm:h-10 sm:w-10"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-slate-900 bg-blue-400 text-sm font-black text-slate-900 sm:h-10 sm:w-10">
                        {getInitials(userName)}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-slate-900 bg-teal-400" />
                  </div>

                  <div className="hidden text-left md:flex md:flex-col md:items-start">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-900 leading-tight">
                      {userName.split(" ")[0]}
                    </span>
                  </div>

                  <ChevronDown
                    className={`hidden h-4 w-4 stroke-[3] text-slate-900 transition-transform duration-300 md:block ${
                      showUserMenu ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-3 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border-4 border-slate-900 bg-white shadow-[8px_8px_0px_0px_#0f172a] z-[9999]">
                    <div className="border-b-4 border-slate-900 bg-yellow-300 p-5">
                      <p className="truncate text-base font-black uppercase tracking-tighter text-slate-900">
                        {userName}
                      </p>
                      <p className="mt-1 inline-block max-w-[220px] truncate border-2 border-slate-900 bg-white px-2 py-0.5 text-xs font-bold text-slate-800">
                        {userEmail}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 bg-[#FAFAFA] p-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(true);
                          setShowUserMenu(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border-2 border-slate-900 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transition-all hover:-translate-y-0.5 hover:bg-teal-400 hover:shadow-[4px_4px_0px_0px_#0f172a]"
                        role="menuitem"
                      >
                        <User className="h-5 w-5 stroke-[2.5]" />
                        Meu Perfil
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCurrentView("meusProjetos");
                          setShowUserMenu(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border-2 border-slate-900 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transition-all hover:-translate-y-0.5 hover:bg-blue-400 hover:shadow-[4px_4px_0px_0px_#0f172a]"
                        role="menuitem"
                      >
                        <BookOpen className="h-5 w-5 stroke-[2.5]" />
                        Meus Projetos
                      </button>
                    </div>

                    <div className="border-t-4 border-slate-900 bg-slate-200 p-3">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-slate-900 bg-red-500 px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-[2px_2px_0px_0px_#0f172a] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a]"
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

          {isSearchExpanded && (
            <div className="pb-3 sm:hidden">{renderSearchForm(true)}</div>
          )}
        </div>
      </header>

      {isProfileOpen && (
        <MeuPerfil
          loggedUser={loggedUser}
          myClub={myClub}
          onSaveProfile={onSaveProfile}
          onClose={() => setIsProfileOpen(false)}
        />
      )}
    </>
  );
}
