import React, { useState } from 'react';
import { User, School, Map as MapIcon, FolderKanban, Users, BookOpen, Microscope, ExternalLink, ArrowRight, Target, GraduationCap, FileText, PlusCircle } from 'lucide-react';
import EmptyState from './EmptyState';
import { getInitials, getLattesAreas, getLattesEducation, getLattesLink, getLattesSummary } from '../utils/helpers';

const MentorList = ({ people = [], accent = 'cyan', title, emptyMessage }) => {
    const palette = accent === 'orange'
        ? {
            avatar: 'bg-[#FF5722]',
            badge: 'border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100',
            chip: 'bg-orange-50 text-orange-800'
        }
        : {
            avatar: 'bg-[#00B5B5]',
            badge: 'border-[#00B5B5]/30 bg-[#F0F9F9] text-[#0F5257] hover:bg-[#E5F6F6]',
            chip: 'bg-[#EAF7F7] text-[#0F5257]'
        };

    return (
        <div className="premium-card p-6" style={{maxHeight: "400px", overflow: "auto"}}>
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">{title}</h3>
            {people.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-4">{emptyMessage}</p>
            ) : (
                <ul className="space-y-3">
                    {people.map((person) => {
                        const lattesLink = getLattesLink(person);
                        const summary = getLattesSummary(person);
                        const areas = getLattesAreas(person).slice(0, 2);
                        const education = getLattesEducation(person).slice(0, 1);

                        return (
                            <li key={person.id} className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full ${palette.avatar} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                                            {getInitials(person.nome)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-slate-800">{person.nome}</p>
                                            {person.email && <p className="text-xs text-slate-500">{person.email}</p>}
                                        </div>
                                    </div>
                                    {lattesLink && (
                                        <a href={lattesLink} target="_blank" rel="noreferrer" className={`shrink-0 inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-bold ${palette.badge}`} title="Ver Currículo Lattes">
                                            <ExternalLink className="w-3 h-3" />Lattes
                                        </a>
                                    )}
                                </div>

                                {(summary || areas.length > 0 || education.length > 0) && (
                                    <div className="mt-3 space-y-2.5 border-t border-slate-200 pt-3">
                                        {summary && (
                                            <div>
                                                <p className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                                    <FileText className="w-3.5 h-3.5" /> Resumo
                                                </p>
                                                <p className="text-xs leading-relaxed text-slate-600">{summary}</p>
                                            </div>
                                        )}
                                        {areas.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {areas.map((area) => (
                                                    <span key={area} className={`rounded-full px-2 py-1 text-[10px] ${palette.chip}`}>
                                                        {area}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {education.length > 0 && (
                                            <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                                <GraduationCap className="w-3.5 h-3.5" /> {education[0]}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

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
    setCurrentView,
    handleCreateProject
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

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [projectForm, setProjectForm] = useState({
        titulo: '',
        descricao: '',
        area_tematica: '',
        status: 'Em andamento',
        tipo: 'Projeto Científico',
        coorientador_ids: [],
        investigadores_ids: []
    });
    const [projectMessage, setProjectMessage] = useState('');

    const handleSubmitProject = async (event) => {
        event.preventDefault();

        if (!handleCreateProject) {
            setProjectMessage('Função de criação não disponível.');
            return;
        }

        try {
            await handleCreateProject(projectForm);
            setProjectMessage('Projeto criado com sucesso!');
            setProjectForm({
                titulo: '',
                descricao: '',
                area_tematica: '',
                status: 'Em andamento',
                tipo: 'Projeto Científico',
                coorientador_ids: [],
                investigadores_ids: []
            });
            setIsCreateOpen(false);
        } catch (error) {
            setProjectMessage('Erro ao criar projeto. Verifique os dados e tente novamente.');
        }
    };

    const toggleMemberSelection = (fieldName, id) => {
        setProjectForm((prev) => {
            const currentValues = Array.isArray(prev[fieldName]) ? prev[fieldName] : [];
            const normalizedId = String(id || '').trim();

            if (!normalizedId) {
                return prev;
            }

            const exists = currentValues.includes(normalizedId);

            return {
                ...prev,
                [fieldName]: exists
                    ? currentValues.filter((value) => value !== normalizedId)
                    : [...currentValues, normalizedId]
            };
        });
    };

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
                    <div className="w-20 h-20 rounded-xl bg-[#F0F9F9] border-2 border-[#00B5B5]/30 flex items-center justify-center text-[#00B5B5] font-black text-2xl shrink-0">{viewingClub.nome?.slice(0, 2).toUpperCase()}</div>
                    <div className="flex-1">
                        <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold text-white text-slate-900 leading-tight">{viewingClub.nome}</h2>
                                <p className="text-[#00B5B5] font-semibold text-sm mt-1 flex items-center gap-1.5"><MapIcon className="w-4 h-4" /> {viewingClubSchool?.nome || 'Escola não vinculada'}</p>
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

            <div className="space-y-3">
                <button
                    type="button"
                    onClick={() => {
                        setIsCreateOpen((current) => !current);
                        setProjectMessage('');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-[#00B5B5] bg-white shadow-sm hover:bg-slate-50 transition-colors"
                >
                    <PlusCircle className="w-4 h-4" />
                    {isCreateOpen ? 'Cancelar novo projeto' : 'Registrar novo projeto'}
                </button>

                {isCreateOpen && (
                    <form onSubmit={handleSubmitProject} className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                                value={projectForm.titulo}
                                onChange={(e) => setProjectForm((prev) => ({ ...prev, titulo: e.target.value }))}
                                required
                                placeholder="Título do projeto"
                                className="w-full border border-slate-300 px-3 py-2 rounded"
                            />
                            <input
                                value={projectForm.area_tematica}
                                onChange={(e) => setProjectForm((prev) => ({ ...prev, area_tematica: e.target.value }))}
                                placeholder="Área temática"
                                className="w-full border border-slate-300 px-3 py-2 rounded"
                            />
                            <input
                                value={projectForm.tipo}
                                onChange={(e) => setProjectForm((prev) => ({ ...prev, tipo: e.target.value }))}
                                placeholder="Tipo (ex: Projeto Científico)"
                                className="w-full border border-slate-300 px-3 py-2 rounded"
                            />
                            <input
                                value={projectForm.status}
                                onChange={(e) => setProjectForm((prev) => ({ ...prev, status: e.target.value }))}
                                placeholder="Status (ex: Em andamento)"
                                className="w-full border border-slate-300 px-3 py-2 rounded"
                            />
                        </div>
                        <textarea
                            value={projectForm.descricao}
                            onChange={(e) => setProjectForm((prev) => ({ ...prev, descricao: e.target.value }))}
                            placeholder="Descrição"
                            className="w-full border border-slate-300 px-3 py-2 rounded mt-3"
                            rows={3}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">Professores coorientadores (inclui orientadores)</p>
                                {(!viewingClubCoorientadores.length && !viewingClubOrientadores.length) ? (
                                    <p className="text-xs text-slate-400">Nenhum professor disponível.</p>
                                ) : (
                                    <div className="space-y-2 max-h-36 overflow-auto pr-1">
                                        {[...new Map(
                                            [...viewingClubCoorientadores, ...viewingClubOrientadores]
                                                .map((person) => [String(person.id), person])
                                        ).values()].map((person) => {
                                            const checked = projectForm.coorientador_ids.includes(String(person.id));
                                            return (
                                                <label key={person.id} className="flex items-center gap-2 text-sm text-slate-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleMemberSelection('coorientador_ids', person.id)}
                                                        className="rounded border-slate-300 text-[#00B5B5] focus:ring-[#00B5B5]"
                                                    />
                                                    <span>{person.nome}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">Alunos investigadores</p>
                                {viewingClubInvestigadores.length === 0 ? (
                                    <p className="text-xs text-slate-400">Nenhum investigador disponível.</p>
                                ) : (
                                    <div className="space-y-2 max-h-36 overflow-auto pr-1">
                                        {viewingClubInvestigadores.map((person) => {
                                            const checked = projectForm.investigadores_ids.includes(String(person.id));
                                            return (
                                                <label key={person.id} className="flex items-center gap-2 text-sm text-slate-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleMemberSelection('investigadores_ids', person.id)}
                                                        className="rounded border-slate-300 text-[#00B5B5] focus:ring-[#00B5B5]"
                                                    />
                                                    <span>{person.nome}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <p className="text-xs text-slate-500 mt-2">
                            Selecionados: {projectForm.coorientador_ids.length} coorientador(es) e {projectForm.investigadores_ids.length} investigador(es).
                        </p>

                        <div className="flex justify-end mt-3">
                            <button
                                type="submit"
                                className="px-4 py-2 bg-[#00B5B5] text-white font-semibold rounded-lg hover:bg-[#009191] transition-colors"
                            >
                                Criar projeto
                            </button>
                        </div>
                        {projectMessage && <p className="text-sm mt-2 text-slate-600">{projectMessage}</p>}
                    </form>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MentorList
                    people={viewingClubOrientadores}
                    accent="cyan"
                    title={<><div className="w-7 h-7 rounded-lg bg-[#F0F9F9] flex items-center justify-center"><User className="w-4 h-4 text-[#00B5B5]" /></div>Professores Orientadores</>}
                    emptyMessage="Nenhum orientador cadastrado."
                />
                <MentorList
                    people={viewingClubCoorientadores}
                    accent="orange"
                    title={<><div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center"><User className="w-4 h-4 text-[#FF5722]" /></div>Coorientadores</>}
                    emptyMessage="Nenhum coorientador cadastrado."
                />
            </div>

            {viewingClubInvestigadores.length > 0 && (
                <div className="premium-card p-6" style={{maxHeight: "400px", overflow: "auto"}}> 
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 pb-3 border-b border-slate-100"><div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center"><Microscope className="w-4 h-4 text-blue-600" /></div>Investigadores / Estudantes<span className="ml-auto text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{viewingClubInvestigadores.length}</span></h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">{viewingClubInvestigadores.map((person) => (<div key={person.id} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-100 text-center"><div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">{person.nome?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}</div><p className="text-xs font-semibold text-slate-700 leading-tight">{person.nome}</p>{person.matricula && <p className="text-[10px] text-slate-400">Mat. {person.matricula}</p>}</div>))}</div>
                </div>
            )}

            <div>
                <div className="flex items-center justify-between mb-4"><h3 className="text-xl font-bold text-slate-800">Projetos do Clube</h3><span className="text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">{viewingClubProjects.length} projeto(s)</span></div>
                {viewingClubProjects.length === 0 ? (
                    <div className="premium-card border-dashed border-slate-300 p-10 text-center"><EmptyState icon={FolderKanban} title="Nenhum projeto encontrado" description="Este clube ainda não tem projetos publicados ou os projetos não foram vinculados corretamente." /></div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{viewingClubProjects.map((project) => { const isCompleted = project.status?.toLowerCase().includes('conclu'); return (<div key={project.id} className="premium-card p-5 flex flex-col gap-3"><div className="flex items-start justify-between gap-2"><h4 className="font-bold text-slate-900 text-sm leading-snug">{project.titulo || 'Projeto sem título'}</h4><span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${isCompleted ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-blue-100 text-blue-700 bg-blue-50'}`}>{project.status || 'Em andamento'}</span></div><p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{project.descricao || project.introducao || 'Sem descrição cadastrada.'}</p>{project.area_tematica && <span className="self-start inline-flex items-center gap-1 bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded"><Target className="w-3 h-3" />{project.area_tematica}</span>}<button onClick={() => { setSelectedClubId(viewingClub.id); setSelectedProjectId(project.id); setCurrentView('diario'); }} className="mt-auto self-end inline-flex items-center gap-1.5 text-xs font-semibold text-[#00B5B5] hover:text-[#008A8A] transition-colors">Ver Diário <ArrowRight className="w-3.5 h-3.5" /></button></div>); })}</div>
                )}
            </div>
        </div>
    );
}
