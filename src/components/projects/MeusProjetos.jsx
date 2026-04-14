import React from 'react';
import ProjectCard from './ProjectCard';

export default function MeusProjetos({
  feedProjects = [],
  clubProjects = [],
  loggedUser,
  clubs = [],
  users = [],
  diaryEntries = [],
  getProjectTeam = () => ({ orientadores: [], coorientadores: [], investigadores: [] }),
  getInvestigatorDisplayNames = () => [],
  ...props
}) {
  const projetos = (clubProjects && clubProjects.length > 0) ? clubProjects : feedProjects;

  const meusProjetos = (projetos || []).filter((proj) => {
    const userId = String(loggedUser?.id || loggedUser?.uid || '').trim();
    if (!userId) return false;

    // Equipe pode ser array de ids ou objetos
    const equipeIds = Array.isArray(proj.equipe)
      ? proj.equipe.map(e => (typeof e === 'object' ? String(e.id || e.uid || e) : String(e)))
      : [];

    // Compatibilidade com campos alternativos
    const membroIds = [].concat(
      proj.membros_ids || [],
      proj.investigadores_ids || [],
      proj.coorientador_ids || [],
      proj.coorientadores_ids || [],
      proj.orientador_ids || [],
      proj.orientadores_ids || []
    ).filter(Boolean).map((v) => String(v));

    const projetoUserIds = new Set([...
      equipeIds,
      membroIds,
      [proj.autor_id, proj.criador_id, proj.owner_id, proj.user_id].map((v) => String(v || '')),
      [proj.investigador, proj.aluno, proj.alunos, proj.estudante, proj.estudantes].map((v) => (typeof v === 'object' ? String(v.id || v.uid || '') : String(v || '')))
    ].flat().filter(Boolean));

    return projetoUserIds.has(userId);
  });

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-black mb-8 text-slate-900">Meus Projetos</h1>
      {meusProjetos.length === 0 ? (
        <div className="premium-card p-8 text-center text-slate-500 font-medium">
          Você ainda não participa de nenhum projeto.
          <div className="mt-3 text-xs text-slate-400">
            Verifique se os campos de associação do projeto incluem ids, equipe ou autor. Veja console para depuração.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {meusProjetos.map((project) => {
            const team = getProjectTeam(project, users, project.clube_id);
            const projectDiaryEntries = diaryEntries.filter((entry) => String(entry.projeto_id) === String(project.id));
            const investigatorNames = getInvestigatorDisplayNames(project, team, projectDiaryEntries);

            return (
              <ProjectCard
                key={project.id}
                project={project}
                club={clubs.find((c) => String(c.id) === String(project.clube_id))}
                team={team}
                investigatorNames={investigatorNames}
                onDiaryClick={() => props.onDiaryClick?.(project)}
                onClubClick={() => props.onClubClick?.(project)}
                {...props}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
