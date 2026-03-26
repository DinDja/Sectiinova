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
            <div className=" flex justify-between items-center z-20 relative">
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

                    <main className="flex-1 overflow-y-auto relative p-2"    style={{
        backgroundColor: '#f8fafc', // Cor de fundo base (slate-50)
        backgroundImage: ` 
          linear-gradient(to right, rgba(203, 213, 225, 0.2) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(203, 213, 225, 0.2) 1px, transparent 1px)
        `, // Desenha as linhas horizontais e verticais com transparência suave (slate-300 a 20%)
        backgroundSize: '32px 32px', // Tamanho de cada quadradinho
      }}>{children}</main>
                </div>
            </div>
        </div>
    );
};
