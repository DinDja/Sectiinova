import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  School,
  FolderKanban,
  LoaderCircle,
  AlertCircle,
  ChevronRight,
  Sparkles
} from "lucide-react";
import EmptyState from "../shared/EmptyState";
import ProjectCard from "./ProjectCard";
import ModalClubView from "../club/ModalClubView";
import { getUserClubIds } from "../../services/projectService";

// --- COMPONENTES AUXILIARES HQ (BALÕES E NUVENS) ---

// Rabicho do Balão de Fala
const SpeechTail = ({ className = "", fill = "#ffffff", flip = false }) => (
  <svg 
    className={`absolute z-20 ${className} ${flip ? '-scale-x-100' : ''}`} 
    viewBox="0 0 32 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M4 2 L12 22 L28 2" fill={fill} stroke="#0f172a" strokeWidth="3" strokeLinejoin="round" />
    <path d="M4.5 2 L27.5 2" stroke={fill} strokeWidth="6" strokeLinecap="square" />
  </svg>
);

// Bolinhas do Balão de Pensamento
const ThoughtBubbles = ({ className = "", fill = "#ffffff", flip = false }) => (
  <div className={`absolute z-10 flex flex-col gap-1.5 ${flip ? 'items-end' : 'items-start'} ${className}`}>
    <div className="w-2.5 h-2.5 rounded-full border-[3px] border-slate-900 shadow-sm" style={{ backgroundColor: fill }}></div>
    <div className={`w-4 h-4 rounded-full border-[3px] border-slate-900 shadow-sm ${flip ? 'mr-3' : 'ml-3'}`} style={{ backgroundColor: fill }}></div>
  </div>
);

