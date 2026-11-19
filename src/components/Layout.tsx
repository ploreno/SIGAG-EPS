import React, { useState } from 'react';
import {
  ChevronRight,
  FileCheck2,
  FileSpreadsheet,
  Inbox,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  ShieldCheck,
  X,
} from 'lucide-react';
import { NavTab, UserRole } from '../types/bdua';

interface LayoutProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Dashboard KPI', icon: LayoutDashboard },
  { id: 'cargar', label: 'Cargar Resp. ADRES', icon: FileSpreadsheet },
  { id: 'bandeja', label: 'Bandeja 16 Glosas', icon: Inbox },
  { id: 'prevalidador', label: 'Pre-Validador NC/NS', icon: ShieldCheck },
  { id: 'sms', label: 'Campañas SMS', icon: MessageSquareText },
  { id: 'compilar', label: 'Compilar Plano Final', icon: FileCheck2 },
];

export const Layout: React.FC<LayoutProps> = ({
  activeTab,
  onSelectTab,
  role,
  onRoleChange,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      {/* Header fijo superior */}
      <header className="sticky top-0 z-30 h-14 bg-[#18365A] text-white border-b border-[#102642] px-4 lg:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="lg:hidden p-1.5 rounded-md text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
            aria-label={mobileMenuOpen ? 'Cerrar menú lateral' : 'Abrir menú lateral'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-display font-semibold text-sm sm:text-base tracking-tight truncate">
            SIGAG-EPS | Sistema de Aclaración y Gestión de Glosas BDUA (Res. 762/2023)
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="role-selector" className="text-xs sm:text-sm text-slate-200 whitespace-nowrap">
            Rol:
          </label>
          <select
            id="role-selector"
            value={role}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            className="bg-[#102642] text-white text-xs sm:text-sm font-medium border border-white/25 rounded-md px-2.5 py-1.5 focus-visible:outline-2 focus-visible:outline-white cursor-pointer"
          >
            <option value="Coordinador GIAF">Coordinador GIAF</option>
            <option value="Auxiliar de Aseguramiento">Auxiliar de Aseguramiento</option>
          </select>
        </div>
      </header>

      <div className="flex-1 flex min-h-0 relative">
        {/* Overlay móvil */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-20 bg-slate-900/40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar izquierdo */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 top-14 z-20 w-60 shrink-0 bg-[#F1F5F9] border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="py-5 px-3 space-y-1.5" aria-label="Menú principal">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-[#2B6CB0] ${
                    isActive
                      ? 'bg-[#2B6CB0] text-white'
                      : 'text-[#18365A] hover:bg-slate-200/75'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    {isActive ? (
                      <ChevronRight className="w-4 h-4 shrink-0 text-white" />
                    ) : (
                      <Icon className="w-4 h-4 shrink-0 text-[#2B6CB0]" />
                    )}
                    <span className="truncate">{item.label}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-[#18365A]">Entidades habilitadas</div>
            <div className="font-mono text-[11px] text-slate-600">NC: EPS012 · NS: EPSS12</div>
            <div className="text-[11px] text-slate-500">Valle del Cauca (76) · Risaralda (66)</div>
          </div>
        </aside>

        {/* Área de contenido principal */}
        <main className="flex-1 min-w-0 bg-white p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <div className="max-w-[1360px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};
