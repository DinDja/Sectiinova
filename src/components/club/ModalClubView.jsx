import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, User, Map as MapIcon, FolderKanban, Users, 
    BookOpen, Microscope, ExternalLink, Target, 
    GraduationCap, Sparkles, Zap, Building2, Asterisk
} from 'lucide-react';
import ModalPerfil from './ModalPerfil';
import { getInitials, getLattesLink } from '../../utils/helpers';

// --- MOCKS E STUBS DE DEPENDÊNCIAS EXTERNAS ---
const EmptyState = ({ icon: Icon, title, description }) => (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        {Icon && <Icon className="w-20 h-20 text-slate-900 mb-6 stroke-[2]" />}
        <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">{title}</h3>
        <p className="text-lg font-bold text-slate-600">{description}</p>
    </div>
);

// --- COMPONENTE PRINCIPAL ---
export default function ModalClubView({ 
    isOpen, 
    onClose, 
    viewingClub, 
    viewingClubSchool, 
    viewingClubProjects = [], 
    viewingClubUsers = [], 
    viewingClubOrientadores = [],
    viewingClubCoorientadores = [],
    viewingClubInvestigadores = [],
    viewingClubDiaryCount = 0, 
    setSelectedClubId, 
    setSelectedProjectId, 
    setCurrentView 
}) {
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen || !viewingClub) return null;

    const equipeMentor = [...viewingClubOrientadores, ...viewingClubCoorientadores];
    const investigatorCount = viewingClubInvestigadores.length;
    const memberCount = viewingClubUsers.length > 0 ? viewingClubUsers.length : (investigatorCount + equipeMentor.length);
    const investigatorRatio = memberCount ? Math.round((investigatorCount / memberCount) * 100) : 0;
    const clubBannerUrl = String(viewingClub?.banner_url || viewingClub?.banner || '').trim();
    const clubLogoUrl = String(viewingClub?.logo_url || viewingClub?.logo || '').trim();

    const handleAcessarDiario = (projectId) => {
        onClose();
        setSelectedClubId(viewingClub.id);
        setSelectedProjectId(String(projectId || '').trim());
        setCurrentView('diario');
    };

    const handleOpenProfile = (user) => {
        const enrichedUser = {
            ...user,
            clube: user.clube || viewingClub?.nome || user.clube_nome || '',
            projetosCount: user.projetosCount ?? user.projetos?.length ?? user.projetos_ids?.length ?? user.projetosIds?.length ?? 0
        };

        setSelectedUser(enrichedUser);
        setIsProfileModalOpen(true);
    };

    const modalContent = (
        <>
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 sm:p-6 transition-opacity"
            onClick={onClose}
        >
            {/* INJEÇÃO DE CSS DA SCROLLBAR */}
            <style>{`
                .neo-scrollbar::-webkit-scrollbar { width: 8px; }
                .neo-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .neo-scrollbar::-webkit-scrollbar-thumb { background: #0f172a; border-radius: 10px; border: 2px solid #fff; }
            `}</style>

            {/* Container do Modal NEO-BRUTALISTA */}
            <div 
                className="bg-[#FAFAFA] rounded-3xl shadow-[16px_16px_0px_0px_#0f172a] w-full max-w-6xl max-h-[95vh] flex flex-col relative border-4 border-slate-900 overflow-hidden animate-in zoom-in-[0.97] duration-200"
                onClick={(e) => e.stopPropagation()} 
            >
                {/* Botão Flutuante de Fechar */}
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 z-50 w-12 h-12 bg-white border-2 border-slate-900 rounded-xl flex items-center justify-center text-slate-900 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[4px_4px_0px_0px_#0f172a] shadow-[2px_2px_0px_0px_#0f172a] transition-all cursor-pointer"
                    title="Fechar"
                >
                    <X className="w-6 h-6 stroke-[3]" />
                </button>

                {/* Área Rolável do Modal */}
                <div className="overflow-y-auto neo-scrollbar p-6 md:p-10 w-full h-full">
                    
                    {/* Header do Clube (Hero Section Neo-Brutalista) */}
                    <div className="relative overflow-hidden rounded-[2rem] bg-blue-300 border-4 border-slate-900 min-h-[360px] flex flex-col justify-end p-8 md:p-12 shadow-[12px_12px_0px_0px_#0f172a] mb-16">
                        <div className="absolute inset-0 pointer-events-none border-b-4 border-slate-900 bg-slate-200">
                            {clubBannerUrl ? (
                                <img
                                    src={clubBannerUrl}
                                    alt={`Banner do clube ${viewingClub.nome}`}
                                    className="w-full h-full object-cover opacity-90 "
                                />
                            ) : (
                                <div className="absolute inset-0 bg-yellow-300 opacity-50" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent" />
                        </div>

                        <div className="relative z-10 flex flex-col md:flex-row gap-8 justify-between items-end">
                            <div className="max-w-4xl flex-1 flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
                                <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] bg-white overflow-hidden flex items-center justify-center shrink-0">
                                    {clubLogoUrl ? (
                                        <img
                                            src={clubLogoUrl}
                                            alt={`Logo do clube ${viewingClub.nome}`}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-4xl md:text-5xl font-black text-slate-900">
                                            {getInitials(viewingClub.nome)}
                                        </span>
                                    )}
                                </div>

                                <div className="flex-1 pb-2">
                                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter mb-4 leading-[0.9] bg-white/90 backdrop-blur-sm inline-block px-4 py-2 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform -rotate-1">
                                        {viewingClub.nome}
                                    </h1>

                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2">
                                        <p className="text-slate-900 font-black text-sm md:text-base flex items-center gap-2 bg-yellow-300 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] px-4 py-2 uppercase">
                                            <MapIcon className="w-5 h-5 stroke-[3]" /> {viewingClubSchool?.nome || 'Escola não vinculada'}
                                        </p>
                                        <span className="inline-flex items-center gap-2 bg-teal-400 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] px-4 py-2 text-sm font-black text-slate-900 uppercase">
                                            <Microscope className="w-5 h-5 stroke-[3]" />
                                            {investigatorCount} pesquisador{investigatorCount === 1 ? '' : 'es'}
                                        </span>
                                        <span className="text-xs font-black text-white bg-slate-900 px-4 py-3 uppercase tracking-widest border-2 border-slate-900 shadow-[4px_4px_0px_0px_#cbd5e1]">
                                            {investigatorRatio}% da equipe
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Projetos do Clube */}
                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                            <div className="inline-flex items-center gap-4 bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] px-6 py-4 rounded-2xl transform -rotate-1">
                                <div className="w-4 h-8 bg-teal-400 border-2 border-slate-900"></div>
                                <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Projetos do Clube</h3>
                            </div>
                        </div>

                        {viewingClubProjects.length === 0 ? (
                            <div className="bg-white border-4 border-slate-900 shadow-[12px_12px_0px_0px_#0f172a] rounded-[2.5rem] p-16 text-center transform hover:rotate-1 transition-transform">
                                <EmptyState icon={Asterisk} title="NENHUM PROJETO" description="Este clube ainda não possui projetos estruturados." />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {viewingClubProjects.map((project) => {
                                    const projectId = String(project?.id || '').trim();
                                    const isCompleted = project.status?.toLowerCase().includes('conclu');
                                    const projectImage = project?.imagens?.[0] || project?.imagem || '';
                                    const imageCount = Array.isArray(project?.imagens) ? project.imagens.length : (project?.imagem ? 1 : 0);

                                    // Lógica de Fallback

                                    return (
                                        <div key={projectId} className="group relative bg-white border-4 border-slate-900 rounded-[2rem] overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:-translate-x-2 shadow-[8px_8px_0px_0px_#0f172a] hover:shadow-[16px_16px_0px_0px_#0f172a] flex flex-col min-h-[460px]">
                                            <div className="h-56 w-full bg-slate-100 overflow-hidden relative border-b-4 border-slate-900">
                                                {projectImage ? (
                                                    <img
                                                        src={projectImage}
                                                        alt={project.titulo || 'Imagem do projeto'}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 "
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[linear-gradient(135deg,#fde047_0%,#67e8f9_100%)] p-6 text-center">
                                                        <div className="rounded-2xl border-4 border-slate-900 bg-white p-4 shadow-[4px_4px_0px_0px_#0f172a]">
                                                            <FolderKanban className="w-8 h-8 text-slate-900 stroke-[3]" />
                                                        </div>
                                                        <p className="max-w-[16rem] border-2 border-slate-900 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
                                                            Sem imagem cadastrada para este projeto
                                                        </p>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-yellow-300/20 mix-blend-multiply" />

                                                {imageCount > 1 && (
                                                    <span className="absolute top-4 right-4 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-blue-400 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
                                                        {imageCount} fotos
                                                    </span>
                                                )}
                                            </div>

                                            <div className="p-8 flex flex-col flex-1 bg-[#FAFAFA]">
                                                <div className="flex justify-between items-start mb-6">
                                                    <span className={`inline-flex items-center px-4 py-2 text-[10px] font-black uppercase tracking-widest border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] ${isCompleted ? 'bg-teal-400 text-slate-900' : 'bg-yellow-300 text-slate-900'}`}>
                                                        <span className={`w-2 h-2 rounded-full mr-2 border border-slate-900 ${isCompleted ? 'bg-white' : 'bg-slate-900 animate-pulse'}`}></span>
                                                        {project.status || 'Em andamento'}
                                                    </span>
                                                </div>

                                                <h4 className="font-black text-2xl text-slate-900 uppercase tracking-tighter leading-[1.1] mb-4">{project.titulo || 'Projeto sem título'}</h4>

                                                <p className="text-sm font-bold text-slate-600 line-clamp-3 mb-8 flex-1 leading-relaxed">{project.descricao || project.introducao || 'Projeto aguardando documentação descritiva.'}</p>

                                                <div className="mt-auto pt-6 border-t-4 border-slate-900 border-dashed">
                                                    {project.area_tematica && (
                                                        <div className="mb-4">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 bg-pink-400 px-3 py-1.5 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
                                                                {project.area_tematica}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={() => handleAcessarDiario(projectId)}
                                                        className="w-full text-center bg-teal-400 text-slate-900 px-4 py-3 border-2 border-slate-900 font-black text-xs uppercase tracking-widest transition-all shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#0f172a]"
                                                    >
                                                        Acessar Diário
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>

        {/* Modal de Perfil Integrado */}
        <ModalPerfil 
            isOpen={isProfileModalOpen} 
            onClose={() => setIsProfileModalOpen(false)} 
            usuario={selectedUser} 
        />
        </>
    );

    if (typeof document === 'undefined') return modalContent;
    return createPortal(modalContent, document.body);
}
