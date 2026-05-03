import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { MessageCircle, ChevronDown, ChevronLeft, ChevronRight, X, Eye, Share2, BookOpen, Users, School, Sparkles } from 'lucide-react';
import ModalPerfil from '../club/ModalPerfil';
import ProjectGallery from './ProjectGallery';

const getUserClubIds = () => [];

const normalizeLikeCount = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.trunc(parsed));
};

const resolveProjectLikesCount = (project) => {
    return normalizeLikeCount(
        project?.likes_count
        ?? project?.likesCount
        ?? project?.likes
        ?? 0
    );
};

const resolveUserHasLikedProject = (project, userId) => {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) {
        return false;
    }

    const likesByUser = project?.likes_by_user;
    if (!likesByUser || typeof likesByUser !== 'object' || Array.isArray(likesByUser)) {
        return false;
    }

    return likesByUser[normalizedUserId] === true;
};

export default function ProjectCard({
    project,
    club,
    school,
    isCompleted,
    team,
    investigatorNames,
    onClubClick,
    onDiaryClick,
    onLikeClick,
    onShareClick,
    loggedUserId = '',
    isLikeSubmitting = false,
    allProjects = [],
    allUsers = []
}) {
    const normalizedLoggedUserId = String(loggedUserId || '').trim();
    const canLikeProject = Boolean(normalizedLoggedUserId);
    const likesCount = useMemo(() => resolveProjectLikesCount(project), [project?.likes_count, project?.likesCount, project?.likes]);
    const isLiked = useMemo(() => resolveUserHasLikedProject(project, normalizedLoggedUserId), [project?.likes_by_user, normalizedLoggedUserId]);
    const [isLikePending, setIsLikePending] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const handleUserClick = (e, user) => {
        e.stopPropagation();
        e.preventDefault();
        setSelectedUser(user);
        setIsProfileModalOpen(true);
    };

    const defaultOrientador = {
        nome: 'Orientador não informado',
        papel: 'Orientador',
        instituicao: ''
    };

    const firstAvailableMentor =
        team?.orientadores?.[0] ||
        team?.coorientadores?.[0] ||
        team?.investigadores?.[0] ||
        defaultOrientador;

    const orientador = {
        ...defaultOrientador,
        ...firstAvailableMentor,
        papel: firstAvailableMentor.papel || 'Orientador'
    };
    
    const titulo = project?.titulo || "Conectando Saberes: Alunos como Agentes de Transformação Digital no Comércio Local";
    const tagText = project?.status || "EIXO PROJETOS";
    const descricao = project?.descricao || "Projeto inovador que conecta estudantes do ensino médio com pequenos comerciantes locais para promover a transformação digital e o desenvolvimento comunitário sustentável.";
    
    const projectImages = useMemo(() => {
        const normalizedImages = Array.isArray(project?.imagens)
            ? project.imagens.filter((img) => typeof img === 'string' && img.trim())
            : [];

        if (normalizedImages.length > 0) {
            return normalizedImages;
        }

        if (typeof project?.imagem === 'string' && project.imagem.trim()) {
            return [project.imagem];
        }

        return [];
    }, [project?.imagem, project?.imagens]);

    const displayImages = projectImages;
    const imageCount = displayImages.length;

    // Lógica para o Grid Dinâmico - Máximo 5 posições
    const gridItems = displayImages.slice(0, 5);
    const hiddenImagesCount = Math.max(0, imageCount - 5);

    const [hoveredGridIndex, setHoveredGridIndex] = useState(null);

    const getGridContainerClass = (count) => {
        switch(count) {
            case 1: return "grid-cols-1 grid-rows-1";
            case 2: return "grid-cols-2 grid-rows-1";
            case 3: return "grid-cols-3 grid-rows-2";
            case 4: return "grid-cols-2 grid-rows-2";
            case 5: return "grid-cols-3 grid-rows-4";
            default: return "grid-cols-1 grid-rows-1";
        }
    };

    const getGridItemClass = (count, index) => {
        if (count === 1) return "col-span-1 row-span-1";
        if (count === 2) return "col-span-1 row-span-1";
        if (count === 3) return index === 0 ? "col-span-2 row-span-2" : "col-span-1 row-span-1";
        if (count === 4) return "col-span-1 row-span-1";
        if (count >= 5) {
            return [
                "col-start-1 col-span-1 row-start-1 row-span-1", 
                "col-start-2 col-span-2 row-start-1 row-span-1", 
                "col-start-1 col-span-2 row-start-2 row-span-2", 
                "col-start-1 col-span-2 row-start-4 row-span-1", 
                "col-start-3 col-span-1 row-start-2 row-span-3"  
            ][index];
        }
        return "";
    };

    const getGridStyle = (count, hoverIdx) => {
        const style = { 
            transition: 'grid-template-columns 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), grid-template-rows 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' 
        };
        
        if (count === 1) {
            style.gridTemplateColumns = '1fr';
            style.gridTemplateRows = '1fr';
        } else if (count === 2) {
            style.gridTemplateColumns = hoverIdx === 0 ? '2fr 1fr' : hoverIdx === 1 ? '1fr 2fr' : '1fr 1fr';
            style.gridTemplateRows = '1fr';
        } else if (count === 3) {
            style.gridTemplateColumns = hoverIdx === 0 ? '1.5fr 1fr 0.5fr' : (hoverIdx === 1 || hoverIdx === 2) ? '1fr 1fr 1.5fr' : '1fr 1fr 1fr';
            style.gridTemplateRows = hoverIdx === 1 ? '1.5fr 1fr' : hoverIdx === 2 ? '1fr 1.5fr' : '1fr 1fr';
        } else if (count === 4) {
            style.gridTemplateColumns = (hoverIdx === 0 || hoverIdx === 2) ? '1.5fr 1fr' : (hoverIdx === 1 || hoverIdx === 3) ? '1fr 1.5fr' : '1fr 1fr';
            style.gridTemplateRows = (hoverIdx === 0 || hoverIdx === 1) ? '1.5fr 1fr' : (hoverIdx === 2 || hoverIdx === 3) ? '1fr 1.5fr' : '1fr 1fr';
        } else if (count >= 5) {
            style.gridTemplateColumns = hoverIdx === 0 ? '1.5fr 1fr 1fr' : hoverIdx === 1 ? '0.8fr 1.2fr 1.2fr' : (hoverIdx === 2 || hoverIdx === 3) ? '1.2fr 1.2fr 0.8fr' : hoverIdx === 4 ? '1fr 1fr 1.5fr' : '1fr 1fr 1fr';
            style.gridTemplateRows = (hoverIdx === 0 || hoverIdx === 1) ? '1.5fr 1fr 1fr 1fr' : hoverIdx === 2 ? '1fr 1.5fr 1.5fr 1fr' : hoverIdx === 3 ? '1fr 1fr 1fr 1.5fr' : hoverIdx === 4 ? '1fr 1.2fr 1.2fr 1.2fr' : '1fr 1fr 1fr 1fr';
        }
        return style;
    };

    const handleNextImage = useCallback((e) => {
        if (e) e.stopPropagation();
        setActiveGalleryIndex((prev) => (prev + 1) % displayImages.length);
    }, [displayImages.length]);

    const handlePrevImage = useCallback((e) => {
        if (e) e.stopPropagation();
        setActiveGalleryIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
    }, [displayImages.length]);

    useEffect(() => {
        if (!isGalleryOpen) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') setIsGalleryOpen(false);
            if (event.key === 'ArrowRight') handleNextImage();
            if (event.key === 'ArrowLeft') handlePrevImage();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isGalleryOpen, handleNextImage, handlePrevImage]);

    const openGalleryAt = (index = 0) => {
        if (displayImages.length === 0 || !displayImages[index]) return;
        setActiveGalleryIndex(Math.max(0, Math.min(index, displayImages.length - 1)));
        setIsGalleryOpen(true);
    };

    const getAvatarSrc = (user) => {
        if (!user || typeof user !== 'object') return null;
        return user.avatar || user.fotoUrl || user.fotoBase64 || user.foto || user.photoUrl || user.photo || user.profilePhoto || user.imagemPerfil || null;
    };

    // Cores inspiradas na logo do Pop Ciência
    const getTagColor = () => {
        const status = tagText.toLowerCase();
        if (status.includes('concluído') || status.includes('concluido')) return 'bg-cyan-400 text-slate-900';
        if (status.includes('em andamento')) return 'bg-yellow-400 text-slate-900';
        if (status.includes('pendente')) return 'bg-slate-200 text-slate-900';
        return 'bg-pink-500 text-white';
    };

    const teamMembers = useMemo(() => {
        const normalizeKey = (member) => {
            if (!member || typeof member !== 'object') return '';
            return String(member.id || member.matricula || member.email || member.nome || member.uid || '').trim().toLowerCase();
        };
        const uniqueMembers = new Map();
        const addMembers = (members, type) => {
            (Array.isArray(members) ? members : []).forEach((member) => {
                const key = normalizeKey(member);
                if (!key) return;
                if (!uniqueMembers.has(key)) uniqueMembers.set(key, { ...member, type });
            });
        };
        addMembers(team?.orientadores, 'orientador');
        addMembers(team?.coorientadores, 'coorientador');
        addMembers(team?.investigadores, 'investigador');
        addMembers(team?.membros, 'membro');
        return Array.from(uniqueMembers.values());
    }, [team?.orientadores, team?.coorientadores, team?.investigadores, team?.membros]);
    
    const displayTeam = teamMembers.slice(0, 5);
    const remainingMembers = Math.max(0, teamMembers.length - 5);

    const handleLike = useCallback(async (event) => {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        if (!canLikeProject || isLikePending || isLikeSubmitting) {
            return;
        }

        if (typeof onLikeClick !== 'function') {
            return;
        }

        try {
            setIsLikePending(true);
            await onLikeClick(project);
        } finally {
            setIsLikePending(false);
        }
    }, [canLikeProject, isLikePending, isLikeSubmitting, onLikeClick, project]);

    const clubProjectsForModal = Array.isArray(allProjects) ? allProjects.filter(p => String(p.clube_id) === String(club?.id)) : [];
    const clubUsersForModal = Array.isArray(allUsers) ? allUsers.filter((u) => getUserClubIds(u).includes(String(club?.id))) : [];
    const isLikeDisabled = !canLikeProject || isLikePending || isLikeSubmitting;
    const previousLikeCount = isLiked ? Math.max(0, likesCount - 1) : likesCount;
    const nextLikeCount = isLiked ? likesCount : likesCount + 1;

    return (
        <article 
            className="bg-white rounded-[2.5rem] border-[3px] border-slate-900 overflow-hidden flex flex-col transition-all duration-300 shadow-lg hover:shadow-2xl group relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            
            {/* Header: Estilo Quadrinho (Linhas curvas, tag rotacionada) */}
            <div className="p-5 flex items-center justify-between bg-white border-b-[3px] border-slate-900 relative overflow-hidden">
                {/* Elemento de fundo sutil para dar ar de HQ */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-400 rounded-full opacity-20 pointer-events-none"></div>

                <div 
                    className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity z-10"
                    onClick={(e) => handleUserClick(e, orientador)}
                >
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-cyan-300 overflow-hidden flex-shrink-0 border-[3px] border-slate-900">
                            {getAvatarSrc(orientador) ? (
                                <img src={getAvatarSrc(orientador)} alt={orientador.nome} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-900 font-black text-lg">
                                    {orientador.nome.charAt(0)}   
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-base hover:text-pink-500 transition-colors text-left">
                            {orientador.nome}
                        </span>
                        <div className="flex items-center gap-2 text-sm text-slate-600 font-bold">
                            <span>{orientador.papel || 'Orientador'}</span>
                            {orientador.instituicao && (
                                <>
                                    <span className="w-1.5 h-1.5 bg-pink-500 rounded-full"></span>
                                    <span>{orientador.instituicao}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Tag rotacionada estilo "adesivo/selo" de quadrinho */}
                <div className="relative z-10">
                    <span className={`${getTagColor()} text-xs font-black px-4 py-2 rounded-full border-[3px] border-slate-900 uppercase tracking-wider inline-block transform -rotate-2 hover:rotate-0 transition-transform duration-300 cursor-pointer`}>
                        {tagText}
                    </span>
                </div>
            </div>

            {/* Grid de Imagens: Molduras Arredondadas */}
            <div className="relative w-full h-[340px] sm:h-[420px] bg-slate-50 overflow-hidden border-b-[3px] border-slate-900">
                {imageCount > 0 ? (
                    <div 
                        className={`absolute inset-0 p-3 grid gap-3 ${getGridContainerClass(gridItems.length)}`}
                        style={getGridStyle(gridItems.length, hoveredGridIndex)}
                        onMouseLeave={() => setHoveredGridIndex(null)}
                    >
                        {gridItems.map((imageSrc, index) => {
                            const isLastSlot = index === gridItems.length - 1;
                            const shouldShowHiddenBadge = isLastSlot && hiddenImagesCount > 0;
                            const gridClasses = getGridItemClass(gridItems.length, index);

                            return (
                                <button
                                    key={`${project?.id || 'project'}-grid-${index}`}
                                    type="button"
                                    onClick={() => openGalleryAt(index)}
                                    onMouseEnter={() => setHoveredGridIndex(index)}
                                    className={`relative rounded-2xl overflow-hidden border-[3px] border-slate-900 transition-all duration-500 focus:outline-none cursor-pointer ${gridClasses} ${hoveredGridIndex === index ? 'shadow-lg scale-[1.03] z-10' : 'z-0'}`}
                                    title={`Abrir foto ${index + 1}`}
                                >
                                    <img
                                        src={imageSrc}
                                        alt={`${titulo} - detalhe ${index + 1}`}
                                        className={`w-full h-full object-cover transition-transform duration-700 ${hoveredGridIndex === index ? 'scale-110' : 'scale-100'}`}
                                    />
                                    <div className={`absolute inset-0 transition-opacity duration-500 ${hoveredGridIndex === index ? 'bg-transparent' : 'bg-slate-900/10'}`} />
                                    
                                    {shouldShowHiddenBadge && (
                                        <div className="absolute inset-0 bg-pink-500/80 hover:bg-pink-500/90 transition-colors text-white font-black text-3xl flex items-center justify-center backdrop-blur-sm">
                                            +{hiddenImagesCount}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <Sparkles className="w-12 h-12 mb-2 opacity-50" />
                        <span className="font-bold text-slate-500">Aguardando imagens...</span>
                    </div>
                )}
            </div>

            {/* Conteúdo Central */}
            <div className="p-6 pb-4 flex flex-col gap-4 bg-white relative">
                {/* Background dots (retícula sutil via CSS) */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '16px 16px' }}></div>

                <h2 className="text-[22px] sm:text-2xl font-black text-slate-900 leading-snug line-clamp-2 hover:text-cyan-500 transition-colors cursor-pointer relative z-10">
                    {titulo}
                </h2>
                
                <p className="text-slate-600 text-sm leading-relaxed line-clamp-3 font-semibold relative z-10">
                    {descricao}
                </p>
                
                {project?.area_tematica && (
                    <span className="inline-flex items-center mt-1 text-xs font-black uppercase tracking-wider text-slate-900 bg-yellow-300 border-[2px] border-slate-900 rounded-full px-3 py-1 w-fit relative z-10">
                        {project.area_tematica}
                    </span>
                )}

                {/* Equipe do Projeto */}
                {teamMembers.length > 0 && (
                    <div className="flex items-center gap-3 mt-3 pt-4 border-t-[2px] border-dashed border-slate-300 relative z-10">
                        <div className="flex items-center gap-1 text-slate-500 text-sm font-black">
                            <Users className="w-4 h-4 text-pink-500" />
                            <span>EQUIPE</span>
                        </div>
                        <div className="flex -space-x-2">
                            {displayTeam.map((member, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={(e) => handleUserClick(e, member)}
                                    className="relative group/avatar w-9 h-9 sm:w-10 sm:h-10 rounded-full border-[2px] border-slate-900 bg-cyan-100 overflow-hidden transition-transform duration-200 hover:scale-110 hover:z-10 cursor-pointer"
                                    title={`${member.nome} - ${member.type}`}
                                >
                                    {getAvatarSrc(member) ? (
                                        <img src={getAvatarSrc(member)} alt={member.nome} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-900 font-bold text-xs bg-yellow-200">
                                            {member.nome ? member.nome.charAt(0) : '?'}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {remainingMembers > 0 && (
                            <button className="text-slate-500 font-black text-xs hover:text-pink-500 transition-colors flex items-center gap-1 ml-1 bg-slate-100 px-2 py-1 rounded-full border-2 border-transparent hover:border-pink-500">
                                +{remainingMembers}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom/Ações */}
            <div className="px-6 pb-20 pt-2 bg-white relative z-10">
                {isCompleted === false && project?.progress && (
                    <div className="mt-2">
                        <div className="flex justify-between text-xs text-slate-900 font-black mb-1.5 uppercase">
                            <span>Progresso</span>
                            <span className="text-pink-500">{project.progress}%</span>
                        </div>
                        {/* Barra de progresso arredondada estilo cápsula */}
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border-[2px] border-slate-900">
                            <div 
                                className="bg-cyan-400 h-full rounded-r-full transition-all duration-500 border-r-[2px] border-slate-900"
                                style={{ width: `${project.progress}%` }}
                            ></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Botões Flutuantes (Pill-shaped, HQ Vibe) */}
            <div className="absolute bottom-6 right-6 z-20 flex items-center gap-3">
                <div className={`project-like-button ${isLikeDisabled ? 'is-disabled' : ''}`}>
                    <input
                        className="project-like-toggle"
                        type="checkbox"
                        checked={isLiked}
                        readOnly
                        tabIndex={-1}
                        aria-hidden="true"
                    />
                    <button
                        type="button"
                        onClick={handleLike}
                        disabled={isLikeDisabled}
                        className="project-like-control like"
                        title={canLikeProject ? (isLiked ? 'Descurtir projeto' : 'Curtir projeto') : 'Faca login para curtir projetos'}
                    >
                        <svg
                            className={`like-icon ${isLikePending || isLikeSubmitting ? 'is-pending' : ''}`}
                            fillRule="nonzero"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                        >
                            <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
                        </svg>
                        <span className="like-text">Likes</span>
                    </button>
                    <span className="like-count one">{previousLikeCount}</span>
                    <span className="like-count two">{nextLikeCount}</span>
                </div>

                {club && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onClubClick) onClubClick();
                        }}
                        className="group/btn-club bg-white border-[3px] border-slate-900 text-slate-900 hover:bg-yellow-400 px-4 py-2.5 rounded-full text-sm font-black flex items-center gap-2 transition-transform duration-200 hover:scale-105"
                        title="Ver página do clube"
                    >
                        <School className="w-4 h-4 text-slate-900" />
                        <span className="hidden sm:inline">Clube</span>
                    </button>
                )}

                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onDiaryClick) onDiaryClick();
                    }}
                    className="group/btn bg-pink-500 hover:bg-pink-400 text-white border-[3px] border-slate-900 px-6 py-2.5 rounded-full text-sm font-black flex items-center gap-2 transition-transform duration-200 hover:scale-105"
                >
                    <BookOpen className="w-4 h-4" />
                    Diário
                    <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                </button>
            </div> 

            <ProjectGallery
                images={displayImages}
                initialIndex={activeGalleryIndex}
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                title={titulo}
            />

            <ModalPerfil
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                usuario={selectedUser}
                club={club}
                clubProjects={clubProjectsForModal}
                clubUsers={clubUsersForModal}
            />
        </article>
    );
}
