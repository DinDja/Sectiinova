import React, { useMemo } from 'react';
import { 
    BookOpen, Target, User, Users, Map, Database, CheckCircle, 
    Calendar, Clock, Lightbulb, AlertCircle, ArrowRight, Plus, ExternalLink 
} from 'lucide-react';
import EmptyState from './EmptyState';

// ----------------------------------------------------------------------
// SUBCOMPONENTES (Podem ser movidos para arquivos separados depois)
// ----------------------------------------------------------------------

const MentorBadge = ({ person, getLattesLink }) => {
    const lattesLink = getLattesLink(person);

    if (!lattesLink) {
        return (
            <span className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600">
                {person.nome} · Lattes não informado
            </span>
        );
    }

    return (
        <a 
            href={lattesLink} 
            target="_blank" 
            rel="noreferrer" 
            className="inline-flex items-center gap-2 rounded-md border border-[#00B5B5]/30 bg-[#F0F9F9] px-3 py-1.5 text-xs font-semibold text-[#0F5257] transition-colors hover:bg-[#E5F6F6]"
        >
            {person.nome}
            <ExternalLink className="w-3.5 h-3.5" />
        </a>
    );
};

const DiaryEntryCard = ({ entry }) => (
    <div className="premium-card overflow-hidden">
        {/* Card Header */}
        <div className="bg-slate-50/80 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h4 className="text-lg font-bold text-[#00B5B5] mb-1">{entry.title}</h4>
                <div className="flex flex-wrap items-center text-xs text-slate-500 gap-4">
                    <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {entry.date}</span>
                    <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {entry.duration}</span>
                    <span className="flex items-center"><User className="w-3 h-3 mr-1" /> Por {entry.author}</span>
                </div>
            </div>
            <div className="bg-white border border-[#00B5B5]/50 text-[#0F5257] px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap text-center shadow-sm">
                {entry.stage}
            </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-5">
            <div>
                <h5 className="flex items-center text-sm font-bold text-slate-700 uppercase mb-2">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> O que foi feito hoje?
                </h5>
                <p className="text-slate-600 text-sm leading-relaxed pl-6">{entry.whatWasDone}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                    <h5 className="flex items-center text-sm font-bold text-blue-800 mb-2">
                        <Lightbulb className="w-4 h-4 mr-2 text-blue-600" /> Principais Descobertas
                    </h5>
                    <p className="text-blue-900/80 text-sm">{entry.discoveries}</p>
                </div>
                <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100">
                    <h5 className="flex items-center text-sm font-bold text-orange-800 mb-2">
                        <AlertCircle className="w-4 h-4 mr-2 text-orange-600" /> Gestão de Obstáculos
                    </h5>
                    <p className="text-orange-900/80 text-sm">{entry.obstacles}</p>
                </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h5 className="flex items-center text-sm font-bold text-slate-700 mb-1">
                        <ArrowRight className="w-4 h-4 mr-2 text-slate-500" /> Próximos Passos
                    </h5>
                    <p className="text-slate-500 text-sm pl-6">{entry.nextSteps}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {entry.tags?.map((tag) => (
                        <span key={tag} className="bg-slate-100 text-slate-500 text-[10px] font-bold uppercase px-2 py-1 rounded">
                            #{tag}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

// ----------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ----------------------------------------------------------------------

export default function DiaryBoard({
    selectedProject,
    selectedClub,
    selectedSchool,
    selectedTeam,
    derivedDiaryEntries = [],
    canEditDiary,
    setIsModalOpen,
    getInvestigatorDisplayNames,
    getLattesLink
}) {
    
    // Desacoplando a lógica complexa do render (JSX)
    const uniqueMentors = useMemo(() => {
        if (!selectedTeam) return [];
        const combined = [...(selectedTeam.orientadores || []), ...(selectedTeam.coorientadores || [])];
        return combined.filter((person, index, arr) => arr.findIndex((item) => item.id === person.id) === index);
    }, [selectedTeam]);

    const investigatorNames = useMemo(() => {
        return getInvestigatorDisplayNames(selectedProject, selectedTeam, derivedDiaryEntries).join(', ');
    }, [getInvestigatorDisplayNames, selectedProject, selectedTeam, derivedDiaryEntries]);

    // Early return limpo
    if (!selectedProject) {
        return (
            <div className="premium-card p-10">
                <EmptyState
                    icon={BookOpen}
                    title="Nenhum projeto selecionado"
                    description="Acesse o Feed de Inovação e escolha um projeto para ler o seu diário de bordo."
                />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header do Projeto */}
            <section className="premium-card p-6 md:p-8 flex flex-col md:flex-row gap-8 border-l-4 border-[#00B5B5]">
                <div className="flex-1 flex flex-col justify-center">
                    <header className="flex items-center justify-between mb-4">
                        <div className="flex items-center text-[#FF5722] text-sm font-bold uppercase tracking-wide">
                            <Target className="w-4 h-4 mr-2" /> 
                            Projeto Atual ({selectedClub?.nome || 'Clube não identificado'})
                        </div>
                        <span className="bg-[#E0F2F2] text-[#00B5B5] px-3 py-1 rounded-full text-xs font-bold">
                            {selectedProject.area_tematica || selectedProject.tipo || 'Área não informada'}
                        </span>
                    </header>

                    <h2 className="text-3xl font-bold text-slate-800 mb-4">
                        {selectedProject.titulo || 'Projeto sem título'}
                    </h2>
                    
                    <div className="space-y-3 mb-6 max-w-3xl text-slate-600 leading-relaxed">
                        {selectedProject.introducao && <p>{selectedProject.introducao}</p>}
                        {selectedProject.descricao && <p>{selectedProject.descricao}</p>}
                        {!(selectedProject.introducao || selectedProject.descricao) && (
                            <p>Sem descrição detalhada cadastrada para este projeto.</p>
                        )}
                    </div>

                    {/* Metadados do Projeto */}
                    <div className="flex flex-wrap gap-3 text-sm text-slate-600 mb-6">
                        <div className="flex items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                            <User className="w-4 h-4 mr-2 text-slate-400" /> 
                            Orientador: {selectedTeam?.orientadores?.map(p => p.nome).join(', ') || 'Não informado'}
                        </div>
                        <div className="flex items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                            <User className="w-4 h-4 mr-2 text-slate-400" /> 
                            Coorientador: {selectedTeam?.coorientadores?.map(p => p.nome).join(', ') || 'Não informado'}
                        </div>
                        <div className="flex items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                            <Users className="w-4 h-4 mr-2 text-slate-400" /> 
                            {selectedProject?.membros?.length > 0
                                ? selectedProject.membros.length
                                : selectedTeam?.investigadores?.length || 0} investigadores
                        </div>
                        <div className="flex items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                            <Map className="w-4 h-4 mr-2 text-slate-400" /> 
                            {selectedSchool?.nome || 'Escola não informada'}
                        </div>
                        <div className="flex items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                            <Database className="w-4 h-4 mr-2 text-slate-400" /> 
                            {selectedProject.status || 'Status não informado'}
                        </div>
                    </div>

                    <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        <span className="font-semibold">Investigadores:</span> {investigatorNames || 'Não informado'}
                    </div>

                    {/* Lattes da Mentoria */}
                    {uniqueMentors.length > 0 && (
                        <div className="space-y-3 pt-2">
                            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Currículo Lattes da Mentoria</h4>
                            <div className="flex flex-wrap gap-2">
                                {uniqueMentors.map((person) => (
                                    <MentorBadge key={person.id} person={person} getLattesLink={getLattesLink} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Ações do Diário */}
            <section className="pt-2 pb-2 border-b border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-800">Registros do Diário</h3>
                    {!canEditDiary && (
                        <p className="text-xs text-slate-500 mt-1">Somente membros do clube ou orientadores podem adicionar registros.</p>
                    )}
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)} 
                    disabled={!canEditDiary}
                    className="premium-button disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0" 
                >
                    <Plus className="w-4 h-4 mr-2" /> Novo Registro
                </button>
            </section>

            {/* Lista de Registros */}
            <section className="space-y-6">
                {derivedDiaryEntries.length === 0 ? (
                    <div className="premium-card p-10">
                        <EmptyState 
                            icon={BookOpen} 
                            title="Sem registros adicionais" 
                            description="O sistema montou um resumo a partir do projeto. Para registrar encontros, grave documentos em diario_bordo." 
                        />
                    </div>
                ) : (
                    derivedDiaryEntries.map((entry) => (
                        <DiaryEntryCard key={entry.id} entry={entry} />
                    ))
                )}
            </section>
        </div>
    );
}