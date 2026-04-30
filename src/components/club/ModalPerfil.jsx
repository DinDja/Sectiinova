import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, School, TrendingUp, Shield, Link as LinkIcon } from 'lucide-react';

// --- FUNÇÕES UTILITÁRIAS (Integradas para evitar erros de importação) ---
const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getLattesLink = (person) => person?.lattes_url || person?.lattes || null;

const isUserInProject = (project, user) => {
    if (!project || !user) return false;
    const userId = String(user.id || user.uid).trim();
    const allIds = [
        project.autor_id, project.mentor_id, project.orientador_id, project.coorientador_id,
        ...(project.investigadores_ids || []), ...(project.orientadores_ids || []), ...(project.coorientadores_ids || [])
    ].map(id => String(id).trim());
    return allIds.includes(userId);
};

export default function ModalPerfil({ isOpen, onClose, usuario, club = null, clubProjects = [], clubUsers = [] }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!isOpen || !usuario || !mounted || typeof document === 'undefined') return null;

    const projetoCountByClub = Array.isArray(clubProjects) && clubProjects.length > 0
        ? clubProjects.reduce((acc, project) => {
            try {
                return isUserInProject(project, usuario) ? acc + 1 : acc;
            } catch (err) {
                return acc;
            }
        }, 0)
        : 0;

    const projetosCount = Number(usuario.projetosCount ?? usuario.projetos?.length ?? usuario.projetos_ids?.length ?? usuario.projetosIds?.length ?? projetoCountByClub ?? 0);
    const nome = usuario.nome || usuario.nomeCompleto || usuario.fullName || 'Usuário Sem Nome';
    const email = usuario.email || usuario.emailPrincipal || usuario.email_usuario || 'Sem e-mail';
    const clube = usuario.clube || usuario.clube_nome || usuario.clubeId || club?.nome || 'Não informado';
    const bio = usuario.bio || usuario.descricao || usuario.sobre || '';
    const avatarSrc = usuario.fotoUrl || usuario.fotoBase64 || usuario.avatar || usuario.foto || '';
    const lattesLink = getLattesLink(usuario);

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    const modalContent = (
        <div
            // 1. CORREÇÃO DE SCROLL: Removido 'items-center', adicionado 'py-8' e 'm-auto' no filho
            className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex justify-center py-8 px-4 sm:px-6"
            onClick={handleBackdropClick}
        >
            <div
                // 2. Adicionado 'm-auto' para centralizar quando sobrar espaço, sem quebrar o scroll
                className="relative w-full max-w-2xl m-auto bg-[#FAFAFA] border-4 border-slate-900 shadow-[16px_16px_0px_0px_#0f172a] rounded-[2rem] overflow-hidden animate-in zoom-in-[0.95] duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Vibrante do Cartão */}
                <div className="relative z-0 h-24 md:h-32 bg-pink-400 border-b-4 border-slate-900 overflow-hidden">
                    <div className="absolute inset-0 z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMwZjE3MmEiLz48L3N2Zz4=')] opacity-20"></div>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 md:w-12 md:h-12 bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[2px_2px_0px_0px_#0f172a] flex items-center justify-center text-slate-900 transition-all z-10"
                        title="Fechar Perfil"
                    >
                        <X className="w-5 h-5 md:w-6 md:h-6 stroke-[3]" />
                    </button>
                </div>

                <div className="px-5 md:px-10 pb-8 md:pb-10 relative z-10">
                    <div className="relative z-[60] flex flex-col items-center -mt-12 md:-mt-16 mb-6 md:mb-8">
                        <div className="w-24 h-24 md:w-32 md:h-32 bg-white border-4 border-slate-900 rounded-2xl md:rounded-3xl shadow-[4px_4px_0px_0px_#0f172a] md:shadow-[6px_6px_0px_0px_#0f172a] flex items-center justify-center overflow-hidden z-10">
                            {avatarSrc ? (
                                <img src={avatarSrc} alt={nome} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl md:text-4xl font-black text-slate-900 uppercase">
                                    {getInitials(nome)}
                                </span>
                            )}
                        </div>

                        <h1 className="mt-4 md:mt-6 text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter text-center leading-tight">
                            {nome}
                        </h1>

                        <div className="flex flex-wrap items-center justify-center gap-3 mt-3 md:mt-4">
                            <span className="inline-flex items-center gap-2 bg-yellow-300 border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] md:shadow-[4px_4px_0px_0px_#0f172a] px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-widest break-all">
                                <Mail className="w-3 h-3 md:w-4 md:h-4 stroke-[3]" /> {email}
                            </span>
                        </div>

                        {bio && (
                            <p className="mt-4 md:mt-6 text-slate-800 font-bold text-center w-full max-w-md bg-white border-2 border-slate-900 p-4 shadow-[3px_3px_0px_0px_#0f172a] text-xs md:text-sm leading-relaxed">
                                "{bio}"
                            </p>
                        )}
                    </div>

                    {/* Card do Clube */}
                    <div className="mb-6 md:mb-8 w-full bg-teal-400 border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] md:shadow-[8px_8px_0px_0px_#0f172a] rounded-xl md:rounded-2xl p-5 md:p-8 text-center transition-transform">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-white border-4 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] flex items-center justify-center mx-auto mb-3 md:mb-4">
                            <School className="w-5 h-5 md:w-6 md:h-6 stroke-[3] text-slate-900" />
                        </div>
                        <p className="text-xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter leading-tight">
                            {clube}
                        </p>
                        <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-900 mt-2 bg-white inline-block px-2 md:px-3 py-1 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">Clube de Ciências</p>
                    </div>

                    {/* Grid de informações */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                        {/* Projetos */}
                        <div className="bg-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] rounded-xl p-4 flex flex-col items-center text-center transition-all">
                            <TrendingUp className="w-6 h-6 md:w-8 md:h-8 mb-2 stroke-[2.5] text-blue-500" />
                            <span className="text-3xl md:text-4xl font-black text-slate-900">{projetosCount}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2 bg-slate-100 border border-slate-900 px-2 py-1">Projetos</span>
                        </div>

                        {/* Perfil */}
                        <div className="bg-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] rounded-xl p-4 flex flex-col items-center text-center transition-all">
                            <Shield className="w-6 h-6 md:w-8 md:h-8 mb-2 stroke-[2.5] text-purple-500" />
                            <span className="text-base md:text-lg font-black text-slate-900 uppercase mt-auto leading-tight">{usuario.perfil || usuario.perfil_usuario || 'Membro'}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2 bg-slate-100 border border-slate-900 px-2 py-1">Perfil</span>
                        </div>

                        {/* Lattes */}
                        <div className="bg-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] rounded-xl p-4 flex flex-col items-center text-center transition-all">
                            <LinkIcon className="w-6 h-6 md:w-8 md:h-8 mb-2 stroke-[2.5] text-orange-500" />
                            {lattesLink ? (
                                <a
                                    href={lattesLink.startsWith('http') ? lattesLink : `https://${lattesLink}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs md:text-sm font-black text-slate-900 bg-yellow-300 px-3 py-1.5 md:px-4 md:py-2 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#0f172a] transition-all uppercase mt-auto"
                                >
                                    Acessar
                                </a>
                            ) : (
                                <span className="text-xs md:text-sm font-black text-slate-400 uppercase mt-auto border-2 border-dashed border-slate-300 px-2 py-1">Nenhum</span>
                            )}
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2 bg-slate-100 border border-slate-900 px-2 py-1">Lattes</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}