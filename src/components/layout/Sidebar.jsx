import React, { useState, useCallback, useEffect } from "react";
import { GripHorizontal, Check, Settings2, X } from "lucide-react";
import {
  FcGlobe,
  FcOpenedFolder,
  FcWorkflow,
  FcReading,
  FcCalendar,
  FcIdea,
  FcComments,
  FcDepartment,
} from "react-icons/fc";
import { getPrimaryUserClubId } from "../../services/projectService";

export default function Sidebar({
  currentView,
  setCurrentView,
  setIsModalOpen,
  loggedUser,
  myClubId,
  setViewingClubId,
  setSelectedClubId,
  sidebarOrder,
  setSidebarOrder,
  saveSidebarOrder,
  isMobileOpen = false,
  setIsMobileOpen = () => {},
  uiStyleId = "neo",
}) {
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tempOrder, setTempOrder] = useState(null);
  const isMaterialStyle = uiStyleId === "material";
  const isEditorialStyle = uiStyleId === "editorial";

  const allNavItems = [
    {
      id: "Projetos",
      label: "ColabTec",
      icon: FcGlobe,
      iconSrc: "/iconesSidebar/colabtec.svg",
      tooltip: "Explorar projetos",
      description: "Feed completo da plataforma",
    },
    {
      id: "meusProjetos",
      label: "Meus Projetos",
      icon: FcOpenedFolder,
      tooltip: "Projetos que participo",
      description: "Atalhos para projetos vinculados",
    },
    {
      id: "trilha",
      label: "Trilha",
      icon: FcWorkflow,
      iconSrc: "/iconesSidebar/trilha.svg",
      tooltip: "Planejar trilha CT&I",
      description: "Planejamento pedagogico de trilhas",
    },
    {
      id: "biblioteca",
      label: "Biblioteca",
      icon: FcReading,
      tooltip: "Livros livres curados",
      description: "Leituras alinhadas a ciencia e inovacao",
    },
    {
      id: "popEventos",
      label: "POP Eventos",
      icon: FcCalendar,
      tooltip: "Radar de eventos 2026",
      description: "Editais, olimpiadas e chamadas",
    },
    // {
    //   id: "inpi",
    //   label: "PatentesLab",
    //   icon: FcIdea,
    //   tooltip: "Propriedade intelectual",
    //   description: "Fluxo de PI e documentos",
    // },
    {
      id: "forum",
      label: "POP Cafe",
      icon: FcComments,
      iconSrc: "/iconesSidebar/CafeDigital.svg",
      tooltip: "Forum de discussao",
      description: "Discussoes e colaboracao",
    },
    {
      id: "clube",
      label: "Meu Clube",
      icon: FcDepartment,
      iconSrc: "/iconesSidebar/meuclube.svg",
      tooltip: "Gerenciar meu clube",
      description: "Gestao do clube e equipe",
    },
  ];

  const defaultOrder = [
    "Projetos",
    "meusProjetos",
    "trilha",
    "biblioteca",
    "popEventos",
    "forum",
    "clube",
  ];
  const validNavIds = allNavItems.map((item) => item.id);
  const sanitizedSidebarOrder = Array.isArray(sidebarOrder)
    ? sidebarOrder.filter((id) => validNavIds.includes(id))
    : [];
  const mergedSidebarOrder = [
    ...sanitizedSidebarOrder,
    ...defaultOrder.filter((id) => !sanitizedSidebarOrder.includes(id)),
  ];
  const displayOrder =
    tempOrder ||
    (mergedSidebarOrder.length > 0 ? mergedSidebarOrder : defaultOrder);

  const navItems = displayOrder
    .map((id) => allNavItems.find((item) => item.id === id))
    .filter(Boolean);

  useEffect(() => {
    if (!isMobileOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsMobileOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMobileOpen, setIsMobileOpen]);

  const closeMobileSidebar = () => {
    setIsMobileOpen(false);
  };

  const handleMyClubClick = useCallback(() => {
    setCurrentView("clube");
    const targetClubId = String(
      myClubId || getPrimaryUserClubId(loggedUser) || "",
    ).trim();

    if (!targetClubId) {
      setViewingClubId("");
      if (typeof setSelectedClubId === "function") {
        setSelectedClubId("");
      }
      closeMobileSidebar();
      return;
    }

    setViewingClubId(targetClubId);
    if (typeof setSelectedClubId === "function") {
      setSelectedClubId(targetClubId);
    }
    closeMobileSidebar();
  }, [setCurrentView, loggedUser, myClubId, setViewingClubId, setSelectedClubId]);

  const handleNavClick = (itemId) => {
    if (isEditing) return;

    if (itemId === "clube") {
      handleMyClubClick();
      return;
    }

    setCurrentView(itemId);
    closeMobileSidebar();
  };

  const handleDragStart = (event, index) => {
    if (!isEditing) {
      event.preventDefault();
      return;
    }
    setDraggedItemIndex(index);
    if (!tempOrder) setTempOrder([...displayOrder]);

    const img = new Image();
    img.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    event.dataTransfer.setDragImage(img, 0, 0);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (event, index) => {
    event.preventDefault();
    if (!isEditing || draggedItemIndex === null) return;

    if (dragOverItemIndex !== index) {
      setDragOverItemIndex(index);
    }

    if (draggedItemIndex === index) return;

    const workingOrder = tempOrder || displayOrder;
    const nextOrder = [...workingOrder];
    const draggedItemId = nextOrder[draggedItemIndex];

    nextOrder.splice(draggedItemIndex, 1);
    nextOrder.splice(index, 0, draggedItemId);

    setDraggedItemIndex(index);
    setTempOrder(nextOrder);
  };

  const handleDragEnter = (event, index) => {
    event.preventDefault();
    if (!isEditing || draggedItemIndex === null) return;
    setDragOverItemIndex(index);
  };

  const handleDrop = (event) => {
    event.preventDefault();
  };

  const handleDragEnd = async () => {
    const previousOrder = sidebarOrder;
    setDraggedItemIndex(null);
    setDragOverItemIndex(null);

    if (tempOrder) {
      setSidebarOrder(tempOrder);
      if (saveSidebarOrder) {
        const success = await saveSidebarOrder(tempOrder);
        if (!success) {
          setSidebarOrder(previousOrder);
        }
      }
    }

    setIsEditing(false);
    setTempOrder(null);
  };

  const toggleEditMode = () => {
    setIsEditing((editing) => !editing);
    if (isEditing && tempOrder) {
      setTempOrder(null);
    }
  };

  const renderNavIcon = (item, classes) => {
    const Icon = item.icon;
    if (item.iconSrc) {
      return (
        <img
          src={item.iconSrc}
          alt=""
          aria-hidden="true"
          className={classes}
          loading="lazy"
        />
      );
    }
    return <Icon className={classes} />;
  };

  const renderMaterialItem = (item, index, isMobile) => {
    const isActive = currentView === item.id;
    const isBeingDragged = draggedItemIndex === index;
    const isDragTarget =
      dragOverItemIndex === index && draggedItemIndex !== index;

    return (
      <div
        key={item.id}
        draggable={isEditing}
        onDragStart={(event) => handleDragStart(event, index)}
        onDragEnter={(event) => handleDragEnter(event, index)}
        onDragOver={(event) => handleDragOver(event, index)}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        className="relative w-full transition-all duration-300"
        style={{ zIndex: isBeingDragged ? 50 : 1 }}
      >
        <button
          type="button"
          onClick={() => handleNavClick(item.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              handleNavClick(item.id);
            }
          }}
          disabled={isEditing}
          data-tutorial-anchor={`nav-${item.id}`}
          className={`group relative flex w-full items-center gap-3 overflow-hidden border transition-all duration-300 outline-none ${
            isMobile ? "rounded-2xl px-4 py-3.5" : "rounded-xl px-3.5 py-3"
          } ${
            isEditing
              ? "cursor-grab border-slate-300 bg-slate-100 hover:bg-white active:cursor-grabbing"
              : isActive
                ? "cursor-pointer border-slate-300 bg-white shadow-sm"
                : "cursor-pointer border-transparent bg-slate-50 hover:border-slate-200 hover:bg-white"
          } ${
            isBeingDragged ? "scale-[1.02] bg-white shadow-xl" : ""
          } ${isDragTarget ? "translate-y-2 opacity-50" : ""}`}
          title={item.tooltip}
          aria-label={item.label}
          aria-current={isActive ? "page" : undefined}
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
              isActive
                ? "bg-cyan-100 ring-1 ring-cyan-300"
                : "bg-white ring-1 ring-slate-200"
            }`}
          >
            {renderNavIcon(
              item,
              "h-7 w-7 transition-transform duration-300 group-hover:scale-105",
            )}
          </div>

          <div className="min-w-0 flex-1 text-left">
            <p
              className={`truncate text-sm font-semibold ${
                isActive ? "text-slate-900" : "text-slate-700"
              }`}
            >
              {item.label}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
              {item.description || item.tooltip}
            </p>
          </div>

          {isEditing ? (
            <GripHorizontal className="h-4 w-4 shrink-0 text-slate-400" />
          ) : isActive ? (
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-400" />
          ) : null}
        </button>
      </div>
    );
  };

  const renderEditorialItem = (item, index, isMobile) => {
    const isActive = currentView === item.id;
    const isBeingDragged = draggedItemIndex === index;
    const isDragTarget =
      dragOverItemIndex === index && draggedItemIndex !== index;

    return (
      <div
        key={item.id}
        draggable={isEditing}
        onDragStart={(event) => handleDragStart(event, index)}
        onDragEnter={(event) => handleDragEnter(event, index)}
        onDragOver={(event) => handleDragOver(event, index)}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        className="relative w-full transition-all duration-300"
        style={{ zIndex: isBeingDragged ? 50 : 1 }}
      >
        <button
          type="button"
          onClick={() => handleNavClick(item.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              handleNavClick(item.id);
            }
          }}
          disabled={isEditing}
          data-tutorial-anchor={`nav-${item.id}`}
          className={`group relative flex w-full items-center gap-3 overflow-hidden border outline-none ${
            isMobile ? "rounded-xl px-4 py-3.5" : "rounded-xl px-4 py-3"
          } ${
            isEditing
              ? "cursor-grab border-[#d4c1a5] bg-[#f7efe2] active:cursor-grabbing"
              : isActive
                ? "cursor-pointer border-[#bfa47f] bg-[#fffaf2] shadow-sm"
                : "cursor-pointer border-[#e5d6c2] bg-[#fdf8ef] hover:border-[#d8c3a3] hover:bg-[#fffaf2]"
          } ${
            isBeingDragged ? "scale-[1.01] bg-[#fffdf7] shadow-md" : ""
          } ${isDragTarget ? "translate-y-1.5 opacity-60" : ""}`}
          title={item.tooltip}
          aria-label={item.label}
          aria-current={isActive ? "page" : undefined}
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all ${
              isActive
                ? "bg-[#f2e3cf] ring-1 ring-[#cfb590]"
                : "bg-[#fffdf8] ring-1 ring-[#e2d2bb]"
            }`}
          >
            {renderNavIcon(
              item,
              "h-7 w-7 transition-transform duration-300 group-hover:scale-105",
            )}
          </div>

          <div className="min-w-0 flex-1 text-left">
            <p
              className={`truncate text-sm ${
                isActive ? "font-semibold text-[#3f3022]" : "font-medium text-[#5f4b36]"
              }`}
            >
              {item.label}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-[#7f6a52]">
              {item.description || item.tooltip}
            </p>
          </div>

          {isEditing ? (
            <GripHorizontal className="h-4 w-4 shrink-0 text-[#8d7354]" />
          ) : isActive ? (
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#a8845c]" />
          ) : null}
        </button>
      </div>
    );
  };

  const renderNeoItem = (item, index, isMobile) => {
    const isActive = currentView === item.id;
    const isBeingDragged = draggedItemIndex === index;
    const isDragTarget =
      dragOverItemIndex === index && draggedItemIndex !== index;

    return (
      <div
        key={item.id}
        draggable={isEditing}
        onDragStart={(event) => handleDragStart(event, index)}
        onDragEnter={(event) => handleDragEnter(event, index)}
        onDragOver={(event) => handleDragOver(event, index)}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        className="relative w-full transition-all duration-300 ease-out"
        style={{ zIndex: isBeingDragged ? 50 : 1 }}
      >
        <button
          type="button"
          onClick={() => handleNavClick(item.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              handleNavClick(item.id);
            }
          }}
          disabled={isEditing}
          data-tutorial-anchor={`nav-${item.id}`}
          className={`group relative flex w-full items-center border-[3px] border-slate-900 transition-all duration-300 outline-none ${
            isMobile
              ? "rounded-full gap-4 px-5 py-3.5"
              : "rounded-[1.25rem] flex-col justify-center px-1.5 py-2.5 xl:py-3 2xl:rounded-[1.5rem] 2xl:px-2 2xl:py-4"
          } ${
            isEditing
              ? "cursor-grab bg-slate-50 shadow-sm hover:scale-105 hover:bg-white active:cursor-grabbing active:scale-95"
              : isActive
                ? "bg-cyan-300 scale-105 shadow-md"
                : "cursor-pointer bg-white shadow-sm hover:-translate-y-1 hover:shadow-md hover:bg-cyan-50"
          } ${
            isBeingDragged ? "rotate-3 scale-110 bg-yellow-100 opacity-95 shadow-xl" : ""
          } ${isDragTarget ? "translate-y-3 opacity-50 scale-95" : ""}`}
          title={item.tooltip}
          aria-label={item.label}
          aria-current={isActive ? "page" : undefined}
        >
          {isEditing && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-hover:text-pink-500">
              <GripHorizontal className="h-5 w-5 stroke-[3]" />
            </div>
          )}

          <div
            className={`flex items-center justify-center transition-transform duration-500 ease-out ${
              isMobile
                ? "h-10 w-10"
                : "mb-1 h-8 w-8 xl:h-9 xl:w-9 2xl:mb-2 2xl:h-10 2xl:w-10 group-hover:scale-110 group-hover:rotate-3"
            }`}
          >
            {renderNavIcon(
              item,
              `transition-all duration-300 ${
                isMobile
                  ? "h-9 w-9"
                  : "h-8 w-8 xl:h-9 xl:w-9 2xl:h-10 2xl:w-10"
              }`,
            )}
          </div>

          {isMobile ? (
            <span
              className={`text-xs font-black uppercase tracking-widest transition-colors ${
                isActive ? "text-slate-900" : "text-slate-700"
              }`}
            >
              {item.label}
            </span>
          ) : (
            <span
              className={`text-center text-[8px] font-black uppercase tracking-widest leading-tight transition-colors 2xl:text-[10px] ${
                isActive ? "text-slate-900" : "text-slate-700"
              }`}
            >
              {item.id === "clube" ? (
                <>
                  Meu
                  <br />
                  Clube
                </>
              ) : (
                item.label
              )}
            </span>
          )}
        </button>
      </div>
    );
  };

  const renderSidebarContent = (isMobile) => {
    if (isMaterialStyle) {
      return (
        <>
          <div
            className={`relative z-10 flex w-full items-center ${
              isMobile
                ? "justify-between px-5 pb-4 pt-5"
                : "justify-between px-4 pb-3 pt-4"
            }`}
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Workspace
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                Navegacao
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleEditMode}
                data-tutorial-anchor="sidebar-organize"
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-colors ${
                  isEditing
                    ? "border-pink-300 bg-pink-100 text-pink-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
                title={isEditing ? "Concluir organizacao" : "Organizar menu"}
                aria-pressed={isEditing}
              >
                {isEditing ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Settings2 className="h-4 w-4" />
                )}
                <span>{isEditing ? "Concluir" : "Organizar"}</span>
              </button>

              {isMobile && (
                <button
                  type="button"
                  onClick={closeMobileSidebar}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-100"
                  aria-label="Fechar menu"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          <nav
            className={`relative z-10 flex w-full flex-1 flex-col overflow-y-auto no-scrollbar ${
              isMobile ? "gap-2 px-4 pb-5" : "gap-1.5 px-3 pb-4"
            }`}
            aria-label="Navegacao"
          >
            {navItems.map((item, index) => renderMaterialItem(item, index, isMobile))}
          </nav>

          {!isMobile && (
            <div className="relative z-10 mt-auto px-4 pb-4 pt-2">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3">
                <img
                  src="images/Secti_Vertical.png"
                  alt="Logo do sistema"
                  className="h-10 w-10 shrink-0 object-contain"
                  loading="lazy"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800">
                    Navegacao personalizavel
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    Arraste os modulos para reorganizar seu fluxo.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      );
    }

    if (isEditorialStyle) {
      return (
        <>
          <div
            className={`relative z-10 flex w-full items-center ${
              isMobile
                ? "justify-between px-5 pb-4 pt-5"
                : "justify-between px-4 pb-3 pt-4"
            }`}
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a7356]">
                Caderno
              </p>
              <p className="mt-1 text-lg font-semibold text-[#3f3022]">
                Navegacao
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleEditMode}
                data-tutorial-anchor="sidebar-organize"
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-medium transition-colors ${
                  isEditing
                    ? "border-[#d6bfa2] bg-[#f2e2cc] text-[#654c30]"
                    : "border-[#dcc9af] bg-[#fffaf0] text-[#5f4b36] hover:bg-[#fbf2e5]"
                }`}
                title={isEditing ? "Concluir organizacao" : "Organizar menu"}
                aria-pressed={isEditing}
              >
                {isEditing ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Settings2 className="h-4 w-4" />
                )}
                <span>{isEditing ? "Concluir" : "Organizar"}</span>
              </button>

              {isMobile && (
                <button
                  type="button"
                  onClick={closeMobileSidebar}
                  className="inline-flex items-center justify-center rounded-lg border border-[#dcc9af] bg-[#fffaf0] p-2 text-[#5f4b36] hover:bg-[#fbf2e5]"
                  aria-label="Fechar menu"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          <nav
            className={`relative z-10 flex w-full flex-1 flex-col overflow-y-auto no-scrollbar ${
              isMobile ? "gap-2.5 px-4 pb-5" : "gap-1.5 px-3 pb-4"
            }`}
            aria-label="Navegacao"
          >
            {navItems.map((item, index) => renderEditorialItem(item, index, isMobile))}
          </nav>

          {!isMobile && (
            <div className="relative z-10 mt-auto px-4 pb-4 pt-2">
              <div className="rounded-xl border border-[#dbc8ad] bg-[#fffaf0] p-3">
                <p className="text-xs font-semibold text-[#4f3d2b]">
                  Edicao em foco
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#78624a]">
                  Reorganize o menu para priorizar o fluxo da sua rotina.
                </p>
              </div>
            </div>
          )}
        </>
      );
    }

    return (
      <>
        <div
          className={`w-full relative z-10 ${
            isMobile
              ? "p-5 pb-4"
              : "px-3 pb-3 pt-1 2xl:px-4 2xl:pb-6 2xl:pt-2"
          } flex items-center ${isMobile ? "justify-between" : "justify-center"}`}
        >
          {isMobile && (
            <div className="inline-flex items-center gap-2 rounded-full border-[3px] border-slate-900 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-sm">
              Navegacao
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleEditMode}
              data-tutorial-anchor="sidebar-organize"
              className={`group inline-flex items-center justify-center rounded-full border-[3px] border-slate-900 ${
                isMobile ? "p-3" : "p-2.5 2xl:p-3"
              } transition-transform duration-300 hover:scale-110 active:scale-95 shadow-sm ${
                isEditing ? "bg-pink-400 scale-105" : "bg-yellow-400"
              }`}
              title={isEditing ? "Concluir organizacao" : "Organizar menu"}
              aria-pressed={isEditing}
            >
              {isEditing ? (
                <Check
                  className={`${
                    isMobile ? "h-5 w-5" : "h-4 w-4 2xl:h-5 2xl:w-5"
                  } stroke-[3] text-white`}
                />
              ) : (
                <Settings2
                  className={`${
                    isMobile ? "h-5 w-5" : "h-4 w-4 2xl:h-5 2xl:w-5"
                  } stroke-[3] text-slate-900 transition-transform group-hover:rotate-90 duration-500`}
                />
              )}
            </button>

            {isMobile && (
              <button
                type="button"
                onClick={closeMobileSidebar}
                className="inline-flex items-center justify-center rounded-full border-[3px] border-slate-900 bg-white p-3 text-slate-900 shadow-sm transition-transform duration-300 hover:scale-110 hover:bg-slate-50 active:scale-95"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5 stroke-[3]" />
              </button>
            )}
          </div>
        </div>

        <nav
          className={`pt-2 relative z-10 flex w-full flex-1 flex-col ${
            isMobile ? "gap-3 px-5 pb-6 pt-2" : "gap-2 px-2 2xl:gap-4 2xl:px-4"
          } overflow-y-auto no-scrollbar`}
          aria-label="Navegacao"
        >
          {navItems.map((item, index) => renderNeoItem(item, index, isMobile))}
        </nav>

        {!isMobile && (
          <div className="mt-auto flex w-full shrink-0 justify-center px-3 pb-3 pt-3 2xl:px-4 2xl:pb-4 2xl:pt-6 relative z-10">
            <img
              src="images/Secti_Vertical.png"
              alt="Logo do sistema"
              className="w-14 object-contain transition-transform duration-500 hover:scale-110 hover:-rotate-2 2xl:w-20"
              loading="lazy"
            />
          </div>
        )}
      </>
    );
  };

  return (
    <>
      {isMobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"
            onClick={closeMobileSidebar}
            aria-hidden="true"
          />

          <aside
            className={`fixed inset-y-0 left-0 z-50 flex h-dvh flex-col lg:hidden animate-in slide-in-from-left duration-300 overflow-hidden ${
              isMaterialStyle
                ? "w-[min(24rem,92vw)] border-r border-slate-200 bg-slate-50 shadow-[0_18px_44px_rgba(15,23,42,0.22)]"
                : isEditorialStyle
                  ? "w-[min(23rem,90vw)] border-r border-[#d8c4a8] bg-[#f7efe3] shadow-[0_18px_40px_rgba(92,74,52,0.18)]"
                  : "w-[min(22rem,88vw)] border-r-[3px] border-slate-900 bg-white shadow-2xl"
            }`}
            aria-label="Menu principal mobile"
          >
            {!isMaterialStyle && !isEditorialStyle && (
              <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(#000 2px, transparent 2px)",
                  backgroundSize: "16px 16px",
                }}
              />
            )}
            {renderSidebarContent(true)}
          </aside>
        </>
      )}

      <aside
        className={`hidden min-h-0 shrink-0 flex-col transition-all duration-300 lg:flex overflow-hidden lg:sticky lg:top-0 lg:self-start lg:h-dvh lg:max-h-dvh ${
          isMaterialStyle
            ? "w-[18.5rem] rounded-[1.4rem] border border-slate-200 bg-slate-50/90 py-3 shadow-[0_14px_36px_rgba(15,23,42,0.1)]"
            : isEditorialStyle
              ? "w-[17.5rem] rounded-[1.3rem] border border-[#d8c4a8] bg-[#f7efe3] py-3 shadow-[0_14px_32px_rgba(92,74,52,0.14)]"
              : "w-24 border-r-[3px] border-slate-900 bg-white py-3 xl:w-28 2xl:w-32 2xl:py-6 relative z-30"
        }`}
        aria-label="Menu principal desktop"
      >
        {!isMaterialStyle && !isEditorialStyle && (
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#000 2px, transparent 2px)",
              backgroundSize: "16px 16px",
            }}
          />
        )}
        {renderSidebarContent(false)}
      </aside>
    </>
  );
}
