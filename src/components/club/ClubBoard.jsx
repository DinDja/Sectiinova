import React, { useEffect, useMemo, useState } from 'react';
import { User, Map as MapIcon, FolderKanban, Users, BookOpen, Microscope, ExternalLink, Target, GraduationCap, PlusCircle, Sparkles, Zap, Building2, Pencil, Clock3, CheckCircle2, XCircle, Trash2, Asterisk, FileText, Eye } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import EmptyState from '../shared/EmptyState';
import CreateProjectForm from './CreateProjectForm';
import CreateClubForm from './CreateClubForm';
import EditClubForm from './EditClubForm';
import MembershipCardGenerator from './MembershipCardGenerator';
import ModalPerfil from './ModalPerfil'; 
import { db } from '../../../firebase';
import { getAvatarSrc, getInitials, getLattesAreas, getLattesLink, getLattesSummary } from '../../utils/helpers';
import { CLUB_REQUIRED_DOCUMENTS } from '../../constants/appConstants';

// --- COMPONENTES AUXILIARES HQ DE AÇÃO ---
const ScreamTail = ({ className = "", fill = "#ffffff", flip = false }) => (
    <svg 
        className={`absolute z-20 ${className} ${flip ? '-scale-x-100' : ''}`} 
        viewBox="0 0 40 40" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M2 2 L16 38 L22 18 L36 2" fill={fill} stroke="#0f172a" strokeWidth="3" strokeLinejoin="miter" />
        <path d="M1.5 2 L36.5 2" stroke={fill} strokeWidth="6" strokeLinecap="square" />
    </svg>
);

const normalizeText = (value) => String(value || '').trim().toLowerCase();

