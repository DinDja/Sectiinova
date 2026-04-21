import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function MainShell({
  currentView,
  setCurrentView,
  setIsModalOpen,
  loggedUser,
  myClubId,
  myClub,
  viewingClub,
  setViewingClubId,
  setSelectedClubId,
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
  sidebarOrder,
  setSidebarOrder,
  saveSidebarOrder,
  children,
}) {
  const fontSizeMap = {
    1: "0.85rem",
    2: "1rem",
    3: "1.15rem",
    4: "1.3rem",
  };

  const effectiveFontSize = fontSizeMap[fontSizeLevel] || fontSizeMap[2];
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = effectiveFontSize;
    return () => {
      root.style.fontSize = "";
    };
  }, [effectiveFontSize]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [currentView]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const containerStyle = {
    fontSize: effectiveFontSize,
  };

  const isINPIView = currentView === "inpi";
  const isForum = currentView === "forum";
  const isClub = currentView === "clube";
  const isTrilha = currentView === "trilha";

  const containerClasses = isHighContrast
    ? "app-shell h-screen bg-black text-white flex flex-col relative overflow-hidden"
    : "app-shell h-screen flex flex-col relative overflow-hidden";

  return (
    <div className={containerClasses} style={containerStyle}>
      <div className="flex flex-1 overflow-hidden z-10 min-h-0">
        <Sidebar
          currentView={currentView}
          setCurrentView={setCurrentView}
          setIsModalOpen={setIsModalOpen}
          loggedUser={loggedUser}
          myClubId={myClubId}
          setViewingClubId={setViewingClubId}
          setSelectedClubId={setSelectedClubId}
          sidebarOrder={sidebarOrder}
          setSidebarOrder={setSidebarOrder}
          saveSidebarOrder={saveSidebarOrder}
          isMobileOpen={isMobileSidebarOpen}
          setIsMobileOpen={setIsMobileSidebarOpen}
        />

        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
          <TopBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            loggedUser={loggedUser}
            leadUser={leadUser}
            selectedClub={selectedClub}
            myClub={myClub}
            viewingClub={viewingClub}
            handleLogout={handleLogout}
            onSaveProfile={onSaveProfile}
            currentView={currentView}
            setCurrentView={setCurrentView}
            onToggleSidebar={() => setIsMobileSidebarOpen((open) => !open)}
            isSidebarOpen={isMobileSidebarOpen}
          />

          <main className="flex-1 overflow-y-auto overflow-x-hidden relative studio-main">
            {isINPIView ? (
              <div className="mx-auto w-full max-w-[85rem] px-3 py-4 sm:px-4 md:px-6">
                {children}
              </div>
            ) : isForum || isClub ? (
               <div className="w-full px-3 py-3 sm:px-4 md:px-6">{children}</div>
            ):  isTrilha ? (
              <div className="w-full px-3 py-3 sm:px-4 md:px-6">{children}</div>
            ) : (
              <div className="mx-auto w-full max-w-[85rem] px-3 py-4 sm:px-4 md:px-6">
                {children}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
