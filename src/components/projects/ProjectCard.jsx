import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Heart, MessageCircle, ChevronDown, ChevronLeft, ChevronRight, X, Eye, Share2, BookOpen, Users, School } from 'lucide-react';
import ModalPerfil from '../club/ModalPerfil';
import ProjectGallery from './ProjectGallery';

const getUserClubIds = () => [];

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
    allProjects = [],
    allUsers = []
}) {
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(project?.likes || 195);
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
    
    const titulo = project?.titulo || "Conectando Saberes: Alunos como Agentes de Transformação Digital no Comercio Local";
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

    // Estado para o Efeito Accordion no Grid
    const [hoveredGridIndex, setHoveredGridIndex] = useState(null);

    // Helpers para obter o layout dinâmico baseado na quantidade de imagens
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
        if (count === 3) {
            return index === 0 ? "col-span-2 row-span-2" : "col-span-1 row-span-1";
        }
        if (count === 4) return "col-span-1 row-span-1";
        if (count >= 5) {
            // Posicionamentos exatos do wireframe (5 imagens)
            return [
                "col-start-1 col-span-1 row-start-1 row-span-1", // Quadrado topo esquerdo
                "col-start-2 col-span-2 row-start-1 row-span-1", // Retângulo topo direito
                "col-start-1 col-span-2 row-start-2 row-span-2", // Quadrado grande esquerdo
                "col-start-1 col-span-2 row-start-4 row-span-1", // Retângulo deitado baixo
                "col-start-3 col-span-1 row-start-2 row-span-3"  // Retângulo alto direito
            ][index];
        }
        return "";
    };

    // Helper para animar as proporções (Efeito Accordion 2D)
    const getGridStyle = (count, hoverIdx) => {
        const style = { 
            transition: 'grid-template-columns 0.4s cubic-bezier(0.4, 0, 0.2, 1), grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
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
            style.gridTemplateColumns = hoverIdx === 0 ? '1.5fr 1fr 1fr'
                                      : hoverIdx === 1 ? '0.8fr 1.2fr 1.2fr'
                                      : (hoverIdx === 2 || hoverIdx === 3) ? '1.2fr 1.2fr 0.8fr'
                                      : hoverIdx === 4 ? '1fr 1fr 1.5fr'
                                      : '1fr 1fr 1fr';
                                      
            style.gridTemplateRows = (hoverIdx === 0 || hoverIdx === 1) ? '1.5fr 1fr 1fr 1fr'
                                   : hoverIdx === 2 ? '1fr 1.5fr 1.5fr 1fr'
                                   : hoverIdx === 3 ? '1fr 1fr 1fr 1.5fr'
                                   : hoverIdx === 4 ? '1fr 1.2fr 1.2fr 1.2fr'
                                   : '1fr 1fr 1fr 1fr';
        }
        return style;
    };

    // Controles avançados de navegação para a galeria
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

        const safeIndex = Math.max(0, Math.min(index, displayImages.length - 1));
        setActiveGalleryIndex(safeIndex);
        setIsGalleryOpen(true);
    };

    const getAvatarSrc = (user) => {
        if (!user || typeof user !== 'object') return null;
        return (
            user.avatar ||
            user.fotoUrl ||
            user.fotoBase64 ||
            user.foto ||
            user.photoUrl ||
            user.photo ||
            user.profilePhoto ||
            user.imagemPerfil ||
            null
        );
    };

    const getTagColor = () => {
        const status = tagText.toLowerCase();
        if (status.includes('concluído') || status.includes('concluido')) return 'bg-emerald-300';
        if (status.includes('em andamento')) return 'bg-blue-300';
        if (status.includes('pendente')) return 'bg-yellow-300';
        return 'bg-orange-300';
    };

    const teamMembers = [
        ...(team?.orientadores?.map(o => ({ ...o, type: 'orientador' })) || []),
        ...(team?.coorientadores?.map(c => ({ ...c, type: 'coorientador' })) || []),
        ...(team?.membros?.map(m => ({ ...m, type: 'membro' })) || [])
    ];
    
    const displayTeam = teamMembers.slice(0, 5);
    const remainingMembers = teamMembers.length - 5;

    const handleLike = () => {
        if (!isLiked) {
            setLikesCount(likesCount + 1);
        } else {
            setLikesCount(likesCount - 1);
        }
        setIsLiked(!isLiked);
        if (onLikeClick) onLikeClick(project);
    };

    const clubProjectsForModal = Array.isArray(allProjects) ? allProjects.filter(p => String(p.clube_id) === String(club?.id)) : [];
    const clubUsersForModal = Array.isArray(allUsers)
        ? allUsers.filter((u) => getUserClubIds(u).includes(String(club?.id)))
        : [];

    const handleShare = () => {
        if (onShareClick) {
            onShareClick(project);
        } else {
            navigator.clipboard.writeText(window.location.href);
        }
    };

    return (
        <article 
            className="bg-[#FAFAFA] rounded-3xl border-4 border-slate-900 overflow-hidden flex flex-col transition-all duration-200 hover:shadow-[14px_14px_0px_0px_#0f172a] hover:-translate-y-1 hover:-translate-x-1 shadow-[10px_10px_0px_0px_#0f172a] group relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            
            {/* Header / Info do Orientador */}
            <div className="p-5 flex items-center justify-between bg-white border-b-4 border-slate-900">
                <div 
                    className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(e) => handleUserClick(e, orientador)}
                >
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-300 to-blue-300 overflow-hidden flex-shrink-0 border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a]">
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
                        <span className="font-black text-slate-900 text-base hover:text-teal-700 transition-colors text-left">
                            {orientador.nome}
                        </span>
                        <div className="flex items-center gap-2 text-sm text-slate-600 font-semibold">
                            <span>{orientador.papel || 'Orientador'}</span>
                            {orientador.instituicao && (
                                <>
                                    <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
                                    <span>{orientador.instituicao}</span>
                                </>
                            )}
                        </div>
                        {(club?.nome || school?.nome) && (
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-1 font-semibold">
                                {club?.nome && <span>{club.nome}</span>}
                                {club?.nome && school?.nome && <span className="w-1 h-1 bg-slate-500 rounded-full inline-block" />}
                                {school?.nome && <span>{school.nome}</span>}
                            </div>
                        )}
                    </div>
                </div>
                
                <span className={`${getTagColor()} text-slate-900 text-xs font-black px-4 py-1.5 rounded-full border-2 border-slate-900 uppercase tracking-wider shadow-[2px_2px_0px_0px_#0f172a] transition-all duration-200 hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[3px_3px_0px_0px_#0f172a] cursor-pointer`}>
                    {tagText}
                </span>
            </div>

            {/* Grid Dinâmico Baseado na Quantidade de Imagens com Efeito Accordion */}
            <div className="relative w-full h-[340px] sm:h-[440px] bg-white overflow-hidden border-b-4 border-slate-900">
                {imageCount > 0 ? (
                    <>
                        <div 
                            className={`absolute inset-0 p-3 grid gap-2.5 ${getGridContainerClass(gridItems.length)}`}
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
                                        className={`relative rounded-xl overflow-hidden border-2 border-slate-900 transition-all duration-500 shadow-[2px_2px_0px_0px_#0f172a] focus:outline-none cursor-pointer ${gridClasses} ${hoveredGridIndex === index ? 'shadow-[4px_4px_0px_0px_#0f172a] -translate-y-0.5 z-10' : 'z-0'}`}
                                        title={`Abrir foto ${index + 1}`}
                                    >
                                        <img
                                            src={imageSrc}
                                            alt={`${titulo} - detalhe ${index + 1}`}
                                            className={`w-full h-full object-cover transition-transform duration-700 ${hoveredGridIndex === index ? 'scale-105' : 'scale-100'}`}
                                        />
                                        <div className={`absolute inset-0 transition-opacity duration-500 ${hoveredGridIndex === index ? 'bg-transparent' : 'bg-black/20 hover:bg-black/10'}`} />
                                        
                                        {shouldShowHiddenBadge && (
                                            <div className="absolute inset-0 bg-black/60 hover:bg-black/40 transition-colors text-white font-black text-2xl flex items-center justify-center backdrop-blur-sm">
                                                +{hiddenImagesCount}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        
                    
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-100">
                        <BookOpen className="w-12 h-12 mb-2 opacity-50" />
                        <span className="font-semibold opacity-70">Projeto sem imagens</span>
                    </div>
                )}
            </div>

            {/* Conteúdo: Título e Descrição */}
            <div className="p-6 pb-4 flex flex-col gap-4 bg-[#FAFAFA]">
                <h2 className="text-[22px] sm:text-2xl font-black text-slate-900 leading-snug line-clamp-2 hover:text-teal-700 transition-colors cursor-pointer">
                    {titulo}
                </h2>
                
                <p className="text-slate-700 text-sm leading-relaxed line-clamp-3 font-semibold">
                    {descricao}
                </p>
                {project?.area_tematica && (
                    <span className="inline-flex items-center mt-2 text-xs font-black uppercase tracking-wider text-slate-900 bg-blue-200 border-2 border-slate-900 rounded-full px-3 py-1 shadow-[2px_2px_0px_0px_#0f172a] w-fit">
                        {project.area_tematica}
                    </span>
                )}

                {/* Equipe do Projeto */}
                {teamMembers.length > 0 && (
                    <div className="flex items-center gap-3 mt-2 pt-3 border-t-2 border-slate-900/20">
                        <div className="flex items-center gap-1 text-slate-700 text-sm font-bold">
                            <Users className="w-4 h-4" />
                            <span>Equipe</span>
                        </div>
                        <div className="flex -space-x-2">
                            {displayTeam.map((member, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={(e) => handleUserClick(e, member)}
                                    className="relative group/avatar w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-slate-900 bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden shadow-[2px_2px_0px_0px_#0f172a] transition-all duration-200 hover:scale-110 hover:z-10 cursor-pointer"
                                    title={`${member.nome} - ${member.type === 'orientador' ? 'Orientador' : member.type === 'coorientador' ? 'Coorientador' : 'Membro'}`}
                                >
                                    {getAvatarSrc(member) ? (
                                        <img src={getAvatarSrc(member)} alt={member.nome} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-700 font-bold text-xs">
                                            {member.nome ? member.nome.charAt(0) : '?'}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {remainingMembers > 0 && (
                            <button className="text-slate-900 font-black text-sm hover:text-teal-700 transition-colors flex items-center gap-1 ml-1">
                                +{remainingMembers} outros
                                <ChevronDown className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Métricas e Indicadores */}
            <div className="px-6 pb-20 pt-2">
                <div className="flex items-center gap-4 sm:gap-6 mb-4"></div>

                {isCompleted === false && project?.progress && (
                    <div className="mt-4">
                        <div className="flex justify-between text-xs text-slate-700 font-bold mb-1">
                            <span>Progresso do Projeto</span>
                            <span>{project.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden border-2 border-slate-900">
                            <div 
                                className="bg-gradient-to-r from-teal-400 to-blue-400 h-full rounded-full transition-all duration-500"
                                style={{ width: `${project.progress}%` }}
                            ></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Botões de Ação: Clube e Diário */}
            <div className="absolute bottom-6 right-6 z-10 flex items-center gap-3">
                {club && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onClubClick) onClubClick();
                        }}
                        className="group/btn-club bg-white border-2 border-slate-900 text-slate-900 hover:bg-yellow-300 px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 transition-all duration-200 shadow-[3px_3px_0px_0px_#0f172a] hover:shadow-[5px_5px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:-translate-x-0.5"
                        title="Ver página do clube"
                    >
                        <School className="w-4 h-4 transition-transform duration-300 group-hover/btn-club:scale-110" />
                        Ver Clube
                    </button>
                )}

                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onDiaryClick) onDiaryClick();
                    }}
                    className="group/btn bg-teal-400 hover:bg-teal-300 text-slate-900 border-2 border-slate-900 px-6 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 transition-all duration-200 shadow-[4px_4px_0px_0px_#0f172a] hover:shadow-[6px_6px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:-translate-x-0.5"
                >
                    <BookOpen className="w-4 h-4 transition-transform duration-300 group-hover/btn:rotate-12" />
                    Acessar Diário
                    <ChevronDown className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-y-0.5" />
                </button>
            </div> 

            <ProjectGallery
                images={displayImages}
                initialIndex={activeGalleryIndex}
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                title={titulo}
            />

            {/* MODAL RENDERIZADO AQUI */}
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