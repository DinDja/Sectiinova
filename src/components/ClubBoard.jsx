import React from 'react';
import { User, School, Map, FolderKanban, Users, BookOpen, Microscope, ExternalLink, ArrowRight, Target } from 'lucide-react';
import EmptyState from './EmptyState';

export default function ClubBoard({
    viewingClub,
    viewingClubSchool,
    viewingClubProjects,
    viewingClubUsers,
    viewingClubOrientadores,
    viewingClubCoorientadores,
    viewingClubInvestigadores,
    viewingClubDiaryCount,
    setSelectedClubId,
    setSelectedProjectId,
    setCurrentView
}) {
    if (!viewingClub) {
        return (
            <div className="premium-card p-10">
                <EmptyState
                    icon={School}
                    title="Nenhum clube selecionado"
                    description="Acesse o Feed de Inovação e clique no ícone de escola em um projeto para visualizar as informações do clube responsável."
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 mx-auto pb-12">
            <div
                className="premium-card overflow-hidden border border-slate-200 relative text-white"
                style={{
                    backgroundImage: "url('/clubeBG.svg')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}
            >
                <div className="absolute inset-0 bg-slate-950/40 pointer-events-none"></div>
                <div className="h-2 bg-gradient-to-r from-[#00B5B5] via-[#004B8D] to-[#FF5722]"></div>
                <div className="p-6 md:p-10 flex flex-col md:flex-row gap-8 items-start relative">
                    <div className="w-20 h-20 rounded-xl bg-[#F0F9F9] border-2 border-[#00B5B5]/30 flex items-center justify-center text-[#00B5B5] font-black text-2xl shrink-0">{viewingClub.nome?.slice(0,2).toUpperCase()}</div>
                    <div className="flex-1">
                        <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold text-white text-slate-900 leading-tight">{viewingClub.nome}</h2>
                                <p className="text-[#00B5B5] font-semibold text-sm mt-1 flex items-center gap-1.5"><Map className="w-4 h-4" /> {viewingClubSchool?.nome || 'Escola não vinculada'}</p>
                            </div>
                            <span className="shrink-0 bg-[#E0F2F2] text-[#00B5B5] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Clube Ativo</span>
                        </div>
                        {viewingClub.descricao && <p className="text-slate-100 text-sm leading-relaxed mt-3 max-w-2xl">{viewingClub.descricao}</p>}
                        <div className="flex flex-wrap gap-4 mt-5 text-slate-100">
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-700"><FolderKanban className="w-4 h-4 text-[#00B5B5]" /><span className="font-bold text-slate-900">{viewingClubProjects.length}</span><span>Projetos</span></div>
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-700"><Users className="w-4 h-4 text-[#00B5B5]" /><span className="font-bold text-slate-900">{viewingClubUsers.length}</span><span>Membros</span></div>
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-700"><BookOpen className="w-4 h-4 text-[#00B5B5]" /><span className="font-bold text-slate-900">{viewingClubDiaryCount}</span><span>Registros no Diário</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="premium-card p-6">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 pb-3 border-b border-slate-100"><div className="w-7 h-7 rounded-lg bg-[#F0F9F9] flex items-center justify-center"><User className="w-4 h-4 text-[#00B5B5]" /></div>Professores Orientadores</h3>
                    {viewingClubOrientadores.length === 0 ? <p className="text-sm text-slate-400 italic text-center py-4">Nenhum orientador cadastrado.</p> : (<ul className="space-y-3">{viewingClubOrientadores.map((person)=>{const lattesLink = person.lattes || person.lattes_link || person.link_lattes || person.curriculo_lattes || ''; return (<li key={person.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-[#00B5B5] text-white flex items-center justify-center text-xs font-bold shrink-0">{person.nome?.split(' ').map((n)=>n[0]).join('').slice(0,2).toUpperCase()}</div><div><p className="font-semibold text-sm text-slate-800">{person.nome}</p>{person.email && <p className="text-xs text-slate-500">{person.email}</p>}</div></div>{lattesLink && <a href={lattesLink} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-1 rounded border border-[#00B5B5]/30 bg-[#F0F9F9] px-2 py-1 text-[10px] font-bold text-[#0F5257] hover:bg-[#E5F6F6]" title="Ver Currículo Lattes"><ExternalLink className="w-3 h-3" />Lattes</a>}</li>);})}</ul>)}
                </div>
                <div className="premium-card p-6">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 pb-3 border-b border-slate-100"><div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center"><User className="w-4 h-4 text-[#FF5722]" /></div>Coorientadores</h3>
                    {viewingClubCoorientadores.length === 0 ? <p className="text-sm text-slate-400 italic text-center py-4">Nenhum coorientador cadastrado.</p> : (<ul className="space-y-3">{viewingClubCoorientadores.map((person)=>{const lattesLink = person.lattes || person.lattes_link || person.link_lattes || person.curriculo_lattes || ''; return (<li key={person.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-[#FF5722] text-white flex items-center justify-center text-xs font-bold shrink-0">{person.nome?.split(' ').map((n)=>n[0]).join('').slice(0,2).toUpperCase()}</div><div><p className="font-semibold text-sm text-slate-800">{person.nome}</p>{person.email && <p className="text-xs text-slate-500">{person.email}</p>}</div></div>{lattesLink && <a href={lattesLink} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-1 rounded border border-orange-200 bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-800 hover:bg-orange-100" title="Ver Currículo Lattes"><ExternalLink className="w-3 h-3" />Lattes</a>}</li>);})}</ul>)}
                </div>
            </div>

            {viewingClubInvestigadores.length > 0 && (
                <div className="premium-card p-6">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 pb-3 border-b border-slate-100"><div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center"><Microscope className="w-4 h-4 text-blue-600" /></div>Investigadores / Estudantes<span className="ml-auto text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{viewingClubInvestigadores.length}</span></h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">{viewingClubInvestigadores.map((person)=> (<div key={person.id} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-100 text-center"><div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">{person.nome?.split(' ').map((n)=>n[0]).join('').slice(0,2).toUpperCase()}</div><p className="text-xs font-semibold text-slate-700 leading-tight">{person.nome}</p>{person.matricula && <p className="text-[10px] text-slate-400">Mat. {person.matricula}</p>}</div>))}</div>
                </div>
            )}

            <div>
                <div className="flex items-center justify-between mb-4"><h3 className="text-xl font-bold text-slate-800">Projetos do Clube</h3><span className="text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">{viewingClubProjects.length} projeto(s)</span></div>
                {viewingClubProjects.length === 0 ? (
                    <div className="premium-card border-dashed border-slate-300 p-10 text-center"><EmptyState icon={FolderKanban} title="Nenhum projeto encontrado" description="Este clube ainda não tem projetos publicados ou os projetos não foram vinculados corretamente." /></div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{viewingClubProjects.map((project)=>{const isCompleted = project.status?.toLowerCase().includes('conclu'); return (<div key={project.id} className="premium-card p-5 flex flex-col gap-3"><div className="flex items-start justify-between gap-2"><h4 className="font-bold text-slate-900 text-sm leading-snug">{project.titulo || 'Projeto sem título'}</h4><span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${isCompleted ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-blue-100 text-blue-700 bg-blue-50'}`}>{project.status || 'Em andamento'}</span></div><p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{project.descricao || project.introducao || 'Sem descrição cadastrada.'}</p>{project.area_tematica && <span className="self-start inline-flex items-center gap-1 bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded"><Target className="w-3 h-3" />{project.area_tematica}</span>}<button onClick={() => {setSelectedClubId(viewingClub.id); setSelectedProjectId(project.id); setCurrentView('diario');}} className="mt-auto self-end inline-flex items-center gap-1.5 text-xs font-semibold text-[#00B5B5] hover:text-[#008A8A] transition-colors">Ver Diário <ArrowRight className="w-3.5 h-3.5" /></button></div>);})}</div>
                )}
            </div>
        </div>
    );
}
