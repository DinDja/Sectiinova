import React, { useState, useEffect } from 'react';
import { GripHorizontal } from 'lucide-react';
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
  const [draggedItem, setDraggedItem] = useState(null);
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
      label: 'Café Digital',
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

  // Ordenar itens: usar tempOrder durante drag, senão usar sidebarOrder salva
  const defaultOrder = ['Projetos', 'meusProjetos', 'trilha', 'inpi', 'forum', 'clube'];
  const displayOrder = tempOrder || (sidebarOrder && sidebarOrder.length > 0 ? sidebarOrder : defaultOrder);
  const navItems = displayOrder
    .map(id => allNavItems.find(item => item.id === id))
    .filter(Boolean);

  const handleMyClubClick = () => {
    setCurrentView('clube');
    const targetClubId = String(loggedUser?.clube_id || myClubId || '').trim();
    if (targetClubId) setViewingClubId(targetClubId);
  };

  const handleDragStart = (e, index) => {
    if (!isEditing) return;
    setDraggedItem(index);
    // Inicializar tempOrder com a ordem atual se ainda não existe
    if (!tempOrder) {
      setTempOrder([...displayOrder]);
    }
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    if (!isEditing || draggedItem === null) return;
    e.preventDefault();
    
    if (draggedItem === index) return;

    const workingOrder = tempOrder || displayOrder;
    const newOrder = [...workingOrder];
    const draggedItemId = newOrder[draggedItem];
    
    newOrder.splice(draggedItem, 1);
    newOrder.splice(index, 0, draggedItemId);
    
    setDraggedItem(index);
    setTempOrder(newOrder);
  };

  const handleDragEnd = async () => {
    setDraggedItem(null);
    
    // Salvar a ordem final
    if (tempOrder) {
      setSidebarOrder(tempOrder);
      if (saveSidebarOrder) {
        await saveSidebarOrder(tempOrder);
      }
    }
    
    setTempOrder(null);
  };

  return (
    <aside
      className="w-32 h-full min-h-screen glass-surface flex flex-col items-center py-6 overflow-y-auto shrink-0 z-30 transition-all duration-300"
      aria-label="Menu principal"
    >
      {/* Botão de editar ordem */}
      <button
        onClick={() => setIsEditing(!isEditing)}
        className={`
          mb-3 p-3 rounded-lg transition-all duration-200
          ${isEditing
            ? 'bg-[#00B5B5]/20 text-[#0F5257] border border-[#00B5B5]'
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 border border-transparent'
          }
        `}
        title={isEditing ? 'Salvo automaticamente' : 'Reordenar itens'}
      >
        <GripHorizontal className="w-7 h-7" strokeWidth={1.75} />
      </button>

      {/* Navegação principal */}
      <nav className="flex flex-col w-full px-3 space-y-1" aria-label="Navegação">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          const handleClick = () => {
            if (!isEditing) {
              console.log('Sidebar click:', item.id);
              if (item.id === 'clube') {
                handleMyClubClick();
              } else {
                setCurrentView(item.id);
              }
            }
          };

          return (
            <button
              key={item.id}
              draggable={isEditing}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onClick={handleClick}
              className={`
                relative flex flex-col items-center py-3 px-2 w-full rounded-xl
                transition-all duration-200 group
                focus:outline-none focus:ring-2 focus:ring-[#00B5B5] focus:ring-offset-1
                ${isEditing ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                ${draggedItem === index ? 'opacity-50' : 'opacity-100'}
                ${isActive
                  ? 'bg-gradient-to-br from-[#00B5B5]/12 to-[#00B5B5]/5 text-[#0F5257] shadow-md border border-[#00B5B5]/15'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 border border-transparent'
                }
              `}
              title={item.tooltip}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className={`
                  mb-1.5 inline-flex items-center justify-center rounded-lg p-3.5
                  transition-transform group-hover:scale-110
                  ${isActive ? 'bg-white/85 shadow-sm' : ''}
                `}
              >
                {item.iconSrc ? (
                  <img
                    src={item.iconSrc}
                    alt={item.label}
                    className={`w-10 h-10 ${isActive ? 'brightness-90 saturate-75' : ''}`}
                    loading="lazy"
                  />
                ) : (
                  <Icon
                    className={`w-10 h-10 ${isActive ? 'text-[#0F5257]' : item.iconClass}`}
                  />
                )}
              </span>
              {item.id === 'clube' ? (
                <span className="text-[11px] font-medium text-center leading-tight">Meu<br />Clube</span>
              ) : (
                <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
              )}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#00B5B5] rounded-r-full" />
              )}
            </button>
          );
        })}

        {/* Divisor */}
        <div className="my-3 border-t border-slate-200/70 w-12 mx-auto" />
      </nav>

      {/* Perfil do usuário (apenas se logado) */}

      {/* Logo SECTI no final da sidebar */}
      <div className="mt-auto w-full px-2 pb-4 flex justify-center">
        <img
          src="/images/Secti_Vertical.png"
          alt="SECTI"
          className="h-20 object-contain opacity-90 hover:opacity-100 transition-opacity duration-300"
          loading="lazy"
        />
      </div>
    </aside>
  );
}