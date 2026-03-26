import React, { useEffect, useMemo, useRef } from 'react';
import { School, FolderKanban, LoaderCircle, AlertCircle, ChevronRight } from 'lucide-react';
import EmptyState from './EmptyState';
import ProjectCard from './ProjectCard';

// Componente Skeleton para loading inicial
const ProjectCardSkeleton = () => (
  <div className="premium-card p-5 animate-pulse">
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
      <div className="flex-1 space-y-3">
        <div className="h-5 bg-slate-200 rounded w-3/4"></div>
        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        <div className="h-4 bg-slate-200 rounded w-full"></div>
        <div className="flex gap-3 mt-2">
          <div className="h-8 w-20 bg-slate-200 rounded-full"></div>
          <div className="h-8 w-20 bg-slate-200 rounded-full"></div>
        </div>
      </div>
    </div>
  </div>
);

export default function ProjectFeed({
  feedProjects,
  clubs,
  schools,
  users,
  diaryEntries,
  projectsTotalCount,
  isFetchingProjects,
  hasMoreProjects,
  loadMoreProjectsRef,
  searchTerm,
  setCurrentView,
  setSelectedClubId,
  setSelectedProjectId,
  setViewingClubId,
  getProjectTeam,
  getInvestigatorDisplayNames
}) {
  // Estado para indicar se é o primeiro carregamento (para mostrar skeleton)
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);

  // Simular fim do carregamento inicial quando os projetos são carregados pela primeira vez
  useEffect(() => {
    if (feedProjects.length > 0 || !isFetchingProjects) {
      setIsInitialLoading(false);
    }
  }, [feedProjects, isFetchingProjects]);

  const isSearchActive = Boolean(String(searchTerm || '').trim());

  // Se está carregando inicialmente e não há projetos, mostra skeletons
  const showSkeletons = isInitialLoading && isFetchingProjects && feedProjects.length === 0;

  // Se houver busca e nenhum resultado, ou se não há projetos na base
  const isNoResults = feedProjects.length === 0;
  const showEmptyState = !isFetchingProjects && !isInitialLoading && isNoResults && !hasMoreProjects;

  const showNoMoreProjects = !isFetchingProjects && !isInitialLoading && !hasMoreProjects && !isNoResults;

  const showLoadMoreSentinel = !isFetchingProjects && hasMoreProjects && !isInitialLoading && !isSearchActive;

  const clubsById = useMemo(() => new Map(clubs.map((club) => [String(club.id), club])), [clubs]);
  const schoolsById = useMemo(() => new Map(schools.map((school) => [String(school.id), school])), [schools]);
  const diaryEntriesByProjectId = useMemo(() => {
    const entriesMap = new Map();

    diaryEntries.forEach((entry) => {
      const projectId = String(entry.projeto_id || '');
      if (!projectId) {
        return;
      }

      if (!entriesMap.has(projectId)) {
        entriesMap.set(projectId, []);
      }

      entriesMap.get(projectId).push(entry);
    });

    return entriesMap;
  }, [diaryEntries]);

  const renderedProjects = useMemo(() => {
    return feedProjects.map((project) => {
      const club = clubsById.get(String(project.clube_id || ''));
      const school = schoolsById.get(String(project.escola_id || club?.escola_id || ''));
      const isCompleted = project.status?.toLowerCase().includes('conclu');
      const team = getProjectTeam(project, users, project.clube_id);
      const projectDiaryEntries = diaryEntriesByProjectId.get(String(project.id)) || [];
      const investigatorNames = getInvestigatorDisplayNames(project, team, projectDiaryEntries);

      return {
        project,
        club,
        school,
        isCompleted,
        team,
        investigatorNames
      };
    });
  }, [feedProjects, clubsById, schoolsById, getProjectTeam, users, diaryEntriesByProjectId, getInvestigatorDisplayNames]);

  return (
    /* CONTAINER PRINCIPAL COM O FUNDO DE QUADRADINHOS SUAVES */
    <div 
      className="min-h-screen w-full relative"
      style={{
        backgroundColor: '#f8fafc', // Cor de fundo base (slate-50)
        backgroundImage: ` 
          linear-gradient(to right, rgba(203, 213, 225, 0.2) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(203, 213, 225, 0.2) 1px, transparent 1px)
        `, // Desenha as linhas horizontais e verticais com transparência suave (slate-300 a 20%)
        backgroundSize: '32px 32px', // Tamanho de cada quadradinho
      }}
    > 
      {/* Container do conteúdo (relative e z-10 para ficar por cima do fundo) */}
      <div className="max-w-4xl mx-auto space-y-8 pb-12 px-4 sm:px-0 pt-8 relative z-10">
        
        {/* Header com animação de entrada e leve blur no fundo para leitura */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-slate-300/80 animate-fade-in bg-white/50 backdrop-blur-sm p-4 rounded-xl">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight leading-tight">
              Aprender, Experimentar e Compartilhar
            </h1>
            <p className="text-slate-600 text-sm mt-2 max-w-lg font-medium">
              Pesquisas e descobertas da rede baiana de ciência e tecnologia.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="premium-chip bg-white shadow-sm" title="Total de escolas participantes">
              <School className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">{schools.length}</span>
              <span className="text-xs text-slate-500 hidden sm:inline">escolas</span>
            </div>
            <div className="premium-chip bg-white shadow-sm" title="Total de projetos cadastrados">
              <FolderKanban className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">{projectsTotalCount}</span>
              <span className="text-xs text-slate-500 hidden sm:inline">projetos</span>
            </div>
          </div>
        </div>

        {/* Feed com role e aria-live para acessibilidade */}
        <div 
          className="grid grid-cols-1 gap-6"
          role="feed"
          aria-busy={isFetchingProjects}
          aria-label="Lista de projetos de inovação"
        >
          {/* Indicador de busca/carregamento */}
          {isFetchingProjects && !isInitialLoading && (
            <div className="flex justify-center">
              <div className="flex items-center gap-2 text-sm text-slate-600 font-medium bg-white border border-slate-200 px-5 py-2.5 rounded-full shadow-sm">
                <LoaderCircle className="w-4 h-4 animate-spin text-[#00B5B5]" />
                <span>{isSearchActive ? 'Buscando projetos...' : 'Atualizando projetos...'}</span>
              </div>
            </div>
          )}

          {/* Skeletons no carregamento inicial */}
          {showSkeletons && (
            <>
              {[...Array(3)].map((_, i) => (
                <ProjectCardSkeleton key={`skeleton-${i}`} />
              ))}
            </>
          )}

          {/* Cards de projetos com animação de entrada */}
          {!showSkeletons && renderedProjects.map(({ project, club, school, isCompleted, team, investigatorNames }, index) => {
            return (
              <div
                key={project.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <ProjectCard
                  project={project}
                  club={club}
                  school={school}
                  isCompleted={isCompleted}
                  team={team}
                  investigatorNames={investigatorNames}
                  onClubClick={() => {
                    setViewingClubId(club?.id || '');
                    setCurrentView('clube');
                  }}
                  onDiaryClick={() => {
                    setSelectedClubId(club?.id || '');
                    setSelectedProjectId(project.id);
                    setCurrentView('diario');
                  }}
                />
              </div>
            );
          })}

          {/* Empty State */}
          {showEmptyState && (
            <div className="premium-card bg-white/80 backdrop-blur-sm border-dashed border-slate-300 p-16 text-center">
              <EmptyState 
                icon={isSearchActive ? AlertCircle : FolderKanban}
                title={isSearchActive ? 'Nenhum projeto encontrado' : 'Ainda não há projetos'}
                description={
                  isSearchActive
                    ? `Nenhum projeto corresponde à busca "${searchTerm.trim()}". Tente outro termo ou remova o filtro.`
                    : 'Nenhum projeto foi publicado na rede ainda. Volte mais tarde ou adicione o primeiro projeto.'
                }
              />
            </div>
          )}
        </div>

        {/* Controles de carregamento infinito */}
        <div className="pt-2 pb-6 flex flex-col items-center gap-4">
          {/* Indicador de carregamento de mais projetos */}
          {isFetchingProjects && !isInitialLoading && (
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-white border border-slate-200 px-5 py-2.5 rounded-full shadow-sm">
              <LoaderCircle className="w-4 h-4 animate-spin text-[#00B5B5]" />
              <span>Carregando mais projetos...</span>
            </div>
          )}

          {/* Elemento observador para scroll infinito */}
          {showLoadMoreSentinel && (
            <div ref={loadMoreProjectsRef} className="h-8 w-full flex justify-center items-center" aria-hidden="true">
              <ChevronRight className="w-6 h-6 text-slate-400 animate-bounce" />
            </div>
          )}

          {/* Mensagem de fim da lista */}
          {showNoMoreProjects && (
            <p className="text-center text-sm font-medium text-slate-500 bg-white shadow-sm border border-slate-200 px-4 py-2 rounded-full mt-4">
              Você chegou ao fim da lista de projetos.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}