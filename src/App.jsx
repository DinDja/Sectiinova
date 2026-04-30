import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

import AuthPage from './components/auth/AuthPage';
import AuthLoading from './components/auth/AuthLoading';
import MainShell from './components/layout/MainShell';
import DiaryModal from './components/diary/DiaryModal';
import ProjectFeed from './components/projects/ProjectFeed';
import DiaryBoard from './components/diary/DiaryBoard';
import ClubBoard from './components/club/ClubBoard';
import INPI from './components/inpi/INPI';
import ForumBoard from './components/forum/ForumBoard';
import TrilhaPedagogica from './components/trilha/TrilhaPedagogica';
import MeusProjetos from './components/projects/MeusProjetos';
import POPEventos from './components/pop-eventos/POPEventos';
import TutorialCoach from './components/tutorial/TutorialCoach';
import { STAGES, PERFIS_LOGIN } from './constants/appConstants';
import { getUiStyleOption, resolveUserUiPreferences } from './constants/uiPreferences';
import { TutorialProvider } from './contexts/TutorialContext';
import useAppController from './hooks/useAppController';

const FONT_SIZE_LEVEL_STORAGE_KEY = 'sectiinova.fontSizeLevel';

const normalizeFontSizeLevel = (value) => {
    const parsedLevel = Number(value);
    if (!Number.isFinite(parsedLevel)) return 2;
    return Math.min(4, Math.max(1, Math.trunc(parsedLevel)));
};

const getInitialFontSizeLevel = () => {
    if (typeof window === 'undefined') return 2;

    try {
        const savedLevel = window.localStorage.getItem(FONT_SIZE_LEVEL_STORAGE_KEY);
        if (!savedLevel) return 2;
        return normalizeFontSizeLevel(savedLevel);
    } catch (storageError) {
        console.warn('Falha ao ler preferencia de tamanho de fonte:', storageError);
        return 2;
    }
};

