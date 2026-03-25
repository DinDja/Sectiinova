import React, { startTransition, useState, useRef, useEffect } from 'react';
import { Search, LogOut, X, Bell, ChevronDown, User, Home, BookOpen, Menu } from 'lucide-react';
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

export default function TopBar({ searchTerm, setSearchTerm, loggedUser, leadUser, selectedClub, myClub, handleLogout, onSaveProfile }) {
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [searchInputValue, setSearchInputValue] = useState(searchTerm);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const searchInputRef = useRef(null);
    const userMenuRef = useRef(null);

    // Sincroniza o valor local com o estado externo
    useEffect(() => {
        setSearchInputValue(searchTerm);
    }, [searchTerm]);

    // Detecta scroll para mudar o estilo da barra
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Fecha o menu ao clicar fora
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
        startTransition(() => {
            setSearchTerm(searchInputValue.trim());
        });
        if (window.innerWidth < 640) {
            setIsSearchExpanded(false);
        }
    };

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchInputValue(value);
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

    // Gradiente azul personalizado
    const blueGradient = 'bg-gradient-to-r from-[#0B3B5F] via-[#1B4F72] to-[#2E86C1]';
    const blueLightGradient = 'bg-gradient-to-r from-[#1F618D] to-[#3498DB]';

    return (
        <header 
            className={` z-50 transition-all duration-500 ${
                isScrolled 
                    ? 'bg-white/95 backdrop-blur-xl shadow-xl border-b border-blue-100/30' 
                    : `${blueGradient} shadow-lg`
            }`}
        >
            <div className="max-w-[1400px] mx-auto h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
                
                {/* Logo e Contexto - Lado Esquerdo */}
                <div className={`flex items-center gap-3 transition-all duration-300 ${isSearchExpanded ? 'hidden sm:flex' : 'flex'}`}>
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#2E86C1] to-[#1B4F72] rounded-xl blur-lg opacity-60 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative w-10 h-10 rounded-xl bg-white text-[#0B3B5F] flex items-center justify-center font-bold shadow-lg transform transition-transform group-hover:scale-105">
                            <span className="text-xs font-black tracking-wider">SECTI</span>
                        </div>
                    </div>
                    
                    <div className="hidden md:flex flex-col">
                        <span className="text-[10px] font-medium text-white/70 uppercase tracking-wider">Espaço do</span>
                        <div className="flex flex-col leading-tight">
                            <span className="text-sm font-bold text-white line-clamp-1">
                                {contextLine1}
                            </span>
                            {contextLine2 && (
                                <span className="text-xs text-white/80 line-clamp-1">
                                    {contextLine2}
                                </span>
                            )}
                        </div>
                    </div>
                    
                    <div className="hidden md:block h-8 w-px bg-gradient-to-b from-transparent via-white/30 to-transparent"></div>
                </div>

                {/* Barra de Pesquisa - Centralizada */}
                <div className={`flex-1 max-w-2xl mx-4 transition-all duration-300 ${isSearchExpanded ? 'w-full' : ''}`}>
                    <div className="relative">
                        <div className="relative group">
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Pesquisar projetos, postagens ou clubes..."
                                className={`w-full py-2.5 pl-12 pr-32 text-sm rounded-2xl outline-none transition-all duration-300 focus:ring-4 focus:ring-white/30 ${
                                    isScrolled 
                                        ? 'bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#2E86C1]' 
                                        : 'bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/70 focus:bg-white/30 focus:text-white'
                                }`}
                                value={searchInputValue}
                                onChange={handleSearchChange}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSearch();
                                    }
                                }}
                                aria-label="Campo de busca"
                            />
                            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                                isScrolled ? 'text-gray-400' : 'text-white/70'
                            }`} />
                            
                            {searchInputValue && (
                                <button
                                    onClick={handleClearSearch}
                                    className={`absolute right-28 top-1/2 -translate-y-1/2 p-1 rounded-full transition-all ${
                                        isScrolled 
                                            ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100' 
                                            : 'text-white/70 hover:text-white hover:bg-white/20'
                                    }`}
                                    aria-label="Limpar busca"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                            
                            <button
                                onClick={handleSearch}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 text-white text-xs font-medium rounded-xl transition-all shadow-md ${
                                    isScrolled 
                                        ? `${blueLightGradient} hover:shadow-lg` 
                                        : 'bg-white/20 backdrop-blur-sm hover:bg-white/30'
                                }`}
                                type="button"
                                aria-label="Buscar"
                            >
                                Buscar
                            </button>
                        </div>
                    </div>
                </div>

                {/* Ações e Perfil - Lado Direito */}
                <div className="flex items-center gap-2">
                    {/* Botão de busca mobile */}
                    <button
                        onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                        className={`sm:hidden p-2 rounded-xl transition-all duration-200 ${
                            isScrolled 
                                ? 'text-gray-600 hover:bg-gray-100' 
                                : 'text-white hover:bg-white/20'
                        }`}
                        aria-label={isSearchExpanded ? 'Fechar busca' : 'Abrir busca'}
                    >
                        {isSearchExpanded ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                    </button>

                    {/* Menu do Usuário */}
                    <div className="relative" ref={userMenuRef}>
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className={`flex items-center gap-3 px-2 py-1.5 rounded-xl transition-all duration-200 group ${
                                isScrolled 
                                    ? 'hover:bg-gray-100' 
                                    : 'hover:bg-white/20'
                            }`}
                        >
                            <div className="relative">
                                {userAvatar ? (
                                    <img 
                                        src={userAvatar} 
                                        alt={userName}
                                        className="w-9 h-9 rounded-xl object-cover ring-2 ring-white/50 shadow-sm"
                                    />
                                ) : (
                                    <div className={`w-9 h-9 rounded-xl ${
                                        isScrolled 
                                            ? 'bg-gradient-to-br from-[#0B3B5F] to-[#2E86C1]' 
                                            : 'bg-white'
                                    } text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white/50`}>
                                        {getInitials(userName)}
                                    </div>
                                )}
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white"></div>
                            </div>
                            
                            <div className="hidden md:flex flex-col items-start">
                                <span className={`text-sm font-semibold ${isScrolled ? 'text-gray-800' : 'text-white'}`}>
                                    {userName.split(' ')[0]}
                                </span>
                                <span className={`text-xs ${isScrolled ? 'text-gray-500' : 'text-white/70'}`}>
                                    {userEmail.split('@')[0]}
                                </span>
                            </div>
                            
                            <ChevronDown className={`hidden md:block w-4 h-4 transition-transform duration-200 ${
                                isScrolled ? 'text-gray-400' : 'text-white/70'
                            } ${showUserMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {showUserMenu && (
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in slide-in-from-top-2 duration-200 z-50">
                                <div className="p-4 border-b border-gray-100">
                                    <p className="text-sm font-semibold text-gray-800">{userName}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{userEmail}</p>
                                </div>
                                <div className="p-2">
                                    <button
                                        onClick={() => { setIsProfileOpen(true); setShowUserMenu(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#0B3B5F] rounded-xl transition-colors"
                                    >
                                        <User className="w-4 h-4" />
                                        Meu Perfil
                                    </button>
                                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#0B3B5F] rounded-xl transition-colors">
                                        <BookOpen className="w-4 h-4" />
                                        Meus Projetos
                                    </button>
                                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#0B3B5F] rounded-xl transition-colors">
                                        <Home className="w-4 h-4" />
                                        Início
                                    </button>
                                </div>
                                <div className="p-2 border-t border-gray-100">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sair
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Overlay para busca mobile */}
            {isSearchExpanded && (
                <div 
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 sm:hidden"
                    onClick={() => setIsSearchExpanded(false)}
                />
            )}

            {/* Modal Meu Perfil */}
            {isProfileOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
                    <div className="relative w-full max-w-xl">
                        <button
                            onClick={() => setIsProfileOpen(false)}
                            className="absolute right-2 top-2 p-2 rounded-full bg-white text-gray-600 hover:bg-gray-100 z-10"
                            aria-label="Fechar perfil"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <MeuPerfil loggedUser={loggedUser} myClub={myClub} onSaveProfile={onSaveProfile} onClose={() => setIsProfileOpen(false)} />
                    </div>
                </div>
            )}
        </header>
    );
}