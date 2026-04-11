import React, { startTransition, useState, useRef, useEffect } from 'react';
import { Search, LogOut, X, Bell, ChevronDown, User, Home, BookOpen, Menu, Sparkles } from 'lucide-react';
import MeuPerfil from './MeuPerfil';

function getInitials(value) {
    if (!value) return '?';
    return value
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('');
}

export default function TopBar({ 
    searchTerm, 
    setSearchTerm, 
    loggedUser, 
    leadUser, 
    selectedClub, 
    myClub, 
    handleLogout, 
    onSaveProfile, 
    currentView, 
    setCurrentView 
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

    // Lida com o scroll para o efeito Glass
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Fecha menus ao clicar fora ou apertar Escape
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setShowUserMenu(false);
                setIsProfileOpen(false);
                setIsSearchExpanded(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    // Handler do form de busca
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (currentView !== 'Projetos') return;
        
        startTransition(() => {
            setSearchTerm(searchInputValue.trim());
        });
        
        if (window.innerWidth < 640) {
            setIsSearchExpanded(false);
            searchInputRef.current?.blur();
        }
    };

    const handleClearSearch = () => {
        setSearchInputValue('');
        startTransition(() => {
            setSearchTerm('');
        });
        searchInputRef.current?.focus();
    };

    const userName = loggedUser?.nome || leadUser?.nome || 'Usuário';
    const userEmail = loggedUser?.email || leadUser?.email || 'usuario@email.com';
    const userAvatar = loggedUser?.fotoBase64 || loggedUser?.fotoUrl || loggedUser?.avatar || leadUser?.avatar || null;
    const contextName = myClub?.nome || selectedClub?.nome || 'COLÉGIO ESTADUAL JORGE AMADO';

    const contextParts = contextName.split(' ');
    const isCollege = contextName.toUpperCase().includes('COLÉGIO ESTADUAL');
    let contextLine1 = '';
    let contextLine2 = contextName;

    if (isCollege) {
        contextLine1 = contextParts.slice(0, 2).join(' ');
        contextLine2 = contextParts.slice(2).join(' ');
    } else {
        contextLine1 = contextName;
        contextLine2 = '';
    }

    const isSearchDisabled = currentView !== 'Projetos';

    return (
        <>
            <header 
                className={`sticky top-0 z-40 w-full transition-all duration-300 p-4 sm:p-5 ${
                    isScrolled 
                        ? 'glass-surface backdrop-blur-2xl shadow-sm border-b border-slate-200' 
                        : 'glass-surface backdrop-blur-xl border-b border-white/40'
                }`}
            >
                <div className="mx-auto h-16 sm:h-20 flex items-center justify-between max-w-7xl">
                    
                    {/* Logo e Contexto */}
                    <div className={`flex items-center gap-4 transition-all duration-300 ${isSearchExpanded ? 'hidden sm:flex' : 'flex'}`}>
                        <div className="hidden md:flex flex-col justify-center">
                            <div className="flex flex-col leading-tight mt-0.5">
                                <span className="text-sm font-black text-slate-900 line-clamp-1 tracking-tight">
                                    {contextLine1}
                                </span>
                                {contextLine2 && (
                                    <span className="text-xs font-semibold text-slate-500 line-clamp-1 mt-0.5">
                                        {contextLine2}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="hidden md:block h-8 w-px bg-slate-200 mx-2"></div>
                    </div>

                    {/* Barra de Pesquisa (Agora usando <form> para submissão nativa) */}
                    <div className={`flex-1 max-w-2xl mx-4 transition-all duration-300 ${isSearchExpanded ? 'w-full' : ''}`}>
                        <form onSubmit={handleSearchSubmit} className="relative group flex items-center">
                            <Search className={`absolute left-5 w-4.5 h-4.5 transition-colors duration-200 ${isSearchDisabled ? 'text-slate-300' : 'text-slate-400 group-focus-within:text-[#00B5B5]'}`} />
                            
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder={isSearchDisabled ? "Busca disponível no feed de Projetos" : "Pesquisar projetos, clubes, pesquisadores..."}
                                className={`w-full py-3.5 pl-12 pr-32 text-sm rounded-full outline-none transition-all duration-300 border
                                    ${isSearchDisabled 
                                        ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-70 cursor-not-allowed' 
                                        : 'bg-white/80 border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-sm focus:bg-white focus:border-[#00B5B5]/50 focus:ring-4 focus:ring-[#00B5B5]/10 focus:shadow-md hover:border-slate-300'
                                    }
                                `}
                                value={searchInputValue}
                                onChange={(e) => setSearchInputValue(e.target.value)}
                                aria-label="Campo de busca"
                                disabled={isSearchDisabled}
                                title={isSearchDisabled ? 'A busca só está disponível no Feed de Projetos.' : ''}
                            />
                            
                            <div className="absolute right-2 flex items-center gap-1">
                                {searchInputValue && !isSearchDisabled && (
                                    <button
                                        type="button"
                                        onClick={handleClearSearch}
                                        className="p-1.5 mr-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                        aria-label="Limpar busca"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                                
                                <button
                                    type="submit"
                                    disabled={isSearchDisabled}
                                    className={`px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-all duration-300 
                                        ${isSearchDisabled 
                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                            : 'bg-slate-900 text-white hover:bg-[#00B5B5] shadow-sm hover:shadow-lg hover:shadow-[#00B5B5]/30 active:scale-95'
                                        }
                                    `}
                                    aria-label="Buscar"
                                >
                                    Buscar
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Ações e Perfil */}
                    <div className="flex items-center gap-3 shrink-0">
                        {/* Botão Busca Mobile */}
                        <button
                            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                            className="sm:hidden p-2.5 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors bg-white border border-slate-200 shadow-sm active:scale-95"
                            aria-label={isSearchExpanded ? 'Fechar busca' : 'Abrir busca'}
                        >
                            {isSearchExpanded ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                        </button>

                        {/* Menu do Usuário */}
                        <div className="relative" ref={userMenuRef}>
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                aria-expanded={showUserMenu}
                                aria-haspopup="true"
                                className={`flex items-center gap-3 p-1.5 pr-4 rounded-full border transition-all duration-300 group
                                    ${showUserMenu 
                                        ? 'bg-white border-[#00B5B5]/50 shadow-md ring-2 ring-[#00B5B5]/10' 
                                        : 'bg-white border-slate-200 hover:border-[#00B5B5]/30 hover:shadow-md'
                                    }
                                `}
                            >
                                <div className="relative">
                                    {userAvatar ? (
                                        <img 
                                            src={userAvatar} 
                                            alt={`Avatar de ${userName}`}
                                            className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-600 border-2 border-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:text-[#00B5B5] transition-colors">
                                            {getInitials(userName)}
                                        </div>
                                    )}
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white border border-emerald-600/20 shadow-sm"></div>
                                </div>
                                
                                <div className="hidden lg:flex flex-col items-start text-left">
                                    <span className="text-sm font-bold text-slate-900 leading-tight group-hover:text-[#00B5B5] transition-colors">
                                        {userName.split(' ')[0]}
                                    </span>
                                </div>
                                
                                <ChevronDown className={`hidden md:block w-4 h-4 text-slate-400 transition-transform duration-300 ${showUserMenu ? 'rotate-180 text-[#00B5B5]' : 'group-hover:text-[#00B5B5]'}`} />
                            </button>

                            {/* Dropdown Menu Premium */}
                            {showUserMenu && (
                                <div className="absolute right-0 mt-3 w-72 bg-white/95 backdrop-blur-xl rounded-[1.5rem] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200 z-50">
                                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                                        <p className="text-sm font-black text-slate-900 truncate">{userName}</p>
                                        <p className="text-xs font-semibold text-slate-500 truncate mt-1">{userEmail}</p>
                                    </div>
                                    
                                    <div className="p-2 space-y-0.5">
                                        <button
                                            onClick={() => { setIsProfileOpen(true); setShowUserMenu(false); }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-[#E0F7F7] hover:text-[#00B5B5] rounded-2xl transition-colors group/btn"
                                            role="menuitem"
                                        >
                                            <User className="w-4 h-4 text-slate-400 group-hover/btn:text-[#00B5B5] transition-colors" />
                                            Meu Perfil
                                        </button>
                                        <button
                                            onClick={() => { setCurrentView('meusProjetos'); setShowUserMenu(false); }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-[#E0F7F7] hover:text-[#00B5B5] rounded-2xl transition-colors group/btn"
                                            role="menuitem"
                                        >
                                            <BookOpen className="w-4 h-4 text-slate-400 group-hover/btn:text-[#00B5B5] transition-colors" />
                                            Meus Projetos
                                        </button>
                                    </div>

                                    <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-2xl transition-colors border border-transparent hover:border-red-100"
                                            role="menuitem"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Encerrar Sessão
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Overlay Mobile */}
                {isSearchExpanded && (
                    <div 
                        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 sm:hidden animate-in fade-in duration-300"
                        onClick={() => setIsSearchExpanded(false)}
                        aria-hidden="true"
                    />
                )}
            </header>

            {/* Modal de Perfil - Estilo Glass Aprimorado */}
            {isProfileOpen && (
                <div 
                    className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200" 
                    role="dialog" 
                    aria-modal="true"
                    aria-label="Perfil do Usuário"
                >
                    <div className="relative w-full max-w-xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
                        <button
                            onClick={() => setIsProfileOpen(false)}
                            className="absolute right-4 top-4 sm:-right-3 sm:-top-3 p-2.5 rounded-full bg-white text-slate-500 hover:text-slate-900 hover:scale-105 shadow-lg border border-slate-100 transition-all z-10"
                            aria-label="Fechar perfil"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 min-h-[60vh] sm:min-h-0">
                            <MeuPerfil 
                                loggedUser={loggedUser} 
                                myClub={myClub} 
                                onSaveProfile={onSaveProfile} 
                                onClose={() => setIsProfileOpen(false)} 
                            />
                        </div>
                    </div>
                </div>
            )}
        </> 
    );
}