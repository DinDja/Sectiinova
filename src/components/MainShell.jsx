import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function MainShell({
    currentView,
    setCurrentView,
    setIsModalOpen,
    loggedUser,
    myClubId,
    setViewingClubId,
    searchTerm,
    setSearchTerm,
    leadUser,
    selectedClub,
    handleLogout,
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
                <div className="flex space-x-6">
                    <span className="hidden md:inline font-semibold tracking-wide text-slate-600">Rede Baiana de Clubes de Ciência - SECTI</span>
                    <a href="#" className="hover:underline hover:text-slate-700">1- Ir para o conteúdo.</a>
                    <a href="#" className="hover:underline hover:text-slate-700">2- Ir para o menu.</a>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex space-x-2 items-center">
                        <span>Tamanho do texto:</span>
                        <button
                            className="hover:text-slate-800 font-medium"
                            onClick={onDecreaseFont}
                            aria-label="Diminuir tamanho do texto"
                        >
                            A-
                        </button>
                        <button
                            className="hover:text-slate-800 font-medium"
                            onClick={onResetFont}
                            aria-label="Restaurar tamanho do texto"
                        >
                            A
                        </button>
                        <button
                            className="hover:text-slate-800 font-medium"
                            onClick={onIncreaseFont}
                            aria-label="Aumentar tamanho do texto"
                        >
                            A+
                        </button>
                    </div>
                    <button
                        className="flex items-center space-x-1 hover:text-slate-800"
                        onClick={onToggleContrast}
                        aria-pressed={isHighContrast}
                    >
                        <span>Alto Contraste</span>
                        <div className={`w-3 h-3 rounded-full flex overflow-hidden ${isHighContrast ? 'bg-white' : 'bg-gray-800'}`}>
                            <div className={isHighContrast ? 'w-full bg-black' : 'w-1/2 bg-white'}></div>
                        </div>
                    </button>
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
                        handleLogout={handleLogout}
                    />

                    <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">{children}</main>
                </div>
            </div>
        </div>
    );
};
