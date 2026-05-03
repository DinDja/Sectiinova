import React, { useCallback, useMemo, useRef, useState } from 'react';
import ProjectCard from './ProjectCard';

// --- Funções Auxiliares (Fora do ciclo de renderização para melhor performance) ---

const resolveProjectClubId = (project) => {
  if (!project || typeof project !== 'object') return '';
  return String(
    project.clube_id || project.clubeId || project.club_id || project.clubId || project.clube?.id || project.club?.id || ''
  ).trim();
};

/**
 * Normaliza e extrai todos os IDs de usuários vinculados a um projeto,
 * lidando com possíveis inconsistências na estrutura de dados do backend.
 */
const getProjectUserIds = (proj) => {
  if (!proj) return new Set();

  const extractId = (val) => (typeof val === 'object' ? String(val?.id || val?.uid || '') : String(val || ''));

  const rawIds = [
    ...(Array.isArray(proj.equipe) ? proj.equipe : []),
    ...(proj.membros_ids || []),
    ...(proj.investigadores_ids || []),
    ...(proj.coorientador_ids || []),
    ...(proj.coorientadores_ids || []),
    ...(proj.orientador_ids || []),
    ...(proj.orientadores_ids || []),
    proj.autor_id,
    proj.criador_id,
    proj.owner_id,
    proj.user_id,
    proj.investigador,
    proj.aluno,
    proj.alunos,
    proj.estudante,
    proj.estudantes,
  ];

  const normalizedIds = rawIds
    .flat() // Achata arrays aninhados acidentalmente
    .filter(Boolean)
    .map(extractId)
    .filter((id) => id.trim() !== '');

  return new Set(normalizedIds);
};

// --- Componente Principal ---

