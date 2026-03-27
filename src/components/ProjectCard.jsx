import React, { useState, useMemo } from 'react';
import { Heart, MessageCircle, ChevronDown, Eye, Share2, BookOpen, Users, School } from 'lucide-react';

import ModalPerfil from './ModalPerfil';

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
    onShareClick
}) {
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(project?.likes || 195);
    const [isHovered, setIsHovered] = useState(false);

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
    const projectImage = project?.imagens?.[0] || project?.imagem || '';
    const imageCount = Array.isArray(project?.imagens) ? project.imagens.length : (project?.imagem ? 1 : 0);

    const fallbackBackgrounds = ['/images/BG_1.png', '/images/BG_2.png', '/images/BG_3.png'];
    const isFallbackImage = !projectImage;
    const backgroundImage = useMemo(() => {
        if (!isFallbackImage) return '';
        return fallbackBackgrounds[Math.floor(Math.random() * fallbackBackgrounds.length)];
    }, [isFallbackImage]);
    const displayImage = isFallbackImage ? backgroundImage : projectImage;

    
    const getTagColor = () => {
        const status = tagText.toLowerCase();
        if (status.includes('concluído') || status.includes('concluido')) return 'bg-green-500';
        if (status.includes('em andamento')) return 'bg-blue-500';
        if (status.includes('pendente')) return 'bg-yellow-500';
        return 'bg-[#5AC8C8]';
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

    const handleShare = () => {
        if (onShareClick) {
            onShareClick(project);
        } else {
            navigator.clipboard.writeText(window.location.href);
        }
    };

    return (
        <article 
            className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            
            <div className="p-5 flex items-center justify-between bg-white border-b border-gray-100">
                
                <div 
                    className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(e) => handleUserClick(e, orientador)}
                >
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#5AC8C8] to-[#3EA8A8] overflow-hidden flex-shrink-0 border-2 border-white shadow-md">
                            {orientador.avatar ? (
                                <img src={orientador.avatar} alt={orientador.nome} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                                    {orientador.nome.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-800 text-base hover:text-[#5AC8C8] transition-colors text-left">
                            {orientador.nome}
                        </span>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{orientador.papel || 'Orientador'}</span>
                            {orientador.instituicao && (
                                <>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span>{orientador.instituicao}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                
                <span className={`${getTagColor()} text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm transition-all duration-300 hover:scale-105 cursor-pointer`}>
                    {tagText}
                </span>
            </div>

            {/* Imagem Principal */}
            <div className="relative w-full h-[260px] sm:h-[320px] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden cursor-pointer">
                {displayImage ? (
                    <>
                        <img 
                            src={displayImage} 
                            alt={titulo}
                            className={`w-full h-full object-cover transition-transform duration-700 ${isHovered ? 'scale-110' : 'scale-100'}`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        {imageCount > 1 && (
                            <div className="absolute top-3 left-3 bg-black/60 text-white text-xs font-semibold px-2 py-0.5 rounded">{imageCount} fotos</div>
                        )}
                        {isFallbackImage && (
                            <div className="absolute bottom-3 left-3 bg-black/70 text-white text-[11px] sm:text-xs px-2 py-1 rounded-lg font-medium">
                                Projeto sem foto. Imagem ilustrativa.
                            </div>
                        )}
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <BookOpen className="w-12 h-12 mb-2" />
                        <span>Imagem do Projeto não disponível</span>
                    </div>
                )}
            </div>

            {/* Conteúdo: Título e Descrição */}
            <div className="p-6 pb-4 flex flex-col gap-4">
                <h2 className="text-[22px] sm:text-2xl font-bold text-[#1E293B] leading-snug line-clamp-2 hover:text-[#5AC8C8] transition-colors cursor-pointer">
                    {titulo}
                </h2>
                
                <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                    {descricao}
                </p>

                {/* Equipe do Projeto */}
                {teamMembers.length > 0 && (
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1 text-gray-500 text-sm">
                            <Users className="w-4 h-4" />
                            <span>Equipe</span>
                        </div>
                        <div className="flex -space-x-2">
                            {displayTeam.map((member, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={(e) => handleUserClick(e, member)}
                                    className="relative group/avatar w-9 h-9 sm:w-10 sm:h-10 rounded-full border-[3px] border-white bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden shadow-sm transition-all duration-300 hover:scale-110 hover:z-10 cursor-pointer"
                                    title={`${member.nome} - ${member.type === 'orientador' ? 'Orientador' : member.type === 'coorientador' ? 'Coorientador' : 'Membro'}`}
                                >
                                    {member.avatar ? (
                                        <img src={member.avatar} alt={member.nome} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-600 font-medium text-xs">
                                            {member.nome ? member.nome.charAt(0) : '?'}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {remainingMembers > 0 && (
                            <button className="text-[#5AC8C8] font-medium text-sm hover:text-[#4EAEAE] transition-colors flex items-center gap-1 ml-1">
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

                {/* Indicador de progresso se o projeto estiver em andamento */}
                {isCompleted === false && project?.progress && (
                    <div className="mt-4">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Progresso do Projeto</span>
                            <span>{project.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div 
                                className="bg-gradient-to-r from-[#5AC8C8] to-[#3EA8A8] h-full rounded-full transition-all duration-500"
                                style={{ width: `${project.progress}%` }}
                            ></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Botões de Ação: Clube e Diário */}
            <div className="absolute bottom-6 right-6 z-10 flex items-center gap-3">
                {/* Botão Acessar Clube */}
                {club && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onClubClick) onClubClick();
                        }}
                        className="group/btn-club bg-white/90 backdrop-blur-sm border-2 border-[#5AC8C8] text-[#5AC8C8] hover:bg-[#5AC8C8] hover:text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                        title="Ver página do clube"
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
                    className="group/btn bg-gradient-to-r from-[#5AC8C8] to-[#4EAEAE] hover:from-[#4EAEAE] hover:to-[#3E9E9E] text-white px-6 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 hover:scale-105"
                >
                    <BookOpen className="w-4 h-4 transition-transform duration-300 group-hover/btn:rotate-12" />
                    Acessar Diário
                    <ChevronDown className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-y-0.5" />
                </button>
            </div> 

            {/* MODAL RENDERIZADO AQUI */}
            <ModalPerfil 
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                usuario={selectedUser}
            />
        </article>
    );
}