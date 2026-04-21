import React, { useMemo, useState } from 'react';
import { User, Map as MapIcon, FolderKanban, Users, BookOpen, Microscope, ExternalLink, Target, GraduationCap, PlusCircle, Sparkles, Zap, Building2, Pencil, Clock3, CheckCircle2, XCircle, Trash2, Asterisk, FileText, Eye } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import EmptyState from '../shared/EmptyState';
import CreateProjectForm from './CreateProjectForm';
import CreateClubForm from './CreateClubForm';
import EditClubForm from './EditClubForm';
import ModalPerfil from './ModalPerfil'; 
import { db } from '../../../firebase';
import { getAvatarSrc, getInitials, getLattesAreas, getLattesLink, getLattesSummary } from '../../utils/helpers';
import { CLUB_REQUIRED_DOCUMENTS } from '../../constants/appConstants';

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
    const [resolvedDocumentUrls, setResolvedDocumentUrls] = useState({});
    const [loadingDocumentKeys, setLoadingDocumentKeys] = useState(new Set());
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
    const clubDescription = String(viewingClub?.descricao || '').trim();
    const clubDocuments = useMemo(() => {
        const source = viewingClub?.documentos && typeof viewingClub.documentos === 'object'
            ? viewingClub.documentos
            : {};

        return CLUB_REQUIRED_DOCUMENTS.map((requiredDoc) => {
            const rawDocument = source?.[requiredDoc.key];
            const dataUrl = typeof rawDocument === 'string'
                ? String(rawDocument || '').trim()
                : String(
                    rawDocument?.data_url
                    || rawDocument?.dataUrl
                    || rawDocument?.url
                    || rawDocument?.base64
                    || ''
                ).trim();
            const storageMode = String(rawDocument?.storage_mode || rawDocument?.storageMode || '').trim();
            const chunkCount = Math.max(0, Number(rawDocument?.chunk_count || rawDocument?.chunkCount || 0));
            const contentType = String(
                rawDocument?.content_type
                || rawDocument?.mime_type
                || rawDocument?.mimeType
                || ''
            ).trim();
            const fileName = String(
                rawDocument?.nome_arquivo
                || rawDocument?.file_name
                || rawDocument?.name
                || `${requiredDoc.key}.pdf`
            ).trim();
            const sizeBytes = Number(
                rawDocument?.tamanho_bytes
                || rawDocument?.size
                || 0
            );

            return {
                key: requiredDoc.key,
                label: requiredDoc.label,
                isAvailable: Boolean(dataUrl) || chunkCount > 0 || storageMode === 'firestore_chunks',
                url: dataUrl,
                storageMode,
                chunkCount,
                fileName: fileName || `${requiredDoc.key}.pdf`,
                contentType,
                sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : 0,
            };
        });
    }, [viewingClub?.documentos]);

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

    const formatFileSize = (sizeBytes) => {
        const value = Number(sizeBytes || 0);
        if (!Number.isFinite(value) || value <= 0) {
            return '';
        }

        const kb = value / 1024;
        if (kb < 1024) {
            return `${kb >= 100 ? kb.toFixed(0) : kb.toFixed(1)} KB`;
        }

        const mb = kb / 1024;
        return `${mb.toFixed(2)} MB`;
    };

    const buildChunkDocId = (documentKey, index) => `${String(documentKey || 'doc').trim()}_${index}`;

    const resolveDocumentUrl = async (documentItem) => {
        const directUrl = String(documentItem?.url || '').trim();
        if (directUrl) {
            return directUrl;
        }

        const cachedUrl = String(resolvedDocumentUrls?.[documentItem.key] || '').trim();
        if (cachedUrl) {
            return cachedUrl;
        }

        const clubId = String(viewingClub?.id || '').trim();
        const chunkCount = Math.max(0, Number(documentItem?.chunkCount || 0));
        if (!clubId || chunkCount <= 0) {
            return '';
        }

        setLoadingDocumentKeys((previous) => {
            const next = new Set(previous);
            next.add(documentItem.key);
            return next;
        });

        try {
            const chunkSnapshots = await Promise.all(
                Array.from({ length: chunkCount }, (_, index) => getDoc(
                    doc(db, 'clubes', clubId, 'documentos_chunks', buildChunkDocId(documentItem.key, index))
                ))
            );

            const assembledDataUrl = chunkSnapshots
                .map((chunkSnap) => String(chunkSnap?.data()?.chunk || ''))
                .join('');

            if (!assembledDataUrl) {
                return '';
            }

            setResolvedDocumentUrls((previous) => ({
                ...previous,
                [documentItem.key]: assembledDataUrl
            }));

            return assembledDataUrl;
        } finally {
            setLoadingDocumentKeys((previous) => {
                const next = new Set(previous);
                next.delete(documentItem.key);
                return next;
            });
        }
    };

    const handleOpenDocument = async (documentItem) => {
        if (!documentItem?.isAvailable) {
            return;
        }

        try {
            const url = await resolveDocumentUrl(documentItem);
            if (!url) {
                setMembershipRequestFeedback({ type: 'error', message: 'Nao foi possivel carregar este documento agora.' });
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
            ...(club?.coorientador_ids || []).map((id) => String(id || '').trim())
        ].filter(Boolean);

        const mentorNames = [...new Set(clubMentorIds)]
            .map((id) => String(usersById.get(id)?.nome || '').trim())
            .filter(Boolean);

        return mentorNames.length > 0 ? mentorNames.join(', ') : 'Mentor não informado';
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
            setMembershipRequestFeedback({
                type: 'success',
                message: accept ? 'Clubista aprovado e vinculado ao clube.' : 'Solicitação recusada com sucesso.'
            });
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
                <div className="relative min-h-[80vh] w-full font-sans text-slate-900 bg-[#F4F4F0] selection:bg-teal-400 p-4 md:p-6 lg:p-8 overflow-hidden">
                    {/* PADRÃO DE FUNDO - GRID NEO-BRUTALISTA */}
                    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a15_2px,transparent_2px),linear-gradient(to_bottom,#0f172a15_2px,transparent_2px)] bg-[size:40px_40px]"></div>
                    </div>
                    
                    <div className="relative max-w-6xl mx-auto space-y-8">
                        <div className="rounded-[2rem] border-4 border-slate-900 bg-white shadow-[12px_12px_0px_0px_#0f172a] p-8 md:p-12 mb-10">
                            <div className="inline-flex items-center gap-2 bg-yellow-300 px-4 py-2 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform -rotate-1 mb-6">
                                <Asterisk className="w-5 h-5 text-slate-900 stroke-[3]" />
                                <span className="font-black uppercase tracking-widest text-sm text-slate-900">Explore o Ecossistema</span>
                            </div>
                            
                            <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase leading-[0.9] mb-4">
                                Clubes da sua <br/>
                                <span className="text-white [-webkit-text-stroke:2px_#0f172a]">Unidade Escolar</span>
                            </h2>
                            <p className="text-slate-800 font-bold mt-2 max-w-2xl text-lg">
                                Explore os clubes disponíveis, veja identidade visual, equipe e estrutura de cada um para solicitar sua entrada.
                            </p>

                            <div className="mt-8 flex flex-wrap gap-4">
                                <span className="inline-flex items-center gap-2 bg-teal-400 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] px-4 py-2 text-sm font-black text-slate-900 uppercase">
                                    <Building2 className="w-5 h-5 stroke-[2.5]" />
                                    {schoolClubDiscoveryList.length} clube{schoolClubDiscoveryList.length === 1 ? '' : 's'} encontrado{schoolClubDiscoveryList.length === 1 ? '' : 's'}
                                </span>
                                <span className="inline-flex items-center gap-2 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] px-4 py-2 text-sm font-black text-slate-900 uppercase">
                                    <MapIcon className="w-5 h-5 stroke-[2.5]" />
                                    {String(loggedUser?.escola_nome || '').trim() || 'Unidade escolar vinculada'}
                                </span>
                            </div>
                        </div>

                        {membershipRequestFeedback.message && (
                            <div
                                className={`rounded-xl border-4 p-4 text-sm font-black uppercase shadow-[6px_6px_0px_0px_#0f172a] ${
                                    membershipRequestFeedback.type === 'error'
                                        ? 'bg-red-400 text-slate-900 border-slate-900'
                                        : 'bg-teal-400 text-slate-900 border-slate-900'
                                }`}
                            >
                                {membershipRequestFeedback.message}
                            </div>
                        )}

                        {schoolClubDiscoveryList.length === 0 ? (
                            <div className="bg-white border-4 border-slate-900 rounded-[2rem] p-12 text-center shadow-[12px_12px_0px_0px_#0f172a]">
                                <Building2 className="w-16 h-16 text-slate-900 mx-auto mb-6 stroke-[2]" />
                                <p className="text-slate-900 font-black text-2xl uppercase">Nenhum clube disponível</p>
                                <p className="text-slate-700 font-bold mt-2 text-lg">Assim que um clube da sua unidade estiver ativo, ele aparecerá aqui para solicitação.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {schoolClubDiscoveryList.map((club) => {
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
                                            label: 'Solicitação pendente',
                                            classes: 'bg-yellow-300 text-slate-900 border-slate-900'
                                        }
                                        : isRejected
                                            ? {
                                                icon: XCircle,
                                                label: 'Solicitação recusada',
                                                classes: 'bg-red-400 text-slate-900 border-slate-900'
                                            }
                                            : isAccepted
                                                ? {
                                                    icon: CheckCircle2,
                                                    label: 'Solicitação aceita',
                                                    classes: 'bg-teal-400 text-slate-900 border-slate-900'
                                                }
                                                : null;

                                    const StatusIcon = statusConfig?.icon || null;
                                    const bannerUrl = String(club?.banner_url || club?.banner || '').trim();
                                    const logoUrl = String(club?.logo_url || club?.logo || '').trim();
                                    const displayBanner = bannerUrl;

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
                                        <article key={clubId} className="group bg-white border-4 border-slate-900 rounded-[2rem] overflow-hidden shadow-[8px_8px_0px_0px_#0f172a] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[12px_12px_0px_0px_#0f172a] transition-all duration-300">
                                            <div className="relative h-48 overflow-hidden border-b-4 border-slate-900 bg-slate-100">
                                                {displayBanner ? (
                                                    <img
                                                        src={displayBanner}
                                                        alt={`Banner do clube ${club?.nome || ''}`}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[linear-gradient(135deg,#fde047_0%,#67e8f9_100%)] p-6 text-center">
                                                        <div className="rounded-2xl border-4 border-slate-900 bg-white p-4 shadow-[4px_4px_0px_0px_#0f172a]">
                                                            <Building2 className="w-8 h-8 text-slate-900 stroke-[3]" />
                                                        </div>
                                                        <p className="max-w-[16rem] border-2 border-slate-900 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
                                                            Clube sem banner cadastrado
                                                        </p>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-slate-900/20 mix-blend-multiply" />

                                                {statusConfig && (
                                                    <div className={`absolute top-4 left-4 inline-flex items-center gap-2 border-2 px-3 py-1.5 text-xs font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_#0f172a] ${statusConfig.classes}`}>
                                                        {StatusIcon && <StatusIcon className="w-4 h-4 stroke-[3]" />}
                                                        {statusConfig.label}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-8">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] bg-white shrink-0 -mt-16 relative  flex items-center justify-center">
                                                        {logoUrl ? (
                                                            <img src={logoUrl} alt={`Logo do clube ${club?.nome || ''}`} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-3xl font-black text-slate-900">
                                                                {getInitials(club?.nome || '')}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="text-2xl font-black text-slate-900 uppercase truncate tracking-tight">{club?.nome || 'Clube sem nome'}</h3>
                                                        <p className="text-sm font-bold text-slate-600 truncate mt-1">
                                                            {club?.escola_nome || club?.escola_id || 'Unidade não informada'}
                                                        </p>
                                                        <p className="text-xs font-bold text-slate-900 uppercase bg-yellow-300 inline-block px-2 py-1 mt-2 border-2 border-slate-900">
                                                            Mentor: {resolveMentorNames(club)}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-6 grid grid-cols-4 gap-3">
                                                    {[
                                                        { v: memberCount, l: "Membros", c: "bg-teal-400" },
                                                        { v: clubistasCount, l: "Clubistas", c: "bg-blue-400" },
                                                        { v: mentorCount, l: "Mentores", c: "bg-pink-400" },
                                                        { v: projectsCount, l: "Projetos", c: "bg-yellow-300" }
                                                    ].map((stat, i) => (
                                                        <div key={i} className={`rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] p-3 text-center ${stat.c}`}>
                                                            <p className="text-2xl font-black text-slate-900 leading-none">{stat.v}</p>
                                                            <p className="text-[9px] uppercase tracking-widest font-black text-slate-900 mt-1">{stat.l}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                <p className="mt-6 text-sm font-bold text-slate-800 line-clamp-3 bg-slate-50 p-4 border-2 border-slate-900 rounded-xl">
                                                    {String(club?.descricao || '').trim() || 'Clube ativo na unidade escolar com foco em pesquisa, inovação e formação científica.'}
                                                </p>

                                                <button
                                                    type="button"
                                                    onClick={() => handleStudentJoinRequest(clubId)}
                                                    disabled={isPending || isAccepted || isRequesting}
                                                    className="mt-6 w-full rounded-xl px-4 py-4 text-base font-black uppercase tracking-wider bg-teal-400 text-slate-900 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a] transition-all disabled:opacity-50 disabled:pointer-events-none"
                                                >
                                                    {isRequesting
                                                        ? 'Enviando solicitação...'
                                                        : isPending
                                                            ? 'Aguardando Resposta'
                                                            : isAccepted
                                                                ? 'Solicitação Aceita'
                                                                : isRejected
                                                                    ? 'Solicitar Novamente'
                                                                    : 'Solicitar Entrada'}
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className="relative min-h-[80vh] w-full font-sans text-slate-900 bg-[#F4F4F0] p-4 md:p-6 lg:p-8 overflow-hidden  flex items-center justify-center">
                <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a15_2px,transparent_2px),linear-gradient(to_bottom,#0f172a15_2px,transparent_2px)] bg-[size:40px_40px]"></div>
                </div>

                <div className="relative  bg-white p-12 md:p-16 rounded-[2rem] border-4 border-slate-900 shadow-[16px_16px_0px_0px_#0f172a] text-center max-w-2xl transform -rotate-1 hover:rotate-0 transition-transform">
                    <Building2 className="w-20 h-20 text-slate-900 mx-auto mb-8 stroke-[2]" />
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4">Selecione um <span className="bg-yellow-300 px-2 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">Ecossistema</span></h2>
                    <p className="text-slate-800 font-bold text-lg mb-8">Navegue pelo Feed de Inovação e clique no ícone da escola em um projeto para revelar o universo de colaboração do clube.</p>
                    
                    {isMentor && (
                        <button
                            type="button"
                            onClick={() => setIsCreateClubOpen(true)}
                            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-teal-400 text-slate-900 font-black uppercase tracking-wider text-base hover:-translate-y-1 hover:-translate-x-1 transition-all border-2 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] hover:shadow-[10px_10px_0px_0px_#0f172a]"
                        >
                            <PlusCircle className="w-6 h-6 stroke-[3]" />
                            Criar Clube na Unidade
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
    
    return (
        <>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #0f172a; border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
            `}</style>

            <div className="min-h-screen bg-[#F4F4F0] text-slate-900 pb-32 font-sans selection:bg-teal-400 selection:text-slate-900 overflow-x-hidden relative">
                {/* PADRÃO DE FUNDO - GRID (BLUEPRINT) NEO-BRUTALISTA */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a15_2px,transparent_2px),linear-gradient(to_bottom,#0f172a15_2px,transparent_2px)] bg-[size:40px_40px]"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 space-y-12 relative ">
             
                    {/* Header do Clube Neo-Brutalista */}
                    <div className="relative overflow-hidden rounded-[2rem] bg-white border-4 border-slate-900 min-h-[360px] flex flex-col justify-end p-8 md:p-12 shadow-[12px_12px_0px_0px_#0f172a]">
                        <div className="absolute inset-0 pointer-events-none border-b-4 border-slate-900 bg-slate-200">
                            {clubBannerUrl ? (
                                <img
                                    src={clubBannerUrl}
                                    alt={`Banner do clube ${viewingClub.nome}`}
                                    className="w-full h-full object-cover opacity-90 "
                                />
                            ) : (
                                <div className="absolute inset-0 bg-yellow-300 opacity-50" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent" />
                        </div>

                        <div className="relative  flex flex-col lg:flex-row gap-8 justify-between items-end">
                            <div className="max-w-4xl flex-1 flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
                                <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] bg-white overflow-hidden flex items-center justify-center shrink-0">
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

                                <div className="flex-1 pb-2">
                                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter mb-4 leading-[0.9]">
                                        {viewingClub.nome}
                                    </h1>

                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                        <p className="text-slate-800 font-bold text-sm md:text-base flex items-center gap-2 bg-yellow-300 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] px-4 py-2">
                                            <MapIcon className="w-5 h-5 stroke-[2.5]" /> {viewingClubSchool?.nome || 'Escola não vinculada'}
                                        </p>
                                        <span className="inline-flex items-center gap-2 bg-teal-400 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] px-4 py-2 text-sm font-black text-slate-900 uppercase">
                                            <Microscope className="w-5 h-5 stroke-[2.5]" />
                                            {investigatorCount} pesquisador{investigatorCount === 1 ? '' : 'es'}
                                        </span>
                                        <span className="text-xs font-black text-white bg-slate-900 px-3 py-2.5 uppercase tracking-widest border-2 border-slate-900 shadow-[4px_4px_0px_0px_#cbd5e1]">
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
                                        className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] text-slate-900 font-black uppercase text-xs tracking-wider transition-all"
                                    >
                                        <Pencil className="w-4 h-4 stroke-[3]" /> Editar Clube
                                    </button>
                                )}

                                {isMentor && (
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateClubOpen(true)}
                                        className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] text-slate-900 font-black uppercase text-xs tracking-wider transition-all"
                                    >
                                        <PlusCircle className="w-4 h-4 stroke-[3]" /> Criar Clube
                                    </button>
                                )}

                                <button 
                                    onClick={() => setIsCreateOpen(!isCreateOpen)} 
                                    className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-teal-400 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] text-slate-900 font-black uppercase text-sm tracking-wider transition-all"
                                >
                                    <Zap className={`w-5 h-5 stroke-[2.5] transition-transform ${isCreateOpen ? 'rotate-45' : ''}`} />
                                    {isCreateOpen ? 'Cancelar Criação' : 'Novo Projeto'}
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
                            onSuccess={() => {}}
                        />
                    )}

                    {membershipRequestFeedback.message && (
                        <div className={`rounded-xl border-4 border-slate-900 px-6 py-4 text-sm font-black uppercase shadow-[6px_6px_0px_0px_#0f172a] ${
                            membershipRequestFeedback.type === 'error' ? 'bg-red-400 text-slate-900' : 'bg-teal-400 text-slate-900'
                        }`}>
                            {membershipRequestFeedback.message}
                        </div>
                    )}

                    <section className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                        <div className="xl:col-span-5 bg-white border-4 border-slate-900 rounded-3xl p-8 shadow-[8px_8px_0px_0px_#0f172a]">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-6 border-b-4 border-slate-900 pb-4 flex items-center gap-3">
                                <BookOpen className="w-7 h-7 stroke-[2.5]" /> Descricao do Clube
                            </h3>
                            <p className="text-sm md:text-base font-bold text-slate-800 leading-relaxed whitespace-pre-line">
                                {clubDescription || 'Clube ativo na unidade escolar com foco em pesquisa, inovacao e formacao cientifica.'}
                            </p>
                        </div>

                        <div className="xl:col-span-7 bg-white border-4 border-slate-900 rounded-3xl p-8 shadow-[8px_8px_0px_0px_#0f172a]">
                            <div className="flex items-center justify-between gap-4 mb-6 border-b-4 border-slate-900 pb-4">
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                                    <FileText className="w-7 h-7 stroke-[2.5]" /> Documentos de Criacao
                                </h3>
                                <span className="inline-flex items-center justify-center rounded-lg border-2 border-slate-900 bg-yellow-300 text-slate-900 text-sm font-black px-3 py-1 shadow-[2px_2px_0px_0px_#0f172a]">
                                    {clubDocuments.filter((item) => item.isAvailable).length}/{clubDocuments.length}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {clubDocuments.map((documentItem) => {
                                    const sizeLabel = formatFileSize(documentItem.sizeBytes);
                                    const isLoadingDocument = loadingDocumentKeys.has(documentItem.key);
                                    return (
                                        <div
                                            key={documentItem.key}
                                            className={`rounded-2xl border-2 border-slate-900 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                                                documentItem.isAvailable ? 'bg-teal-50' : 'bg-slate-100'
                                            }`}
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-slate-900 uppercase">{documentItem.label}</p>
                                                <p className="text-xs font-bold text-slate-700 mt-1 truncate">
                                                    {documentItem.isAvailable ? documentItem.fileName : 'Documento ainda nao enviado'}
                                                </p>
                                                {(sizeLabel || documentItem.contentType) && documentItem.isAvailable && (
                                                    <p className="text-[11px] font-black text-slate-700 mt-2 uppercase tracking-wider">
                                                        {[sizeLabel, documentItem.contentType].filter(Boolean).join(' - ')}
                                                    </p>
                                                )}
                                            </div>

                                            {documentItem.isAvailable ? (
                                                <button
                                                    type="button"
                                                    onClick={() => void handleOpenDocument(documentItem)}
                                                    disabled={isLoadingDocument}
                                                    className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all"
                                                >
                                                    <Eye className="w-4 h-4 stroke-[3]" /> {isLoadingDocument ? 'Carregando...' : 'Visualizar'}
                                                </button>
                                            ) : (
                                                <span className="inline-flex items-center justify-center rounded-xl border-2 border-slate-900 bg-red-300 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
                                                    Pendente
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {canSwitchManagedClubs && (
                        <div className="bg-white border-4 border-slate-900 rounded-3xl p-8 shadow-[8px_8px_0px_0px_#0f172a]">
                            <div className="flex items-center justify-between gap-4 mb-6 border-b-4 border-slate-900 pb-4">
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Seus Clubes</h3>
                                <span className="inline-flex items-center justify-center rounded-lg border-2 border-slate-900 bg-yellow-300 text-slate-900 text-lg font-black px-4 py-1 shadow-[2px_2px_0px_0px_#0f172a]">
                                    {managedClubs.length}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-4">
                                {managedClubs.map((club) => {
                                    const clubId = String(club?.id || '').trim();
                                    const isActive = String(viewingClub?.id || '').trim() === clubId;
                                    const clubLogo = String(club?.logo_url || club?.logo || '').trim();

                                    return (
                                        <button
                                            key={clubId}
                                            type="button"
                                            onClick={() => handleSelectManagedClub(clubId)}
                                            className={`inline-flex items-center gap-3 rounded-xl px-4 py-3 border-2 border-slate-900 font-black text-sm uppercase tracking-wider transition-all ${
                                                isActive
                                                    ? 'bg-blue-400 text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] -translate-y-1 -translate-x-1'
                                                    : 'bg-white text-slate-600 hover:bg-blue-50 shadow-[2px_2px_0px_0px_#0f172a] hover:shadow-[4px_4px_0px_0px_#0f172a]'
                                            }`}
                                        >
                                            <span className="w-8 h-8 rounded-lg overflow-hidden border-2 border-slate-900 bg-slate-100 flex items-center justify-center shrink-0">
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

                    {canManageClub && (
                        <div className="bg-white border-4 border-slate-900 rounded-3xl p-8 shadow-[8px_8px_0px_0px_#0f172a]">
                            <div className="flex items-center justify-between gap-4 mb-6 border-b-4 border-slate-900 pb-4">
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Solicitações de Entrada</h3>
                                <span className="inline-flex items-center justify-center rounded-lg border-2 border-slate-900 bg-pink-400 text-slate-900 text-lg font-black px-4 py-1 shadow-[2px_2px_0px_0px_#0f172a]">
                                    {clubJoinRequests.length}
                                </span>
                            </div>

                            {clubJoinRequests.length === 0 ? (
                                <div className="rounded-2xl border-4 border-dashed border-slate-900 bg-slate-50 px-6 py-10 text-center text-lg font-bold text-slate-500 uppercase tracking-widest">
                                    Nenhuma solicitação pendente.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {clubJoinRequests.map((request) => {
                                        const requestId = String(request?.id || '').trim();
                                        const requesterName = String(request?.solicitante_nome || 'Estudante').trim();
                                        const requesterEmail = String(request?.solicitante_email || '').trim();
                                        const requestDate = formatRequestDate(request?.createdAt);
                                        const isReviewing = reviewingClubRequestIds instanceof Set && reviewingClubRequestIds.has(requestId);

                                        return (
                                            <div key={requestId} className="rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-[4px_4px_0px_0px_#0f172a]">
                                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                                                    <div>
                                                        <p className="text-xl font-black text-slate-900 uppercase">{requesterName}</p>
                                                        {requesterEmail && <p className="text-sm font-bold text-slate-600 mt-1">{requesterEmail}</p>}
                                                        {requestDate && <p className="text-xs font-black bg-yellow-300 inline-block px-2 py-1 mt-2 border border-slate-900">Solicitado em {requestDate}</p>}
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleMentorDecision(requestId, false)}
                                                            disabled={isReviewing}
                                                            className="rounded-xl px-6 py-3 text-sm font-black uppercase tracking-wider border-2 border-slate-900 bg-red-400 text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all disabled:opacity-50"
                                                        >
                                                            Recusar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleMentorDecision(requestId, true)}
                                                            disabled={isReviewing}
                                                            className="rounded-xl px-6 py-3 text-sm font-black uppercase tracking-wider border-2 border-slate-900 bg-teal-400 text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all disabled:opacity-50"
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

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 relative ">
                        {/* STATS GRID */}
                        <div className="md:col-span-4 grid grid-cols-2 gap-4">
                            {[
                                { icon: FolderKanban, count: viewingClubProjects.length, label: "Projetos", color: "bg-teal-400" },
                                { icon: Users, count: viewingClubUsers.length, label: "Membros", color: "bg-yellow-300" },
                                { icon: BookOpen, count: viewingClubDiaryCount, label: "Registros", color: "bg-blue-400" },
                                { icon: Target, count: viewingClubOrientadores.length + viewingClubCoorientadores.length, label: "Mentores", color: "bg-pink-400" }
                            ].map((stat, i) => (
                                <div key={i} className={`border-4 border-slate-900 rounded-3xl p-6 flex flex-col justify-between hover:-translate-y-1 hover:-translate-x-1 transition-all duration-300 shadow-[4px_4px_0px_0px_#0f172a] hover:shadow-[8px_8px_0px_0px_#0f172a] ${stat.color}`}>
                                    <div>
                                        <stat.icon className="w-8 h-8 text-slate-900 stroke-[2.5] mb-4 opacity-80" />
                                        <h4 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">{stat.count}</h4>
                                        <p className="text-sm font-black tracking-widest uppercase text-slate-900 mt-2">{stat.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* MENTORES LIST */}
                        <div className="md:col-span-4 bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] rounded-3xl p-8 relative overflow-hidden">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-6 border-b-4 border-slate-900 pb-4 flex items-center gap-3">
                                <GraduationCap className="w-8 h-8 stroke-[2.5]" /> Mentores
                            </h3>
                            
                            <div className="space-y-4 relative  overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: "300px" }}>
                                {[...viewingClubOrientadores, ...viewingClubCoorientadores].length === 0 ? (
                                    <div className="text-center py-10 text-slate-500 bg-[#F4F4F0] rounded-xl border-4 border-dashed border-slate-900 font-bold uppercase tracking-widest">
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
                                            className="p-4 rounded-2xl bg-white border-2 border-slate-900 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-pink-400 text-slate-900 flex items-center justify-center text-lg font-black border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
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
                                                        <p className="text-base font-black text-slate-900 uppercase truncate max-w-[150px]">{person.nome.split(' ').slice(0, 2).join(' ')}</p>
                                                        <p className="text-[10px] text-slate-600 bg-slate-100 px-2 py-1 mt-1 border border-slate-900 inline-block uppercase tracking-widest font-black">
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
                                                        className="w-10 h-10 rounded-xl bg-blue-400 text-slate-900 border-2 border-slate-900 flex items-center justify-center hover:bg-yellow-300 shadow-[2px_2px_0px_0px_#0f172a] transition-all" 
                                                        title="Ver Lattes"
                                                    >
                                                        <ExternalLink className="w-5 h-5 stroke-[2.5]" />
                                                    </a>
                                                )}
                                            </div>
                                            {summary && (
                                                <p className="mt-4 text-xs font-bold text-slate-700 leading-relaxed line-clamp-2">{summary}</p>
                                            )}
                                            {areas.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {areas.map((area) => (
                                                        <span key={area} className="rounded-md bg-slate-100 border border-slate-900 text-slate-900 px-2 py-1 text-[9px] font-black uppercase tracking-wider">
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
                        <div className="md:col-span-4 bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] rounded-3xl p-8 relative overflow-hidden">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-6 border-b-4 border-slate-900 pb-4 flex items-center justify-between">
                                <div className="flex items-center gap-3"><Microscope className="w-8 h-8 stroke-[2.5]" /> Clubistas</div>
                                <span className="bg-yellow-300 border-2 border-slate-900 px-3 py-1 text-sm shadow-[2px_2px_0px_0px_#0f172a]">{viewingClubInvestigadores.length}</span>
                            </h3>

                            <div className="space-y-4 relative  overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: "300px" }}>
                                {viewingClubInvestigadores.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500 bg-[#F4F4F0] rounded-xl border-4 border-dashed border-slate-900 font-bold uppercase tracking-widest">
                                        Nenhum estudante.
                                    </div>
                                ) : (
                                    viewingClubInvestigadores.map((person) => (
                                        <div 
                                            key={person.id} 
                                            onClick={(e) => handleUserClick(e, person)}
                                            className="p-4 rounded-2xl bg-white border-2 border-slate-900 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all cursor-pointer group flex items-center justify-between gap-4"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-teal-400 text-slate-900 flex items-center justify-center text-lg font-black border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
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
                                                    <p className="text-base font-black text-slate-900 uppercase truncate max-w-[150px]">{person.nome.split(' ').slice(0, 2).join(' ')}</p>
                                                    <p className="text-[10px] text-slate-600 bg-slate-100 px-2 py-1 mt-1 border border-slate-900 inline-block uppercase tracking-widest font-black">
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
                                                    className="w-10 h-10 rounded-xl bg-blue-400 text-slate-900 border-2 border-slate-900 flex items-center justify-center hover:bg-yellow-300 shadow-[2px_2px_0px_0px_#0f172a] transition-all" 
                                                    title="Ver Lattes"
                                                >
                                                    <ExternalLink className="w-5 h-5 stroke-[2.5]" />
                                                </a>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* PROJECTS GRID */}
                    <div className="pt-16 relative ">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                            <div className="inline-flex items-center gap-4 bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] px-6 py-4 rounded-2xl transform -rotate-1">
                                <div className="w-4 h-8 bg-teal-400 border-2 border-slate-900"></div>
                                <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Projetos Ativos</h3>
                            </div>
                        </div>

                        {viewingClubProjects.length === 0 ? (
                            <div className="bg-white border-4 border-slate-900 shadow-[12px_12px_0px_0px_#0f172a] rounded-[2.5rem] p-16 text-center transform hover:rotate-1 transition-transform">
                                <EmptyState icon={Asterisk} title="NENHUM PROJETO DETECTADO" description="O radar deste clube está limpo. Que tal iniciar a primeira onda de inovação?" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                                        <div key={project.id} className="group relative bg-white border-4 border-slate-900 rounded-[2rem] overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:-translate-x-2 shadow-[8px_8px_0px_0px_#0f172a] hover:shadow-[16px_16px_0px_0px_#0f172a] flex flex-col min-h-[460px]">
                                            <div className="h-56 w-full bg-slate-100 overflow-hidden relative border-b-4 border-slate-900">
                                                {projectImage ? (
                                                    <img
                                                        src={projectImage}
                                                        alt={project.titulo || 'Imagem do projeto'}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 "
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[linear-gradient(135deg,#fde047_0%,#67e8f9_100%)] p-6 text-center">
                                                        <div className="rounded-2xl border-4 border-slate-900 bg-white p-4 shadow-[4px_4px_0px_0px_#0f172a]">
                                                            <FolderKanban className="w-8 h-8 text-slate-900 stroke-[3]" />
                                                        </div>
                                                        <p className="max-w-[16rem] border-2 border-slate-900 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
                                                            Projeto sem imagem cadastrada
                                                        </p>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-yellow-300/20 mix-blend-multiply" />

                                                {imageCount > 1 && (
                                                    <span className="absolute top-4 right-4 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-blue-400 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
                                                        {imageCount} fotos
                                                    </span>
                                                )}
                                            </div>

                                            <div className="p-8 flex flex-col flex-1 bg-[#FAFAFA]">
                                                <div className="flex justify-between items-start mb-6">
                                                    <span className={`inline-flex items-center px-4 py-2 text-[10px] font-black uppercase tracking-widest border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] ${isCompleted ? 'bg-teal-400 text-slate-900' : 'bg-yellow-300 text-slate-900'}`}>
                                                        <span className={`w-2 h-2 rounded-full mr-2 border border-slate-900 ${isCompleted ? 'bg-white' : 'bg-slate-900 animate-pulse'}`}></span>
                                                        {project.status || 'Em andamento'}
                                                    </span>
                                                </div>

                                                <h4 className="font-black text-2xl text-slate-900 uppercase tracking-tighter leading-[1.1] mb-4">{project.titulo || 'Projeto sem título'}</h4>

                                                <p className="text-sm font-bold text-slate-600 line-clamp-3 mb-8 flex-1 leading-relaxed">{project.descricao || project.introducao || 'Projeto aguardando documentação descritiva.'}</p>

                                                <div className="mt-auto pt-6 border-t-4 border-slate-900 border-dashed">
                                                    {project.area_tematica && (
                                                        <div className="mb-4">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 bg-pink-400 px-3 py-1.5 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
                                                                {project.area_tematica}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className={`grid ${actionGridClass} gap-3`}>
                                                        <button
                                                            onClick={() => { setSelectedClubId(viewingClub.id); setSelectedProjectId(project.id); setCurrentView('diario'); }}
                                                            className="w-full text-center bg-teal-400 text-slate-900 px-4 py-3 border-2 border-slate-900 font-black text-xs uppercase tracking-widest transition-all shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#0f172a]"
                                                        >
                                                            Acessar Diário
                                                        </button>

                                                        {canEditProject && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEditProjectClick(project)}
                                                                className="w-full inline-flex items-center justify-center gap-2 bg-white text-slate-900 border-2 border-slate-900 px-4 py-3 font-black text-xs uppercase tracking-widest transition-all shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#0f172a]"
                                                            >
                                                                <Pencil className="w-4 h-4 stroke-[3]" /> Editar
                                                            </button>
                                                        )}

                                                        {canDeleteProject && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteProjectClick(project)}
                                                                disabled={isDeletingProject}
                                                                className="w-full inline-flex items-center justify-center gap-2 bg-red-400 text-slate-900 border-2 border-slate-900 px-4 py-3 font-black text-xs uppercase tracking-widest transition-all shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#0f172a] disabled:opacity-50"
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
