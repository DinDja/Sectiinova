import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function MainShell({
    currentView,
    setCurrentView,
    setIsModalOpen,
    loggedUser,
    myClubId,
    myClub,
    setViewingClubId,
    searchTerm,
    setSearchTerm,
    leadUser,
    selectedClub,
    handleLogout,
    onSaveProfile,
    fontSizeLevel,
    onDecreaseFont,
    onResetFont,
    onIncreaseFont,
    isHighContrast,
    onToggleContrast,
    children
}) {
    const fontSizeMap = {
        1: '0.85rem',
        2: '1rem',
        3: '1.15rem',
        4: '1.3rem'
    };

    const effectiveFontSize = fontSizeMap[fontSizeLevel] || fontSizeMap[2];

    useEffect(() => {
        const root = document.documentElement;
        root.style.fontSize = effectiveFontSize;
        return () => {
            root.style.fontSize = '';
        };
    }, [effectiveFontSize]);

    const containerStyle = {
        fontSize: effectiveFontSize
    };

    const containerClasses = isHighContrast
? 'app-shell h-screen bg-black text-white flex flex-col relative'
    : 'app-shell h-screen flex flex-col relative';

    return (
        <div className={containerClasses} style={containerStyle}>
            <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.83-1.66 1.66-.83-.83.83-.83zM27.83 54.627l.83.83-1.66 1.66-.83-.83.83-.83zM0 27.83l.83.83-1.66 1.66-.83-.83.83-.83zM58.33 27.83l.83.83-1.66 1.66-.83-.83.83-.83zM27.83 0l.83.83-1.66 1.66-.83-.83.83-.83zM0 58.33l.83.83-1.66 1.66-.83-.83.83-.83z' fill='%23003A54' fill-rule='evenodd'/%3E%3C/svg%3E")`, backgroundSize: '120px' }}></div>

            <div className="glass-surface border-b border-white/70 text-[11px] text-slate-500 py-2 px-4 flex justify-between items-center z-20 relative">
                <div className="flex items-center space-x-4">
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden z-10 min-h-0">
                <Sidebar
                    currentView={currentView}
                    setCurrentView={setCurrentView}
                    setIsModalOpen={setIsModalOpen}
                    loggedUser={loggedUser}
                    myClubId={myClubId}
                    setViewingClubId={setViewingClubId}
                />

                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <TopBar
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        loggedUser={loggedUser}
                        leadUser={leadUser}
                        selectedClub={selectedClub}
                        myClub={myClub}
                        handleLogout={handleLogout}
                        onSaveProfile={onSaveProfile}
                    />

                    <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">{children}</main>
                </div>
            </div>
        </div>
    );
};
