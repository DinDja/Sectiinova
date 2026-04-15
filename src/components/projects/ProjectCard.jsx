import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, MessageCircle, ChevronDown, Eye, Share2, BookOpen, Users, School } from 'lucide-react';

import ModalPerfil from '../club/ModalPerfil';
import { getUserClubIds } from '../../services/projectService';

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
    const [hoveredCollageIndex, setHoveredCollageIndex] = useState(null);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
    const collageHoverPointerRef = useRef({ x: null, y: null });

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const handleUserClick = (e, user) => {
        e.stopPropagation();
        e.preventDefault();
        setSelectedUser(user);
        setIsProfileModalOpen(true);
    };

    const defaultOrientador = {
        nome: 'Orientador nÃ£o informado',
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

    const projectImage = projectImages[0] || '';
    const imageCount = projectImages.length;
    const hasMultipleImages = imageCount > 1;

    const fallbackBackgrounds = ['/images/BG_1.png', '/images/BG_2.png', '/images/BG_3.png'];
    const isFallbackImage = !projectImage;
    const backgroundImage = useMemo(() => {
        if (!isFallbackImage) return '';
        return fallbackBackgrounds[Math.floor(Math.random() * fallbackBackgrounds.length)];
    }, [isFallbackImage]);
    const displayImage = isFallbackImage ? backgroundImage : projectImage;
    const collageImages = projectImages.slice(0, 4);
    const hiddenImagesCount = Math.max(0, imageCount - collageImages.length);
    const collageOrder = useMemo(() => {
        const indexes = collageImages.map((_, index) => index);
        const hasValidHoveredIndex =
            hoveredCollageIndex !== null &&
            hoveredCollageIndex >= 0 &&
            hoveredCollageIndex < indexes.length;

        if (!hasValidHoveredIndex) {
            return indexes;
        }

        return [hoveredCollageIndex, ...indexes.filter((index) => index !== hoveredCollageIndex)];
    }, [collageImages, hoveredCollageIndex]);

    useEffect(() => {
        if (!isGalleryOpen) return undefined;

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setIsGalleryOpen(false);
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isGalleryOpen]);

    useEffect(() => {
        if (collageImages.length <= 1) {
            collageHoverPointerRef.current = { x: null, y: null };
            setHoveredCollageIndex(null);
            return;
        }

        if (hoveredCollageIndex !== null && hoveredCollageIndex >= collageImages.length) {
            setHoveredCollageIndex(null);
        }
    }, [collageImages.length, hoveredCollageIndex]);

    const handleCollageHover = (event, imageIndex) => {
        if (hoveredCollageIndex === imageIndex) {
            return;
        }

        const clientX = Number(event?.clientX);
        const clientY = Number(event?.clientY);
        const hasPointerCoords = Number.isFinite(clientX) && Number.isFinite(clientY);
        const lastX = collageHoverPointerRef.current.x;
        const lastY = collageHoverPointerRef.current.y;
        const hasLastCoords = Number.isFinite(lastX) && Number.isFinite(lastY);

        // Evita loop de troca causado pelo reflow da grade sem movimento real do cursor.
        if (hasPointerCoords && hasLastCoords) {
            const pointerDistance = Math.hypot(clientX - lastX, clientY - lastY);
            if (pointerDistance < 10) {
                return;
            }
        }

        collageHoverPointerRef.current = hasPointerCoords
            ? { x: clientX, y: clientY }
            : { x: null, y: null };

        setHoveredCollageIndex(imageIndex);
    };

    const handleCollageLeave = () => {
        collageHoverPointerRef.current = { x: null, y: null };
        setHoveredCollageIndex(null);
    };

    const openGalleryAt = (index = 0) => {
        if (imageCount === 0) return;

        const safeIndex = Math.max(0, Math.min(index, imageCount - 1));
        setActiveGalleryIndex(safeIndex);
        setIsGalleryOpen(true);
    };

    const getCollageSlotClass = (index, count) => {
        if (count === 2) {
            return index === 0
                ? 'col-start-1 row-start-1 col-span-3 row-span-2'
                : 'col-start-4 row-start-1 col-span-1 row-span-2';
        }

        if (count === 3) {
            if (index === 0) return 'col-start-1 row-start-1 col-span-2 row-span-2';
            if (index === 1) return 'col-start-3 row-start-1 col-span-2 row-span-1';
            return 'col-start-3 row-start-2 col-span-2 row-span-1';
        }

        if (index === 0) return 'col-start-1 row-start-1 col-span-2 row-span-2';
        if (index === 1) return 'col-start-3 row-start-1 col-span-1 row-span-1';
        if (index === 2) return 'col-start-4 row-start-1 col-span-1 row-span-1';
        return 'col-start-3 row-start-2 col-span-2 row-span-1';
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
        if (status.includes('concluÃ­do') || status.includes('concluido')) return 'bg-emerald-300';
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
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-teal-400 rounded-full border-2 border-slate-900"></div>
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

            {/* Imagem Principal */}
            <div className="relative w-full h-[260px] sm:h-[320px] bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden border-b-4 border-slate-900">
                {hasMultipleImages ? (
                    <>
                        <div
                            className="absolute inset-0 p-2 sm:p-3 grid grid-cols-4 grid-rows-2 gap-2"
                            onMouseLeave={handleCollageLeave}
                        >
                            {collageOrder.map((imageIndex, slotIndex) => {
                                const imageSrc = collageImages[imageIndex];
                                const isHoveredTile = hoveredCollageIndex === imageIndex;
                                const isLastVisibleTile = slotIndex === collageOrder.length - 1;
                                const shouldShowHiddenBadge = isLastVisibleTile && hiddenImagesCount > 0;

                                return (
                                    <button
                                        key={`${project?.id || 'project'}-img-${imageIndex}`}
                                        type="button"
                                        onClick={() => openGalleryAt(imageIndex)}
                                        onMouseEnter={(event) => handleCollageHover(event, imageIndex)}
                                        onFocus={() => {
                                            collageHoverPointerRef.current = { x: null, y: null };
                                            setHoveredCollageIndex(imageIndex);
                                        }}
                                        className={`${getCollageSlotClass(slotIndex, collageImages.length)} relative rounded-2xl overflow-hidden transition-all duration-300 border-2 border-slate-900 focus:outline-none focus:ring-2 focus:ring-white/70 ${
                                            isHoveredTile ? 'z-20 shadow-[8px_8px_0px_0px_#0f172a] ring-2 ring-white/65 -translate-y-0.5 -translate-x-0.5' : 'z-10 shadow-[4px_4px_0px_0px_#0f172a]'
                                        }`}
                                        title={`Abrir foto ${imageIndex + 1} de ${imageCount}`}
                                    >
                                        <img
                                            src={imageSrc}
                                            alt={`${titulo} - foto ${imageIndex + 1}`}
                                            className={`w-full h-full object-cover transition-transform duration-700 ${
                                                isHoveredTile ? 'scale-110' : isHovered ? 'scale-105' : 'scale-100'
                                            }`}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                        {shouldShowHiddenBadge && (
                                            <div className="absolute inset-0 bg-black/55 text-white font-bold text-xl flex items-center justify-center">
                                                +{hiddenImagesCount}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            onClick={() => openGalleryAt(0)}
                            className="absolute top-3 left-3 bg-yellow-300 border-2 border-slate-900 text-slate-900 text-xs font-black px-2 py-1 rounded-xl shadow-[2px_2px_0px_0px_#0f172a] hover:bg-yellow-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white/70"
                            title="Abrir mural de fotos"
                        >
                            Mural - {imageCount} fotos
                        </button>
                    </>
                ) : displayImage ? (
                    <button
                        type="button"
                        onClick={() => openGalleryAt(0)}
                        className="w-full h-full text-left"
                        title="Abrir foto do projeto"
                    >
                        <img
                            src={displayImage}
                            alt={titulo}
                            className={`w-full h-full object-cover transition-transform duration-700 ${isHovered ? 'scale-110' : 'scale-100'}`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        {isFallbackImage && (
                            <div className="absolute bottom-3 left-3 bg-white border-2 border-slate-900 text-slate-900 text-[11px] sm:text-xs px-2 py-1 rounded-lg font-bold shadow-[2px_2px_0px_0px_#0f172a]">
                                Projeto sem foto. Imagem ilustrativa.
                            </div>
                        )}
                    </button>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                        <BookOpen className="w-12 h-12 mb-2" />
                        <span>Imagem do Projeto nÃ£o disponÃ­vel</span>
                    </div>
                )}
            </div>

            {/* ConteÃºdo: TÃ­tulo e DescriÃ§Ã£o */}
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

            {/* MÃ©tricas e Indicadores */}
            <div className="px-6 pb-20 pt-2">
                <div className="flex items-center gap-4 sm:gap-6 mb-4"></div>

                {/* Indicador de progresso se o projeto estiver em andamento */}
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

            {/* BotÃµes de AÃ§Ã£o: Clube e DiÃ¡rio */}
            <div className="absolute bottom-6 right-6 z-10 flex items-center gap-3">
                {/* BotÃ£o Acessar Clube */}
                {club && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onClubClick) onClubClick();
                        }}
                        className="group/btn-club bg-white border-2 border-slate-900 text-slate-900 hover:bg-yellow-300 px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 transition-all duration-200 shadow-[3px_3px_0px_0px_#0f172a] hover:shadow-[5px_5px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:-translate-x-0.5"
                        title="Ver pÃ¡gina do clube"
                    >
                        <School className="w-4 h-4 transition-transform duration-300 group-hover/btn-club:scale-110" />
                        Ver Clube
                    </button>
                )}

                {/* Botão Acessar Diário */}
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

            {isGalleryOpen && (
                <div
                    className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm p-4 sm:p-8"
                    onClick={() => setIsGalleryOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Galeria de fotos do projeto"
                >
                    <div
                        className="max-w-5xl h-full mx-auto flex flex-col gap-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between text-white">
                            <p className="text-sm sm:text-base font-semibold">
                                Mural do projeto â€¢ {imageCount} foto{imageCount > 1 ? 's' : ''}
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsGalleryOpen(false)}
                                className="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors text-sm font-medium"
                            >
                                Fechar
                            </button>
                        </div>

                        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
                            <div className="relative rounded-2xl overflow-hidden bg-black/30 border border-white/10">
                                <img
                                    src={projectImages[activeGalleryIndex] || projectImages[0]}
                                    alt={`${titulo} - destaque`}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            <div className="rounded-2xl bg-black/25 border border-white/10 p-3 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-3">
                                    {projectImages.map((imageSrc, index) => (
                                        <button
                                            key={`${project?.id || 'project'}-gallery-${index}`}
                                            type="button"
                                            onClick={() => setActiveGalleryIndex(index)}
                                            className={`relative aspect-square rounded-xl overflow-hidden border transition-all ${
                                                index === activeGalleryIndex
                                                    ? 'border-cyan-200 ring-2 ring-cyan-200/60'
                                                    : 'border-white/20 hover:border-white/60'
                                            }`}
                                            title={`Selecionar foto ${index + 1}`}
                                        >
                                            <img
                                                src={imageSrc}
                                                alt={`${titulo} - miniatura ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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




