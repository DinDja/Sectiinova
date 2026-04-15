import React, { useMemo } from 'react';
import ProjectCard from './ProjectCard';

export default function MeusProjetos({
  feedProjects = [],
  clubProjects = [],
  myClubIds = [],
  mentorManagedClubs = [],
  loggedUser,
  clubs = [],
  users = [],
  diaryEntries = [],
  getProjectTeam = () => ({ orientadores: [], coorientadores: [], investigadores: [] }),
  getInvestigatorDisplayNames = () => [],
  ...props
}) {
  const projetosSource = (clubProjects && clubProjects.length > 0) ? clubProjects : feedProjects;

  const loggedUserId = String(loggedUser?.id || loggedUser?.uid || '').trim();
  const loggedUserPerfil = String(loggedUser?.perfil || '').trim().toLowerCase();
  const isMentorProfile = ['orientador', 'coorientador'].includes(loggedUserPerfil);

  const mentorClubIdSet = useMemo(() => {
    const ids = [
      ...(myClubIds || []),
      ...(mentorManagedClubs || []).map((club) => club?.id)
    ];

    return new Set(
      ids
        .map((clubId) => String(clubId || '').trim())
        .filter(Boolean)
    );
  }, [myClubIds, mentorManagedClubs]);

  const meusProjetos = useMemo(() => {
    return (projetosSource || []).filter((proj) => {
      if (!loggedUserId) return false;

      if (isMentorProfile) {
        const projectClubId = String(proj?.clube_id || '').trim();
        return projectClubId ? mentorClubIdSet.has(projectClubId) : false;
      }

      const equipeIds = Array.isArray(proj?.equipe)
        ? proj.equipe.map((e) => (typeof e === 'object' ? String(e.id || e.uid || e) : String(e)))
        : [];

      const membroIds = []
        .concat(
          proj?.membros_ids || [],
          proj?.investigadores_ids || [],
          proj?.coorientador_ids || [],
          proj?.coorientadores_ids || [],
          proj?.orientador_ids || [],
          proj?.orientadores_ids || []
        )
        .filter(Boolean)
        .map((value) => String(value));

      const projetoUserIds = new Set([
        ...equipeIds,
        ...membroIds,
        ...[proj?.autor_id, proj?.criador_id, proj?.owner_id, proj?.user_id].map((value) => String(value || '')),
        ...[proj?.investigador, proj?.aluno, proj?.alunos, proj?.estudante, proj?.estudantes].map((value) => (
          typeof value === 'object' ? String(value?.id || value?.uid || '') : String(value || '')
        ))
      ].filter(Boolean));

      return projetoUserIds.has(loggedUserId);
    });
  }, [projetosSource, loggedUserId, isMentorProfile, mentorClubIdSet]);

  const mentorClubs = useMemo(() => {
    if (!isMentorProfile) return [];

    const clubsById = new Map();

    (mentorManagedClubs || []).forEach((club) => {
      const clubId = String(club?.id || '').trim();
      if (!clubId) return;
      clubsById.set(clubId, club);
    });

    clubs.forEach((club) => {
      const clubId = String(club?.id || '').trim();
      if (!clubId || !mentorClubIdSet.has(clubId)) return;
      if (!clubsById.has(clubId)) {
        clubsById.set(clubId, club);
      }
    });

    return [...clubsById.values()].sort((a, b) => String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR'));
  }, [isMentorProfile, mentorManagedClubs, clubs, mentorClubIdSet]);

  const mentorProjectsByClub = useMemo(() => {
    if (!isMentorProfile) return [];

    const projectsByClubId = new Map();
    meusProjetos.forEach((project) => {
      const clubId = String(project?.clube_id || '').trim();
      if (!clubId) return;
      if (!projectsByClubId.has(clubId)) {
        projectsByClubId.set(clubId, []);
      }
      projectsByClubId.get(clubId).push(project);
    });

    const groups = mentorClubs.map((club) => {
      const clubId = String(club?.id || '').trim();
      const clubProjectsList = (projectsByClubId.get(clubId) || []).sort((a, b) =>
        String(a?.titulo || '').localeCompare(String(b?.titulo || ''), 'pt-BR')
      );

      return { club, projects: clubProjectsList };
    });

    if (groups.length > 0) {
      return groups;
    }

    return [...projectsByClubId.entries()].map(([clubId, clubProjectsList]) => ({
      club: clubs.find((item) => String(item?.id || '').trim() === clubId) || { id: clubId, nome: 'Clube' },
      projects: (clubProjectsList || []).sort((a, b) =>
        String(a?.titulo || '').localeCompare(String(b?.titulo || ''), 'pt-BR')
      )
    }));
  }, [isMentorProfile, meusProjetos, mentorClubs, clubs]);

  const renderProjectCard = (project) => {
    const team = getProjectTeam(project, users, project?.clube_id);
    const projectDiaryEntries = diaryEntries.filter((entry) => String(entry?.projeto_id) === String(project?.id));
    const investigatorNames = getInvestigatorDisplayNames(project, team, projectDiaryEntries);

    return (
      <ProjectCard
        key={project?.id}
        project={project}
        club={clubs.find((club) => String(club?.id) === String(project?.clube_id))}
        team={team}
        investigatorNames={investigatorNames}
        onDiaryClick={() => props.onDiaryClick?.(project)}
        onClubClick={() => props.onClubClick?.(project)}
        {...props}
      />
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-black mb-8 text-slate-900">Meus Projetos</h1>

      {isMentorProfile ? (
        mentorProjectsByClub.length === 0 ? (
          <div className="premium-card p-8 text-center text-slate-500 font-medium">
            Nenhum projeto encontrado nos seus clubes.
          </div>
        ) : (
          <div className="space-y-8">
            {mentorProjectsByClub.map(({ club, projects }) => {
              const clubId = String(club?.id || '').trim();

              return (
                <section key={clubId || String(club?.nome || '')} className="space-y-4">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <h2 className="text-xl font-extrabold text-slate-900">{club?.nome || 'Clube sem nome'}</h2>
                    <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 text-xs font-black px-3 py-1">
                      {projects.length} projeto{projects.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {projects.length === 0 ? (
                    <div className="premium-card p-6 text-center text-slate-500 text-sm">
                      Este clube ainda nao possui projetos cadastrados.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {projects.map((project) => renderProjectCard(project))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )
      ) : meusProjetos.length === 0 ? (
        <div className="premium-card p-8 text-center text-slate-500 font-medium">
          Voce ainda nao participa de nenhum projeto.
          <div className="mt-3 text-xs text-slate-400">
            Verifique se os campos de associacao do projeto incluem ids, equipe ou autor. Veja console para depuracao.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {meusProjetos.map((project) => renderProjectCard(project))}
        </div>
      )}
    </div>
  );
}
