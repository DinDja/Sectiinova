import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  School,
  FolderKanban,
  LoaderCircle,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Building2,
  MapPin
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

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const normalizeId = (value) => String(value || "").trim();

const getPersonKey = (person) => normalizeId(person?.id || person?.uid || person?.email || person?.nome);

const countUniqueIds = (values = []) => (
  new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  ).size
);

export default function ProjectFeed({
  feedProjects,
  clubs,
  schools,
  users,
  loggedUser,
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
  onToggleProjectLike,
}) {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [feedMode, setFeedMode] = useState("projects");
  const [pendingLikeProjectIds, setPendingLikeProjectIds] = useState(() => new Set());
  const pendingLikeProjectIdsRef = useRef(new Set());
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
  const loggedUserId = String(loggedUser?.id || loggedUser?.uid || '').trim();

  const handleProjectLike = useCallback(async (project) => {
    if (typeof onToggleProjectLike !== 'function') {
      return null;
    }

    const projectId = String(project?.id || '').trim();
    if (!projectId) {
      return null;
    }

    if (pendingLikeProjectIdsRef.current.has(projectId)) {
      return null;
    }

    pendingLikeProjectIdsRef.current.add(projectId);
    setPendingLikeProjectIds(new Set(pendingLikeProjectIdsRef.current));

    try {
      return await onToggleProjectLike(projectId);
    } finally {
      pendingLikeProjectIdsRef.current.delete(projectId);
      setPendingLikeProjectIds(new Set(pendingLikeProjectIdsRef.current));
    }
  }, [onToggleProjectLike]);

  useEffect(() => {
    if (feedProjects.length > 0 || !isFetchingProjects) {
      setIsInitialLoading(false);
    }
  }, [feedProjects, isFetchingProjects]);

  const isClubMode = feedMode === "clubs";
  const isSearchActive = Boolean(String(searchTerm || "").trim());
  const normalizedSearchTerm = normalizeText(searchTerm);
  const showProjectSkeletons = !isClubMode && isInitialLoading && isFetchingProjects && feedProjects.length === 0;
  const showNoMoreProjects = !isClubMode && !isFetchingProjects && !isInitialLoading && !hasMoreProjects;
  const showLoadMoreSentinel = !isClubMode && !isFetchingProjects && hasMoreProjects && !isInitialLoading && !isSearchActive;

  const clubsById = useMemo(() => new Map(clubs.map((club) => [String(club.id), club])), [clubs]);
  const schoolsById = useMemo(() => new Map(schools.map((school) => [String(school.id), school])), [schools]);
  const schoolsByName = useMemo(() => (
    new Map(
      schools
        .map((school) => [normalizeText(school?.nome), school])
        .filter(([name]) => Boolean(name))
    )
  ), [schools]);

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

  const renderedClubs = useMemo(() => {
    const projectsByClubId = new Map();
    feedProjects.forEach((project) => {
      const clubId = String(project?.clube_id || "").trim();
      if (!clubId) return;
      projectsByClubId.set(clubId, (projectsByClubId.get(clubId) || 0) + 1);
    });

    return clubs
      .map((club) => {
        const clubId = String(club?.id || "").trim();
        const clubSchoolId = String(club?.escola_id || "").trim();
        const clubSchoolName = normalizeText(club?.escola_nome);
        const school = schoolsById.get(clubSchoolId) || schoolsByName.get(clubSchoolName) || null;

        const schoolName = String(school?.nome || club?.escola_nome || "Unidade escolar nao informada").trim();
        const schoolSec = String(school?.cod_sec || school?.sec || school?.codigo_sec || "").trim();
        const schoolInep = String(school?.cod_inep || school?.inep || "").trim();
        const clubBannerUrl = String(club?.banner_url || club?.banner || club?.cover || "").trim();
        const clubLogoUrl = String(club?.logo_url || club?.logo || club?.emblem || "").trim();

        const memberCount = countUniqueIds([
          ...(club?.membros_ids || []),
          ...(club?.clubistas_ids || []),
          ...(club?.orientador_ids || []),
          ...(club?.orientadores_ids || []),
          ...(club?.coorientador_ids || []),
          ...(club?.coorientadores_ids || []),
          club?.mentor_id,
        ]);

        const mentorCount = countUniqueIds([
          club?.mentor_id,
          ...(club?.orientador_ids || []),
          ...(club?.orientadores_ids || []),
          ...(club?.coorientador_ids || []),
          ...(club?.coorientadores_ids || []),
        ]);

        const projectCountFromFeed = projectsByClubId.get(clubId);
        const fallbackProjectCount = Number(club?.projetosCount ?? club?.projetos?.length ?? club?.projetos_ids?.length ?? 0);
        const projectsCount = Number.isFinite(projectCountFromFeed)
          ? projectCountFromFeed
          : (Number.isFinite(fallbackProjectCount) ? fallbackProjectCount : 0);

        const searchText = normalizeText([
          club?.nome,
          club?.descricao,
          schoolName,
          schoolSec,
          schoolInep,
          clubSchoolId,
        ].join(" "));

        return {
          club,
          school,
          schoolName,
          schoolSec,
          schoolInep,
          clubBannerUrl,
          clubLogoUrl,
          memberCount,
          mentorCount,
          projectsCount,
          searchText,
        };
      })
      .filter((item) => {
        if (!normalizedSearchTerm) return true;
        return item.searchText.includes(normalizedSearchTerm);
      })
      .sort((a, b) => String(a?.club?.nome || "").localeCompare(String(b?.club?.nome || ""), "pt-BR"));
  }, [clubs, feedProjects, schoolsById, schoolsByName, normalizedSearchTerm]);

  const isNoResults = isClubMode ? renderedClubs.length === 0 : renderedProjects.length === 0;
  const showEmptyState = !isFetchingProjects && !isInitialLoading && isNoResults && (isClubMode || !hasMoreProjects);

  const handleOpenClubModal = (club, school) => {
    if (!club) return;
    const clubId = normalizeId(club?.id);
    const clubProjects = feedProjects.filter((p) => normalizeId(p?.clube_id) === clubId);
    const clubMemberIds = new Set(
      [
        ...(club?.membros_ids || []),
        ...(club?.clubistas_ids || []),
        ...(club?.investigadores_ids || []),
        ...(club?.orientador_ids || []),
        ...(club?.orientadores_ids || []),
        ...(club?.coorientador_ids || []),
        ...(club?.coorientadores_ids || []),
        club?.mentor_id,
      ]
        .map(normalizeId)
        .filter(Boolean)
    );
    const clubMentorIds = new Set(
      [
        club?.mentor_id,
        ...(club?.orientador_ids || []),
        ...(club?.orientadores_ids || []),
        ...(club?.coorientador_ids || []),
        ...(club?.coorientadores_ids || []),
      ]
        .map(normalizeId)
        .filter(Boolean)
    );
    const clubClubistaIds = new Set(
      [
        ...(club?.membros_ids || []),
        ...(club?.clubistas_ids || []),
        ...(club?.investigadores_ids || []),
      ]
        .map(normalizeId)
        .filter(Boolean)
    );

    const clubUsers = users.filter((user) => {
      const userId = normalizeId(user?.id || user?.uid);
      const userClubIds = getUserClubIds(user);
      return (Boolean(userId) && clubMemberIds.has(userId)) || userClubIds.includes(clubId);
    });

    const orientadoresById = new Map();
    const coorientadoresById = new Map();
    const investigadoresById = new Map();

    const addUniquePerson = (targetMap, person) => {
      const personKey = getPersonKey(person);
      if (!personKey || targetMap.has(personKey)) return;
      targetMap.set(personKey, person);
    };

    clubUsers.forEach((person) => {
      const personId = normalizeId(person?.id || person?.uid);
      const perfil = normalizeText(person?.perfil);
      const isMentorProfile = perfil === "orientador" || perfil === "coorientador";
      const isStudentProfile = ["estudante", "investigador", "aluno", "clubista"].includes(perfil);
      const isMentorByClubId = Boolean(personId) && clubMentorIds.has(personId);
      const isClubistaByClubId = Boolean(personId) && clubClubistaIds.has(personId);

      if (perfil === "coorientador") {
        addUniquePerson(coorientadoresById, person);
      } else if (perfil === "orientador" || isMentorByClubId) {
        addUniquePerson(orientadoresById, person);
      }

      if (!isMentorProfile && (isStudentProfile || (isClubistaByClubId && !isMentorByClubId))) {
        addUniquePerson(investigadoresById, person);
      }
    });

    clubProjects.forEach((project) => {
      const team = getProjectTeam(project, users, clubId);
      team.orientadores?.forEach((person) => addUniquePerson(orientadoresById, person));
      team.coorientadores?.forEach((person) => addUniquePerson(coorientadoresById, person));
      team.investigadores?.forEach((person) => {
        const personKey = getPersonKey(person);
        if (!personKey || orientadoresById.has(personKey) || coorientadoresById.has(personKey)) return;
        addUniquePerson(investigadoresById, person);
      });
    });

    const orientadores = Array.from(orientadoresById.values());
    const coorientadores = Array.from(coorientadoresById.values());
    const investigadores = Array.from(investigadoresById.values());

    const clubDiaryCount = diaryEntries.filter(
      (entry) => normalizeId(entry?.clube_id) === clubId || clubProjects.some((p) => normalizeId(p?.id) === normalizeId(entry?.projeto_id))
    ).length;

    setModalClubData({
      club, school, projects: clubProjects, users: clubUsers, orientadores, coorientadores, investigadores, diaryCount: clubDiaryCount,
    });
    setIsClubModalOpen(true);
  };

  const handleOpenClubBoard = (clubId) => {
    const normalizedClubId = String(clubId || "").trim();
    if (!normalizedClubId) return;
    setSelectedClubId(normalizedClubId);
    setViewingClubId(normalizedClubId);
    setCurrentView("clube");
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

            <div className="mt-8 w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-700 bg-white border-[3px] border-slate-900 rounded-full px-4 py-2 inline-flex items-center gap-2 w-fit">
                <MapPin className="w-4 h-4 stroke-[3]" />
                Exibindo: {isClubMode ? "Feed de Clubes" : "Feed de Projetos"}
              </p>

              <div className="inline-flex items-center rounded-[1.5rem] border-[3px] border-slate-900 bg-white p-1.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setFeedMode("projects")}
                  className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
                    !isClubMode ? "bg-pink-400 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Ver projetos
                </button>
                <button
                  type="button"
                  onClick={() => setFeedMode("clubs")}
                  className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
                    isClubMode ? "bg-cyan-300 text-slate-900" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Ver clubes
                </button>
              </div>
            </div>
          </div>
          {/* Rabicho do Header Principal */}
        </div>

        {/* FEED DE PROJETOS */}
        <div
          className="grid grid-cols-1 gap-10"
          role="feed"
          aria-busy={!isClubMode && isFetchingProjects}
          aria-label={isClubMode ? "Lista de clubes de inovacao" : "Lista de projetos de inovacao"}
        >
          {!isClubMode && isFetchingProjects && !isInitialLoading && (
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

          {showProjectSkeletons && (
            <>
              {[...Array(3)].map((_, i) => (
                <ProjectCardSkeleton key={`skeleton-${i}`} />
              ))}
            </>
          )}

          {!isClubMode && !showProjectSkeletons &&
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
                      loggedUserId={loggedUserId}
                      onLikeClick={handleProjectLike}
                      isLikeSubmitting={pendingLikeProjectIds.has(String(project?.id || '').trim())}
                      allProjects={feedProjects}
                      allUsers={users}
                      onClubClick={() => handleOpenClubModal(club, school)}
                      onDiaryClick={() => {
                        const resolvedClubId = String(club?.id || project?.clube_id || "").trim();
                        if (resolvedClubId) setSelectedClubId(resolvedClubId);
                        setSelectedProjectId(String(project.id || '').trim());
                        setCurrentView("diario");
                      }}
                    />
                  </div>
                );
              }
            )}

          {isClubMode &&
             renderedClubs.map(({ club, school, schoolName, schoolSec, schoolInep, clubBannerUrl, clubLogoUrl, memberCount, mentorCount, projectsCount }, index) => (
               <article
                 key={String(club?.id || index)}
                 className="bg-white rounded-[2.5rem] border-[3px] border-slate-900 overflow-hidden shadow-lg hover:shadow-2xl transition-all"
               >
                 <div className="relative h-52 overflow-hidden bg-slate-200 border-b-[3px] border-slate-900">
                   {clubBannerUrl ? (
                     <img
                       src={clubBannerUrl}
                       alt={`Banner do clube ${club?.nome || ''}`}
                       className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                     />
                   ) : (
                     <div className="absolute inset-0 bg-gradient-to-r from-cyan-300 via-sky-200 to-pink-200" />
                   )}
                   <div className="absolute inset-0 bg-slate-950/20" />
                   <div className="absolute left-6 top-6 flex items-center gap-3 rounded-full border-[3px] border-white bg-white/90 px-4 py-2 shadow-sm">
                     <div className="h-12 w-12 rounded-2xl overflow-hidden border-[3px] border-slate-900 bg-white flex items-center justify-center">
                       {clubLogoUrl ? (
                         <img src={clubLogoUrl} alt={`Logo do clube ${club?.nome || ''}`} className="h-full w-full object-cover" />
                       ) : (
                         <span className="text-lg font-black text-slate-900">{club?.nome?.charAt(0) || 'C'}</span>
                       )}
                     </div>
                     <div>
                       <p className="text-xs font-black uppercase tracking-widest text-slate-900">Identidade do clube</p>
                       <p className="text-sm font-black uppercase tracking-tight text-slate-900 line-clamp-1">{club?.nome || 'Clube sem nome'}</p>
                     </div>
                   </div>
                 </div>
                 <div className="p-6 md:p-8">
                   <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                     <div className="min-w-0 flex-1">
                       <div className="inline-flex items-center gap-2 rounded-full border-[3px] border-slate-900 bg-cyan-300 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-900">
                         <Building2 className="w-4 h-4 stroke-[3]" /> Clube
                       </div>
                       <p className="mt-3 text-sm font-bold text-slate-700 line-clamp-2">
                         {String(club?.descricao || "").trim() || "Clube da rede de inovacao com atividades de pesquisa, desenvolvimento e colaboracao escolar."}
                       </p>

                       <div className="mt-5 flex flex-wrap items-center gap-2">
                         <span className="inline-flex items-center gap-2 rounded-full border-[3px] border-slate-900 bg-yellow-300 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-900">
                           <School className="w-4 h-4 stroke-[3]" /> {schoolName}     <span className="inline-flex items-center rounded-full border-[3px] border-slate-900 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700">
                           INEP: {schoolInep || "Nao informado"}
                         </span>
                         </span>
                     
                       </div>
                     </div>

                     <div className="grid grid-cols-3 gap-3 lg:w-[340px]">
                       <div className="rounded-2xl border-[3px] border-slate-900 bg-pink-400 p-3 text-center">
                         <p className="text-2xl font-black text-white leading-none">{projectsCount}</p>
                         <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white">Projetos</p>
                       </div>
                       <div className="rounded-2xl border-[3px] border-slate-900 bg-lime-300 p-3 text-center">
                         <p className="text-2xl font-black text-slate-900 leading-none">{memberCount}</p>
                         <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-900">Membros</p>
                       </div>
                       <div className="rounded-2xl border-[3px] border-slate-900 bg-cyan-300 p-3 text-center">
                         <p className="text-2xl font-black text-slate-900 leading-none">{mentorCount}</p>
                         <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-900">Mentores</p>
                       </div>
                     </div>
                   </div>

                   <div className="mt-6 flex flex-wrap gap-3">
                     <button
                       type="button"
                       onClick={() => handleOpenClubModal(club, school)}
                       className="rounded-full border-[3px] border-slate-900 bg-cyan-300 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-900 shadow-sm hover:scale-105 active:scale-95 transition-transform"
                     >
                       Ver vitrine do clube
                     </button>
                   </div>
                 </div>
              </article>
            ))}

          {showEmptyState && (
            <div className="relative">
              <div className="bg-white rounded-[3rem] border-[3px] border-slate-900 p-16 text-center shadow-md relative z-10">
                <EmptyState
                  icon={isClubMode ? School : (isSearchActive ? AlertCircle : FolderKanban)}
                  title={
                    isClubMode
                      ? (isSearchActive ? "Nenhum clube encontrado" : "Ainda nao ha clubes")
                      : (isSearchActive ? "Nenhum projeto encontrado" : "Ainda nao ha projetos")
                  }
                  description={
                    isClubMode
                      ? (isSearchActive
                        ? `Nenhum clube corresponde a busca "${searchTerm.trim()}". Tente nome da escola, SEC ou INEP.`
                        : "Nenhum clube foi encontrado para exibicao no feed neste momento.")
                      : (isSearchActive
                        ? `Nenhum projeto corresponde a busca "${searchTerm.trim()}". Tente outro termo ou remova o filtro.`
                        : "Nenhum projeto foi publicado na rede ainda. Volte mais tarde ou adicione o primeiro projeto.")
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
          {!isClubMode && isFetchingProjects && !isInitialLoading && (
            <div className="relative">
              <div className="flex items-center gap-3 text-sm text-slate-700 font-bold bg-yellow-300 border-[3px] border-slate-900 px-6 py-3 rounded-full shadow-sm z-10 relative">
                <LoaderCircle className="w-5 h-5 animate-spin text-slate-900" />
                <span>Carregando mais projetos...</span>
              </div>
              <ThoughtBubbles className="-bottom-6 left-1/4" fill="#fde047" /> {/* amarelho-300 */}
            </div>
          )}

          {!isClubMode && showLoadMoreSentinel && (
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

          {!isClubMode && showNoMoreProjects && !isNoResults && (
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