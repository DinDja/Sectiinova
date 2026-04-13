import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
    addDoc,
    collection,
    doc,
    getDocs,
    getDoc,
    limit,
    orderBy,
    query,
    setDoc,
    startAfter,
    serverTimestamp,
    updateDoc,
} from 'firebase/firestore';
import {
    createUserWithEmailAndPassword,
    deleteUser,
    GoogleAuthProvider,
    onAuthStateChanged,
    OAuthProvider,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut
} from 'firebase/auth';

import { db, auth } from '../../firebase';
import dadosUnidades from '../../DadosUnidades.json';
import dadosUnidadesMunicipais from '../../DadosUnidadesMunicipaisBA_8_9.json';
import { getLattesLink, composeMentoriaLabel } from '../utils/helpers';
import { STAGES, PROJECTS_PAGE_SIZE } from '../constants/appConstants';
import { buildProjectEntries, getProjectTeam, getInvestigatorDisplayNames, normalizePerfil } from '../services/projectService';
import cachedDataService from '../services/cachedDataService';
import indexedDBService from '../services/indexedDBService';

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
    const [errorMessage, setErrorMessage] = useState('');
    const [viewingClubId, setViewingClubId] = useState('');
    const [clubProjects, setClubProjects] = useState([]);
    const [myClubProjects, setMyClubProjects] = useState([]);
    const [authUser, setAuthUser] = useState(null);
    const [loggedUser, setLoggedUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [authMode, setAuthMode] = useState('login');
    const [authError, setAuthError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [schoolSearchTerm, setSchoolSearchTerm] = useState('');
    const [loginForm, setLoginForm] = useState({ email: '', senha: '' });
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
    const defaultSidebarOrder = ['Projetos', 'diario', 'trilha', 'inpi', 'forum', 'clube'];
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
        return new Map(schools.map((school) => [String(school.id), school]));
    }, [schools]);

    const searchableProjects = useMemo(() => {
        return allProjects.map((project) => {
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
    }, [allProjects, clubsById, schoolsById]);

    const myClubId = useMemo(() => {
        if (!loggedUser || clubs.length === 0) return '';

        if (loggedUser.clube_id) {
            return String(loggedUser.clube_id);
        }

        if (loggedUser.escola_id) {
            const club = clubs.find((item) => String(item.escola_id || '') === String(loggedUser.escola_id));
            return club?.id ? String(club.id) : '';
        }

        return '';
    }, [loggedUser, clubs]);

    const myClub = useMemo(() => {
        if (!myClubId) return null;
        return clubs.find((club) => String(club.id) === String(myClubId)) || null;
    }, [myClubId, clubs]);

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
            try {
                setLoading(true);

                // Limita diário para reduzir payload/leitura em bases muito grandes.
                const diaryConstraints = [orderBy('createdAt', 'desc'), limit(500)];

                const [loadedClubs, loadedUsers, loadedSchools, loadedDiaryEntries, loadedAllProjects] = await Promise.all([
                    cachedDataService.getCollectionList('clubes_ciencia', [], true),
                    cachedDataService.getCollectionList('usuarios', [], true),
                    cachedDataService.getCollectionList('unidades_escolares', [], true),
                    cachedDataService.getCollectionList('diario_bordo', diaryConstraints, true),
                    cachedDataService.getCollectionList('projetos', [], true)
                ]);

                if (!isMounted) {
                    return;
                }

                setClubs(loadedClubs || []);
                setUsers(loadedUsers || []);
                setSchools(loadedSchools || []);
                setDiaryEntries(loadedDiaryEntries || []);
                setAllProjects(loadedAllProjects || []);
            } catch (error) {
                console.error('Erro ao carregar dados iniciais com cache:', error);
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
    }, []);

    useEffect(() => {
        void fetchProjectsPage(true);
    }, [fetchProjectsPage]);

    useEffect(() => {
        const fetchProjectsTotalCount = async () => {
            try {
                // 🎯 USAR CACHE DISTRIBUÍDO
                const count = await cachedDataService.getCountFromCollection('projetos');
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

    const scopedProjects = deferredSearchTerm ? filteredSearchProjects : projects;

    const feedProjects = useMemo(() => {
        return scopedProjects.filter((project) => {
            const title = String(project.titulo || '').trim();
            const description = String(project.descricao || project.introducao || '').trim();

            if (!title || /^\.*$/.test(title)) {
                return false;
            }

            // Em pesquisa, exibimos títulos mesmo que descrição/introd esteja ausente.
            if (deferredSearchTerm) {
                return true;
            }

            return Boolean(description);
        });
    }, [scopedProjects, deferredSearchTerm]);

    const selectedClub = clubs.find((club) => String(club.id) === String(selectedClubId)) ?? null;
    const selectedProject = allProjects.find((project) => project.id === selectedProjectId) ?? null;
    const selectedSchool = schools.find((school) => school.id === selectedClub?.escola_id) ?? null;
    const selectedTeam = selectedProject
        ? getProjectTeam(selectedProject, users, selectedClubId)
        : { orientadores: [], coorientadores: [], investigadores: [] };

    const isUserProjectMember = Boolean(
        loggedUser &&
        [
            ...(selectedTeam.orientadores || []),
            ...(selectedTeam.coorientadores || []),
            ...(selectedTeam.investigadores || [])
        ].some((member) => {
            if (!member || !loggedUser) return false;
            const memberId = String(member.id || '').trim();
            const userId = String(loggedUser.id || '').trim();
            const memberEmail = String(member.email || '').toLowerCase().trim();
            const userEmail = String(loggedUser.email || '').toLowerCase().trim();
            const memberMatricula = String(member.matricula || member['matrícula'] || '').trim();
            const userMatricula = String(loggedUser.matricula || loggedUser['matrícula'] || '').trim();

            return (
                (memberId && userId && memberId === userId) ||
                (memberEmail && userEmail && memberEmail === userEmail) ||
                (memberMatricula && userMatricula && memberMatricula === userMatricula)
            );
        })
    );

    const leadUser = selectedTeam.orientadores[0]
        ?? selectedTeam.coorientadores[0]
        ?? selectedTeam.investigadores[0]
        ?? null;

    const derivedDiaryEntries = selectedProject ? buildProjectEntries(selectedProject, diaryEntries, selectedTeam) : [];

    const currentClubId = selectedClub?.id || viewingClubId || '';
    const canEditDiary = Boolean(selectedProject && isUserProjectMember);

    const viewingClub = clubs.find((item) => item.id === viewingClubId) ?? null;
    const viewingClubSchool = schools.find((item) => item.id === viewingClub?.escola_id) ?? null;
    const viewingClubProjects = viewingClubId ? clubProjects : [];
    const viewingClubUsers = users.filter((user) => String(user.clube_id) === String(viewingClubId));
    const viewingClubOrientadores = viewingClubUsers.filter((user) => normalizePerfil(user.perfil) === 'orientador');
    const viewingClubCoorientadores = viewingClubUsers.filter((user) => normalizePerfil(user.perfil) === 'coorientador');
    const viewingClubInvestigadores = viewingClubUsers.filter((user) => ['estudante', 'investigador', 'aluno'].includes(normalizePerfil(user.perfil)));
    const viewingClubDiaryCount = diaryEntries.filter((entry) => entry.clube_id === viewingClubId).length;

    const submitDiaryEntry = async (event) => {
        event.preventDefault();

        if (!selectedProject || !selectedClub || !newEntry.title || !newEntry.whatWasDone) {
            return;
        }

        if (!isUserProjectMember) {
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
                    const snap = await getDoc(doc(db, 'usuarios', user.uid));
                    if (snap.exists()) {
                        setAuthUser(user);
                        const userData = snap.data();
                        setLoggedUser({ id: snap.id, ...userData });
                        
                        // Carregar ordem do sidebar se existir
                        if (userData.sidebarOrder && Array.isArray(userData.sidebarOrder)) {
                            const defaultOrder = ['Projetos', 'diario', 'trilha', 'inpi', 'forum', 'clube'];
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
    }, []);

    useEffect(() => {
        if (!authUser || !loggedUser || clubs.length === 0) {
            return;
        }

        const clubFromUserId = loggedUser.clube_id
            ? clubs.find((club) => String(club.id) === String(loggedUser.clube_id))
            : null;

        const clubFromSchool = loggedUser.escola_id
            ? clubs.find((club) => String(club.escola_id || '') === String(loggedUser.escola_id))
            : null;

        const clubToUse = clubFromUserId || clubFromSchool;

        if (clubToUse?.id) {
            setSelectedClubId((currentId) => currentId || clubToUse.id);
            setViewingClubId((currentId) => currentId || clubToUse.id);

            if (!loggedUser.clube_id) {
                const userRef = doc(db, 'usuarios', loggedUser.id);
                updateDoc(userRef, { clube_id: clubToUse.id }).catch((error) => {
                    console.error('Falha ao atualizar clube_id do usuário:', error);
                });
            }
        }
    }, [clubs, authUser, loggedUser]);

    useEffect(() => {
        if (!viewingClubId) {
            setClubProjects([]);
            return;
        }

        setClubProjects(
            allProjects.filter((project) => String(project.clube_id || '') === String(viewingClubId))
        );
    }, [allProjects, viewingClubId]);

    useEffect(() => {
        if (!myClubId) {
            setMyClubProjects([]);
            return;
        }

        setMyClubProjects(
            allProjects.filter((project) => String(project.clube_id || '') === String(myClubId))
        );
    }, [allProjects, myClubId]);

    const handleLogin = async (event) => {
        event.preventDefault();
        setAuthError('');
        setIsSubmitting(true);

        try {
            await signInWithEmailAndPassword(auth, loginForm.email.trim(), loginForm.senha);
        } catch (error) {
            console.error('Erro no login:', error);
            setAuthError(getAuthErrorMessage(error.code, error.message || String(error)));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRegister = async (event) => {
        event.preventDefault();
        setAuthError('');

        const escolaUnit = allSchoolUnits.find((unit) => unit.escola_id === registerForm.escola_id);
        if (!escolaUnit) {
            setAuthError('Selecione uma unidade escolar válida.');
            return;
        }
        if (registerForm.senha !== registerForm.confirmarSenha) {
            setAuthError('As senhas não coincidem.');
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
            const userCredential = await createUserWithEmailAndPassword(auth, registerForm.email.trim(), registerForm.senha);

            const matchingClub = clubs.find((club) => String(club.escola_id) === String(escolaUnit.escola_id));
            const profileData = {
                uid: userCredential.user.uid,
                nome: registerForm.nome.trim(),
                email: registerForm.email.trim(),
                perfil: registerForm.perfil,
                rede_administrativa: registerForm.rede_administrativa === 'municipal' ? 'municipal' : 'estadual',
                escola_id: escolaUnit.escola_id,
                escola_nome: escolaUnit.nome,
                escola_municipio: String(escolaUnit.municipio || '').trim(),
                escola_uf: String(escolaUnit.uf || 'BA').trim() || 'BA',
                clube_id: matchingClub?.id || '',
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

            const snap = await getDoc(doc(db, 'usuarios', userCredential.user.uid));
            isRegisteringRef.current = false;
            setAuthUser(userCredential.user);
            setLoggedUser({ id: snap.id, ...snap.data() });
        } catch (error) {
            isRegisteringRef.current = false;
            console.error('Erro no cadastro (Auth/Firestore):', error);
            setAuthError(getAuthErrorMessage(error.code, error.message || String(error)));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSocialAuth = async (providerName) => {
        setAuthError('');
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
            setLoggedUser({ id: refreshedUserSnap.id, ...refreshedUserSnap.data() });
        } catch (error) {
            console.error(`Erro no login social (${providerName}):`, error);
            setAuthError(getAuthErrorMessage(error.code, error.message || String(error)));
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

    const handleCreateProject = async ({ titulo, descricao, area_tematica, status, tipo, coorientador_ids = [], investigadores_ids = [], imagens = [] }) => {
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

            const normalizedCoorientadores = [...new Set((coorientador_ids || []).map((id) => String(id || '').trim()).filter(Boolean))];
            const normalizedInvestigadores = [...new Set((investigadores_ids || []).map((id) => String(id || '').trim()).filter(Boolean))];
            const normalizedOrientadores = [...new Set([creatorId])];

            newProjectData.orientador_ids = normalizedOrientadores;

            if (normalizedCoorientadores.length > 0) {
                newProjectData.coorientador_ids = normalizedCoorientadores;
            }

            if (normalizedInvestigadores.length > 0) {
                newProjectData.investigadores_ids = normalizedInvestigadores;
            }

            const membrosIds = [...new Set([...normalizedOrientadores, ...normalizedCoorientadores, ...normalizedInvestigadores])];
            if (membrosIds.length > 0) {
                newProjectData.membros_ids = membrosIds;
            }

            const normalizedImagens = Array.isArray(imagens)
                ? imagens.filter((img) => typeof img === 'string' && img.trim()).slice(0, 2)
                : [];

            if (normalizedImagens.length > 0) {
                newProjectData.imagens = normalizedImagens;
            }

            const projectRef = await addDoc(collection(db, 'projetos'), newProjectData);

            await cachedDataService.invalidateCollection('projetos');

            setSelectedProjectId(projectRef.id);
            setCurrentView('clube');
            setErrorMessage('Projeto cadastrado com sucesso.');

            // Forçar atualização local imediata se necessário
            setClubProjects((prev) => [{ id: projectRef.id, ...newProjectData }, ...prev]);
            setAllProjects((prev) => [{ id: projectRef.id, ...newProjectData }, ...prev]);

            return projectRef.id;
        } catch (error) {
            console.error('Erro ao criar projeto:', error);
            setErrorMessage('Falha ao criar projeto. Tente novamente.');
            throw error;
        } finally {
            setIsFetchingProjects(false);
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
            setLoggedUser(updatedUser);
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
        handleRegister,
        handleGoogleAuth,
        handleOutlookAuth,
        currentView,
        setCurrentView,
        isModalOpen,
        setIsModalOpen,
        myClubId,
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
        handleCreateProject,
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

