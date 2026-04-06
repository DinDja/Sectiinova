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

export default function TopBar({ searchTerm, setSearchTerm, loggedUser, leadUser, selectedClub, myClub, handleLogout, onSaveProfile, currentView, setCurrentView }) {
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [searchInputValue, setSearchInputValue] = useState(searchTerm);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const searchInputRef = useRef(null);
    const userMenuRef = useRef(null);

    useEffect(() => {
        setSearchInputValue(searchTerm);
    }, [searchTerm]);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = () => {
        // Só permite buscar se estiver no feed (currentView === 'Projetos')
        if (currentView !== 'Projetos') return;
        startTransition(() => {
            setSearchTerm(searchInputValue.trim());
        });
        if (window.innerWidth < 640) {
            setIsSearchExpanded(false);
        }
    };

    const handleSearchChange = (e) => {
        setSearchInputValue(e.target.value);
    };

    const handleClearSearch = () => {
        setSearchInputValue('');
        startTransition(() => {
            setSearchTerm('');
        });
        if (searchInputRef.current) searchInputRef.current.focus();
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
        const firstTwo = contextParts.slice(0, 2).join(' ');
        contextLine1 = firstTwo;
        contextLine2 = contextParts.slice(2).join(' ');
    } else {
        contextLine1 = contextName;
        contextLine2 = '';
    }

    return (
        <>
            <header 
                className={`sticky top-0 z-40 transition-all duration-500 p-5 ${
                    isScrolled 
                        ? 'glass-surface backdrop-blur-2xl shadow-sm border-b border-slate-200' 
                        : 'glass-surface backdrop-blur-xl border-b border-white/40'
                }`}
            >
            <div className="mx-auto h-20 flex items-center justify-between px-4 sm:px-6 lg:px-8">
                
                {/* Logo e Contexto */}
                <div className={`flex items-center gap-4 transition-all duration-300 ${isSearchExpanded ? 'hidden sm:flex' : 'flex'}`}>
                    <div className="relative group flex items-center justify-center">
                     
                    </div>
                    
                    <div className="hidden md:flex flex-col justify-center">
                        <div className="flex flex-col leading-tight mt-0.5">
                            <span className="text-sm font-black text-slate-900 line-clamp-1 tracking-tight">
                                {contextLine1}
                            </span>
                            {contextLine2 && (
                                <span className="text-xs font-semibold text-slate-500 line-clamp-1">
                                    {contextLine2}
                                </span>
                            )}
                        </div>
                    </div>
                    
                    <div className="hidden md:block h-8 w-px bg-slate-200 mx-2"></div>
                </div>

                {/* Barra de Pesquisa */}
                <div className={`flex-1 max-w-2xl mx-4 transition-all duration-300 ${isSearchExpanded ? 'w-full' : ''}`}>
                    <div className="relative group">
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Pesquisar projetos, clubes, Pesquisadores..."
                            className={`w-full py-3.5 pl-14 pr-32 text-sm placeholder:text-slate-400 bg-white/80 border border-slate-200 rounded-full outline-none transition-all duration-300 shadow-sm focus:shadow-md focus:shadow-cyan-500/10 focus:bg-white focus:border-[#00B5B5]/50 focus:ring-4 focus:ring-[#00B5B5]/10 hover:border-slate-300 ${currentView !== 'Projetos' ? 'opacity-60 cursor-not-allowed bg-slate-100 text-slate-400' : 'text-slate-900'}`}
                            value={searchInputValue}
                            onChange={handleSearchChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSearch();
                                }
                            }}
                            aria-label="Campo de busca"
                            disabled={currentView !== 'Projetos'}
                            title={currentView !== 'Projetos' ? 'A busca só está disponível no Feed de Projetos.' : ''}
                        />
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-[#00B5B5] transition-colors" />
                        
                        {searchInputValue && (
                            <button
                                onClick={handleClearSearch}
                                className="absolute right-[100px] top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                                aria-label="Limpar busca"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                        
                        <button
                            onClick={handleSearch}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-all duration-300 shadow-sm ${currentView !== 'Projetos' ? 'bg-slate-300 text-slate-400 cursor-not-allowed opacity-70' : 'bg-slate-900 hover:bg-[#00B5B5] text-white hover:shadow-lg hover:shadow-[#00B5B5]/30'}`}
                            type="button"
                            aria-label="Buscar"
                            disabled={currentView !== 'Projetos'}
                            title={currentView !== 'Projetos' ? 'A busca só está disponível no Feed de Projetos.' : ''}
                        >
                            Buscar
                        </button>
                    </div>
                </div>

                {/* Ações e Perfil */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                        className="sm:hidden p-2.5 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors bg-white border border-slate-200 shadow-sm"
                        aria-label={isSearchExpanded ? 'Fechar busca' : 'Abrir busca'}
                    >
                        {isSearchExpanded ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                    </button>

                    <div className="relative" ref={userMenuRef}>
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-3 p-1.5 pr-4 rounded-full bg-white border border-slate-200 hover:border-[#00B5B5]/30 hover:shadow-md transition-all duration-300 group"
                        >
                            <div className="relative">
                                {userAvatar ? (
                                    <img 
                                        src={userAvatar} 
                                        alt={userName}
                                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-600 border-2 border-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:text-[#00B5B5] transition-colors">
                                        {getInitials(userName)}
                                    </div>
                                )}
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white border border-emerald-600/20"></div>
                            </div>
                            
                            <div className="hidden lg:flex flex-col items-start text-left">
                                <span className="text-sm font-bold text-slate-900 leading-tight group-hover:text-[#00B5B5] transition-colors">
                                    {userName.split(' ')[0]}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                                    
                                </span>
                            </div>
                            
                            <ChevronDown className={`hidden md:block w-4 h-4 text-slate-400 transition-transform duration-300 ${showUserMenu ? 'rotate-180 text-[#00B5B5]' : 'group-hover:text-[#00B5B5]'}`} />
                        </button>

                        {/* Dropdown Menu Premium */}
                        {showUserMenu && (
                            <div className="absolute right-0 mt-3 w-72 bg-white/95 backdrop-blur-xl rounded-[1.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-in slide-in-from-top-4 fade-in duration-300 z-50">
                                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                                    <p className="text-sm font-black text-slate-900 truncate">{userName}</p>
                                    <p className="text-xs font-semibold text-slate-500 truncate mt-1">{userEmail}</p>
                                </div>
                                <div className="p-3 space-y-1">
                                    <button
                                        onClick={() => { setIsProfileOpen(true); setShowUserMenu(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-[#E0F7F7] hover:text-[#00B5B5] rounded-2xl transition-all group/btn"
                                    >
                                        <User className="w-4 h-4 text-slate-400 group-hover/btn:text-[#00B5B5] transition-colors" />
                                        Meu Perfil
                                    </button>
                                    <button
                                        onClick={() => { console.log('Set meusProjetos from TopBar'); setCurrentView('meusProjetos'); setShowUserMenu(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-[#E0F7F7] hover:text-[#00B5B5] rounded-2xl transition-all group/btn"
                                    >
                                        <BookOpen className="w-4 h-4 text-slate-400 group-hover/btn:text-[#00B5B5] transition-colors" />
                                        Meus Projetos
                                    </button>

                                </div>
                                <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-2xl transition-all border border-transparent hover:border-red-100"
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
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 sm:hidden animate-in fade-in duration-300"
                    onClick={() => setIsSearchExpanded(false)}
                />
            )}

            {/* Modal de Perfil - Estilo Glass */}
        </header>

            {/* Modal de Perfil - Estilo Glass */}
            {isProfileOpen && (
                <div className="fixed inset-0 z-[9999] flex items-start md:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md overflow-y-auto animate-in fade-in duration-300" role="dialog" aria-modal="true">
                    <div className="relative w-full max-w-xl">
                        <button
                            onClick={() => setIsProfileOpen(false)}
                            className="absolute -right-3 -top-3 p-2.5 rounded-full bg-white text-slate-500 hover:text-slate-900 hover:scale-110 shadow-lg border border-slate-100 transition-all z-10"
                            aria-label="Fechar perfil"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100">
                            <MeuPerfil loggedUser={loggedUser} myClub={myClub} onSaveProfile={onSaveProfile} onClose={() => setIsProfileOpen(false)} />
                        </div>
                    </div>
                </div>
            )}
        </> 
    );
}