export default function ClubBoard({
    viewingClub,
    viewingClubSchool,
    viewingClubProjects,
    viewingClubUsers,
    viewingClubOrientadores,
    viewingClubCoorientadores,
    viewingClubInvestigadores,
    viewingClubDiaryCount,
    projectsCatalog = [],
    schoolClubDiscoveryList = [],
    latestMyClubJoinRequestByClubId = new Map(),
    requestingClubIds = new Set(),
    handleRequestClubEntry = async () => {},
    myClubIds = [],
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
    clubs = [],
    handleCreateClub,
    creatingClub,
    handleUpdateClub,
    handleUpdateClubCardTemplate = async () => {},
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
    const [resolvedDocumentUrls, setResolvedDocumentUrls] = useState({});
    const [loadingDocumentKeys, setLoadingDocumentKeys] = useState(new Set());

    const isMentor = ['orientador', 'coorientador'].includes(String(loggedUser?.perfil || '').trim().toLowerCase());
    const loggedUserId = String(loggedUser?.id || loggedUser?.uid || '').trim();
    const loggedUserEmail = String(loggedUser?.email || '').toLowerCase().trim();
    const loggedUserMatricula = String(loggedUser?.matricula || loggedUser?.['matrícula'] || '').trim();
    const mentorIds = new Set([
        String(viewingClub?.mentor_id || '').trim(),
        ...(viewingClub?.orientador_ids || []).map((id) => String(id || '').trim()),
        ...(viewingClub?.orientadores_ids || []).map((id) => String(id || '').trim()),
        ...(viewingClub?.coorientador_ids || []).map((id) => String(id || '').trim()),
        ...(viewingClub?.coorientadores_ids || []).map((id) => String(id || '').trim())
    ].filter(Boolean));
    const viewingClubMemberIds = new Set([
        ...(viewingClub?.membros_ids || []).map((id) => String(id || '').trim()),
        ...(viewingClub?.clubistas_ids || []).map((id) => String(id || '').trim()),
        ...(viewingClub?.orientador_ids || []).map((id) => String(id || '').trim()),
        ...(viewingClub?.orientadores_ids || []).map((id) => String(id || '').trim()),
        ...(viewingClub?.coorientador_ids || []).map((id) => String(id || '').trim()),
        ...(viewingClub?.coorientadores_ids || []).map((id) => String(id || '').trim()),
        String(viewingClub?.mentor_id || '').trim()
    ].filter(Boolean));
    const loggedUserClubIds = new Set([
        String(loggedUser?.clube_id || '').trim(),
        ...(Array.isArray(loggedUser?.clubes_ids) ? loggedUser.clubes_ids : []).map((id) => String(id || '').trim())
    ].filter(Boolean));
    const resolveProjectClubId = (project) => {
        if (!project || typeof project !== 'object') return '';
        return String(project.clube_id || project.clubeId || project.club_id || project.clubId || project.clube?.id || project.club?.id || '').trim();
    };

    const projectsByClubId = useMemo(() => {
        const counts = new Map();
        (Array.isArray(projectsCatalog) ? projectsCatalog : []).forEach((project) => {
            const clubId = resolveProjectClubId(project);
            if (!clubId) return;
            counts.set(clubId, (counts.get(clubId) || 0) + 1);
        });
        return counts;
    }, [projectsCatalog]);

    const viewingClubId = String(viewingClub?.id || '').trim();
    const canManageClub = isMentor && loggedUserId && (mentorIds.has(loggedUserId) || viewingClubMemberIds.has(loggedUserId) || (viewingClubId && loggedUserClubIds.has(viewingClubId)));
    const canCreateProject = canManageClub;
    const clubBannerUrl = String(viewingClub?.banner_url || viewingClub?.banner || '').trim();
    const clubLogoUrl = String(viewingClub?.logo_url || viewingClub?.logo || '').trim();
    const managedClubs = useMemo(() => (mentorManagedClubs || []).filter((club) => String(club?.id || '').trim()), [mentorManagedClubs]);
    const normalizedMyClubIds = useMemo(
        () => [...new Set((myClubIds || []).map((clubId) => String(clubId || '').trim()).filter(Boolean))],
        [myClubIds]
    );
    const switchableUserClubs = useMemo(() => {
        const switchableIds = new Set([
            ...normalizedMyClubIds,
            ...managedClubs.map((club) => String(club?.id || '').trim())
        ].filter(Boolean));

        const byId = new Map();
        (clubs || []).forEach((club) => {
            const clubId = String(club?.id || '').trim();
            if (!clubId || !switchableIds.has(clubId)) return;
            byId.set(clubId, club);
        });

        return [...byId.values()].sort((a, b) => String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR'));
    }, [normalizedMyClubIds, managedClubs, clubs]);
    const canSwitchUserClubs = switchableUserClubs.length > 1;
    const otherSchoolClubs = useMemo(() => {
        const byId = new Map();
        (schoolClubDiscoveryList || []).forEach((club) => {
            const clubId = String(club?.id || '').trim();
            if (!clubId || clubId === viewingClubId) return;
            if (!byId.has(clubId)) byId.set(clubId, club);
        });
        return [...byId.values()].sort((a, b) => String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR'));
    }, [schoolClubDiscoveryList, viewingClubId]);

    const schoolOverview = useMemo(() => {
        const schoolId = String(viewingClubSchool?.id || viewingClubSchool?.escola_id || viewingClub?.escola_id || loggedUser?.escola_id || '').trim();
        const schoolName = normalizeText(viewingClubSchool?.nome || viewingClub?.escola_nome || loggedUser?.escola_nome || '');
        const schoolById = new Map((schools || []).map((school) => [String(school?.id || school?.escola_id || '').trim(), school]).filter(([id]) => Boolean(id)));
        const school = schoolById.get(schoolId) || (schools || []).find((item) => normalizeText(item?.nome) === schoolName) || viewingClubSchool || null;

        const knownClubsById = new Map();
        [...(clubs || []), ...(schoolClubDiscoveryList || []), viewingClub].filter(Boolean).forEach((club) => {
            const clubId = String(club?.id || '').trim();
            if (!clubId) return;
            knownClubsById.set(clubId, club);
        });

        const schoolClubs = [...knownClubsById.values()].filter((club) => {
            const clubSchoolId = String(club?.escola_id || '').trim();
            const clubSchoolName = normalizeText(club?.escola_nome);
            if (schoolId && clubSchoolId && clubSchoolId === schoolId) return true;
            if (schoolName && clubSchoolName && clubSchoolName === schoolName) return true;
            return false;
        });

        const schoolClubIds = new Set(schoolClubs.map((club) => String(club?.id || '').trim()).filter(Boolean));

        const schoolMembers = (users || []).filter((person) => {
            const personSchoolIds = new Set([person?.escola_id, ...(Array.isArray(person?.escolas_ids) ? person.escolas_ids : [])].map((value) => String(value || '').trim()).filter(Boolean));
            const personSchoolName = normalizeText(person?.escola_nome);
            const personClubIds = new Set([person?.clube_id, ...(Array.isArray(person?.clubes_ids) ? person.clubes_ids : [])].map((value) => String(value || '').trim()).filter(Boolean));
            const hasSchoolIdMatch = schoolId ? personSchoolIds.has(schoolId) : false;
            const hasSchoolNameMatch = schoolName ? personSchoolName === schoolName : false;
            const hasClubMatch = [...personClubIds].some((clubId) => schoolClubIds.has(clubId));
            return hasSchoolIdMatch || hasSchoolNameMatch || hasClubMatch;
        });

        const mentorsCount = schoolMembers.filter((person) => ['orientador', 'coorientador'].includes(normalizeText(person?.perfil))).length;
        const studentsCount = schoolMembers.filter((person) => ['estudante', 'investigador', 'aluno', 'clubista'].includes(normalizeText(person?.perfil))).length;
        const projectsCount = schoolClubs.reduce((total, club) => {
            const clubId = String(club?.id || '').trim();
            const clubProjectsCount = projectsByClubId.has(clubId) ? projectsByClubId.get(clubId) : Number(club?.projetosCount ?? club?.projetos?.length ?? club?.projetos_ids?.length ?? 0);
            return total + (Number.isFinite(clubProjectsCount) ? clubProjectsCount : 0);
        }, 0);

        const schoolMeta = [
            { label: 'Código INEP', value: String(school?.cod_inep || '').trim() },
            { label: 'Município', value: String(school?.municipio || '').trim() },
            { label: 'UF', value: String(school?.uf || '').trim() },
            { label: 'Tipo', value: String(school?.tipo_unidade || '').trim() }
        ].filter((item) => Boolean(item.value));

        const schoolLabel = String(school?.nome || viewingClubSchool?.nome || viewingClub?.escola_nome || loggedUser?.escola_nome || 'Unidade escolar').trim();

        return {
            schoolLabel, schoolMeta, clubs: schoolClubs, clubsCount: schoolClubs.length,
            membersCount: schoolMembers.length, mentorsCount, studentsCount, projectsCount
        };
    }, [clubs, loggedUser?.escola_id, loggedUser?.escola_nome, schoolClubDiscoveryList, schools, users, viewingClub, viewingClubSchool, projectsByClubId]);

    const schoolOverviewHighlights = useMemo(() => {
        return [
            { key: 'clubs', label: 'Clubes', value: schoolOverview.clubsCount, color: 'bg-blue-400' },
            { key: 'members', label: 'Membros', value: schoolOverview.membersCount, color: 'bg-yellow-300' },
            { key: 'mentors', label: 'Mentores', value: schoolOverview.mentorsCount, color: 'bg-pink-400' },
            { key: 'students', label: 'Clubistas', value: schoolOverview.studentsCount, color: 'bg-cyan-300' },
            { key: 'projects', label: 'Projetos', value: schoolOverview.projectsCount, color: 'bg-lime-300' }
        ];
    }, [schoolOverview.clubsCount, schoolOverview.membersCount, schoolOverview.mentorsCount, schoolOverview.projectsCount, schoolOverview.studentsCount]);

    useEffect(() => {
        if (!canCreateProject && isCreateOpen) setIsCreateOpen(false);
    }, [canCreateProject, isCreateOpen]);

    const usersById = useMemo(() => {
        const map = new Map();
        (users || []).forEach((person) => {
            const personId = String(person?.id || '').trim();
            if (!personId) return;
            map.set(personId, person);
        });
        return map;
    }, [users]);

    const clubDescription = String(viewingClub?.descricao || '').trim();
    const clubDocuments = useMemo(() => {
        const source = viewingClub?.documentos && typeof viewingClub.documentos === 'object' ? viewingClub.documentos : {};
        return CLUB_REQUIRED_DOCUMENTS.map((requiredDoc) => {
            const rawDocument = source?.[requiredDoc.key];
            const dataUrl = typeof rawDocument === 'string' ? String(rawDocument || '').trim() : String(rawDocument?.data_url || rawDocument?.dataUrl || rawDocument?.url || rawDocument?.base64 || '').trim();
            const storageMode = String(rawDocument?.storage_mode || rawDocument?.storageMode || '').trim();
            const chunkCount = Math.max(0, Number(rawDocument?.chunk_count || rawDocument?.chunkCount || 0));
            const contentType = String(rawDocument?.content_type || rawDocument?.mime_type || rawDocument?.mimeType || '').trim();
            const fileName = String(rawDocument?.nome_arquivo || rawDocument?.file_name || rawDocument?.name || `${requiredDoc.key}.pdf`).trim();
            const sizeBytes = Number(rawDocument?.tamanho_bytes || rawDocument?.size || 0);

            return {
                key: requiredDoc.key, label: requiredDoc.label, isAvailable: Boolean(dataUrl) || chunkCount > 0 || storageMode === 'firestore_chunks',
                url: dataUrl, storageMode, chunkCount, fileName: fileName || `${requiredDoc.key}.pdf`, contentType, sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : 0,
            };
        });
    }, [viewingClub?.documentos]);

    const formatRequestDate = (dateValue) => {
        if (!dateValue) return '';
        const date = typeof dateValue?.toDate === 'function' ? dateValue.toDate() : new Date(dateValue);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatFileSize = (sizeBytes) => {
        const value = Number(sizeBytes || 0);
        if (!Number.isFinite(value) || value <= 0) return '';
        const kb = value / 1024;
        if (kb < 1024) return `${kb >= 100 ? kb.toFixed(0) : kb.toFixed(1)} KB`;
        const mb = kb / 1024;
        return `${mb.toFixed(2)} MB`;
    };

    const buildChunkDocId = (documentKey, index) => `${String(documentKey || 'doc').trim()}_${index}`;

    const resolveDocumentUrl = async (documentItem) => {
        const directUrl = String(documentItem?.url || '').trim();
        if (directUrl) return directUrl;
        const cachedUrl = String(resolvedDocumentUrls?.[documentItem.key] || '').trim();
        if (cachedUrl) return cachedUrl;
        const clubId = String(viewingClub?.id || '').trim();
        const chunkCount = Math.max(0, Number(documentItem?.chunkCount || 0));
        if (!clubId || chunkCount <= 0) return '';

        setLoadingDocumentKeys((prev) => { const next = new Set(prev); next.add(documentItem.key); return next; });

        try {
            const chunkSnapshots = await Promise.all(Array.from({ length: chunkCount }, (_, index) => getDoc(doc(db, 'clubes', clubId, 'documentos_chunks', buildChunkDocId(documentItem.key, index)))));
            const assembledDataUrl = chunkSnapshots.map((chunkSnap) => String(chunkSnap?.data()?.chunk || '')).join('');
            if (!assembledDataUrl) return '';
            setResolvedDocumentUrls((prev) => ({ ...prev, [documentItem.key]: assembledDataUrl }));
            return assembledDataUrl;
        } finally {
            setLoadingDocumentKeys((prev) => { const next = new Set(prev); next.delete(documentItem.key); return next; });
        }
    };

    const handleOpenDocument = async (documentItem) => {
        if (!documentItem?.isAvailable) return;
        try {
            const url = await resolveDocumentUrl(documentItem);
            if (!url) {
                setMembershipRequestFeedback({ type: 'error', message: 'Não foi possível carregar este documento agora.' });
                return;
            }
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (error) {
            console.error('Falha ao abrir documento do clube:', error);
            setMembershipRequestFeedback({ type: 'error', message: 'Falha ao abrir documento do clube.' });
        }
    };

    const resolveMentorNames = (club) => {
        const clubMentorIds = [
            String(club?.mentor_id || '').trim(),
            ...(club?.orientador_ids || []).map((id) => String(id || '').trim()),
            ...(club?.orientadores_ids || []).map((id) => String(id || '').trim()),
            ...(club?.coorientador_ids || []).map((id) => String(id || '').trim()),
            ...(club?.coorientadores_ids || []).map((id) => String(id || '').trim())
        ].filter(Boolean);

        const mentorNames = [...new Set(clubMentorIds)].map((id) => String(usersById.get(id)?.nome || '').trim()).filter(Boolean);
        return mentorNames.length > 0 ? mentorNames.join(', ') : 'Mentor não informado';
    };

    const getLatestMembershipRequest = (clubId) => {
        if (latestMyClubJoinRequestByClubId instanceof Map) return latestMyClubJoinRequestByClubId.get(String(clubId || '').trim()) || null;
        return null;
    };

    const getClubMemberIds = (club) => new Set([
        ...(club?.membros_ids || []),
        ...(club?.clubistas_ids || []),
        ...(club?.orientador_ids || []),
        ...(club?.orientadores_ids || []),
        ...(club?.coorientador_ids || []),
        ...(club?.coorientadores_ids || []),
        club?.mentor_id
    ].map((value) => String(value || '').trim()).filter(Boolean));

    const isLoggedUserMemberOfClub = (club) => {
        if (!club || !loggedUserId) return false;
        const clubId = String(club?.id || '').trim();
        if (!clubId) return false;
        const clubMemberIds = getClubMemberIds(club);
        return clubMemberIds.has(loggedUserId) || loggedUserClubIds.has(clubId);
    };

    const getMembershipRequestState = (clubId) => {
        const latestRequest = getLatestMembershipRequest(clubId);
        const requestStatus = String(latestRequest?.status || '').trim().toLowerCase();
        return {
            latestRequest,
            requestStatus,
            isPending: requestStatus === 'pendente',
            isRejected: requestStatus === 'recusada',
            isAccepted: requestStatus === 'aceita'
        };
    };

    const viewingClubRequestState = getMembershipRequestState(viewingClubId);
    const isViewingClubRequestPending = viewingClubRequestState.isPending;
    const isViewingClubRequestRejected = viewingClubRequestState.isRejected;
    const isViewingClubRequestAccepted = viewingClubRequestState.isAccepted;
    const isViewingClubRequesting = requestingClubIds instanceof Set && requestingClubIds.has(viewingClubId);
    const isViewingClubMember = isLoggedUserMemberOfClub(viewingClub);
    const canRequestViewingClubEntry = Boolean(viewingClubId && loggedUserId) && !isViewingClubMember;

    const flattenProjectReferenceValues = (value) => {
        if (value === undefined || value === null) return [];
        if (Array.isArray(value)) return value.flatMap(flattenProjectReferenceValues);
        if (typeof value === 'object') return [value.id, value.uid, value.email, value.matricula, value['matrícula']].flatMap(flattenProjectReferenceValues);
        return String(value).split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean);
    };

    const canMentorDeleteProject = (project) => {
        if (!isMentor || !loggedUserId || !project) return false;
        const projectClubId = String(project?.clube_id || '').trim();
        if (canManageClub && viewingClubId && projectClubId && projectClubId === viewingClubId) return true;

        const projectMentorReferences = new Set([
            project?.mentor_id, project?.orientador_id, project?.coorientador_id, project?.autor_id, project?.author_id, project?.created_by, project?.createdBy,
            project?.criador_id, project?.creator_id, project?.owner_id, project?.orientador_ids, project?.orientadores_ids, project?.coorientador_ids, project?.coorientadores_ids
        ].flatMap(flattenProjectReferenceValues).map((value) => String(value || '').toLowerCase().trim()).filter(Boolean));

        return (projectMentorReferences.has(loggedUserId.toLowerCase()) || (loggedUserEmail && projectMentorReferences.has(loggedUserEmail)) || (loggedUserMatricula && projectMentorReferences.has(loggedUserMatricula.toLowerCase())));
    };

    const handleStudentJoinRequest = async (clubId) => {
        if (!clubId) return;
        setMembershipRequestFeedback({ type: '', message: '' });
        try {
            await handleRequestClubEntry(clubId);
            setMembershipRequestFeedback({ type: 'success', message: 'Solicitação enviada para o mentor.' });
        } catch (error) {
            const message = String(error?.message || '').trim() || 'Falha ao enviar solicitação.';
            setMembershipRequestFeedback({ type: 'error', message });
        }
    };

    const handleMentorDecision = async (requestId, accept) => {
        if (!requestId) return;
        setMembershipRequestFeedback({ type: '', message: '' });
        try {
            await handleRespondClubEntryRequest(requestId, accept);
            setMembershipRequestFeedback({ type: 'success', message: accept ? 'Clubista aprovado e vinculado ao clube.' : 'Solicitação recusada com sucesso.' });
        } catch (error) {
            const message = String(error?.message || '').trim() || 'Falha ao processar solicitação.';
            setMembershipRequestFeedback({ type: 'error', message });
        }
    };

    const handleDeleteProjectClick = async (project) => {
        const projectId = String(project?.id || '').trim();
        if (!projectId || !canMentorDeleteProject(project)) return;
        const projectTitle = String(project?.titulo || 'este projeto').trim();
        const shouldDelete = window.confirm(`Deseja apagar "${projectTitle}"? Essa ação não pode ser desfeita.`);
        if (!shouldDelete) return;

        setDeletingProjectIds((prev) => { const next = new Set(prev); next.add(projectId); return next; });

        try {
            await handleDeleteProject(projectId);
            setMembershipRequestFeedback({ type: 'success', message: 'Projeto apagado com sucesso.' });
        } catch (error) {
            const message = String(error?.message || '').trim() || 'Falha ao apagar o projeto.';
            setMembershipRequestFeedback({ type: 'error', message });
        } finally {
            setDeletingProjectIds((prev) => { const next = new Set(prev); next.delete(projectId); return next; });
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

    const handleUserClick = (e, user) => {
        e.stopPropagation();
        e.preventDefault();
        const enrichedUser = {
            ...user, clube: user.clube || viewingClub?.nome || user.clube_nome || '', projetosCount: user.projetosCount ?? user.projetos?.length ?? user.projetos_ids?.length ?? user.projetosIds?.length ?? 0
        };
        setSelectedUser(enrichedUser);
        setIsProfileModalOpen(true);
    };

    // RENDER: DESCOBERTA DE CLUBES
    if (!viewingClub || !isViewingClubMember) {
        return (
                <div className="relative min-h-[80vh] w-full font-sans text-slate-900 bg-[#FDFDFD] p-4 md:p-6 lg:p-8 overflow-hidden">
                    <div className="fixed inset-0 z-0 pointer-events-none">
                        <div className="absolute inset-0 bg-[url('/BG.png')] bg-cover bg-center"></div>
                        <div className="absolute inset-0 bg-white/15 backdrop-blur-sm"></div>
                    </div>
                    
                    <div className="relative max-w-6xl mx-auto space-y-10 z-10">
                        {canSwitchUserClubs && (
                            <section className="bg-white border-[3px] border-slate-900 rounded-[3rem] p-8 md:p-10 shadow-lg">
                                <div className="flex items-center justify-between gap-4 mb-8 border-b-[3px] border-slate-900 pb-5">
                                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                                        <Building2 className="w-7 h-7 stroke-[2.5] text-pink-500" /> Seus Clubes
                                    </h3>
                                    <span className="inline-flex items-center justify-center rounded-full border-[3px] border-slate-900 bg-yellow-400 text-slate-900 text-lg font-black px-5 py-1.5 shadow-sm">
                                        {switchableUserClubs.length}
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    {switchableUserClubs.map((club) => {
                                        const clubId = String(club?.id || '').trim();
                                        const isActive = String(viewingClub?.id || '').trim() === clubId;
                                        const clubLogo = String(club?.logo_url || club?.logo || '').trim();

                                        return (
                                            <button
                                                key={clubId}
                                                type="button"
                                                onClick={() => handleSelectManagedClub(clubId)}
                                                className={`inline-flex items-center gap-4 rounded-full px-5 py-3 border-[3px] border-slate-900 font-black text-sm uppercase tracking-wider transition-transform ${
                                                    isActive
                                                        ? 'bg-cyan-300 text-slate-900 shadow-md scale-105'
                                                        : 'bg-white text-slate-700 hover:bg-cyan-50 shadow-sm hover:scale-105 active:scale-95'
                                                }`}
                                            >
                                                <span className="w-10 h-10 rounded-full overflow-hidden border-[3px] border-slate-900 bg-white flex items-center justify-center shrink-0">
                                                    {clubLogo ? (
                                                        <img src={clubLogo} alt={`Logo do clube ${club?.nome || ''}`} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-[10px] font-black text-slate-900">{getInitials(club?.nome || '')}</span>
                                                    )}
                                                </span>
                                                <span>{club?.nome || 'Clube'}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        <div className="rounded-[3rem] border-[3px] border-slate-900 bg-white shadow-xl p-8 md:p-12 mb-10 transition-transform hover:-translate-y-1">
                            <div className="inline-flex items-center gap-2 bg-yellow-400 px-5 py-2.5 rounded-full border-[3px] border-slate-900 shadow-sm mb-6 transform --2">
                                <Sparkles className="w-5 h-5 text-slate-900 stroke-[2.5]" />
                                <span className="font-black uppercase tracking-widest text-sm text-slate-900">Explore o Ecossistema</span>
                            </div>
                            
                            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 uppercase leading-[1.05] mb-4">
                                Clubes da sua <br/>
                                <span className="text-pink-500">Unidade Escolar</span>
                            </h2>
                            <p className="text-slate-700 font-bold mt-2 max-w-2xl text-lg">
                                Explore os clubes disponíveis, veja identidade visual, equipe e estrutura de cada um para solicitar sua entrada.
                            </p>

                            <div className="mt-8 flex flex-wrap gap-4">
                                <span className="inline-flex items-center gap-2 bg-cyan-300 border-[3px] border-slate-900 shadow-sm rounded-full px-5 py-2.5 text-sm font-black text-slate-900 uppercase transform hover:scale-105 transition-transform">
                                    <Building2 className="w-5 h-5 stroke-[2.5]" />
                                    {schoolClubDiscoveryList.length} clube{schoolClubDiscoveryList.length === 1 ? '' : 's'} encontrado{schoolClubDiscoveryList.length === 1 ? '' : 's'}
                                </span>
                                <span className="inline-flex items-center gap-2 bg-white border-[3px] border-slate-900 shadow-sm rounded-full px-5 py-2.5 text-sm font-black text-slate-900 uppercase transform hover:scale-105 transition-transform">
                                    <MapIcon className="w-5 h-5 stroke-[2.5]" />
                                    {String(loggedUser?.escola_nome || '').trim() || 'Unidade escolar vinculada'}
                                </span>
                                {isMentor && (
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateClubOpen(true)}
                                        className="inline-flex items-center gap-2 bg-pink-400 text-white border-[3px] border-slate-900 shadow-sm rounded-full px-5 py-2.5 text-sm font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-transform"
                                    >
                                        <PlusCircle className="w-5 h-5 stroke-[3]" />
                                        Criar Clube
                                    </button>
                                )}
                            </div>
                        </div>

                        <section className="bg-white border-[3px] border-slate-900 rounded-[3rem] p-8 shadow-lg">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 border-b-[3px] border-slate-900 pb-4">
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                                    <Building2 className="w-7 h-7 stroke-[2.5]" /> Minha Unidade Escolar
                                </h3>
                                <span className="inline-flex items-center gap-2 bg-yellow-400 border-[3px] border-slate-900 shadow-sm rounded-full px-4 py-2 text-xs font-black text-slate-900 uppercase tracking-widest">
                                    <MapIcon className="w-4 h-4 stroke-[3]" /> {schoolOverview.schoolLabel}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {schoolOverviewHighlights.map((item) => (
                                    <div key={item.key} className={`rounded-[2rem] border-[3px] border-slate-900 p-4 text-center shadow-sm hover:shadow-md hover:-translate-y-1 transition-all ${item.color}`}>
                                        <p className="text-3xl font-black text-slate-900 leading-none">{item.value}</p>
                                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mt-2">{item.label}</p>
                                    </div>
                                ))}
                            </div>

                            {schoolOverview.schoolMeta.length > 0 && (
                                <div className="mt-8 flex flex-wrap gap-3">
                                    {schoolOverview.schoolMeta.map((metaItem) => (
                                        <span
                                            key={`${metaItem.label}:${metaItem.value}`}
                                            className="inline-flex items-center gap-2 rounded-full border-[3px] border-slate-900 bg-white px-4 py-2 text-[11px] font-black text-slate-900 uppercase tracking-widest shadow-sm"
                                        >
                                            <span>{metaItem.label}</span>
                                            <span className="bg-slate-900 text-white px-2.5 py-0.5 rounded-full">{metaItem.value}</span>
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="mt-8">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4">Clubes da unidade</p>
                                {schoolOverview.clubs.length === 0 ? (
                                    <p className="text-sm font-bold text-slate-700 bg-slate-50 border-[3px] border-dashed border-slate-300 rounded-[2rem] px-5 py-4">
                                        Nenhum clube da unidade foi encontrado no momento.
                                    </p>
                                ) : (
                                    <div className="flex flex-wrap gap-3">
                                        {schoolOverview.clubs.slice(0, 6).map((club) => {
                                            const schoolClubId = String(club?.id || '').trim();
                                            const isActiveClub = schoolClubId && schoolClubId === viewingClubId;

                                            return (
                                                <button
                                                    key={schoolClubId || String(club?.nome || '')}
                                                    type="button"
                                                    onClick={() => handleSelectManagedClub(schoolClubId)}
                                                    disabled={!schoolClubId}
                                                    className={`inline-flex items-center rounded-full border-[3px] border-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wider shadow-sm transition-transform disabled:opacity-50 disabled:pointer-events-none ${
                                                        isActiveClub
                                                            ? 'bg-cyan-300 text-slate-900 scale-105'
                                                            : 'bg-white text-slate-900 hover:bg-cyan-100 hover:scale-105 active:scale-95'
                                                    }`}
                                                >
                                                    {club?.nome || 'Clube'}
                                                </button>
                                            );
                                        })}
                                        {schoolOverview.clubs.length > 6 && (
                                            <span className="inline-flex items-center rounded-full border-[3px] border-slate-900 bg-white px-4 py-2 text-xs font-black text-slate-900 uppercase tracking-wider shadow-sm">
                                                +{schoolOverview.clubs.length - 6} clubes
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>

                        {membershipRequestFeedback.message && (
                            <div className="relative">
                                <div
                                    className={`rounded-[2rem] border-[3px] p-5 text-sm font-black uppercase shadow-sm relative z-10 ${
                                        membershipRequestFeedback.type === 'error'
                                            ? 'bg-pink-500 text-white border-slate-900'
                                            : 'bg-cyan-300 text-slate-900 border-slate-900'
                                    }`}
                                >
                                    {membershipRequestFeedback.message}
                                </div>
                            </div>
                        )}

                        {schoolClubDiscoveryList.length === 0 ? (
                            <div className="bg-white border-[3px] border-slate-900 rounded-[3rem] p-16 text-center shadow-lg relative">
                                <Building2 className="w-16 h-16 text-slate-400 mx-auto mb-6 stroke-[1.5]" />
                                <p className="text-slate-900 font-black text-2xl uppercase">Nenhum clube disponível</p>
                                <p className="text-slate-600 font-bold mt-3 text-lg">Assim que um clube da sua unidade estiver ativo, ele aparecerá aqui para solicitação.</p>
                                {isMentor && (
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateClubOpen(true)}
                                        className="mt-8 inline-flex items-center gap-3 px-8 py-4 rounded-full bg-pink-400 text-white font-black uppercase tracking-wider text-sm hover:scale-105 active:scale-95 transition-transform border-[3px] border-slate-900 shadow-sm"
                                    >
                                        <PlusCircle className="w-5 h-5 stroke-[3]" />
                                        Criar Clube na Unidade
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {schoolClubDiscoveryList.map((club) => {
                                    const clubId = String(club?.id || '').trim();
                                    const requestState = getMembershipRequestState(clubId);
                                    const isPending = requestState.isPending;
                                    const isRejected = requestState.isRejected;
                                    const isAccepted = requestState.isAccepted;
                                    const isRequesting = requestingClubIds instanceof Set && requestingClubIds.has(clubId);
                                    const isMember = isLoggedUserMemberOfClub(club);

                                    const statusConfig = isPending
                                        ? { icon: Clock3, label: 'Pendente', classes: 'bg-yellow-400 text-slate-900' }
                                        : isRejected
                                            ? { icon: XCircle, label: 'Recusada', classes: 'bg-pink-500 text-white' }
                                            : isAccepted
                                                ? { icon: CheckCircle2, label: 'Aceita', classes: 'bg-cyan-300 text-slate-900' }
                                                : isMember
                                                    ? { icon: CheckCircle2, label: 'Participando', classes: 'bg-cyan-300 text-slate-900' }
                                                : null;

                                    const StatusIcon = statusConfig?.icon || null;
                                    const bannerUrl = String(club?.banner_url || club?.banner || '').trim();
                                    const logoUrl = String(club?.logo_url || club?.logo || '').trim();
                                    const displayBanner = bannerUrl;

                                    const memberCount = new Set([
                                        ...(club?.membros_ids || []), ...(club?.clubistas_ids || []), ...(club?.orientador_ids || []), ...(club?.orientadores_ids || []),
                                        ...(club?.coorientador_ids || []), ...(club?.coorientadores_ids || []), club?.mentor_id
                                    ].map((value) => String(value || '').trim()).filter(Boolean)).size;

                                    const mentorCount = new Set([
                                        club?.mentor_id, ...(club?.orientador_ids || []), ...(club?.orientadores_ids || []), ...(club?.coorientador_ids || []), ...(club?.coorientadores_ids || [])
                                    ].map((value) => String(value || '').trim()).filter(Boolean)).size;

                                    const clubistasCount = new Set((club?.clubistas_ids || []).map((value) => String(value || '').trim()).filter(Boolean)).size;

                                    const projectClubCount = projectsByClubId.get(clubId);
                                    const projectsCount = typeof projectClubCount === 'number'
                                        ? projectClubCount
                                        : Number(club?.projetosCount ?? club?.projetos?.length ?? club?.projetos_ids?.length ?? 0);

                                    return (
                                        <article key={clubId} className="group bg-white border-[3px] border-slate-900 rounded-[3rem] overflow-hidden shadow-lg hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 flex flex-col">
                                            <div className="relative h-52 overflow-hidden border-b-[3px] border-slate-900 bg-slate-50">
                                                {displayBanner ? (
                                                    <img src={displayBanner} alt={`Banner do clube ${club?.nome || ''}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90" />
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[linear-gradient(135deg,#fde047_0%,#67e8f9_100%)] p-6 text-center opacity-80">
                                                        <div className="rounded-full border-[3px] border-slate-900 bg-white p-4 shadow-sm">
                                                            <Building2 className="w-8 h-8 text-slate-900 stroke-[3]" />
                                                        </div>
                                                    </div>
                                                )}

                                                {statusConfig && (
                                                    <div className={`absolute top-5 left-5 inline-flex items-center gap-2 border-[3px] border-slate-900 rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider shadow-sm ${statusConfig.classes}`}>
                                                        {StatusIcon && <StatusIcon className="w-4 h-4 stroke-[3]" />}
                                                        {statusConfig.label}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-8 flex flex-col flex-grow">
                                                <div className="flex items-start gap-5">
                                                    <div className="w-24 h-24 rounded-[2rem] overflow-hidden border-[3px] border-slate-900 shadow-md bg-white shrink-0 -mt-16 relative flex items-center justify-center z-10 group-hover:scale-105 transition-transform">
                                                        {logoUrl ? (
                                                            <img src={logoUrl} alt={`Logo do clube ${club?.nome || ''}`} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-3xl font-black text-slate-900">{getInitials(club?.nome || '')}</span>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1 pt-1">
                                                        <h3 className="text-2xl font-black text-slate-900 uppercase truncate tracking-tight">{club?.nome || 'Clube sem nome'}</h3>
                                                        <p className="text-xs font-bold text-slate-500 truncate mt-1">{club?.escola_nome || club?.escola_id || 'Unidade não informada'}</p>
                                                    </div>
                                                </div>

                                                <div className="mt-8 grid grid-cols-4 gap-3">
                                                    {[
                                                        { v: memberCount, l: "Membros", c: "bg-teal-400" },
                                                        { v: clubistasCount, l: "Clubistas", c: "bg-blue-400" },
                                                        { v: mentorCount, l: "Mentores", c: "bg-pink-400" },
                                                        { v: projectsCount, l: "Projetos", c: "bg-yellow-400" }
                                                    ].map((stat, i) => (
                                                        <div key={i} className={`rounded-[1.5rem] border-[3px] border-slate-900 shadow-sm p-3 text-center ${stat.c}`}>
                                                            <p className="text-2xl font-black text-slate-900 leading-none">{stat.v}</p>
                                                            <p className="text-[9px] uppercase tracking-widest font-black text-slate-900 mt-2">{stat.l}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="mt-6 mb-8 flex-grow">
                                                    <p className="text-sm font-bold text-slate-700 line-clamp-3 leading-relaxed">
                                                        {String(club?.descricao || '').trim() || 'Clube ativo na unidade escolar com foco em pesquisa, inovação e formação científica.'}
                                                    </p>
                                                </div>

                                                <div className="mt-auto">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStudentJoinRequest(clubId)}
                                                        disabled={isMember || isPending || isAccepted || isRequesting}
                                                        className="w-full rounded-full px-6 py-4 text-sm font-black uppercase tracking-wider bg-cyan-300 text-slate-900 border-[3px] border-slate-900 shadow-sm hover:bg-cyan-200 hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:pointer-events-none"
                                                    >
                                                        {isMember ? 'Participando' : isRequesting ? 'Enviando...' : isPending ? 'Aguardando' : isAccepted ? 'Aceita' : isRejected ? 'Tentar Novamente' : 'Solicitar Entrada'}
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
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

    // RENDER: VISUALIZANDO UM CLUBE
    const investigatorCount = viewingClubInvestigadores.length;
    const memberCount = viewingClubUsers.length;
    const investigatorRatio = memberCount ? Math.round((investigatorCount / memberCount) * 100) : 0;
    
    return (
        <>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>

            <div className="min-h-screen bg-[#FDFDFD] text-slate-900 pb-32 font-sans selection:bg-pink-400 selection:text-white overflow-x-hidden relative">
                
                {/* BACKGROUND HQ: imagem BG.png com sobreposição suave */}
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-[url('/BG.png')] bg-cover bg-center"></div>
                    <div className="absolute inset-0 bg-white/15 backdrop-blur-sm"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 space-y-12 relative z-10">
                    {canSwitchUserClubs && (
                        <div className="bg-white border-[3px] border-slate-900 rounded-[3rem] p-8 md:p-10 shadow-lg relative">
                            <div className="flex items-center justify-between gap-4 mb-8 border-b-[3px] border-slate-900 pb-5">
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                                    <Building2 className="w-7 h-7 stroke-[2.5] text-pink-500" /> Seus Clubes
                                </h3>
                                <span className="inline-flex items-center justify-center rounded-full border-[3px] border-slate-900 bg-yellow-400 text-slate-900 text-lg font-black px-5 py-1.5 shadow-sm">
                                    {switchableUserClubs.length}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-4">
                                {switchableUserClubs.map((club) => {
                                    const clubId = String(club?.id || '').trim();
                                    const isActive = String(viewingClub?.id || '').trim() === clubId;
                                    const clubLogo = String(club?.logo_url || club?.logo || '').trim();

                                    return (
                                        <button
                                            key={clubId}
                                            type="button"
                                            onClick={() => handleSelectManagedClub(clubId)}
                                            className={`inline-flex items-center gap-4 rounded-full px-5 py-3 border-[3px] border-slate-900 font-black text-sm uppercase tracking-wider transition-transform ${
                                                isActive
                                                    ? 'bg-cyan-300 text-slate-900 shadow-md scale-105'
                                                    : 'bg-white text-slate-700 hover:bg-cyan-50 shadow-sm hover:scale-105 active:scale-95'
                                            }`}
                                        >
                                            <span className="w-10 h-10 rounded-full overflow-hidden border-[3px] border-slate-900 bg-white flex items-center justify-center shrink-0">
                                                {clubLogo ? (
                                                    <img src={clubLogo} alt={`Logo do clube ${club?.nome || ''}`} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-[10px] font-black text-slate-900">{getInitials(club?.nome || '')}</span>
                                                )}
                                            </span>
                                            <span>{club?.nome || 'Clube'}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
             
                    {/* Header do Clube HQ */}
                    <div className="relative w-full">
                        <div className="relative overflow-hidden rounded-[3rem] bg-white border-[3px] border-slate-900 min-h-[380px] flex flex-col justify-end p-8 md:p-12 shadow-xl z-10">
                            
                            <div className="absolute inset-0 pointer-events-none border-b-[3px] border-slate-900 bg-slate-100">
                                {clubBannerUrl ? (
                                    <img
                                        src={clubBannerUrl}
                                        alt={`Banner do clube ${viewingClub.nome}`}
                                        className="w-full h-full object-cover opacity-90 transition-transform duration-1000 hover:scale-105"
                                    />
                                ) : (
                                    <div className="absolute inset-0 bg-[linear-gradient(135deg,#fde047_0%,#67e8f9_100%)] opacity-30" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/90 to-transparent" />
                            </div>

                            <div className="relative flex flex-col lg:flex-row gap-8 justify-between items-end z-10">
                                <div className="max-w-4xl flex-1 flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
                                    
                                    {/* Logo Container com Isolate para garantir z-index sobre o background */}
                                    <div className="isolate">
                                        <div className="relative z-20 w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] border-[3px] border-slate-900 shadow-md bg-white overflow-hidden flex items-center justify-center shrink-0">
                                            {clubLogoUrl ? (
                                                <img
                                                    src={clubLogoUrl}
                                                    alt={`Logo do clube ${viewingClub.nome}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-4xl md:text-5xl font-black text-slate-900">
                                                    {getInitials(viewingClub.nome)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 pb-2">
                                        <h1 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tight mb-5 leading-[1.05]">
                                            {viewingClub.nome}
                                        </h1>

                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                            <p className="text-slate-900 font-bold text-sm flex items-center gap-2 bg-yellow-400 border-[3px] border-slate-900 shadow-sm rounded-full px-5 py-2.5 uppercase tracking-wider">
                                                <MapIcon className="w-4 h-4 stroke-[3]" /> {viewingClubSchool?.nome || 'Escola não vinculada'}
                                            </p>
                                            <span className="inline-flex items-center gap-2 bg-cyan-300 border-[3px] border-slate-900 shadow-sm rounded-full px-5 py-2.5 text-sm font-black text-slate-900 uppercase tracking-wider">
                                                <Microscope className="w-4 h-4 stroke-[3]" />
                                                {investigatorCount} pesquisador{investigatorCount === 1 ? '' : 'es'}
                                            </span>
                                            <span className="text-xs font-black text-white bg-pink-500 rounded-full px-4 py-2.5 uppercase tracking-widest border-[3px] border-slate-900 shadow-sm transform -2">
                                                {investigatorRatio}% da equipe
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 shrink-0 w-full lg:w-auto">
                                    {canManageClub && (
                                        <button
                                            type="button"
                                            onClick={() => setIsEditClubOpen(true)}
                                            className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 bg-white border-[3px] border-slate-900 shadow-sm hover:scale-105 hover:bg-slate-50 active:scale-95 text-slate-900 font-black uppercase text-xs tracking-wider transition-transform"
                                        >
                                            <Pencil className="w-4 h-4 stroke-[3]" /> Editar Clube
                                        </button>
                                    )}

                                    {isMentor && (
                                        <button
                                            type="button"
                                            onClick={() => setIsCreateClubOpen(true)}
                                            className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 bg-yellow-400 border-[3px] border-slate-900 shadow-sm hover:scale-105 active:scale-95 text-slate-900 font-black uppercase text-xs tracking-wider transition-transform"
                                        >
                                            <PlusCircle className="w-4 h-4 stroke-[3]" /> Criar Clube
                                        </button>
                                    )}

                                    {canRequestViewingClubEntry && (
                                        <button
                                            type="button"
                                            onClick={() => handleStudentJoinRequest(viewingClubId)}
                                            disabled={isViewingClubRequesting || isViewingClubRequestPending || isViewingClubRequestAccepted}
                                            className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 bg-cyan-300 border-[3px] border-slate-900 shadow-sm hover:scale-105 active:scale-95 text-slate-900 font-black uppercase text-xs tracking-wider transition-transform disabled:opacity-50 disabled:pointer-events-none"
                                        >
                                            {isViewingClubRequesting ? 'Enviando...' : isViewingClubRequestPending ? 'Aguardando' : isViewingClubRequestAccepted ? 'Aceita' : isViewingClubRequestRejected ? 'Tentar Novamente' : 'Solicitar Entrada'}
                                        </button>
                                    )}

                                    {canCreateProject && (
                                        <button
                                            type="button"
                                            onClick={() => setIsCreateOpen((previous) => !previous)}
                                            className="inline-flex items-center justify-center gap-3 rounded-full px-8 py-3.5 bg-cyan-300 border-[3px] border-slate-900 shadow-sm hover:scale-105 active:scale-95 text-slate-900 font-black uppercase text-sm tracking-wider transition-transform"
                                        >
                                            <Zap className={`w-5 h-5 stroke-[2.5] transition-transform ${isCreateOpen ? '--45' : ''}`} />
                                            {isCreateOpen ? 'Cancelar Criação' : 'Novo Projeto'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {isCreateOpen && canCreateProject && (
                        <div className="animate-in slide-in-from-top-4 duration-300">
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
                                onSuccess={() => {}}
                            />
                        </div>
                    )}

                    {membershipRequestFeedback.message && (
                        <div className="relative">
                            <div className={`rounded-full border-[3px] border-slate-900 px-6 py-4 text-sm font-black uppercase shadow-sm relative z-10 text-center ${
                                membershipRequestFeedback.type === 'error' ? 'bg-pink-500 text-white' : 'bg-cyan-300 text-slate-900'
                            }`}>
                                {membershipRequestFeedback.message}
                            </div>
                        </div>
                    )}

                    <section className="bg-white border-[3px] border-slate-900 rounded-[3rem] p-8 md:p-10 shadow-lg">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8 border-b-[3px] border-slate-900 pb-5">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                                <Building2 className="w-7 h-7 stroke-[2.5] text-yellow-500" /> Minha Unidade Escolar
                            </h3>
                            <span className="inline-flex items-center gap-2 bg-yellow-400 border-[3px] border-slate-900 shadow-sm rounded-full px-5 py-2 text-xs font-black text-slate-900 uppercase tracking-widest">
                                <MapIcon className="w-4 h-4 stroke-[3]" /> {schoolOverview.schoolLabel}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {schoolOverviewHighlights.map((item) => (
                                <div key={item.key} className={`rounded-[2rem] border-[3px] border-slate-900 p-4 text-center shadow-sm hover:shadow-md hover:-translate-y-1 transition-all ${item.color}`}>
                                    <p className="text-3xl font-black text-slate-900 leading-none">{item.value}</p>
                                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mt-2">{item.label}</p>
                                </div>
                            ))}
                        </div>

                        {schoolOverview.schoolMeta.length > 0 && (
                            <div className="mt-8 flex flex-wrap gap-3">
                                {schoolOverview.schoolMeta.map((metaItem) => (
                                    <span
                                        key={`${metaItem.label}:${metaItem.value}`}
                                        className="inline-flex items-center gap-2 rounded-full border-[3px] border-slate-900 bg-white px-4 py-2 text-[11px] font-black text-slate-900 uppercase tracking-widest shadow-sm"
                                    >
                                        <span>{metaItem.label}</span>
                                        <span className="bg-slate-900 text-white px-2.5 py-0.5 rounded-full">{metaItem.value}</span>
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="mt-8">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4">Clubes da unidade</p>
                            {schoolOverview.clubs.length === 0 ? (
                                <p className="text-sm font-bold text-slate-700 bg-slate-50 border-[3px] border-dashed border-slate-300 rounded-[2rem] px-5 py-4">
                                    Nenhum clube da unidade foi encontrado no momento.
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-3">
                                    {schoolOverview.clubs.slice(0, 6).map((club) => (
                                        <span
                                            key={String(club?.id || '').trim()}
                                            className="inline-flex items-center rounded-full border-[3px] border-slate-900 bg-cyan-300 px-4 py-2 text-xs font-black text-slate-900 uppercase tracking-wider shadow-sm"
                                        >
                                            {club?.nome || 'Clube'}
                                        </span>
                                    ))}
                                    {schoolOverview.clubs.length > 6 && (
                                        <span className="inline-flex items-center rounded-full border-[3px] border-slate-900 bg-white px-4 py-2 text-xs font-black text-slate-900 uppercase tracking-wider shadow-sm">
                                            +{schoolOverview.clubs.length - 6} clubes
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="mt-10">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4">Solicitar entrada em outros clubes</p>
                            {otherSchoolClubs.length === 0 ? (
                                <p className="text-sm font-bold text-slate-700 bg-slate-50 border-[3px] border-dashed border-slate-300 rounded-[2rem] px-5 py-4">
                                    Não há outros clubes da sua unidade escolar disponíveis para solicitação no momento.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {otherSchoolClubs.map((club) => {
                                        const clubId = String(club?.id || '').trim();
                                        const requestState = getMembershipRequestState(clubId);
                                        const isPending = requestState.isPending;
                                        const isRejected = requestState.isRejected;
                                        const isAccepted = requestState.isAccepted;
                                        const isRequesting = requestingClubIds instanceof Set && requestingClubIds.has(clubId);
                                        const isMember = isLoggedUserMemberOfClub(club);

                                        const statusConfig = isPending
                                            ? { icon: Clock3, label: 'Pendente', classes: 'bg-yellow-400 text-slate-900' }
                                            : isRejected
                                                ? { icon: XCircle, label: 'Recusada', classes: 'bg-pink-500 text-white' }
                                                : isAccepted
                                                    ? { icon: CheckCircle2, label: 'Aceita', classes: 'bg-cyan-300 text-slate-900' }
                                                    : isMember
                                                        ? { icon: CheckCircle2, label: 'Participando', classes: 'bg-cyan-300 text-slate-900' }
                                                        : null;

                                        const StatusIcon = statusConfig?.icon || null;

                                        return (
                                            <article key={clubId} className="rounded-[2rem] border-[3px] border-slate-900 bg-white p-5 shadow-sm">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-black text-slate-900 uppercase truncate">{club?.nome || 'Clube'}</p>
                                                        <p className="text-[11px] font-bold text-slate-600 mt-1 truncate">{club?.escola_nome || schoolOverview.schoolLabel}</p>
                                                    </div>
                                                    {statusConfig && (
                                                        <span className={`inline-flex items-center gap-1.5 rounded-full border-[3px] border-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm ${statusConfig.classes}`}>
                                                            {StatusIcon && <StatusIcon className="w-3.5 h-3.5 stroke-[3]" />}
                                                            {statusConfig.label}
                                                        </span>
                                                    )}
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleStudentJoinRequest(clubId)}
                                                    disabled={isMember || isPending || isAccepted || isRequesting}
                                                    className="mt-4 w-full rounded-full px-5 py-3 text-xs font-black uppercase tracking-wider bg-cyan-300 text-slate-900 border-[3px] border-slate-900 shadow-sm hover:bg-cyan-200 hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:pointer-events-none"
                                                >
                                                    {isMember ? 'Participando' : isRequesting ? 'Enviando...' : isPending ? 'Aguardando' : isAccepted ? 'Aceita' : isRejected ? 'Tentar Novamente' : 'Solicitar Entrada'}
                                                </button>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </section>

                    <MembershipCardGenerator
                        viewingClub={viewingClub}
                        viewingClubSchool={viewingClubSchool}
                        mentors={[...viewingClubOrientadores, ...viewingClubCoorientadores]}
                        students={viewingClubInvestigadores}
                        clubBannerUrl={clubBannerUrl}
                        clubLogoUrl={clubLogoUrl}
                        loggedUser={loggedUser}
                        canManageTemplate={canManageClub}
                        onChangeTemplate={(templateId) => handleUpdateClubCardTemplate(viewingClubId, templateId)}
                    />

                    <section className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                        <div className="xl:col-span-5 bg-white border-[3px] border-slate-900 rounded-[3rem] p-8 md:p-10 shadow-lg relative">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-6 border-b-[3px] border-slate-900 pb-4 flex items-center gap-3">
                                <BookOpen className="w-7 h-7 stroke-[2.5] text-pink-500" /> Descrição do Clube
                            </h3>
                            <p className="text-sm md:text-base font-bold text-slate-700 leading-relaxed whitespace-pre-line">
                                {clubDescription || 'Clube ativo na unidade escolar com foco em pesquisa, inovação e formação científica.'}
                            </p>
                        </div>

                        <div className="xl:col-span-7 bg-white border-[3px] border-slate-900 rounded-[3rem] p-8 md:p-10 shadow-lg relative">
                            <div className="flex items-center justify-between gap-4 mb-8 border-b-[3px] border-slate-900 pb-5">
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                                    <FileText className="w-7 h-7 stroke-[2.5] text-cyan-500" /> Documentos de Criação
                                </h3>
                                <span className="inline-flex items-center justify-center rounded-full border-[3px] border-slate-900 bg-yellow-400 text-slate-900 text-sm font-black px-4 py-1.5 shadow-sm">
                                    {clubDocuments.filter((item) => item.isAvailable).length}/{clubDocuments.length}
                                </span>
                            </div>

                            <div className="space-y-4">
                                {clubDocuments.map((documentItem) => {
                                    const sizeLabel = formatFileSize(documentItem.sizeBytes);
                                    const isLoadingDocument = loadingDocumentKeys.has(documentItem.key);
                                    return (
                                        <div
                                            key={documentItem.key}
                                            className={`rounded-[2rem] border-[3px] border-slate-900 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors ${
                                                documentItem.isAvailable ? 'bg-cyan-50 hover:bg-cyan-100' : 'bg-slate-50'
                                            }`}
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-slate-900 uppercase">{documentItem.label}</p>
                                                <p className="text-xs font-bold text-slate-600 mt-1 truncate">
                                                    {documentItem.isAvailable ? documentItem.fileName : 'Documento ainda não enviado'}
                                                </p>
                                                {(sizeLabel || documentItem.contentType) && documentItem.isAvailable && (
                                                    <p className="text-[10px] font-black text-slate-500 mt-2 uppercase tracking-wider">
                                                        {[sizeLabel, documentItem.contentType].filter(Boolean).join(' - ')}
                                                    </p>
                                                )}
                                            </div>

                                            {documentItem.isAvailable ? (
                                                <button
                                                    type="button"
                                                    onClick={() => void handleOpenDocument(documentItem)}
                                                    disabled={isLoadingDocument}
                                                    className="inline-flex items-center justify-center gap-2 rounded-full border-[3px] border-slate-900 bg-white px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-900 shadow-sm hover:scale-105 active:scale-95 transition-transform"
                                                >
                                                    <Eye className="w-4 h-4 stroke-[3]" /> {isLoadingDocument ? 'Carregando...' : 'Visualizar'}
                                                </button>
                                            ) : (
                                                <span className="inline-flex items-center justify-center rounded-full border-[3px] border-slate-900 bg-slate-200 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500">
                                                    Pendente
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {canManageClub && (
                        <div className="bg-white border-[3px] border-slate-900 rounded-[3rem] p-8 md:p-10 shadow-lg relative">
                            <div className="flex items-center justify-between gap-4 mb-8 border-b-[3px] border-slate-900 pb-5">
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                                    <Users className="w-7 h-7 stroke-[2.5] text-yellow-500" /> Solicitações de Entrada
                                </h3>
                                <span className="inline-flex items-center justify-center rounded-full border-[3px] border-slate-900 bg-pink-400 text-white text-lg font-black px-5 py-1.5 shadow-sm transform -2">
                                    {clubJoinRequests.length}
                                </span>
                            </div>

                            {clubJoinRequests.length === 0 ? (
                                <div className="rounded-[2rem] border-[3px] border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-lg font-bold text-slate-500 uppercase tracking-widest">
                                    Nenhuma solicitação pendente.
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {clubJoinRequests.map((request) => {
                                        const requestId = String(request?.id || '').trim();
                                        const requesterName = String(request?.solicitante_nome || 'Estudante').trim();
                                        const requesterEmail = String(request?.solicitante_email || '').trim();
                                        const requestDate = formatRequestDate(request?.createdAt);
                                        const isReviewing = reviewingClubRequestIds instanceof Set && reviewingClubRequestIds.has(requestId);

                                        return (
                                            <div key={requestId} className="rounded-[2.5rem] border-[3px] border-slate-900 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                                                    <div>
                                                        <p className="text-xl font-black text-slate-900 uppercase">{requesterName}</p>
                                                        {requesterEmail && <p className="text-sm font-bold text-slate-600 mt-1">{requesterEmail}</p>}
                                                        {requestDate && <p className="text-xs font-black bg-yellow-400 rounded-full inline-block px-3 py-1.5 mt-3 border-[2px] border-slate-900">Solicitado em {requestDate}</p>}
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleMentorDecision(requestId, false)}
                                                            disabled={isReviewing}
                                                            className="rounded-full px-6 py-3 text-sm font-black uppercase tracking-wider border-[3px] border-slate-900 bg-white text-pink-600 hover:bg-pink-50 shadow-sm hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
                                                        >
                                                            Recusar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleMentorDecision(requestId, true)}
                                                            disabled={isReviewing}
                                                            className="rounded-full px-6 py-3 text-sm font-black uppercase tracking-wider border-[3px] border-slate-900 bg-cyan-300 text-slate-900 shadow-sm hover:bg-cyan-200 hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
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

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">
                        {/* STATS GRID */}
                        <div className="md:col-span-4 grid grid-cols-2 gap-4">
                            {[
                                { icon: FolderKanban, count: viewingClubProjects.length, label: "Projetos", color: "bg-cyan-300" },
                                { icon: Users, count: viewingClubUsers.length, label: "Membros", color: "bg-yellow-400" },
                                { icon: BookOpen, count: viewingClubDiaryCount, label: "Registros", color: "bg-white" },
                                { icon: Target, count: viewingClubOrientadores.length + viewingClubCoorientadores.length, label: "Mentores", color: "bg-pink-400" }
                            ].map((stat, i) => (
                                <div key={i} className={`border-[3px] border-slate-900 rounded-[2rem] p-6 flex flex-col justify-between hover:-translate-y-2 transition-transform duration-300 shadow-md hover:shadow-lg ${stat.color} ${stat.color === 'bg-pink-400' ? 'text-white' : 'text-slate-900'}`}>
                                    <div>
                                        <stat.icon className={`w-8 h-8 stroke-[2.5] mb-4 opacity-80 ${stat.color === 'bg-pink-400' ? 'text-white' : 'text-slate-900'}`} />
                                        <h4 className="text-5xl font-black tracking-tighter leading-none">{stat.count}</h4>
                                        <p className="text-xs font-black tracking-widest uppercase mt-3">{stat.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* MENTORES LIST */}
                        <div className="md:col-span-4 bg-white border-[3px] border-slate-900 shadow-lg rounded-[3rem] p-8 relative overflow-hidden">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-6 border-b-[3px] border-slate-900 pb-4 flex items-center gap-3">
                                <GraduationCap className="w-8 h-8 stroke-[2.5] text-pink-500" /> Mentores
                            </h3>
                            
                            <div className="space-y-4 relative overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: "300px" }}>
                                {[...viewingClubOrientadores, ...viewingClubCoorientadores].length === 0 ? (
                                    <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-[2rem] border-[3px] border-dashed border-slate-300 font-bold uppercase tracking-widest">
                                        Sem mentores.
                                    </div>
                                ) : (
                                    [...viewingClubOrientadores, ...viewingClubCoorientadores].map((person) => {
                                        const summary = getLattesSummary(person);
                                        const areas = getLattesAreas(person);
                                        return (
                                        <div 
                                            key={person.id} 
                                            onClick={(e) => handleUserClick(e, person)}
                                            className="p-5 rounded-[2rem] bg-white border-[3px] border-slate-900 hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-full overflow-hidden bg-pink-400 text-white flex items-center justify-center text-xl font-black border-[3px] border-slate-900 shadow-sm shrink-0">
                                                        {getAvatarSrc(person) ? (
                                                            <img
                                                                src={getAvatarSrc(person)}
                                                                alt={person.nome || 'Mentor'}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <span>{getInitials(person.nome)}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-base font-black text-slate-900 uppercase truncate max-w-[140px]">{person.nome.split(' ').slice(0, 2).join(' ')}</p>
                                                        <p className="text-[10px] text-slate-700 bg-slate-100 px-3 py-1 rounded-full mt-1.5 border-[2px] border-slate-200 inline-block uppercase tracking-widest font-black">
                                                            {viewingClubOrientadores.includes(person) ? 'Mentor' : 'Co-Mentor'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {getLattesLink(person) && (
                                                    <a 
                                                        href={getLattesLink(person)} 
                                                        target="_blank" 
                                                        rel="noreferrer" 
                                                        onClick={(e) => e.stopPropagation()} 
                                                        className="w-10 h-10 rounded-full bg-cyan-300 text-slate-900 border-[3px] border-slate-900 flex items-center justify-center hover:bg-yellow-400 shadow-sm hover:scale-110 active:scale-95 transition-transform shrink-0" 
                                                        title="Ver Lattes"
                                                    >
                                                        <ExternalLink className="w-4 h-4 stroke-[3]" />
                                                    </a>
                                                )}
                                            </div>
                                            {summary && (
                                                <p className="mt-4 text-xs font-bold text-slate-600 leading-relaxed line-clamp-2">{summary}</p>
                                            )}
                                            {areas.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {areas.map((area) => (
                                                        <span key={area} className="rounded-full bg-slate-50 border-[2px] border-slate-200 text-slate-600 px-3 py-1 text-[9px] font-black uppercase tracking-wider">
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

                        {/* CLUBISTAS LIST */}
                        <div className="md:col-span-4 bg-white border-[3px] border-slate-900 shadow-lg rounded-[3rem] p-8 relative overflow-hidden">
                            <div className="flex items-center justify-between gap-4 mb-6 border-b-[3px] border-slate-900 pb-4">
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                                    <Microscope className="w-8 h-8 stroke-[2.5] text-cyan-500" /> Clubistas
                                </h3>
                                <span className="bg-yellow-400 border-[3px] border-slate-900 rounded-full px-4 py-1.5 text-sm font-black shadow-sm">
                                    {viewingClubInvestigadores.length}
                                </span>
                            </div>

                            <div className="space-y-4 relative overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: "300px" }}>
                                {viewingClubInvestigadores.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-[2rem] border-[3px] border-dashed border-slate-300 font-bold uppercase tracking-widest">
                                        Nenhum estudante.
                                    </div>
                                ) : (
                                    viewingClubInvestigadores.map((person) => (
                                        <div 
                                            key={person.id} 
                                            onClick={(e) => handleUserClick(e, person)}
                                            className="p-5 rounded-[2rem] bg-white border-[3px] border-slate-900 hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between gap-4"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-full overflow-hidden bg-cyan-300 text-slate-900 flex items-center justify-center text-xl font-black border-[3px] border-slate-900 shadow-sm shrink-0">
                                                    {getAvatarSrc(person) ? (
                                                        <img
                                                            src={getAvatarSrc(person)}
                                                            alt={person.nome || 'Clubista'}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <span>{getInitials(person.nome)}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-base font-black text-slate-900 uppercase truncate max-w-[140px]">{person.nome.split(' ').slice(0, 2).join(' ')}</p>
                                                    <p className="text-[10px] text-slate-600 bg-slate-100 px-3 py-1 rounded-full mt-1.5 border-[2px] border-slate-200 inline-block uppercase tracking-widest font-black">
                                                        Clubista
                                                    </p>
                                                </div>
                                            </div>
                                            {getLattesLink(person) && (
                                                <a 
                                                    href={getLattesLink(person)} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-10 h-10 rounded-full bg-yellow-400 text-slate-900 border-[3px] border-slate-900 flex items-center justify-center hover:bg-cyan-300 shadow-sm hover:scale-110 active:scale-95 transition-transform shrink-0" 
                                                    title="Ver Lattes"
                                                >
                                                    <ExternalLink className="w-4 h-4 stroke-[3]" />
                                                </a>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* PROJECTS GRID */}
                    <div className="pt-16 relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                            <div className="inline-flex items-center gap-4 bg-white border-[3px] border-slate-900 shadow-md px-8 py-5 rounded-[3rem] transform --1">
                                <div className="w-5 h-10 bg-cyan-300 border-[3px] border-slate-900 rounded-full"></div>
                                <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Projetos Ativos</h3>
                            </div>
                        </div>

                        {viewingClubProjects.length === 0 ? (
                            <div className="relative">
                                <div className="bg-white border-[3px] border-slate-900 shadow-lg rounded-[3rem] p-16 text-center z-10 relative">
                                    <EmptyState icon={Asterisk} title="NENHUM PROJETO DETECTADO" description="O radar deste clube está limpo. Que tal iniciar a primeira onda de inovação?" />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                {viewingClubProjects.map((project) => {
                                    const projectId = String(project?.id || '').trim();
                                    const isCompleted = project.status?.toLowerCase().includes('conclu');
                                    const projectImage = project?.imagens?.[0] || project?.imagem || '';
                                    const imageCount = Array.isArray(project?.imagens) ? project.imagens.length : (project?.imagem ? 1 : 0);
                                    const canEditProject = canMentorDeleteProject(project);
                                    const canDeleteProject = canMentorDeleteProject(project);
                                    const isDeletingProject = deletingProjectIds.has(projectId);
                                    const actionGridClass = canDeleteProject ? 'grid-cols-3' : (canEditProject ? 'grid-cols-2' : 'grid-cols-1');

                                    return (
                                        <div key={project.id} className="group relative bg-white border-[3px] border-slate-900 rounded-[3rem] overflow-hidden transition-all duration-500 hover:-translate-y-2 shadow-lg hover:shadow-2xl flex flex-col min-h-[480px]">
                                            <div className="h-56 w-full bg-slate-50 overflow-hidden relative border-b-[3px] border-slate-900">
                                                {projectImage ? (
                                                    <img
                                                        src={projectImage}
                                                        alt={project.titulo || 'Imagem do projeto'}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90"
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[linear-gradient(135deg,#fde047_0%,#67e8f9_100%)] p-6 text-center opacity-80">
                                                        <div className="rounded-full border-[3px] border-slate-900 bg-white p-4 shadow-sm">
                                                            <FolderKanban className="w-8 h-8 text-slate-900 stroke-[3]" />
                                                        </div>
                                                    </div>
                                                )}

                                                {imageCount > 1 && (
                                                    <span className="absolute top-5 right-5 px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-yellow-400 text-slate-900 rounded-full border-[3px] border-slate-900 shadow-sm">
                                                        {imageCount} fotos
                                                    </span>
                                                )}
                                            </div>

                                            <div className="p-8 flex flex-col flex-1 bg-white">
                                                <div className="flex justify-between items-start mb-6">
                                                    <span className={`inline-flex items-center px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-[3px] border-slate-900 shadow-sm ${isCompleted ? 'bg-cyan-300 text-slate-900' : 'bg-yellow-400 text-slate-900'}`}>
                                                        <span className={`w-2 h-2 rounded-full mr-2 border border-slate-900 ${isCompleted ? 'bg-white' : 'bg-slate-900 animate-pulse'}`}></span>
                                                        {project.status || 'Em andamento'}
                                                    </span>
                                                </div>

                                                <h4 className="font-black text-2xl text-slate-900 uppercase tracking-tight leading-[1.1] mb-4 group-hover:text-pink-500 transition-colors">{project.titulo || 'Projeto sem título'}</h4>

                                                <p className="text-sm font-bold text-slate-600 line-clamp-3 mb-8 flex-1 leading-relaxed">{project.descricao || project.introducao || 'Projeto aguardando documentação descritiva.'}</p>

                                                <div className="mt-auto pt-6 border-t-[3px] border-slate-100 border-dashed">
                                                    {project.area_tematica && (
                                                        <div className="mb-5">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 bg-cyan-100 rounded-full px-4 py-2 border-[2px] border-slate-300">
                                                                {project.area_tematica}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className={`grid ${actionGridClass} gap-3`}>
                                                        <button
                                                            onClick={() => { setSelectedClubId(viewingClub.id); setSelectedProjectId(String(project.id || '').trim()); setCurrentView('diario'); }}
                                                            className="w-full text-center bg-cyan-300 text-slate-900 px-4 py-3.5 rounded-full border-[3px] border-slate-900 font-black text-xs uppercase tracking-widest transition-transform shadow-sm hover:scale-105 active:scale-95"
                                                        >
                                                            Acessar Diário
                                                        </button>

                                                        {canEditProject && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEditProjectClick(project)}
                                                                className="w-full inline-flex items-center justify-center gap-2 bg-white text-slate-900 border-[3px] border-slate-900 rounded-full px-4 py-3.5 font-black text-xs uppercase tracking-widest transition-transform shadow-sm hover:scale-105 active:scale-95"
                                                            >
                                                                <Pencil className="w-4 h-4 stroke-[3]" /> Editar
                                                            </button>
                                                        )}

                                                        {canDeleteProject && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteProjectClick(project)}
                                                                disabled={isDeletingProject}
                                                                className="w-full inline-flex items-center justify-center gap-2 bg-pink-500 text-white border-[3px] border-slate-900 rounded-full px-4 py-3.5 font-black text-xs uppercase tracking-widest transition-transform shadow-sm hover:scale-105 active:scale-95 disabled:opacity-50"
                                                            >
                                                                <Trash2 className="w-4 h-4 stroke-[3]" />
                                                                {isDeletingProject ? '...' : 'Apagar'}
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
