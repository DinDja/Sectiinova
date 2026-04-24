import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getCountFromServer,
    getDocs,
    getDoc,
    onSnapshot,
    limit,
    orderBy,
    query,
    setDoc,
    startAfter,
    serverTimestamp,
    where,
    writeBatch,
    updateDoc,
    deleteField,
} from 'firebase/firestore';
import {
    browserLocalPersistence,
    browserSessionPersistence,
    createUserWithEmailAndPassword,
    deleteUser,
    GoogleAuthProvider,
    onAuthStateChanged,
    OAuthProvider,
    reload,
    sendEmailVerification,
    sendPasswordResetEmail,
    setPersistence,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut
} from 'firebase/auth';

import { db, auth } from '../../firebase';
import { getLattesLink, composeMentoriaLabel } from '../utils/helpers';
import {
    getAuthErrorMessage as getAuthSecurityErrorMessage,
    shouldRequireEmailVerification,
    validateRegistrationPassword
} from '../utils/authSecurity';
import { compressImageToBase64 } from '../utils/imageCompression';
import { STAGES, PROJECTS_PAGE_SIZE, CLUB_REQUIRED_DOCUMENTS } from '../constants/appConstants';
import {
    buildProjectEntries,
    getProjectTeam,
    getInvestigatorDisplayNames,
    getPrimaryUserClubId,
    getUserClubIds,
    getUserSchoolIds,
    normalizeIdList,
    normalizePerfil,
    withLegacyUserMembership
} from '../services/projectService';
import cachedDataService from '../services/cachedDataService';
import indexedDBService from '../services/indexedDBService';
import useAppControllerState from './useAppControllerState';
import useProjectSearch from './useProjectSearch';
import useSchoolCatalog from './useSchoolCatalog';
import useClubDocumentManager from './useClubDocumentManager';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

const isLocalhostEnvironment = () => {
    if (typeof window === 'undefined') return false;
    return LOCAL_HOSTNAMES.has(String(window.location?.hostname || '').toLowerCase());
};

const getDataUrlByteSize = (dataUrl) => {
    const base64 = String(dataUrl || '').split(',')[1] || '';
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    return Math.ceil((base64.length * 3) / 4) - padding;
};

const DIARY_PROJECT_QUERY_CHUNK_SIZE = 10;
const MAX_PROJECT_IMAGES = 5;
const CLUB_CARD_TEMPLATE_IDS = new Set(['neo', 'classic', 'tech']);
const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 5 * 60 * 1000;
const EMAIL_VERIFICATION_RESEND_STORAGE_PREFIX = 'auth:verificationResend:';
const MAX_SELF_SCHOOL_CHANGES = 1;

const normalizeClubCardTemplate = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return CLUB_CARD_TEMPLATE_IDS.has(normalized) ? normalized : 'neo';
};

const normalizeEmailAddress = (value) => String(value || '').trim().toLowerCase();
const isEnovaMentorEmail = (email) => /@enova\.educacao\.ba\.gov\.br$/.test(normalizeEmailAddress(email));

const resolveProjectClubId = (project) => {
    if (!project || typeof project !== 'object') return '';
    return String(
        project.clube_id ||
        project.clubeId ||
        project.club_id ||
        project.clubId ||
        project.clube?.id ||
        project.club?.id ||
        ''
    ).trim();
};

const getEmailVerificationResendStorageKey = (email) => {
    const normalizedEmail = normalizeEmailAddress(email);
    if (!normalizedEmail) return '';
    return `${EMAIL_VERIFICATION_RESEND_STORAGE_PREFIX}${normalizedEmail}`;
};

const readVerificationResendTimestamp = (email) => {
    if (typeof window === 'undefined') return 0;

    const storageKey = getEmailVerificationResendStorageKey(email);
    if (!storageKey) return 0;

    const parsed = Number(window.localStorage.getItem(storageKey) || 0);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 0;
    }

    return parsed;
};

const saveVerificationResendTimestamp = (email, timestamp = Date.now()) => {
    if (typeof window === 'undefined') return;

    const storageKey = getEmailVerificationResendStorageKey(email);
    if (!storageKey) return;

    try {
        window.localStorage.setItem(storageKey, String(Number(timestamp) || Date.now()));
    } catch (storageError) {
        console.warn('Falha ao registrar cooldown de verificacao de e-mail:', storageError);
    }
};

const getVerificationResendRemainingMs = (email, now = Date.now()) => {
    const lastSentAt = readVerificationResendTimestamp(email);
    if (!lastSentAt) return 0;

    const elapsed = Number(now) - lastSentAt;
    const remaining = EMAIL_VERIFICATION_RESEND_COOLDOWN_MS - elapsed;
    return remaining > 0 ? remaining : 0;
};

const formatVerificationCooldown = (remainingMs) => {
    const minutes = Math.max(1, Math.ceil(Number(remainingMs || 0) / 60000));
    return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
};

const resolveFallbackNameFromEmail = (email) => {
    const normalizedEmail = normalizeEmailAddress(email);
    if (!normalizedEmail.includes('@')) {
        return 'Usuário';
    }

    return normalizedEmail.split('@')[0] || 'Usuário';
};

const resolveAuthProvider = (user) => {
    const providerIds = Array.isArray(user?.providerData)
        ? user.providerData.map((provider) => String(provider?.providerId || '').trim().toLowerCase())
        : [];

    if (providerIds.includes('google.com')) return 'google';
    if (providerIds.includes('microsoft.com')) return 'microsoft';
    if (providerIds.includes('password')) return 'password';
    return providerIds[0] || 'password';
};

const createDefaultProfileFromAuthUser = (user) => {
    const normalizedEmail = normalizeEmailAddress(user?.email);
    const fullName = String(user?.displayName || '').trim();

    return {
        uid: String(user?.uid || '').trim(),
        nome: fullName || resolveFallbackNameFromEmail(normalizedEmail),
        email: normalizedEmail,
        perfil: 'estudante',
        rede_administrativa: '',
        escolas_ids: [],
        clubes_ids: [],
        escola_id: '',
        escola_nome: '',
        escola_municipio: '',
        escola_uf: 'BA',
        school_change_count: 0,
        school_change_last_reason: '',
        school_change_last_at: null,
        clube_id: '',
        auth_provider: resolveAuthProvider(user),
        createdAt: serverTimestamp()
    };
};

function chunkValues(values, size = DIARY_PROJECT_QUERY_CHUNK_SIZE) {
    const items = Array.isArray(values) ? values : [];
    const chunkSize = Math.max(1, Number(size) || DIARY_PROJECT_QUERY_CHUNK_SIZE);
    const chunks = [];

    for (let index = 0; index < items.length; index += chunkSize) {
        chunks.push(items.slice(index, index + chunkSize));
    }

    return chunks;
}

