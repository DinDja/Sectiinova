import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import {
  getUiFontOption,
  getUiStyleOption,
  getUiThemeOption,
  resolveUserUiPreferences,
} from "../../constants/uiPreferences";

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
  schools,
  users,
  clubJoinRequests,
  reviewingClubRequestIds,
  handleRespondClubEntryRequest,
  canManageViewingClub,
  handleUpdateClubCardTemplate,
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
    const root = document.documentElement;
    const preferences = resolveUserUiPreferences(loggedUser);
    const selectedFont = getUiFontOption(preferences.font_id);
    const selectedTheme = getUiThemeOption(preferences.theme_id);
    const selectedStyle = getUiStyleOption(preferences.style_id);

    root.style.setProperty("--font-primary", selectedFont.stack);
    Object.entries(selectedTheme.vars || {}).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    root.setAttribute("data-ui-theme", selectedTheme.id);
    root.setAttribute("data-ui-font", selectedFont.id);
    root.setAttribute("data-ui-style", selectedStyle.id);
  }, [loggedUser]);

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
    ? "app-shell h-dvh bg-black text-white flex flex-col relative overflow-hidden"
    : "app-shell h-dvh flex flex-col relative overflow-hidden";

  const constrainedContentClasses =
    "mx-auto w-full max-w-[85rem] px-3 py-3 sm:px-4 md:px-6 lg:px-4 lg:py-3 2xl:px-6 2xl:py-4";
  const fullContentClasses =
    "w-full px-3 py-3 sm:px-4 md:px-6 lg:px-4 2xl:px-6";

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
            schools={schools}
            users={users}
            clubJoinRequests={clubJoinRequests}
            reviewingClubRequestIds={reviewingClubRequestIds}
            onRespondClubJoinRequest={handleRespondClubEntryRequest}
            canManageClubJoinRequests={canManageViewingClub}
            onChangeClubCardTemplate={handleUpdateClubCardTemplate}
            currentView={currentView}
            setCurrentView={setCurrentView}
            onToggleSidebar={() => setIsMobileSidebarOpen((open) => !open)}
            isSidebarOpen={isMobileSidebarOpen}
          />

          <main className="flex-1 overflow-y-auto overflow-x-hidden relative studio-main min-w-0">
            {isINPIView ? (
              <div className={constrainedContentClasses}>
                {children}
              </div>
            ) : isForum || isClub ? (
               <div className={fullContentClasses}>{children}</div>
            ):  isTrilha ? (
              <div className={fullContentClasses}>{children}</div>
            ) : (
              <div className={constrainedContentClasses}>
                {children}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