export default function App() {
    const [fontSizeLevel, setFontSizeLevel] = useState(getInitialFontSizeLevel);
    const [isHighContrast, setIsHighContrast] = useState(false);

    const decreaseFont = () => setFontSizeLevel((level) => Math.max(1, (level || 2) - 1));
    const resetFont = () => setFontSizeLevel(2);
    const increaseFont = () => setFontSizeLevel((level) => Math.min(4, (level || 2) + 1));
    const toggleContrast = () => setIsHighContrast((enabled) => !enabled);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            window.localStorage.setItem(
                FONT_SIZE_LEVEL_STORAGE_KEY,
                String(normalizeFontSizeLevel(fontSizeLevel))
            );
        } catch (storageError) {
            console.warn('Falha ao salvar preferencia de tamanho de fonte:', storageError);
        }
    }, [fontSizeLevel]);

    const {
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
        registerTeacherLookup,
        handleRegisterLookupByMatricula,
        handleRegisterLookupByLattes,
        resetRegisterTeacherLookup,
        schoolSearchTerm,
        setSchoolSearchTerm,
        filteredSchoolGroups,
        allSchoolUnits,
        handleLogin,
        handlePasswordReset,
        handleRegister,
        handleGoogleAuth,
        handleOutlookAuth,
        isMentoriaPerfil,
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
        myClub,
        mentorManagedClubs,
        handleLogout,
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
        composeMentoriaLabel,
        getLattesLink,
        viewingClub,
        viewingClubSchool,
        viewingClubProjects,
        viewingClubUsers,
        viewingClubOrientadores,
        viewingClubCoorientadores,
        viewingClubInvestigadores,
        viewingClubDiaryCount,
        projectsCatalog,
        schoolClubDiscoveryList,
        canManageViewingClub,
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
        handleSaveProfile,
        newEntry,
        setNewEntry,
        handleAddEntry,
        savingEntry,
        sidebarOrder,
        setSidebarOrder,
        saveSidebarOrder
    } = useAppController();

    const selectedUiStyleId = getUiStyleOption(
        resolveUserUiPreferences(loggedUser).style_id,
    ).id;

    if (authLoading) {
        return <AuthLoading />;
    }

    if (!authUser || !loggedUser) {
        return (
            <AuthPage
                authMode={authMode}
                setAuthMode={setAuthMode}
                authError={authError}
                authNotice={authNotice}
                isSubmitting={isSubmitting}
                loginForm={loginForm}
                setLoginForm={setLoginForm}
                registerForm={registerForm}
                setRegisterForm={setRegisterForm}
                registerTeacherLookup={registerTeacherLookup}
                handleRegisterLookupByMatricula={handleRegisterLookupByMatricula}
                handleRegisterLookupByLattes={handleRegisterLookupByLattes}
                resetRegisterTeacherLookup={resetRegisterTeacherLookup}
                schoolSearchTerm={schoolSearchTerm}
                setSchoolSearchTerm={setSchoolSearchTerm}
                filteredSchoolGroups={filteredSchoolGroups}
                allSchoolUnits={allSchoolUnits}
                handleLogin={handleLogin}
                handlePasswordReset={handlePasswordReset}
                handleRegister={handleRegister}
                handleGoogleAuth={handleGoogleAuth}
                handleOutlookAuth={handleOutlookAuth}
                handleLogout={handleLogout}
                isCompletingSocialProfile={isCompletingSocialProfile}
                forceOpenRegister={isCompletingSocialProfile}
                socialCompletionProvider={String(profileCompletionContext?.provider || '').trim().toLowerCase()}
                isMentoriaPerfil={isMentoriaPerfil}
                setAuthError={setAuthError}
                setAuthNotice={setAuthNotice}
                PERFIS_LOGIN={PERFIS_LOGIN}
            />
        );
    }

    return (
        <TutorialProvider
            currentView={currentView}
            setCurrentView={setCurrentView}
            loggedUser={loggedUser}
        >
            <MainShell
                currentView={currentView}
                setCurrentView={setCurrentView}
                setIsModalOpen={setIsModalOpen}
                loggedUser={loggedUser}
                myClubId={myClubId}
                myClub={myClub}
                viewingClub={viewingClub}
                setViewingClubId={setViewingClubId}
                setSelectedClubId={setSelectedClubId}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                leadUser={leadUser}
                selectedClub={selectedClub}
                handleLogout={handleLogout}
                onSaveProfile={handleSaveProfile}
                schools={schools}
                users={users}
                clubJoinRequests={clubJoinRequests}
                reviewingClubRequestIds={reviewingClubRequestIds}
                handleRespondClubEntryRequest={handleRespondClubEntryRequest}
                canManageViewingClub={canManageViewingClub}
                handleUpdateClubCardTemplate={handleUpdateClubCardTemplate}
                fontSizeLevel={fontSizeLevel}
                onDecreaseFont={decreaseFont}
                onResetFont={resetFont}
                onIncreaseFont={increaseFont}
                isHighContrast={isHighContrast}
                onToggleContrast={toggleContrast}
                sidebarOrder={sidebarOrder}
                setSidebarOrder={setSidebarOrder}
                saveSidebarOrder={saveSidebarOrder}
            >
                <div className="mx-auto">
                    {loading && (
                        <div className="mb-6 premium-card p-8 flex items-center justify-center gap-3 text-slate-600">
                            <LoaderCircle className="w-5 h-5 animate-spin text-[#10B981]" />
                            Carregando feed de inovação...
                        </div>
                    )}

                    {currentView === 'Projetos' && (
                        <div data-tutorial-anchor="content-projetos">
                            <ProjectFeed
                                feedProjects={feedProjects}
                                clubs={clubs}
                                schools={schools}
                                users={users}
                                diaryEntries={diaryEntries}
                                projectsTotalCount={projectsTotalCount}
                                isFetchingProjects={isFetchingProjects}
                                hasMoreProjects={hasMoreProjects}
                                loadMoreProjectsRef={loadMoreProjectsRef}
                                setCurrentView={setCurrentView}
                                setSelectedClubId={setSelectedClubId}
                                setSelectedProjectId={setSelectedProjectId}
                                setViewingClubId={setViewingClubId}
                                getProjectTeam={getProjectTeam}
                                getInvestigatorDisplayNames={getInvestigatorDisplayNames}
                                searchTerm={searchTerm}
                            />
                        </div>
                    )}

                    {currentView === 'diario' && (
                        <div data-tutorial-anchor="content-diario">
                            <DiaryBoard
                                selectedProject={selectedProject}
                                selectedClub={selectedClub}
                                selectedSchool={selectedSchool}
                                selectedTeam={selectedTeam}
                                derivedDiaryEntries={derivedDiaryEntries}
                                canViewDiary={canViewDiary}
                                canEditDiary={canEditDiary}
                                setIsModalOpen={setIsModalOpen}
                                getInvestigatorDisplayNames={getInvestigatorDisplayNames}
                                composeMentoriaLabel={composeMentoriaLabel}
                                getLattesLink={getLattesLink}
                            />
                        </div>
                    )}

                    {currentView === 'clube' && (
                        <div data-tutorial-anchor="content-clube">
                            <ClubBoard
                                viewingClub={viewingClub}
                                viewingClubSchool={viewingClubSchool}
                                viewingClubProjects={viewingClubProjects}
                                viewingClubUsers={viewingClubUsers}
                                viewingClubOrientadores={viewingClubOrientadores}
                                viewingClubCoorientadores={viewingClubCoorientadores}
                                viewingClubInvestigadores={viewingClubInvestigadores}
                                viewingClubDiaryCount={viewingClubDiaryCount}
                                projectsCatalog={projectsCatalog}
                                hasNoClubMembership={myClubIds.length === 0}
                                schoolClubDiscoveryList={schoolClubDiscoveryList}
                                latestMyClubJoinRequestByClubId={latestMyClubJoinRequestByClubId}
                                requestingClubIds={requestingClubIds}
                                handleRequestClubEntry={handleRequestClubEntry}
                                myClubIds={myClubIds}
                                mentorManagedClubs={mentorManagedClubs}
                                setViewingClubId={setViewingClubId}
                                setSelectedClubId={setSelectedClubId}
                                setSelectedProjectId={setSelectedProjectId}
                                setCurrentView={setCurrentView}
                                handleCreateProject={handleCreateProject}
                                handleUpdateProject={handleUpdateProject}
                                handleDeleteProject={handleDeleteProject}
                                loggedUser={loggedUser}
                                schools={schools}
                                users={users}
                                clubs={clubs}
                                handleCreateClub={handleCreateClub}
                                creatingClub={creatingClub}
                                handleUpdateClub={handleUpdateClub}
                                updatingClub={updatingClub}
                            />
                        </div>
                    )}

                    {currentView === 'inpi' && (
                        <div data-tutorial-anchor="content-inpi">
                            <INPI clubProjects={myClubProjects} loggedUser={loggedUser} />
                        </div>
                    )}

                    {currentView === 'forum' && (
                        <div data-tutorial-anchor="content-forum">
                            <ForumBoard
                                loggedUser={loggedUser}
                                myClubId={myClubId}
                                myClubIds={myClubIds}
                                myClub={myClub}
                                mentorManagedClubs={mentorManagedClubs}
                                clubs={clubs}
                                users={users}
                            />
                        </div>
                    )}

                    {currentView === 'trilha' && (
                        <div data-tutorial-anchor="content-trilha">
                            <TrilhaPedagogica />
                        </div>
                    )}

                    {currentView === 'popEventos' && (
                        <div data-tutorial-anchor="content-popEventos">
                            <POPEventos uiStyleId={selectedUiStyleId} loggedUser={loggedUser} />
                        </div>
                    )}

                    {currentView === 'meusProjetos' && (
                        <div data-tutorial-anchor="content-meusProjetos">
                            <MeusProjetos
                                feedProjects={feedProjects}
                                clubProjects={myClubProjects}
                                myClubIds={myClubIds}
                                mentorManagedClubs={mentorManagedClubs}
                                loggedUser={loggedUser}
                                clubs={clubs}
                                users={users}
                                diaryEntries={diaryEntries}
                                getProjectTeam={getProjectTeam}
                                getInvestigatorDisplayNames={getInvestigatorDisplayNames}
                                onDiaryClick={(project) => {
                                    const resolvedClubId = String(project?.clube_id || '').trim();
                                    if (resolvedClubId) {
                                        setSelectedClubId(resolvedClubId);
                                    }

                                    setSelectedProjectId(String(project?.id || '').trim());
                                    setCurrentView('diario');
                                }}
                                onClubClick={(project) => {
                                    const resolvedClubId = String(project?.clube_id || '').trim();
                                    if (!resolvedClubId) return;

                                    setSelectedClubId(resolvedClubId);
                                    setViewingClubId(resolvedClubId);
                                    setCurrentView('clube');
                                }}
                            />
                        </div>
                    )}
                </div>

                <DiaryModal
                    isModalOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    newEntry={newEntry}
                    setNewEntry={setNewEntry}
                    handleAddEntry={handleAddEntry}
                    STAGES={STAGES}
                    savingEntry={savingEntry}
                />
            </MainShell>

            <TutorialCoach uiStyleId={selectedUiStyleId} />
        </TutorialProvider>
    );
}