export default function useAppController() {
    const handledClubDeepLinkRef = useRef(false);
    const {
        currentView,
        setCurrentView,
        isModalOpen,
        setIsModalOpen,
        clubs,
        setClubs,
        projects,
        setProjects,
        allProjects,
        setAllProjects,
        users,
        setUsers,
        schools,
        setSchools,
        diaryEntries,
        setDiaryEntries,
        projectsCursor,
        setProjectsCursor,
        hasMoreProjects,
        setHasMoreProjects,
        isFetchingProjects,
        setIsFetchingProjects,
        projectsTotalCount,
        setProjectsTotalCount,
        selectedClubId,
        setSelectedClubId,
        loadMoreNode,
        loadMoreProjectsRef,
        selectedProjectId,
        setSelectedProjectId,
        searchTerm,
        setSearchTerm,
        loading,
        setLoading,
        savingEntry,
        setSavingEntry,
        creatingClub,
        setCreatingClub,
        updatingClub,
        setUpdatingClub,
        clubJoinRequests,
        setClubJoinRequests,
        myClubJoinRequests,
        setMyClubJoinRequests,
        requestingClubIds,
        setRequestingClubIds,
        reviewingClubRequestIds,
        setReviewingClubRequestIds,
        errorMessage,
        setErrorMessage,
        viewingClubId,
        setViewingClubId,
        clubProjects,
        setClubProjects,
        myClubProjects,
        setMyClubProjects,
        authUser,
        setAuthUser,
        loggedUser,
        setLoggedUser,
        profileCompletionContext,
        setProfileCompletionContext,
        authLoading,
        setAuthLoading,
        authMode,
        setAuthMode,
        authError,
        setAuthError,
        authNotice,
        setAuthNotice,
        isSubmitting,
        setIsSubmitting,
        schoolSearchTerm,
        setSchoolSearchTerm,
        loginForm,
        setLoginForm,
        registerForm,
        setRegisterForm,
        newEntry,
        setNewEntry,
        sidebarOrder,
        setSidebarOrder,
        isRegisteringRef,
        projectsCursorRef,
        hasMoreProjectsRef,
        isFetchingProjectsRef
    } = useAppControllerState();

    const { deferredSearchTerm, normalizeText, isFuzzyMatch } = useProjectSearch(searchTerm);
    const { hasProvidedClubDocument, normalizeClubDocumentPayload, normalizeClubDocumentsForFirestore } = useClubDocumentManager();
    const {
        filteredSchoolGroups,
        allSchoolUnits,
        fallbackSchoolUnits,
        normalizeSchoolName
    } = useSchoolCatalog({
        redeAdministrativa: registerForm.rede_administrativa,
        schoolSearchTerm
    });

    const normalizeUserEntity = useCallback((userData, forcedId = '') => {
        const base = { ...(userData || {}) };
        if (forcedId && !base.id) {
            base.id = forcedId;
        }

        if (!base.id && base.uid) {
            base.id = String(base.uid);
        }

        return withLegacyUserMembership(base);
    }, []);

    const normalizeSchoolEntity = useCallback((schoolData, forcedId = '') => {
        const base = { ...(schoolData || {}) };
        const resolvedId = String(
            base.escola_id
            || base.id
            || base.cod_inep
            || forcedId
            || ''
        ).trim();

        const resolvedName = String(base.nome || base.escola_nome || '').trim();
        if (!resolvedId || !resolvedName) {
            return null;
        }

        return {
            ...base,
            id: resolvedId,
            escola_id: resolvedId,
            nome: resolvedName
        };
    }, []);

    const getTimestampMillis = useCallback((value) => {
        if (!value) return 0;
        if (typeof value?.toMillis === 'function') {
            return value.toMillis();
        }

        const date = new Date(value);
        const millis = date.getTime();
        return Number.isFinite(millis) ? millis : 0;
    }, []);

    const requestVerificationEmailWithCooldown = useCallback(async (user) => {
        if (!shouldRequireEmailVerification(user)) {
            return { status: 'skipped', remainingMs: 0 };
        }

        const normalizedEmail = normalizeEmailAddress(user?.email);
        if (!normalizedEmail) {
            return { status: 'failed', remainingMs: 0 };
        }

        const remainingMs = getVerificationResendRemainingMs(normalizedEmail);
        if (remainingMs > 0) {
            return { status: 'cooldown', remainingMs };
        }

        try {
            await sendEmailVerification(user);
            saveVerificationResendTimestamp(normalizedEmail);
            return { status: 'sent', remainingMs: 0 };
        } catch (error) {
            const errorCode = String(error?.code || '').trim().toLowerCase();
            if (errorCode === 'auth/too-many-requests') {
                saveVerificationResendTimestamp(normalizedEmail);
                return {
                    status: 'rate-limited',
                    remainingMs: EMAIL_VERIFICATION_RESEND_COOLDOWN_MS
                };
            }

            console.error('Falha ao enviar e-mail de verificacao:', error);
            return { status: 'failed', remainingMs: 0 };
        }
    }, []);

    const buildVerificationPendingNotice = useCallback((resendResult = {}) => {
        const resendStatus = String(resendResult?.status || '').toLowerCase();

        if (resendStatus === 'sent') {
            return 'Seu e-mail ainda nao foi verificado. Reenviamos um novo link para voce concluir a validacao.';
        }

        if (resendStatus === 'cooldown' || resendStatus === 'rate-limited') {
            const waitTime = formatVerificationCooldown(resendResult?.remainingMs);
            return `Seu e-mail ainda nao foi verificado. Ja enviamos um link recentemente. Aguarde ${waitTime} antes de tentar novo reenvio.`;
        }

        return 'Seu e-mail ainda nao foi verificado. Confirme o link enviado para liberar o acesso.';
    }, []);

    const clubsById = useMemo(() => {
        return new Map(clubs.map((club) => [String(club.id), club]));
    }, [clubs]);

    const schoolsById = useMemo(() => {
        const map = new Map();
        schools.forEach((school) => {
            const schoolId = String(school?.id || '').trim();
            const escolaId = String(school?.escola_id || '').trim();

            if (schoolId) {
                map.set(schoolId, school);
            }

            if (escolaId) {
                map.set(escolaId, school);
            }
        });
        return map;
    }, [schools]);

    const projectsCatalog = useMemo(() => {
        const projectsById = new Map();

        [...allProjects, ...projects].forEach((project) => {
            const projectId = String(project?.id || '').trim();
            if (!projectId) {
                return;
            }

            projectsById.set(projectId, { ...project, id: projectId });
        });

        return [...projectsById.values()];
    }, [allProjects, projects]);

    const loggedUserId = String(loggedUser?.id || authUser?.uid || '').trim();

    const isStrictProjectMember = useCallback((project) => {
        if (!project || !loggedUserId) {
            return false;
        }

        const projectMemberIds = normalizeIdList([
            ...(project?.membros_ids || []),
            ...(project?.orientador_ids || []),
            ...(project?.orientadores_ids || []),
            ...(project?.coorientador_ids || []),
            ...(project?.coorientadores_ids || []),
            ...(project?.investigadores_ids || []),
            project?.orientador_id,
            project?.coorientador_id,
            project?.mentor_id,
            project?.autor_id,
            project?.author_id,
            project?.createdBy,
            project?.created_by,
            project?.criador_id,
            project?.creator_id,
            project?.owner_id
        ]);

        return projectMemberIds.includes(loggedUserId);
    }, [loggedUserId]);

    const diaryAccessibleProjectIds = useMemo(() => {
        if (!loggedUserId) {
            return [];
        }

        return normalizeIdList(
            projectsCatalog
                .filter((project) => isStrictProjectMember(project))
                .map((project) => String(project?.id || '').trim())
        );
    }, [projectsCatalog, loggedUserId, isStrictProjectMember]);

    const searchableProjects = useMemo(() => {
        return projectsCatalog.map((project) => {
            const club = clubsById.get(resolveProjectClubId(project));
            const schoolId = String(project.escola_id || club?.escola_id || '');
            const school = schoolsById.get(schoolId);

            const rawSearchText = [
                project.titulo,
                project.tipo,
                project.status,
                project.area_tematica,
                project.descricao,
                project.introducao,
                project.escola_nome,
                project.escola_id,
                club?.nome,
                club?.escola_nome,
                school?.nome
            ]
                .filter(Boolean)
                .join(' ');

            return {
                project,
                searchText: normalizeText(rawSearchText)
            };
        });
    }, [projectsCatalog, clubsById, schoolsById]);

    const myClubIds = useMemo(() => {
        if (!loggedUser) return [];

        const knownClubIds = new Set(
            clubs
                .map((club) => String(club?.id || '').trim())
                .filter(Boolean)
        );

        const fallbackProfileClubIds = normalizeIdList([
            getPrimaryUserClubId(loggedUser),
            ...getUserClubIds(loggedUser)
        ]);

        if (!loggedUserId) {
            if (knownClubIds.size === 0) {
                return fallbackProfileClubIds;
            }

            return fallbackProfileClubIds.filter((clubId) => knownClubIds.has(clubId));
        }

        const membershipClubIds = !loggedUserId
            ? []
            : clubs
                .filter((club) => {
                    const clubMemberIds = normalizeIdList([
                        ...(club?.membros_ids || []),
                        ...(club?.clubistas_ids || []),
                        ...(club?.orientador_ids || []),
                        ...(club?.orientadores_ids || []),
                        ...(club?.coorientador_ids || []),
                        ...(club?.coorientadores_ids || []),
                        club?.mentor_id
                    ]);

                    return clubMemberIds.includes(loggedUserId);
                })
                .map((club) => String(club?.id || '').trim())
                .filter(Boolean);

        const validatedProfileClubIds = fallbackProfileClubIds.filter((clubId) => {
            const club = clubs.find((item) => String(item?.id || '').trim() === String(clubId));
            if (!club) {
                return false;
            }

            const clubMemberIds = normalizeIdList([
                ...(club?.membros_ids || []),
                ...(club?.clubistas_ids || []),
                ...(club?.orientador_ids || []),
                ...(club?.orientadores_ids || []),
                ...(club?.coorientador_ids || []),
                ...(club?.coorientadores_ids || []),
                club?.mentor_id
            ]);

            // Fallback legado: se o clube não tiver listas de membros preenchidas,
            // ainda aceitamos o vínculo vindo do perfil do usuário.
            if (clubMemberIds.length === 0) {
                return true;
            }

            return clubMemberIds.includes(loggedUserId);
        });

        const mergedClubIds = normalizeIdList([...membershipClubIds, ...validatedProfileClubIds]);

        if (knownClubIds.size === 0) {
            return mergedClubIds;
        }

        return mergedClubIds.filter((clubId) => knownClubIds.has(clubId));
    }, [loggedUser, loggedUserId, clubs]);

    const myClubId = useMemo(() => myClubIds[0] || '', [myClubIds]);

    const myClub = useMemo(() => {
        if (!myClubId) return null;
        return clubs.find((club) => String(club.id) === String(myClubId)) || null;
    }, [myClubId, clubs]);

    const mentorManagedClubs = useMemo(() => {
        const perfil = normalizePerfil(loggedUser?.perfil);
        if (!['orientador', 'coorientador'].includes(perfil) || !loggedUserId) {
            return [];
        }

        const loggedUserClubIds = new Set(
            normalizeIdList(getUserClubIds(loggedUser))
        );

        return clubs
            .filter((club) => {
                const clubId = String(club?.id || '').trim();
                if (!clubId) return false;

                const mentorIds = normalizeIdList([
                    club?.mentor_id,
                    ...(club?.orientador_ids || []),
                    ...(club?.orientadores_ids || []),
                    ...(club?.coorientador_ids || []),
                    ...(club?.coorientadores_ids || [])
                ]);

                return mentorIds.includes(loggedUserId) || loggedUserClubIds.has(clubId);
            })
            .sort((a, b) => String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR'));
    }, [clubs, loggedUser, loggedUserId]);

    const canManageViewingClub = useMemo(() => {
        if (!loggedUserId || !viewingClubId) return false;

        const perfil = normalizePerfil(loggedUser?.perfil);
        if (!['orientador', 'coorientador'].includes(perfil)) {
            return false;
        }

        const viewedClub = clubs.find((club) => String(club?.id || '').trim() === String(viewingClubId || '').trim());
        if (!viewedClub) {
            return false;
        }
        const viewedClubId = String(viewedClub?.id || '').trim();

        const mentorIds = new Set(
            normalizeIdList([
                viewedClub?.mentor_id,
                ...(viewedClub?.orientador_ids || []),
                ...(viewedClub?.orientadores_ids || []),
                ...(viewedClub?.coorientador_ids || []),
                ...(viewedClub?.coorientadores_ids || [])
            ])
        );

        const canManageByProfileMembership = myClubIds.includes(viewedClubId);
        return mentorIds.has(loggedUserId) || canManageByProfileMembership;
    }, [loggedUserId, viewingClubId, loggedUser, clubs, myClubIds]);

    const userSchoolIds = useMemo(() => {
        return normalizeIdList(getUserSchoolIds(loggedUser));
    }, [loggedUser]);

    const userSchoolNames = useMemo(() => {
        const names = new Set();
        const profileSchoolName = normalizeSchoolName(loggedUser?.escola_nome || '');
        if (profileSchoolName) {
            names.add(profileSchoolName);
        }

        userSchoolIds.forEach((schoolId) => {
            const normalizedSchoolId = String(schoolId || '').trim();
            if (!normalizedSchoolId) return;
            const mappedSchool = schoolsById.get(normalizedSchoolId);
            const mappedSchoolName = normalizeSchoolName(mappedSchool?.nome || mappedSchool?.escola_nome || '');
            if (mappedSchoolName) {
                names.add(mappedSchoolName);
            }
        });

        return [...names];
    }, [loggedUser?.escola_nome, userSchoolIds, schoolsById, normalizeSchoolName]);

    const schoolClubDiscoveryList = useMemo(() => {
        if (!loggedUser) {
            return [];
        }

        if (userSchoolIds.length === 0 && userSchoolNames.length === 0) {
            return [];
        }

        const userSchoolSet = new Set(userSchoolIds);
        const userSchoolNameSet = new Set(userSchoolNames);

        return clubs
            .filter((club) => {
                const clubSchoolId = String(club?.escola_id || '').trim();
                const mappedSchool = schoolsById.get(clubSchoolId);
                const clubSchoolName = normalizeSchoolName(club?.escola_nome || mappedSchool?.nome || mappedSchool?.escola_nome || '');

                if (clubSchoolId && userSchoolSet.has(clubSchoolId)) {
                    return true;
                }

                if (clubSchoolName && userSchoolNameSet.has(clubSchoolName)) {
                    return true;
                }

                return false;
            })
            .sort((a, b) => String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR'));
    }, [loggedUser, userSchoolIds, userSchoolNames, clubs, schoolsById, normalizeSchoolName]);

    const clubViewSelectableClubIds = useMemo(() => {
        return normalizeIdList([
            ...myClubIds,
            ...schoolClubDiscoveryList.map((club) => String(club?.id || '').trim())
        ]);
    }, [myClubIds, schoolClubDiscoveryList]);

    const initialClubDeepLinkId = useMemo(() => {
        if (typeof window === 'undefined') return '';

        const params = new URLSearchParams(window.location.search);
        const requestedView = String(params.get('view') || '').trim().toLowerCase();
        const requestedClubId = String(params.get('clubId') || params.get('clubeId') || '').trim();

        if (requestedView !== 'clube' || !requestedClubId) {
            return '';
        }

        return requestedClubId;
    }, []);

    const latestMyClubJoinRequestByClubId = useMemo(() => {
        const byClubId = new Map();

        const sorted = [...myClubJoinRequests].sort(
            (a, b) => getTimestampMillis(b?.createdAt) - getTimestampMillis(a?.createdAt)
        );

        sorted.forEach((request) => {
            const clubId = String(request?.clube_id || '').trim();
            if (!clubId || byClubId.has(clubId)) {
                return;
            }

            byClubId.set(clubId, request);
        });

        return byClubId;
    }, [myClubJoinRequests, getTimestampMillis]);

    const isCompletingSocialProfile = useMemo(
        () => Boolean(profileCompletionContext && authUser && !loggedUser),
        [profileCompletionContext, authUser, loggedUser]
    );

    // 🚀 Inicializar cache IndexedDB automaticamente
    useEffect(() => {
        indexedDBService.init().catch((err) => {
            console.error('❌ Erro ao inicializar IndexedDB:', err);
        });
    }, []);

    const fetchProjectsPage = useCallback(async (reset = false) => {
        if (isFetchingProjectsRef.current) {
            return;
        }

        if (!reset && !hasMoreProjectsRef.current) {
            return;
        }

        try {
            isFetchingProjectsRef.current = true;
            setIsFetchingProjects(true);

            const baseConstraints = [orderBy('titulo'), limit(PROJECTS_PAGE_SIZE)];
            const constraints = (!reset && projectsCursorRef.current)
                ? [orderBy('titulo'), startAfter(projectsCursorRef.current), limit(PROJECTS_PAGE_SIZE)]
                : baseConstraints;

            const projectsQuery = query(collection(db, 'projetos'), ...constraints);
            const snapshot = await getDocs(projectsQuery);
            const loadedProjects = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

            setProjects((previousProjects) => {
                if (reset) {
                    return loadedProjects;
                }

                const merged = [...previousProjects, ...loadedProjects];
                return merged.filter((project, index, arr) => arr.findIndex((item) => item.id === project.id) === index);
            });

            const nextCursor = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
            projectsCursorRef.current = nextCursor;
            setProjectsCursor(nextCursor);

            const nextHasMore = snapshot.docs.length === PROJECTS_PAGE_SIZE;
            hasMoreProjectsRef.current = nextHasMore;
            setHasMoreProjects(nextHasMore);
        } catch (error) {
            console.error('Erro ao carregar projetos paginados:', error);
            setErrorMessage('Nao foi possivel carregar os projetos paginados do Banco de Dados. Verifique conexão.');
        } finally {
            isFetchingProjectsRef.current = false;
            setIsFetchingProjects(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadCoreCollections = async () => {
            const loadCollectionFreshFirst = async (collectionName) => {
                try {
                    return await cachedDataService.getCollectionList(collectionName, [], false);
                } catch (freshError) {
                    console.warn(`Falha ao buscar ${collectionName} direto do Firestore. Usando cache local.`, freshError);
                    return cachedDataService.getCollectionList(collectionName, [], true);
                }
            };

            try {
                setLoading(true);

                const loadedClubsPromise = loadCollectionFreshFirst('clubes')
                    .then((clubsList) => {
                        if (Array.isArray(clubsList) && clubsList.length > 0) {
                            return clubsList;
                        }

                        return loadCollectionFreshFirst('clubes_ciencia');
                    })
                    .catch(() => loadCollectionFreshFirst('clubes_ciencia'));

                const [loadedClubs, loadedUsers, loadedSchools] = await Promise.all([
                    loadedClubsPromise,
                    loadCollectionFreshFirst('usuarios'),
                    loadCollectionFreshFirst('unidades_escolares')
                ]);

                const projectsSnapshot = await getDocs(collection(db, 'projetos'));
                const loadedAllProjects = projectsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

                if (!isMounted) {
                    return;
                }

                const normalizedSchools = (loadedSchools || [])
                    .map((school) => normalizeSchoolEntity(school, school?.id))
                    .filter(Boolean);

                const schoolsSource = normalizedSchools.length > 0
                    ? normalizedSchools
                    : fallbackSchoolUnits
                        .map((school) => normalizeSchoolEntity(school, school?.escola_id))
                        .filter(Boolean);

                const schoolsByUniqueId = new Map();
                schoolsSource.forEach((school) => {
                    schoolsByUniqueId.set(String(school.id), school);
                });

                setClubs((loadedClubs || []).map((club) => ({ ...club, id: String(club.id || '').trim() })));
                setUsers((loadedUsers || []).map((user) => normalizeUserEntity(user, user?.id)));
                setSchools([...schoolsByUniqueId.values()]);
                setDiaryEntries([]);
                setAllProjects(loadedAllProjects || []);
            } catch (error) {
                console.error('Erro ao carregar dados iniciais (Firestore/cache):', error);
                if (isMounted) {
                    setErrorMessage('Nao foi possivel carregar os dados iniciais. Verifique conexão.');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        void loadCoreCollections();

        return () => {
            isMounted = false;
        };
    }, [normalizeUserEntity, normalizeSchoolEntity, fallbackSchoolUnits]);

    useEffect(() => {
        let isMounted = true;

        const loadDiaryEntriesByProjectMembership = async () => {
            if (!loggedUser || diaryAccessibleProjectIds.length === 0) {
                if (isMounted) {
                    setDiaryEntries([]);
                }
                return;
            }

            try {
                const projectIdChunks = chunkValues(diaryAccessibleProjectIds, DIARY_PROJECT_QUERY_CHUNK_SIZE);
                const snapshots = await Promise.all(
                    projectIdChunks.map((projectIds) => {
                        const diaryQuery = query(
                            collection(db, 'diario_bordo'),
                            where('projeto_id', 'in', projectIds)
                        );
                        return getDocs(diaryQuery);
                    })
                );

                if (!isMounted) {
                    return;
                }

                const entriesById = new Map();
                snapshots.forEach((snapshot) => {
                    snapshot.docs.forEach((item) => {
                        entriesById.set(item.id, { id: item.id, ...item.data() });
                    });
                });

                const sortedEntries = [...entriesById.values()].sort(
                    (a, b) => getTimestampMillis(b?.createdAt) - getTimestampMillis(a?.createdAt)
                );
                setDiaryEntries(sortedEntries);
            } catch (error) {
                console.error('Erro ao carregar diário por permissao de projeto:', error);
                if (isMounted) {
                    setDiaryEntries([]);
                }
            }
        };

        void loadDiaryEntriesByProjectMembership();

        return () => {
            isMounted = false;
        };
    }, [loggedUser, diaryAccessibleProjectIds, getTimestampMillis]);

    useEffect(() => {
        void fetchProjectsPage(true);
    }, [fetchProjectsPage]);

    useEffect(() => {
        const fetchProjectsTotalCount = async () => {
            try {
                const countSnapshot = await getCountFromServer(collection(db, 'projetos'));
                const count = Number(countSnapshot?.data()?.count || 0);
                setProjectsTotalCount(count || 0);
            } catch (error) {
                console.error('Erro ao carregar quantitativo total de projetos:', error);
            }
        };

        void fetchProjectsTotalCount();
    }, []);

    const filteredSearchProjects = useMemo(() => {
        if (!deferredSearchTerm) {
            return [];
        }

        return searchableProjects
            .filter(({ searchText }) =>
                searchText.includes(deferredSearchTerm) ||
                isFuzzyMatch(deferredSearchTerm, searchText)
            )
            .map(({ project }) => project);
    }, [deferredSearchTerm, searchableProjects]);

    useEffect(() => {
        if (!loadMoreNode) {
            return undefined;
        }

        // Desativar scroll infinito durante busca ativa para evitar carregamento contínuo.
        if (deferredSearchTerm) {
            return undefined;
        }

        const rootElement = document.querySelector('main');
        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;

                if (!entry?.isIntersecting) {
                    return;
                }

                if (currentView !== 'Projetos' || isFetchingProjects || !hasMoreProjects) {
                    return;
                }

                void fetchProjectsPage(false);
            },
            {
                root: rootElement,
                rootMargin: '300px 0px 300px 0px',
                threshold: 0
            }
        );

        observer.observe(loadMoreNode);
        return () => observer.disconnect();
    }, [currentView, fetchProjectsPage, hasMoreProjects, isFetchingProjects, deferredSearchTerm, loadMoreNode]);

    const scopedProjects = deferredSearchTerm ? filteredSearchProjects : projectsCatalog;

    const feedProjects = useMemo(() => {
        return scopedProjects.filter((project) => Boolean(String(project?.id || '').trim()));
    }, [scopedProjects]);

    const normalizedSelectedProjectId = String(selectedProjectId || '').trim();
    const selectedProject = projectsCatalog.find((project) => String(project.id).trim() === normalizedSelectedProjectId)
        || myClubProjects.find((project) => String(project.id || '').trim() === normalizedSelectedProjectId)
        || clubProjects.find((project) => String(project.id || '').trim() === normalizedSelectedProjectId)
        || null;
    const selectedClub =
        clubs.find((club) => String(club.id) === String(selectedClubId).trim())
        ?? clubs.find((club) => String(club.id) === resolveProjectClubId(selectedProject))
        ?? null;
    const selectedSchool = schools.find(
        (school) => String(school?.id || school?.escola_id || '').trim() === String(selectedClub?.escola_id || '').trim()
    ) ?? null;
    const selectedTeam = selectedProject
        ? getProjectTeam(selectedProject, users, selectedClubId)
        : { orientadores: [], coorientadores: [], investigadores: [] };

    const canViewDiary = Boolean(
        selectedProject
        && isStrictProjectMember(selectedProject)
    );

    const leadUser = selectedTeam.orientadores[0]
        ?? selectedTeam.coorientadores[0]
        ?? selectedTeam.investigadores[0]
        ?? null;

    const derivedDiaryEntries = canViewDiary && selectedProject
        ? buildProjectEntries(selectedProject, diaryEntries, selectedTeam)
        : [];

    const currentClubId = selectedClub?.id || viewingClubId || '';
    const canEditDiary = canViewDiary;

    const viewingClub = clubs.find((item) => item.id === viewingClubId) ?? null;
    const viewingClubSchool = schools.find(
        (item) => String(item?.id || item?.escola_id || '').trim() === String(viewingClub?.escola_id || '').trim()
    ) ?? null;
    const viewingClubProjects = viewingClubId ? clubProjects : [];
    const normalizedViewingClubId = String(viewingClubId || '').trim();
    const viewingClubMemberIds = normalizeIdList([
        ...(viewingClub?.membros_ids || []),
        ...(viewingClub?.clubistas_ids || []),
        ...(viewingClub?.orientador_ids || []),
        ...(viewingClub?.orientadores_ids || []),
        ...(viewingClub?.coorientador_ids || []),
        ...(viewingClub?.coorientadores_ids || []),
        viewingClub?.mentor_id
    ]);
    const viewingClubClubistaIds = normalizeIdList(viewingClub?.clubistas_ids || []);

    const viewingClubUsers = users.filter((user) => {
        const userId = String(user?.id || '').trim();
        if (!userId) return false;

        const isInClubDocMembership = viewingClubMemberIds.includes(userId);
        const isInUserProfileMembership = normalizedViewingClubId
            ? getUserClubIds(user).includes(normalizedViewingClubId)
            : false;

        return isInClubDocMembership || isInUserProfileMembership;
    });
    const viewingClubOrientadores = viewingClubUsers.filter((user) => normalizePerfil(user.perfil) === 'orientador');
    const viewingClubCoorientadores = viewingClubUsers.filter((user) => normalizePerfil(user.perfil) === 'coorientador');
    const viewingClubInvestigadores = viewingClubUsers.filter((user) => {
        const perfil = normalizePerfil(user?.perfil);
        if (['orientador', 'coorientador'].includes(perfil)) {
            return false;
        }

        if (['estudante', 'investigador', 'aluno', 'clubista'].includes(perfil)) {
            return true;
        }

        const userId = String(user?.id || '').trim();
        return userId ? viewingClubClubistaIds.includes(userId) : false;
    });
    const viewingClubDiaryCount = diaryEntries.filter((entry) => entry.clube_id === viewingClubId).length;

    const submitDiaryEntry = async (event) => {
        event.preventDefault();

        if (!selectedProject || !selectedClub || !newEntry.title || !newEntry.whatWasDone) {
            return;
        }

        if (!canEditDiary) {
            setErrorMessage('Apenas integrantes do projeto podem registrar no diário de bordo.');
            return;
        }

        try {
            setSavingEntry(true);
            setErrorMessage('');

            await addDoc(collection(db, 'diario_bordo'), {
                title: newEntry.title,
                duration: newEntry.duration || 'Nao informado',
                stage: newEntry.stage,
                whatWasDone: newEntry.whatWasDone,
                discoveries: newEntry.discoveries || 'Nenhuma descoberta registrada nesta sessao.',
                obstacles: newEntry.obstacles || 'Nenhum obstaculo registrado.',
                nextSteps: newEntry.nextSteps || 'A definir.',
                tags: newEntry.tags
                    ? newEntry.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
                    : ['Geral'],
                images: Array.isArray(newEntry.images) ? newEntry.images : [],
                author: leadUser?.nome || 'Registro manual',
                mediator: composeMentoriaLabel(selectedTeam.orientadores, selectedTeam.coorientadores),
                clube_id: selectedClub.id,
                projeto_id: selectedProject.id,
                escola_id: selectedClub.escola_id,
                createdAt: serverTimestamp()
            });

            // 🎯 INVALIDAR CACHE para forçar refetch
            await cachedDataService.invalidateCollection('diario_bordo');

            setNewEntry({ title: '', duration: '', stage: STAGES[0], whatWasDone: '', discoveries: '', obstacles: '', nextSteps: '', tags: '', images: [] });
            setIsModalOpen(false);
            setCurrentView('diario');
        } catch (error) {
            console.error('Erro ao salvar diario de bordo:', error);
            setErrorMessage('Nao foi possivel gravar o novo registro no Banco de Dados. Verifique conexão.');
        } finally {
            setSavingEntry(false);
        }
    };

    const handleAddEntry = (event) => {
        void submitDiaryEntry(event);
    };

    const saveSidebarOrder = async (newOrder) => {
        if (!authUser) return;
        
        try {
            await updateDoc(doc(db, 'usuarios', authUser.uid), {
                sidebarOrder: newOrder
            });
            setSidebarOrder(newOrder);
        } catch (error) {
            console.error('Erro ao salvar ordem do sidebar:', error);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (isRegisteringRef.current) {
                setAuthLoading(false);
                return;
            }

            if (user) {
                try {
                    try {
                        await reload(user);
                    } catch (reloadError) {
                        console.warn('Nao foi possivel atualizar estado de verificacao do e-mail:', reloadError);
                    }

                    if (shouldRequireEmailVerification(user)) {
                        const resendResult = await requestVerificationEmailWithCooldown(user);

                        try {
                            await signOut(auth);
                        } catch (signOutError) {
                            console.error('Falha ao encerrar sessao de conta nao verificada:', signOutError);
                        }

                        setAuthMode('login');
                        setAuthUser(null);
                        setLoggedUser(null);
                        setProfileCompletionContext(null);
                        setAuthNotice({
                            tone: 'warning',
                            message: buildVerificationPendingNotice(resendResult)
                        });
                        setAuthLoading(false);
                        return;
                    }

                    const userRef = doc(db, 'usuarios', user.uid);
                    let snap = await getDoc(userRef);
                    const authProvider = resolveAuthProvider(user);

                    if (!snap.exists()) {
                        if (authProvider === 'google' || authProvider === 'microsoft') {
                            const normalizedEmail = normalizeEmailAddress(user?.email);
                            const fallbackName = String(user?.displayName || '').trim()
                                || resolveFallbackNameFromEmail(normalizedEmail);

                            setAuthUser(user);
                            setLoggedUser(null);
                            setProfileCompletionContext({
                                uid: String(user.uid || '').trim(),
                                provider: authProvider,
                                email: normalizedEmail,
                                nome: fallbackName
                            });
                            setRegisterForm((previous) => ({
                                ...previous,
                                nome: String(previous?.nome || '').trim() || fallbackName,
                                email: normalizedEmail || String(previous?.email || '').trim(),
                                senha: '',
                                confirmarSenha: ''
                            }));
                            setAuthMode('register');
                            setAuthNotice({
                                tone: 'info',
                                message: 'Complete seu cadastro para continuar usando a plataforma.'
                            });
                            setAuthLoading(false);
                            return;
                        }

                        await setDoc(userRef, createDefaultProfileFromAuthUser(user));
                        await cachedDataService.invalidateCollection('usuarios');
                        snap = await getDoc(userRef);

                        setAuthNotice({
                            tone: 'info',
                            message:
                                'Seu perfil foi inicializado automaticamente. Revise seus dados em Meu Perfil para concluir a configuracao.'
                        });
                    } else {
                        setAuthNotice(null);
                    }

                    if (snap.exists()) {
                        const userData = snap.data();
                        const profileEmail = normalizeEmailAddress(userData?.email || user?.email);
                        if (
                            authProvider === 'google'
                            && isMentoriaPerfil(userData?.perfil)
                            && !isEnovaMentorEmail(profileEmail)
                        ) {
                            try {
                                await signOut(auth);
                            } catch (signOutError) {
                                console.error('Falha ao encerrar sessao de mentor fora do dominio Enova:', signOutError);
                            }

                            setAuthMode('login');
                            setAuthUser(null);
                            setLoggedUser(null);
                            setProfileCompletionContext(null);
                            setAuthNotice(null);
                            setAuthError('Orientadores e coorientadores so podem entrar com Google usando e-mail @enova.educacao.ba.gov.br.');
                            setAuthLoading(false);
                            return;
                        }

                        setProfileCompletionContext(null);
                        setAuthUser(user);
                        setLoggedUser(normalizeUserEntity(userData, snap.id));
                        
                        // Carregar ordem do sidebar se existir
                        if (userData.sidebarOrder && Array.isArray(userData.sidebarOrder)) {
                            const defaultOrder = ['Projetos', 'meusProjetos', 'trilha', 'inpi', 'forum', 'clube'];
                            const filteredOrder = userData.sidebarOrder.filter((item) => defaultOrder.includes(item));
                            const mergedOrder = [...new Set([...filteredOrder, ...defaultOrder])];
                            setSidebarOrder(mergedOrder);
                        }
                    } else {
                        setAuthUser(null);
                        setLoggedUser(null);
                    }
                } catch (error) {
                    console.error('Erro ao carregar perfil:', error);
                    setAuthUser(null);
                    setLoggedUser(null);
                    setProfileCompletionContext(null);
                }
            } else {
                setAuthUser(null);
                setLoggedUser(null);
                setProfileCompletionContext(null);
            }

            setAuthLoading(false);
        });

        return () => unsubscribe();
    }, [buildVerificationPendingNotice, normalizeUserEntity, requestVerificationEmailWithCooldown]);

    useEffect(() => {
        if (!loggedUserId) {
            setMyClubJoinRequests([]);
            return () => {};
        }

        const requestsQuery = query(
            collection(db, 'clube_solicitacoes'),
            where('solicitante_id', '==', loggedUserId)
        );

        return onSnapshot(
            requestsQuery,
            (snapshot) => {
                const requests = snapshot.docs
                    .map((item) => ({ id: item.id, ...item.data() }))
                    .sort((a, b) => getTimestampMillis(b?.createdAt) - getTimestampMillis(a?.createdAt));

                setMyClubJoinRequests(requests);
            },
            (error) => {
                console.error('Erro ao carregar solicitacoes de entrada do usuario:', error);
                setMyClubJoinRequests([]);
            }
        );
    }, [loggedUserId, getTimestampMillis]);

    useEffect(() => {
        if (!viewingClubId || !canManageViewingClub) {
            setClubJoinRequests([]);
            return () => {};
        }

        const requestsQuery = query(
            collection(db, 'clube_solicitacoes'),
            where('clube_id', '==', String(viewingClubId).trim())
        );

        return onSnapshot(
            requestsQuery,
            (snapshot) => {
                const requests = snapshot.docs
                    .map((item) => ({ id: item.id, ...item.data() }))
                    .filter((item) => String(item?.status || '').trim().toLowerCase() === 'pendente')
                    .sort((a, b) => getTimestampMillis(b?.createdAt) - getTimestampMillis(a?.createdAt));

                setClubJoinRequests(requests);
            },
            (error) => {
                console.error('Erro ao carregar solicitacoes pendentes do clube:', error);
                setClubJoinRequests([]);
            }
        );
    }, [viewingClubId, canManageViewingClub, getTimestampMillis]);

    useEffect(() => {
        if (!authUser || !loggedUser || clubs.length === 0) {
            return;
        }

        if (clubViewSelectableClubIds.length === 0) {
            return;
        }

        const fallbackClubId = clubViewSelectableClubIds[0];

        setSelectedClubId((currentId) => {
            const normalizedCurrentId = String(currentId || '').trim();
            if (normalizedCurrentId && clubViewSelectableClubIds.includes(normalizedCurrentId)) {
                return normalizedCurrentId;
            }

            return fallbackClubId;
        });

        setViewingClubId((currentId) => {
            const normalizedCurrentId = String(currentId || '').trim();
            if (normalizedCurrentId && clubViewSelectableClubIds.includes(normalizedCurrentId)) {
                return normalizedCurrentId;
            }

            return fallbackClubId;
        });
    }, [clubs, authUser, loggedUser, clubViewSelectableClubIds]);

    useEffect(() => {
        if (currentView !== 'clube') {
            return;
        }

        if (clubViewSelectableClubIds.length === 0) {
            if (String(viewingClubId || '').trim()) {
                setViewingClubId('');
            }

            if (String(selectedClubId || '').trim()) {
                setSelectedClubId('');
            }
            return;
        }

        const fallbackClubId = clubViewSelectableClubIds[0];
        const normalizedViewingClubId = String(viewingClubId || '').trim();
        const normalizedSelectedClubId = String(selectedClubId || '').trim();

        if (!normalizedViewingClubId || !clubViewSelectableClubIds.includes(normalizedViewingClubId)) {
            setViewingClubId(fallbackClubId);
        }

        if (!normalizedSelectedClubId || !clubViewSelectableClubIds.includes(normalizedSelectedClubId)) {
            setSelectedClubId(fallbackClubId);
        }
    }, [currentView, clubViewSelectableClubIds, viewingClubId, selectedClubId]);

    useEffect(() => {
        if (handledClubDeepLinkRef.current || !initialClubDeepLinkId || !authUser || !loggedUser || clubs.length === 0) {
            return;
        }

        const targetClubId = String(initialClubDeepLinkId || '').trim();
        const targetClubExists = clubs.some((club) => String(club?.id || '').trim() === targetClubId);

        if (!targetClubExists) {
            handledClubDeepLinkRef.current = true;
            return;
        }

        handledClubDeepLinkRef.current = true;
        setCurrentView('clube');
        setSelectedClubId(targetClubId);
        setViewingClubId(targetClubId);
    }, [initialClubDeepLinkId, authUser, loggedUser, clubs, setCurrentView, setSelectedClubId, setViewingClubId]);

    useEffect(() => {
        if (!viewingClubId) {
            setClubProjects([]);
            return;
        }

        setClubProjects(
            projectsCatalog.filter((project) => resolveProjectClubId(project) === String(viewingClubId))
        );
    }, [projectsCatalog, viewingClubId]);

    useEffect(() => {
        if (!Array.isArray(myClubIds) || myClubIds.length === 0) {
            setMyClubProjects([]);
            return;
        }

        const myClubIdSet = new Set(
            myClubIds
                .map((clubId) => String(clubId || '').trim())
                .filter(Boolean)
        );

        setMyClubProjects(
            projectsCatalog.filter((project) => myClubIdSet.has(resolveProjectClubId(project)))
        );
    }, [projectsCatalog, myClubIds]);

    const handleLogin = async (event) => {
        event.preventDefault();
        setAuthError('');
        setAuthNotice(null);
        setIsSubmitting(true);

        try {
            const normalizedEmail = String(loginForm.email || '').trim().toLowerCase();
            const persistence = loginForm.rememberDevice
                ? browserLocalPersistence
                : browserSessionPersistence;

            await setPersistence(auth, persistence);
            const userCredential = await signInWithEmailAndPassword(
                auth,
                normalizedEmail,
                loginForm.senha
            );

            await reload(userCredential.user);

            if (shouldRequireEmailVerification(userCredential.user)) {
                const resendResult = await requestVerificationEmailWithCooldown(userCredential.user);

                try {
                    await signOut(auth);
                } catch (signOutError) {
                    console.error('Falha ao encerrar sessao de conta nao verificada:', signOutError);
                }

                setAuthMode('login');
                setLoginForm((previous) => ({
                    ...previous,
                    senha: ''
                }));
                setAuthNotice({
                    tone: 'warning',
                    message: buildVerificationPendingNotice(resendResult)
                });
                return;
            }
        } catch (error) {
            console.error('Erro no login:', error);
            setAuthError(
                getAuthSecurityErrorMessage(error.code, error.message || String(error), {
                    operation: 'login'
                })
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePasswordReset = async () => {
        const normalizedEmail = String(loginForm.email || '').trim().toLowerCase();
        if (!normalizedEmail) {
            setAuthNotice(null);
            setAuthError('Informe seu e-mail para receber o link de redefinicao.');
            return;
        }

        setAuthError('');
        setAuthNotice(null);
        setIsSubmitting(true);

        try {
            await sendPasswordResetEmail(auth, normalizedEmail);
        } catch (error) {
            console.error('Erro ao solicitar redefinicao de senha:', error);
        } finally {
            setAuthNotice({
                tone: 'info',
                message:
                    'Se existir uma conta para este e-mail, enviaremos um link seguro de redefinicao.'
            });
            setIsSubmitting(false);
        }
    };

    const handleRegister = async (event) => {
        event.preventDefault();
        setAuthError('');
        setAuthNotice(null);
        const socialProviderFromContext = String(profileCompletionContext?.provider || '').trim().toLowerCase();
        const isSocialCompletionFlow = Boolean(
            profileCompletionContext
            && authUser
            && String(profileCompletionContext?.uid || '').trim() === String(authUser?.uid || '').trim()
            && (socialProviderFromContext === 'google' || socialProviderFromContext === 'microsoft')
        );

        const escolaUnit = allSchoolUnits.find((unit) => unit.escola_id === registerForm.escola_id);
        if (!escolaUnit) {
            setAuthError('Selecione uma unidade escolar válida.');
            return;
        }
        if (!isSocialCompletionFlow) {
            if (registerForm.senha !== registerForm.confirmarSenha) {
                setAuthError('As senhas não coincidem.');
                return;
            }
            const passwordValidationError = validateRegistrationPassword(registerForm.senha, {
                email: registerForm.email,
                fullName: registerForm.nome
            });
            if (passwordValidationError) {
                setAuthError(passwordValidationError);
                return;
            }
        }
        if (isMentoriaPerfil(registerForm.perfil) && !registerForm.matricula.trim()) {
            setAuthError('Informe a matrícula.');
            return;
        }
        if (isMentoriaPerfil(registerForm.perfil) && registerForm.lattes && !isValidHttpUrl(registerForm.lattes)) {
            setAuthError('Informe um link Lattes válido (https://lattes.cnpq.br/...).');
            return;
        }

        if (isMentoriaPerfil(registerForm.perfil)) {
            const emailNormalized = normalizeEmailAddress(registerForm.email);
            if (!isEnovaMentorEmail(emailNormalized)) {
                setAuthError('Orientadores e coorientadores devem usar e-mail @enova.educacao.ba.gov.br.');
                return;
            }
        }

        setIsSubmitting(true);
        isRegisteringRef.current = !isSocialCompletionFlow;

        try {
            await setPersistence(auth, browserSessionPersistence);

            const normalizedEmail = normalizeEmailAddress(registerForm.email);
            if (isSocialCompletionFlow) {
                const activeSocialUser = auth.currentUser || authUser;
                const activeSocialUserId = String(activeSocialUser?.uid || '').trim();
                const activeSocialUserEmail = normalizeEmailAddress(activeSocialUser?.email);

                if (!activeSocialUserId) {
                    throw new Error('Sessao social expirada. Entre com Google ou Microsoft novamente.');
                }

                if (!activeSocialUserEmail || normalizedEmail !== activeSocialUserEmail) {
                    setAuthError('O e-mail do cadastro deve ser o mesmo da conta social usada no acesso.');
                    return;
                }

                const userRef = doc(db, 'usuarios', activeSocialUserId);
                const existingProfileSnap = await getDoc(userRef);

                if (existingProfileSnap.exists()) {
                    setProfileCompletionContext(null);
                    setAuthUser(activeSocialUser);
                    setLoggedUser(normalizeUserEntity(existingProfileSnap.data(), existingProfileSnap.id));
                    setAuthNotice({
                        tone: 'success',
                        message: 'Cadastro concluido com sucesso.'
                    });
                    return;
                }

                const resolvedEscolasIds = normalizeIdList([escolaUnit.escola_id]);
                const profileData = {
                    uid: activeSocialUserId,
                    nome: registerForm.nome.trim(),
                    email: normalizedEmail,
                    perfil: registerForm.perfil,
                    rede_administrativa: registerForm.rede_administrativa === 'municipal' ? 'municipal' : 'estadual',
                    escolas_ids: resolvedEscolasIds,
                    clubes_ids: [],
                    escola_id: escolaUnit.escola_id,
                    escola_nome: escolaUnit.nome,
                    escola_municipio: String(escolaUnit.municipio || '').trim(),
                    escola_uf: String(escolaUnit.uf || 'BA').trim() || 'BA',
                    school_change_count: 0,
                    school_change_last_reason: '',
                    school_change_last_at: null,
                    clube_id: '',
                    auth_provider: resolveAuthProvider(activeSocialUser),
                    createdAt: serverTimestamp()
                };

                if (isMentoriaPerfil(registerForm.perfil)) {
                    profileData.matricula = registerForm.matricula.trim();
                    profileData.lattes = registerForm.lattes.trim();
                }

                await setDoc(userRef, profileData);
                await cachedDataService.invalidateCollection('usuarios');

                const refreshedProfileSnap = await getDoc(userRef);
                setProfileCompletionContext(null);
                setAuthMode('login');
                setAuthNotice({
                    tone: 'success',
                    message: 'Cadastro concluido com sucesso. Bem-vindo(a)!'
                });

                if (refreshedProfileSnap.exists()) {
                    setAuthUser(activeSocialUser);
                    setLoggedUser(normalizeUserEntity(refreshedProfileSnap.data(), refreshedProfileSnap.id));
                }

                return;
            }

            const userCredential = await createUserWithEmailAndPassword(
                auth,
                normalizedEmail,
                registerForm.senha
            );

            const resolvedEscolasIds = normalizeIdList([escolaUnit.escola_id]);
            const profileData = {
                uid: userCredential.user.uid,
                nome: registerForm.nome.trim(),
                email: normalizedEmail,
                perfil: registerForm.perfil,
                rede_administrativa: registerForm.rede_administrativa === 'municipal' ? 'municipal' : 'estadual',
                escolas_ids: resolvedEscolasIds,
                clubes_ids: [],
                escola_id: escolaUnit.escola_id,
                escola_nome: escolaUnit.nome,
                escola_municipio: String(escolaUnit.municipio || '').trim(),
                escola_uf: String(escolaUnit.uf || 'BA').trim() || 'BA',
                school_change_count: 0,
                school_change_last_reason: '',
                school_change_last_at: null,
                clube_id: '',
                createdAt: serverTimestamp()
            };

            if (isMentoriaPerfil(registerForm.perfil)) {
                profileData.matricula = registerForm.matricula.trim();
                profileData.lattes = registerForm.lattes.trim();
            }

            try {
                await setDoc(doc(db, 'usuarios', userCredential.user.uid), profileData);
            } catch (firestoreError) {
                try {
                    await deleteUser(userCredential.user);
                } catch (deleteError) {
                    console.error('Falha ao deletar usuário após erro no Firestore:', deleteError);
                }
                throw firestoreError;
            }

            // 🎯 INVALIDAR CACHE de usuarios
            await cachedDataService.invalidateCollection('usuarios');

            isRegisteringRef.current = false;
            let verificationNotice = {
                tone: 'warning',
                message:
                    'Conta criada, mas nao foi possivel confirmar o envio do e-mail de verificacao. Tente entrar novamente para receber um novo link.'
            };

            try {
                await sendEmailVerification(userCredential.user);
                saveVerificationResendTimestamp(normalizedEmail);
                verificationNotice = {
                    tone: 'success',
                    message:
                        'Conta criada com sucesso. Verifique seu e-mail antes do primeiro acesso.'
                };
            } catch (verificationError) {
                console.error('Falha ao enviar e-mail de verificacao:', verificationError);
            }

            await signOut(auth);
            setLoginForm({
                email: normalizedEmail,
                senha: '',
                rememberDevice: false
            });
            setAuthMode('login');
            setAuthNotice(verificationNotice);
        } catch (error) {
            isRegisteringRef.current = false;
            console.error('Erro no cadastro (Auth/Firestore):', error);
            setAuthError(
                getAuthSecurityErrorMessage(error.code, error.message || String(error), {
                    operation: 'register'
                })
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSocialAuth = async (providerName) => {
        setAuthError('');
        setAuthNotice(null);
        setIsSubmitting(true);
        setProfileCompletionContext(null);

        try {
            const normalizedProvider = String(providerName || '').trim().toLowerCase();
            const provider = normalizedProvider === 'google'
                ? new GoogleAuthProvider()
                : new OAuthProvider('microsoft.com');

            provider.setCustomParameters({ prompt: 'select_account' });

            const userCredential = await signInWithPopup(auth, provider);
            const user = userCredential.user;
            const normalizedEmail = normalizeEmailAddress(user?.email);

            if (!normalizedEmail) {
                try {
                    await signOut(auth);
                } catch (signOutError) {
                    console.error('Falha ao encerrar sessao social sem e-mail:', signOutError);
                }
                setAuthError('Nao foi possivel obter o e-mail da conta social selecionada.');
                return;
            }

            if (normalizedProvider === 'google') {
                const userRef = doc(db, 'usuarios', user.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const existingProfile = userSnap.data() || {};
                    const existingPerfil = String(existingProfile?.perfil || '').trim().toLowerCase();
                    const existingEmail = normalizeEmailAddress(existingProfile?.email || normalizedEmail);

                    if (isMentoriaPerfil(existingPerfil) && !isEnovaMentorEmail(existingEmail)) {
                        try {
                            await signOut(auth);
                        } catch (signOutError) {
                            console.error('Falha ao encerrar sessao de mentor fora do dominio Enova:', signOutError);
                        }

                        setAuthError('Orientadores e coorientadores so podem entrar com Google usando e-mail @enova.educacao.ba.gov.br.');
                        return;
                    }
                }
            }
        } catch (error) {
            console.error(`Erro no login social (${providerName}):`, error);
            setAuthError(
                getAuthSecurityErrorMessage(error.code, error.message || String(error), {
                    operation: 'login'
                })
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleAuth = async () => {
        await handleSocialAuth('google');
    };

    const handleOutlookAuth = async () => {
        await handleSocialAuth('outlook');
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Erro ao sair:', error);
        }
        setSelectedClubId('');
        setSelectedProjectId('');
        setViewingClubId('');
        setClubProjects([]);
        setMyClubProjects([]);
        setProfileCompletionContext(null);
        setCurrentView('Projetos');
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

    const canCurrentMentorManageProject = (project) => {
        if (!project) {
            return false;
        }

        const currentUserId = String(loggedUser?.id || authUser?.uid || '').trim();
        if (!currentUserId || !isMentoriaPerfil(loggedUser?.perfil)) {
            return false;
        }

        const projectClubId = String(project?.clube_id || '').trim();
        if (projectClubId && myClubIds.includes(projectClubId)) {
            return true;
        }

        const loggedUserEmail = String(loggedUser?.email || '').toLowerCase().trim();
        const loggedUserMatricula = String(loggedUser?.matricula || loggedUser?.['matrícula'] || '').trim();

        try {
            const projectTeam = getProjectTeam(project, users, String(project?.clube_id || '').trim());
            const projectMentors = [
                ...(projectTeam?.orientadores || []),
                ...(projectTeam?.coorientadores || [])
            ];

            const isMentorInProjectTeam = projectMentors.some((member) => {
                const memberId = String(member?.id || '').trim();
                const memberEmail = String(member?.email || '').toLowerCase().trim();
                const memberMatricula = String(member?.matricula || member?.['matrícula'] || '').trim();

                return (
                    (memberId && memberId === currentUserId)
                    || (loggedUserEmail && memberEmail && memberEmail === loggedUserEmail)
                    || (loggedUserMatricula && memberMatricula && memberMatricula === loggedUserMatricula)
                );
            });

            if (isMentorInProjectTeam) {
                return true;
            }
        } catch (error) {
            // fallback para validacao por referencias diretas do projeto
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
            projectMentorReferences.has(currentUserId.toLowerCase())
            || (loggedUserEmail && projectMentorReferences.has(loggedUserEmail))
            || (loggedUserMatricula && projectMentorReferences.has(loggedUserMatricula.toLowerCase()))
        );
    };

    const handleCreateProject = async ({
        titulo,
        descricao,
        area_tematica,
        status,
        tipo,
        coorientador_ids = [],
        investigadores_ids = [],
        imagens = [],
        termo_aceite_criacao = false
    }) => {
        if (!viewingClub) {
            console.warn('[PROJECT_CREATE] bloqueado: viewingClub ausente.');
            setErrorMessage('Selecione um clube para registrar o projeto.');
            return;
        }

        const authUid = String(authUser?.uid || '').trim();
        const creatorId = String(loggedUser?.id || authUid || '').trim();

        if (!creatorId) {
            console.warn('[PROJECT_CREATE] bloqueado: creatorId ausente.', {
                loggedUserId: String(loggedUser?.id || '').trim(),
                authUserUid: authUid
            });
            setErrorMessage('Usuário não autenticado para criação de projeto.');
            return;
        }

        if (!titulo || !String(titulo).trim()) {
            console.warn('[PROJECT_CREATE] bloqueado: titulo ausente.');
            setErrorMessage('Informe o título do projeto.');
            return;
        }

        const isCreatorMentor = isMentoriaPerfil(loggedUser?.perfil);
        if (isCreatorMentor && !termo_aceite_criacao) {
            console.warn('[PROJECT_CREATE] bloqueado: termo de aceite nao marcado.');
            setErrorMessage('Aceite os termos de criação antes de criar o projeto.');
            return;
        }

        const createProjectTimerLabel = '[PROJECT_CREATE] addDoc projetos';
        let addDocTimerStarted = false;
        let authTokenClaimsDebug = null;
        let projectCreateStage = 'start';

        const incomingPayloadDebug = {
            titulo: String(titulo || '').trim(),
            descricaoLength: String(descricao || '').trim().length,
            area_tematica: String(area_tematica || '').trim(),
            status: String(status || '').trim(),
            tipo: String(tipo || '').trim(),
            coorientador_ids: normalizeIdList(Array.isArray(coorientador_ids) ? coorientador_ids : []),
            investigadores_ids: normalizeIdList(Array.isArray(investigadores_ids) ? investigadores_ids : []),
            imagensCount: Array.isArray(imagens) ? imagens.filter((img) => typeof img === 'string' && img.trim()).length : 0,
            termo_aceite_criacao: Boolean(termo_aceite_criacao)
        };

        console.groupCollapsed('[PROJECT_CREATE] inicio');
        console.log('[PROJECT_CREATE] payload de entrada:', incomingPayloadDebug);
        console.log('[PROJECT_CREATE] contexto auth/perfil:', {
            creatorId,
            authUid,
            loggedUserId: String(loggedUser?.id || '').trim(),
            perfil: String(loggedUser?.perfil || '').trim(),
            email: String(loggedUser?.email || '').trim(),
            clube_id: String(loggedUser?.clube_id || '').trim(),
            clubes_ids: normalizeIdList(Array.isArray(loggedUser?.clubes_ids) ? loggedUser.clubes_ids : []),
            myClubIds
        });
        console.log('[PROJECT_CREATE] contexto clube atual:', {
            viewingClubId: String(viewingClub?.id || '').trim(),
            viewingClubNome: String(viewingClub?.nome || '').trim(),
            escola_id: String(viewingClub?.escola_id || '').trim(),
            mentor_id: String(viewingClub?.mentor_id || '').trim(),
            orientador_ids: normalizeIdList(Array.isArray(viewingClub?.orientador_ids) ? viewingClub.orientador_ids : []),
            orientadores_ids: normalizeIdList(Array.isArray(viewingClub?.orientadores_ids) ? viewingClub.orientadores_ids : []),
            coorientador_ids: normalizeIdList(Array.isArray(viewingClub?.coorientador_ids) ? viewingClub.coorientador_ids : []),
            coorientadores_ids: normalizeIdList(Array.isArray(viewingClub?.coorientadores_ids) ? viewingClub.coorientadores_ids : []),
            membrosCount: normalizeIdList(Array.isArray(viewingClub?.membros_ids) ? viewingClub.membros_ids : []).length
        });

        try {
            setErrorMessage('');
            setIsFetchingProjects(true);
            projectCreateStage = 'normalize-input';

            const normalizedViewingClubId = String(viewingClub?.id || '').trim();
            const normalizedViewingSchoolId = String(viewingClub?.escola_id || '').trim();
            let authProfileProbe = {
                loaded: false,
                exists: false,
                perfil: '',
                email: '',
                clube_id: '',
                clubes_ids: []
            };

            try {
                projectCreateStage = 'read-token-claims';
                const tokenResult = typeof authUser?.getIdTokenResult === 'function'
                    ? await authUser.getIdTokenResult()
                    : null;

                authTokenClaimsDebug = {
                    tokenUid: String(tokenResult?.claims?.user_id || authUid || '').trim(),
                    tokenEmail: String(tokenResult?.claims?.email || authUser?.email || '').trim(),
                    tokenEmailVerified: Boolean(tokenResult?.claims?.email_verified),
                    signInProvider: String(tokenResult?.signInProvider || '').trim(),
                    claimsKeys: Object.keys(tokenResult?.claims || {}).slice(0, 20)
                };

                console.log('[PROJECT_CREATE] token claims:', authTokenClaimsDebug);
            } catch (tokenDebugError) {
                console.warn('[PROJECT_CREATE] falha ao ler token claims:', {
                    code: tokenDebugError?.code,
                    message: String(tokenDebugError?.message || '').trim()
                });
            }

            if (!normalizedViewingClubId) {
                throw new Error('Nao foi possivel identificar o clube para criacao do projeto. Recarregue a pagina e tente novamente.');
            }

            if (!normalizedViewingSchoolId) {
                throw new Error('O clube selecionado nao possui escola vinculada. Atualize os dados do clube e tente novamente.');
            }

            try {
                projectCreateStage = 'rule-probe';
                const viewingClubIdForProbe = normalizedViewingClubId;
                const [authProfileSnap, viewingClubSnap] = await Promise.all([
                    authUid
                        ? getDoc(doc(db, 'usuarios', authUid))
                        : Promise.resolve(null),
                    viewingClubIdForProbe
                        ? getDoc(doc(db, 'clubes', viewingClubIdForProbe))
                        : Promise.resolve(null)
                ]);

                const authProfileData = authProfileSnap?.exists() ? authProfileSnap.data() : null;
                const viewingClubData = viewingClubSnap?.exists() ? viewingClubSnap.data() : null;
                authProfileProbe = {
                    loaded: true,
                    exists: Boolean(authProfileSnap?.exists?.()),
                    perfil: String(authProfileData?.perfil || '').trim(),
                    email: String(authProfileData?.email || '').trim(),
                    clube_id: String(authProfileData?.clube_id || '').trim(),
                    clubes_ids: normalizeIdList(Array.isArray(authProfileData?.clubes_ids) ? authProfileData.clubes_ids : [])
                };
                const clubMentorIdsFromFirestore = normalizeIdList([
                    viewingClubData?.mentor_id,
                    ...(viewingClubData?.orientador_ids || []),
                    ...(viewingClubData?.orientadores_ids || []),
                    ...(viewingClubData?.coorientador_ids || []),
                    ...(viewingClubData?.coorientadores_ids || [])
                ]);
                const clubMemberIdsFromFirestore = normalizeIdList([
                    ...(viewingClubData?.membros_ids || []),
                    ...(viewingClubData?.clubistas_ids || []),
                    ...(viewingClubData?.investigadores_ids || [])
                ]);

                console.log('[PROJECT_CREATE] rule probe firestore:', {
                    authUid,
                    authProfileDocExists: Boolean(authProfileSnap?.exists?.()),
                    authProfilePerfil: String(authProfileData?.perfil || '').trim(),
                    authProfileEmail: String(authProfileData?.email || '').trim(),
                    authProfileClubeId: String(authProfileData?.clube_id || '').trim(),
                    authProfileClubesIds: normalizeIdList(Array.isArray(authProfileData?.clubes_ids) ? authProfileData.clubes_ids : []),
                    viewingClubDocExists: Boolean(viewingClubSnap?.exists?.()),
                    viewingClubId: viewingClubIdForProbe,
                    clubMentorIdsFromFirestore,
                    clubMemberIdsCountFromFirestore: clubMemberIdsFromFirestore.length,
                    authUidInClubMentorIds: authUid ? clubMentorIdsFromFirestore.includes(authUid) : false,
                    authUidInClubMemberIds: authUid ? clubMemberIdsFromFirestore.includes(authUid) : false
                });
            } catch (ruleProbeError) {
                console.warn('[PROJECT_CREATE] falha no rule probe firestore:', {
                    message: String(ruleProbeError?.message || '').trim(),
                    code: ruleProbeError?.code
                });
            }

            if (authUid && creatorId && authUid !== creatorId) {
                throw new Error('Sessao inconsistente detectada (auth.uid diferente do perfil carregado). Faca logout e login novamente antes de criar o projeto.');
            }

            if (authUid && authProfileProbe.loaded && !authProfileProbe.exists) {
                throw new Error('Perfil autenticado nao encontrado em usuarios/{uid}. Finalize o cadastro novamente e tente criar o projeto.');
            }

            if (authProfileProbe.loaded && authProfileProbe.exists) {
                const authProfilePerfil = normalizePerfil(authProfileProbe.perfil);
                const authProfileEmail = normalizeEmailAddress(authProfileProbe.email);
                const authTokenEmail = normalizeEmailAddress(authTokenClaimsDebug?.tokenEmail || '');
                const isMentorByProfile = isMentoriaPerfil(authProfilePerfil);
                const isMentorByEmail = isEnovaMentorEmail(authProfileEmail) || isEnovaMentorEmail(authTokenEmail);

                if (!isMentorByProfile && !isMentorByEmail) {
                    throw new Error('Seu perfil autenticado nao possui permissao de mentor para criar projetos.');
                }
            }

            projectCreateStage = 'build-payload';
            const newProjectData = {
                titulo: String(titulo).trim(),
                descricao: String(descricao || '').trim(),
                area_tematica: String(area_tematica || '').trim(),
                status: String(status || 'Em andamento').trim(),
                tipo: String(tipo || 'Projeto Científico').trim(),
                clube_id: normalizedViewingClubId,
                escola_id: normalizedViewingSchoolId,
                createdAt: serverTimestamp()
            };
            if (isCreatorMentor && termo_aceite_criacao) {
                newProjectData.termo_aceite_criacao = {
                    aceito: true,
                    versao: '2026-04-15',
                    termo_id: 'termo_aceite_criacao_projetos_clubes_ciencias',
                    aceito_em: serverTimestamp(),
                    aceito_por_id: creatorId,
                    aceito_por_nome: String(loggedUser?.nome || '').trim(),
                    aceito_por_email: String(loggedUser?.email || '').trim(),
                    aceito_por_perfil: String(loggedUser?.perfil || '').trim()
                };
            }

            const clubMentorIds = normalizeIdList([
                viewingClub?.mentor_id,
                ...(viewingClub?.orientador_ids || []),
                ...(viewingClub?.orientadores_ids || []),
                ...(viewingClub?.coorientador_ids || []),
                ...(viewingClub?.coorientadores_ids || [])
            ]);

            const clubMemberIds = normalizeIdList([
                ...(viewingClub?.membros_ids || []),
                ...(viewingClub?.clubistas_ids || []),
                ...(viewingClub?.investigadores_ids || [])
            ]);

            const allowedMentorIds = new Set(clubMentorIds);
            const allowedInvestigadorIds = new Set(
                clubMemberIds.filter((id) => !allowedMentorIds.has(id))
            );

            const loggedUserIdForCheck = String(loggedUser?.id || '').trim();
            const viewingClubId = normalizedViewingClubId;
            const creatorIsInClubMentorList = allowedMentorIds.has(creatorId);
            const creatorIsInClubMemberList = clubMemberIds.includes(creatorId);
            const creatorHasProfileClubLink = myClubIds.includes(viewingClubId);
            const creatorHasAuthUidInMentorList = authUid ? allowedMentorIds.has(authUid) : false;
            const creatorHasAuthUidInMemberList = authUid ? clubMemberIds.includes(authUid) : false;

            console.log('[PROJECT_CREATE] simulacao local das regras de create:', {
                authUid,
                loggedUserId: loggedUserIdForCheck,
                creatorId,
                authUidMatchesCreatorId: authUid && creatorId ? authUid === creatorId : false,
                authUidMatchesLoggedUserId: authUid && loggedUserIdForCheck ? authUid === loggedUserIdForCheck : false,
                profileMentor: isCreatorMentor,
                creatorIsInClubMentorList,
                creatorIsInClubMemberList,
                creatorHasProfileClubLink,
                creatorHasAuthUidInMentorList,
                creatorHasAuthUidInMemberList,
                firestoreRulePathsApprox: {
                    isMentor: isCreatorMentor,
                    isMyClub: creatorHasProfileClubLink || creatorIsInClubMemberList || creatorIsInClubMentorList,
                    canCreateProjectInClub: creatorIsInClubMentorList
                },
                requiredFieldsPresent: {
                    titulo: Boolean(String(titulo || '').trim()),
                    clube_id: Boolean(viewingClubId),
                    escola_id: Boolean(String(viewingClub?.escola_id || '').trim())
                }
            });

            const requestedCoorientadores = normalizeIdList(Array.isArray(coorientador_ids) ? coorientador_ids : []);
            const requestedInvestigadores = normalizeIdList(Array.isArray(investigadores_ids) ? investigadores_ids : []);

            const invalidInvestigadores = requestedInvestigadores.filter((id) => !allowedInvestigadorIds.has(id));
            console.log('[PROJECT_CREATE] elegibilidade:', {
                clubMentorIdsCount: clubMentorIds.length,
                clubMemberIdsCount: clubMemberIds.length,
                allowedMentorIdsCount: allowedMentorIds.size,
                allowedInvestigadorIdsCount: allowedInvestigadorIds.size,
                requestedCoorientadoresCount: requestedCoorientadores.length,
                requestedInvestigadoresCount: requestedInvestigadores.length,
                invalidInvestigadores
            });

            if (invalidInvestigadores.length > 0) {
                throw new Error('Um ou mais clubistas selecionados nao pertencem ao clube. Atualize a tela e tente novamente.');
            }

            const ignoredCoorientadores = requestedCoorientadores.filter(
                (id) => id !== creatorId && !allowedMentorIds.has(id)
            );
            if (ignoredCoorientadores.length > 0) {
                console.warn('Co-mentores ignorados durante a criacao do projeto por nao estarem elegiveis:', ignoredCoorientadores);
            }

            const normalizedCoorientadores = requestedCoorientadores.filter(
                (id) => id !== creatorId && allowedMentorIds.has(id)
            );
            const normalizedInvestigadores = requestedInvestigadores.filter((id) => id !== creatorId);
            const normalizedOrientadores = [...new Set([creatorId])];

            newProjectData.orientador_ids = normalizedOrientadores;
            newProjectData.orientadores_ids = normalizedOrientadores;

            if (normalizedCoorientadores.length > 0) {
                newProjectData.coorientador_ids = normalizedCoorientadores;
                newProjectData.coorientadores_ids = normalizedCoorientadores;
            }

            if (normalizedInvestigadores.length > 0) {
                newProjectData.investigadores_ids = normalizedInvestigadores;
            }

            const membrosIds = [...new Set([...normalizedOrientadores, ...normalizedCoorientadores, ...normalizedInvestigadores])];
            if (membrosIds.length > 0) {
                newProjectData.membros_ids = membrosIds;
            }

            const normalizedImagens = Array.isArray(imagens)
                ? imagens.filter((img) => typeof img === 'string' && img.trim()).slice(0, MAX_PROJECT_IMAGES)
                : [];

            if (normalizedImagens.length > 0) {
                newProjectData.imagens = normalizedImagens;
            }

            const newProjectDataDebug = {
                ...newProjectData,
                createdAt: '<serverTimestamp>',
                imagens: Array.isArray(newProjectData.imagens) ? `[${newProjectData.imagens.length} imagens]` : '[0 imagens]'
            };
            console.log('[PROJECT_CREATE] payload final para Firestore:', newProjectDataDebug);
            let projectRef = null;
            addDocTimerStarted = true;
            console.time(createProjectTimerLabel);
            try {
                projectCreateStage = 'adddoc-first-attempt';
                projectRef = await addDoc(collection(db, 'projetos'), newProjectData);
            } catch (createError) {
                if (createError?.code !== 'permission-denied') {
                    throw createError;
                }

                console.warn('[PROJECT_CREATE] permission-denied no primeiro addDoc; tentando refresh de token e nova tentativa...');
                if (typeof authUser?.getIdToken === 'function') {
                    projectCreateStage = 'refresh-token';
                    await authUser.getIdToken(true);
                }

                projectCreateStage = 'adddoc-retry';
                projectRef = await addDoc(collection(db, 'projetos'), newProjectData);
            } finally {
                console.timeEnd(createProjectTimerLabel);
                addDocTimerStarted = false;
            }
            console.log('[PROJECT_CREATE] projeto criado com sucesso:', {
                projectId: String(projectRef?.id || '').trim(),
                clube_id: String(newProjectData?.clube_id || '').trim()
            });

            const successfulInvestigadorLinks = [];
            if (normalizedInvestigadores.length > 0) {
                projectCreateStage = 'link-investigadores';
                const investigatorLinkResults = await Promise.allSettled(
                    normalizedInvestigadores.map(async (investigatorId) => {
                        const existingInvestigator = users.find((person) => String(person?.id || '').trim() === investigatorId) || null;
                        const existingClubesIds = getUserClubIds(existingInvestigator || {});
                        const currentPrimaryClubId = String(existingInvestigator?.clube_id || '').trim();
                        const updatedClubesIds = normalizeIdList([normalizedViewingClubId, currentPrimaryClubId, ...existingClubesIds]);
                        const nextPrimaryClubId = updatedClubesIds.includes(currentPrimaryClubId)
                            ? currentPrimaryClubId
                            : normalizedViewingClubId;

                        const investigatorUpdates = {
                            clube_id: nextPrimaryClubId,
                            clubes_ids: updatedClubesIds
                        };

                        await updateDoc(doc(db, 'usuarios', investigatorId), investigatorUpdates);
                        return { investigatorId, updates: investigatorUpdates };
                    })
                );

                investigatorLinkResults.forEach((result) => {
                    if (result.status === 'fulfilled') {
                        successfulInvestigadorLinks.push(result.value);
                        return;
                    }

                    console.warn('Não foi possível vincular clubista ao clube durante criação do projeto:', result.reason);
                });
            }

            projectCreateStage = 'invalidate-cache';
            await cachedDataService.invalidateCollection('projetos');

            if (successfulInvestigadorLinks.length > 0) {
                const investigatorUpdatesById = new Map(
                    successfulInvestigadorLinks.map((item) => [String(item.investigatorId || '').trim(), item.updates])
                );

                setUsers((previousUsers) => previousUsers.map((person) => {
                    const personId = String(person?.id || '').trim();
                    const updates = investigatorUpdatesById.get(personId);
                    if (!updates) return person;
                    return normalizeUserEntity({ ...person, ...updates }, personId);
                }));
            }

            setSelectedProjectId(projectRef.id);
            setCurrentView('clube');
            projectCreateStage = 'finalize-success';

            const missingInvestigatorLinksCount = normalizedInvestigadores.length - successfulInvestigadorLinks.length;
            if (missingInvestigatorLinksCount > 0) {
                setErrorMessage(`Projeto cadastrado, mas ${missingInvestigatorLinksCount} clubista(s) não foram vinculados ao clube automaticamente.`);
            } else {
                setErrorMessage('Projeto cadastrado com sucesso.');
            }

            // Forçar atualização local imediata se necessário
            setClubProjects((prev) => [{ id: projectRef.id, ...newProjectData }, ...prev]);
            setAllProjects((prev) => [{ id: projectRef.id, ...newProjectData }, ...prev]);

            return projectRef.id;
        } catch (error) {
            console.error('Erro ao criar projeto:', error);
            if (addDocTimerStarted) {
                console.timeEnd(createProjectTimerLabel);
            }
            console.error('[PROJECT_CREATE] detalhes do erro:', {
                code: error?.code,
                name: error?.name,
                message: error?.message,
                customData: error?.customData,
                stackTop: String(error?.stack || '').split('\n').slice(0, 8).join('\n')
            });
            console.error('[PROJECT_CREATE] diagnostico de permissao/contexto:', {
                stage: projectCreateStage,
                creatorId,
                perfil: String(loggedUser?.perfil || '').trim(),
                email: String(loggedUser?.email || '').trim(),
                authTokenClaimsDebug,
                loggedUserClubesIds: normalizeIdList(Array.isArray(loggedUser?.clubes_ids) ? loggedUser.clubes_ids : []),
                loggedUserClubeId: String(loggedUser?.clube_id || '').trim(),
                viewingClubId: String(viewingClub?.id || '').trim(),
                viewingClubMentorId: String(viewingClub?.mentor_id || '').trim(),
                viewingClubOrientadorIds: normalizeIdList(Array.isArray(viewingClub?.orientador_ids) ? viewingClub.orientador_ids : []),
                viewingClubCoorientadorIds: normalizeIdList(Array.isArray(viewingClub?.coorientador_ids) ? viewingClub.coorientador_ids : [])
            });
            const fallbackMessage = 'Falha ao criar projeto. Tente novamente.';
            const isPermissionDenied = String(error?.code || '').trim() === 'permission-denied';
            const permissionHint = isPermissionDenied
                ? `Permissao negada na etapa ${projectCreateStage}. `
                : '';
            const rawMessage = String(error?.message || '').trim();
            const resolvedMessage = isPermissionDenied
                ? [permissionHint, rawMessage].filter(Boolean).join(' Detalhe original: ')
                : (rawMessage || fallbackMessage);
            setErrorMessage(resolvedMessage);
            const wrappedError = new Error(resolvedMessage);
            wrappedError.code = error?.code;
            wrappedError.name = error?.name || wrappedError.name;
            wrappedError.customData = {
                ...(error?.customData || {}),
                stage: projectCreateStage
            };
            throw wrappedError;
        } finally {
            console.groupEnd();
            setIsFetchingProjects(false);
        }
    };

    const handleUpdateProject = async (
        projectId,
        {
            titulo,
            descricao,
            area_tematica,
            status,
            tipo,
            coorientador_ids = [],
            investigadores_ids = [],
            imagens = []
        } = {}
    ) => {
        const normalizedProjectId = String(projectId || '').trim();
        if (!normalizedProjectId) {
            throw new Error('Projeto invalido para edicao.');
        }

        const currentUserId = String(loggedUser?.id || authUser?.uid || '').trim();
        if (!currentUserId) {
            throw new Error('Usuario nao autenticado para edicao de projeto.');
        }

        if (!isMentoriaPerfil(loggedUser?.perfil)) {
            throw new Error('Apenas mentor ou co-mentor pode editar projetos.');
        }

        const projectToUpdate = projectsCatalog.find((project) => String(project?.id || '').trim() === normalizedProjectId) || null;
        if (!projectToUpdate) {
            throw new Error('Projeto nao encontrado.');
        }

        if (!canCurrentMentorManageProject(projectToUpdate)) {
            throw new Error('Voce so pode editar projetos em que atua como mentor responsavel.');
        }

        const normalizedTitle = String(titulo || '').trim();
        if (!normalizedTitle) {
            throw new Error('Informe o titulo do projeto.');
        }

        const requestedCoorientadores = normalizeIdList(coorientador_ids || []);
        const requestedInvestigadores = normalizeIdList(investigadores_ids || []);

        const existingOrientadores = normalizeIdList([
            ...(projectToUpdate?.orientador_ids || []),
            ...(projectToUpdate?.orientadores_ids || [])
        ]);
        const normalizedOrientadores = existingOrientadores.length > 0
            ? existingOrientadores
            : [currentUserId];

        const normalizedCoorientadores = requestedCoorientadores
            .filter((id) => id && !normalizedOrientadores.includes(id));

        const normalizedInvestigadores = requestedInvestigadores
            .filter((id) => id && !normalizedOrientadores.includes(id) && !normalizedCoorientadores.includes(id));

        const normalizedImagens = Array.isArray(imagens)
            ? imagens.filter((img) => typeof img === 'string' && img.trim()).slice(0, MAX_PROJECT_IMAGES)
            : [];

        const updatePayload = {
            titulo: normalizedTitle,
            descricao: String(descricao || '').trim(),
            area_tematica: String(area_tematica || '').trim(),
            status: String(status || 'Em andamento').trim(),
            tipo: String(tipo || 'Projeto Científico').trim(),
            orientador_ids: normalizedOrientadores,
            orientadores_ids: normalizedOrientadores,
            coorientador_ids: normalizedCoorientadores,
            coorientadores_ids: normalizedCoorientadores,
            investigadores_ids: normalizedInvestigadores,
            membros_ids: normalizeIdList([
                ...normalizedOrientadores,
                ...normalizedCoorientadores,
                ...normalizedInvestigadores
            ]),
            imagens: normalizedImagens,
            updated_by: currentUserId,
            updated_by_nome: String(loggedUser?.nome || '').trim(),
            updated_by_email: String(loggedUser?.email || '').trim(),
            updated_by_perfil: String(loggedUser?.perfil || '').trim()
        };

        await updateDoc(doc(db, 'projetos', normalizedProjectId), {
            ...updatePayload,
            updatedAt: serverTimestamp()
        });

        await cachedDataService.invalidateCollection('projetos');

        const localUpdatedPayload = {
            ...updatePayload,
            updatedAt: new Date()
        };

        const applyProjectUpdate = (previousProjects) => previousProjects.map((project) => {
            if (String(project?.id || '').trim() !== normalizedProjectId) {
                return project;
            }

            return {
                ...project,
                ...localUpdatedPayload
            };
        });

        setProjects(applyProjectUpdate);
        setAllProjects(applyProjectUpdate);
        setClubProjects(applyProjectUpdate);
        setMyClubProjects(applyProjectUpdate);
        setErrorMessage('Projeto atualizado com sucesso.');

        return normalizedProjectId;
    };

    const handleDeleteProject = async (projectId) => {
        const normalizedProjectId = String(projectId || '').trim();
        if (!normalizedProjectId) {
            throw new Error('Projeto invalido para exclusao.');
        }

        const currentUserId = String(loggedUser?.id || authUser?.uid || '').trim();
        if (!currentUserId) {
            throw new Error('Usuario nao autenticado para exclusao de projeto.');
        }

        if (!isMentoriaPerfil(loggedUser?.perfil)) {
            throw new Error('Apenas mentor ou co-mentor pode apagar projetos.');
        }

        const projectToDelete = projectsCatalog.find((project) => String(project?.id || '').trim() === normalizedProjectId) || null;
        if (!projectToDelete) {
            throw new Error('Projeto nao encontrado.');
        }

        if (!canCurrentMentorManageProject(projectToDelete)) {
            throw new Error('Voce so pode apagar projetos em que atua como mentor responsavel.');
        }

        await deleteDoc(doc(db, 'projetos', normalizedProjectId));
        await cachedDataService.invalidateCollection('projetos');

        setProjects((previous) => previous.filter((project) => String(project?.id || '').trim() !== normalizedProjectId));
        setAllProjects((previous) => previous.filter((project) => String(project?.id || '').trim() !== normalizedProjectId));
        setClubProjects((previous) => previous.filter((project) => String(project?.id || '').trim() !== normalizedProjectId));
        setMyClubProjects((previous) => previous.filter((project) => String(project?.id || '').trim() !== normalizedProjectId));
        setDiaryEntries((previous) => previous.filter((entry) => String(entry?.projeto_id || '').trim() !== normalizedProjectId));

        if (String(selectedProjectId || '').trim() === normalizedProjectId) {
            setSelectedProjectId('');
            if (currentView === 'diario') {
                setCurrentView('clube');
            }
        }

        setProjectsTotalCount((previous) => {
            const count = Number(previous || 0);
            if (Number.isNaN(count)) return previous;
            return Math.max(0, count - 1);
        });
    };

    const handleCreateClub = async ({
        nome,
        descricao = '',
        escola_id,
        escola_nome = '',
        periodicidade = 'Quinzenal',
        coorientador_ids = [],
        clubistas_ids = [],
        documentos = {}
    }) => {
        const isLocalhost = isLocalhostEnvironment();
        const mentorId = String(loggedUser?.id || authUser?.uid || '').trim();
        if (!mentorId) {
            throw new Error('Usuario nao autenticado.');
        }

        if (!isMentoriaPerfil(loggedUser?.perfil)) {
            throw new Error('Apenas mentor ou co-mentor pode criar clube.');
        }

        const clubName = String(nome || '').trim();
        const schoolId = String(escola_id || '').trim();
        const schoolName = String(
            escola_nome
            || schools.find((item) => String(item.escola_id || item.id || '').trim() === schoolId)?.nome
            || ''
        ).trim();
        const normalizedSchoolName = normalizeSchoolName(schoolName);
        const periodicidadeNormalizada = String(periodicidade || 'Quinzenal').trim() || 'Quinzenal';

        if (!clubName) {
            throw new Error('Informe o nome do clube.');
        }

        if (!schoolId) {
            throw new Error('Selecione a unidade escolar.');
        }

        const mentorSchoolIds = getUserSchoolIds(loggedUser);
        if (mentorSchoolIds.length > 0 && !mentorSchoolIds.includes(schoolId)) {
            throw new Error('Voce so pode criar clube em unidade vinculada ao seu perfil.');
        }

        const selectedCoorientadoresIds = normalizeIdList(coorientador_ids).filter((id) => id !== mentorId);
        const selectedClubistasIds = normalizeIdList(clubistas_ids)
            .filter((id) => id !== mentorId && !selectedCoorientadoresIds.includes(id));

        const mentorProfiles = new Set(['orientador', 'coorientador']);
        const coorientadoresById = new Map(
            users
                .map((person) => ({
                    ...(person || {}),
                    id: String(person?.id || '').trim()
                }))
                .filter((person) => person.id && mentorProfiles.has(normalizePerfil(person?.perfil)))
                .map((person) => [person.id, person])
        );

        const unresolvedCoorientadoresIds = selectedCoorientadoresIds.filter((id) => !coorientadoresById.has(id));

        if (unresolvedCoorientadoresIds.length > 0) {
            const resolvedCoorientadores = await Promise.all(
                unresolvedCoorientadoresIds.map(async (id) => {
                    try {
                        const coorientadorRef = doc(db, 'usuarios', id);
                        const coorientadorSnap = await getDoc(coorientadorRef);

                        if (!coorientadorSnap.exists()) {
                            return null;
                        }

                        return { id: coorientadorSnap.id, ...coorientadorSnap.data() };
                    } catch (coorientadorError) {
                        console.warn('Falha ao validar co-mentor selecionado:', id, coorientadorError);
                        return null;
                    }
                })
            );

            resolvedCoorientadores
                .filter((person) => person && mentorProfiles.has(normalizePerfil(person?.perfil)))
                .forEach((person) => {
                    const resolvedId = String(person.id || '').trim();
                    if (!resolvedId) return;
                    coorientadoresById.set(resolvedId, person);
                });
        }

        const invalidCoorientadores = selectedCoorientadoresIds.filter((id) => {
            const selectedUser = coorientadoresById.get(id);
            if (!selectedUser) return true;

            const selectedUserSchoolIds = getUserSchoolIds(selectedUser);
            const hasSchoolIdMatch = selectedUserSchoolIds.includes(schoolId);
            const hasSchoolNameMatch = normalizedSchoolName
                && normalizeSchoolName(selectedUser?.escola_nome) === normalizedSchoolName;

            return !hasSchoolIdMatch && !hasSchoolNameMatch;
        });

        if (!isLocalhost && invalidCoorientadores.length > 0) {
            throw new Error('Todos os co-mentores devem ser da unidade escolar selecionada.');
        }

        const allowedProfiles = new Set(['estudante', 'investigador', 'aluno']);
        const clubistasById = new Map(
            users
                .map((person) => ({
                    ...(person || {}),
                    id: String(person?.id || '').trim()
                }))
                .filter((person) => person.id && allowedProfiles.has(normalizePerfil(person?.perfil)))
                .map((person) => [person.id, person])
        );

        const unresolvedClubistasIds = selectedClubistasIds.filter((id) => !clubistasById.has(id));

        if (unresolvedClubistasIds.length > 0) {
            const resolvedClubistas = await Promise.all(
                unresolvedClubistasIds.map(async (id) => {
                    try {
                        const clubistaRef = doc(db, 'usuarios', id);
                        const clubistaSnap = await getDoc(clubistaRef);

                        if (!clubistaSnap.exists()) {
                            return null;
                        }

                        return { id: clubistaSnap.id, ...clubistaSnap.data() };
                    } catch (clubistaError) {
                        console.warn('Falha ao validar clubista selecionado:', id, clubistaError);
                        return null;
                    }
                })
            );

            resolvedClubistas
                .filter((person) => person && allowedProfiles.has(normalizePerfil(person?.perfil)))
                .forEach((person) => {
                    const resolvedId = String(person.id || '').trim();
                    if (!resolvedId) return;
                    clubistasById.set(resolvedId, person);
                });
        }

        const invalidClubistas = selectedClubistasIds.filter((id) => {
            const selectedUser = clubistasById.get(id);
            if (!selectedUser) return true;
            const selectedUserSchoolIds = getUserSchoolIds(selectedUser);
            const hasSchoolIdMatch = selectedUserSchoolIds.includes(schoolId);
            const hasSchoolNameMatch = normalizedSchoolName
                && normalizeSchoolName(selectedUser?.escola_nome) === normalizedSchoolName;

            return !hasSchoolIdMatch && !hasSchoolNameMatch;
        });

        if (!isLocalhost && invalidClubistas.length > 0) {
            throw new Error('Todos os clubistas devem ser estudantes da unidade escolar selecionada.');
        }

        try {
            setCreatingClub(true);
            setErrorMessage('');

            const clubRef = doc(collection(db, 'clubes'));
            const nowIso = new Date().toISOString();
            const uploadedDocuments = {};
            const persistedCoorientadoresIds = [...selectedCoorientadoresIds];
            const persistedClubistasIds = [...selectedClubistasIds];

            for (const requiredDocument of CLUB_REQUIRED_DOCUMENTS) {
                const rawDocument = documentos?.[requiredDocument.key];

                if (!hasProvidedClubDocument(rawDocument)) {
                    continue;
                }

                const normalizedDocument = await normalizeClubDocumentPayload({
                    rawDocument,
                    requiredDocument,
                    uploadedAt: nowIso,
                    clubId: clubRef.id
                });
                if (!normalizedDocument) {
                    throw new Error(`Documento invalido: ${requiredDocument.label}`);
                }

                uploadedDocuments[requiredDocument.key] = normalizedDocument;
            }

            const normalizedClubDocuments = await normalizeClubDocumentsForFirestore({
                clubId: clubRef.id,
                uploadedAt: nowIso,
                documentsByKey: uploadedDocuments,
                previousDocumentsByKey: {}
            });


            const mentorClubIds = normalizeIdList([clubRef.id, ...(loggedUser?.clubes_ids || []), loggedUser?.clube_id]);
            const mentorSchoolIdsUpdated = normalizeIdList([schoolId, ...(loggedUser?.escolas_ids || []), loggedUser?.escola_id]);
            const mentorName = String(loggedUser?.nome || '').trim();
            const mentorEmail = String(loggedUser?.email || '').trim();

            const clubData = {
                id: clubRef.id,
                nome: clubName,
                descricao: String(descricao || '').trim(),
                escola_id: schoolId,
                escola_nome: schoolName,
                periodicidade: periodicidadeNormalizada,
                mentor_id: mentorId,
                mentor_nome: mentorName,
                mentor_email: mentorEmail,
                orientador_ids: [mentorId],
                coorientador_ids: persistedCoorientadoresIds,
                clubistas_ids: persistedClubistasIds,
                membros_ids: normalizeIdList([mentorId, ...persistedCoorientadoresIds, ...persistedClubistasIds]),
                documentos: normalizedClubDocuments,
                status: 'ativo',
                createdBy: mentorId,
                createdAt: serverTimestamp()
            };

            await setDoc(clubRef, clubData);

            try {
                const mentorRef = doc(db, 'usuarios', mentorId);
                await updateDoc(mentorRef, {
                    clube_id: clubRef.id,
                    clubes_ids: mentorClubIds,
                    escola_id: mentorSchoolIdsUpdated[0] || schoolId,
                    escolas_ids: mentorSchoolIdsUpdated
                });
            } catch (mentorUpdateError) {
                console.warn('Nao foi possivel atualizar o vinculo do mentor no perfil:', mentorUpdateError);
            }

            const selectedRealClubistasIds = selectedClubistasIds.filter((id) => Boolean(String(id || '').trim()));
            const successfulClubistaUpdates = [];

            if (selectedRealClubistasIds.length > 0) {
                const clubistaUpdateResults = await Promise.allSettled(
                    selectedRealClubistasIds.map(async (clubistaId) => {
                        const existingClubistaData = clubistasById.get(clubistaId) || null;
                        const currentPrimaryClubId = String(existingClubistaData?.clube_id || '').trim();
                        const existingClubesIds = getUserClubIds(existingClubistaData || {});
                        const updatedClubesIds = normalizeIdList([clubRef.id, currentPrimaryClubId, ...existingClubesIds]);
                        const nextPrimaryClubId = updatedClubesIds.includes(currentPrimaryClubId)
                            ? currentPrimaryClubId
                            : clubRef.id;

                        const clubistaUpdates = {
                            clube_id: nextPrimaryClubId,
                            clubes_ids: updatedClubesIds
                        };

                        await updateDoc(doc(db, 'usuarios', clubistaId), clubistaUpdates);
                        return { clubistaId, updates: clubistaUpdates };
                    })
                );

                clubistaUpdateResults.forEach((result) => {
                    if (result.status === 'fulfilled') {
                        successfulClubistaUpdates.push(result.value);
                        return;
                    }

                    console.warn('Nao foi possivel vincular clubista ao clube:', result.reason);
                });
            }

            await Promise.all([
                cachedDataService.invalidateCollection('clubes'),
                cachedDataService.invalidateCollection('usuarios')
            ]);

            setClubs((previous) => {
                const withoutCreated = previous.filter((item) => String(item.id || '') !== clubRef.id);
                return [{ ...clubData, id: clubRef.id, createdAt: nowIso }, ...withoutCreated];
            });

            const userUpdates = {
                clube_id: clubRef.id,
                clubes_ids: mentorClubIds,
                escola_id: mentorSchoolIdsUpdated[0] || schoolId,
                escolas_ids: mentorSchoolIdsUpdated
            };

            setLoggedUser((previous) => {
                if (!previous) return previous;
                return normalizeUserEntity({ ...previous, ...userUpdates }, mentorId);
            });

            setUsers((previousUsers) => previousUsers.map((person) => {
                if (String(person?.id || '') !== mentorId) {
                    return person;
                }

                return normalizeUserEntity({ ...person, ...userUpdates }, mentorId);
            }));

            if (successfulClubistaUpdates.length > 0) {
                const clubistaUpdatesById = new Map(
                    successfulClubistaUpdates.map((item) => [String(item.clubistaId || '').trim(), item.updates])
                );

                setUsers((previousUsers) => {
                    const updatedUsers = previousUsers.map((person) => {
                        const personId = String(person?.id || '').trim();
                        const updates = clubistaUpdatesById.get(personId);
                        if (!updates) return person;
                        return normalizeUserEntity({ ...person, ...updates }, personId);
                    });

                    clubistaUpdatesById.forEach((updates, clubistaId) => {
                        if (!updatedUsers.some((person) => String(person?.id || '').trim() === clubistaId)) {
                            const baseClubista = clubistasById.get(clubistaId) || { id: clubistaId };
                            updatedUsers.push(normalizeUserEntity({ ...baseClubista, ...updates }, clubistaId));
                        }
                    });

                    return updatedUsers;
                });
            }

            setSelectedClubId(clubRef.id);
            setViewingClubId(clubRef.id);
            setCurrentView('clube');

            const missingClubistaUpdatesCount = selectedRealClubistasIds.length - successfulClubistaUpdates.length;
            if (missingClubistaUpdatesCount > 0) {
                setErrorMessage(`Clube criado, mas ${missingClubistaUpdatesCount} clubista(s) nao foram vinculados automaticamente.`);
            } else {
                setErrorMessage('Clube criado com sucesso.');
            }

            return clubRef.id;
        } catch (error) {
            console.error('Erro ao criar clube:', error);
            const errorCode = String(error?.code || '').trim().toLowerCase();
            const rawMessage = String(error?.message || '').trim();
            const isPermissionDenied = errorCode === 'permission-denied'
                || /missing or insufficient permissions|insufficient permissions|permiss/i.test(rawMessage);
            const fallbackMessage = isPermissionDenied
                ? 'Permissao negada ao criar clube. Verifique se seu perfil de mentor esta vinculado a unidade escolar selecionada e se o clube atende aos requisitos minimos.'
                : 'Falha ao criar clube. Verifique os dados e tente novamente.';
            const resolvedMessage = isPermissionDenied
                ? fallbackMessage
                : (rawMessage || fallbackMessage);
            setErrorMessage(resolvedMessage);
            throw new Error(resolvedMessage);
        } finally {
            setCreatingClub(false);
        }
    };

    const handleUpdateClub = async ({
        clube_id,
        nome,
        descricao = '',
        periodicidade = 'Quinzenal',
        coorientador_ids = [],
        clubistas_ids = [],
        banner_file = null,
        logo_file = null,
        documentos = null
    }) => {
        const isLocalhost = isLocalhostEnvironment();
        const mentorId = String(loggedUser?.id || authUser?.uid || '').trim();
        const clubId = String(clube_id || '').trim();

        if (!mentorId) {
            throw new Error('Usuario nao autenticado.');
        }

        if (!clubId) {
            throw new Error('Clube nao informado.');
        }

        if (!isMentoriaPerfil(loggedUser?.perfil)) {
            throw new Error('Apenas mentor ou co-mentor pode editar clube.');
        }

        let currentClub = clubs.find((club) => String(club?.id || '').trim() === clubId) || null;
        if (!currentClub) {
            const clubSnap = await getDoc(doc(db, 'clubes', clubId));
            if (!clubSnap.exists()) {
                throw new Error('Clube nao encontrado.');
            }
            currentClub = { id: clubSnap.id, ...clubSnap.data() };
        }

        const mentorIds = normalizeIdList([
            currentClub?.mentor_id,
            ...(currentClub?.orientador_ids || []),
            ...(currentClub?.orientadores_ids || []),
            ...(currentClub?.coorientador_ids || []),
            ...(currentClub?.coorientadores_ids || [])
        ]);
        const canManageByProfileMembership = myClubIds.includes(clubId);

        if (!mentorIds.includes(mentorId) && !canManageByProfileMembership) {
            throw new Error('Voce nao possui permissao para editar este clube.');
        }

        const clubName = String(nome || '').trim();
        if (!clubName) {
            throw new Error('Informe o nome do clube.');
        }

        const schoolId = String(currentClub?.escola_id || '').trim();
        const normalizedSchoolName = normalizeSchoolName(currentClub?.escola_nome);
        const periodicidadeNormalizada = String(periodicidade || currentClub?.periodicidade || 'Quinzenal').trim() || 'Quinzenal';

        const selectedCoorientadoresIds = normalizeIdList(coorientador_ids).filter((id) => id !== mentorId);
        const currentCoorientadoresIds = normalizeIdList([
            ...(currentClub?.coorientador_ids || []),
            ...(currentClub?.coorientadores_ids || [])
        ]);
        const addedCoorientadoresIds = selectedCoorientadoresIds.filter((id) => !currentCoorientadoresIds.includes(id));

        const mentorProfiles = new Set(['orientador', 'coorientador']);
        const coorientadoresById = new Map(
            users
                .map((person) => ({
                    ...(person || {}),
                    id: String(person?.id || '').trim()
                }))
                .filter((person) => person.id && mentorProfiles.has(normalizePerfil(person?.perfil)))
                .map((person) => [person.id, person])
        );

        const unresolvedCoorientadoresIds = addedCoorientadoresIds.filter((id) => !coorientadoresById.has(id));
        if (unresolvedCoorientadoresIds.length > 0) {
            const resolvedCoorientadores = await Promise.all(
                unresolvedCoorientadoresIds.map(async (id) => {
                    try {
                        const userSnap = await getDoc(doc(db, 'usuarios', id));
                        if (!userSnap.exists()) {
                            return null;
                        }

                        return { id: userSnap.id, ...userSnap.data() };
                    } catch (resolveError) {
                        console.warn('Falha ao carregar co-mentor para edicao:', id, resolveError);
                        return null;
                    }
                })
            );

            resolvedCoorientadores
                .filter((person) => person && mentorProfiles.has(normalizePerfil(person?.perfil)))
                .forEach((person) => {
                    const personId = String(person?.id || '').trim();
                    if (!personId) return;
                    coorientadoresById.set(personId, person);
                });
        }

        const invalidCoorientadores = addedCoorientadoresIds.filter((id) => {
            const selectedUser = coorientadoresById.get(id);
            if (!selectedUser) return true;

            const selectedUserSchoolIds = getUserSchoolIds(selectedUser);
            const hasSchoolIdMatch = schoolId && selectedUserSchoolIds.includes(schoolId);
            const hasSchoolNameMatch = normalizedSchoolName
                && normalizeSchoolName(selectedUser?.escola_nome) === normalizedSchoolName;

            return !hasSchoolIdMatch && !hasSchoolNameMatch;
        });

        if (!isLocalhost && invalidCoorientadores.length > 0) {
            throw new Error('Todos os co-mentores devem ser da unidade escolar do clube.');
        }

        const currentOrientadoresIds = normalizeIdList(
            Array.isArray(currentClub?.orientador_ids) && currentClub.orientador_ids.length > 0
                ? currentClub.orientador_ids
                : [currentClub?.mentor_id || mentorId]
        );

        const nextMentorIds = normalizeIdList([
            mentorId,
            currentClub?.mentor_id,
            ...currentOrientadoresIds,
            ...selectedCoorientadoresIds
        ]);

        const selectedClubistasIds = normalizeIdList(clubistas_ids).filter((id) => !nextMentorIds.includes(id));

        const allowedProfiles = new Set(['estudante', 'investigador', 'aluno']);
        const usersById = new Map(
            users
                .map((person) => ({
                    ...(person || {}),
                    id: String(person?.id || '').trim()
                }))
                .filter((person) => person.id)
                .map((person) => [person.id, person])
        );

        const selectedClubistasById = new Map(
            [...usersById.values()]
                .filter((person) => allowedProfiles.has(normalizePerfil(person?.perfil)))
                .map((person) => [person.id, person])
        );

        const unresolvedSelectedIds = selectedClubistasIds.filter((id) => !selectedClubistasById.has(id));
        if (unresolvedSelectedIds.length > 0) {
            const resolvedClubistas = await Promise.all(
                unresolvedSelectedIds.map(async (id) => {
                    try {
                        const userSnap = await getDoc(doc(db, 'usuarios', id));
                        if (!userSnap.exists()) {
                            return null;
                        }

                        return { id: userSnap.id, ...userSnap.data() };
                    } catch (resolveError) {
                        console.warn('Falha ao carregar clubista para edicao:', id, resolveError);
                        return null;
                    }
                })
            );

            resolvedClubistas
                .filter((person) => person && allowedProfiles.has(normalizePerfil(person?.perfil)))
                .forEach((person) => {
                    const personId = String(person?.id || '').trim();
                    if (!personId) return;
                    selectedClubistasById.set(personId, person);
                    usersById.set(personId, person);
                });
        }

        const invalidClubistas = selectedClubistasIds.filter((id) => {
            const selectedUser = selectedClubistasById.get(id);
            if (!selectedUser) return true;

            const selectedUserSchoolIds = getUserSchoolIds(selectedUser);
            const hasSchoolIdMatch = schoolId && selectedUserSchoolIds.includes(schoolId);
            const hasSchoolNameMatch = normalizedSchoolName
                && normalizeSchoolName(selectedUser?.escola_nome) === normalizedSchoolName;

            return !hasSchoolIdMatch && !hasSchoolNameMatch;
        });

        if (!isLocalhost && invalidClubistas.length > 0) {
            throw new Error('Todos os clubistas devem ser estudantes da unidade escolar do clube.');
        }

        const currentClubistasIds = normalizeIdList(currentClub?.clubistas_ids || []);
        const addedClubistasIds = selectedClubistasIds.filter((id) => !currentClubistasIds.includes(id));
        const removedClubistasIds = currentClubistasIds.filter((id) => !selectedClubistasIds.includes(id));

        try {
            setUpdatingClub(true);
            setErrorMessage('');

            const currentClubBanner = String(currentClub?.banner || '').trim();
            const currentClubLogo = String(currentClub?.logo || '').trim();

            let bannerDataUrl = '';
            if (banner_file) {
                bannerDataUrl = await compressImageToBase64(banner_file, {
                    maxWidth: 800,
                    maxHeight: 800,
                    quality: 0.65,
                    maxSizeKB: 520
                });
            } else if (currentClubBanner && !currentClub?.banner_url) {
                bannerDataUrl = await compressImageToBase64(currentClubBanner, {
                    maxWidth: 800,
                    maxHeight: 800,
                    quality: 0.65,
                    maxSizeKB: 520
                });
            }

            if (bannerDataUrl) {
                let bannerSizeBytes = getDataUrlByteSize(bannerDataUrl);
                if (bannerSizeBytes > 650 * 1024) {
                    bannerDataUrl = await compressImageToBase64(bannerDataUrl, {
                        maxWidth: 700,
                        maxHeight: 700,
                        quality: 0.55,
                        maxSizeKB: 460
                    });
                    bannerSizeBytes = getDataUrlByteSize(bannerDataUrl);
                }

                if (bannerSizeBytes > 720 * 1024) {
                    bannerDataUrl = await compressImageToBase64(bannerDataUrl, {
                        maxWidth: 640,
                        maxHeight: 640,
                        quality: 0.5,
                        maxSizeKB: 420
                    });
                    bannerSizeBytes = getDataUrlByteSize(bannerDataUrl);
                }

                if (bannerSizeBytes > 780 * 1024) {
                    throw new Error('A imagem do banner continua muito grande após compressão. Use uma imagem menor ou de menor resolução.');
                }
            }

            let logoDataUrl = '';
            if (logo_file) {
                logoDataUrl = await compressImageToBase64(logo_file, {
                    maxWidth: 600,
                    maxHeight: 600,
                    quality: 0.7,
                    maxSizeKB: 360
                });
            } else if (currentClubLogo && !currentClub?.logo_url) {
                logoDataUrl = await compressImageToBase64(currentClubLogo, {
                    maxWidth: 600,
                    maxHeight: 600,
                    quality: 0.7,
                    maxSizeKB: 360
                });
            }

            const nowIso = new Date().toISOString();
            const clubUpdates = {
                nome: clubName,
                descricao: String(descricao || '').trim(),
                periodicidade: periodicidadeNormalizada,
                orientador_ids: currentOrientadoresIds,
                coorientador_ids: selectedCoorientadoresIds,
                coorientadores_ids: selectedCoorientadoresIds,
                clubistas_ids: selectedClubistasIds,
                membros_ids: normalizeIdList([...nextMentorIds, ...selectedClubistasIds]),
                updatedBy: mentorId,
                updatedAt: serverTimestamp()
            };

            const localClubUpdates = {
                ...clubUpdates,
                updatedAt: nowIso
            };

            const currentDocuments = currentClub?.documentos && typeof currentClub.documentos === 'object'
                ? currentClub.documentos
                : {};
            const nextDocuments = { ...currentDocuments };
            let hasDocumentChanges = false;

            if (documentos && typeof documentos === 'object') {
                for (const requiredDocument of CLUB_REQUIRED_DOCUMENTS) {
                    if (!Object.prototype.hasOwnProperty.call(documentos, requiredDocument.key)) {
                        continue;
                    }

                    hasDocumentChanges = true;
                    const rawDocument = documentos[requiredDocument.key];

                    if (rawDocument === null) {
                        delete nextDocuments[requiredDocument.key];
                        continue;
                    }

                    const normalizedDocument = await normalizeClubDocumentPayload({
                        rawDocument,
                        requiredDocument,
                        uploadedAt: nowIso,
                        clubId
                    });

                    if (!normalizedDocument) {
                        throw new Error(`Documento invalido: ${requiredDocument.label}`);
                    }

                    nextDocuments[requiredDocument.key] = normalizedDocument;
                }
            }

            if (hasDocumentChanges) {
                const normalizedClubDocuments = await normalizeClubDocumentsForFirestore({
                    clubId,
                    uploadedAt: nowIso,
                    documentsByKey: nextDocuments,
                    previousDocumentsByKey: currentDocuments
                });
                clubUpdates.documentos = normalizedClubDocuments;
                localClubUpdates.documentos = normalizedClubDocuments;
            }

            if (currentClub?.banner) {
                clubUpdates.banner = deleteField();
            }

            if (bannerDataUrl) {
                const bannerContentType = bannerDataUrl.startsWith('data:image/jpeg')
                    ? 'image/jpeg'
                    : String(banner_file?.type || '');
                const bannerSizeBytes = getDataUrlByteSize(bannerDataUrl);

                clubUpdates.banner_url = bannerDataUrl;
                clubUpdates.banner_storage_path = '';
                clubUpdates.banner_nome_arquivo = String(banner_file?.name || '').trim();
                clubUpdates.banner_content_type = bannerContentType;
                clubUpdates.banner_tamanho_bytes = bannerSizeBytes;

                localClubUpdates.banner_url = bannerDataUrl;
                localClubUpdates.banner = bannerDataUrl;
                localClubUpdates.banner_storage_path = '';
                localClubUpdates.banner_nome_arquivo = String(banner_file?.name || '').trim();
                localClubUpdates.banner_content_type = bannerContentType;
                localClubUpdates.banner_tamanho_bytes = bannerSizeBytes;
            }

            if (currentClub?.logo) {
                clubUpdates.logo = deleteField();
            }

            if (logoDataUrl) {
                const logoContentType = logoDataUrl.startsWith('data:image/jpeg')
                    ? 'image/jpeg'
                    : String(logo_file?.type || '');
                const logoSizeBytes = getDataUrlByteSize(logoDataUrl);

                clubUpdates.logo_url = logoDataUrl;
                clubUpdates.logo = deleteField();
                clubUpdates.logo_storage_path = '';
                clubUpdates.logo_nome_arquivo = String(logo_file?.name || '').trim();
                clubUpdates.logo_content_type = logoContentType;
                clubUpdates.logo_tamanho_bytes = logoSizeBytes;

                localClubUpdates.logo_url = logoDataUrl;
                localClubUpdates.logo = logoDataUrl;
                localClubUpdates.logo_storage_path = '';
                localClubUpdates.logo_nome_arquivo = String(logo_file?.name || '').trim();
                localClubUpdates.logo_content_type = logoContentType;
                localClubUpdates.logo_tamanho_bytes = logoSizeBytes;
            }

            await updateDoc(doc(db, 'clubes', clubId), clubUpdates);

            const changedClubistaIds = normalizeIdList([...addedClubistasIds, ...removedClubistasIds]);
            const unresolvedChangedUserIds = changedClubistaIds.filter((id) => !usersById.has(id));

            if (unresolvedChangedUserIds.length > 0) {
                const resolvedUsers = await Promise.all(
                    unresolvedChangedUserIds.map(async (id) => {
                        try {
                            const userSnap = await getDoc(doc(db, 'usuarios', id));
                            if (!userSnap.exists()) {
                                return null;
                            }

                            return { id: userSnap.id, ...userSnap.data() };
                        } catch (resolveError) {
                            console.warn('Falha ao carregar usuario para atualizar clube:', id, resolveError);
                            return null;
                        }
                    })
                );

                resolvedUsers
                    .filter(Boolean)
                    .forEach((person) => {
                        const personId = String(person?.id || '').trim();
                        if (!personId) return;
                        usersById.set(personId, person);
                    });
            }

            const addedSet = new Set(addedClubistasIds);

            const membershipUpdateResults = await Promise.allSettled(
                changedClubistaIds.map(async (clubistaId) => {
                    const existingData = usersById.get(clubistaId);
                    if (!existingData) {
                        return null;
                    }

                    const currentPrimaryClubId = String(existingData?.clube_id || '').trim();
                    const currentClubIds = getUserClubIds(existingData);
                    const nextClubIds = addedSet.has(clubistaId)
                        ? normalizeIdList([clubId, ...currentClubIds])
                        : currentClubIds.filter((item) => item !== clubId);

                    const nextPrimaryClubId = nextClubIds.includes(currentPrimaryClubId)
                        ? currentPrimaryClubId
                        : (nextClubIds[0] || '');

                    const updates = {
                        clube_id: nextPrimaryClubId,
                        clubes_ids: nextClubIds
                    };

                    await updateDoc(doc(db, 'usuarios', clubistaId), updates);
                    return {
                        clubistaId,
                        updates
                    };
                })
            );

            const successfulMembershipUpdates = [];
            membershipUpdateResults.forEach((result) => {
                if (result.status === 'fulfilled' && result.value) {
                    successfulMembershipUpdates.push(result.value);
                    return;
                }

                if (result.status === 'rejected') {
                    console.warn('Nao foi possivel sincronizar membro do clube:', result.reason);
                }
            });

            await Promise.all([
                cachedDataService.invalidateCollection('clubes'),
                cachedDataService.invalidateCollection('usuarios')
            ]);

            setClubs((previousClubs) => previousClubs.map((club) => {
                if (String(club?.id || '').trim() !== clubId) {
                    return club;
                }

                return {
                    ...club,
                    ...localClubUpdates
                };
            }));

            if (successfulMembershipUpdates.length > 0) {
                const updatesByUserId = new Map(
                    successfulMembershipUpdates.map((item) => [String(item.clubistaId || '').trim(), item.updates])
                );

                setUsers((previousUsers) => {
                    const patchedUsers = previousUsers.map((person) => {
                        const personId = String(person?.id || '').trim();
                        const updates = updatesByUserId.get(personId);
                        if (!updates) return person;
                        return normalizeUserEntity({ ...person, ...updates }, personId);
                    });

                    updatesByUserId.forEach((updates, clubistaId) => {
                        if (patchedUsers.some((person) => String(person?.id || '').trim() === clubistaId)) {
                            return;
                        }

                        const baseUser = usersById.get(clubistaId) || { id: clubistaId };
                        patchedUsers.push(normalizeUserEntity({ ...baseUser, ...updates }, clubistaId));
                    });

                    return patchedUsers;
                });
            }

            setSelectedClubId(clubId);
            setViewingClubId(clubId);
            setCurrentView('clube');

            const membershipFailures = changedClubistaIds.length - successfulMembershipUpdates.length;
            if (membershipFailures > 0) {
                setErrorMessage(`Clube atualizado, mas ${membershipFailures} membro(s) nao tiveram o perfil sincronizado.`);
            } else {
                setErrorMessage('Clube atualizado com sucesso.');
            }

            return clubId;
        } catch (error) {
            console.error('Erro ao atualizar clube:', error);
            const fallbackMessage = 'Falha ao atualizar clube. Verifique os dados e tente novamente.';
            const resolvedMessage = String(error?.message || '').trim() || fallbackMessage;
            setErrorMessage(resolvedMessage);
            throw new Error(resolvedMessage);
        } finally {
            setUpdatingClub(false);
        }
    };

    const handleUpdateClubCardTemplate = async (clubId, templateId) => {
        const mentorId = String(loggedUser?.id || authUser?.uid || '').trim();
        const normalizedClubId = String(clubId || '').trim();
        const normalizedTemplateId = normalizeClubCardTemplate(templateId);

        if (!mentorId) {
            throw new Error('Usuario nao autenticado.');
        }

        if (!normalizedClubId) {
            throw new Error('Clube nao informado.');
        }

        if (!isMentoriaPerfil(loggedUser?.perfil)) {
            throw new Error('Apenas mentor ou co-mentor pode definir o modelo da carteirinha.');
        }

        let currentClub = clubs.find((club) => String(club?.id || '').trim() === normalizedClubId) || null;
        if (!currentClub) {
            const clubSnap = await getDoc(doc(db, 'clubes', normalizedClubId));
            if (!clubSnap.exists()) {
                throw new Error('Clube nao encontrado.');
            }
            currentClub = { id: clubSnap.id, ...clubSnap.data() };
        }

        const mentorIds = normalizeIdList([
            currentClub?.mentor_id,
            ...(currentClub?.orientador_ids || []),
            ...(currentClub?.orientadores_ids || []),
            ...(currentClub?.coorientador_ids || []),
            ...(currentClub?.coorientadores_ids || [])
        ]);
        const canManageByProfileMembership = myClubIds.includes(normalizedClubId);

        if (!mentorIds.includes(mentorId) && !canManageByProfileMembership) {
            throw new Error('Voce nao possui permissao para alterar o modelo da carteirinha deste clube.');
        }

        await updateDoc(doc(db, 'clubes', normalizedClubId), {
            carteirinha_modelo: normalizedTemplateId,
            updatedBy: mentorId,
            updatedAt: serverTimestamp()
        });

        await cachedDataService.invalidateCollection('clubes');

        setClubs((previousClubs) => previousClubs.map((club) => {
            if (String(club?.id || '').trim() !== normalizedClubId) {
                return club;
            }

            return {
                ...club,
                carteirinha_modelo: normalizedTemplateId,
                updatedBy: mentorId,
                updatedAt: new Date().toISOString()
            };
        }));

        setErrorMessage('Modelo da carteirinha atualizado com sucesso.');
        return normalizedTemplateId;
    };

    const handleRequestClubEntry = async (clubId) => {
        if (!loggedUser || !loggedUserId) {
            throw new Error('Usuario nao autenticado.');
        }

        const normalizedClubId = String(clubId || '').trim();
        if (!normalizedClubId) {
            throw new Error('Selecione um clube valido.');
        }

        const targetClub = clubs.find((club) => String(club?.id || '').trim() === normalizedClubId);
        if (!targetClub) {
            throw new Error('Clube nao encontrado.');
        }

        const clubSchoolId = String(targetClub?.escola_id || '').trim();
        const mappedSchool = schoolsById.get(clubSchoolId);
        const clubSchoolName = normalizeSchoolName(targetClub?.escola_nome || mappedSchool?.nome || mappedSchool?.escola_nome || '');
        const isSameSchoolById = Boolean(clubSchoolId) && userSchoolIds.includes(clubSchoolId);
        const isSameSchoolByName = Boolean(clubSchoolName) && userSchoolNames.includes(clubSchoolName);
        if (!isSameSchoolById && !isSameSchoolByName) {
            throw new Error('Voce so pode solicitar entrada em clubes da sua unidade escolar.');
        }

        const targetClubMemberIds = normalizeIdList([
            ...(targetClub?.membros_ids || []),
            ...(targetClub?.clubistas_ids || []),
            ...(targetClub?.orientador_ids || []),
            ...(targetClub?.orientadores_ids || []),
            ...(targetClub?.coorientador_ids || []),
            ...(targetClub?.coorientadores_ids || []),
            targetClub?.mentor_id
        ]);

        if (myClubIds.includes(normalizedClubId) || targetClubMemberIds.includes(loggedUserId)) {
            throw new Error('Voce ja participa deste clube.');
        }

        const latestRequest = latestMyClubJoinRequestByClubId.get(normalizedClubId);
        const latestStatus = String(latestRequest?.status || '').trim().toLowerCase();
        if (latestStatus === 'pendente') {
            throw new Error('Ja existe uma solicitacao pendente para este clube.');
        }
        if (latestStatus === 'aceita') {
            throw new Error('Sua solicitacao para este clube ja foi aceita.');
        }

        setRequestingClubIds((previous) => new Set(previous).add(normalizedClubId));

        try {
            await addDoc(collection(db, 'clube_solicitacoes'), {
                clube_id: normalizedClubId,
                escola_id: clubSchoolId,
                escola_nome: String(targetClub?.escola_nome || '').trim(),
                solicitante_id: loggedUserId,
                solicitante_nome: String(loggedUser?.nome || '').trim() || 'Solicitante',
                solicitante_email: String(loggedUser?.email || '').trim().toLowerCase(),
                status: 'pendente',
                createdAt: serverTimestamp()
            });

            setErrorMessage('Solicitacao enviada ao mentor do clube.');
        } catch (error) {
            console.error('Erro ao solicitar entrada no clube:', error);
            const message = String(error?.message || '').trim() || 'Falha ao enviar solicitacao.';
            setErrorMessage(message);
            throw new Error(message);
        } finally {
            setRequestingClubIds((previous) => {
                const next = new Set(previous);
                next.delete(normalizedClubId);
                return next;
            });
        }
    };

    const handleRespondClubEntryRequest = async (requestId, accept) => {
        const normalizedRequestId = String(requestId || '').trim();
        if (!normalizedRequestId) {
            throw new Error('Solicitacao invalida.');
        }

        if (!loggedUser || !loggedUserId || !canManageViewingClub || !viewingClub) {
            throw new Error('Voce nao tem permissao para moderar solicitacoes deste clube.');
        }

        setReviewingClubRequestIds((previous) => new Set(previous).add(normalizedRequestId));

        try {
            const requestRef = doc(db, 'clube_solicitacoes', normalizedRequestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                throw new Error('Solicitacao nao encontrada.');
            }

            const requestData = requestSnap.data() || {};
            const requestClubId = String(requestData?.clube_id || '').trim();
            const requesterId = String(requestData?.solicitante_id || '').trim();
            const requestStatus = String(requestData?.status || '').trim().toLowerCase();
            const viewingClubIdNormalized = String(viewingClub?.id || '').trim();

            if (!requestClubId || requestClubId !== viewingClubIdNormalized) {
                throw new Error('Esta solicitacao nao pertence ao clube selecionado.');
            }

            if (!requesterId) {
                throw new Error('Solicitante invalido.');
            }

            if (requestStatus !== 'pendente') {
                throw new Error('Esta solicitacao ja foi processada.');
            }

            if (!accept) {
                await updateDoc(requestRef, {
                    status: 'recusada',
                    respondido_por: loggedUserId,
                    respondido_nome: String(loggedUser?.nome || '').trim() || 'Mentor',
                    respondido_em: serverTimestamp()
                });

                setErrorMessage('Solicitacao recusada.');
                return;
            }

            const [userSnap, clubSnap] = await Promise.all([
                getDoc(doc(db, 'usuarios', requesterId)),
                getDoc(doc(db, 'clubes', requestClubId))
            ]);

            if (!userSnap.exists()) {
                throw new Error('Usuario solicitante nao encontrado.');
            }

            if (!clubSnap.exists()) {
                throw new Error('Clube nao encontrado.');
            }

            const userData = userSnap.data() || {};
            const clubData = clubSnap.data() || {};
            const currentClubIds = normalizeIdList(getUserClubIds(userData));
            const nextClubIds = normalizeIdList([requestClubId, ...currentClubIds]);
            const currentPrimaryClubId = String(userData?.clube_id || '').trim();
            const nextPrimaryClubId = currentPrimaryClubId || requestClubId;

            const batch = writeBatch(db);
            batch.update(doc(db, 'clubes', requestClubId), {
                clubistas_ids: normalizeIdList([...(clubData?.clubistas_ids || []), requesterId]),
                membros_ids: normalizeIdList([...(clubData?.membros_ids || []), requesterId])
            });
            batch.update(doc(db, 'usuarios', requesterId), {
                clube_id: nextPrimaryClubId,
                clubes_ids: nextClubIds
            });
            batch.update(requestRef, {
                status: 'aceita',
                respondido_por: loggedUserId,
                respondido_nome: String(loggedUser?.nome || '').trim() || 'Mentor',
                respondido_em: serverTimestamp()
            });
            await batch.commit();

            await Promise.all([
                cachedDataService.invalidateCollection('clubes'),
                cachedDataService.invalidateCollection('usuarios')
            ]);

            setClubs((previousClubs) => previousClubs.map((club) => {
                if (String(club?.id || '').trim() !== requestClubId) return club;
                return {
                    ...club,
                    clubistas_ids: normalizeIdList([...(club?.clubistas_ids || []), requesterId]),
                    membros_ids: normalizeIdList([...(club?.membros_ids || []), requesterId])
                };
            }));

            setUsers((previousUsers) => previousUsers.map((person) => {
                const personId = String(person?.id || '').trim();
                if (personId !== requesterId) return person;
                return normalizeUserEntity({
                    ...person,
                    clube_id: nextPrimaryClubId,
                    clubes_ids: nextClubIds
                }, personId);
            }));

            setErrorMessage('Solicitacao aceita e clubista vinculado ao clube.');
        } catch (error) {
            console.error('Erro ao processar solicitacao de entrada no clube:', error);
            const message = String(error?.message || '').trim() || 'Falha ao processar solicitacao.';
            setErrorMessage(message);
            throw new Error(message);
        } finally {
            setReviewingClubRequestIds((previous) => {
                const next = new Set(previous);
                next.delete(normalizedRequestId);
                return next;
            });
        }
    };

    const handleSaveProfile = async (profileData) => {
        if (!loggedUser) {
            setErrorMessage('Usuário não autenticado.');
            return;
        }

        try {
            const userRef = doc(db, 'usuarios', String(loggedUser.id));
            const updates = {
                nome: profileData.nome || loggedUser.nome,
                telefone: profileData.telefone || loggedUser.telefone || '',
                lattes: profileData.lattesLink || loggedUser.lattes || '',
                bio: profileData.bio || loggedUser.bio || '',
                localizacao: profileData.localizacao || loggedUser.localizacao || '',
                fotoBase64: profileData.fotoBase64 || loggedUser.fotoBase64 || loggedUser.fotoUrl || ''
            };

            if (profileData.lattesData && typeof profileData.lattesData === 'object') {
                updates.lattes_data = profileData.lattesData;
            }

            const schoolChangeRequest = profileData?.schoolChangeRequest;
            if (schoolChangeRequest && typeof schoolChangeRequest === 'object') {
                const nextSchoolId = String(schoolChangeRequest?.escola_id || '').trim();
                const schoolChangeReason = String(schoolChangeRequest?.motivo || '').trim();
                const currentSchoolId = String(loggedUser?.escola_id || '').trim();
                const rawSchoolChangeCount = Number(loggedUser?.school_change_count || 0);
                const currentSchoolChangeCount = Number.isFinite(rawSchoolChangeCount)
                    ? Math.max(0, Math.trunc(rawSchoolChangeCount))
                    : 0;
                const hasClubLink = getUserClubIds(loggedUser).length > 0;

                if (!canSelfCorrectSchoolProfile(loggedUser?.perfil)) {
                    throw new Error('Seu perfil nao possui permissao para corrigir unidade escolar por conta propria.');
                }

                if (hasClubLink) {
                    throw new Error('Nao e possivel alterar unidade apos vinculacao a clube. Procure a coordenacao.');
                }

                if (currentSchoolChangeCount >= MAX_SELF_SCHOOL_CHANGES) {
                    throw new Error('A correcao de unidade escolar ja foi utilizada neste perfil.');
                }

                if (!nextSchoolId) {
                    throw new Error('Selecione a nova unidade escolar.');
                }

                if (nextSchoolId === currentSchoolId) {
                    throw new Error('Escolha uma unidade diferente da unidade atual.');
                }

                if (schoolChangeReason.length < 10) {
                    throw new Error('Informe um motivo com pelo menos 10 caracteres para corrigir a unidade.');
                }

                const targetSchool = schoolsById.get(nextSchoolId);
                if (!targetSchool) {
                    throw new Error('Selecione uma unidade escolar valida.');
                }

                const nextSchoolName = String(targetSchool?.nome || targetSchool?.escola_nome || '').trim();
                if (!nextSchoolName) {
                    throw new Error('Nao foi possivel resolver o nome da unidade escolar selecionada.');
                }

                updates.escola_id = nextSchoolId;
                updates.escola_nome = nextSchoolName;
                updates.escola_municipio = String(targetSchool?.municipio || '').trim();
                updates.escola_uf = String(targetSchool?.uf || 'BA').trim() || 'BA';
                updates.escolas_ids = normalizeIdList([nextSchoolId]);
                updates.school_change_count = currentSchoolChangeCount + 1;
                updates.school_change_last_reason = schoolChangeReason;
                updates.school_change_last_at = serverTimestamp();
            }

            await updateDoc(userRef, updates);
            const updatedUser = {
                ...loggedUser,
                ...updates,
                school_change_last_at: Object.prototype.hasOwnProperty.call(updates, 'school_change_last_at')
                    ? new Date()
                    : loggedUser?.school_change_last_at
            };

            setLoggedUser(normalizeUserEntity(updatedUser, loggedUser.id));
            setUsers((previousUsers) => previousUsers.map((person) => {
                const personId = String(person?.id || '').trim();
                if (personId !== String(loggedUser?.id || '').trim()) {
                    return person;
                }

                return normalizeUserEntity({ ...person, ...updatedUser }, personId);
            }));
            setErrorMessage('Perfil salvo com sucesso.');
        } catch (error) {
            console.error('Erro ao salvar perfil:', error);
            const message = String(error?.message || '').trim() || 'Falha ao salvar perfil. Tente novamente.';
            setErrorMessage(message);
            throw new Error(message);
        }
    };

    return {
        authLoading,
        authUser,
        loggedUser,
        profileCompletionContext,
        isCompletingSocialProfile,
        authMode,
        setAuthMode,
        authError,
        setAuthError,
        authNotice,
        setAuthNotice,
        isSubmitting,
        loginForm,
        setLoginForm,
        registerForm,
        setRegisterForm,
        schoolSearchTerm,
        setSchoolSearchTerm,
        filteredSchoolGroups,
        allSchoolUnits,
        handleLogin,
        handlePasswordReset,
        handleRegister,
        handleGoogleAuth,
        handleOutlookAuth,
        currentView,
        setCurrentView,
        isModalOpen,
        setIsModalOpen,
        myClubId,
        myClubIds,
        setViewingClubId,
        searchTerm,
        setSearchTerm,
        leadUser,
        selectedClub,
        handleLogout,
        handleSaveProfile,
        errorMessage,
        loading,
        feedProjects,
        clubs,
        schools,
        users,
        diaryEntries,
        projectsTotalCount,
        isFetchingProjects,
        hasMoreProjects,
        loadMoreProjectsRef,
        setSelectedClubId,
        setSelectedProjectId,
        projectsCatalog,
        getProjectTeam,
        getInvestigatorDisplayNames,
        selectedProject,
        myClubProjects,
        selectedSchool,
        selectedTeam,
        derivedDiaryEntries,
        canViewDiary,
        canEditDiary,
        getLattesLink,
        composeMentoriaLabel,
        viewingClub,
        viewingClubSchool,
        viewingClubProjects,
        viewingClubUsers,
        viewingClubOrientadores,
        viewingClubCoorientadores,
        viewingClubInvestigadores,
        viewingClubDiaryCount,
        myClub,
        mentorManagedClubs,
        schoolClubDiscoveryList,
        latestMyClubJoinRequestByClubId,
        requestingClubIds,
        handleRequestClubEntry,
        clubJoinRequests,
        reviewingClubRequestIds,
        handleRespondClubEntryRequest,
        handleCreateProject,
        handleUpdateProject,
        handleDeleteProject,
        handleCreateClub,
        handleUpdateClub,
        handleUpdateClubCardTemplate,
        creatingClub,
        updatingClub,
        newEntry,
        setNewEntry,
        handleAddEntry,
        savingEntry,
        isMentoriaPerfil,
        sidebarOrder,
        setSidebarOrder,
        saveSidebarOrder
    };
}

function isMentoriaPerfil(perfil) {
    return ['orientador', 'coorientador'].includes(String(perfil || '').trim().toLowerCase());
}

function canSelfCorrectSchoolProfile(perfil) {
    const normalizedPerfil = String(perfil || '').trim().toLowerCase();
    return ['estudante', 'investigador', 'aluno', 'clubista', 'orientador', 'coorientador'].includes(normalizedPerfil);
}

function isValidHttpUrl(url) {
    try {
        const parsedUrl = new URL(url);
        return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
        return false;
    }
}

