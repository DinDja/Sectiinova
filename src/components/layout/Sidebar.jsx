import React, { useState, useCallback, useEffect } from "react";
import { GripHorizontal, Check, Settings2, X } from "lucide-react";
import {
  FcGlobe,
  FcOpenedFolder,
  FcWorkflow,
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
}) {
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tempOrder, setTempOrder] = useState(null);

  const allNavItems = [
    {
      id: "Projetos",
      label: "ColabTec",
      icon: FcGlobe,
      iconSrc: "/iconesSidebar/colabtec.svg",
      tooltip: "Explorar projetos",
    },
    {
      id: "meusProjetos",
      label: "Meus Projetos",
      icon: FcOpenedFolder,
      tooltip: "Projetos que participo",
    },
    {
      id: "trilha",
      label: "Trilha",
      icon: FcWorkflow,
      iconSrc: "/iconesSidebar/trilha.svg",
      tooltip: "Planejar trilha CT&I",
    },
    // {
    //   id: "inpi",
    //   label: "PatentesLab",
    //   icon: FcIdea,
    //   tooltip: "Propriedade intelectual",
    // },
    {
      id: "forum",
      label: "POP Café",
      icon: FcComments,
      iconSrc: "/iconesSidebar/CafeDigital.svg",
      tooltip: "Fórum de discussão",
    },
    {
      id: "clube",
      label: "Meu Clube",
      icon: FcDepartment,
      iconSrc: "/iconesSidebar/meuclube.svg",
      tooltip: "Gerenciar meu clube",
    },
  ];

  const defaultOrder = [
    "Projetos",
    "meusProjetos",
    "trilha",
    "inpi",
    "forum",
    "clube",
  ];
  const validNavIds = allNavItems.map((item) => item.id);
  const sanitizedSidebarOrder = Array.isArray(sidebarOrder)
    ? sidebarOrder.filter((id) => validNavIds.includes(id))
    : [];
  const displayOrder =
    tempOrder || (sanitizedSidebarOrder.length > 0 ? sanitizedSidebarOrder : defaultOrder);

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
    setDraggedItemIndex(null);
    setDragOverItemIndex(null);

    if (tempOrder) {
      setSidebarOrder(tempOrder);
      if (saveSidebarOrder) {
        await saveSidebarOrder(tempOrder);
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

  const renderSidebarContent = (isMobile) => (
    <>
      <div className={`w-full relative z-10 ${isMobile ? "p-5 pb-4" : "px-3 pb-3 pt-1 2xl:px-4 2xl:pb-6 2xl:pt-2"} flex items-center ${isMobile ? "justify-between" : "justify-center"}`}>
        {isMobile && (
          <div className="inline-flex items-center gap-2 rounded-full border-[3px] border-slate-900 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-sm">
            Navegação
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleEditMode}
            className={`group inline-flex items-center justify-center rounded-full border-[3px] border-slate-900 ${isMobile ? "p-3" : "p-2.5 2xl:p-3"} transition-transform duration-300 hover:scale-110 active:scale-95 shadow-sm ${
              isEditing
                ? "bg-pink-400 scale-105"
                : "bg-yellow-400"
            }`}
            title={isEditing ? "Concluir organização" : "Organizar menu"}
            aria-pressed={isEditing}
          >
            {isEditing ? (
              <Check className={`${isMobile ? "h-5 w-5" : "h-4 w-4 2xl:h-5 2xl:w-5"} stroke-[3] text-white`} />
            ) : (
              <Settings2 className={`${isMobile ? "h-5 w-5" : "h-4 w-4 2xl:h-5 2xl:w-5"} stroke-[3] text-slate-900 transition-transform group-hover:rotate-90 duration-500`} />
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
        className={`pt-2 relative z-10 flex w-full flex-1 flex-col ${isMobile ? "gap-3 px-5 pb-6 pt-2" : "gap-2 px-2 2xl:gap-4 2xl:px-4"} overflow-y-auto no-scrollbar`}
        aria-label="Navegação"
      >
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const isBeingDragged = draggedItemIndex === index;
          const isDragTarget = dragOverItemIndex === index && draggedItemIndex !== index;

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
                  isBeingDragged
                    ? "rotate-3 scale-110 bg-yellow-100 opacity-95 shadow-xl"
                    : ""
                } ${
                  isDragTarget ? "translate-y-3 opacity-50 scale-95" : ""
                }`}
                title={item.tooltip}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Ícone de arraste HQ Mode */}
                {isEditing && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-hover:text-pink-500">
                    <GripHorizontal className="h-5 w-5 stroke-[3]" />
                  </div>
                )}

                <div
                  className={`flex items-center justify-center transition-transform duration-500 ease-out ${
                    isMobile ? "h-10 w-10" : "mb-1 h-8 w-8 xl:h-9 xl:w-9 2xl:mb-2 2xl:h-10 2xl:w-10 group-hover:scale-110 group-hover:rotate-3"
                  }`}
                >
                  {item.iconSrc ? (
                    <img
                      src={item.iconSrc}
                      alt=""
                      aria-hidden="true"
                      className={`transition-all duration-300 ${
                        isMobile ? "h-9 w-9" : "h-8 w-8 xl:h-9 xl:w-9 2xl:h-10 2xl:w-10"
                      }`}
                      loading="lazy"
                    />
                  ) : (
                    <Icon
                      className={`transition-all duration-300 ${
                        isMobile ? "h-9 w-9" : "h-8 w-8 xl:h-9 xl:w-9 2xl:h-10 2xl:w-10"
                      }`}
                    />
                  )}
                </div>

                {isMobile ? (
                  <span className={`text-xs font-black uppercase tracking-widest transition-colors ${isActive ? "text-slate-900" : "text-slate-700"}`}>
                    {item.label}
                  </span>
                ) : (
                  <span className={`text-center text-[8px] 2xl:text-[10px] font-black uppercase tracking-widest leading-tight transition-colors ${isActive ? "text-slate-900" : "text-slate-700"}`}>
                    {item.id === "clube" ? (
                      <>Meu<br />Clube</>
                    ) : (
                      item.label
                    )}
                  </span>
                )}
              </button>
            </div>
          );
        })}
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
            className="fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(22rem,88vw)] flex-col border-r-[3px] border-slate-900 bg-white shadow-2xl lg:hidden animate-in slide-in-from-left duration-300 overflow-hidden"
            aria-label="Menu principal mobile"
          >
            {/* Halftone Pattern Mobile */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '16px 16px' }}></div>
            {renderSidebarContent(true)}
          </aside>
        </>
      )}

      <aside
        className="hidden h-full min-h-0 w-24 shrink-0 flex-col border-r-[3px] border-slate-900 bg-white py-3 transition-all duration-300 lg:flex xl:w-28 2xl:w-32 2xl:py-6 relative z-30 overflow-hidden"
        aria-label="Menu principal desktop"
      >
        {/* Halftone Pattern Desktop */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '16px 16px' }}></div>
        {renderSidebarContent(false)}
      </aside>
    </>
  );
}
