import React, { startTransition, useState, useRef, useEffect } from 'react';
import { Search, LogOut, X } from 'lucide-react';

function getInitials(value) {
    if (!value) return '?';
    return value
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('');
}

export default function TopBar({ searchTerm, setSearchTerm, loggedUser, leadUser, selectedClub, handleLogout }) {
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [searchInputValue, setSearchInputValue] = useState(searchTerm);
    const searchInputRef = useRef(null);
    const searchCommitTimerRef = useRef(null);

    // Sincroniza o valor local com o estado externo
    useEffect(() => {
        setSearchInputValue(searchTerm);
    }, [searchTerm]);

    useEffect(() => {
        if (searchInputValue === searchTerm) {
            return undefined;
        }

        if (searchCommitTimerRef.current) {
            clearTimeout(searchCommitTimerRef.current);
        }

        searchCommitTimerRef.current = setTimeout(() => {
            startTransition(() => {
                setSearchTerm(searchInputValue);
            });
        }, 250);

        return () => {
            if (searchCommitTimerRef.current) {
                clearTimeout(searchCommitTimerRef.current);
                searchCommitTimerRef.current = null;
            }
        };
    }, [searchInputValue, searchTerm, setSearchTerm]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchInputValue(value);
    };

    const handleClearSearch = () => {
        if (searchCommitTimerRef.current) {
            clearTimeout(searchCommitTimerRef.current);
            searchCommitTimerRef.current = null;
        }
        setSearchInputValue('');
        startTransition(() => {
            setSearchTerm('');
        });
        if (searchInputRef.current) searchInputRef.current.focus();
    };

    // Determina nome e escola do usuário
    const userName = loggedUser?.nome || leadUser?.nome || 'Usuário';
    const contextName = selectedClub?.nome || 'COLÉGIO ESTADUAL JORGE AMADO';

    // Formata o nome do contexto para duas linhas: primeira linha "COLÉGIO ESTADUAL" e o restante na segunda
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
        <header className="glass-surface border-b border-white/70 h-16 flex items-center justify-between sticky top-0 z-40 px-2 sm:px-4">
            <div className={`flex items-center h-full transition-all duration-200 ${isSearchExpanded ? 'hidden sm:flex' : 'flex'}`}>
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00B5B5] to-[#008b8b] text-white flex items-center justify-center font-bold text-sm shadow-md shadow-cyan-700/30">
                        <span className="text-xs font-black">SECTI</span>
                    </div>
                    <div className="hidden md:flex flex-col leading-tight">
                        <span className="text-sm font-bold text-slate-800 line-clamp-1">
                            {contextLine2 || contextLine1}
                        </span>
                    </div>
                </div>

                <div className="hidden md:block h-8 w-px bg-gray-200 mx-3"></div>
            </div>

            <div className={`flex-1 max-w-3xl mx-auto px-2 sm:px-4 flex items-center transition-all duration-200 ${isSearchExpanded ? 'w-full' : ''}`}>
                <div className="relative w-full">
                    <div className={`flex w-full bg-white/90 border border-slate-200 rounded-full overflow-hidden shadow-sm transition-all duration-200 focus-within:ring-4 focus-within:ring-[#00B5B5]/15 focus-within:border-[#00B5B5] ${isSearchExpanded ? 'rounded-full' : 'rounded-full'}`}>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Pesquisar projetos, postagens ou clubes..."
                            className="flex-1 py-2.5 pl-4 pr-10 outline-none text-sm text-slate-700 placeholder-slate-400 bg-transparent"
                            value={searchInputValue}
                            onChange={handleSearchChange}
                            aria-label="Campo de busca"
                        />
                        {searchInputValue && (
                            <button
                                onClick={handleClearSearch}
                                className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full transition-colors"
                                aria-label="Limpar busca"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            className="px-4 flex items-center justify-center bg-transparent hover:bg-slate-100 transition-colors rounded-r-full"
                            type="button"
                            aria-label="Buscar"
                        >
                            <Search className="w-4 h-4 text-slate-500" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
                <button
                    onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                    className="sm:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                    aria-label={isSearchExpanded ? 'Fechar busca' : 'Abrir busca'}
                >
                    {isSearchExpanded ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                </button>

                <div className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF5722] to-[#E64A19] text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white/80">
                        {getInitials(userName)}
                    </div>
                    <div className="hidden md:flex flex-col leading-tight max-w-[160px]">
                        <span className="text-sm font-semibold text-slate-800 truncate">
                            {userName}
                        </span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="hidden md:flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                        aria-label="Sair da aplicação"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sair</span>
                    </button>
                </div>

                <button
                    onClick={handleLogout}
                    className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                    aria-label="Sair"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
}