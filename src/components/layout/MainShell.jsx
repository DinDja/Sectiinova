import React, { useEffect, useRef, useState } from "react";
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
  const mainContentRef = useRef(null);
  const preferences = resolveUserUiPreferences(loggedUser);
  const selectedFont = getUiFontOption(preferences.font_id);
  const selectedTheme = getUiThemeOption(preferences.theme_id);
  const selectedStyle = getUiStyleOption(preferences.style_id);
  const selectedStyleId = selectedStyle.id;
  const isMaterialStyle = selectedStyleId === "material";
  const isModernStyle = selectedStyleId === "modern";
  const isEditorialStyle = selectedStyleId === "editorial";
  const editorialSectionOrder = [
    "Projetos",
    "meusProjetos",
    "trilha",
    "inpi",
    "forum",
    "clube",
  ];

  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = effectiveFontSize;
    return () => {
      root.style.fontSize = "";
    };
  }, [effectiveFontSize]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    root.style.setProperty("--font-primary", selectedFont.stack);
    Object.entries(selectedTheme.vars || {}).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    root.setAttribute("data-ui-theme", selectedTheme.id);
    root.setAttribute("data-ui-font", selectedFont.id);
    root.setAttribute("data-ui-style", selectedStyle.id);
    if (body) {
      body.setAttribute("data-ui-theme", selectedTheme.id);
      body.setAttribute("data-ui-font", selectedFont.id);
      body.setAttribute("data-ui-style", selectedStyle.id);
    }

    return () => {
      root.removeAttribute("data-ui-theme");
      root.removeAttribute("data-ui-font");
      root.removeAttribute("data-ui-style");
      if (body) {
        body.removeAttribute("data-ui-theme");
        body.removeAttribute("data-ui-font");
        body.removeAttribute("data-ui-style");
      }
    };
  }, [selectedFont, selectedTheme, selectedStyle]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [currentView]);

  useEffect(() => {
    if (!mainContentRef.current) return;
    mainContentRef.current.scrollTop = 0;
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
  const isWideView = isForum || isClub || isTrilha;

  const currentViewMap = {
    Projetos: {
      label: "Feed de Projetos",
      summary: "Descubra e acompanhe iniciativas da rede.",
    },
    meusProjetos: {
      label: "Meus Projetos",
      summary: "Acesso rapido aos projetos em que voce atua.",
    },
    inpi: {
      label: "PatentesLab",
      summary: "Documentos, PI e acompanhamento de processos.",
    },
    trilha: {
      label: "Trilha Pedagogica",
      summary: "Planejamento das trilhas de aprendizagem.",
    },
    forum: {
      label: "Forum",
      summary: "Discussoes, colaboracao e avisos da comunidade.",
    },
    clube: {
      label: "Meu Clube",
      summary: "Gestao do clube, membros e projetos vinculados.",
    },
    diario: {
      label: "Diario de Bordo",
      summary: "Registros, marcos e evidencias de evolucao.",
    },
  };
  const currentViewMeta = currentViewMap[currentView] || {
    label: "Workspace",
    summary: "Ambiente principal da plataforma.",
  };
  const contextClubName = String(
    viewingClub?.nome || myClub?.nome || selectedClub?.nome || "",
  ).trim();
  const contextSchoolName = String(
    loggedUser?.escola_nome || viewingClub?.escola_nome || selectedClub?.escola_nome || "",
  ).trim();

  const containerClasses = isHighContrast
    ? "app-shell h-dvh bg-black text-white flex flex-col relative overflow-hidden"
    : "app-shell h-dvh flex flex-col relative overflow-hidden";

  const shellBodyClasses = isMaterialStyle
    ? "flex flex-1 overflow-hidden z-10 min-h-0 gap-3 bg-slate-100/70 p-2 sm:p-3 lg:p-4"
    : isModernStyle
      ? "flex flex-1 overflow-hidden z-10 min-h-0 bg-slate-50/80"
      : isEditorialStyle
        ? "flex flex-1 overflow-hidden z-10 min-h-0 gap-3 bg-[#f2ebde] p-2 sm:p-3 lg:p-4"
    : "flex flex-1 overflow-hidden z-10 min-h-0";

  const contentColumnClasses = isMaterialStyle
    ? "flex-1 flex flex-col h-full overflow-hidden min-w-0 rounded-[1.6rem] border border-slate-200 bg-white/90 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
    : isModernStyle
      ? "flex-1 flex flex-col h-full overflow-hidden min-w-0 border-l border-slate-200/70 bg-slate-50"
      : isEditorialStyle
        ? "flex-1 flex flex-col h-full overflow-hidden min-w-0 rounded-[1.35rem] border border-[#d4c3aa] bg-[#fcf8ef] shadow-[0_20px_45px_rgba(110,86,52,0.14)]"
    : "flex-1 flex flex-col h-full overflow-hidden min-w-0";

  const constrainedContentClasses = isMaterialStyle
    ? "mx-auto w-full max-w-[96rem] px-4 py-4 sm:px-5 md:px-6 lg:px-8 2xl:px-10"
    : isEditorialStyle
      ? "mx-auto w-full max-w-[82rem] px-4 py-5 sm:px-6 lg:px-8"
    :
    "mx-auto w-full max-w-[85rem] px-3 py-3 sm:px-4 md:px-6 lg:px-4 lg:py-3 2xl:px-6 2xl:py-4";
  const fullContentClasses = isMaterialStyle
    ? "w-full px-4 py-4 sm:px-5 md:px-6 lg:px-8 2xl:px-10"
    : isEditorialStyle
      ? "w-full px-4 py-5 sm:px-6 lg:px-9"
    :
    "w-full px-3 py-3 sm:px-4 md:px-6 lg:px-4 2xl:px-6";

  const renderContentByStyle = () => {
    const contentNode = isINPIView ? (
      <div className={constrainedContentClasses}>{children}</div>
    ) : isWideView ? (
      <div className={fullContentClasses}>{children}</div>
    ) : (
      <div className={constrainedContentClasses}>{children}</div>
    );

    if (isMaterialStyle) {
      return (
        <div className="mx-auto w-full max-w-[112rem] px-3 py-3 sm:px-4 lg:px-5">
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {currentViewMeta.label}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  {currentViewMeta.summary}
                </p>
              </header>
              <div className="min-w-0">{contentNode}</div>
            </section>

            <aside className="hidden xl:flex xl:min-h-[20rem] xl:flex-col xl:gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Contexto
                </p>
                <p className="mt-1.5 text-sm font-semibold text-slate-900">
                  {contextClubName || "Sem clube selecionado"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Estilo Ativo
                </p>
                <p className="mt-1.5 text-sm font-semibold text-slate-900">
                  Material
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Navegacao em paineis e foco operacional.
                </p>
              </div>
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3">
                <p className="text-xs font-medium text-slate-600">
                  Dica: use o menu lateral para reorganizar atalhos por prioridade.
                </p>
              </div>
            </aside>
          </div>
        </div>
      );
    }

    if (isModernStyle) {
      return (
        <div className="mx-auto w-full max-w-[94rem] px-4 py-4 sm:px-5 lg:px-8">
          <div className="flex min-w-0 flex-col gap-4">
            <header className="rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                {currentViewMeta.label}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-slate-900">
                  {currentViewMeta.summary}
                </h1>
                {contextClubName && (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    {contextClubName}
                  </span>
                )}
              </div>
            </header>
            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
              {contentNode}
            </section>
          </div>
        </div>
      );
    }

    if (isEditorialStyle) {
      return (
        <div className="editorial-layout-frame mx-auto w-full max-w-[104rem] px-2.5 py-2.5 sm:px-4 lg:px-5">
          <section className="editorial-sheet min-w-0 overflow-hidden">
            <header className="editorial-sheet-header px-5 py-4 sm:px-7">
              <div className="min-w-0">
                <p className="editorial-kicker">
                  Caderno de navegacao
                </p>
                <h2 className="mt-2 break-words text-2xl font-semibold text-[#4b3a2a] sm:text-[1.75rem]">
                  {currentViewMeta.label}
                </h2>
                <p className="mt-1 max-w-3xl break-words text-sm leading-relaxed text-[#6f5a42]">
                  {currentViewMeta.summary}
                </p>
              </div>
              <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2">
                {contextClubName && (
                  <span className="editorial-chip">
                    Clube: {contextClubName}
                  </span>
                )}
                {contextSchoolName && (
                  <span className="editorial-chip">
                    Escola: {contextSchoolName}
                  </span>
                )}
              </div>
              <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
                {editorialSectionOrder.map((sectionId) => {
                  const sectionMeta = currentViewMap[sectionId];
                  if (!sectionMeta) return null;
                  const isCurrent = sectionId === currentView;
                  return (
                    <span
                      key={sectionId}
                      className={`max-w-full truncate rounded-full border px-3 py-1 text-[11px] ${
                        isCurrent
                          ? "border-[#b69469] bg-[#f1e2cc] font-semibold text-[#4b3a2a]"
                          : "border-[#dac8ad] bg-[#fffaf1] text-[#7a664f]"
                      }`}
                    >
                      {sectionMeta.label}
                    </span>
                  );
                })}
              </div>
            </header>
            <div className="min-w-0">{contentNode}</div>
          </section>
        </div>
      );
    }

    return contentNode;
  };

  return (
    <div className={containerClasses} style={containerStyle}>
      <div className={shellBodyClasses}>
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
          uiStyleId={selectedStyleId}
        />

        <div className={contentColumnClasses}>
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
            uiStyleId={selectedStyleId}
            fontSizeLevel={fontSizeLevel}
            onDecreaseFont={onDecreaseFont}
            onResetFont={onResetFont}
            onIncreaseFont={onIncreaseFont}
          />

          <main
            ref={mainContentRef}
            className={`flex-1 overflow-y-auto overflow-x-hidden relative studio-main min-w-0 ${isMaterialStyle ? "material-main" : ""} ${isModernStyle ? "modern-main" : ""} ${isEditorialStyle ? "editorial-main" : ""}`}
          >
            {renderContentByStyle()}
          </main>
        </div>
      </div>
    </div>
  );
}
