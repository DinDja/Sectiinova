import React, { useState, useEffect, useCallback } from 'react';
import { GripHorizontal, Check, Settings2 } from 'lucide-react';
import {
  FcGlobe,
  FcOpenedFolder,
  FcWorkflow,
  FcIdea,
  FcComments,
  FcDepartment,
} from 'react-icons/fc';

export default function Sidebar({
  currentView,
  setCurrentView,
  setIsModalOpen,
  loggedUser,
  myClubId,
  setViewingClubId,
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
      iconClass: 'text-sky-600',
    },
    {
      id: 'meusProjetos',
      label: 'Meus Projetos',
      icon: FcOpenedFolder,
      tooltip: 'Projetos que participo',
      iconClass: 'text-emerald-600',
    },
    {
      id: 'trilha',
      label: 'Trilha Pedagógica',
      icon: FcWorkflow,
      iconSrc: '/iconesSidebar/trilha.svg',
      tooltip: 'Planejar trilha CT&I',
      iconClass: 'text-violet-600',
    },
    {
      id: 'inpi',
      label: 'PatentesLab',
      icon: FcIdea,
      tooltip: 'Propriedade intelectual',
      iconClass: 'text-amber-600',
    },
    {
      id: 'forum',
      label: 'POP Digital',
      icon: FcComments,
      iconSrc: '/iconesSidebar/CafeDigital.svg',
      tooltip: 'Fórum de discussão',
      iconClass: 'text-orange-600',
    },
    {
      id: 'clube',
      label: 'Meu Clube',
      icon: FcDepartment,
      iconSrc: '/iconesSidebar/meuclube.svg',
      tooltip: 'Gerenciar meu clube',
      iconClass: 'text-rose-600',
    },
  ];

  const defaultOrder = ['Projetos', 'meusProjetos', 'trilha', 'inpi', 'forum', 'clube'];
  const displayOrder = tempOrder || (sidebarOrder?.length > 0 ? sidebarOrder : defaultOrder);
  
  const navItems = displayOrder
    .map(id => allNavItems.find(item => item.id === id))
    .filter(Boolean);

  const handleMyClubClick = useCallback(() => {
    setCurrentView('clube');
    const targetClubId = String(loggedUser?.clube_id || myClubId || '').trim();
    if (targetClubId) setViewingClubId(targetClubId);
  }, [setCurrentView, loggedUser, myClubId, setViewingClubId]);

  // --- Handlers de Drag & Drop Refinados ---
  const handleDragStart = (e, index) => {
    if (!isEditing) {
      e.preventDefault();
      return;
    }
    setDraggedItemIndex(index);
    if (!tempOrder) setTempOrder([...displayOrder]);
    
    // Configura a imagem fantasma nativa para algo transparente (para usarmos nosso próprio estilo)
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

  const handleDragEnd = async () => {
    setDraggedItemIndex(null);
    setDragOverItemIndex(null);
    
    if (tempOrder) {
      setSidebarOrder(tempOrder);
      if (saveSidebarOrder) {
        await saveSidebarOrder(tempOrder);
      }
    }
    setIsEditing(false); // Sai do modo de edição ao finalizar
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
      className="w-28 sm:w-32 h-full min-h-screen bg-white/80 backdrop-blur-xl border-r border-slate-200/80 flex flex-col items-center py-6 overflow-y-auto shrink-0 z-30 transition-all duration-300 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)]"
      aria-label="Menu principal"
    >
      {/* Botão de Modo de Edição Premium */}
      <div className="w-full px-4 mb-6 flex justify-center">
        <button
          onClick={toggleEditMode}
          className={`
            group flex items-center justify-center p-2.5 rounded-2xl transition-all duration-300
            ${isEditing
              ? 'bg-[#00B5B5]/10 text-[#00B5B5] shadow-inner ring-1 ring-[#00B5B5]/30'
              : 'bg-slate-50 text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200/60 hover:border-slate-300 shadow-sm'
            }
          `}
          title={isEditing ? 'Concluir organização' : 'Organizar menu'}
          aria-pressed={isEditing}
        >
          {isEditing ? (
            <Check className="w-5 h-5 animate-in zoom-in duration-200" strokeWidth={2.5} />
          ) : (
            <Settings2 className="w-5 h-5 transition-transform group-hover:rotate-45 duration-300" strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Navegação principal */}
      <nav className="flex flex-col w-full px-3 space-y-1.5 flex-1" aria-label="Navegação">
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
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className="relative w-full transition-all duration-300 ease-out"
              style={{
                zIndex: isBeingDragged ? 50 : 1,
              }}
            >
              <button
                onClick={handleClick}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
                disabled={isEditing}
                className={`
                  relative flex flex-col items-center py-3.5 px-2 w-full rounded-2xl
                  transition-all duration-300 group
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B5B5] focus-visible:ring-offset-2
                  ${isEditing ? 'cursor-grab active:cursor-grabbing hover:bg-slate-50' : 'cursor-pointer'}
                  ${isBeingDragged 
                    ? 'opacity-60 scale-105 shadow-xl bg-white border border-[#00B5B5]/30 rotate-2' 
                    : isDragTarget 
                        ? 'translate-y-2' 
                        : 'opacity-100 scale-100'
                  }
                  ${!isEditing && isActive
                    ? 'bg-gradient-to-b from-slate-50 to-slate-100/80 shadow-sm border border-slate-200/60'
                    : !isEditing ? 'hover:bg-slate-50 border border-transparent hover:border-slate-100' : ''
                  }
                `}
                title={item.tooltip}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Indicador Ativo Lateral Moderno */}
                {!isEditing && isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-[#00B5B5] rounded-r-full shadow-[2px_0_8px_rgba(0,181,181,0.4)]" />
                )}

                {/* Ícone de Arrastar (Apenas no modo edição) */}
                {isEditing && (
                    <div className="absolute top-2 right-2 text-slate-300 opacity-50 group-hover:opacity-100 group-hover:text-slate-400 transition-opacity">
                        <GripHorizontal className="w-4 h-4" />
                    </div>
                )}

                <span
                  className={`
                    mb-2 inline-flex items-center justify-center rounded-xl p-2.5
                    transition-all duration-300 ease-out
                    ${!isEditing && isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:-translate-y-1'}
                  `}
                >
                  {item.iconSrc ? (
                    <img
                      src={item.iconSrc}
                      alt=""
                      aria-hidden="true"
                      className={`w-9 h-9 sm:w-10 sm:h-10 transition-all duration-300 ${!isEditing && isActive ? 'drop-shadow-md brightness-95' : 'opacity-80 group-hover:opacity-100'}`}
                      loading="lazy"
                    />
                  ) : (
                    <Icon
                      className={`w-9 h-9 sm:w-10 sm:h-10 transition-all duration-300 ${!isEditing && isActive ? 'text-[#0F5257] drop-shadow-md' : `${item.iconClass} opacity-80 group-hover:opacity-100`}`}
                    />
                  )}
                </span>
                
                <span 
                    className={`
                        text-[10px] sm:text-[11px] font-semibold text-center leading-tight transition-colors duration-200
                        ${!isEditing && isActive ? 'text-[#0F5257]' : 'text-slate-500 group-hover:text-slate-800'}
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

        <div className="my-4 border-t border-slate-200/60 w-12 mx-auto rounded-full" />
      </nav>

      {/* Logo SECTI */}
      <div className="mt-auto w-full px-4 pb-2 pt-4 flex justify-center shrink-0">
        <img
          src="/images/Secti_Vertical.png"
          alt="Logomarca da SECTI"
          className="h-16 sm:h-20 object-contain  transition-all duration-500"
          loading="lazy"
        />
      </div>
    </aside>
  );
}