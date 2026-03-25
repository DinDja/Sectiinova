import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';

import AuthPage from './components/AuthPage';
import AuthLoading from './components/AuthLoading';
import MainShell from './components/MainShell';
import DiaryModal from './components/DiaryModal';
import ProjectFeed from './components/ProjectFeed';
import DiaryBoard from './components/DiaryBoard';
import ClubBoard from './components/ClubBoard';
import INPI from './components/INPI';
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
        schoolSearchTerm,
        setSchoolSearchTerm,
        filteredSchoolGroups,
        allSchoolUnits,
        handleLogin,
        handleRegister,
        isMentoriaPerfil,
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
        newEntry,
        setNewEntry,
        handleAddEntry,
        savingEntry
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
                schoolSearchTerm={schoolSearchTerm}
                setSchoolSearchTerm={setSchoolSearchTerm}
                filteredSchoolGroups={filteredSchoolGroups}
                allSchoolUnits={allSchoolUnits}
                handleLogin={handleLogin}
                handleRegister={handleRegister}
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
            setViewingClubId={setViewingClubId}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            leadUser={leadUser}
            selectedClub={selectedClub}
            handleLogout={handleLogout}
            fontSizeLevel={fontSizeLevel}
            onDecreaseFont={decreaseFont}
            onResetFont={resetFont}
            onIncreaseFont={increaseFont}
            isHighContrast={isHighContrast}
            onToggleContrast={toggleContrast}
        >
            <div className="mx-auto">
                {errorMessage && (
                    <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50/95 px-5 py-4 text-sm text-orange-900 shadow-sm">
                        {errorMessage}
                    </div>
                )}

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
                        setSelectedClubId={setSelectedClubId}
                        setSelectedProjectId={setSelectedProjectId}
                        setCurrentView={setCurrentView}
                    />
                )}

                {currentView === 'inpi' && <INPI clubProjects={myClubProjects} />}
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
