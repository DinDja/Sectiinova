import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Search, Bell, Upload, User, BookOpen, Map,
    CheckCircle, Plus, AlertCircle, Calendar, Clock,
    Target, Lightbulb, Wrench, ArrowRight, Users,
    School, FolderKanban, Microscope, LoaderCircle, Database,
    Heart, MessageCircle, ExternalLink
} from 'lucide-react';
import {
    addDoc,
    collection,
    doc,
    getCountFromServer,
    getDocs,
    getDoc,
    limit,
    onSnapshot,
    orderBy,
    query,
    setDoc,
    startAfter,
    serverTimestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import {
    createUserWithEmailAndPassword,
    deleteUser,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { db, auth } from '../firebase';
import dadosUnidades from '../DadosUnidades.json';

const STAGES = [
    "Definição do Problema / Pergunta de Pesquisa",
    "Levantamento Hipotético / Revisão Bibliográfica",
    "Experimentação / Coleta de Dados",
    "Análise de Resultados",
    "Redação do Relatório / Preparação para Feira"
];

const PROJECTS_PAGE_SIZE = 12;
const PERFIS_LOGIN = [
    { value: 'orientador', label: 'Orientador' },
    { value: 'coorientador', label: 'Coorientador' },
    { value: 'estudante', label: 'Estudante' }
];

const SCHOOL_GROUP_LABELS = {
    ept: 'EPT',
    propedeutica: 'Propedêutica'
};

function prettifyGroupLabel(groupKey) {
    if (!groupKey) return '';
    const normalized = String(groupKey).trim().toLowerCase();
    if (SCHOOL_GROUP_LABELS[normalized]) {
        return SCHOOL_GROUP_LABELS[normalized];
    }
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function buildSchoolGroups(dataset) {
    const groups = Object.entries(dataset || {})
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
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

            return {
                key: groupKey,
                label: prettifyGroupLabel(groupKey),
                units
            };
        })
        .filter((group) => group.units.length > 0);

    return groups;
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

export default function App() {
    const [currentView, setCurrentView] = useState('Projetos');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clubs, setClubs] = useState([]);
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [schools, setSchools] = useState([]);
    const [diaryEntries, setDiaryEntries] = useState([]);
    const [projectsCursor, setProjectsCursor] = useState(null);
    const [hasMoreProjects, setHasMoreProjects] = useState(true);
    const [isFetchingProjects, setIsFetchingProjects] = useState(false);
    const [projectsTotalCount, setProjectsTotalCount] = useState(0);
    const [selectedClubId, setSelectedClubId] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [savingEntry, setSavingEntry] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [viewingClubId, setViewingClubId] = useState('');
    const [clubProjects, setClubProjects] = useState([]);
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
        escola_id: '',
        escola_nome: '',
        matricula: '',
        lattes: ''
    });
    const loadMoreProjectsRef = useRef(null);
    const isRegisteringRef = useRef(false);

    const myClubId = useMemo(() => {
        if (!loggedUser || clubs.length === 0) return '';

        if (loggedUser.clube_id) {
            return String(loggedUser.clube_id);
        }

        if (loggedUser.escola_id) {
            const club = clubs.find((club) => String(club.escola_id || '') === String(loggedUser.escola_id));
            return club?.id ? String(club.id) : '';
        }

        return '';
    }, [loggedUser, clubs]);

    const schoolGroups = useMemo(() => buildSchoolGroups(dadosUnidades), []);
    const allSchoolUnits = useMemo(() => flattenSchoolGroups(schoolGroups), [schoolGroups]);
    const filteredSchoolGroups = useMemo(() => {
        const term = schoolSearchTerm.trim().toLowerCase();
        if (!term) {
            return schoolGroups;
        }
        return schoolGroups
            .map((group) => ({
                ...group,
                units: (group.units || []).filter((unit) => unit.nome.toLowerCase().includes(term))
            }))
            .filter((group) => (group.units || []).length > 0);
    }, [schoolGroups, schoolSearchTerm]);

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

    const fetchProjectsPage = useCallback(async (reset = false) => {
        if (isFetchingProjects) {
            return;
        }

        if (!reset && !hasMoreProjects) {
            return;
        }

        try {
            setIsFetchingProjects(true);

            const baseConstraints = [
                orderBy('titulo'),
                limit(PROJECTS_PAGE_SIZE)
            ];

            const constraints = (!reset && projectsCursor)
                ? [orderBy('titulo'), startAfter(projectsCursor), limit(PROJECTS_PAGE_SIZE)]
                : baseConstraints;

            const projectsQuery = query(collection(db, 'projetos'), ...constraints);
            const snapshot = await getDocs(projectsQuery);

            const loadedProjects = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

            setProjects((previousProjects) => {
                if (reset) {
                    return loadedProjects;
                }

                const merged = [...previousProjects, ...loadedProjects];
                return merged.filter((project, index, arr) => arr.findIndex((item) => item.id === project.id) === index);
            });

            if (snapshot.docs.length > 0) {
                setProjectsCursor(snapshot.docs[snapshot.docs.length - 1]);
            }

            setHasMoreProjects(snapshot.docs.length === PROJECTS_PAGE_SIZE);
        } catch (error) {
            console.error('Erro ao carregar projetos paginados:', error);
            setErrorMessage('Nao foi possivel carregar os projetos paginados do Banco de Dados. Verifique conexão.');
        } finally {
            setIsFetchingProjects(false);
        }
    }, [hasMoreProjects, isFetchingProjects, projectsCursor]);

    useEffect(() => {
        let loadedCollections = 0;
        const totalCollections = 4;

        const finishLoading = () => {
            loadedCollections += 1;
            if (loadedCollections >= totalCollections) {
                setLoading(false);
            }
        };

        const subscribeToCollection = (collectionName, setter, options = {}) => {
            const collectionRef = options.queryBuilder
                ? options.queryBuilder(collection(db, collectionName))
                : collection(db, collectionName);

            return onSnapshot(
                collectionRef,
                (snapshot) => {
                    setter(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
                    finishLoading();
                },
                (error) => {
                    console.error(`Erro ao carregar ${collectionName}:`, error);
                    setErrorMessage('Nao foi possivel carregar todos os dados do Banco de Dados. Verifique conexão.');
                    finishLoading();
                }
            );
        };

        const unsubscribers = [
            subscribeToCollection('clubes_ciencia', setClubs),
            subscribeToCollection('usuarios', setUsers),
            subscribeToCollection('unidades_escolares', setSchools),
            subscribeToCollection('diario_bordo', setDiaryEntries, {
                queryBuilder: (collectionRef) => query(collectionRef, orderBy('createdAt', 'desc'))
            })
        ];

        return () => {
            unsubscribers.forEach((unsubscribe) => unsubscribe());
        };
    }, []);

    useEffect(() => {
        void fetchProjectsPage(true);
    }, [fetchProjectsPage]);

    useEffect(() => {
        const fetchProjectsTotalCount = async () => {
            try {
                const projectsCollection = collection(db, 'projetos');
                const totalSnapshot = await getCountFromServer(projectsCollection);
                setProjectsTotalCount(totalSnapshot.data().count || 0);
            } catch (error) {
                console.error('Erro ao carregar quantitativo total de projetos:', error);
            }
        };

        void fetchProjectsTotalCount();
    }, []);

    useEffect(() => {
        if (!loadMoreProjectsRef.current) {
            return undefined;
        }

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
                root: null,
                rootMargin: '300px 0px 300px 0px',
                threshold: 0
            }
        );

        observer.observe(loadMoreProjectsRef.current);

        return () => observer.disconnect();
    }, [currentView, fetchProjectsPage, hasMoreProjects, isFetchingProjects]);

    // Para o Feed Global, não filtramos mais pelo clube selecionado, 
    // apenas pelo termo de busca (searchTerm).
    const feedProjects = projects.filter((project) => {
        const club = clubs.find(c => c.id === project.clube_id);
        const school = schools.find(item => item.id === project.escola_id || item.id === club?.escola_id);
        const haystack = [
            project.titulo,
            project.tipo,
            project.status,
            project.area_tematica,
            project.descricao,
            club?.nome,
            school?.nome
        ].filter(Boolean).join(' ').toLowerCase();

        return haystack.includes(searchTerm.toLowerCase());
    });

    // Mantemos a lógica do clube/projeto selecionado apenas para o Diário de Bordo
    const selectedClub = clubs.find((club) => String(club.id) === String(selectedClubId)) ?? null;
    const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
    const selectedSchool = schools.find((school) => school.id === selectedClub?.escola_id) ?? null;
    const selectedTeam = selectedProject
        ? getProjectTeam(selectedProject, users, selectedClubId)
        : { orientadores: [], coorientadores: [], investigadores: [] };
    const leadUser = selectedTeam.orientadores[0]
        ?? selectedTeam.coorientadores[0]
        ?? selectedTeam.investigadores[0]
        ?? null;

    const derivedDiaryEntries = selectedProject ? buildProjectEntries(selectedProject, diaryEntries, selectedTeam) : [];

    const currentClubId = selectedClub?.id || viewingClubId || '';
    const isViewingMyClub = Boolean(myClubId && viewingClubId && String(myClubId) === String(viewingClubId));
    const isUserMentor = loggedUser && ['orientador', 'coorientador'].includes(normalizePerfil(loggedUser.perfil));
    const isUserClubMember = loggedUser && String(loggedUser.clube_id || '') === String(currentClubId);
    const canEditDiary = Boolean(selectedProject && (isUserMentor || isUserClubMember));

    // Dados derivados para a View do Clube de Ciências
    const viewingClub = clubs.find((c) => c.id === viewingClubId) ?? null;
    const viewingClubSchool = schools.find((s) => s.id === viewingClub?.escola_id) ?? null;
    const viewingClubProjects = viewingClubId ? clubProjects : [];
    const viewingClubUsers = users.filter((u) => String(u.clube_id) === String(viewingClubId));
    const viewingClubOrientadores = viewingClubUsers.filter((u) => normalizePerfil(u.perfil) === 'orientador');
    const viewingClubCoorientadores = viewingClubUsers.filter((u) => normalizePerfil(u.perfil) === 'coorientador');
    const viewingClubInvestigadores = viewingClubUsers.filter((u) =>
        ['estudante', 'investigador', 'aluno'].includes(normalizePerfil(u.perfil))
    );
    const viewingClubDiaryCount = diaryEntries.filter((e) => e.clube_id === viewingClubId).length;

    const handleAddEntry = (e) => {
        void submitDiaryEntry(e);
    };

    const submitDiaryEntry = async (e) => {
        e.preventDefault();

        if (!selectedProject || !selectedClub || !newEntry.title || !newEntry.whatWasDone) {
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
                        setLoggedUser({ id: snap.id, ...snap.data() });
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

            // Se o perfil ainda não tiver clube_id, atualiza para evitar confusão entre clubes
            if (!loggedUser.clube_id) {
                const userRef = doc(db, 'usuarios', loggedUser.id);
                updateDoc(userRef, { clube_id: clubToUse.id }).catch((err) => {
                    console.error('Falha ao atualizar clube_id do usuário:', err);
                });
            }
        }
    }, [clubs, authUser, loggedUser]);

    useEffect(() => {
        if (!viewingClubId) {
            setClubProjects([]);
            return;
        }

        const q = query(
            collection(db, 'projetos'),
            where('clube_id', '==', viewingClubId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setClubProjects(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        });

        return () => unsubscribe();
    }, [viewingClubId]);

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

        const escolaUnit = allSchoolUnits.find((u) => u.escola_id === registerForm.escola_id);
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
        if (isMentoriaPerfil(registerForm.perfil) && !isValidHttpUrl(registerForm.lattes)) {
            setAuthError('Informe um link Lattes válido (https://lattes.cnpq.br/...).');
            return;
        }

        setIsSubmitting(true);
        isRegisteringRef.current = true;
        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                registerForm.email.trim(),
                registerForm.senha
            );

            const matchingClub = clubs.find((club) => String(club.escola_id) === String(escolaUnit.escola_id));
            const profileData = {
                uid: userCredential.user.uid,
                nome: registerForm.nome.trim(),
                email: registerForm.email.trim(),
                perfil: registerForm.perfil,
                escola_id: escolaUnit.escola_id,
                escola_nome: escolaUnit.nome,
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
                // Se o registro no Firestore falhar, removemos o usuário criado no Auth para evitar conta órfã.
                try {
                    await deleteUser(userCredential.user);
                } catch (deleteError) {
                    console.error('Falha ao deletar usuário após erro no Firestore:', deleteError);
                }
                throw firestoreError;
            }

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
        setCurrentView('Projetos');
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                    <LoaderCircle className="w-8 h-8 animate-spin text-[#00B5B5]" />
                    <p className="text-sm">Verificando autenticação...</p>
                </div>
            </div>
        );
    }

    if (!authUser || !loggedUser) {
        return (
            <div className="min-h-screen bg-[#F4F6F8] px-4 py-10 text-[#4A4A4A]">
                <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="bg-gradient-to-r from-[#00B5B5] to-[#004B8D] px-8 py-7 text-white">
                        <h1 className="text-2xl font-black tracking-tight">Plataforma de Clubes de Ciência</h1>
                        <p className="mt-1 text-sm text-white/80">Rede Baiana de Ciência — SECTI</p>
                    </div>

                    <div className="flex border-b border-gray-200">
                        <button
                            type="button"
                            onClick={() => { setAuthMode('login'); setAuthError(''); }}
                            className={`flex-1 py-3 text-sm font-bold transition-colors ${authMode === 'login' ? 'border-b-2 border-[#00B5B5] text-[#00B5B5]' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Entrar
                        </button>
                        <button
                            type="button"
                            onClick={() => { setAuthMode('register'); setAuthError(''); }}
                            className={`flex-1 py-3 text-sm font-bold transition-colors ${authMode === 'register' ? 'border-b-2 border-[#00B5B5] text-[#00B5B5]' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Cadastrar
                        </button>
                    </div>

                    <div className="px-8 py-7">
                        {authError && (
                            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {authError}
                            </div>
                        )}

                        {/* FORM: ENTRAR */}
                        {authMode === 'login' && (
                            <form onSubmit={handleLogin} className="space-y-5">
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase text-gray-500">E-mail</label>
                                    <input
                                        type="email"
                                        value={loginForm.email}
                                        onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                                        className="w-full rounded border border-gray-300 p-2.5 text-sm outline-none focus:border-[#00B5B5] focus:ring-1 focus:ring-[#00B5B5]"
                                        placeholder="seu@email.com"
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Senha</label>
                                    <input
                                        type="password"
                                        value={loginForm.senha}
                                        onChange={(e) => setLoginForm((prev) => ({ ...prev, senha: e.target.value }))}
                                        className="w-full rounded border border-gray-300 p-2.5 text-sm outline-none focus:border-[#00B5B5] focus:ring-1 focus:ring-[#00B5B5]"
                                        placeholder="••••••••"
                                        required
                                        autoComplete="current-password"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#00B5B5] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#009E9E] disabled:opacity-60"
                                >
                                    {isSubmitting && <LoaderCircle className="w-4 h-4 animate-spin" />}
                                    Entrar
                                </button>
                                <p className="text-center text-xs text-gray-500">
                                    Não tem conta?{' '}
                                    <button type="button" onClick={() => { setAuthMode('register'); setAuthError(''); }} className="font-bold text-[#00B5B5] hover:underline">
                                        Cadastre-se
                                    </button>
                                </p>
                            </form>
                        )}

                        {/* FORM: CADASTRAR */}
                        {authMode === 'register' && (
                            <form onSubmit={handleRegister} className="space-y-5">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="md:col-span-2">
                                        <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Nome completo *</label>
                                        <input
                                            type="text"
                                            value={registerForm.nome}
                                            onChange={(e) => setRegisterForm((prev) => ({ ...prev, nome: e.target.value }))}
                                            className="w-full rounded border border-gray-300 p-2.5 text-sm outline-none focus:border-[#00B5B5] focus:ring-1 focus:ring-[#00B5B5]"
                                            placeholder="Nome completo"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-bold uppercase text-gray-500">E-mail *</label>
                                        <input
                                            type="email"
                                            value={registerForm.email}
                                            onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                                            className="w-full rounded border border-gray-300 p-2.5 text-sm outline-none focus:border-[#00B5B5] focus:ring-1 focus:ring-[#00B5B5]"
                                            placeholder="seu@email.com"
                                            required
                                            autoComplete="email"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Perfil *</label>
                                        <select
                                            value={registerForm.perfil}
                                            onChange={(e) => {
                                                const novoPerfil = e.target.value;
                                                setRegisterForm((prev) => ({
                                                    ...prev,
                                                    perfil: novoPerfil,
                                                    matricula: isMentoriaPerfil(novoPerfil) ? prev.matricula : '',
                                                    lattes: isMentoriaPerfil(novoPerfil) ? prev.lattes : ''
                                                }));
                                            }}
                                            className="w-full rounded border border-gray-300 bg-white p-2.5 text-sm outline-none focus:border-[#00B5B5] focus:ring-1 focus:ring-[#00B5B5]"
                                        >
                                            {PERFIS_LOGIN.map((p) => (
                                                <option key={p.value} value={p.value}>{p.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Senha *</label>
                                        <input
                                            type="password"
                                            value={registerForm.senha}
                                            onChange={(e) => setRegisterForm((prev) => ({ ...prev, senha: e.target.value }))}
                                            className="w-full rounded border border-gray-300 p-2.5 text-sm outline-none focus:border-[#00B5B5] focus:ring-1 focus:ring-[#00B5B5]"
                                            placeholder="Min. 6 caracteres"
                                            required
                                            minLength={6}
                                            autoComplete="new-password"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Confirmar senha *</label>
                                        <input
                                            type="password"
                                            value={registerForm.confirmarSenha}
                                            onChange={(e) => setRegisterForm((prev) => ({ ...prev, confirmarSenha: e.target.value }))}
                                            className="w-full rounded border border-gray-300 p-2.5 text-sm outline-none focus:border-[#00B5B5] focus:ring-1 focus:ring-[#00B5B5]"
                                            placeholder="Repita a senha"
                                            required
                                            autoComplete="new-password"
                                        />
                                    </div>

                                    {isMentoriaPerfil(registerForm.perfil) && (
                                        <div>
                                            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Matrícula *</label>
                                            <input
                                                type="text"
                                                value={registerForm.matricula}
                                                onChange={(e) => setRegisterForm((prev) => ({ ...prev, matricula: e.target.value }))}
                                                className="w-full rounded border border-gray-300 p-2.5 text-sm outline-none focus:border-[#00B5B5] focus:ring-1 focus:ring-[#00B5B5]"
                                                placeholder="Ex: 202600123"
                                                required
                                            />
                                        </div>
                                    )}

                                    <div className="md:col-span-2">
                                        <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Buscar unidade escolar</label>
                                        <input
                                            type="text"
                                            value={schoolSearchTerm}
                                            onChange={(e) => setSchoolSearchTerm(e.target.value)}
                                            className="w-full rounded border border-gray-300 p-2.5 text-sm outline-none focus:border-[#00B5B5] focus:ring-1 focus:ring-[#00B5B5]"
                                            placeholder="Digite parte do nome da escola"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Unidade escolar *</label>
                                        <select
                                            value={registerForm.escola_id}
                                            onChange={(e) => {
                                                const selected = allSchoolUnits.find((u) => u.escola_id === e.target.value);
                                                setRegisterForm((prev) => ({
                                                    ...prev,
                                                    escola_id: e.target.value,
                                                    escola_nome: selected?.nome || ''
                                                }));
                                            }}
                                            className="w-full rounded border border-gray-300 bg-white p-2.5 text-sm outline-none focus:border-[#00B5B5] focus:ring-1 focus:ring-[#00B5B5]"
                                            required
                                        >
                                            <option value="">Selecione a unidade escolar</option>
                                            {filteredSchoolGroups.length === 0 ? (
                                                <option value="" disabled>Não há unidades correspondentes</option>
                                            ) : (
                                                filteredSchoolGroups.map((group) => (
                                                    <optgroup key={group.key} label={group.label}>
                                                        {group.units.map((unit) => (
                                                            <option key={`${group.key}-${unit.escola_id}`} value={unit.escola_id}>
                                                                {unit.nome} (SEC: {unit.escola_id})
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                ))
                                            )}
                                        </select>
                                        <p className="mt-1 text-xs text-gray-400">
                                            O código SEC vira <span className="font-semibold">escola_id</span> para ligar as tabelas.
                                        </p>
                                    </div>

                                    {isMentoriaPerfil(registerForm.perfil) && (
                                        <div className="md:col-span-2">
                                            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Link do Currículo Lattes *</label>
                                            <input
                                                type="url"
                                                value={registerForm.lattes}
                                                onChange={(e) => setRegisterForm((prev) => ({ ...prev, lattes: e.target.value }))}
                                                className="w-full rounded border border-gray-300 p-2.5 text-sm outline-none focus:border-[#00B5B5] focus:ring-1 focus:ring-[#00B5B5]"
                                                placeholder="https://lattes.cnpq.br/..."
                                                required
                                            />
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#00B5B5] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#009E9E] disabled:opacity-60"
                                >
                                    {isSubmitting && <LoaderCircle className="w-4 h-4 animate-spin" />}
                                    Criar conta
                                </button>
                                <p className="text-center text-xs text-gray-500">
                                    Já tem conta?{' '}
                                    <button type="button" onClick={() => { setAuthMode('login'); setAuthError(''); }} className="font-bold text-[#00B5B5] hover:underline">
                                        Entrar
                                    </button>
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F4F6F8] text-[#4A4A4A] font-sans flex flex-col relative">

            {/* Padrão de Fundo */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.83-1.66 1.66-.83-.83.83-.83zM27.83 54.627l.83.83-1.66 1.66-.83-.83.83-.83zM0 27.83l.83.83-1.66 1.66-.83-.83.83-.83zM58.33 27.83l.83.83-1.66 1.66-.83-.83.83-.83zM27.83 0l.83.83-1.66 1.66-.83-.83.83-.83zM0 58.33l.83.83-1.66 1.66-.83-.83.83-.83z' fill='%23000000' fill-rule='evenodd'/%3E%3C/svg%3E")`, backgroundSize: '120px' }}>
            </div>

            {/* Barra de Acessibilidade */}
            <div className="bg-white border-b border-gray-200 text-[11px] text-gray-500 py-1.5 px-4 flex justify-between items-center z-20 relative shadow-sm">
                <div className="flex space-x-6">
                    <span className="hidden md:inline font-semibold">Rede Baiana de Clubes de Ciência - SECTI</span>
                    <a href="#" className="hover:underline">1- Ir para o conteúdo.</a>
                    <a href="#" className="hover:underline">2- Ir para o menu.</a>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex space-x-2 items-center">
                        <span>Tamanho do texto:</span>
                        <button className="hover:text-gray-800 font-medium">A-</button>
                        <button className="hover:text-gray-800 font-medium">A</button>
                        <button className="hover:text-gray-800 font-medium">A+</button>
                    </div>
                    <button className="flex items-center space-x-1 hover:text-gray-800">
                        <span>Alto Contraste</span>
                        <div className="w-3 h-3 bg-gray-800 rounded-full flex overflow-hidden"><div className="w-1/2 bg-white"></div></div>
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden z-10">

                {/* Menu Lateral */}
                <aside className="w-[88px] bg-white border-r border-gray-200 flex flex-col items-center py-6 overflow-y-auto shrink-0 z-20 shadow-[2px_0_8px_rgba(0,0,0,0.02)]">
                    <div className="mb-8 flex flex-col items-center text-center">
                        <span className="text-[#00B5B5] font-black text-xl leading-none tracking-tighter">SECTI</span>
                        <span className="text-[#FF5722] font-black text-xl leading-none tracking-tighter">INOVA</span>
                    </div>

                    <nav className="flex flex-col w-full space-y-2">
                        <button onClick={() => setCurrentView('Projetos')} className={`flex flex-col items-center py-3 w-full transition-colors relative ${currentView === 'Projetos' ? 'bg-[#F0F9F9] text-[#00B5B5]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}>
                            {currentView === 'Projetos' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00B5B5]"></div>}
                            <Map className="w-6 h-6 mb-1" strokeWidth={1.5} />
                            <span className="text-[10px] font-medium text-center">Feed de<br />Projetos</span>
                        </button>

                        <button onClick={() => setCurrentView('diario')} className={`flex flex-col items-center py-3 w-full transition-colors relative ${currentView === 'diario' ? 'bg-[#F0F9F9] text-[#00B5B5]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}>
                            {currentView === 'diario' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00B5B5]"></div>}
                            <BookOpen className="w-6 h-6 mb-1" strokeWidth={1.5} />
                            <span className="text-[10px] font-medium text-center">Diário de<br />Bordo</span>
                        </button>

                        <button
                            onClick={() => {
                                setCurrentView('clube');
                                const targetClubId = String(loggedUser?.clube_id || myClubId || '').trim();
                                if (targetClubId) {
                                    setViewingClubId(targetClubId);
                                }
                            }}
                            className={`flex flex-col items-center py-3 w-full transition-colors relative ${(currentView === 'clube' && isViewingMyClub) ? 'bg-[#F0F9F9] text-[#00B5B5]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}
                        >
                            {currentView === 'clube' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00B5B5]"></div>}
                            <School className="w-6 h-6 mb-1" strokeWidth={1.5} />
                            <span className="text-[10px] font-medium text-center">Meu<br />Clube</span>
                        </button>

                        <div className="my-2 border-t border-gray-100 w-12 mx-auto"></div>

                        <button onClick={() => setIsModalOpen(true)} className="flex flex-col items-center py-3 w-full text-gray-400 hover:text-[#00B5B5] hover:bg-[#F0F9F9] transition-colors">
                            <Upload className="w-6 h-6 mb-1" strokeWidth={1.5} />
                            <span className="text-[10px] font-medium text-center">Novo<br />Registro</span>
                        </button>
                    </nav>
                </aside>

                {/* Área Principal */}
                <div className="flex-1 flex flex-col h-full overflow-hidden">

                    {/* Barra de Busca e Utilizador */}
                    <header className="bg-white h-[88px] border-b border-gray-200 flex items-center justify-between px-8 z-10 shrink-0">
                        <div className="flex-1 max-w-3xl flex items-center">
                            <div className="flex w-full shadow-sm rounded-md border border-gray-200 focus-within:ring-1 focus-within:ring-[#00B5B5] overflow-hidden">
                                <input
                                    type="text"
                                    placeholder="Pesquisar projetos, postagens ou clubes..."
                                    className="w-full py-3 px-4 outline-none text-sm text-gray-700 placeholder-gray-400"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <button className="bg-[#00B5B5] hover:bg-[#009E9E] transition-colors px-6 flex items-center justify-center" type="button">
                                    <Search className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center space-x-6 ml-4">
                            <button className="relative text-gray-400 hover:text-[#00B5B5] transition-colors">
                                <Bell className="w-6 h-6" />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="text-right hidden md:block">
                                    <p className="text-sm font-bold text-gray-700">{loggedUser?.nome || leadUser?.nome || 'Usuário Logado'}</p>
                                    <p className="text-[11px] text-gray-500">
                                        {loggedUser
                                            ? `${loggedUser.perfil} · ${loggedUser.escola_nome}`
                                            : (selectedClub?.nome || 'Nenhum clube selecionado')}
                                    </p>
                                </div>
                                <button className="w-10 h-10 rounded-full bg-[#FF5722] text-white flex items-center justify-center font-bold text-lg border-2 border-transparent hover:border-gray-200 transition-all">
                                    {getInitials(loggedUser?.nome || leadUser?.nome || 'Usuário')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="hidden rounded border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 md:inline-flex"
                                >
                                    Sair
                                </button>
                            </div>
                        </div>
                    </header>

                    {/* Conteúdo da Página */}
                    <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
                        <div className="max-w-[1200px] mx-auto">
                            {errorMessage && (
                                <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm text-orange-900 shadow-sm">
                                    {errorMessage}
                                </div>
                            )}

                            {loading && (
                                <div className="mb-6 bg-white rounded-xl shadow-sm p-8 flex items-center justify-center gap-3 text-gray-600">
                                    <LoaderCircle className="w-5 h-5 animate-spin text-[#00B5B5]" />
                                    Carregando feed de inovação...
                                </div>
                            )}

                            {/* ==================== VIEW: FEED DE PROJETOS ==================== */}
                            {/* ==================== VIEW: FEED DE PROJETOS (CLEAN UI) ==================== */}
                            {currentView === 'Projetos' && (
                                <div className="max-w-4xl mx-auto space-y-8 pb-12">

                                    {/* Cabeçalho do Feed Minimalista */}
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-gray-200">
                                        <div>
                                            <h2 className="text-2xl font-black text-gray-800 tracking-tight">
                                                Inovação em <span className="text-[#00B5B5]">Foco</span>
                                            </h2>
                                            <p className="text-gray-500 text-sm mt-1">
                                                Pesquisas e descobertas da rede baiana de ciência.
                                            </p>
                                        </div>
                                        <div className="flex gap-4 text-sm bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <School className="w-4 h-4 text-gray-400" />
                                                <span className="font-medium">{schools.length} Escolas</span>
                                            </div>
                                            <div className="w-px bg-gray-200"></div>
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <FolderKanban className="w-4 h-4 text-gray-400" />
                                                <span className="font-medium">{projectsTotalCount} Projetos</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Renderização das Postagens (Projetos) */}
                                    {feedProjects.length === 0 && !loading ? (
                                        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
                                            <EmptyState
                                                icon={FolderKanban}
                                                title="Nenhum projeto encontrado"
                                                description="A busca não retornou resultados ou ainda não há projetos publicados na rede."
                                            />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-6">
                                            {feedProjects.map((project) => {
                                                const club = clubs.find(c => c.id === project.clube_id);
                                                const school = schools.find(s => s.id === project.escola_id || s.id === club?.escola_id);
                                                const isCompleted = project.status?.toLowerCase().includes('conclu');
                                                const team = getProjectTeam(project, users, project.clube_id);
                                                const projectDiaryEntries = diaryEntries.filter((entry) => entry.projeto_id === project.id);
                                                const investigatorNames = getInvestigatorDisplayNames(project, team, projectDiaryEntries);

                                                return (
                                                    <article
                                                        key={project.id}
                                                        className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 overflow-hidden group"
                                                    >
                                                        {/* Accent Line Top */}
                                                        <div className="h-1 w-full bg-gradient-to-r from-[#00B5B5] to-[#004B8D] opacity-75 group-hover:opacity-100 transition-opacity"></div>

                                                        <div className="p-6 sm:p-8">
                                                            {/* Header do Card */}
                                                            <div className="flex justify-between items-start mb-5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded bg-gray-50 border border-gray-200 flex items-center justify-center text-[#00B5B5] font-bold text-sm">
                                                                        {getInitials(club?.nome)}
                                                                    </div>
                                                                    <div>
                                                                        <h3 className="font-semibold text-gray-900 text-sm leading-none mb-1">
                                                                            {club?.nome || 'Clube de Ciência'}
                                                                        </h3>
                                                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                                                            <Map className="w-3 h-3 opacity-70" />
                                                                            {school?.nome || 'Escola não vinculada'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border ${isCompleted ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-blue-100 text-blue-700 bg-blue-50'}`}>
                                                                    {project.status || 'Em Desenvolvimento'}
                                                                </span>
                                                            </div>

                                                            {/* Conteúdo */}
                                                            <div className="mb-6">
                                                                <h4 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 leading-tight group-hover:text-[#00B5B5] transition-colors">
                                                                    {project.titulo || 'Projeto sem título cadastrado'}
                                                                </h4>
                                                                <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                                                                    {project.descricao || project.introducao || 'Nenhuma descrição detalhada foi fornecida para este projeto no momento. Acesse o diário de bordo para acompanhar a evolução da pesquisa.'}
                                                                </p>
                                                            </div>

                                                            {/* Metadados & Tags */}
                                                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                                                <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 border border-gray-200 text-xs font-medium px-2.5 py-1 rounded-md">
                                                                    <Target className="w-3 h-3" />
                                                                    {project.area_tematica || project.tipo || 'Área Livre'}
                                                                </span>
                                                                {team.investigadores.length > 0 && (
                                                                    <span className="inline-flex items-center gap-1 text-gray-500 text-xs font-medium px-2">
                                                                        <Users className="w-3 h-3" />
                                                                        {team.investigadores.length} investigadores
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="mb-6 space-y-2 text-xs text-gray-600">
                                                                <p><span className="font-semibold text-gray-700">Orientador:</span> {team.orientadores.map((person) => person.nome).join(', ') || 'Não informado'}</p>
                                                                <p><span className="font-semibold text-gray-700">Coorientador:</span> {team.coorientadores.map((person) => person.nome).join(', ') || 'Não informado'}</p>
                                                                <p><span className="font-semibold text-gray-700">Investigadores:</span> {investigatorNames.join(', ') || 'Não informado'}</p>
                                                            </div>

                                                            {/* Footer de Ações */}
                                                            <div className="flex items-center justify-between pt-5 border-t border-gray-100">
                                                                <div className="flex gap-2">
                                                                    <button className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all" title="Apoiar projeto">
                                                                        <Heart className="w-4 h-4" />
                                                                    </button>
                                                                    <button className="text-gray-400 hover:text-[#00B5B5] hover:bg-[#F0F9F9] p-2 rounded-full transition-all" title="Deixar comentário">
                                                                        <MessageCircle className="w-4 h-4" />
                                                                    </button>
                                                                    {club && (
                                                                        <button
                                                                            onClick={() => {
                                                                                setViewingClubId(club.id);
                                                                                setCurrentView('clube');
                                                                            }}
                                                                            className="text-gray-400 hover:text-[#FF5722] hover:bg-orange-50 p-2 rounded-full transition-all"
                                                                            title={`Ver clube: ${club.nome}`}
                                                                        >
                                                                            <School className="w-4 h-4" />
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedClubId(club?.id || '');
                                                                        setSelectedProjectId(project.id);
                                                                        setCurrentView('diario');
                                                                    }}
                                                                    className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#00B5B5] hover:text-[#008A8A] transition-colors group/btn"
                                                                >
                                                                    Acessar Diário de Bordo
                                                                    <ArrowRight className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </article>
                                                );
                                            })}

                                            <div className="pt-2 pb-6">
                                                {isFetchingProjects && (
                                                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                                                        <LoaderCircle className="w-4 h-4 animate-spin text-[#00B5B5]" />
                                                        Carregando mais projetos...
                                                    </div>
                                                )}

                                                {!isFetchingProjects && hasMoreProjects && (
                                                    <div ref={loadMoreProjectsRef} className="h-8 w-full" aria-hidden="true" />
                                                )}

                                                {!isFetchingProjects && !hasMoreProjects && projects.length > 0 && (
                                                    <p className="text-center text-xs text-gray-400">Você chegou ao fim da lista de projetos.</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ==================== VIEW: DIÁRIO DE BORDO ==================== */}
                            {currentView === 'diario' && (
                                <div className="space-y-6">

                                    {!selectedProject && (
                                        <div className="bg-white rounded-xl shadow-sm p-10">
                                            <EmptyState
                                                icon={BookOpen}
                                                title="Nenhum projeto selecionado"
                                                description="Acesse o Feed de Inovação e escolha um projeto para ler o seu diário de bordo."
                                            />
                                        </div>
                                    )}

                                    {/* Cabeçalho do Projeto */}
                                    {selectedProject && (
                                        <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] p-6 md:p-8 flex flex-col md:flex-row gap-8 border-l-4 border-[#00B5B5]">
                                            <div className="flex-1 flex flex-col justify-center">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center text-[#FF5722] text-sm font-bold uppercase tracking-wide">
                                                        <Target className="w-4 h-4 mr-2" />
                                                        Projeto Atual ({selectedClub?.nome || 'Clube nao identificado'})
                                                    </div>
                                                    <span className="bg-[#E0F2F2] text-[#00B5B5] px-3 py-1 rounded-full text-xs font-bold">{selectedProject.area_tematica || selectedProject.tipo || 'Area nao informada'}</span>
                                                </div>

                                                <h2 className="text-3xl font-bold text-gray-800 mb-4">{selectedProject.titulo || 'Projeto sem titulo'}</h2>

                                                <p className="text-gray-600 mb-6 max-w-3xl leading-relaxed">
                                                    {selectedProject.descricao || selectedProject.introducao || 'Sem descricao detalhada cadastrada para este projeto.'}
                                                </p>

                                                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6">
                                                    <div className="flex items-center bg-gray-50 px-3 py-2 rounded border border-gray-100"><User className="w-4 h-4 mr-2" /> Orientador: {selectedTeam.orientadores.map((person) => person.nome).join(', ') || 'Nao informado'}</div>
                                                    <div className="flex items-center bg-gray-50 px-3 py-2 rounded border border-gray-100"><User className="w-4 h-4 mr-2" /> Coorientador: {selectedTeam.coorientadores.map((person) => person.nome).join(', ') || 'Nao informado'}</div>
                                                    <div className="flex items-center bg-gray-50 px-3 py-2 rounded border border-gray-100"><Users className="w-4 h-4 mr-2" /> {selectedTeam.investigadores.length || selectedProject.membros?.length || 0} investigadores</div>
                                                    <div className="flex items-center bg-gray-50 px-3 py-2 rounded border border-gray-100"><Map className="w-4 h-4 mr-2" /> {selectedSchool?.nome || 'Escola nao informada'}</div>
                                                    <div className="flex items-center bg-gray-50 px-3 py-2 rounded border border-gray-100"><Database className="w-4 h-4 mr-2" /> {selectedProject.status || 'Status nao informado'}</div>
                                                </div>

                                                <div className="mb-6 rounded-md border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                                    <span className="font-semibold">Investigadores:</span> {getInvestigatorDisplayNames(selectedProject, selectedTeam, derivedDiaryEntries).join(', ') || 'Nao informado'}
                                                </div>

                                                {(selectedTeam.orientadores.length > 0 || selectedTeam.coorientadores.length > 0) && (
                                                    <div className="space-y-3">
                                                        <h4 className="text-sm font-bold text-gray-700 uppercase">Currículo Lattes da Mentoria</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {[...selectedTeam.orientadores, ...selectedTeam.coorientadores]
                                                                .filter((person, index, arr) => arr.findIndex((item) => item.id === person.id) === index)
                                                                .map((person) => {
                                                                    const lattesLink = getLattesLink(person);

                                                                    if (!lattesLink) {
                                                                        return (
                                                                            <span key={person.id} className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600">
                                                                                {person.nome} · Lattes não informado
                                                                            </span>
                                                                        );
                                                                    }

                                                                    return (
                                                                        <a
                                                                            key={person.id}
                                                                            href={lattesLink}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="inline-flex items-center gap-2 rounded-md border border-[#00B5B5]/30 bg-[#F0F9F9] px-3 py-1.5 text-xs font-semibold text-[#0F5257] hover:bg-[#E5F6F6]"
                                                                        >
                                                                            {person.nome}
                                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                                        </a>
                                                                    );
                                                                })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Feed de Registros */}
                                    <div className="pt-4 pb-2 border-b border-gray-200 flex justify-between items-center">
                                        <h3 className="text-xl font-bold text-gray-800">Registros do Diário</h3>
                                        <button
                                            onClick={() => setIsModalOpen(true)}
                                            className="bg-[#00B5B5] text-white px-4 py-2 rounded font-semibold text-sm hover:bg-[#009E9E] flex items-center shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                            disabled={!canEditDiary}
                                        >
                                            <Plus className="w-4 h-4 mr-2" /> Novo Registro
                                        </button>
                                        {!canEditDiary && selectedProject && (
                                            <p className="text-xs text-gray-500 mt-2">Somente membros do clube ou orientadores/coorientadores podem adicionar registros.</p>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        {derivedDiaryEntries.length === 0 && selectedProject && (
                                            <div className="bg-white rounded-xl shadow-sm p-10">
                                                <EmptyState
                                                    icon={BookOpen}
                                                    title="Sem registros adicionais"
                                                    description="O sistema montou um resumo a partir do projeto. Para registrar encontros, grave documentos em diario_bordo."
                                                />
                                            </div>
                                        )}

                                        {derivedDiaryEntries.map((entry) => (
                                            <div key={entry.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                                {/* Header do Card */}
                                                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    <div>
                                                        <h4 className="text-lg font-bold text-[#00B5B5] mb-1">{entry.title}</h4>
                                                        <div className="flex items-center text-xs text-gray-500 gap-4">
                                                            <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {entry.date}</span>
                                                            <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {entry.duration}</span>
                                                            <span className="flex items-center"><User className="w-3 h-3 mr-1" /> Por {entry.author}</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white border border-[#00B5B5] text-[#00B5B5] px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap text-center">
                                                        {entry.stage}
                                                    </div>
                                                </div>

                                                {/* Corpo do Registro Oficial */}
                                                <div className="p-6 space-y-5">

                                                    {/* O que foi feito */}
                                                    <div>
                                                        <h5 className="flex items-center text-sm font-bold text-gray-700 uppercase mb-2">
                                                            <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> O que foi feito hoje?
                                                        </h5>
                                                        <p className="text-gray-600 text-sm leading-relaxed pl-6">{entry.whatWasDone}</p>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                                                        {/* Descobertas */}
                                                        <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                                                            <h5 className="flex items-center text-sm font-bold text-blue-800 mb-2">
                                                                <Lightbulb className="w-4 h-4 mr-2 text-blue-600" /> Principais Descobertas
                                                            </h5>
                                                            <p className="text-blue-900/80 text-sm">{entry.discoveries}</p>
                                                        </div>

                                                        {/* Obstáculos */}
                                                        <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100">
                                                            <h5 className="flex items-center text-sm font-bold text-orange-800 mb-2">
                                                                <AlertCircle className="w-4 h-4 mr-2 text-orange-600" /> Gestão de Obstáculos
                                                            </h5>
                                                            <p className="text-orange-900/80 text-sm">{entry.obstacles}</p>
                                                        </div>
                                                    </div>

                                                    {/* Próximos Passos & Tags */}
                                                    <div className="pt-4 border-t border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                        <div>
                                                            <h5 className="flex items-center text-sm font-bold text-gray-700 mb-1">
                                                                <ArrowRight className="w-4 h-4 mr-2 text-gray-500" /> Próximos Passos
                                                            </h5>
                                                            <p className="text-gray-500 text-sm pl-6">{entry.nextSteps}</p>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {entry.tags.map(tag => (
                                                                <span key={tag} className="bg-gray-100 text-gray-500 text-[10px] font-bold uppercase px-2 py-1 rounded">
                                                                    #{tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                </div>
                            )}

                            {/* ==================== VIEW: CLUBE DE CIÊNCIAS ==================== */}
                            {currentView === 'clube' && (
                                <div className="space-y-6 max-w-4xl mx-auto pb-12">

                                    {!viewingClub && (
                                        <div className="bg-white rounded-xl shadow-sm p-10">
                                            <EmptyState
                                                icon={School}
                                                title="Nenhum clube selecionado"
                                                description="Acesse o Feed de Inovação e clique no ícone de escola em um projeto para visualizar as informações do clube responsável."
                                            />
                                        </div>
                                    )}

                                    {viewingClub && (
                                        <>
                                            {/* Hero do Clube */}
                                            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                                                <div className="h-2 bg-gradient-to-r from-[#00B5B5] via-[#004B8D] to-[#FF5722]"></div>
                                                <div className="p-6 md:p-10 flex flex-col md:flex-row gap-8 items-start">
                                                    <div className="w-20 h-20 rounded-xl bg-[#F0F9F9] border-2 border-[#00B5B5]/30 flex items-center justify-center text-[#00B5B5] font-black text-2xl shrink-0">
                                                        {getInitials(viewingClub.nome)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-start justify-between gap-4 mb-2">
                                                            <div>
                                                                <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">{viewingClub.nome}</h2>
                                                                <p className="text-[#00B5B5] font-semibold text-sm mt-1 flex items-center gap-1.5">
                                                                    <Map className="w-4 h-4" />
                                                                    {viewingClubSchool?.nome || 'Escola não vinculada'}
                                                                </p>
                                                            </div>
                                                            <span className="shrink-0 bg-[#E0F2F2] text-[#00B5B5] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                                                Clube Ativo
                                                            </span>
                                                        </div>
                                                        {viewingClub.descricao && (
                                                            <p className="text-gray-600 text-sm leading-relaxed mt-3 max-w-2xl">{viewingClub.descricao}</p>
                                                        )}
                                                        <div className="flex flex-wrap gap-4 mt-5">
                                                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700">
                                                                <FolderKanban className="w-4 h-4 text-[#00B5B5]" />
                                                                <span className="font-bold text-gray-900">{viewingClubProjects.length}</span>
                                                                <span>Projetos</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700">
                                                                <Users className="w-4 h-4 text-[#00B5B5]" />
                                                                <span className="font-bold text-gray-900">{viewingClubUsers.length}</span>
                                                                <span>Membros</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700">
                                                                <BookOpen className="w-4 h-4 text-[#00B5B5]" />
                                                                <span className="font-bold text-gray-900">{viewingClubDiaryCount}</span>
                                                                <span>Registros no Diário</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Equipe do Clube */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                                {/* Professores Orientadores */}
                                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                                    <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                                                        <div className="w-7 h-7 rounded-lg bg-[#F0F9F9] flex items-center justify-center">
                                                            <User className="w-4 h-4 text-[#00B5B5]" />
                                                        </div>
                                                        Professores Orientadores
                                                    </h3>
                                                    {viewingClubOrientadores.length === 0 ? (
                                                        <p className="text-sm text-gray-400 italic text-center py-4">Nenhum orientador cadastrado.</p>
                                                    ) : (
                                                        <ul className="space-y-3">
                                                            {viewingClubOrientadores.map((person) => {
                                                                const lattesLink = getLattesLink(person);
                                                                return (
                                                                    <li key={person.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-8 h-8 rounded-full bg-[#00B5B5] text-white flex items-center justify-center text-xs font-bold shrink-0">
                                                                                {getInitials(person.nome)}
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-semibold text-sm text-gray-800">{person.nome}</p>
                                                                                {person.email && <p className="text-xs text-gray-500">{person.email}</p>}
                                                                            </div>
                                                                        </div>
                                                                        {lattesLink && (
                                                                            <a
                                                                                href={lattesLink}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="shrink-0 inline-flex items-center gap-1 rounded border border-[#00B5B5]/30 bg-[#F0F9F9] px-2 py-1 text-[10px] font-bold text-[#0F5257] hover:bg-[#E5F6F6]"
                                                                                title="Ver Currículo Lattes"
                                                                            >
                                                                                <ExternalLink className="w-3 h-3" />
                                                                                Lattes
                                                                            </a>
                                                                        )}
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    )}
                                                </div>

                                                {/* Coorientadores */}
                                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                                    <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                                                        <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
                                                            <User className="w-4 h-4 text-[#FF5722]" />
                                                        </div>
                                                        Coorientadores
                                                    </h3>
                                                    {viewingClubCoorientadores.length === 0 ? (
                                                        <p className="text-sm text-gray-400 italic text-center py-4">Nenhum coorientador cadastrado.</p>
                                                    ) : (
                                                        <ul className="space-y-3">
                                                            {viewingClubCoorientadores.map((person) => {
                                                                const lattesLink = getLattesLink(person);
                                                                return (
                                                                    <li key={person.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-8 h-8 rounded-full bg-[#FF5722] text-white flex items-center justify-center text-xs font-bold shrink-0">
                                                                                {getInitials(person.nome)}
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-semibold text-sm text-gray-800">{person.nome}</p>
                                                                                {person.email && <p className="text-xs text-gray-500">{person.email}</p>}
                                                                            </div>
                                                                        </div>
                                                                        {lattesLink && (
                                                                            <a
                                                                                href={lattesLink}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="shrink-0 inline-flex items-center gap-1 rounded border border-orange-200 bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-800 hover:bg-orange-100"
                                                                                title="Ver Currículo Lattes"
                                                                            >
                                                                                <ExternalLink className="w-3 h-3" />
                                                                                Lattes
                                                                            </a>
                                                                        )}
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Investigadores / Estudantes */}
                                            {viewingClubInvestigadores.length > 0 && (
                                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                                    <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                                                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                                                            <Microscope className="w-4 h-4 text-blue-600" />
                                                        </div>
                                                        Investigadores / Estudantes
                                                        <span className="ml-auto text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{viewingClubInvestigadores.length}</span>
                                                    </h3>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                        {viewingClubInvestigadores.map((person) => (
                                                            <div key={person.id} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-100 text-center">
                                                                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                                                                    {getInitials(person.nome)}
                                                                </div>
                                                                <p className="text-xs font-semibold text-gray-700 leading-tight">{person.nome}</p>
                                                                {person.matricula && <p className="text-[10px] text-gray-400">Mat. {person.matricula}</p>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Projetos do Clube */}
                                            <div>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-xl font-bold text-gray-800">Projetos do Clube</h3>
                                                    <span className="text-xs text-gray-500 bg-white border border-gray-200 px-3 py-1 rounded-full">{viewingClubProjects.length} projeto(s)</span>
                                                </div>
                                                {viewingClubProjects.length === 0 ? (
                                                    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
                                                        <EmptyState
                                                            icon={FolderKanban}
                                                            title="Nenhum projeto encontrado"
                                                            description="Este clube ainda não tem projetos publicados ou os projetos não foram vinculados corretamente."
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        {viewingClubProjects.map((project) => {
                                                            const isCompleted = project.status?.toLowerCase().includes('conclu');
                                                            return (
                                                                <div
                                                                    key={project.id}
                                                                    className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#00B5B5]/40 transition-all p-5 flex flex-col gap-3"
                                                                >
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <h4 className="font-bold text-gray-900 text-sm leading-snug">{project.titulo || 'Projeto sem título'}</h4>
                                                                        <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${isCompleted ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-blue-100 text-blue-700 bg-blue-50'}`}>
                                                                            {project.status || 'Em andamento'}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                                                        {project.descricao || project.introducao || 'Sem descrição cadastrada.'}
                                                                    </p>
                                                                    {project.area_tematica && (
                                                                        <span className="self-start inline-flex items-center gap-1 bg-gray-50 text-gray-600 border border-gray-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                                                                            <Target className="w-3 h-3" />
                                                                            {project.area_tematica}
                                                                        </span>
                                                                    )}
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedClubId(viewingClub.id);
                                                                            setSelectedProjectId(project.id);
                                                                            setCurrentView('diario');
                                                                        }}
                                                                        className="mt-auto self-end inline-flex items-center gap-1.5 text-xs font-semibold text-[#00B5B5] hover:text-[#008A8A] transition-colors"
                                                                    >
                                                                        Ver Diário <ArrowRight className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                        </div>
                    </main>
                </div>
            </div>

            {/* ==================== MODAL: NOVO REGISTRO DO DIÁRIO ==================== */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
                    <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl flex flex-col my-8">

                        <div className="px-8 py-5 flex items-center justify-between border-b border-gray-100 bg-gray-50 rounded-t-xl">
                            <div>
                                <h2 className="text-xl font-bold text-[#00B5B5]">Novo Registro no Diário de Bordo</h2>
                                <p className="text-gray-500 text-xs mt-1">Sistematize seus experimentos e garanta a autoria do projeto.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700">✕</button>
                        </div>

                        <form onSubmit={handleAddEntry} className="px-8 py-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">

                            {/* Seção 1: Identificação & Etapa */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center"><Map className="w-5 h-5 mr-2 text-[#FF5722]" /> 1. Contexto da Sessão</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Título Resumido</label>
                                        <input type="text" required className="w-full border border-gray-300 rounded p-2.5 text-sm focus:border-[#00B5B5] focus:ring-1 focus:ring-[#00B5B5] outline-none" value={newEntry.title} onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })} placeholder="Ex: Montagem do Sensor" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Duração da Sessão</label>
                                        <input type="text" className="w-full border border-gray-300 rounded p-2.5 text-sm focus:border-[#00B5B5] focus:ring-1 focus:ring-[#00B5B5] outline-none" value={newEntry.duration} onChange={(e) => setNewEntry({ ...newEntry, duration: e.target.value })} placeholder="Ex: 2 horas" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Etapa da Investigação</label>
                                    <select className="w-full border border-gray-300 rounded p-2.5 text-sm focus:border-[#00B5B5] focus:ring-1 focus:ring-[#00B5B5] outline-none bg-white" value={newEntry.stage} onChange={(e) => setNewEntry({ ...newEntry, stage: e.target.value })}>
                                        {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Seção 2: O Registro (Coração do Diário) */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center"><BookOpen className="w-5 h-5 mr-2 text-[#FF5722]" /> 2. Registro do Dia</h3>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">O que foi feito hoje?</label>
                                    <p className="text-[10px] text-gray-400 mb-2">Descreva procedimentos, discussões ou experimentos realizados.</p>
                                    <textarea required rows="3" className="w-full border border-gray-300 rounded p-2.5 text-sm focus:border-[#00B5B5] focus:ring-1 focus:ring-[#00B5B5] outline-none resize-none" value={newEntry.whatWasDone} onChange={(e) => setNewEntry({ ...newEntry, whatWasDone: e.target.value })}></textarea>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Principais Descobertas ou Insights</label>
                                    <p className="text-[10px] text-gray-400 mb-2">O que aprenderam? Alguma hipótese foi confirmada?</p>
                                    <textarea rows="2" className="w-full border border-gray-300 rounded p-2.5 text-sm focus:border-[#00B5B5] focus:ring-1 focus:ring-[#00B5B5] outline-none resize-none" value={newEntry.discoveries} onChange={(e) => setNewEntry({ ...newEntry, discoveries: e.target.value })}></textarea>
                                </div>
                            </div>

                            {/* Seção 3: Obstáculos & Próximos Passos */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center"><Wrench className="w-5 h-5 mr-2 text-[#FF5722]" /> 3. Gestão e Planejamento</h3>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Gestão de Obstáculos</label>
                                    <p className="text-[10px] text-gray-400 mb-2">Houve algum problema técnico? Como o grupo resolveu?</p>
                                    <textarea rows="2" className="w-full border border-gray-300 rounded p-2.5 text-sm focus:border-[#00B5B5] focus:ring-1 focus:ring-[#00B5B5] outline-none resize-none" value={newEntry.obstacles} onChange={(e) => setNewEntry({ ...newEntry, obstacles: e.target.value })}></textarea>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Próximos Passos</label>
                                    <p className="text-[10px] text-gray-400 mb-2">Tarefa para o próximo encontro e responsável.</p>
                                    <textarea rows="2" className="w-full border border-gray-300 rounded p-2.5 text-sm focus:border-[#00B5B5] focus:ring-1 focus:ring-[#00B5B5] outline-none resize-none" value={newEntry.nextSteps} onChange={(e) => setNewEntry({ ...newEntry, nextSteps: e.target.value })}></textarea>
                                </div>
                            </div>

                            {/* Seção 4: Metadados */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Tags (Separadas por vírgula)</label>
                                <input type="text" className="w-full border border-gray-300 rounded p-2.5 text-sm focus:border-[#00B5B5] focus:ring-1 focus:ring-[#00B5B5] outline-none" value={newEntry.tags} onChange={(e) => setNewEntry({ ...newEntry, tags: e.target.value })} placeholder="Ex: Química, Robótica, MeioAmbiente" />
                            </div>

                            <div className="pt-4 flex gap-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded hover:bg-gray-50 transition-colors text-sm">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 bg-[#00B5B5] text-white font-bold py-3 rounded hover:bg-[#009E9E] transition-colors text-sm shadow-md">
                                    Salvar no Diário
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

function SummaryBadge({ icon: Icon, label, value }) {
    return (
        <div className="inline-flex items-center gap-2 rounded-full bg-[#F0F9F9] px-4 py-2 text-[#0F5257]">
            <Icon className="w-4 h-4" />
            <span className="font-semibold">{label}</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-[#00B5B5]">{value}</span>
        </div>
    );
}

function EmptyState({ icon: Icon, title, description }) {
    return (
        <div className="flex flex-col items-center justify-center text-center text-gray-500">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F0F9F9] text-[#00B5B5]">
                <Icon className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-gray-800">{title}</h4>
            <p className="mt-2 max-w-xl text-sm leading-relaxed">{description}</p>
        </div>
    );
}

function getInitials(name) {
    if (!name) {
        return 'CL';
    }

    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('');
}

function buildProjectEntries(project, diaryEntries, projectTeam) {
    const mappedDiaryEntries = diaryEntries
        .filter((entry) => entry.projeto_id === project.id)
        .map((entry) => ({
            id: entry.id,
            title: entry.title || 'Registro de diario',
            date: formatFirestoreDate(entry.createdAt),
            duration: entry.duration || 'Nao informado',
            stage: entry.stage || 'Registro complementar',
            whatWasDone: entry.whatWasDone || 'Sem detalhamento.',
            discoveries: entry.discoveries || 'Nenhuma descoberta registrada nesta sessao.',
            obstacles: entry.obstacles || 'Nenhum obstaculo registrado.',
            nextSteps: entry.nextSteps || 'A definir.',
            tags: Array.isArray(entry.tags) && entry.tags.length > 0 ? entry.tags : ['Geral'],
            author: entry.author || projectTeam.investigadores[0]?.nome || 'Autor nao informado',
            mediator: entry.mediator || composeMentoriaLabel(projectTeam.orientadores, projectTeam.coorientadores)
        }));

    const summaryEntry = {
        id: `${project.id}-summary`,
        title: project.titulo || 'Projeto sem titulo',
        date: 'Resumo do projeto',
        duration: project.status || 'Status nao informado',
        stage: project.tipo || 'Projeto cientifico',
        whatWasDone: project.descricao || project.introducao || 'Sem descricao registrada.',
        discoveries: project.objetivo || 'Objetivo nao informado.',
        obstacles: project.custos || project.referencias || 'Sem custos, referencias ou obstaculos informados.',
        nextSteps: project.etapas || 'Sem etapas registradas.',
        tags: [project.area_tematica, project.status].filter(Boolean),
        author: projectTeam.investigadores[0]?.nome || 'Equipe do projeto',
        mediator: composeMentoriaLabel(projectTeam.orientadores, projectTeam.coorientadores)
    };

    return [summaryEntry, ...mappedDiaryEntries];
}

function formatFirestoreDate(timestamp) {
    if (!timestamp?.toDate) {
        return 'Agora';
    }

    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'long',
        timeStyle: 'short'
    }).format(timestamp.toDate());
}

function getProjectTeam(project, users, selectedClubId = '') {
    const clubUsers = users.filter((person) => !selectedClubId || String(person.clube_id) === String(selectedClubId));
    const searchableUsers = users;
    const fallbackScopedUsers = clubUsers.length > 0 ? clubUsers : users;

    const memberReferences = extractMemberReferences(project);
    const memberUsers = findUsersByReferences(memberReferences, searchableUsers);

    const orientadorReferences = extractRoleReferences(project, 'orientador');
    const coorientadorReferences = extractRoleReferences(project, 'coorientador');
    const investigadorReferences = extractInvestigatorReferences(project);

    const orientadores = uniqueUsers([
        ...findUsersByReferences(orientadorReferences, searchableUsers),
        ...memberUsers.filter((person) => normalizePerfil(person.perfil) === 'orientador')
    ]);

    const coorientadores = uniqueUsers([
        ...findUsersByReferences(coorientadorReferences, searchableUsers),
        ...memberUsers.filter((person) => normalizePerfil(person.perfil) === 'coorientador')
    ]);

    const blockedIds = new Set([...orientadores, ...coorientadores].map((person) => String(person.id)));

    let investigadores = uniqueUsers([
        ...findUsersByReferences(investigadorReferences, searchableUsers),
        ...memberUsers
    ].filter((person) => !blockedIds.has(String(person.id))));

    if (investigadores.length === 0) {
        investigadores = uniqueUsers(
            fallbackScopedUsers.filter((person) => {
                const perfil = normalizePerfil(person.perfil);
                return ['estudante', 'investigador', 'aluno'].includes(perfil) && !blockedIds.has(String(person.id));
            })
        );
    }

    return { orientadores, coorientadores, investigadores };
}

function extractMemberReferences(project) {
    const references = [];

    const candidateFields = [
        'membros',
        'membros_ids',
        'membros_matriculas',
        'integrantes',
        'estudantes',
        'investigadores'
    ];

    candidateFields.forEach((fieldName) => {
        const fieldValue = project?.[fieldName];

        if (!fieldValue) {
            return;
        }

        if (Array.isArray(fieldValue)) {
            fieldValue.forEach((item) => {
                if (item && typeof item === 'object') {
                    [item.id, item.matricula, item.email, item.nome].forEach((value) => {
                        if (value !== undefined && value !== null && String(value).trim()) {
                            references.push(String(value).trim());
                        }
                    });
                    return;
                }

                if (item !== undefined && item !== null && String(item).trim()) {
                    references.push(String(item).trim());
                }
            });
            return;
        }

        if (typeof fieldValue === 'object') {
            [fieldValue.id, fieldValue.matricula, fieldValue.email, fieldValue.nome].forEach((value) => {
                if (value !== undefined && value !== null && String(value).trim()) {
                    references.push(String(value).trim());
                }
            });
            return;
        }

        references.push(String(fieldValue).trim());
    });

    return [...new Set(references.filter(Boolean))];
}

function extractInvestigatorReferences(project) {
    const references = [];
    const candidateFields = [
        'investigador',
        'investigadores',
        'estudante',
        'estudantes',
        'aluno',
        'alunos',
        'investigadores_ids',
        'investigadores_matriculas'
    ];

    candidateFields.forEach((fieldName) => {
        const value = project?.[fieldName];

        if (!value) {
            return;
        }

        if (Array.isArray(value)) {
            value.forEach((item) => {
                if (item && typeof item === 'object') {
                    [item.id, item.matricula, item.email, item.nome].forEach((ref) => {
                        if (ref !== undefined && ref !== null && String(ref).trim()) {
                            references.push(String(ref).trim());
                        }
                    });
                    return;
                }

                if (item !== undefined && item !== null && String(item).trim()) {
                    references.push(String(item).trim());
                }
            });
            return;
        }

        references.push(String(value).trim());
    });

    return [...new Set(references.filter(Boolean))];
}

function extractRoleReferences(project, roleName) {
    const candidateFields = [
        roleName,
        `${roleName}_id`,
        `${roleName}_ids`,
        `${roleName}_matricula`,
        `${roleName}_matriculas`,
        `${roleName}es`
    ];

    const references = [];

    candidateFields.forEach((fieldName) => {
        const value = project?.[fieldName];
        if (!value) {
            return;
        }

        if (Array.isArray(value)) {
            value.forEach((item) => references.push(String(item).trim()));
            return;
        }

        references.push(String(value).trim());
    });

    return [...new Set(references.filter(Boolean))];
}

function findUsersByReferences(references, users) {
    if (references.length === 0) {
        return [];
    }

    const normalizedReferences = references
        .flatMap((reference) => generateReferenceTokens(reference))
        .filter(Boolean);

    return users.filter((person) => {
        const valuesToCompare = [
            person.id,
            person.matricula,
            person['matrícula'],
            person.codigo,
            person.nome,
            person.email
        ]
            .flatMap((value) => generateReferenceTokens(value))
            .filter(Boolean);

        return normalizedReferences.some((reference) => valuesToCompare.includes(reference));
    });
}

function generateReferenceTokens(value) {
    if (value === undefined || value === null) {
        return [];
    }

    const raw = String(value).trim().toLowerCase();

    if (!raw) {
        return [];
    }

    const normalized = normalizeDigits(raw);
    const tokens = [raw];

    if (normalized !== raw) {
        tokens.push(normalized);
    }

    return [...new Set(tokens)];
}

function normalizeDigits(value) {
    const digitsOnly = value.replace(/\D/g, '');

    if (!digitsOnly) {
        return value;
    }

    const withoutLeadingZeros = digitsOnly.replace(/^0+/, '');
    return withoutLeadingZeros || '0';
}

function normalizePerfil(perfil) {
    return String(perfil || '').trim().toLowerCase();
}

function uniqueUsers(users) {
    const seen = new Set();

    return users.filter((person) => {
        if (!person?.id || seen.has(person.id)) {
            return false;
        }

        seen.add(person.id);
        return true;
    });
}

function composeMentoriaLabel(orientadores, coorientadores) {
    const orientadorNames = orientadores.map((person) => person.nome);
    const coorientadorNames = coorientadores.map((person) => person.nome);

    const mentorList = [];

    if (orientadorNames.length > 0) {
        mentorList.push(`Orientador: ${orientadorNames.join(', ')}`);
    }

    if (coorientadorNames.length > 0) {
        mentorList.push(`Coorientador: ${coorientadorNames.join(', ')}`);
    }

    return mentorList.length > 0 ? mentorList.join(' | ') : 'Sem Orientador informado';
}

function getInvestigatorDisplayNames(project, team, entries = []) {
    const resolvedNames = (team?.investigadores || [])
        .map((person) => person?.nome)
        .filter((name) => Boolean(name && String(name).trim()));

    if (resolvedNames.length > 0) {
        return resolvedNames;
    }

    const namesFromEntries = (entries || [])
        .map((entry) => entry?.author)
        .filter((name) => Boolean(name && String(name).trim() && !String(name).toLowerCase().includes('equipe do projeto')));

    if (namesFromEntries.length > 0) {
        return [...new Set(namesFromEntries.map((name) => String(name).trim()))].slice(0, 20);
    }

    const fallbackReferences = [
        ...extractInvestigatorReferences(project),
        ...extractMemberReferences(project)
    ].filter(Boolean);

    return [...new Set(fallbackReferences)].slice(0, 20);
}

function getLattesLink(person) {
    return person?.lattes || person?.lattes_link || person?.link_lattes || person?.curriculo_lattes || '';
}

function getAuthErrorMessage(code, fallbackMessage = '') {
    const messages = {
        'auth/user-not-found': 'Usuário não encontrado. Verifique o e-mail ou cadastre-se.',
        'auth/wrong-password': 'Senha incorreta. Tente novamente.',
        'auth/invalid-credential': 'E-mail ou senha inválidos.',
        'auth/email-already-in-use': 'Este e-mail já está cadastrado. Tente fazer login.',
        'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
        'auth/invalid-email': 'E-mail inválido.',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde e tente novamente.'
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