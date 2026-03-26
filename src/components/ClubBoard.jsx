import React, { useState } from 'react';
import { User, School, Map as MapIcon, FolderKanban, Users, BookOpen, Microscope, ExternalLink, ArrowRight, Target, GraduationCap, FileText, PlusCircle, Sparkles, Zap, Building2 } from 'lucide-react';
import EmptyState from './EmptyState';
import CreateProjectForm from './CreateProjectForm';
import { getInitials, getLattesAreas, getLattesEducation, getLattesLink, getLattesSummary, compressImageFiles } from '../utils/helpers';

export default function ClubBoard({ viewingClub, viewingClubSchool, viewingClubProjects, viewingClubUsers, viewingClubOrientadores, viewingClubCoorientadores, viewingClubInvestigadores, viewingClubDiaryCount, setSelectedClubId, setSelectedProjectId, setCurrentView, handleCreateProject }) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    if (!viewingClub) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-10 bg-slate-50 rounded-[3rem] border border-slate-100 relative overflow-hidden shadow-inner">
                {/* Soft background accents */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00B5B5]/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FF5722]/5 rounded-full blur-[100px] pointer-events-none"></div>
                
                <div className="relative z-10 bg-white/50 backdrop-blur-xl p-12 rounded-[2rem] border border-white/80 shadow-lg text-center">
                    <Building2 className="w-16 h-16 text-[#00B5B5] mx-auto mb-6 opacity-80" />
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">Selecione um Ecossistema</h2>
                    <p className="text-slate-600 max-w-md mx-auto">Navegue pelo Feed de Inovação e clique no ícone da escola em um projeto para revelar o universo de colaboração do clube.</p>
                </div>
            </div>
        );
    }

    const investigatorCount = viewingClubInvestigadores.length;
    const memberCount = viewingClubUsers.length;
    const investigatorRatio = memberCount ? Math.round((investigatorCount / memberCount) * 100) : 0;

    // Funcões auxiliares para o design (Adaptadas para Light Mode)
    const AvatarStack = ({ people, max = 5, color = "cyan" }) => {
        const displayPeople = people.slice(0, max);
        const remaining = people.length - max;
        
        // Cores vibrantes em fundo claro
        const colorClasses = color === "cyan" 
            ? "bg-[#00B5B5] text-white border-white" 
            : "bg-[#FF5722] text-white border-white";

        return (
            <div className="flex -space-x-3 isolate">
                {displayPeople.map((p, i) => (
                    <div key={p.id} className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black ring-2 ring-white shadow-md z-[${max - i}] ${colorClasses} hover:-translate-y-2 transition-transform duration-300 cursor-pointer`} title={p.nome}>
                        {getInitials(p.nome)}
                    </div>
                ))}
                {remaining > 0 && (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold bg-slate-100 text-slate-600 ring-2 ring-white shadow-md z-0">
                        +{remaining}
                    </div>
                )}
            </div>
        );
    };

    return (
        // Base clara: slate-50/100
        <div className="space-y-8 mx-auto pb-20  font-sans bg-slate-50 p-3 md:p-6 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 text-slate-800 relative overflow-hidden">
            
            {/* HERO BANNER - Milk Glass & Soft Gradients */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-100 group min-h-[320px] flex flex-col justify-end p-8 md:p-12 shadow-sm">
                
                {/* Soft Background Accents (Orbs) */}
                <div className="absolute -top-10 -right-10 w-96 h-96 bg-[#00B5B5]/10 rounded-full blur-[80px] group-hover:bg-[#00B5B5]/15 transition-colors duration-700 pointer-events-none"></div>
                <div className="absolute bottom-10 left-20 w-64 h-64 bg-[#FF5722]/5 rounded-full blur-[60px] pointer-events-none"></div>
                
                {/* Subtle Texture - Adapted for Light */}
                <div className="absolute inset-0  mix-blend-multiply pointer-events-none" style={{ backgroundImage: "url('/clubeBG.svg')", backgroundSize: 'cover' }} />

                <div className="relative z-10 flex flex-col md:flex-row gap-8 justify-between items-end">
                    <div className="max-w-3xl flex-1">
                        {/* Texto escuro com leve gradiente para sofisticação */}
                        <h1 className="text-5xl md:text-6xl text-white tracking-tighter from-slate-950 via-slate-800 to-slate-700 mb-4 leading-tight">
                            {viewingClub.nome}
                        </h1>
                        
                        <p className="text-white font-medium text-lg flex items-center gap-2.5">
                            <MapIcon className="w-5 h-5 text-[#00B5B5]" /> {viewingClubSchool?.nome || 'Escola não vinculada'}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full text-sm font-semibold text-white">
                                <Microscope className="w-4 h-4 text-[#FF5722]" />
                                Força Investigadora: {investigatorCount} pesquisador{investigatorCount === 1 ? '' : 'es'}
                            </span>
                            <span className="text-xs font-bold text-white/80 bg-[#00B5B5]/20 px-2 py-1 rounded-full">
                                {investigatorRatio}% da equipe
                            </span>
                        </div>
                    </div>

                    {/* Botão Primário VIBRANTE em Fundo Claro */}
                    <button onClick={() => setIsCreateOpen(!isCreateOpen)} className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-[#00B5B5] to-[#009E9E] text-white font-bold text-sm transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#00B5B5]/30 shrink-0">
                        <Zap className={`w-5 h-5 transition-transform ${isCreateOpen ? 'rotate-45 text-amber-200' : 'text-white'}`} />
                        {isCreateOpen ? 'Cancelar Criação' : 'Iniciar Novo Projeto'}
                    </button>
                </div>
            </div>

            {isCreateOpen && (
                <CreateProjectForm
                    isOpen={isCreateOpen}
                    onClose={() => setIsCreateOpen(false)}
                    viewingClub={viewingClub}
                    viewingClubOrientadores={viewingClubOrientadores}
                    viewingClubCoorientadores={viewingClubCoorientadores}
                    viewingClubInvestigadores={viewingClubInvestigadores}
                    handleCreateProject={handleCreateProject}
                    onSuccess={() => {
                        // Caso queira atualizar o estado do club, adicione lógica aqui.
                        // Ex: recarregar lista de projetos ou mostrar mensagem.
                    }}
                />
            )}

            {/* BENTO GRID ASSIMÉTRICO (Cartões Brancos) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
                
                {/* Bloco 1: Estatísticas (Span 4) */}
                <div className="md:col-span-4 grid grid-cols-2 gap-4">
                    {[
                        { icon: FolderKanban, count: viewingClubProjects.length, label: "Projetos", color: "text-[#00B5B5]", bg: "bg-[#E0F7F7]", border: "border-[#00B5B5]/20" },
                        { icon: Users, count: viewingClubUsers.length, label: "Membros", color: "text-[#FF5722]", bg: "bg-[#FFF3E0]", border: "border-[#FF5722]/20" },
                        { icon: BookOpen, count: viewingClubDiaryCount, label: "Registros", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
                        { icon: Target, count: viewingClubOrientadores.length + viewingClubCoorientadores.length, label: "Mentores", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white border border-slate-100 rounded-3xl p-6 flex flex-col justify-between hover:border-[#00B5B5]/30 hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300 group">
                            <div>
                                <h4 className="text-4xl font-black text-slate-950 tracking-tight group-hover:text-[#00B5B5] transition-colors">{stat.count}</h4>
                                <p className="text-[11px] font-extrabold tracking-widest uppercase text-slate-500 mt-1.5">{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bloco 2: Equipe Docente (Span 4) */}
                <div className="md:col-span-4 bg-white border border-slate-100 rounded-3xl p-7 relative overflow-hidden hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300">
                    <h3 className="text-xl font-bold text-slate-900 mb-7 flex items-center gap-3 relative z-10"><GraduationCap className="w-6 h-6 text-[#00B5B5]" /> Equipe Docente</h3>
                    
                    <div className="space-y-4 relative z-10 overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: "230px" }}>
                        {[...viewingClubOrientadores, ...viewingClubCoorientadores].length === 0 ? (
                            <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                                <User className="w-10 h-10 mx-auto mb-3 opacity-50"/>
                                <p className="text-sm">Sem mentores registrados.</p>
                            </div>
                        ) : (
                            [...viewingClubOrientadores, ...viewingClubCoorientadores].map((person) => (
                                <div key={person.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-[#00B5B5]/20 hover:shadow-sm transition-all group/item">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-11 h-11 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold border-2 border-white shadow-sm group-hover/item:bg-[#00B5B5] group-hover/item:text-white transition-colors">{getInitials(person.nome)}</div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 leading-tight group-hover/item:text-[#00B5B5] transition-colors">{person.nome.split(' ').slice(0, 2).join(' ')}</p>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mt-0.5">{viewingClubOrientadores.includes(person) ? 'Orientador' : 'Coorientador'}</p>
                                        </div>
                                    </div>
                                    {getLattesLink(person) && (
                                        <a href={getLattesLink(person)} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-[#E0F7F7] text-[#00B5B5] border border-[#00B5B5]/20 flex items-center justify-center hover:bg-[#00B5B5] hover:text-white transition-all shadow-sm" title="Ver Lattes"><ExternalLink className="w-4 h-4" /></a>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Bloco 3: Investigadores Empilhados (Span 4 - Orange Accent) */}
                <div className="md:col-span-4 bg-white border border-slate-100 rounded-3xl p-7 relative overflow-hidden hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-[#FF5722]/5 rounded-full blur-2xl pointer-events-none"></div>
                    
                    <h3 className="text-xl font-bold text-slate-900 mb-7 flex items-center gap-3 relative z-10"><Microscope className="w-6 h-6 text-[#FF5722]" /> Força Investigadora</h3>
                    <span className="absolute top-7 right-7 z-10 px-4 py-1.5 rounded-full bg-[#FFF3E0] text-[#FF5722] border border-[#FF5722]/20 text-xs font-black shadow-inner">{viewingClubInvestigadores.length}</span>

                    <div className="space-y-4 relative z-10 overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: "230px" }}>
                        {viewingClubInvestigadores.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                                <Users className="w-10 h-10 mx-auto mb-3 opacity-50"/>
                                <p className="text-sm">Nenhum estudante vinculado.</p>
                            </div>
                        ) : (
                            viewingClubInvestigadores.map((person) => (
                                <div key={person.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-[#FF5722]/20 hover:shadow-sm transition-all group/item">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-11 h-11 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold border-2 border-white shadow-sm group-hover/item:bg-[#FF5722] group-hover/item:text-white transition-colors">{getInitials(person.nome)}</div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 leading-tight group-hover/item:text-[#FF5722] transition-colors">{person.nome.split(' ').slice(0, 2).join(' ')}</p>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mt-0.5">Investigador</p>
                                        </div>
                                    </div>
                                    {getLattesLink(person) && (
                                        <a href={getLattesLink(person)} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-[#FFF3E0] text-[#FF5722] border border-[#FF5722]/20 flex items-center justify-center hover:bg-[#FF5722] hover:text-white transition-all shadow-sm" title="Ver Lattes"><ExternalLink className="w-4 h-4" /></a>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* RADAR DE PROJETOS (Fundo Milk Glass para contraste) */}
            <div className="pt-10 relative z-10">
                <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="h-8 w-2 bg-[#00B5B5] rounded-full shadow-inner"></div>
                        <h3 className="text-3xl font-black text-slate-950 tracking-tight">Projetos Ativos</h3>
                    </div>

                    {viewingClubProjects.length === 0 ? (
                        <div className="h-72 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center p-10 text-center hover:border-[#00B5B5]/30 transition-colors group">
                            <EmptyState icon={Sparkles} title="O Radar está Limpo" description="Nenhum projeto detectado neste ecossistema ainda. Que tal iniciar a primeira onda de inovação?" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {viewingClubProjects.map((project) => {
                                const isCompleted = project.status?.toLowerCase().includes('conclu');
                                const projectImage = project?.imagens?.[0] || project?.imagem || '';
                                const imageCount = Array.isArray(project?.imagens) ? project.imagens.length : (project?.imagem ? 1 : 0);

                                return (
                                    <div key={project.id} className="group relative bg-white border border-slate-100 hover:border-[#00B5B5]/30 rounded-[2rem] overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-500/10 min-h-[420px]">
                                        {/* Imagem do projeto */}
                                        <div className="h-44 sm:h-48 w-full bg-slate-100 overflow-hidden relative">
                                            {projectImage ? (
                                                <img
                                                    src={projectImage}
                                                    alt={project.titulo || 'Imagem do projeto'}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-semibold border-b border-slate-200">
                                                    Imagem não disponível
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
                                                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-inner ${isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-[#E0F7F7] text-[#008A8A] border-[#00B5B5]/20'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isCompleted ? 'bg-emerald-500' : 'bg-[#00B5B5] animate-pulse'}`}></span>
                                                    {project.status || 'Em andamento'}
                                                </span>
                                            </div>

                                            <h4 className="font-extrabold text-xl text-slate-950 leading-tight mb-3 group-hover:text-[#00B5B5] transition-colors">{project.titulo || 'Projeto sem título'}</h4>

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
                                                    onClick={() => { setSelectedClubId(viewingClub.id); setSelectedProjectId(project.id); setCurrentView('diario'); }}
                                                    className="w-full text-center bg-[#00B5B5] hover:bg-[#009E9E] text-white px-4 py-2 rounded-full font-bold text-sm transition-all duration-300 shadow-sm"
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
    );
}