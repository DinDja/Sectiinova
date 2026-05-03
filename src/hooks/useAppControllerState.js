import { useCallback, useRef, useState } from 'react';

import { STAGES } from '../constants/appConstants';

const DEFAULT_SIDEBAR_ORDER = ['Projetos', 'meusProjetos', 'trilha', 'biblioteca', 'popEventos', 'forum', 'clube'];

export default function useAppControllerState() {
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
    const [profileCompletionContext, setProfileCompletionContext] = useState(null);
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
        tags: '',
        images: []
    });
    const [sidebarOrder, setSidebarOrder] = useState(DEFAULT_SIDEBAR_ORDER);

    const isRegisteringRef = useRef(false);
    const projectsCursorRef = useRef(null);
    const hasMoreProjectsRef = useRef(true);
    const isFetchingProjectsRef = useRef(false);

    return {
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
    };
}