export default function MeusProjetos({
  feedProjects = [],
  clubProjects = [],
  myClubIds = [],
  mentorManagedClubs = [],
  loggedUser,
  clubs = [],
  users = [],
  diaryEntries = [],
  onToggleProjectLike,
  onDiaryClick,
  onClubClick,
  getProjectTeam = () => ({ orientadores: [], coorientadores: [], investigadores: [] }),
  getInvestigatorDisplayNames = () => [],
  ...props
}) {
  const [pendingLikeProjectIds, setPendingLikeProjectIds] = useState(() => new Set());
  const pendingLikeProjectIdsRef = useRef(new Set());

  // Dados do usuário
  const loggedUserId = String(loggedUser?.id || loggedUser?.uid || '').trim();
  const loggedUserPerfil = String(loggedUser?.perfil || '').trim().toLowerCase();
  const isMentorProfile = ['orientador', 'coorientador'].includes(loggedUserPerfil);

  const projetosSource = Array.isArray(clubProjects) && clubProjects.length > 0 ? clubProjects : feedProjects;

  // 1. Set de IDs de clubes do mentor
  const mentorClubIdSet = useMemo(() => {
    const ids = [
      ...(myClubIds || []),
      ...(mentorManagedClubs || []).map((club) => club?.id),
    ];
    return new Set(ids.map((id) => String(id || '').trim()).filter(Boolean));
  }, [myClubIds, mentorManagedClubs]);

  // 2. Filtra os projetos em que o usuário logado participa
  const meusProjetos = useMemo(() => {
    if (!loggedUserId) return [];

    return (projetosSource || []).filter((proj) => {
      const projetoUserIds = getProjectUserIds(proj);
      return projetoUserIds.has(loggedUserId);
    });
  }, [projetosSource, loggedUserId]);

  // 3. Resolve os clubes do mentor
  const mentorClubs = useMemo(() => {
    if (!isMentorProfile) return [];

    const clubsById = new Map();

    // Adiciona clubes gerenciados
    (mentorManagedClubs || []).forEach((club) => {
      const clubId = String(club?.id || '').trim();
      if (clubId) clubsById.set(clubId, club);
    });

    // Adiciona outros clubes que o mentor participa
    (clubs || []).forEach((club) => {
      const clubId = String(club?.id || '').trim();
      if (clubId && mentorClubIdSet.has(clubId) && !clubsById.has(clubId)) {
        clubsById.set(clubId, club);
      }
    });

    return Array.from(clubsById.values()).sort((a, b) =>
      String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR')
    );
  }, [isMentorProfile, mentorManagedClubs, clubs, mentorClubIdSet]);

  // 4. Agrupa projetos por clube para o perfil Mentor
  const mentorProjectsByClub = useMemo(() => {
    if (!isMentorProfile) return [];

    const projectsByClubId = new Map();
    
    meusProjetos.forEach((project) => {
      const clubId = resolveProjectClubId(project);
      if (!clubId) return;
      if (!projectsByClubId.has(clubId)) projectsByClubId.set(clubId, []);
      projectsByClubId.get(clubId).push(project);
    });

    const groups = mentorClubs
      .map((club) => {
        const clubId = String(club?.id || '').trim();
        const clubProjectsList = (projectsByClubId.get(clubId) || []).sort((a, b) =>
          String(a?.titulo || '').localeCompare(String(b?.titulo || ''), 'pt-BR')
        );
        return { club, projects: clubProjectsList };
      })
      .filter((group) => group.projects.length > 0);

    // Fallback: Se não encontrou grupos atrelados a mentorClubs, agrupa pelo ID presente no projeto
    if (groups.length === 0 && projectsByClubId.size > 0) {
      return Array.from(projectsByClubId.entries()).map(([clubId, clubProjectsList]) => ({
        club: clubs.find((item) => String(item?.id || '').trim() === clubId) || { id: clubId, nome: 'Outros Clubes' },
        projects: clubProjectsList.sort((a, b) => String(a?.titulo || '').localeCompare(String(b?.titulo || ''), 'pt-BR')),
      }));
    }

    return groups;
  }, [isMentorProfile, meusProjetos, mentorClubs, clubs]);

  // --- Handlers ---

  const handleProjectLike = useCallback(
    async (project) => {
      if (typeof onToggleProjectLike !== 'function') return null;

      const projectId = String(project?.id || '').trim();
      if (!projectId || pendingLikeProjectIdsRef.current.has(projectId)) return null;

      // Optimistic UI lock
      pendingLikeProjectIdsRef.current.add(projectId);
      setPendingLikeProjectIds(new Set(pendingLikeProjectIdsRef.current));

      try {
        return await onToggleProjectLike(projectId);
      } finally {
        // Unlock after request finishes
        pendingLikeProjectIdsRef.current.delete(projectId);
        setPendingLikeProjectIds(new Set(pendingLikeProjectIdsRef.current));
      }
    },
    [onToggleProjectLike]
  );

  // --- Renderers ---

  const renderProjectCard = (project) => {
    const projectClubId = resolveProjectClubId(project);
    const team = getProjectTeam(project, users, projectClubId);
    const projectDiaryEntries = diaryEntries.filter((entry) => String(entry?.projeto_id) === String(project?.id));
    const investigatorNames = getInvestigatorDisplayNames(project, team, projectDiaryEntries);
    const normalizedProjectId = String(project?.id || '').trim();

    return (
      <ProjectCard
        key={normalizedProjectId}
        project={project}
        club={clubs.find((club) => String(club?.id) === projectClubId)}
        team={team}
        investigatorNames={investigatorNames}
        loggedUserId={loggedUserId}
        onLikeClick={() => handleProjectLike(project)}
        isLikeSubmitting={pendingLikeProjectIds.has(normalizedProjectId)}
        onDiaryClick={() => onDiaryClick?.(project)}
        onClubClick={() => onClubClick?.(project)}
        {...props}
      />
    );
  };

  const renderEmptyState = (message, subMessage) => (
    <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 transition-all duration-300 hover:border-slate-300">
      <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
      <h3 className="text-lg font-bold text-slate-700">{message}</h3>
      {subMessage && <p className="mt-2 text-sm text-slate-500 text-center max-w-md">{subMessage}</p>}
    </div>
  );

  // --- Renderização Principal ---

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Meus Projetos
        </h1>
        <p className="mt-2 text-slate-500 font-medium">
          Gerencie e acompanhe o progresso das suas investigações.
        </p>
      </header>

      {isMentorProfile ? (
        mentorProjectsByClub.length === 0 ? (
          renderEmptyState(
            'Nenhum projeto encontrado',
            'Você ainda não participa ou gerencia projetos em nenhum clube. Verifique os convites ou crie um novo projeto.'
          )
        ) : (
          <div className="space-y-12">
            {mentorProjectsByClub.map(({ club, projects }) => {
              const clubId = String(club?.id || '').trim();

              return (
                <section key={clubId || String(club?.nome || '')} className="space-y-5">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                      <span className="w-2 h-6 bg-blue-600 rounded-full inline-block"></span>
                      {club?.nome || 'Clube não identificado'}
                    </h2>
                    <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-1 shadow-sm">
                      {projects.length} {projects.length === 1 ? 'Projeto' : 'Projetos'}
                    </span>
                  </div>

                  {projects.length === 0 ? (
                    renderEmptyState('Este clube ainda não possui projetos ativos.')
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                      {projects.map(renderProjectCard)}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )
      ) : meusProjetos.length === 0 ? (
        renderEmptyState(
          'Você ainda não participa de nenhum projeto.',
          'Caso já tenha sido adicionado, verifique com seu orientador se seus dados foram inseridos corretamente.'
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meusProjetos.map(renderProjectCard)}
        </div>
      )}
    </div>
  );
}