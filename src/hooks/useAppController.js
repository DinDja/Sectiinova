import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
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
import dadosUnidades from '../../DadosUnidades.json';
import dadosUnidadesMunicipais from '../../DadosUnidadesMunicipaisBA_8_9.json';
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

const CLUB_DOCUMENT_INLINE_MAX_BYTES = 200 * 1024;
const CLUB_DOCUMENT_INLINE_TOTAL_MAX_BYTES = 420 * 1024;

const isFileLike = (value) => typeof File !== 'undefined' && value instanceof File;

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    if (!isFileLike(file)) {
        resolve('');
        return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Nao foi possivel ler o arquivo selecionado.'));
    reader.readAsDataURL(file);
});

const DIARY_PROJECT_QUERY_CHUNK_SIZE = 10;
const MAX_PROJECT_IMAGES = 5;
const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 5 * 60 * 1000;
const EMAIL_VERIFICATION_RESEND_STORAGE_PREFIX = 'auth:verificationResend:';

const normalizeEmailAddress = (value) => String(value || '').trim().toLowerCase();

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
    const [currentView, setCurrentView] = useState('Projetos');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clubs, setClubs] = useState([]);
    const [projects, setProjects] = useState([]);
    const [allProjects, setAllProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [schools, setSchools] = useState([]);
    const [diaryEntries, setDiaryEntries] = useState([]);
    const [projectsCursor, setProjectsCursor] = useState(null);
    const [hasMoreProjects, setHasMoreProjects] = useState(true);
    const [isFetchingProjects, setIsFetchingProjects] = useState(false);
    const [projectsTotalCount, setProjectsTotalCount] = useState(0);
    const [selectedClubId, setSelectedClubId] = useState('');
    const [loadMoreNode, setLoadMoreNode] = useState(null);
    const loadMoreProjectsRef = useCallback((node) => {
        setLoadMoreNode(node);
    }, []);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchLoading, setIsSearchLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [savingEntry, setSavingEntry] = useState(false);
    const [creatingClub, setCreatingClub] = useState(false);
    const [updatingClub, setUpdatingClub] = useState(false);
    const [clubJoinRequests, setClubJoinRequests] = useState([]);
    const [myClubJoinRequests, setMyClubJoinRequests] = useState([]);
    const [requestingClubIds, setRequestingClubIds] = useState(new Set());
    const [reviewingClubRequestIds, setReviewingClubRequestIds] = useState(new Set());
    const [errorMessage, setErrorMessage] = useState('');
    const [viewingClubId, setViewingClubId] = useState('');
    const [clubProjects, setClubProjects] = useState([]);
    const [myClubProjects, setMyClubProjects] = useState([]);
    const [authUser, setAuthUser] = useState(null);
    const [loggedUser, setLoggedUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [authMode, setAuthMode] = useState('login');
    const [authError, setAuthError] = useState('');
    const [authNotice, setAuthNotice] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [schoolSearchTerm, setSchoolSearchTerm] = useState('');
    const [loginForm, setLoginForm] = useState({
        email: '',
        senha: '',
        rememberDevice: false
    });
    const [registerForm, setRegisterForm] = useState({
        nome: '',
        email: '',
        senha: '',
        confirmarSenha: '',
        perfil: 'estudante',
        rede_administrativa: 'estadual',
        escola_id: '',
        escola_nome: '',
        matricula: '',
        lattes: ''
    });
    const [newEntry, setNewEntry] = useState({
        title: '',
        duration: '',
        stage: STAGES[0],
        whatWasDone: '',
        discoveries: '',
        obstacles: '',
        nextSteps: '',
        tags: ''
    });
    const defaultSidebarOrder = ['Projetos', 'meusProjetos', 'trilha', 'inpi', 'forum', 'clube'];
    const [sidebarOrder, setSidebarOrder] = useState(defaultSidebarOrder);

    const isRegisteringRef = useRef(false);
    const projectsCursorRef = useRef(null);
    const hasMoreProjectsRef = useRef(true);
    const isFetchingProjectsRef = useRef(false);

    const normalizeText = (text) =>
        String(text || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .replace(/\s+/g, ' ')
            .trim();

    const getLevenshteinDistance = (a, b) => {
        const matrix = Array.from({ length: b.length + 1 }, () => []);

        for (let i = 0; i <= b.length; i += 1) {
            matrix[i][0] = i;
        }

        for (let j = 0; j <= a.length; j += 1) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i += 1) {
            for (let j = 1; j <= a.length; j += 1) {
                const cost = a[j - 1] === b[i - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }

        return matrix[b.length][a.length];
    };

    const isFuzzyMatch = (term, text) => {
        if (!term || !text) return false;

        if (text.includes(term)) return true;

        const termLength = term.length;
        const maxDistance = Math.max(1, Math.floor(termLength * 0.35));

        const words = text.split(/\s+/).filter(Boolean);
        for (const word of words) {
            if (Math.abs(word.length - termLength) > Math.max(2, termLength)) continue;
            if (getLevenshteinDistance(term, word) <= maxDistance) {
                return true;
            }
        }

        return false;
    };

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

    const normalizeSchoolName = useCallback((value) => String(value || '').trim().toLowerCase(), []);

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

    const normalizedSearchTerm = useMemo(() => normalizeText(searchTerm), [searchTerm]);
    const deferredSearchTerm = useDeferredValue(normalizedSearchTerm);

    useEffect(() => {
        if (!searchTerm || !searchTerm.trim()) {
            setIsSearchLoading(false);
            return;
        }

        setIsSearchLoading(true);
        const timer = window.setTimeout(() => {
            setIsSearchLoading(false);
        }, 250);

        return () => window.clearTimeout(timer);
    }, [searchTerm]);

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
            const club = clubsById.get(String(project.clube_id || ''));
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
                        ...(club?.coorientador_ids || []),
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
                ...(club?.coorientador_ids || []),
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
                    ...(club?.coorientador_ids || [])
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

        const mentorIds = new Set(
            normalizeIdList([
                viewedClub?.mentor_id,
                ...(viewedClub?.orientador_ids || []),
                ...(viewedClub?.coorientador_ids || [])
            ])
        );

        return mentorIds.has(loggedUserId);
    }, [loggedUserId, viewingClubId, loggedUser, clubs]);

    const userSchoolIds = useMemo(() => {
        return normalizeIdList(getUserSchoolIds(loggedUser));
    }, [loggedUser]);

    const schoolClubDiscoveryList = useMemo(() => {
        if (!loggedUser || myClubIds.length > 0 || userSchoolIds.length === 0) {
            return [];
        }

        const userSchoolSet = new Set(userSchoolIds);
        return clubs
            .filter((club) => userSchoolSet.has(String(club?.escola_id || '').trim()))
            .sort((a, b) => String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR'));
    }, [loggedUser, myClubIds, userSchoolIds, clubs]);

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

    const estadualSchoolGroups = useMemo(() => buildSchoolGroups(dadosUnidades), []);
    const municipalSchoolGroups = useMemo(
        () => buildMunicipalSchoolGroups(dadosUnidadesMunicipais),
        []
    );
    const selectedSchoolGroups = useMemo(() => {
        if (registerForm.rede_administrativa === 'municipal') {
            return municipalSchoolGroups;
        }

        return estadualSchoolGroups;
    }, [registerForm.rede_administrativa, municipalSchoolGroups, estadualSchoolGroups]);
    const allSchoolUnits = useMemo(
        () => flattenSchoolGroups(selectedSchoolGroups),
        [selectedSchoolGroups]
    );
    const fallbackSchoolUnits = useMemo(
        () => flattenSchoolGroups([...estadualSchoolGroups, ...municipalSchoolGroups]),
        [estadualSchoolGroups, municipalSchoolGroups]
    );

    const filteredSchoolGroups = useMemo(() => {
        const term = schoolSearchTerm.trim().toLowerCase();
        if (!term) {
            return selectedSchoolGroups;
        }

        return selectedSchoolGroups
            .map((group) => ({
                ...group,
                units: (group.units || []).filter((unit) => unit.nome.toLowerCase().includes(term))
            }))
            .filter((group) => (group.units || []).length > 0);
    }, [selectedSchoolGroups, schoolSearchTerm]);

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

    const normalizePdfLinks = (rawPdfLinks) => {
        if (!rawPdfLinks) return [];
        if (Array.isArray(rawPdfLinks)) {
            return rawPdfLinks.filter((link) => Boolean(String(link || '').trim()));
        }
        if (typeof rawPdfLinks === 'object') {
            return Object.values(rawPdfLinks)
                .flatMap((value) => (Array.isArray(value) ? value : [value]))
                .map((link) => String(link || '').trim())
                .filter(Boolean);
        }
        return String(rawPdfLinks || '')
            .split(/\s*,\s*|\n+/)
            .map((link) => link.trim())
            .filter(Boolean);
    };

    const sanitizeStorageFileName = (fileName) => {
        const baseName = String(fileName || 'documento')
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .replace(/[^a-zA-Z0-9._-]+/g, '_')
            .replace(/^_+|_+$/g, '');

        return (baseName || 'documento').slice(0, 120);
    };

    const hasProvidedClubDocument = (documentValue) => {
        if (isFileLike(documentValue)) {
            return true;
        }

        if (documentValue && typeof documentValue === 'object') {
            const dataUrl = String(
                documentValue?.data_url
                || documentValue?.dataUrl
                || documentValue?.base64
                || documentValue?.url
                || ''
            ).trim();
            const chunkCount = Number(documentValue?.chunk_count || documentValue?.chunkCount || 0);
            return Boolean(dataUrl) || chunkCount > 0;
        }

        if (typeof documentValue === 'string') {
            return Boolean(String(documentValue).trim());
        }

        return false;
    };

    const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || '').trim());
    const CLUB_DOCUMENT_CHUNK_CHAR_SIZE = 220000;

    const buildClubDocumentChunkDocId = (documentKey, index) => `${String(documentKey || 'doc').trim()}_${index}`;

    const splitTextIntoChunks = (text, chunkSize = CLUB_DOCUMENT_CHUNK_CHAR_SIZE) => {
        const payload = String(text || '');
        const safeChunkSize = Math.max(50000, Number(chunkSize || CLUB_DOCUMENT_CHUNK_CHAR_SIZE));
        const chunks = [];

        for (let cursor = 0; cursor < payload.length; cursor += safeChunkSize) {
            chunks.push(payload.slice(cursor, cursor + safeChunkSize));
        }

        return chunks.length > 0 ? chunks : [''];
    };

    const deleteClubDocumentChunks = async ({ clubId, documentKey, chunkCount = 0 }) => {
        const normalizedClubId = String(clubId || '').trim();
        const normalizedDocumentKey = String(documentKey || '').trim();
        const normalizedChunkCount = Math.max(0, Number(chunkCount || 0));

        if (!normalizedClubId || !normalizedDocumentKey || normalizedChunkCount <= 0) {
            return;
        }

        await Promise.all(
            Array.from({ length: normalizedChunkCount }, (_, index) => deleteDoc(
                doc(db, 'clubes', normalizedClubId, 'documentos_chunks', buildClubDocumentChunkDocId(normalizedDocumentKey, index))
            ))
        );
    };

    const writeClubDocumentChunks = async ({
        clubId,
        documentKey,
        dataUrl,
        uploadedAt
    }) => {
        const normalizedClubId = String(clubId || '').trim();
        const normalizedDocumentKey = String(documentKey || '').trim();
        const normalizedDataUrl = String(dataUrl || '');

        if (!normalizedClubId || !normalizedDocumentKey || !normalizedDataUrl.startsWith('data:')) {
            throw new Error('Documento invalido para segmentacao em Firestore.');
        }

        const chunks = splitTextIntoChunks(normalizedDataUrl, CLUB_DOCUMENT_CHUNK_CHAR_SIZE);

        await Promise.all(
            chunks.map((chunk, index) => setDoc(
                doc(db, 'clubes', normalizedClubId, 'documentos_chunks', buildClubDocumentChunkDocId(normalizedDocumentKey, index)),
                {
                    document_key: normalizedDocumentKey,
                    index,
                    total: chunks.length,
                    chunk,
                    uploaded_at: uploadedAt
                }
            ))
        );

        return chunks.length;
    };

    const compressClubDocumentDataUrl = async (dataUrl, contentType) => {
        if (!String(dataUrl || '').startsWith('data:')) {
            return String(dataUrl || '');
        }

        const normalizedType = String(contentType || '').toLowerCase();
        if (!normalizedType.startsWith('image/')) {
            return String(dataUrl || '');
        }

        let compressed = String(dataUrl || '');
        let compressedBytes = getDataUrlByteSize(compressed);

        const compressionProfiles = [
            { maxWidth: 1600, maxHeight: 1600, quality: 0.68, maxSizeKB: 700 },
            { maxWidth: 1280, maxHeight: 1280, quality: 0.56, maxSizeKB: 520 },
            { maxWidth: 1024, maxHeight: 1024, quality: 0.48, maxSizeKB: 380 },
            { maxWidth: 900, maxHeight: 900, quality: 0.42, maxSizeKB: 300 }
        ];

        for (const profile of compressionProfiles) {
            if (compressedBytes <= CLUB_DOCUMENT_INLINE_MAX_BYTES) {
                break;
            }

            try {
                compressed = await compressImageToBase64(compressed, profile);
                compressedBytes = getDataUrlByteSize(compressed);
            } catch (compressionError) {
                console.warn('Falha ao comprimir documento de clube:', compressionError);
                break;
            }
        }

        return compressed;
    };

    const getDocumentInlineBytes = (documentPayload) => {
        const dataUrl = String(documentPayload?.data_url || '').trim();
        if (!dataUrl.startsWith('data:')) {
            return 0;
        }

        return Math.max(0, getDataUrlByteSize(dataUrl));
    };

    const normalizeClubDocumentPayload = async ({
        rawDocument,
        requiredDocument,
        uploadedAt
    }) => {
        let dataUrl = '';
        let contentType = '';
        let fileName = `${requiredDocument.key}.pdf`;
        let sizeBytes = 0;
        let chunkCount = 0;

        if (isFileLike(rawDocument)) {
            dataUrl = await readFileAsDataUrl(rawDocument);
            contentType = String(rawDocument.type || 'application/octet-stream').trim();
            fileName = String(rawDocument.name || fileName).trim() || fileName;
            sizeBytes = Number(rawDocument.size || 0);
        } else if (rawDocument && typeof rawDocument === 'object') {
            dataUrl = String(
                rawDocument?.data_url
                || rawDocument?.dataUrl
                || rawDocument?.base64
                || rawDocument?.url
                || ''
            ).trim();
            contentType = String(
                rawDocument?.content_type
                || rawDocument?.mime_type
                || rawDocument?.mimeType
                || ''
            ).trim();
            chunkCount = Math.max(0, Number(rawDocument?.chunk_count || rawDocument?.chunkCount || 0));
            fileName = String(
                rawDocument?.nome_arquivo
                || rawDocument?.file_name
                || rawDocument?.name
                || fileName
            ).trim() || fileName;
            sizeBytes = Number(
                rawDocument?.tamanho_bytes
                || rawDocument?.size
                || 0
            );
        } else if (typeof rawDocument === 'string') {
            dataUrl = String(rawDocument || '').trim();
        }

        if (!dataUrl) {
            return null;
        }

        if (!contentType && dataUrl.startsWith('data:')) {
            const match = dataUrl.match(/^data:([^;]+);/i);
            contentType = String(match?.[1] || '').trim();
        }

        if (!contentType) {
            contentType = 'application/octet-stream';
        }

        if (dataUrl.startsWith('data:')) {
            dataUrl = await compressClubDocumentDataUrl(dataUrl, contentType);
        }

        if (!sizeBytes && dataUrl.startsWith('data:')) {
            sizeBytes = Math.max(0, getDataUrlByteSize(dataUrl));
        }

        return {
            key: requiredDocument.key,
            label: requiredDocument.label,
            nome_arquivo: sanitizeStorageFileName(fileName),
            caminho_storage: '',
            url: dataUrl,
            data_url: dataUrl,
            content_type: contentType,
            tamanho_bytes: Number(sizeBytes || 0),
            storage_mode: chunkCount > 0 ? 'firestore_chunks' : 'inline',
            chunk_count: chunkCount,
            uploaded_at: uploadedAt,
        };
    };

    const materializeClubDocumentPayload = async ({
        clubId,
        uploadedAt,
        requiredDocument,
        documentPayload,
        previousDocument = null,
        forceChunk = false
    }) => {
        if (!documentPayload || typeof documentPayload !== 'object') {
            return null;
        }

        const previousChunkCount = Math.max(0, Number(previousDocument?.chunk_count || previousDocument?.chunkCount || 0));
        const dataUrl = String(documentPayload?.data_url || documentPayload?.url || '').trim();
        const fileName = sanitizeStorageFileName(documentPayload?.nome_arquivo || `${requiredDocument.key}.pdf`);
        const contentType = String(documentPayload?.content_type || 'application/octet-stream').trim() || 'application/octet-stream';

        if (!dataUrl) {
            if (previousChunkCount > 0) {
                await deleteClubDocumentChunks({ clubId, documentKey: requiredDocument.key, chunkCount: previousChunkCount });
            }
            return null;
        }

        if (!dataUrl.startsWith('data:')) {
            if (previousChunkCount > 0) {
                await deleteClubDocumentChunks({ clubId, documentKey: requiredDocument.key, chunkCount: previousChunkCount });
            }

            return {
                key: requiredDocument.key,
                label: requiredDocument.label,
                nome_arquivo: fileName,
                caminho_storage: '',
                url: dataUrl,
                data_url: '',
                content_type: contentType,
                tamanho_bytes: Number(documentPayload?.tamanho_bytes || 0),
                storage_mode: isHttpUrl(dataUrl) ? 'external_url' : 'inline',
                chunk_count: 0,
                uploaded_at: uploadedAt
            };
        }

        const sizeBytes = Math.max(0, getDataUrlByteSize(dataUrl));
        const shouldChunk = forceChunk || sizeBytes > CLUB_DOCUMENT_INLINE_MAX_BYTES;

        if (!shouldChunk) {
            if (previousChunkCount > 0) {
                await deleteClubDocumentChunks({ clubId, documentKey: requiredDocument.key, chunkCount: previousChunkCount });
            }

            return {
                key: requiredDocument.key,
                label: requiredDocument.label,
                nome_arquivo: fileName,
                caminho_storage: '',
                url: dataUrl,
                data_url: dataUrl,
                content_type: contentType,
                tamanho_bytes: sizeBytes,
                storage_mode: 'inline',
                chunk_count: 0,
                uploaded_at: uploadedAt
            };
        }

        if (previousChunkCount > 0) {
            await deleteClubDocumentChunks({ clubId, documentKey: requiredDocument.key, chunkCount: previousChunkCount });
        }

        const chunkCount = await writeClubDocumentChunks({
            clubId,
            documentKey: requiredDocument.key,
            dataUrl,
            uploadedAt
        });

        return {
            key: requiredDocument.key,
            label: requiredDocument.label,
            nome_arquivo: fileName,
            caminho_storage: '',
            url: '',
            data_url: '',
            content_type: contentType,
            tamanho_bytes: sizeBytes,
            storage_mode: 'firestore_chunks',
            chunk_count: chunkCount,
            uploaded_at: uploadedAt
        };
    };

    const normalizeClubDocumentsForFirestore = async ({
        clubId,
        uploadedAt,
        documentsByKey = {},
        previousDocumentsByKey = {}
    }) => {
        const normalizedClubId = String(clubId || '').trim();
        const sourceDocuments = documentsByKey && typeof documentsByKey === 'object' ? documentsByKey : {};
        const previousDocuments = previousDocumentsByKey && typeof previousDocumentsByKey === 'object'
            ? previousDocumentsByKey
            : {};
        const materializedDocuments = {};

        const allDocumentKeys = new Set([
            ...Object.keys(sourceDocuments),
            ...Object.keys(previousDocuments)
        ]);

        for (const documentKey of allDocumentKeys) {
            const hasCurrentDocument = Object.prototype.hasOwnProperty.call(sourceDocuments, documentKey);
            if (hasCurrentDocument) {
                continue;
            }

            const previousDocument = previousDocuments[documentKey];
            const previousChunkCount = Math.max(0, Number(previousDocument?.chunk_count || previousDocument?.chunkCount || 0));
            if (previousChunkCount > 0) {
                await deleteClubDocumentChunks({
                    clubId: normalizedClubId,
                    documentKey,
                    chunkCount: previousChunkCount
                });
            }
        }

        for (const [documentKey, documentPayload] of Object.entries(sourceDocuments)) {
            const requiredDocument = CLUB_REQUIRED_DOCUMENTS.find((item) => item.key === documentKey) || {
                key: String(documentKey || 'documento').trim() || 'documento',
                label: String(documentPayload?.label || 'Documento').trim() || 'Documento'
            };
            const previousDocument = previousDocuments[documentKey] || null;

            const materializedPayload = await materializeClubDocumentPayload({
                clubId: normalizedClubId,
                uploadedAt,
                requiredDocument,
                documentPayload,
                previousDocument,
                forceChunk: false
            });

            if (!materializedPayload) {
                continue;
            }

            materializedDocuments[documentKey] = materializedPayload;
        }

        const collectInlineEntries = () => Object.entries(materializedDocuments)
            .filter(([, item]) => String(item?.storage_mode || '').trim() === 'inline')
            .filter(([, item]) => String(item?.data_url || '').trim().startsWith('data:'))
            .map(([key, item]) => ({ key, item }));

        let inlineEntries = collectInlineEntries();
        let inlineTotalBytes = inlineEntries.reduce((total, entry) => total + getDocumentInlineBytes(entry.item), 0);

        while (inlineEntries.length > 0 && inlineTotalBytes > CLUB_DOCUMENT_INLINE_TOTAL_MAX_BYTES) {
            const largestInline = inlineEntries
                .slice()
                .sort((a, b) => getDocumentInlineBytes(b.item) - getDocumentInlineBytes(a.item))[0];
            if (!largestInline) {
                break;
            }

            const requiredDocument = CLUB_REQUIRED_DOCUMENTS.find((item) => item.key === largestInline.key) || {
                key: largestInline.key,
                label: String(largestInline.item?.label || 'Documento').trim() || 'Documento'
            };

            const chunkedPayload = await materializeClubDocumentPayload({
                clubId: normalizedClubId,
                uploadedAt,
                requiredDocument,
                documentPayload: largestInline.item,
                previousDocument: previousDocuments[largestInline.key] || null,
                forceChunk: true
            });

            if (!chunkedPayload) {
                delete materializedDocuments[largestInline.key];
            } else {
                materializedDocuments[largestInline.key] = chunkedPayload;
            }

            inlineEntries = collectInlineEntries();
            inlineTotalBytes = inlineEntries.reduce((total, entry) => total + getDocumentInlineBytes(entry.item), 0);
        }

        return materializedDocuments;
    };

    const scopedProjects = deferredSearchTerm ? filteredSearchProjects : projectsCatalog;

    const feedProjects = useMemo(() => {
        return scopedProjects.filter((project) => Boolean(String(project?.id || '').trim()));
    }, [scopedProjects]);

    const selectedProject = projectsCatalog.find((project) => String(project.id) === String(selectedProjectId)) ?? null;
    const selectedClub =
        clubs.find((club) => String(club.id) === String(selectedClubId))
        ?? clubs.find((club) => String(club.id) === String(selectedProject?.clube_id || ''))
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
        ...(viewingClub?.coorientador_ids || []),
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
                author: leadUser?.nome || 'Registro manual',
                mediator: composeMentoriaLabel(selectedTeam.orientadores, selectedTeam.coorientadores),
                clube_id: selectedClub.id,
                projeto_id: selectedProject.id,
                escola_id: selectedClub.escola_id,
                createdAt: serverTimestamp()
            });

            // 🎯 INVALIDAR CACHE para forçar refetch
            await cachedDataService.invalidateCollection('diario_bordo');

            setNewEntry({ title: '', duration: '', stage: STAGES[0], whatWasDone: '', discoveries: '', obstacles: '', nextSteps: '', tags: '' });
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
                        setAuthNotice({
                            tone: 'warning',
                            message: buildVerificationPendingNotice(resendResult)
                        });
                        setAuthLoading(false);
                        return;
                    }

                    const userRef = doc(db, 'usuarios', user.uid);
                    let snap = await getDoc(userRef);

                    if (!snap.exists()) {
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
                        setAuthUser(user);
                        const userData = snap.data();
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
                }
            } else {
                setAuthUser(null);
                setLoggedUser(null);
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

        if (myClubIds.length === 0) {
            return;
        }

        const fallbackClubId = myClubIds[0];

        setSelectedClubId((currentId) => {
            const normalizedCurrentId = String(currentId || '').trim();
            if (normalizedCurrentId && myClubIds.includes(normalizedCurrentId)) {
                return normalizedCurrentId;
            }

            return fallbackClubId;
        });

        setViewingClubId((currentId) => {
            const normalizedCurrentId = String(currentId || '').trim();
            if (normalizedCurrentId && myClubIds.includes(normalizedCurrentId)) {
                return normalizedCurrentId;
            }

            return fallbackClubId;
        });
    }, [clubs, authUser, loggedUser, myClubIds]);

    useEffect(() => {
        if (currentView !== 'clube') {
            return;
        }

        if (myClubIds.length === 0) {
            if (String(viewingClubId || '').trim()) {
                setViewingClubId('');
            }

            if (String(selectedClubId || '').trim()) {
                setSelectedClubId('');
            }
            return;
        }

        const fallbackClubId = myClubIds[0];
        const normalizedViewingClubId = String(viewingClubId || '').trim();
        const normalizedSelectedClubId = String(selectedClubId || '').trim();

        if (!normalizedViewingClubId || !myClubIds.includes(normalizedViewingClubId)) {
            setViewingClubId(fallbackClubId);
        }

        if (!normalizedSelectedClubId || !myClubIds.includes(normalizedSelectedClubId)) {
            setSelectedClubId(fallbackClubId);
        }
    }, [currentView, myClubIds, viewingClubId, selectedClubId]);

    useEffect(() => {
        if (!viewingClubId) {
            setClubProjects([]);
            return;
        }

        setClubProjects(
            projectsCatalog.filter((project) => String(project.clube_id || '') === String(viewingClubId))
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
            projectsCatalog.filter((project) => myClubIdSet.has(String(project?.clube_id || '').trim()))
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

        const escolaUnit = allSchoolUnits.find((unit) => unit.escola_id === registerForm.escola_id);
        if (!escolaUnit) {
            setAuthError('Selecione uma unidade escolar válida.');
            return;
        }
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
        if (isMentoriaPerfil(registerForm.perfil) && !registerForm.matricula.trim()) {
            setAuthError('Informe a matrícula.');
            return;
        }
        if (isMentoriaPerfil(registerForm.perfil) && registerForm.lattes && !isValidHttpUrl(registerForm.lattes)) {
            setAuthError('Informe um link Lattes válido (https://lattes.cnpq.br/...).');
            return;
        }

        if (isMentoriaPerfil(registerForm.perfil)) {
            const emailNormalized = String(registerForm.email || '').trim().toLowerCase();
            if (!/@enova\.educacao\.ba\.gov\.br$/.test(emailNormalized)) {
                setAuthError('Orientadores e coorientadores devem usar e-mail @enova.educacao.ba.gov.br.');
                return;
            }
        }

        setIsSubmitting(true);
        isRegisteringRef.current = true;

        try {
            await setPersistence(auth, browserSessionPersistence);

            const normalizedEmail = String(registerForm.email || '').trim().toLowerCase();
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

        try {
            const normalizedProvider = String(providerName || '').trim().toLowerCase();
            const provider = normalizedProvider === 'google'
                ? new GoogleAuthProvider()
                : new OAuthProvider('microsoft.com');

            provider.setCustomParameters({ prompt: 'select_account' });

            const userCredential = await signInWithPopup(auth, provider);
            const user = userCredential.user;
            const userRef = doc(db, 'usuarios', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                const fullName = String(user.displayName || '').trim();
                const userEmail = String(user.email || '').trim();
                const fallbackName = userEmail.includes('@') ? userEmail.split('@')[0] : 'Usuário';

                await setDoc(userRef, {
                    uid: user.uid,
                    nome: fullName || fallbackName,
                    email: userEmail,
                    perfil: 'estudante',
                    rede_administrativa: '',
                    escolas_ids: [],
                    clubes_ids: [],
                    escola_id: '',
                    escola_nome: '',
                    escola_municipio: '',
                    escola_uf: '',
                    clube_id: '',
                    auth_provider: normalizedProvider === 'google' ? 'google' : 'microsoft',
                    createdAt: serverTimestamp()
                });

                await cachedDataService.invalidateCollection('usuarios');
            }

            const refreshedUserSnap = await getDoc(userRef);
            setAuthUser(user);
            setLoggedUser(normalizeUserEntity(refreshedUserSnap.data(), refreshedUserSnap.id));
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
            setErrorMessage('Selecione um clube para registrar o projeto.');
            return;
        }

        const creatorId = String(loggedUser?.id || authUser?.uid || '').trim();

        if (!creatorId) {
            setErrorMessage('Usuário não autenticado para criação de projeto.');
            return;
        }

        if (!titulo || !String(titulo).trim()) {
            setErrorMessage('Informe o título do projeto.');
            return;
        }
        const isCreatorMentor = isMentoriaPerfil(loggedUser?.perfil);
        if (isCreatorMentor && !termo_aceite_criacao) {
            setErrorMessage('Para criar o projeto, o mentor precisa aceitar o termo de criacao de projetos.');
            return;
        }

        try {
            setErrorMessage('');
            setIsFetchingProjects(true);

            const newProjectData = {
                titulo: String(titulo).trim(),
                descricao: String(descricao || '').trim(),
                area_tematica: String(area_tematica || '').trim(),
                status: String(status || 'Em andamento').trim(),
                tipo: String(tipo || 'Projeto Científico').trim(),
                clube_id: viewingClub.id,
                escola_id: viewingClub.escola_id || '',
                createdAt: serverTimestamp()
            };
            if (isCreatorMentor) {
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

            const clubSchoolId = String(viewingClub?.escola_id || '').trim();
            const clubSchoolName = normalizeSchoolName(viewingClub?.escola_nome);
            const isSameSchoolUser = (person) => {
                if (!clubSchoolId && !clubSchoolName) return true;

                const personSchoolIds = getUserSchoolIds(person);
                const hasSchoolId = clubSchoolId ? personSchoolIds.includes(clubSchoolId) : false;
                const hasSchoolName = clubSchoolName
                    ? normalizeSchoolName(person?.escola_nome) === clubSchoolName
                    : false;

                return hasSchoolId || hasSchoolName;
            };

            const schoolMentorIds = users
                .filter((person) => person && isMentoriaPerfil(person?.perfil) && isSameSchoolUser(person))
                .map((person) => String(person?.id || '').trim())
                .filter(Boolean);

            const schoolInvestigadorIds = users
                .filter((person) => person && ['estudante', 'investigador', 'aluno'].includes(normalizePerfil(person?.perfil)) && isSameSchoolUser(person))
                .map((person) => String(person?.id || '').trim())
                .filter(Boolean);

            const allowedMentorIds = new Set([
                creatorId,
                ...[...viewingClubOrientadores, ...viewingClubCoorientadores]
                    .map((person) => String(person?.id || '').trim())
                    .filter(Boolean),
                ...schoolMentorIds
            ]);
            const allowedInvestigadorIds = new Set([
                ...viewingClubInvestigadores
                    .map((person) => String(person?.id || '').trim())
                    .filter(Boolean),
                ...schoolInvestigadorIds
            ]);

            const requestedCoorientadores = [...new Set((coorientador_ids || []).map((id) => String(id || '').trim()).filter(Boolean))];
            const requestedInvestigadores = [...new Set((investigadores_ids || []).map((id) => String(id || '').trim()).filter(Boolean))];

            const invalidCoorientadores = requestedCoorientadores.filter((id) => !allowedMentorIds.has(id));
            const invalidInvestigadores = requestedInvestigadores.filter((id) => !allowedInvestigadorIds.has(id));

            if (invalidCoorientadores.length > 0) {
                throw new Error('Um ou mais co-mentores selecionados não pertencem ao clube. Atualize a tela e tente novamente.');
            }

            if (invalidInvestigadores.length > 0) {
                throw new Error('Um ou mais clubistas selecionados não pertencem ao clube. Atualize a tela e tente novamente.');
            }

            const normalizedCoorientadores = requestedCoorientadores.filter((id) => id !== creatorId);
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

            const projectRef = await addDoc(collection(db, 'projetos'), newProjectData);

            const successfulInvestigadorLinks = [];
            if (normalizedInvestigadores.length > 0) {
                const investigatorLinkResults = await Promise.allSettled(
                    normalizedInvestigadores.map(async (investigatorId) => {
                        const existingInvestigator = users.find((person) => String(person?.id || '').trim() === investigatorId) || null;
                        const existingClubesIds = getUserClubIds(existingInvestigator || {});
                        const currentPrimaryClubId = String(existingInvestigator?.clube_id || '').trim();
                        const updatedClubesIds = normalizeIdList([viewingClub.id, currentPrimaryClubId, ...existingClubesIds]);
                        const nextPrimaryClubId = updatedClubesIds.includes(currentPrimaryClubId)
                            ? currentPrimaryClubId
                            : viewingClub.id;

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
            const fallbackMessage = 'Falha ao criar projeto. Tente novamente.';
            const resolvedMessage = String(error?.message || '').trim() || fallbackMessage;
            setErrorMessage(resolvedMessage);
            throw new Error(resolvedMessage);
        } finally {
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

        const selectedClubistasIds = normalizeIdList(clubistas_ids).filter((id) => id !== mentorId);
        if (!isLocalhost && selectedClubistasIds.length < 10) {
            throw new Error('O clube precisa de no minimo 10 clubistas.');
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

        if (!isLocalhost) {
            const missingDocuments = CLUB_REQUIRED_DOCUMENTS.filter((item) => !hasProvidedClubDocument(documentos?.[item.key]));
            if (missingDocuments.length > 0) {
                throw new Error(`Documentos obrigatorios pendentes: ${missingDocuments.map((item) => item.label).join(', ')}.`);
            }
        }

        try {
            setCreatingClub(true);
            setErrorMessage('');

            const clubRef = doc(collection(db, 'clubes'));
            const nowIso = new Date().toISOString();
            const uploadedDocuments = {};
            const persistedClubistasIds = [...selectedClubistasIds];

            for (const requiredDocument of CLUB_REQUIRED_DOCUMENTS) {
                const rawDocument = documentos?.[requiredDocument.key];

                if (!hasProvidedClubDocument(rawDocument)) {
                    if (isLocalhost) {
                        continue;
                    }

                    throw new Error(`Documento obrigatorio ausente: ${requiredDocument.label}`);
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
                coorientador_ids: [],
                clubistas_ids: persistedClubistasIds,
                membros_ids: normalizeIdList([mentorId, ...persistedClubistasIds]),
                documentos: normalizedClubDocuments,
                status: 'ativo',
                createdBy: mentorId,
                createdAt: serverTimestamp()
            };

            await setDoc(clubRef, clubData);

            const mentorRef = doc(db, 'usuarios', mentorId);
            await updateDoc(mentorRef, {
                clube_id: clubRef.id,
                clubes_ids: mentorClubIds,
                escola_id: mentorSchoolIdsUpdated[0] || schoolId,
                escolas_ids: mentorSchoolIdsUpdated
            });

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
            const fallbackMessage = 'Falha ao criar clube. Verifique os dados e tente novamente.';
            const resolvedMessage = String(error?.message || '').trim() || fallbackMessage;
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
            ...(currentClub?.coorientador_ids || [])
        ]);

        if (!mentorIds.includes(mentorId)) {
            throw new Error('Voce nao possui permissao para editar este clube.');
        }

        const clubName = String(nome || '').trim();
        if (!clubName) {
            throw new Error('Informe o nome do clube.');
        }

        const schoolId = String(currentClub?.escola_id || '').trim();
        const normalizedSchoolName = normalizeSchoolName(currentClub?.escola_nome);
        const periodicidadeNormalizada = String(periodicidade || currentClub?.periodicidade || 'Quinzenal').trim() || 'Quinzenal';

        const selectedClubistasIds = normalizeIdList(clubistas_ids).filter((id) => !mentorIds.includes(id));
        if (!isLocalhost && selectedClubistasIds.length < 10) {
            throw new Error('O clube precisa de no minimo 10 clubistas.');
        }

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
                clubistas_ids: selectedClubistasIds,
                membros_ids: normalizeIdList([...mentorIds, ...selectedClubistasIds]),
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

    const handleRequestClubEntry = async (clubId) => {
        if (!loggedUser || !loggedUserId) {
            throw new Error('Usuario nao autenticado.');
        }

        const normalizedClubId = String(clubId || '').trim();
        if (!normalizedClubId) {
            throw new Error('Selecione um clube valido.');
        }

        if (myClubIds.length > 0) {
            throw new Error('Voce ja possui clube vinculado no perfil.');
        }

        const targetClub = clubs.find((club) => String(club?.id || '').trim() === normalizedClubId);
        if (!targetClub) {
            throw new Error('Clube nao encontrado.');
        }

        const clubSchoolId = String(targetClub?.escola_id || '').trim();
        if (!clubSchoolId || !userSchoolIds.includes(clubSchoolId)) {
            throw new Error('Voce so pode solicitar entrada em clubes da sua unidade escolar.');
        }

        const latestRequest = latestMyClubJoinRequestByClubId.get(normalizedClubId);
        const latestStatus = String(latestRequest?.status || '').trim().toLowerCase();
        if (latestStatus === 'pendente') {
            throw new Error('Ja existe uma solicitacao pendente para este clube.');
        }

        setRequestingClubIds((previous) => new Set(previous).add(normalizedClubId));

        try {
            await addDoc(collection(db, 'clube_solicitacoes'), {
                clube_id: normalizedClubId,
                escola_id: clubSchoolId,
                escola_nome: String(targetClub?.escola_nome || '').trim(),
                solicitante_id: loggedUserId,
                solicitante_nome: String(loggedUser?.nome || '').trim() || 'Estudante',
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

            await updateDoc(userRef, updates);
            const updatedUser = { ...loggedUser, ...updates };
            setLoggedUser(normalizeUserEntity(updatedUser, loggedUser.id));
            setErrorMessage('Perfil salvo com sucesso.');
        } catch (error) {
            console.error('Erro ao salvar perfil:', error);
            setErrorMessage('Falha ao salvar perfil. Tente novamente.');
        }
    };

    return {
        authLoading,
        authUser,
        loggedUser,
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

function prettifyGroupLabel(groupKey) {
    if (!groupKey) return '';
    const normalized = String(groupKey).trim().toLowerCase();

    if (normalized === 'ept') return 'EPT';
    if (normalized === 'propedeutica') return 'Propedêutica';

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function buildSchoolGroups(dataset) {
    return Object.entries(dataset || {})
        .filter(([, value]) => Array.isArray(value))
        .map(([groupKey, values]) => {
            const units = (values || [])
                .map((unit) => {
                    const escolaId = String(unit?.cod_sec || unit?.codigo_sec || unit?.codigoSec || '').trim();
                    const nome = String(unit?.nome || '').trim();

                    if (!escolaId || !nome) {
                        return null;
                    }

                    return {
                        escola_id: escolaId,
                        nome,
                        cod_inep: String(unit?.cod_inep || '').trim(),
                        tipo_unidade: String(unit?.['TIPO DE UNIDADE'] || '').trim()
                    };
                })
                .filter(Boolean)
                .reduce((acc, unit) => {
                    if (!acc.find((item) => item.escola_id === unit.escola_id)) acc.push(unit);
                    return acc;
                }, [])
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

            return {
                key: groupKey,
                label: prettifyGroupLabel(groupKey),
                units
            };
        })
        .filter((group) => group.units.length > 0);
}

function buildMunicipalSchoolGroups(dataset) {
    const schools = Array.isArray(dataset?.escolas) ? dataset.escolas : [];
    const groupsByMunicipio = new Map();

    for (const school of schools) {
        const escolaId = String(school?.escola_id || school?.cod_inep || '').trim();
        const nome = String(school?.nome || '').trim();
        const municipio = String(school?.municipio || '').trim();
        const uf = String(school?.uf || 'BA').trim() || 'BA';

        if (!escolaId || !nome) {
            continue;
        }

        const groupKeyBase = municipio || 'Municipio nao informado';
        const groupKey = `municipal-${normalizeGroupKey(groupKeyBase)}`;

        if (!groupsByMunicipio.has(groupKey)) {
            groupsByMunicipio.set(groupKey, {
                key: groupKey,
                label: municipio || 'Municipio nao informado',
                units: []
            });
        }

        const group = groupsByMunicipio.get(groupKey);
        if (!group.units.find((item) => item.escola_id === escolaId)) {
            group.units.push({
                escola_id: escolaId,
                nome,
                cod_inep: String(school?.cod_inep || escolaId).trim(),
                tipo_unidade: 'MUNICIPAL',
                municipio,
                uf
            });
        }
    }

    return [...groupsByMunicipio.values()]
        .map((group) => ({
            ...group,
            units: group.units.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

function normalizeGroupKey(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function flattenSchoolGroups(groups) {
    return (groups || []).flatMap((group) => group.units || []);
}

function isMentoriaPerfil(perfil) {
    return ['orientador', 'coorientador'].includes(String(perfil || '').trim().toLowerCase());
}

function isValidHttpUrl(url) {
    try {
        const parsedUrl = new URL(url);
        return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
        return false;
    }
}

function getAuthErrorMessage(code, fallbackMessage = '') {
    const messages = {
        'auth/user-not-found': 'Usuário não encontrado. Verifique o e-mail ou cadastre-se.',
        'auth/wrong-password': 'Senha incorreta. Tente novamente.',
        'auth/invalid-credential': 'E-mail ou senha inválidos.',
        'auth/email-already-in-use': 'Este e-mail já está cadastrado. Tente fazer login.',
        'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
        'auth/invalid-email': 'E-mail inválido.',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde e tente novamente.',
        'auth/popup-closed-by-user': 'A janela de autenticação foi fechada antes da conclusão.',
        'auth/cancelled-popup-request': 'A autenticação foi cancelada.',
        'auth/popup-blocked': 'O navegador bloqueou o popup de login. Habilite popups e tente novamente.',
        'auth/account-exists-with-different-credential': 'Já existe uma conta com este e-mail usando outro método de login.'
    };

    if (code && messages[code]) {
        return messages[code];
    }

    const normalizedFallback = String(fallbackMessage || '').trim();
    if (normalizedFallback) {
        return normalizedFallback;
    }

    return 'Ocorreu um erro. Tente novamente.';
}



