import React, { useMemo, useState } from 'react';
import { User, Map as MapIcon, FolderKanban, Users, BookOpen, Microscope, ExternalLink, Target, GraduationCap, PlusCircle, Sparkles, Zap, Building2, Pencil, Clock3, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import EmptyState from '../shared/EmptyState';
import CreateProjectForm from './CreateProjectForm';
import CreateClubForm from './CreateClubForm';
import EditClubForm from './EditClubForm';
import ModalPerfil from './ModalPerfil'; 
import { getInitials, getLattesAreas, getLattesLink, getLattesSummary } from '../../utils/helpers';

export default function ClubBoard({
    viewingClub,
    viewingClubSchool,
    viewingClubProjects,
    viewingClubUsers,
    viewingClubOrientadores,
    viewingClubCoorientadores,
    viewingClubInvestigadores,
    viewingClubDiaryCount,
    hasNoClubMembership = false,
    schoolClubDiscoveryList = [],
    latestMyClubJoinRequestByClubId = new Map(),
    requestingClubIds = new Set(),
    handleRequestClubEntry = async () => {},
    clubJoinRequests = [],
    reviewingClubRequestIds = new Set(),
    handleRespondClubEntryRequest = async () => {},
    mentorManagedClubs = [],
    setViewingClubId = () => {},
    setSelectedClubId,
    setSelectedProjectId,
    setCurrentView,
    handleCreateProject,
    handleUpdateProject = async () => {},
    handleDeleteProject = async () => {},
    loggedUser,
    schools,
    users,
    handleCreateClub,
    creatingClub,
    handleUpdateClub,
    updatingClub
}) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCreateClubOpen, setIsCreateClubOpen] = useState(false);
    const [isEditClubOpen, setIsEditClubOpen] = useState(false);
    
    // Estados do Modal
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [membershipRequestFeedback, setMembershipRequestFeedback] = useState({ type: '', message: '' });
    const [deletingProjectIds, setDeletingProjectIds] = useState(new Set());
    const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
    const [projectBeingEdited, setProjectBeingEdited] = useState(null);
    const isMentor = ['orientador', 'coorientador'].includes(String(loggedUser?.perfil || '').trim().toLowerCase());
    const loggedUserId = String(loggedUser?.id || loggedUser?.uid || '').trim();
    const loggedUserEmail = String(loggedUser?.email || '').toLowerCase().trim();
    const loggedUserMatricula = String(loggedUser?.matricula || loggedUser?.['matrícula'] || '').trim();
    const mentorIds = new Set([
        String(viewingClub?.mentor_id || '').trim(),
        ...(viewingClub?.orientador_ids || []).map((id) => String(id || '').trim()),
        ...(viewingClub?.coorientador_ids || []).map((id) => String(id || '').trim())
    ].filter(Boolean));
    const canManageClub = isMentor && loggedUserId && mentorIds.has(loggedUserId);
    const clubBannerUrl = String(viewingClub?.banner_url || viewingClub?.banner || '').trim();
    const clubLogoUrl = String(viewingClub?.logo_url || viewingClub?.logo || '').trim();
    const shouldShowSchoolClubDiscovery = !isMentor && hasNoClubMembership;
    const managedClubs = useMemo(
        () => (mentorManagedClubs || []).filter((club) => String(club?.id || '').trim()),
        [mentorManagedClubs]
    );
    const canSwitchManagedClubs = isMentor && managedClubs.length > 1;

    const usersById = useMemo(() => {
        const map = new Map();
        (users || []).forEach((person) => {
            const personId = String(person?.id || '').trim();
            if (!personId) return;
            map.set(personId, person);
        });
        return map;
    }, [users]);

    const formatRequestDate = (dateValue) => {
        if (!dateValue) return '';

        const date = typeof dateValue?.toDate === 'function'
            ? dateValue.toDate()
            : new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return '';
        }

        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const resolveMentorNames = (club) => {
        const clubMentorIds = [
            String(club?.mentor_id || '').trim(),
            ...(club?.orientador_ids || []).map((id) => String(id || '').trim()),
            ...(club?.coorientador_ids || []).map((id) => String(id || '').trim())
        ].filter(Boolean);

        const mentorNames = [...new Set(clubMentorIds)]
            .map((id) => String(usersById.get(id)?.nome || '').trim())
            .filter(Boolean);

        return mentorNames.length > 0 ? mentorNames.join(', ') : 'Mentor nao informado';
    };

    const getLatestMembershipRequest = (clubId) => {
        if (latestMyClubJoinRequestByClubId instanceof Map) {
            return latestMyClubJoinRequestByClubId.get(String(clubId || '').trim()) || null;
        }
        return null;
    };

    const flattenProjectReferenceValues = (value) => {
        if (value === undefined || value === null) return [];

        if (Array.isArray(value)) {
            return value.flatMap(flattenProjectReferenceValues);
        }

        if (typeof value === 'object') {
            return [
                value.id,
                value.uid,
                value.email,
                value.matricula,
                value['matrícula']
            ].flatMap(flattenProjectReferenceValues);
        }

        return String(value)
            .split(/[,;\n]+/)
            .map((item) => item.trim())
            .filter(Boolean);
    };

    const canMentorDeleteProject = (project) => {
        if (!isMentor || !loggedUserId || !project) {
            return false;
        }

        const projectMentorReferences = new Set(
            [
                project?.mentor_id,
                project?.orientador_id,
                project?.coorientador_id,
                project?.autor_id,
                project?.author_id,
                project?.created_by,
                project?.createdBy,
                project?.criador_id,
                project?.creator_id,
                project?.owner_id,
                project?.orientador_ids,
                project?.orientadores_ids,
                project?.coorientador_ids,
                project?.coorientadores_ids
            ]
                .flatMap(flattenProjectReferenceValues)
                .map((value) => String(value || '').toLowerCase().trim())
                .filter(Boolean)
        );

        return (
            projectMentorReferences.has(loggedUserId.toLowerCase())
            || (loggedUserEmail && projectMentorReferences.has(loggedUserEmail))
            || (loggedUserMatricula && projectMentorReferences.has(loggedUserMatricula.toLowerCase()))
        );
    };

    const handleStudentJoinRequest = async (clubId) => {
        if (!clubId) return;

        setMembershipRequestFeedback({ type: '', message: '' });

        try {
            await handleRequestClubEntry(clubId);
            setMembershipRequestFeedback({ type: 'success', message: 'Solicitacao enviada para o mentor.' });
        } catch (error) {
            const message = String(error?.message || '').trim() || 'Falha ao enviar solicitacao.';
            setMembershipRequestFeedback({ type: 'error', message });
        }
    };

    const handleMentorDecision = async (requestId, accept) => {
        if (!requestId) return;

        setMembershipRequestFeedback({ type: '', message: '' });

        try {
            await handleRespondClubEntryRequest(requestId, accept);
            setMembershipRequestFeedback({
                type: 'success',
                message: accept ? 'Clubista aprovado e vinculado ao clube.' : 'Solicitacao recusada com sucesso.'
            });
        } catch (error) {
            const message = String(error?.message || '').trim() || 'Falha ao processar solicitacao.';
            setMembershipRequestFeedback({ type: 'error', message });
        }
    };

    const handleDeleteProjectClick = async (project) => {
        const projectId = String(project?.id || '').trim();
        if (!projectId || !canMentorDeleteProject(project)) return;

        const projectTitle = String(project?.titulo || 'este projeto').trim();
        const shouldDelete = window.confirm(`Deseja apagar "${projectTitle}"? Essa acao nao pode ser desfeita.`);
        if (!shouldDelete) return;

        setDeletingProjectIds((previous) => {
            const next = new Set(previous);
            next.add(projectId);
            return next;
        });

        try {
            await handleDeleteProject(projectId);
            setMembershipRequestFeedback({ type: 'success', message: 'Projeto apagado com sucesso.' });
        } catch (error) {
            const message = String(error?.message || '').trim() || 'Falha ao apagar o projeto.';
            setMembershipRequestFeedback({ type: 'error', message });
        } finally {
            setDeletingProjectIds((previous) => {
                const next = new Set(previous);
                next.delete(projectId);
                return next;
            });
        }
    };

    const handleEditProjectClick = (project) => {
        const projectId = String(project?.id || '').trim();
        if (!projectId || !canMentorDeleteProject(project)) return;

        setProjectBeingEdited(project);
        setIsEditProjectOpen(true);
        setIsCreateOpen(false);
    };

    const handleCloseEditProject = () => {
        setIsEditProjectOpen(false);
        setProjectBeingEdited(null);
    };

    const handleSelectManagedClub = (clubId) => {
        const normalizedClubId = String(clubId || '').trim();
        if (!normalizedClubId) return;

        setViewingClubId(normalizedClubId);
        setSelectedClubId(normalizedClubId);
        setCurrentView('clube');
        setIsCreateOpen(false);
        setIsEditClubOpen(false);
    };

    // Função de clique para abrir o Modal
    const handleUserClick = (e, user) => {
        e.stopPropagation();
        e.preventDefault();

        const enrichedUser = {
            ...user,
            clube: user.clube || viewingClub?.nome || user.clube_nome || '',
            projetosCount: user.projetosCount ?? user.projetos?.length ?? user.projetos_ids?.length ?? user.projetosIds?.length ?? 0
        };

        setSelectedUser(enrichedUser);
        setIsProfileModalOpen(true);
    };

    if (!viewingClub) {
        if (shouldShowSchoolClubDiscovery) {
            return (
                <div className="space-y-8 p-4 md:p-6 lg:p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-inner">
                    <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm p-6 md:p-8">
                        <div className="absolute -top-14 -right-14 w-56 h-56 bg-[#10B981]/15 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-[#FF5722]/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10">
                            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Clubes da sua unidade escolar</h2>
                            <p className="text-slate-600 mt-2 max-w-2xl">
                                Explore os clubes disponiveis, veja identidade visual, equipe e estrutura de cada um para solicitar sua entrada.
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">
                                    <Building2 className="w-3.5 h-3.5 text-[#10B981]" />
                                    {schoolClubDiscoveryList.length} clube{schoolClubDiscoveryList.length === 1 ? '' : 's'} encontrado{schoolClubDiscoveryList.length === 1 ? '' : 's'}
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">
                                    <MapIcon className="w-3.5 h-3.5 text-slate-500" />
                                    {String(loggedUser?.escola_nome || '').trim() || 'Unidade escolar vinculada'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {membershipRequestFeedback.message && (
                        <div
                            className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                                membershipRequestFeedback.type === 'error'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                        >
                            {membershipRequestFeedback.message}
                        </div>
                    )}

                    {schoolClubDiscoveryList.length === 0 ? (
                        <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center shadow-sm">
                            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-700 font-bold text-lg">Nenhum clube disponivel no momento</p>
                            <p className="text-slate-500 mt-2">Assim que um clube da sua unidade estiver ativo, ele aparecera aqui para solicitacao.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {schoolClubDiscoveryList.map((club, index) => {
                                const clubId = String(club?.id || '').trim();
                                const latestRequest = getLatestMembershipRequest(clubId);
                                const requestStatus = String(latestRequest?.status || '').trim().toLowerCase();
                                const isPending = requestStatus === 'pendente';
                                const isRejected = requestStatus === 'recusada';
                                const isAccepted = requestStatus === 'aceita';
                                const isRequesting = requestingClubIds instanceof Set && requestingClubIds.has(clubId);

                                const statusConfig = isPending
                                    ? {
                                        icon: Clock3,
                                        label: 'Solicitacao pendente',
                                        classes: 'bg-amber-50 text-amber-700 border-amber-200'
                                    }
                                    : isRejected
                                        ? {
                                            icon: XCircle,
                                            label: 'Solicitacao recusada',
                                            classes: 'bg-red-50 text-red-700 border-red-200'
                                        }
                                        : isAccepted
                                            ? {
                                                icon: CheckCircle2,
                                                label: 'Solicitacao aceita',
                                                classes: 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            }
                                            : null;

                                const StatusIcon = statusConfig?.icon || null;
                                const bannerUrl = String(club?.banner_url || club?.banner || '').trim();
                                const logoUrl = String(club?.logo_url || club?.logo || '').trim();
                                const fallbackBackgrounds = ['/images/BG_1.png', '/images/BG_2.png', '/images/BG_3.png'];
                                const displayBanner = bannerUrl || fallbackBackgrounds[index % fallbackBackgrounds.length];
                                const isFallbackBanner = !bannerUrl;

                                const memberCount = new Set([
                                    ...(club?.membros_ids || []),
                                    ...(club?.clubistas_ids || []),
                                    ...(club?.orientador_ids || []),
                                    ...(club?.coorientador_ids || []),
                                    club?.mentor_id
                                ].map((value) => String(value || '').trim()).filter(Boolean)).size;

                                const mentorCount = new Set([
                                    club?.mentor_id,
                                    ...(club?.orientador_ids || []),
                                    ...(club?.coorientador_ids || [])
                                ].map((value) => String(value || '').trim()).filter(Boolean)).size;

                                const clubistasCount = new Set(
                                    (club?.clubistas_ids || []).map((value) => String(value || '').trim()).filter(Boolean)
                                ).size;

                                const projectsCount = Number(
                                    club?.projetosCount
                                    ?? club?.projetos?.length
                                    ?? club?.projetos_ids?.length
                                    ?? 0
                                );

                                return (
                                    <article key={clubId} className="group bg-white border border-slate-100 hover:border-[#10B981]/30 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                                        <div className="relative h-44 overflow-hidden">
                                            <img
                                                src={displayBanner}
                                                alt={`Banner do clube ${club?.nome || ''}`}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/10 via-slate-900/20 to-slate-900/60" />

                                            {isFallbackBanner && (
                                                <span className="absolute top-3 right-3 text-[10px] font-bold text-white bg-black/60 rounded-full px-2 py-1">
                                                    Banner ilustrativo
                                                </span>
                                            )}

                                            {statusConfig && (
                                                <div className={`absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold bg-white/90 backdrop-blur-sm ${statusConfig.classes}`}>
                                                    {StatusIcon && <StatusIcon className="w-3.5 h-3.5" />}
                                                    {statusConfig.label}
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-6">
                                            <div className="flex items-start gap-3">
                                                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-slate-100 shrink-0 -mt-12 relative z-10">
                                                    {logoUrl ? (
                                                        <img src={logoUrl} alt={`Logo do clube ${club?.nome || ''}`} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-sm font-black text-slate-600">
                                                            {getInitials(club?.nome || '')}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-xl font-black text-slate-900 truncate">{club?.nome || 'Clube sem nome'}</h3>
                                                    <p className="text-sm text-slate-600 truncate">
                                                        {club?.escola_nome || club?.escola_id || 'Unidade nao informada'}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                        Mentor: {resolveMentorNames(club)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-4 grid grid-cols-4 gap-2">
                                                <div className="rounded-xl bg-slate-50 border border-slate-100 p-2 text-center">
                                                    <p className="text-lg font-black text-slate-900">{memberCount}</p>
                                                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Membros</p>
                                                </div>
                                                <div className="rounded-xl bg-slate-50 border border-slate-100 p-2 text-center">
                                                    <p className="text-lg font-black text-slate-900">{clubistasCount}</p>
                                                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Clubistas</p>
                                                </div>
                                                <div className="rounded-xl bg-slate-50 border border-slate-100 p-2 text-center">
                                                    <p className="text-lg font-black text-slate-900">{mentorCount}</p>
                                                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Mentores</p>
                                                </div>
                                                <div className="rounded-xl bg-slate-50 border border-slate-100 p-2 text-center">
                                                    <p className="text-lg font-black text-slate-900">{projectsCount}</p>
                                                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Projetos</p>
                                                </div>
                                            </div>

                                            <p className="mt-4 text-sm text-slate-600 line-clamp-2">
                                                {String(club?.descricao || '').trim() || 'Clube ativo na unidade escolar com foco em pesquisa, inovacao e formacao cientifica.'}
                                            </p>

                                            <button
                                                type="button"
                                                onClick={() => handleStudentJoinRequest(clubId)}
                                                disabled={isPending || isAccepted || isRequesting}
                                                className="mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-bold bg-[#10B981] text-white hover:bg-[#059669] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                {isRequesting
                                                    ? 'Enviando solicitacao...'
                                                    : isPending
                                                        ? 'Aguardando resposta do mentor'
                                                        : isAccepted
                                                            ? 'Solicitacao aceita'
                                                            : isRejected
                                                                ? 'Solicitar novamente'
                                                                : 'Solicitar entrada'}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="min-h-[60vh] flex items-center justify-center p-10 bg-slate-50 rounded-[3rem] border border-slate-100 relative overflow-hidden shadow-inner">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#10B981]/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FF5722]/5 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="relative z-10 bg-white/50 backdrop-blur-xl p-12 rounded-[2rem] border border-white/80 shadow-lg text-center">
                    <Building2 className="w-16 h-16 text-[#10B981] mx-auto mb-6 opacity-80" />
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">Selecione um Ecossistema</h2>
                    <p className="text-slate-600 max-w-md mx-auto">Navegue pelo Feed de Inovacao e clique no icone da escola em um projeto para revelar o universo de colaboracao do clube.</p>
                    {isMentor && (
                        <button
                            type="button"
                            onClick={() => setIsCreateClubOpen(true)}
                            className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-bold text-sm hover:scale-[1.02] transition-transform shadow-lg shadow-[#10B981]/30"
                        >
                            <PlusCircle className="w-4 h-4" />
                            Criar Clube na Unidade Escolar
                        </button>
                    )}
                </div>

                <CreateClubForm
                    isOpen={isCreateClubOpen}
                    onClose={() => setIsCreateClubOpen(false)}
                    loggedUser={loggedUser}
                    schools={schools}
                    users={users}
                    isSubmitting={creatingClub}
                    onSubmit={handleCreateClub}
                />
            </div>
        );
    }

    const investigatorCount = viewingClubInvestigadores.length;
    const memberCount = viewingClubUsers.length;
    const investigatorRatio = memberCount ? Math.round((investigatorCount / memberCount) * 100) : 0;
    const hasClubBannerBackground = Boolean(clubBannerUrl);
    const clubWrapperStyle = useMemo(() => {
        const bannerBackdrop = hasClubBannerBackground
            ? `linear-gradient(130deg, rgba(16,185,129,0.62) 0%, rgba(6,182,212,0.46) 45%, rgba(15,23,42,0.6) 100%), url("${clubBannerUrl}")`
            : "linear-gradient(120deg, rgba(236,253,245,1) 0%, rgba(240,249,255,1) 48%, rgba(249,250,251,1) 100%)";

        return {
            backgroundImage: bannerBackdrop,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: hasClubBannerBackground ? "fixed" : "scroll",
            backgroundRepeat: "no-repeat"
        };
    }, [clubBannerUrl, hasClubBannerBackground]);
    const clubOverlayColor = hasClubBannerBackground
        ? "rgba(255,255,255,0.76)"
        : "rgba(255,255,255,0.9)";

    return (
        <>
            <style>{`
                .club-pattern-grid {
                    background-image:
                        linear-gradient(30deg, rgba(255,255,255,0.2) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.2) 87.5%, rgba(255,255,255,0.2)),
                        linear-gradient(150deg, rgba(255,255,255,0.2) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.2) 87.5%, rgba(255,255,255,0.2)),
                        linear-gradient(30deg, rgba(255,255,255,0.2) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.2) 87.5%, rgba(255,255,255,0.2)),
                        linear-gradient(150deg, rgba(255,255,255,0.2) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.2) 87.5%, rgba(255,255,255,0.2)),
                        linear-gradient(60deg, rgba(241,245,249,0.24) 25%, transparent 25.5%, transparent 75%, rgba(241,245,249,0.24) 75%, rgba(241,245,249,0.24)),
                        linear-gradient(60deg, rgba(241,245,249,0.24) 25%, transparent 25.5%, transparent 75%, rgba(241,245,249,0.24) 75%, rgba(241,245,249,0.24));
                    background-size: 80px 140px;
                    background-position: 0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px;
                    animation: panClubCubes 60s linear infinite;
                }
                @keyframes panClubCubes {
                    0% { background-position: 0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px; }
                    100% { background-position: 80px 140px, 80px 140px, 120px 210px, 120px 210px, 80px 140px, 120px 210px; }
                }
            `}</style>
            <div
                className="min-h-screen w-full club-pattern-grid relative overflow-x-hidden"
                style={clubWrapperStyle}
            >
                <div
                    className="fixed inset-0 pointer-events-none z-0"
                    style={{ backgroundColor: clubOverlayColor }}
                ></div>
                <div className="space-y-8 mx-auto pb-20 font-sans p-3 md:p-6 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 text-slate-800 relative overflow-hidden z-10">
             
            <div className="relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-100 group min-h-[320px] flex flex-col justify-end p-8 md:p-12 shadow-sm">
                <div className="absolute inset-0 pointer-events-none">
                    {clubBannerUrl ? (
                        <img
                            src={clubBannerUrl}
                            alt={`Banner do clube ${viewingClub.nome}`}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <>
                            <div className="absolute -top-10 -right-10 w-96 h-96 bg-[#10B981]/20 rounded-full blur-[80px] group-hover:bg-[#10B981]/30 transition-colors duration-700" />
                            <div className="absolute bottom-10 left-20 w-64 h-64 bg-[#FF5722]/20 rounded-full blur-[60px]" />
                            <div className="absolute inset-0 mix-blend-multiply" style={{ backgroundImage: "url('/clubeBG.svg')", backgroundSize: 'cover' }} />
                        </>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-950/35 via-slate-900/25 to-slate-950/75" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row gap-8 justify-between items-end">
                    <div className="max-w-3xl flex-1 flex items-end gap-5">
                        <div className="w-24 h-24 md:w-28 md:h-28 rounded-3xl border-4 border-white/95 shadow-2xl bg-white/90 backdrop-blur-sm overflow-hidden flex items-center justify-center shrink-0">
                            {clubLogoUrl ? (
                                <img
                                    src={clubLogoUrl}
                                    alt={`Logo do clube ${viewingClub.nome}`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-2xl md:text-3xl font-black text-slate-700">
                                    {getInitials(viewingClub.nome)}
                                </span>
                            )}
                        </div>

                        <div>
                            <h1 className="text-4xl md:text-6xl text-white tracking-tighter mb-4 leading-tight drop-shadow-lg">
                                {viewingClub.nome}
                            </h1>

                            <p className="text-white font-medium text-base md:text-lg flex items-center gap-2.5 drop-shadow">
                                <MapIcon className="w-5 h-5 text-[#6EE7B7]" /> {viewingClubSchool?.nome || 'Escola não vinculada'}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                                <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold text-white border border-white/20">
                                    <Microscope className="w-4 h-4 text-[#FFD1BF]" />
                                    Clubistas:
                                    <strong className="font-black">{investigatorCount} pesquisador{investigatorCount === 1 ? '' : 'es'}</strong>
                                </span>
                                <span className="text-xs font-bold text-white bg-[#10B981]/35 backdrop-blur-sm px-2 py-1 rounded-full border border-[#6EE7B7]/30">
                                    {investigatorRatio}% da equipe
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
                        {canManageClub && (
                            <button
                                type="button"
                                onClick={() => setIsEditClubOpen(true)}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-sm transition-all border border-white/30"
                            >
                                <Pencil className="w-4 h-4" />
                                Editar Clube
                            </button>
                        )}

                        {isMentor && (
                            <button
                                type="button"
                                onClick={() => setIsCreateClubOpen(true)}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white font-bold text-sm transition-all border border-white/30"
                            >
                                <PlusCircle className="w-4 h-4" />
                                Criar Clube
                            </button>
                        )}

                        <button onClick={() => setIsCreateOpen(!isCreateOpen)} className="group relative inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-full bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-bold text-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#10B981]/30">
                            <Zap className={`w-5 h-5 transition-transform ${isCreateOpen ? 'rotate-45 text-amber-200' : 'text-white'}`} />
                            {isCreateOpen ? 'Cancelar Criação' : 'Iniciar Novo Projeto'}
                        </button>
                    </div>
                </div>
            </div>

            {isCreateOpen && (
                <CreateProjectForm
                    isOpen={isCreateOpen}
                    onClose={() => setIsCreateOpen(false)}
                    viewingClub={viewingClub}
                    loggedUser={loggedUser}
                    users={users}
                    viewingClubOrientadores={viewingClubOrientadores}
                    viewingClubCoorientadores={viewingClubCoorientadores}
                    viewingClubInvestigadores={viewingClubInvestigadores}
                    handleCreateProject={handleCreateProject}
                    onSuccess={() => {

                    }}
                />
            )}

            {membershipRequestFeedback.message && (
                <div
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                        membershipRequestFeedback.type === 'error'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                >
                    {membershipRequestFeedback.message}
                </div>
            )}

            {canSwitchManagedClubs && (
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <h3 className="text-lg font-bold text-slate-900">Clubes que voce administra</h3>
                        <span className="inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-700 text-xs font-black px-3 py-1">
                            {managedClubs.length}
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {managedClubs.map((club) => {
                            const clubId = String(club?.id || '').trim();
                            const isActive = String(viewingClub?.id || '').trim() === clubId;
                            const clubLogo = String(club?.logo_url || club?.logo || '').trim();

                            return (
                                <button
                                    key={clubId}
                                    type="button"
                                    onClick={() => handleSelectManagedClub(clubId)}
                                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 border text-sm font-bold transition-colors ${
                                        isActive
                                            ? 'bg-[#ECFDF5] text-[#065f46] border-[#10B981]/40'
                                            : 'bg-white text-slate-700 border-slate-200 hover:border-[#10B981]/40 hover:bg-slate-50'
                                    }`}
                                >
                                    <span className="w-7 h-7 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0">
                                        {clubLogo ? (
                                            <img src={clubLogo} alt={`Logo do clube ${club?.nome || ''}`} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-[10px] font-black text-slate-600">{getInitials(club?.nome || '')}</span>
                                        )}
                                    </span>
                                    <span>{club?.nome || 'Clube'}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {canManageClub && (
                <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-7 shadow-sm">
                    <div className="flex items-center justify-between gap-4 mb-5">
                        <h3 className="text-xl font-bold text-slate-900">Solicitacoes de entrada de clubistas</h3>
                        <span className="inline-flex items-center justify-center rounded-full bg-[#ECFDF5] text-[#065f46] text-xs font-black px-3 py-1">
                            {clubJoinRequests.length}
                        </span>
                    </div>

                    {clubJoinRequests.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                            Nenhuma solicitacao pendente neste clube.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {clubJoinRequests.map((request) => {
                                const requestId = String(request?.id || '').trim();
                                const requesterName = String(request?.solicitante_nome || 'Estudante').trim();
                                const requesterEmail = String(request?.solicitante_email || '').trim();
                                const requestDate = formatRequestDate(request?.createdAt);
                                const isReviewing = reviewingClubRequestIds instanceof Set
                                    && reviewingClubRequestIds.has(requestId);

                                return (
                                    <div key={requestId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            <div>
                                                <p className="font-bold text-slate-900">{requesterName}</p>
                                                {requesterEmail && <p className="text-sm text-slate-600">{requesterEmail}</p>}
                                                {requestDate && <p className="text-xs text-slate-500 mt-1">Solicitado em {requestDate}</p>}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleMentorDecision(requestId, false)}
                                                    disabled={isReviewing}
                                                    className="rounded-xl px-4 py-2 text-sm font-bold border border-red-200 text-red-700 bg-white hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                                >
                                                    Recusar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleMentorDecision(requestId, true)}
                                                    disabled={isReviewing}
                                                    className="rounded-xl px-4 py-2 text-sm font-bold text-white bg-[#10B981] hover:bg-[#059669] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                                >
                                                    {isReviewing ? 'Processando...' : 'Aceitar'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
                
                <div className="md:col-span-4 grid grid-cols-2 gap-4">
                    {[
                        { icon: FolderKanban, count: viewingClubProjects.length, label: "Projetos", color: "text-[#10B981]", bg: "bg-[#ECFDF5]", border: "border-[#10B981]/20" },
                        { icon: Users, count: viewingClubUsers.length, label: "Membros", color: "text-[#FF5722]", bg: "bg-[#FFF3E0]", border: "border-[#FF5722]/20" },
                        { icon: BookOpen, count: viewingClubDiaryCount, label: "Registros", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
                        { icon: Target, count: viewingClubOrientadores.length + viewingClubCoorientadores.length, label: "Mentores", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white border border-slate-100 rounded-3xl p-6 flex flex-col justify-between hover:border-[#10B981]/30 hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300 group">
                            <div>
                                <h4 className="text-4xl font-black text-slate-950 tracking-tight group-hover:text-[#10B981] transition-colors">{stat.count}</h4>
                                <p className="text-[11px] font-extrabold tracking-widest uppercase text-slate-500 mt-1.5">{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="md:col-span-4 bg-white border border-slate-100 rounded-3xl p-7 relative overflow-hidden hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300">
                    <h3 className="text-xl font-bold text-slate-900 mb-7 flex items-center gap-3 relative z-10"><GraduationCap className="w-6 h-6 text-[#10B981]" /> Mentores</h3>
                    
                    <div className="space-y-4 relative z-10 overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: "230px" }}>
                        {[...viewingClubOrientadores, ...viewingClubCoorientadores].length === 0 ? (
                            <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                                <User className="w-10 h-10 mx-auto mb-3 opacity-50"/>
                                <p className="text-sm">Sem mentores registrados.</p>
                            </div>
                        ) : (
                            [...viewingClubOrientadores, ...viewingClubCoorientadores].map((person) => {
                                const summary = getLattesSummary(person);
                                const areas = getLattesAreas(person);
                                return (
                                <div 
                                    key={person.id} 
                                    onClick={(e) => handleUserClick(e, person)}
                                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-[#10B981]/20 hover:shadow-sm transition-all group/item cursor-pointer"
                                >
                                    <div className="flex items-center justify-between gap-3.5">
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-11 h-11 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold border-2 border-white shadow-sm group-hover/item:bg-[#10B981] group-hover/item:text-white transition-colors">{getInitials(person.nome)}</div>
                                                <div>
                                                <p className="text-sm font-bold text-slate-900 leading-tight group-hover/item:text-[#10B981] transition-colors">{person.nome.split(' ').slice(0, 2).join(' ')}</p>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mt-0.5">{viewingClubOrientadores.includes(person) ? 'Mentor' : 'Co-Mentor'}</p>
                                            </div>
                                        </div>
                                        {getLattesLink(person) && (
                                            <a 
                                                href={getLattesLink(person)} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                onClick={(e) => e.stopPropagation()} 
                                                className="w-9 h-9 rounded-xl bg-[#ECFDF5] text-[#10B981] border border-[#10B981]/20 flex items-center justify-center hover:bg-[#10B981] hover:text-white transition-all shadow-sm" 
                                                title="Ver Lattes"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        )}
                                    </div>
                                    {summary && (
                                        <p className="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-2">{summary}</p>
                                    )}
                                    {areas.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {areas.map((area) => (
                                                <span key={area} className="rounded-full bg-[#ECFDF5] text-[#047857] px-2 py-1 text-[10px] font-semibold">
                                                    {area}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="md:col-span-4 bg-white border border-slate-100 rounded-3xl p-7 relative overflow-hidden hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-[#FF5722]/5 rounded-full blur-2xl pointer-events-none"></div>
                    
                    <h3 className="text-xl font-bold text-slate-900 mb-7 flex items-center gap-3 relative z-10"><Microscope className="w-6 h-6 text-[#FF5722]" /> Clubistas</h3>
                    <span className="absolute top-7 right-7 z-10 px-4 py-1.5 rounded-full bg-[#FFF3E0] text-[#FF5722] border border-[#FF5722]/20 text-xs font-black shadow-inner">{viewingClubInvestigadores.length}</span>

                    <div className="space-y-4 relative z-10 overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: "230px" }}>
                        {viewingClubInvestigadores.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                                <Users className="w-10 h-10 mx-auto mb-3 opacity-50"/>
                                <p className="text-sm">Nenhum estudante vinculado.</p>
                            </div>
                        ) : (
                            viewingClubInvestigadores.map((person) => (
                                <div 
                                    key={person.id} 
                                    onClick={(e) => handleUserClick(e, person)}
                                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-[#FF5722]/20 hover:shadow-sm transition-all group/item cursor-pointer"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-11 h-11 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold border-2 border-white shadow-sm group-hover/item:bg-[#FF5722] group-hover/item:text-white transition-colors">{getInitials(person.nome)}</div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 leading-tight group-hover/item:text-[#FF5722] transition-colors">{person.nome.split(' ').slice(0, 2).join(' ')}</p>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mt-0.5">Clubista</p>
                                        </div>
                                    </div>
                                    {getLattesLink(person) && (
                                        <a 
                                            href={getLattesLink(person)} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-9 h-9 rounded-xl bg-[#FFF3E0] text-[#FF5722] border border-[#FF5722]/20 flex items-center justify-center hover:bg-[#FF5722] hover:text-white transition-all shadow-sm" 
                                            title="Ver Lattes"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="pt-10 relative z-10">
                <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="h-8 w-2 bg-[#10B981] rounded-full shadow-inner"></div>
                        <h3 className="text-3xl font-black text-slate-950 tracking-tight">Projetos Ativos</h3>
                    </div>

                    {viewingClubProjects.length === 0 ? (
                        <div className="h-72 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center p-10 text-center hover:border-[#10B981]/30 transition-colors group">
                            <EmptyState icon={Sparkles} title="O Radar está Limpo" description="Nenhum projeto detectado neste ecossistema ainda. Que tal iniciar a primeira onda de inovação?" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Adicionado o parâmetro index aqui */}
                            {viewingClubProjects.map((project, index) => {
                                const projectId = String(project?.id || '').trim();
                                const isCompleted = project.status?.toLowerCase().includes('conclu');
                                const projectImage = project?.imagens?.[0] || project?.imagem || '';
                                const imageCount = Array.isArray(project?.imagens) ? project.imagens.length : (project?.imagem ? 1 : 0);
                                const canEditProject = canMentorDeleteProject(project);
                                const canDeleteProject = canMentorDeleteProject(project);
                                const isDeletingProject = deletingProjectIds.has(projectId);
                                const actionGridClass = canDeleteProject
                                    ? 'grid-cols-3'
                                    : (canEditProject ? 'grid-cols-2' : 'grid-cols-1');

                                // --- LÓGICA DE FALLBACK ---
                                const fallbackBackgrounds = ['/images/BG_1.png', '/images/BG_2.png', '/images/BG_3.png'];
                                const isFallbackImage = !projectImage;
                                const displayImage = isFallbackImage 
                                    ? fallbackBackgrounds[index % fallbackBackgrounds.length] 
                                    : projectImage;

                                return (
                                    <div key={project.id} className="group relative bg-white border border-slate-100 hover:border-[#10B981]/30 rounded-[2rem] overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-500/10 min-h-[420px]">
                                        <div className="h-44 sm:h-48 w-full bg-slate-100 overflow-hidden relative">
                                            
                                            {/* Renderização da imagem (padrão ou original) */}
                                            <img
                                                src={displayImage}
                                                alt={project.titulo || 'Imagem do projeto'}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                            
                                            {/* Tarja ilustrativa caso seja imagem padrão */}
                                            {isFallbackImage && (
                                                <div className="absolute bottom-3 left-3 bg-black/70 text-white text-[11px] sm:text-xs px-2 py-1 rounded-lg font-medium">
                                                    Projeto sem foto. Imagem ilustrativa.
                                                </div>
                                            )}

                                            {imageCount > 1 && (
                                                <span className="absolute top-2 right-2 px-2 py-1 rounded-full text-[11px] font-black bg-black/65 text-white">
                                                    {imageCount} fotos
                                                </span>
                                            )}
                                        </div>

                                        <div className="p-6 flex flex-col h-[calc(100%-12rem)]">
                                            <div className="flex justify-between items-start mb-4 gap-4">
                                                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-inner ${isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-[#ECFDF5] text-[#047857] border-[#10B981]/20'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isCompleted ? 'bg-emerald-500' : 'bg-[#10B981] animate-pulse'}`}></span>
                                                    {project.status || 'Em andamento'}
                                                </span>
                                            </div>

                                            <h4 className="font-extrabold text-xl text-slate-950 leading-tight mb-3 group-hover:text-[#10B981] transition-colors">{project.titulo || 'Projeto sem título'}</h4>

                                            <p className="text-sm text-slate-600 line-clamp-3 mb-8 flex-1 leading-relaxed">{project.descricao || project.introducao || 'Projeto aguardando documentação descritiva.'}</p>

                                            <div className="mt-auto pt-3 border-t border-slate-100">
                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                    {project.area_tematica ? (
                                                        <span className="text-[10px] font-extrabold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                                                            {project.area_tematica}
                                                        </span>
                                                    ) : ""}
                                                </div>

                                                <div className={`grid ${actionGridClass} gap-2`}>
                                                    <button
                                                        onClick={() => { setSelectedClubId(viewingClub.id); setSelectedProjectId(project.id); setCurrentView('diario'); }}
                                                        className="w-full text-center bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2 rounded-full font-bold text-sm transition-all duration-300 shadow-sm"
                                                    >
                                                        Acessar Diário
                                                    </button>

                                                    {canEditProject && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditProjectClick(project)}
                                                            className="w-full inline-flex items-center justify-center gap-2 bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 px-4 py-2 rounded-full font-bold text-sm transition-colors"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                            Editar
                                                        </button>
                                                    )}

                                                    {canDeleteProject && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteProjectClick(project)}
                                                            disabled={isDeletingProject}
                                                            className="w-full inline-flex items-center justify-center gap-2 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 px-4 py-2 rounded-full font-bold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            {isDeletingProject ? 'Apagando...' : 'Apagar'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <CreateClubForm
                isOpen={isCreateClubOpen}
                onClose={() => setIsCreateClubOpen(false)}
                loggedUser={loggedUser}
                schools={schools}
                users={users}
                isSubmitting={creatingClub}
                onSubmit={handleCreateClub}
            />

            <CreateProjectForm
                isOpen={isEditProjectOpen}
                onClose={handleCloseEditProject}
                viewingClub={viewingClub}
                loggedUser={loggedUser}
                users={users}
                viewingClubOrientadores={viewingClubOrientadores}
                viewingClubCoorientadores={viewingClubCoorientadores}
                viewingClubInvestigadores={viewingClubInvestigadores}
                handleUpdateProject={handleUpdateProject}
                projectToEdit={projectBeingEdited}
                mode="edit"
                onSuccess={() => {
                    setMembershipRequestFeedback({ type: 'success', message: 'Projeto atualizado com sucesso.' });
                    handleCloseEditProject();
                }}
            />

            <EditClubForm
                isOpen={isEditClubOpen}
                onClose={() => setIsEditClubOpen(false)}
                viewingClub={viewingClub}
                loggedUser={loggedUser}
                schools={schools}
                users={users}
                isSubmitting={updatingClub}
                onSubmit={handleUpdateClub}
            />

            {/* Modal de Perfil renderizado no final do componente */}
            <ModalPerfil
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                usuario={selectedUser}
                club={viewingClub}
                clubProjects={viewingClubProjects}
                clubUsers={viewingClubUsers}
            />
                </div>
            </div>
        </>
    );
}



