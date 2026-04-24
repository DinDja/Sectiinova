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
  schools = [],
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
    <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full group">
      <Search
        className={`absolute left-4 h-4 w-4 stroke-[3] transition-colors duration-300 z-10 2xl:left-5 2xl:h-5 2xl:w-5 ${
          isSearchDisabled ? "text-slate-400" : "text-cyan-500 group-focus-within:text-pink-500"
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
        className={`w-full rounded-full border-[3px] outline-none transition-all duration-300 ${
          isMobile
            ? "py-3 pl-14 pr-24 text-xs"
            : "py-2.5 pl-12 pr-24 text-[11px] 2xl:py-3.5 2xl:pl-14 2xl:pr-28 2xl:text-sm"
        } font-black uppercase tracking-widest ${
          isSearchDisabled
            ? "cursor-not-allowed border-slate-300 bg-slate-100 text-slate-500"
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
            className="rounded-full border-[3px] border-slate-900 bg-pink-500 p-1.5 text-white shadow-sm transition-transform hover:scale-110 active:scale-95"
            aria-label="Limpar busca"
          >
            <X className="h-4 w-4 stroke-[3]" />
          </button>
        )}

        <button
          type="submit"
          disabled={isSearchDisabled}
          className={`rounded-full border-[3px] px-3 py-1.5 text-[11px] font-black uppercase tracking-widest transition-transform 2xl:px-4 2xl:py-2 2xl:text-xs ${
            isSearchDisabled
              ? "cursor-not-allowed border-slate-300 bg-slate-200 text-slate-400"
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
        className={`z-40 w-full border-b-[3px] border-slate-900 bg-white transition-all duration-300 sticky top-0 ${
          isScrolled ? "shadow-md bg-white/95 backdrop-blur-sm" : ""
        }`}
      >
        <div className="mx-auto max-w-[92rem] px-3 sm:px-4 lg:px-5 2xl:px-8">
          <div
            className={`flex items-center justify-between gap-2 transition-all duration-300 2xl:gap-3 ${
              isScrolled ? "py-2" : "py-2.5 sm:py-3 2xl:py-4"
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              {isMobileNavViewport && (
                <button
                  type="button"
                  onClick={onToggleSidebar}
                  className="inline-flex items-center justify-center rounded-full border-[3px] border-slate-900 bg-yellow-400 p-2.5 text-slate-900 shadow-sm transition-transform active:scale-95 hover:scale-105"
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
              >
                <img
                  src="/logo-sistema.svg"
                  alt="Logo do sistema"
                  className="w-[112px] shrink-0 object-contain sm:w-[132px] lg:w-[128px] xl:w-[140px] 2xl:w-[160px] transform hover:rotate-2 transition-transform duration-300 origin-left"
                  loading="lazy"
                />
              </div>
            </div>

            <div className="hidden min-w-0 flex-1 max-w-xl sm:block mx-2 lg:mx-3 2xl:mx-4 2xl:max-w-2xl">
              {renderSearchForm(false)}
            </div>

            <div className="flex shrink-0 items-center gap-2 2xl:gap-3">
              {contextName && (
                <div className="hidden items-center gap-3 rounded-full border-[3px] border-slate-900 bg-pink-500 px-3 py-1.5 shadow-sm 2xl:flex transform hover:scale-105 transition-transform duration-300 cursor-default">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-slate-900 bg-white">
                    {contextClubLogoUrl ? (
                      <img
                        src={contextClubLogoUrl}
                        alt={`Logo ${contextName}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-black text-slate-900">
                        {getInitials(contextClub?.nome || contextName)}
                      </span>
                    )}
                  </div>
                  <div className="flex max-w-[140px] flex-col leading-none pr-2" title={contextLine1}>
                    <span className="line-clamp-1 text-xs font-black uppercase tracking-widest text-white">
                      {contextLine1}
                    </span>
                    {contextLine2 && (
                      <span className="mt-0.5 line-clamp-1 text-[9px] font-bold uppercase tracking-widest text-pink-200">
                        {contextLine2}
                      </span>
                    )}
                  </div>
                </div>
              )}

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

              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowUserMenu((open) => !open)}
                  aria-expanded={showUserMenu}
                  aria-haspopup="true"
                  className={`group flex items-center gap-2 rounded-full border-[3px] p-1 pr-2 transition-all duration-300 sm:gap-2 sm:pr-3 2xl:gap-3 2xl:p-1.5 2xl:pr-4 ${
                    showUserMenu
                      ? "border-slate-900 bg-yellow-400 shadow-md scale-105"
                      : "border-slate-900 bg-slate-50 shadow-sm hover:scale-105 hover:bg-yellow-100"
                  }`}
                >
                  <div className="relative">
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt={`Avatar de ${userName}`}
                        className="h-9 w-9 rounded-full border-[3px] border-slate-900 object-cover bg-white 2xl:h-10 2xl:w-10"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-slate-900 bg-cyan-300 text-sm font-black text-slate-900 2xl:h-10 2xl:w-10">
                        {getInitials(userName)}
                      </div>
                    )}
                  </div>

                  <div className="hidden text-left xl:flex xl:flex-col xl:items-start">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-900 leading-tight">
                      {userName.split(" ")[0]}
                    </span>
                  </div>

                  <ChevronDown
                    className={`hidden h-4 w-4 stroke-[3] text-slate-900 transition-transform duration-300 xl:block ${
                      showUserMenu ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-3 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-[2rem] border-[3px] border-slate-900 bg-white shadow-2xl z-[9999] origin-top-right animate-in fade-in zoom-in duration-200">
                    
                    {/* Header do Menu com Retícula HQ */}
                    <div className="border-b-[3px] border-slate-900 bg-yellow-400 p-6 relative overflow-hidden">
                      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2.5px, transparent 2.5px)', backgroundSize: '12px 12px' }}></div>
                      <p className="truncate text-lg font-black uppercase tracking-tighter text-slate-900 relative z-10">
                        {userName}
                      </p>
                      <p className="mt-1.5 inline-block max-w-full truncate rounded-full border-[2.5px] border-slate-900 bg-white px-3 py-1 text-[10px] font-bold text-slate-800 relative z-10">
                        {userEmail}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 bg-slate-50 p-4">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(true);
                          setShowUserMenu(false);
                        }}
                        className="group/item flex w-full items-center gap-3 rounded-full border-[3px] border-slate-900 bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-900 transition-all hover:bg-cyan-300 hover:scale-[1.02] active:scale-95"
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
                        className="group/item flex w-full items-center gap-3 rounded-full border-[3px] border-slate-900 bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-900 transition-all hover:bg-pink-400 hover:text-white hover:scale-[1.02] active:scale-95"
                        role="menuitem"
                      >
                        <BookOpen className="h-5 w-5 stroke-[2.5] group-hover/item:text-white text-pink-500 transition-colors" />
                        Meus Projetos
                      </button>
                    </div>

                    <div className="border-t-[3px] border-slate-900 bg-slate-100 p-4">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center justify-center gap-3 rounded-full border-[3px] border-slate-900 bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-red-500 hover:scale-[1.02] active:scale-95"
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
            <div className="pb-4 pt-2 sm:hidden animate-in slide-in-from-top-2">{renderSearchForm(true)}</div>
          )}
        </div>
      </header>

      {isProfileOpen && (
        <MeuPerfil
          loggedUser={loggedUser}
          myClub={myClub}
          schools={schools}
          onSaveProfile={onSaveProfile}
          onClose={() => setIsProfileOpen(false)}
        />
      )}
    </>
  );
}
