import React, { startTransition, useState, useRef, useEffect } from "react";
import {
  Search,
  LogOut,
  X,
  ChevronDown,
  User,
  BookOpen,
} from "lucide-react";
import MeuPerfil from "./MeuPerfil"


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
}) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchInputValue, setSearchInputValue] = useState(searchTerm);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const searchInputRef = useRef(null);
  const userMenuRef = useRef(null);

  // Sincroniza o valor de busca externo
  useEffect(() => {
    setSearchInputValue(searchTerm);
  }, [searchTerm]);

  // Lida com o scroll para adicionar a sombra da navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fecha menus ao clicar fora ou apertar Escape
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

  // Handler do form de busca
  const handleSearchSubmit = (e) => {
    e.preventDefault();
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

  return (
    <>
      <header
        className={`z-10 w-full transition-all duration-300 bg-[#FAFAFA] border-b-4 border-slate-900 ${
          isScrolled ? "shadow-[0_8px_0_0_#0f172a] py-3" : "py-5"
        }`}
      >
        <div className="mx-auto h-16 sm:h-20 flex items-center justify-between max-w-7xl px-4 sm:px-6 lg:px-8 gap-4">
          
          {/* Logo do Sistema (Imagens Originais Mantidas) */}
          <div
            className={`flex items-center gap-2 shrink-0 transition-all duration-300 ${isSearchExpanded ? "hidden md:flex" : "flex"}`}
          >
            <img
              src="/images/Secti_Vertical.png"
              alt="SECTI"
              className="h-16 sm:h-20 object-contain opacity-95 hover:opacity-100 transition-opacity duration-300"
              loading="lazy"
            />
            <img
              src="/logo-sistema.svg"
              alt="Logo do sistema"
              className="object-contain shrink-0 w-[120px] sm:w-[160px] mb-1 sm:mb-3"
              loading="lazy"
            />
          </div>

          {/* Barra de Pesquisa Neo-Brutalista */}
          <div
            className={`flex-1 max-w-2xl mx-auto transition-all duration-300 ${isSearchExpanded ? "w-full" : "hidden sm:block"}`}
          >
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center w-full"
            >
              <Search
                className={`absolute left-4 w-5 h-5 stroke-[3] transition-colors duration-200 ${isSearchDisabled ? "text-slate-400" : "text-slate-900"}`}
              />

              <input
                ref={searchInputRef}
                type="text"
                placeholder={
                  isSearchDisabled
                    ? "BUSCA RESTRITA AO FEED DE PROJETOS"
                    : "BUSCAR PROJETOS, CLUBES, PESQUISADORES..."
                }
                className={`w-full py-4 pl-12 pr-28 text-xs sm:text-sm font-black uppercase tracking-widest rounded-2xl outline-none transition-all duration-300 border-4
                                    ${
                                      isSearchDisabled
                                        ? "bg-slate-200 text-slate-500 border-slate-400 cursor-not-allowed"
                                        : "bg-white border-slate-900 text-slate-900 placeholder:text-slate-400 shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[4px_4px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1"
                                    }
                                `}
                value={searchInputValue}
                onChange={(e) => setSearchInputValue(e.target.value)}
                aria-label="Campo de busca"
                disabled={isSearchDisabled}
                title={
                  isSearchDisabled
                    ? "A busca só está disponível no Feed de Projetos."
                    : ""
                }
              />

              <div className="absolute right-2 flex items-center gap-2">
                {searchInputValue && !isSearchDisabled && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="p-1.5 rounded-lg bg-red-400 border-2 border-slate-900 text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#0f172a] transition-all"
                    aria-label="Limpar busca"
                  >
                    <X className="w-4 h-4 stroke-[3]" />
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSearchDisabled}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-2 rounded-xl transition-all duration-300 
                                        ${
                                          isSearchDisabled
                                            ? "bg-slate-300 text-slate-500 border-slate-400 cursor-not-allowed"
                                            : "bg-teal-400 text-slate-900 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a]"
                                        }
                                    `}
                  aria-label="Buscar"
                >
                  Buscar
                </button>
              </div>
            </form>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Indicador de Contexto (Escola/Clube) */}
            {contextName && (
              <div className="hidden lg:flex items-center gap-3 rounded-2xl border-4 border-slate-900 bg-pink-400 shadow-[4px_4px_0px_0px_#0f172a] px-3 py-2 transform ">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border-2 border-slate-900 overflow-hidden shrink-0 shadow-[2px_2px_0px_0px_#0f172a]">
                  {contextClubLogoUrl ? (
                    <img
                      src={contextClubLogoUrl}
                      alt={`Logo ${contextName}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-black text-slate-900">
                      {getInitials(contextClub?.nome || contextName)}
                    </span>
                  )}
                </div>
                <div
                  className="flex flex-col leading-none max-w-[120px]"
                  title={contextLine1}
                >
                  <span className="text-xs font-black uppercase tracking-widest text-slate-900 line-clamp-1">
                    {contextLine1}
                  </span>
                  {contextLine2 && (
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-800 line-clamp-1 mt-1">
                      {contextLine2}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Toggle de Pesquisa Mobile */}
            <button
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
              className="sm:hidden p-3 rounded-xl bg-yellow-300 border-4 border-slate-900 text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] active:translate-y-1 active:shadow-none transition-all"
              aria-label={isSearchExpanded ? "Fechar busca" : "Abrir busca"}
            >
              {isSearchExpanded ? (
                <X className="w-5 h-5 stroke-[3]" />
              ) : (
                <Search className="w-5 h-5 stroke-[3]" />
              )}
            </button>

            {/* Menu do Usuário */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-expanded={showUserMenu}
                aria-haspopup="true"
                className={`flex items-center gap-3 p-2 pr-4 rounded-2xl border-4 transition-all duration-300 group
                                    ${
                                      showUserMenu
                                        ? "bg-teal-400 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] translate-y-0"
                                        : "bg-white border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a]"
                                    }
                                `}
              >
                <div className="relative">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={`Avatar de ${userName}`}
                      className="w-10 h-10 rounded-xl object-cover border-2 border-slate-900"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-blue-400 text-slate-900 border-2 border-slate-900 flex items-center justify-center font-black text-sm">
                      {getInitials(userName)}
                    </div>
                  )}
                  {/* Status Indicator */}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-teal-400 rounded-full border-2 border-slate-900"></div>
                </div>

                <div className="hidden md:flex flex-col items-start text-left">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-900 leading-tight">
                    {userName.split(" ")[0]}
                  </span>
                </div>

                <ChevronDown
                  className={`hidden md:block w-4 h-4 stroke-[3] text-slate-900 transition-transform duration-300 ${showUserMenu ? "80" : ""}`}
                />
              </button>

              {/* Dropdown Menu Neo-Brutalista */}
              {showUserMenu && (
                <div className="absolute right-0 mt-4 w-72 bg-white border-4 border-slate-900 rounded-2xl shadow-[8px_8px_0px_0px_#0f172a] overflow-hidden animate-in slide-in-from-top-4 fade-in duration-200 z-[9999]">
                  
                  <div className="p-5 border-b-4 border-slate-900 bg-yellow-300">
                    <p className="text-base font-black uppercase tracking-tighter text-slate-900 truncate">
                      {userName}
                    </p>
                    <p className="max-w-[220px] text-xs font-bold text-slate-800 truncate mt-1 bg-white inline-block px-2 py-0.5 border-2 border-slate-900">
                      {userEmail}
                    </p>
                  </div>

                  <div className="p-3 flex flex-col gap-2 bg-[#FAFAFA]">
                    <button
                      onClick={() => {
                        setIsProfileOpen(true);
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-900 bg-white border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] hover:bg-teal-400 transition-all"
                      role="menuitem"
                    >
                      <User className="w-5 h-5 stroke-[2.5]" />
                      Meu Perfil
                    </button>
                    
                    <button
                      onClick={() => {
                        setCurrentView("meusProjetos");
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-900 bg-white border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] hover:bg-blue-400 transition-all"
                      role="menuitem"
                    >
                      <BookOpen className="w-5 h-5 stroke-[2.5]" />
                      Meus Projetos
                    </button>
                  </div>

                  <div className="p-3 border-t-4 border-slate-900 bg-slate-200">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest text-white bg-red-500 border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4 stroke-[3]" />
                      Encerrar sessão
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Overlay Mobile do Search */}
        {isSearchExpanded && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 sm:hidden animate-in fade-in duration-300"
            onClick={() => setIsSearchExpanded(false)}
            aria-hidden="true"
          />
        )}
      </header>

      {/* Modal de Perfil - renderiza o componente que já controla seu próprio overlay */}
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