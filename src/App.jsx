import { useState } from 'react';
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
import { STAGES, PERFIS_LOGIN } from './constants/appConstants';
import useAppController from './hooks/useAppController';

export default function App() {
    const [fontSizeLevel, setFontSizeLevel] = useState(2);
    const [isHighContrast, setIsHighContrast] = useState(false);

    const decreaseFont = () => setFontSizeLevel((level) => Math.max(1, (level || 2) - 1));
    const resetFont = () => setFontSizeLevel(2);
    const increaseFont = () => setFontSizeLevel((level) => Math.min(4, (level || 2) + 1));
    const toggleContrast = () => setIsHighContrast((enabled) => !enabled);

    const {
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
        registerTeacherLookup,
        handleRegisterLookupByMatricula,
        handleRegisterLookupByLattes,
        resetRegisterTeacherLookup,
        schoolSearchTerm,
        setSchoolSearchTerm,
        filteredSchoolGroups,
        allSchoolUnits,
        handleLogin,
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
        schoolClubDiscoveryList,
        latestMyClubJoinRequestByClubId,
        requestingClubIds,
        handleRequestClubEntry,
        clubJoinRequests,
        reviewingClubRequestIds,
        handleRespondClubEntryRequest,
        handleCreateProject,
        handleCreateClub,
        handleUpdateClub,
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

    if (authLoading) {
        return <AuthLoading />;
    }

    if (!authUser || !loggedUser) {
        return (
            <AuthPage
                authMode={authMode}
                setAuthMode={setAuthMode}
                authError={authError}
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
                handleRegister={handleRegister}
                handleGoogleAuth={handleGoogleAuth}
                handleOutlookAuth={handleOutlookAuth}
                isMentoriaPerfil={isMentoriaPerfil}
                setAuthError={setAuthError}
                PERFIS_LOGIN={PERFIS_LOGIN}
            />
        );
    }

    return (
        <MainShell
            currentView={currentView}
            setCurrentView={setCurrentView}
            setIsModalOpen={setIsModalOpen}
            loggedUser={loggedUser}
            myClubId={myClubId}
            myClub={myClub}
            viewingClub={viewingClub}
            setViewingClubId={setViewingClubId}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            leadUser={leadUser}
            selectedClub={selectedClub}
            handleLogout={handleLogout}
            onSaveProfile={handleSaveProfile}
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
                        <LoaderCircle className="w-5 h-5 animate-spin text-[#00B5B5]" />
                        Carregando feed de inovação...
                    </div>
                )}

                {currentView === 'Projetos' && (
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
                )}

                {currentView === 'diario' && (
                    <DiaryBoard
                        selectedProject={selectedProject}
                        selectedClub={selectedClub}
                        selectedSchool={selectedSchool}
                        selectedTeam={selectedTeam}
                        derivedDiaryEntries={derivedDiaryEntries}
                        canEditDiary={canEditDiary}
                        setIsModalOpen={setIsModalOpen}
                        getInvestigatorDisplayNames={getInvestigatorDisplayNames}
                        composeMentoriaLabel={composeMentoriaLabel}
                        getLattesLink={getLattesLink}
                    />
                )}

                {currentView === 'clube' && (
                    <ClubBoard
                        viewingClub={viewingClub}
                        viewingClubSchool={viewingClubSchool}
                        viewingClubProjects={viewingClubProjects}
                        viewingClubUsers={viewingClubUsers}
                        viewingClubOrientadores={viewingClubOrientadores}
                        viewingClubCoorientadores={viewingClubCoorientadores}
                        viewingClubInvestigadores={viewingClubInvestigadores}
                        viewingClubDiaryCount={viewingClubDiaryCount}
                        hasNoClubMembership={myClubIds.length === 0}
                        schoolClubDiscoveryList={schoolClubDiscoveryList}
                        latestMyClubJoinRequestByClubId={latestMyClubJoinRequestByClubId}
                        requestingClubIds={requestingClubIds}
                        handleRequestClubEntry={handleRequestClubEntry}
                        clubJoinRequests={clubJoinRequests}
                        reviewingClubRequestIds={reviewingClubRequestIds}
                        handleRespondClubEntryRequest={handleRespondClubEntryRequest}
                        mentorManagedClubs={mentorManagedClubs}
                        setViewingClubId={setViewingClubId}
                        setSelectedClubId={setSelectedClubId}
                        setSelectedProjectId={setSelectedProjectId}
                        setCurrentView={setCurrentView}
                        handleCreateProject={handleCreateProject}
                        loggedUser={loggedUser}
                        schools={schools}
                        users={users}
                        handleCreateClub={handleCreateClub}
                        creatingClub={creatingClub}
                        handleUpdateClub={handleUpdateClub}
                        updatingClub={updatingClub}
                    />
                )}

                {currentView === 'inpi' && (
                    <INPI clubProjects={myClubProjects} loggedUser={loggedUser} />
                )}

                {currentView === 'forum' && (
                    <ForumBoard
                        loggedUser={loggedUser}
                        myClubId={myClubId}
                        myClubIds={myClubIds}
                        myClub={myClub}
                        mentorManagedClubs={mentorManagedClubs}
                        clubs={clubs}
                        users={users}
                    />
                )}

                {currentView === 'trilha' && <TrilhaPedagogica />}

                {currentView === 'meusProjetos' && (
                    <MeusProjetos
                        feedProjects={feedProjects}
                        clubProjects={myClubProjects}
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
                                setViewingClubId(resolvedClubId);
                            }

                            setSelectedProjectId(String(project?.id || ''));
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
    );
}