// --- COMPONENTE SKELETON (HQ STYLE) ---
const ProjectCardSkeleton = () => (
  <div className="bg-white rounded-[2.5rem] border-[3px] border-slate-200 p-6 animate-pulse shadow-sm flex flex-col gap-5 relative">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-slate-200 rounded-full border-[3px] border-slate-300"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-200 rounded-full w-1/3"></div>
        <div className="h-3 bg-slate-200 rounded-full w-1/4"></div>
      </div>
    </div>
    <div className="h-[340px] sm:h-[420px] bg-slate-100 rounded-2xl border-[3px] border-slate-200"></div>
    <div className="space-y-3 mt-2">
      <div className="h-5 bg-slate-200 rounded-full w-3/4"></div>
      <div className="h-4 bg-slate-200 rounded-full w-full"></div>
      <div className="h-4 bg-slate-200 rounded-full w-5/6"></div>
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
  getInvestigatorDisplayNames,
}) {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isClubModalOpen, setIsClubModalOpen] = useState(false);
  const [modalClubData, setModalClubData] = useState({
    club: null,
    school: null,
    projects: [],
    users: [],
    orientadores: [],
    coorientadores: [],
    investigadores: [],
    diaryCount: 0,
  });

  useEffect(() => {
    if (feedProjects.length > 0 || !isFetchingProjects) {
      setIsInitialLoading(false);
    }
  }, [feedProjects, isFetchingProjects]);

  const isSearchActive = Boolean(String(searchTerm || "").trim());
  const showSkeletons = isInitialLoading && isFetchingProjects && feedProjects.length === 0;
  const isNoResults = feedProjects.length === 0;
  const showEmptyState = !isFetchingProjects && !isInitialLoading && isNoResults && !hasMoreProjects;
  const showNoMoreProjects = !isFetchingProjects && !isInitialLoading && !hasMoreProjects && !isNoResults;
  const showLoadMoreSentinel = !isFetchingProjects && hasMoreProjects && !isInitialLoading && !isSearchActive;

  const clubsById = useMemo(() => new Map(clubs.map((club) => [String(club.id), club])), [clubs]);
  const schoolsById = useMemo(() => new Map(schools.map((school) => [String(school.id), school])), [schools]);

  const diaryEntriesByProjectId = useMemo(() => {
    const entriesMap = new Map();
    diaryEntries.forEach((entry) => {
      const projectId = String(entry.projeto_id || "");
      if (!projectId) return;
      if (!entriesMap.has(projectId)) entriesMap.set(projectId, []);
      entriesMap.get(projectId).push(entry);
    });
    return entriesMap;
  }, [diaryEntries]);

  const renderedProjects = useMemo(() => {
    return feedProjects.map((project) => {
      const club = clubsById.get(String(project.clube_id || ""));
      const school = schoolsById.get(String(project.escola_id || club?.escola_id || ""));
      const isCompleted = project.status?.toLowerCase().includes("conclu");
      const team = getProjectTeam(project, users, project.clube_id);
      const projectDiaryEntries = diaryEntriesByProjectId.get(String(project.id)) || [];
      const investigatorNames = getInvestigatorDisplayNames(project, team, projectDiaryEntries);

      return { project, club, school, isCompleted, team, investigatorNames };
    });
  }, [feedProjects, clubsById, schoolsById, getProjectTeam, users, diaryEntriesByProjectId, getInvestigatorDisplayNames]);

  const handleOpenClubModal = (club, school) => {
    if (!club) return;
    const clubProjects = feedProjects.filter((p) => String(p.clube_id) === String(club.id));
    const clubUsers = users.filter((u) => getUserClubIds(u).includes(String(club.id)));

    const allTeamMembers = new Map();
    clubProjects.forEach((project) => {
      const team = getProjectTeam(project, users, club.id);
      team.orientadores?.forEach((m) => allTeamMembers.set(String(m.id), { ...m, role: "orientador" }));
      team.coorientadores?.forEach((m) => allTeamMembers.set(String(m.id), { ...m, role: "coorientador" }));
      team.investigadores?.forEach((m) => allTeamMembers.set(String(m.id), { ...m, role: "investigador" }));
    });

    const orientadores = Array.from(allTeamMembers.values()).filter((m) => m.role === "orientador");
    const coorientadores = Array.from(allTeamMembers.values()).filter((m) => m.role === "coorientador");
    const investigadores = Array.from(allTeamMembers.values()).filter((m) => m.role === "investigador");

    const clubDiaryCount = diaryEntries.filter(
      (entry) => String(entry.clube_id) === String(club.id) || clubProjects.some((p) => String(p.id) === String(entry.projeto_id))
    ).length;

    setModalClubData({
      club, school, projects: clubProjects, users: clubUsers, orientadores, coorientadores, investigadores, diaryCount: clubDiaryCount,
    });
    setIsClubModalOpen(true);
  };

  return (
    <div className="min-h-screen w-full relative bg-[#FDFDFD] overflow-x-hidden">
      
      {/* BACKGROUND: imagem BG.png com sobreposição suave */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[url('/BG.png')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-white/15 backdrop-blur-sm"></div>
      </div>
      
      <div className="max-w-4xl mx-auto space-y-12 pb-12 px-4 sm:px-0 pt-8 relative z-10">
        
        {/* HEADER / PAINEL DE BOAS VINDAS (BALÃO DE FALA GIGANTE) */}
        <div className="relative w-full">
          <div className="bg-white border-[3px] border-slate-900 shadow-lg rounded-[3rem] p-8 md:p-12 flex flex-col justify-between items-start relative overflow-hidden group transition-all hover:-translate-y-1 z-10">
            
            {/* Decorações do painel HQ */}
            <div className="absolute -top-16 -right-16 w-56 h-56 bg-cyan-300 rounded-full opacity-20 group-hover:scale-110 transition-transform duration-700 pointer-events-none"></div>
            <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-pink-400 rounded-full opacity-10 pointer-events-none"></div>

            <div className="w-full relative z-10">
              <div className="inline-flex items-center gap-2 bg-yellow-400 px-5 py-2.5 rounded-full border-[3px] border-slate-900 shadow-sm mb-6 transform -rotate-2 hover:rotate-0 transition-transform duration-300 cursor-default">
                <Sparkles className="w-5 h-5 text-slate-900 stroke-[2.5]" />
                <span className="font-black uppercase tracking-widest text-sm text-slate-900">
                  Feed Social
                </span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight uppercase leading-[1.05]">
                Aprender, Experimentar <br />
                <span className="text-pink-500 inline-block transform hover:scale-105 transition-transform origin-left">
                  e Compartilhar
                </span>
              </h1>
              
              <div className="mt-6">
                <p className="text-slate-700 text-base md:text-lg font-bold bg-slate-50 border-[3px] border-slate-900 rounded-2xl p-4 inline-block shadow-sm">
                  Deslize para explorar a rede de inovação!
                </p>
              </div>
            </div>

            {/* METRICS CARDS (BALÕES DE FALA MENORES) */}
            <div className="flex flex-col sm:flex-row gap-6 mt-10 w-full relative z-10">
              
              {/* Card Clubes */}
              <div className="relative flex-1">
                <div className="flex items-center justify-center gap-4 bg-cyan-300 bg-[url('/Balao.svg')] bg-no-repeat bg-center bg-[length:120%] border-[3px] border-slate-900 shadow-sm px-6 py-5 rounded-[2rem] transform hover:-translate-y-1 transition-all z-10 relative">
                  <div className="bg-white p-3 rounded-full border-[3px] border-slate-900">
                    <School className="w-6 h-6 text-slate-900 stroke-[3]" />
                  </div>
                  <div>
                    <span className="block text-3xl font-black text-slate-900 leading-none">
                      {clubs.length}
                    </span>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-800">
                      Clubes
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Card Projetos */}
              <div className="relative flex-1">
                <div className="flex items-center justify-center gap-4 bg-pink-400 bg-[url('/Balao.svg')] bg-no-repeat bg-center bg-[length:120%] border-[3px] border-slate-900 shadow-sm px-6 py-5 rounded-[2rem] transform hover:-translate-y-1 transition-all z-10 relative">
                  <div className="bg-white p-3 rounded-full border-[3px] border-slate-900">
                    <FolderKanban className="w-6 h-6 text-slate-900 stroke-[3]" />
                  </div>
                  <div>
                    <span className="block text-3xl font-black leading-none">
                      {projectsTotalCount}
                    </span>
                    <span className="text-xs font-black uppercase tracking-widest ">
                      Projetos
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
          {/* Rabicho do Header Principal */}
        </div>

        {/* FEED DE PROJETOS */}
        <div
          className="grid grid-cols-1 gap-10"
          role="feed"
          aria-busy={isFetchingProjects}
          aria-label="Lista de projetos de inovação"
        >
          {isFetchingProjects && !isInitialLoading && (
            <div className="flex justify-center mb-6 relative">
              <div className="flex items-center gap-3 text-sm text-slate-700 font-bold bg-white border-[3px] border-slate-900 px-6 py-3 rounded-[2rem] shadow-sm relative z-10">
                <LoaderCircle className="w-5 h-5 animate-spin text-pink-500" />
                <span>
                  {isSearchActive ? "Buscando projetos..." : "Atualizando projetos..."}
                </span>
              </div>
              <ThoughtBubbles className="-bottom-6 left-[40%]" fill="#ffffff" />
            </div>
          )}

          {showSkeletons && (
            <>
              {[...Array(3)].map((_, i) => (
                <ProjectCardSkeleton key={`skeleton-${i}`} />
              ))}
            </>
          )}

          {!showSkeletons &&
            renderedProjects.map(
              ({ project, club, school, isCompleted, team, investigatorNames }, index) => {
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
                      allProjects={feedProjects}
                      allUsers={users}
                      onClubClick={() => handleOpenClubModal(club, school)}
                      onDiaryClick={() => {
                        const resolvedClubId = String(club?.id || project?.clube_id || "").trim();
                        if (resolvedClubId) setSelectedClubId(resolvedClubId);
                        setSelectedProjectId(project.id);
                        setCurrentView("diario");
                      }}
                    />
                  </div>
                );
              }
            )}

          {showEmptyState && (
            <div className="relative">
              <div className="bg-white rounded-[3rem] border-[3px] border-slate-900 p-16 text-center shadow-md relative z-10">
                <EmptyState
                  icon={isSearchActive ? AlertCircle : FolderKanban}
                  title={isSearchActive ? "Nenhum projeto encontrado" : "Ainda não há projetos"}
                  description={
                    isSearchActive
                      ? `Nenhum projeto corresponde à busca "${searchTerm.trim()}". Tente outro termo ou remova o filtro.`
                      : "Nenhum projeto foi publicado na rede ainda. Volte mais tarde ou adicione o primeiro projeto."
                  }
                />
              </div>
              {/* Transformando o Empty State num balão de pensamento gigante */}
              <ThoughtBubbles className="-bottom-8 right-32" fill="#ffffff" flip />
            </div>
          )}
        </div>

        {/* CONTROLES DE CARREGAMENTO INFINITO */}
        <div className="pt-6 pb-8 flex flex-col items-center gap-6 relative z-10">
          {isFetchingProjects && !isInitialLoading && (
            <div className="relative">
              <div className="flex items-center gap-3 text-sm text-slate-700 font-bold bg-yellow-300 border-[3px] border-slate-900 px-6 py-3 rounded-full shadow-sm z-10 relative">
                <LoaderCircle className="w-5 h-5 animate-spin text-slate-900" />
                <span>Carregando mais projetos...</span>
              </div>
              <ThoughtBubbles className="-bottom-6 left-1/4" fill="#fde047" /> {/* amarelho-300 */}
            </div>
          )}

          {showLoadMoreSentinel && (
            <div
              ref={loadMoreProjectsRef}
              className="h-12 w-full flex justify-center items-center group cursor-pointer"
              aria-hidden="true"
            >
              <div className="bg-cyan-300 p-3 rounded-full border-[3px] border-slate-900 shadow-sm transition-transform transform group-hover:scale-110">
                <ChevronRight className="w-6 h-6 text-slate-900 animate-bounce rotate-90" />
              </div>
            </div>
          )}

          {showNoMoreProjects && (
            <div className="relative mt-4">
              <p className="text-center text-sm font-bold text-slate-700 bg-white shadow-sm border-[3px] border-slate-900 px-6 py-3 rounded-full relative z-10">
                Fim do feed. Você chegou ao fim da página!
              </p>
            </div>
          )}
        </div>
      </div>

      <ModalClubView
        isOpen={isClubModalOpen}
        onClose={() => setIsClubModalOpen(false)}
        viewingClub={modalClubData.club}
        viewingClubSchool={modalClubData.school}
        viewingClubProjects={modalClubData.projects}
        viewingClubUsers={modalClubData.users}
        viewingClubOrientadores={modalClubData.orientadores}
        viewingClubCoorientadores={modalClubData.coorientadores}
        viewingClubInvestigadores={modalClubData.investigadores}
        viewingClubDiaryCount={modalClubData.diaryCount}
        setSelectedClubId={setSelectedClubId}
        setSelectedProjectId={setSelectedProjectId}
        setCurrentView={setCurrentView}
      />
    </div>
  );
}