import React, { useMemo } from 'react';
import { BookOpen, Target, User, Users, Map, Database, CheckCircle, Calendar, Clock, Lightbulb, AlertCircle, ArrowRight, Plus, ExternalLink, GraduationCap, FileText, Sparkles, LayoutDashboard, Flag } from 'lucide-react';
import EmptyState from '../shared/EmptyState';
import { getInitials, getLattesAreas, getLattesEducation, getLattesSummary, getLattesUpdatedAt } from '../../utils/helpers';



const MentorBadge = ({ person, getLattesLink }) => {
    const lattesLink = getLattesLink(person);
    const summary = getLattesSummary(person);
    const updatedAt = getLattesUpdatedAt(person);
    const areas = getLattesAreas(person).slice(0, 3);
    const education = getLattesEducation(person).slice(0, 2);
    return (
        <article className="group relative min-w-[280px] flex-1 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-xl hover:shadow-cyan-500/5 hover:border-[#00B5B5]/20 transition-all duration-500 overflow-hidden"
      > 
            
            <div className="flex items-start justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-50 text-sm font-black text-slate-600 border-2 border-white shadow-sm group-hover:bg-[#00B5B5] group-hover:text-white transition-colors duration-300">
                        {getInitials(person.nome)}
                    </div>
                    <div>
                        <h5 className="text-sm font-bold text-slate-900 leading-tight group-hover:text-[#00B5B5] transition-colors">{person.nome}</h5>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mt-0.5">{person.perfil || 'Mentoria'}</p>
                    </div>
                </div>
                {lattesLink ? (
                    <a href={lattesLink} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center w-10 h-10 rounded-xl border border-[#00B5B5]/20 bg-[#E0F7F7] text-[#00B5B5] transition-all hover:bg-[#00B5B5] hover:text-white shadow-sm" title="Abrir Lattes">
                        <ExternalLink className="h-4 w-4" />
                    </a>
                ) : (
                    <span className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-400">Sem link</span>
                )}
            </div>

            {(summary || updatedAt || areas.length > 0 || education.length > 0) && (
                <div className="mt-5 space-y-4 relative z-10 border-t border-slate-100 pt-5">
                    {summary && (
                        <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-600 group-hover:bg-white transition-colors">
                            <div className="mb-1.5 flex items-center gap-1.5 font-bold uppercase tracking-widest text-[#008A8A] text-[10px]">
                                <FileText className="h-3 w-3" /> Resumo
                            </div>
                            <p className="line-clamp-3">{summary}</p>
                        </div>
                    )}

                    {areas.length > 0 && (
                        <div>
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Áreas de atuação</p>
                            <div className="flex flex-wrap gap-2">
                                {areas.map((area) => (
                                    <span key={area} className="rounded-lg border border-[#00B5B5]/10 bg-[#F0F9F9] px-2.5 py-1 text-[10px] font-semibold text-[#008A8A]">
                                        {area}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {education.length > 0 && (
                        <div>
                            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                <GraduationCap className="h-3.5 w-3.5 text-slate-400" /> Formação Principal
                            </p>
                            <div className="space-y-1 text-xs font-medium text-slate-700">
                                {education.map((item) => (
                                    <p key={item} className="flex items-start gap-1.5"><span className="text-[#00B5B5] mt-0.5">•</span> {item}</p>
                                ))}
                            </div>
                        </div>
                    )}

                    {updatedAt && (
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Última atualização no Lattes: {updatedAt}
                        </div>
                    )}
                </div>
            )}
        </article>
    );
};

const DiaryEntryCard = ({ entry }) => (
    <div className="group relative bg-white border border-slate-100 rounded-[2rem] hover:shadow-2xl hover:shadow-cyan-500/5 hover:border-[#00B5B5]/30 transition-all duration-500 overflow-hidden w-full">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#00B5B5] to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
        
        <div className="bg-slate-50/50 border-b border-slate-100 px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h4 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2 group-hover:text-[#00B5B5] transition-colors">{entry.title}</h4>
                <div className="flex flex-wrap items-center text-xs font-semibold text-slate-500 gap-4">
                    <span className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-sm"><Calendar className="w-3.5 h-3.5 text-[#00B5B5]" /> {entry.date}</span>
                    <span className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-sm"><Clock className="w-3.5 h-3.5 text-orange-500" /> {entry.duration}</span>
                    <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" /> {entry.author}</span>
                </div>
            </div>
            <div className="inline-flex items-center gap-2 bg-[#E0F7F7] text-[#008A8A] border border-[#00B5B5]/20 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-inner shrink-0">
                <Flag className="w-3 h-3" /> {entry.stage}
            </div>
        </div>

        <div className="p-8 space-y-6">
            <div className="bg-emerald-50/30 border border-emerald-100/50 rounded-2xl p-5">
                <h5 className="flex items-center text-xs font-black text-emerald-800 uppercase tracking-widest mb-3">
                    <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" /> O que foi construído?
                </h5>
                <p className="text-slate-700 text-sm leading-relaxed pl-6 font-medium">{entry.whatWasDone}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 group-hover:bg-blue-50/80 transition-colors">
                    <h5 className="flex items-center text-xs font-black text-blue-800 uppercase tracking-widest mb-3">
                        <Lightbulb className="w-4 h-4 mr-2 text-blue-500" /> Principais Descobertas
                    </h5>
                    <p className="text-blue-900/80 text-sm leading-relaxed font-medium">{entry.discoveries}</p>
                </div>
                <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100 group-hover:bg-orange-50/80 transition-colors">
                    <h5 className="flex items-center text-xs font-black text-orange-800 uppercase tracking-widest mb-3">
                        <AlertCircle className="w-4 h-4 mr-2 text-orange-500" /> Gestão de Obstáculos
                    </h5>
                    <p className="text-orange-900/80 text-sm leading-relaxed font-medium">{entry.obstacles}</p>
                </div>
            </div>
            
            <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex-1">
                    <h5 className="flex items-center text-xs font-black text-slate-800 uppercase tracking-widest mb-2">
                        <ArrowRight className="w-4 h-4 mr-2 text-slate-400" /> Próximos Passos
                    </h5>
                    <p className="text-slate-600 text-sm font-medium pl-6">{entry.nextSteps}</p>
                </div>
                {entry.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-end">
                        {entry.tags.map((tag) => (
                            <span key={tag} className="bg-slate-50 text-slate-500 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-slate-200">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
);


export default function DiaryBoard({ selectedProject, selectedClub, selectedSchool, selectedTeam, derivedDiaryEntries = [], canEditDiary, setIsModalOpen, getInvestigatorDisplayNames = () => [], getLattesLink = () => '' }) {
    
    const uniqueMentors = useMemo(() => {
        if (!selectedTeam) return [];
        const combined = [...(selectedTeam.orientadores || []), ...(selectedTeam.coorientadores || [])];
        return combined.filter((person, index, arr) => arr.findIndex((item) => item.id === person.id) === index);
    }, [selectedTeam]);

    const investigatorNames = useMemo(() => {
        return getInvestigatorDisplayNames(selectedProject, selectedTeam, derivedDiaryEntries).join(', ');
    }, [getInvestigatorDisplayNames, selectedProject, selectedTeam, derivedDiaryEntries]);

    if (!selectedProject) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center p-10 bg-white rounded-[3rem] border border-slate-100 shadow-inner relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00B5B5]/5 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="relative z-10 text-center">
                    <EmptyState 
                        icon={LayoutDashboard} 
                        title="Nenhum projeto selecionado"
                        description="Diário de Bordo Indisponível. Selecione um projeto no Radar para acessar suas documentações, descobertas e próximos passos." 
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 mx-auto font-sans text-slate-800 max-w-7xl pt-5">
            
            <section className="relative overflow-hidden bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-10 shadow-sm">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#00B5B5]/5 rounded-full blur-[80px] pointer-events-none"></div>
                
                <div className="relative z-10">
                    <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#FFF3E0] border border-[#FF5722]/20 shadow-inner">
                            <Target className="w-4 h-4 text-[#FF5722]" /> 
                            <span className="text-xs font-black tracking-widest uppercase text-[#D84315]">
                                {selectedClub?.nome || 'Clube não identificado'}
                            </span>
                        </div>
                        <span className="bg-slate-50 border border-slate-200 text-slate-600 px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest">
                            {selectedProject.area_tematica || selectedProject.tipo || 'Área não informada'}
                        </span>
                    </header>

                    <h2 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tight leading-tight mb-6">
                        {selectedProject.titulo || 'Projeto em Desenvolvimento'}
                    </h2>
                    
                    <div className="bg-slate-50/80 rounded-3xl p-6 border border-slate-100 mb-8 max-w-4xl shadow-inner">
                        <div className="flex items-center gap-2 mb-3 text-[#00B5B5] font-black uppercase tracking-widest text-xs">
                            <Sparkles className="w-4 h-4" /> Escopo do Projeto
                        </div>
                        <div className="space-y-3 text-slate-600 font-medium leading-relaxed text-sm md:text-base">
                            {selectedProject.introducao && <p>{selectedProject.introducao}</p>}
                            {selectedProject.descricao && <p>{selectedProject.descricao}</p>}
                            {!(selectedProject.introducao || selectedProject.descricao) && (
                                <p className="italic text-slate-400">A documentação descritiva deste projeto ainda não foi inserida no sistema.</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-center hover:border-[#00B5B5]/30 transition-colors shadow-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5"><Map className="w-3 h-3"/> Unidade Escolar</span>
                            <span className="text-sm font-bold text-slate-800 line-clamp-2">{selectedSchool?.nome || 'Não informada'}</span>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-center hover:border-[#00B5B5]/30 transition-colors shadow-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5"><Database className="w-3 h-3"/> Status</span>
                            <span className="text-sm font-bold text-[#00B5B5] flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#00B5B5] animate-pulse"></span> {selectedProject.status || 'Não informado'}
                            </span>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-center hover:border-[#00B5B5]/30 transition-colors shadow-sm md:col-span-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5"><Users className="w-3 h-3"/> Força Investigadora</span>
                            <span className="text-sm font-bold text-slate-800 line-clamp-2">{investigatorNames || 'Equipe em formação'}</span>
                        </div>
                    </div>

                    {selectedProject.imagens?.length > 0 && (
                        <div className="mb-8 pt-4 border-t border-slate-100">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Evidências Visuais</h4>
                            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                                {selectedProject.imagens.map((img, index) => (
                                    <img key={index} src={img} alt={`Evidência ${index + 1}`} className="h-40 min-w-[250px] object-cover rounded-2xl border border-slate-200 shadow-sm hover:scale-[1.02] transition-transform duration-300" />
                                ))}
                            </div>
                        </div>
                    )}

                    {uniqueMentors.length > 0 && (
                        <div className="pt-6 border-t border-slate-100">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-[#00B5B5]" /> Equipe de Orientação
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                {uniqueMentors.map((person) => (
                                    <MentorBadge key={person.id} person={person} getLattesLink={getLattesLink} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <section className="bg-white rounded-[3rem] p-6 md:p-10 border border-slate-100 shadow-inner">
                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-8 w-2 bg-[#00B5B5] rounded-full shadow-inner"></div>
                            <h3 className="text-3xl font-black text-slate-950 tracking-tight">Diário de Bordo</h3>
                        </div>
                        {!canEditDiary && (
                            <p className="text-sm font-medium text-slate-500 max-w-xl">Modo leitura ativado. Somente a equipe vinculada ao projeto possui credenciais para documentar novos avanços.</p>
                        )}
                    </div>
                    
                    <button 
                        onClick={() => setIsModalOpen(true)} 
                        disabled={!canEditDiary}
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#00B5B5] to-[#009E9E] text-white font-bold text-sm shadow-md hover:shadow-lg hover:shadow-cyan-500/30 hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shrink-0" 
                    >
                        <Plus className="w-5 h-5" /> Adicionar Registro
                    </button>
                </div>

                <div className="space-y-6">
                    {derivedDiaryEntries.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center hover:border-[#00B5B5]/30 transition-colors">
                            <EmptyState 
                                icon={BookOpen} 
                                title="Diário em Branco" 
                                description="O sistema organizou os metadados do projeto. Registre o primeiro encontro para iniciar a linha do tempo de descobertas." 
                            />
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-slate-200 ml-4 md:ml-6 space-y-10 pb-6">
                            {derivedDiaryEntries.map((entry) => (
                                <div key={entry.id} className="group relative pl-6 md:pl-10">
                                    
                                    <div className="absolute -left-[9px] top-8 w-4 h-4 rounded-full bg-[#00B5B5] ring-4 ring-slate-50 shadow-sm z-10 transition-transform duration-300 group-hover:scale-125 group-hover:ring-[#00B5B5]/20"></div>
                                    
                                    <DiaryEntryCard entry={entry} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}