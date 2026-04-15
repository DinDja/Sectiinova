import React, { useEffect, useState } from 'react';
import { 
    X, User, Map as MapIcon, FolderKanban, Users, 
    BookOpen, Microscope, ExternalLink, Target, 
    GraduationCap, Sparkles, Zap, Building2
} from 'lucide-react';
import EmptyState from '../shared/EmptyState';
import ModalPerfil from './ModalPerfil';
import { getInitials, getLattesLink } from '../../utils/helpers';

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
    // Estado para controlar o modal de perfil
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Travar o scroll da página quando o modal estiver aberto
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    // Se não estiver aberto ou não houver dados, não renderiza
    if (!isOpen || !viewingClub) return null;

    const equipeMentor = [...viewingClubOrientadores, ...viewingClubCoorientadores];
    const investigatorCount = viewingClubInvestigadores.length;
    // Usa o prop viewingClubUsers se estiver preenchido, caso contrário calcula pelo total de perfis
    const memberCount = viewingClubUsers.length > 0 ? viewingClubUsers.length : (investigatorCount + equipeMentor.length);
    const investigatorRatio = memberCount ? Math.round((investigatorCount / memberCount) * 100) : 0;
    const clubBannerUrl = String(viewingClub?.banner_url || viewingClub?.banner || '').trim();
    const clubLogoUrl = String(viewingClub?.logo_url || viewingClub?.logo || '').trim();

    const handleAcessarDiario = (projectId) => {
        onClose(); // Fecha o modal primeiro
        setSelectedClubId(viewingClub.id);
        setSelectedProjectId(projectId);
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

    return (
        <>
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 transition-opacity"
            onClick={onClose}
        >
            {/* Container do Modal */}
            <div 
                className="bg-slate-50 rounded-[3rem] shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col relative animate-fade-in-up border border-slate-100 overflow-hidden"
                onClick={(e) => e.stopPropagation()} // Impede que feche ao clicar dentro
            >
                {/* Botão Flutuante de Fechar */}
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 z-50 w-10 h-10 bg-white/20 hover:bg-white backdrop-blur-md rounded-full flex items-center justify-center text-slate-800 hover:text-red-500 transition-all shadow-sm border border-white/40"
                    title="Fechar"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Área Rolável do Modal */}
                <div className="overflow-y-auto custom-scrollbar p-3 md:p-6 w-full h-full">
                    
                    {/* Header do Clube (Hero Section) */}
                    <div className="relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-100 group min-h-[320px] flex flex-col justify-end p-8 md:p-12 shadow-sm mb-8">
                        <div className="absolute inset-0 pointer-events-none">
                            {clubBannerUrl ? (
                                <img
                                    src={clubBannerUrl}
                                    alt={`Banner do clube ${viewingClub.nome}`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <>
                                    <div className="absolute -top-10 -right-10 w-96 h-96 bg-[#10B981]/20 rounded-full blur-[80px] group-hover:bg-[#10B981]/30 transition-colors duration-700"></div>
                                    <div className="absolute bottom-10 left-20 w-64 h-64 bg-[#FF5722]/20 rounded-full blur-[60px]"></div>
                                    <div className="absolute inset-0 mix-blend-multiply" style={{ backgroundImage: "url('/clubeBG.svg')", backgroundSize: 'cover' }} />
                                </>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/35 via-slate-900/25 to-slate-950/75" />
                        </div>

                        <div className="relative z-10 flex flex-col md:flex-row gap-8 justify-between items-end">
                            <div className="max-w-3xl flex-1 flex items-end gap-5">
                                <div className="w-24 h-24 md:w-28 md:h-28 rounded-3xl border-4 border-white/95 shadow-2xl bg-white/90 backdrop-blur-sm overflow-hidden flex items-center justify-center shrink-0">
                                    {clubLogoUrl ? (
                                        <img
                                            src={clubLogoUrl}
                                            alt={`Logo do clube ${viewingClub.nome}`}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-2xl md:text-3xl font-black text-slate-700">
                                            {getInitials(viewingClub.nome)}
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <h1 className="text-4xl md:text-6xl text-white tracking-tighter mb-4 leading-tight drop-shadow-lg">
                                        {viewingClub.nome}
                                    </h1>

                                    <p className="text-white font-medium text-lg flex items-center gap-2.5 drop-shadow">
                                        <MapIcon className="w-5 h-5 text-[#6EE7B7]" /> {viewingClubSchool?.nome || 'Escola não vinculada'}
                                    </p>
                                    <div className="mt-3 flex flex-wrap items-center gap-3">
                                        <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold text-white border border-white/20">
                                            <Microscope className="w-4 h-4 text-[#FFD1BF]" />
                                            Clubistas: {investigatorCount} pesquisador{investigatorCount === 1 ? '' : 'es'}
                                        </span>
                                        <span className="text-xs font-bold text-white bg-[#10B981]/35 backdrop-blur-sm px-2 py-1 rounded-full border border-[#6EE7B7]/30">
                                            {investigatorRatio}% da equipe
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Grid de Estatísticas e Membros */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10 mb-10">
                        {/* Cards de Números */}
                        <div className="md:col-span-4 grid grid-cols-2 gap-4">
                            {[
                                { icon: FolderKanban, count: viewingClubProjects.length, label: "Projetos", color: "text-[#10B981]", bg: "bg-[#ECFDF5]", border: "border-[#10B981]/20" },
                                { icon: Users, count: memberCount, label: "Membros", color: "text-[#FF5722]", bg: "bg-[#FFF3E0]", border: "border-[#FF5722]/20" },
                                { icon: BookOpen, count: viewingClubDiaryCount, label: "Registros", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
                                { icon: Target, count: equipeMentor.length, label: "Mentores", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" }
                            ].map((stat, i) => (
                                <div key={i} className="bg-white border border-slate-100 rounded-3xl p-6 flex flex-col justify-between hover:border-[#10B981]/30 hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300 group">
                                    <div>
                                        <h4 className="text-4xl font-black text-slate-950 tracking-tight group-hover:text-[#10B981] transition-colors">{stat.count}</h4>
                                        <p className="text-[11px] font-extrabold tracking-widest uppercase text-slate-500 mt-1.5">{stat.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Equipe Mentor */}
                        <div className="md:col-span-4 bg-white border border-slate-100 rounded-3xl p-7 relative overflow-hidden hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300">
                            <h3 className="text-xl font-bold text-slate-900 mb-7 flex items-center gap-3 relative z-10"><GraduationCap className="w-6 h-6 text-[#10B981]" /> Mentores</h3>
                            
                            <div className="space-y-4 relative z-10 overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: "230px" }}>
                                {equipeMentor.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                                        <User className="w-10 h-10 mx-auto mb-3 opacity-50"/>
                                        <p className="text-sm">Sem mentores registrados.</p>
                                    </div>
                                ) : (
                                    equipeMentor.map((person) => (
                                        <div
                                            key={person.id}
                                            onClick={() => handleOpenProfile(person)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenProfile(person); } }}
                                            role="button"
                                            tabIndex={0}
                                            className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-[#10B981]/20 hover:shadow-sm transition-all group/item cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3.5">
                                                <div 
                                                    className="w-11 h-11 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold border-2 border-white shadow-sm group-hover/item:bg-[#10B981] group-hover/item:text-white transition-colors"
                                                    title="Ver perfil"
                                                >
                                                    {getInitials(person.nome)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 leading-tight group-hover/item:text-[#10B981] transition-colors">{person.nome.split(' ').slice(0, 2).join(' ')}</p>
                                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mt-0.5">{viewingClubOrientadores.some(o => o.id === person.id) ? 'Mentor' : 'Co-Mentor'}</p>
                                                </div>
                                            </div>
                                            {getLattesLink(person) && (
                                                <a href={getLattesLink(person)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="w-9 h-9 rounded-xl bg-[#ECFDF5] text-[#10B981] border border-[#10B981]/20 flex items-center justify-center hover:bg-[#10B981] hover:text-white transition-all shadow-sm" title="Ver Lattes"><ExternalLink className="w-4 h-4" /></a>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Clubistas */}
                        <div className="md:col-span-4 bg-white border border-slate-100 rounded-3xl p-7 relative overflow-hidden hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300">
                            <div className="absolute top-0 left-0 w-32 h-32 bg-[#FF5722]/5 rounded-full blur-2xl pointer-events-none"></div>
                            
                            <h3 className="text-xl font-bold text-slate-900 mb-7 flex items-center gap-3 relative z-10"><Microscope className="w-6 h-6 text-[#FF5722]" /> Clubistas</h3>
                            {(
                                <span className="absolute top-7 right-7 z-10 px-4 py-1.5 rounded-full bg-[#FFF3E0] text-[#FF5722] border border-[#FF5722]/20 text-xs font-black shadow-inner">{viewingClubInvestigadores.length}</span>
                            )}

                            <div className="space-y-4 relative z-10 overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: "230px" }}>
                                {viewingClubInvestigadores.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                                        <Users className="w-10 h-10 mx-auto mb-3 opacity-50"/>
                                        <p className="text-sm">Nenhum estudante vinculado.</p>
                                    </div>
                                ) : (
                                    viewingClubInvestigadores.map((person) => (
                                        <div
                                            key={person.id}
                                            onClick={() => handleOpenProfile(person)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenProfile(person); } }}
                                            role="button"
                                            tabIndex={0}
                                            className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-[#FF5722]/20 hover:shadow-sm transition-all group/item cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3.5">
                                                <div 
                                                    className="w-11 h-11 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold border-2 border-white shadow-sm group-hover/item:bg-[#FF5722] group-hover/item:text-white transition-colors"
                                                    title="Ver perfil"
                                                >
                                                    {getInitials(person.nome)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 leading-tight group-hover/item:text-[#FF5722] transition-colors">{person.nome.split(' ').slice(0, 2).join(' ')}</p>
                                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mt-0.5">Clubista</p>
                                                </div>
                                            </div>
                                            {getLattesLink(person) && (
                                                <a href={getLattesLink(person)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="w-9 h-9 rounded-xl bg-[#FFF3E0] text-[#FF5722] border border-[#FF5722]/20 flex items-center justify-center hover:bg-[#FF5722] hover:text-white transition-all shadow-sm" title="Ver Lattes"><ExternalLink className="w-4 h-4" /></a>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Projetos Ativos */}
                    <div className="relative z-10">
                        <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-10">
                                <div className="h-8 w-2 bg-[#10B981] rounded-full shadow-inner"></div>
                                <h3 className="text-3xl font-black text-slate-950 tracking-tight">Projetos Ativos</h3>
                            </div>

                            {viewingClubProjects.length === 0 ? (
                                <div className="h-72 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center p-10 text-center hover:border-[#10B981]/30 transition-colors group">
                                    <EmptyState icon={Sparkles} title="O Radar está Limpo" description="Nenhum projeto detectado neste ecossistema ainda." />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Adicionamos o "index" aqui para a lógica da imagem */}
                                    {viewingClubProjects.map((project, index) => {
                                        const isCompleted = project.status?.toLowerCase().includes('conclu');
                                        const projectImage = project?.imagens?.[0] || project?.imagem || '';
                                        const imageCount = Array.isArray(project?.imagens) ? project.imagens.length : (project?.imagem ? 1 : 0);

                                        // --- NOVA LÓGICA DE FALLBACK AQUI ---
                                        const fallbackBackgrounds = ['/images/BG_1.png', '/images/BG_2.png', '/images/BG_3.png'];
                                        const isFallbackImage = !projectImage;
                                        
                                        // Usa o index do projeto atual para escolher de forma consistente um dos 3 backgrounds
                                        const displayImage = isFallbackImage 
                                            ? fallbackBackgrounds[index % fallbackBackgrounds.length] 
                                            : projectImage;

                                        return (
                                            <div key={project.id} className="group relative bg-white border border-slate-100 hover:border-[#10B981]/30 rounded-[2rem] overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-500/10 min-h-[420px]">
                                                <div className="h-44 sm:h-48 w-full bg-slate-100 overflow-hidden relative">
                                                    
                                                    {/* Imagem sempre renderizada, exibindo o aviso se for fallback */}
                                                    <img
                                                        src={displayImage}
                                                        alt={project.titulo || 'Imagem do projeto'}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    />
                                                    
                                                    {/* Aviso extra idêntico ao do ProjectCard caso seja fallback */}
                                                    {isFallbackImage && (
                                                        <div className="absolute bottom-3 left-3 bg-black/70 text-white text-[11px] sm:text-xs px-2 py-1 rounded-lg font-medium">
                                                            Projeto sem foto. Imagem ilustrativa.
                                                        </div>
                                                    )}

                                                    {imageCount > 1 && (
                                                        <span className="absolute top-2 right-2 px-2 py-1 rounded-full text-[11px] font-black bg-black/65 text-white">
                                                            {imageCount} fotos
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="p-6 flex flex-col h-[calc(100%-12rem)]">
                                                    <div className="flex justify-between items-start mb-4 gap-4">
                                                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-inner ${isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-[#ECFDF5] text-[#047857] border-[#10B981]/20'}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isCompleted ? 'bg-emerald-500' : 'bg-[#10B981] animate-pulse'}`}></span>
                                                            {project.status || 'Em andamento'}
                                                        </span>
                                                    </div>

                                                    <h4 className="font-extrabold text-xl text-slate-950 leading-tight mb-3 group-hover:text-[#10B981] transition-colors">{project.titulo || 'Projeto sem título'}</h4>

                                                    <p className="text-sm text-slate-600 line-clamp-3 mb-8 flex-1 leading-relaxed">{project.descricao || project.introducao || 'Projeto aguardando documentação descritiva.'}</p>

                                                    <div className="mt-auto pt-3 border-t border-slate-100">
                                                        <div className="flex items-center justify-between gap-2 mb-2">
                                                            {project.area_tematica ? (
                                                                <span className="text-[10px] font-extrabold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                                                                    {project.area_tematica}
                                                                </span>
                                                            ) : ""}
                                                        </div>

                                                        <button
                                                            onClick={() => handleAcessarDiario(project.id)}
                                                            className="w-full text-center bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2 rounded-full font-bold text-sm transition-all duration-300 shadow-sm"
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
        </div>

        {/* Modal de Perfil */}
        <ModalPerfil 
            isOpen={isProfileModalOpen} 
            onClose={() => setIsProfileModalOpen(false)} 
            usuario={selectedUser} 
            club={viewingClub}
            clubProjects={viewingClubProjects}
            clubUsers={viewingClubUsers}
        />
        </>
    );
}
