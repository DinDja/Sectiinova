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
    {
      id: "inpi",
      label: "PatentesLab",
      icon: FcIdea,
      tooltip: "Propriedade intelectual",
    },
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
      <div className={`w-full ${isMobile ? "p-4 pb-3" : "px-4 pb-6"} flex items-center ${isMobile ? "justify-between" : "justify-center"}`}>
        {isMobile && (
          <div className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
            Navegação
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleEditMode}
            className={`group inline-flex items-center justify-center rounded-xl border-2 border-slate-900 p-2.5 transition-all ${
              isEditing
                ? "translate-y-0.5 bg-teal-400 shadow-none"
                : "bg-yellow-300 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a]"
            }`}
            title={isEditing ? "Concluir organização" : "Organizar menu"}
            aria-pressed={isEditing}
          >
            {isEditing ? (
              <Check className="h-5 w-5 stroke-[3] text-slate-900" />
            ) : (
              <Settings2 className="h-5 w-5 stroke-[3] text-slate-900 transition-transform group-hover:rotate-45 duration-300" />
            )}
          </button>

          {isMobile && (
            <button
              type="button"
              onClick={closeMobileSidebar}
              className="inline-flex items-center justify-center rounded-xl border-2 border-slate-900 bg-white p-2.5 text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a]"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5 stroke-[3]" />
            </button>
          )}
        </div>
      </div>

      <nav
        className={`pt-2 flex w-full flex-1 flex-col ${isMobile ? "gap-2 px-4 pb-6 pt-1" : "gap-3 px-3 sm:px-4"} overflow-y-auto`}
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
                className={`group relative flex w-full items-center rounded-xl border-2 border-slate-900 transition-all duration-300 outline-none ${
                  isMobile
                    ? "gap-3 px-4 py-3"
                    : "flex-col justify-center px-2 py-3"
                } ${
                  isEditing
                    ? "cursor-grab bg-white shadow-[2px_2px_0px_0px_#0f172a] hover:bg-slate-100 active:cursor-grabbing"
                    : isActive
                      ? "bg-teal-400 -translate-y-1 shadow-[4px_4px_0px_0px_#0f172a]"
                      : "cursor-pointer bg-white shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#0f172a]"
                } ${
                  isBeingDragged
                    ? "rotate-3 scale-105 bg-white opacity-90 shadow-[4px_4px_0px_0px_#14b8a6]"
                    : ""
                } ${
                  isDragTarget ? "translate-y-2" : ""
                }`}
                title={item.tooltip}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                {isEditing && (
                  <div className="absolute right-2 top-2 text-slate-900 opacity-50 transition-opacity group-hover:opacity-100">
                    <GripHorizontal className="h-4 w-4 stroke-[3]" />
                  </div>
                )}

                <div
                  className={`flex items-center justify-center transition-transform duration-300 ease-out ${
                    isMobile ? "h-10 w-10" : "mb-2 mt-1 h-10 w-10 group-hover:scale-110"
                  }`}
                >
                  {item.iconSrc ? (
                    <img
                      src={item.iconSrc}
                      alt=""
                      aria-hidden="true"
                      className={`transition-all duration-300 ${
                        isMobile ? "h-9 w-9" : "h-9 w-9 sm:h-10 sm:w-10"
                      } ${!isEditing && isActive ? "drop-shadow-[2px_2px_0px_#0f172a]" : ""}`}
                      loading="lazy"
                    />
                  ) : (
                    <Icon
                      className={`transition-all duration-300 ${
                        isMobile ? "h-9 w-9" : "h-9 w-9 sm:h-10 sm:w-10"
                      } ${!isEditing && isActive ? "drop-shadow-[2px_2px_0px_#0f172a]" : ""}`}
                    />
                  )}
                </div>

                {isMobile ? (
                  <span className="text-xs font-black uppercase tracking-widest text-slate-900">
                    {item.label}
                  </span>
                ) : (
                  <span className="text-center text-[9px] sm:text-[10px] font-black uppercase tracking-widest leading-tight text-slate-900">
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
        })}
      </nav>

      {!isMobile && (
        <div className="mt-auto flex w-full shrink-0 justify-center px-4 pb-2 pt-4">
          <img
            src="images/Secti_Vertical.png"
            alt="Logo do sistema"
            className="w-16 object-contain transition-all duration-500 hover:scale-105 sm:w-20 drop-shadow-[2px_2px_0px_#0f172a]"
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
            className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
            onClick={closeMobileSidebar}
            aria-hidden="true"
          />

          <aside
            className="fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(20rem,88vw)] flex-col border-r-4 border-slate-900 bg-[#FAFAFA] shadow-[8px_0px_0px_0px_#0f172a] lg:hidden"
            aria-label="Menu principal mobile"
          >
            {renderSidebarContent(true)}
          </aside>
        </>
      )}

      <aside
        className="hidden h-full min-h-screen w-28 shrink-0 flex-col border-r-4 border-slate-900 bg-[#FAFAFA] py-6 transition-all duration-300 lg:flex xl:w-32"
        aria-label="Menu principal desktop"
      >
        {renderSidebarContent(false)}
      </aside>
    </>
  );
}
