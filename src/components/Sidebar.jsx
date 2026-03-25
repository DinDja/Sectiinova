import React from 'react';
import { Map, BookOpen, School, Upload, Lightbulb } from 'lucide-react';
import { HeightRule } from 'docx';

export default function Sidebar({
  currentView,
  setCurrentView,
  setIsModalOpen,
  loggedUser,
  myClubId,
  setViewingClubId,
}) {
  const handleMyClubClick = () => {
    setCurrentView('clube');
    const targetClubId = String(loggedUser?.clube_id || myClubId || '').trim();
    if (targetClubId) setViewingClubId(targetClubId);
  };

  // Itens de navegação (facilita manutenção)
  const navItems = [
    { id: 'Projetos', label: 'Feed de Projetos', icon: Map, tooltip: 'Explorar projetos' },
    { id: 'diario', label: 'Diário de Bordo', icon: BookOpen, tooltip: 'Registros diários' },
    { id: 'inpi', label: 'INPI Patentes', icon: Lightbulb, tooltip: 'Propriedade intelectual' },
  ];

  return (
    <aside
      className="w-24 h-full min-h-screen glass-surface border-r border-white/80 flex flex-col items-center py-6 overflow-y-auto shrink-0 z-30 transition-all duration-300"
      aria-label="Menu principal"
    >
      {/* Navegação principal */}
      <nav className="flex flex-col w-full px-3 space-y-1" aria-label="Navegação">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`
                relative flex flex-col items-center py-3 px-2 w-full rounded-xl
                transition-all duration-200 group
                focus:outline-none focus:ring-2 focus:ring-[#00B5B5] focus:ring-offset-1
                ${isActive
                  ? 'bg-gradient-to-br from-[#00B5B5]/12 to-[#00B5B5]/5 text-[#0F5257] shadow-md border border-[#00B5B5]/15'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 border border-transparent'
                }
              `}
              title={item.tooltip}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-6 h-6 mb-1.5 transition-transform group-hover:scale-105" strokeWidth={1.75} />
              <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#00B5B5] rounded-r-full" />
              )}
            </button>
          );
        })}

        {/* Meu Clube (tratamento especial) */}
        <button
          onClick={handleMyClubClick}
          className={`
            relative flex flex-col items-center py-3 px-2 w-full rounded-xl
            transition-all duration-200 group
            focus:outline-none focus:ring-2 focus:ring-[#00B5B5] focus:ring-offset-1
            ${currentView === 'clube'
              ? 'bg-gradient-to-br from-[#00B5B5]/12 to-[#00B5B5]/5 text-[#0F5257] shadow-md border border-[#00B5B5]/15'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 border border-transparent'
            }
          `}
          title="Gerenciar meu clube"
          aria-label="Meu Clube"
          aria-current={currentView === 'clube' ? 'page' : undefined}
        >
          <School className="w-6 h-6 mb-1.5 transition-transform group-hover:scale-105" strokeWidth={1.75} />
          <span className="text-[11px] font-medium text-center leading-tight">Meu<br />Clube</span>
          {currentView === 'clube' && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#00B5B5] rounded-r-full" />
          )}
        </button>

        {/* Divisor */}
        <div className="my-3 border-t border-slate-200/70 w-12 mx-auto" />
      </nav>

      {/* Perfil do usuário (apenas se logado) */}
    </aside>
  );
}