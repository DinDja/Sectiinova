import React, { useState, useCallback } from 'react';
import { GripHorizontal, Check, Settings2 } from 'lucide-react';
import {
  FcGlobe,
  FcOpenedFolder,
  FcWorkflow,
  FcIdea,
  FcComments,
  FcDepartment,
} from 'react-icons/fc';
import { getPrimaryUserClubId } from '../../services/projectService';

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
}) {
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tempOrder, setTempOrder] = useState(null);

  const allNavItems = [
    {
      id: 'Projetos',
      label: 'ColabTec',
      icon: FcGlobe,
      iconSrc: '/iconesSidebar/colabtec.svg',
      tooltip: 'Explorar projetos',
    },
    {
      id: 'meusProjetos',
      label: 'Meus Projetos',
      icon: FcOpenedFolder,
      tooltip: 'Projetos que participo',
    },
    {
      id: 'trilha',
      label: 'Trilha',
      icon: FcWorkflow,
      iconSrc: '/iconesSidebar/trilha.svg',
      tooltip: 'Planejar trilha CT&I',
    },
    {
      id: 'inpi',
      label: 'PatentesLab',
      icon: FcIdea,
      tooltip: 'Propriedade intelectual',
    },
    {
      id: 'forum',
      label: 'POP Café',
      icon: FcComments,
      iconSrc: '/iconesSidebar/CafeDigital.svg',
      tooltip: 'Fórum de discussão',
    },
    {
      id: 'clube',
      label: 'Meu Clube',
      icon: FcDepartment,
      iconSrc: '/iconesSidebar/meuclube.svg',
      tooltip: 'Gerenciar meu clube',
    },
  ];

  const defaultOrder = ['Projetos', 'meusProjetos', 'trilha', 'inpi', 'forum', 'clube'];
  const validNavIds = allNavItems.map((item) => item.id);
  const sanitizedSidebarOrder = Array.isArray(sidebarOrder)
    ? sidebarOrder.filter((id) => validNavIds.includes(id))
    : [];
  const displayOrder = tempOrder || (sanitizedSidebarOrder.length > 0 ? sanitizedSidebarOrder : defaultOrder);
  
  const navItems = displayOrder
    .map((id) => allNavItems.find((item) => item.id === id))
    .filter(Boolean);

  const handleMyClubClick = useCallback(() => {
    setCurrentView('clube');
    const targetClubId = String(myClubId || getPrimaryUserClubId(loggedUser) || '').trim();
    if (!targetClubId) {
      setViewingClubId('');
      if (typeof setSelectedClubId === 'function') {
        setSelectedClubId('');
      }
      return;
    }

    setViewingClubId(targetClubId);
    if (typeof setSelectedClubId === 'function') {
      setSelectedClubId(targetClubId);
    }
  }, [setCurrentView, loggedUser, myClubId, setViewingClubId, setSelectedClubId]);

  // --- Handlers de Drag & Drop ---
  const handleDragStart = (e, index) => {
    if (!isEditing) {
      e.preventDefault();
      return;
    }
    setDraggedItemIndex(index);
    if (!tempOrder) setTempOrder([...displayOrder]);
    
    // Configura a imagem fantasma nativa para algo transparente
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (!isEditing || draggedItemIndex === null) return;
    
    if (dragOverItemIndex !== index) {
      setDragOverItemIndex(index);
    }

    if (draggedItemIndex === index) return;

    const workingOrder = tempOrder || displayOrder;
    const newOrder = [...workingOrder];
    const draggedItemId = newOrder[draggedItemIndex];
    
    newOrder.splice(draggedItemIndex, 1);
    newOrder.splice(index, 0, draggedItemId);
    
    setDraggedItemIndex(index);
    setTempOrder(newOrder);
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    if (!isEditing || draggedItemIndex === null) return;
    setDragOverItemIndex(index);
  };

  const handleDrop = (e) => {
    e.preventDefault();
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
    setIsEditing(!isEditing);
    if (isEditing && tempOrder) {
        setTempOrder(null); // Cancela alterações se apenas clicar para sair
    }
  };

  return (
    <aside
      className="w-28 sm:w-36 h-full min-h-screen bg-[#FAFAFA] border-r-4 border-slate-900 flex flex-col items-center py-6 overflow-y-auto shrink-0 z-30 transition-all duration-300"
      aria-label="Menu principal"
    >
      {/* Botão de Modo de Edição Neo-Brutalista */}
      <div className="w-full px-4 mb-8 flex justify-center">
        <button
          onClick={toggleEditMode}
          className={`
            group flex items-center justify-center p-3 rounded-xl border-2 border-slate-900 transition-all duration-300 outline-none
            ${isEditing
              ? 'bg-teal-400 shadow-none translate-y-0.5'
              : 'bg-yellow-300 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a]'
            }
          `}
          title={isEditing ? 'Concluir organização' : 'Organizar menu'}
          aria-pressed={isEditing}
        >
          {isEditing ? (
            <Check className="w-5 h-5 stroke-[3] text-slate-900 animate-in zoom-in duration-200" />
          ) : (
            <Settings2 className="w-5 h-5 stroke-[3] text-slate-900 transition-transform group-hover:rotate-45 duration-300" />
          )}
        </button>
      </div>

      {/* Navegação principal */}
      <nav className="flex flex-col w-full px-3 sm:px-4 space-y-4 flex-1" aria-label="Navegação">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const isBeingDragged = draggedItemIndex === index;
          const isDragTarget = dragOverItemIndex === index && draggedItemIndex !== index;
          
          const handleClick = () => {
            if (!isEditing) {
              if (item.id === 'clube') handleMyClubClick();
              else setCurrentView(item.id);
            }
          };

          return (
            <div
              key={item.id}
              draggable={isEditing}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              className="relative w-full transition-all duration-300 ease-out"
              style={{ zIndex: isBeingDragged ? 50 : 1 }}
            >
              <button
                onClick={handleClick}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
                disabled={isEditing}
                className={`
                  relative flex flex-col items-center justify-center py-3 px-2 w-full rounded-xl border-2 border-slate-900 transition-all duration-300 group outline-none
                  ${isEditing ? 'cursor-grab active:cursor-grabbing hover:bg-slate-100' : 'cursor-pointer'}
                  ${isBeingDragged 
                    ? 'opacity-90 scale-105 shadow-[4px_4px_0px_0px_#14b8a6] bg-white rotate-3' 
                    : isDragTarget 
                        ? 'translate-y-2' 
                        : 'scale-100'
                  }
                  ${!isEditing && isActive
                    ? 'bg-teal-400 shadow-[4px_4px_0px_0px_#0f172a] -translate-y-1'
                    : !isEditing ? 'bg-white shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#0f172a]' : 'bg-white shadow-[2px_2px_0px_0px_#0f172a]'
                  }
                `}
                title={item.tooltip}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Ícone de Arrastar (Apenas no modo edição) */}
                {isEditing && (
                    <div className="absolute top-1 right-1 text-slate-900 opacity-50 group-hover:opacity-100 transition-opacity">
                        <GripHorizontal className="w-4 h-4 stroke-[3]" />
                    </div>
                )}

                <div className="mb-2 transition-transform duration-300 ease-out group-hover:scale-110 flex items-center justify-center mt-1">
                  {item.iconSrc ? (
                    <img
                      src={item.iconSrc}
                      alt=""
                      aria-hidden="true"
                      className={`w-9 h-9 sm:w-10 sm:h-10 transition-all duration-300 ${!isEditing && isActive ? 'drop-shadow-[2px_2px_0px_#0f172a]' : ''}`}
                      loading="lazy"
                    />
                  ) : (
                    <Icon
                      className={`w-9 h-9 sm:w-10 sm:h-10 transition-all duration-300 ${!isEditing && isActive ? 'drop-shadow-[2px_2px_0px_#0f172a]' : ''}`}
                    />
                  )}
                </div>
                
                <span 
                    className={`
                        text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-center leading-tight transition-colors duration-200
                        ${!isEditing && isActive ? 'text-slate-900' : 'text-slate-900'}
                    `}
                >
                    {item.id === 'clube' ? (
                        <>Meu<br />Clube</>
                    ) : (
                        item.label
                    )}
                </span>
              </button>
            </div>
          );
        })}

      </nav>

      {/* Logo do sistema mantida */}
      <div className="mt-auto w-full px-4 pb-2 pt-4 flex justify-center shrink-0">
        <img
          src="images/Secti_Vertical.png"
          alt="Logo do sistema"
          className="w-16 sm:w-20 object-contain transition-all duration-500 hover:scale-105 drop-shadow-[2px_2px_0px_#0f172a]"
          loading="lazy"
        />
      </div>
    </aside>
  );
}