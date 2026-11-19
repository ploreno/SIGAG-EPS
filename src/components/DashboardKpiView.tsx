import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  Search,
} from 'lucide-react';
import { GLOSAS_CATALOGO } from '../data/bduaCatalog';
import { AuditLogEntry, FileType, GlosaRecord, RecordStatus, UserRole } from '../types/bdua';

interface DashboardKpiViewProps {
  records: GlosaRecord[];
  role: UserRole;
  conformityRate: string;
  auditTrail: AuditLogEntry[];
  onSelectRecord: (record: GlosaRecord) => void;
  onRunPreValidateAndExport: () => void;
}

const PAGE_SIZE = 10;

export const DashboardKpiView: React.FC<DashboardKpiViewProps> = ({
  records,
  role,
  conformityRate,
  auditTrail,
  onSelectRecord,
  onRunPreValidateAndExport,
}) => {
  const [archFilter, setArchFilter] = useState<'TODOS' | FileType>('TODOS');
  const [glosaFilter, setGlosaFilter] = useState<string>('TODAS');
  const [estadoFilter, setEstadoFilter] = useState<'TODOS' | RecordStatus>('TODOS');
  const [auxFilter, setAuxFilter] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [showTraceability, setShowTraceability] = useState(false);

  const totalIngested = records.length;
  const totalListo = useMemo(() => records.filter((r) => r.estado === 'LISTO').length, [records]);
  const totalPendiente = useMemo(
    () => records.filter((r) => r.estado === 'PENDIENTE').length,
    [records]
  );

  const pctListo = totalIngested > 0 ? Math.round((totalListo / totalIngested) * 100) : 0;
  const pctPendiente = totalIngested > 0 ? Math.round((totalPendiente / totalIngested) * 100) : 0;

  const availableGlosas = useMemo(() => {
    const set = new Set<string>(GLOSAS_CATALOGO.map((g) => g.codigo));
    records.forEach((r) => set.add(r.GLOSA));
    return Array.from(set).sort();
  }, [records]);

  const availableAuxiliares = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.auxiliarAsignado) set.add(r.auxiliarAsignado);
    });
    return Array.from(set).sort();
  }, [records]);

  const filteredRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return records.filter((r) => {
      if (archFilter !== 'TODOS' && r.arch !== archFilter) return false;
      if (glosaFilter !== 'TODAS' && r.GLOSA !== glosaFilter) return false;
      if (estadoFilter !== 'TODOS' && r.estado !== estadoFilter) return false;
      if (auxFilter !== 'TODOS' && (r.auxiliarAsignado || 'Motor Algorítmico') !== auxFilter)
        return false;
      if (q) {
        const hay = `${r.id} ${r.NRO_DCTO_AF} ${r.PRIMER_NOMB} ${r.PRIMER_APLL} ${r.GLOSA} ${r.diagnosticoAlgoritmico} ${r.accionSigag} ${r.auxiliarAsignado || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [records, archFilter, glosaFilter, estadoFilter, auxFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, safePage]);

  const handleFilterChange = (setter: () => void) => {
    setter();
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* 4 Tarjetas KPI */}
      <section aria-label="Indicadores principales">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border-2 border-[#18365A] px-5 py-5 text-center">
            <div className="text-xs font-medium text-slate-600">Glosas Ingestadas</div>
            <div className="mt-2 font-display text-2xl font-bold text-[#18365A] tabular-nums">
              {totalIngested.toLocaleString('es-CO')}
            </div>
          </div>

          <div className="bg-white rounded-xl border-2 border-[#1E6B52] px-5 py-5 text-center">
            <div className="text-xs font-medium text-slate-600">Subsanadas Auto.</div>
            <div className="mt-2 font-display text-2xl font-bold text-[#1E6B52] tabular-nums">
              {totalListo.toLocaleString('es-CO')} ({pctListo}%)
            </div>
          </div>

          <div className="bg-white rounded-xl border-2 border-[#C06C1B] px-5 py-5 text-center">
            <div className="text-xs font-medium text-slate-600">En Gestión Auxiliar</div>
            <div className="mt-2 font-display text-2xl font-bold text-[#C06C1B] tabular-nums">
              {totalPendiente.toLocaleString('es-CO')} ({pctPendiente}%)
            </div>
          </div>

          <div className="bg-white rounded-xl border-2 border-[#2B6CB0] px-5 py-5 text-center">
            <div className="text-xs font-medium text-slate-600">Tasa Conformidad</div>
            <div className="mt-2 font-display text-2xl font-bold text-[#2B6CB0] tabular-nums">
              {conformityRate}%
            </div>
          </div>
        </div>
      </section>

      {/* Filtros y Tabla Central */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro Archivo NC/NS */}
            <div className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 p-0.5">
              {(['TODOS', 'NC', 'NS'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleFilterChange(() => setArchFilter(opt))}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                    archFilter === opt
                      ? 'bg-[#2B6CB0] text-white'
                      : 'text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  {opt === 'TODOS' ? 'NC / NS' : opt}
                </button>
              ))}
            </div>

            {/* Filtro Código de Glosa */}
            <select
              aria-label="Filtrar por código de glosa"
              value={glosaFilter}
              onChange={(e) => handleFilterChange(() => setGlosaFilter(e.target.value))}
              className="border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white"
            >
              <option value="TODAS">Glosa: Todas (16)</option>
              {availableGlosas.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            {/* Filtro Estado */}
            <select
              aria-label="Filtrar por estado"
              value={estadoFilter}
              onChange={(e) =>
                handleFilterChange(() => setEstadoFilter(e.target.value as 'TODOS' | RecordStatus))
              }
              className="border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white"
            >
              <option value="TODOS">Estado: Todos</option>
              <option value="LISTO">LISTO</option>
              <option value="PENDIENTE">PENDIENTE</option>
              <option value="REVISIÓN">REVISIÓN</option>
            </select>

            {/* Filtro Derivación Auxiliar (RF-04) */}
            <select
              aria-label="Filtrar por responsable operativo"
              value={auxFilter}
              onChange={(e) => handleFilterChange(() => setAuxFilter(e.target.value))}
              className="border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white"
            >
              <option value="TODOS">Responsable: Todos</option>
              {availableAuxiliares.map((aux) => (
                <option key={aux} value={aux}>
                  {aux}
                </option>
              ))}
            </select>

            {role === 'Auxiliar de Aseguramiento' && (
              <button
                type="button"
                onClick={() =>
                  handleFilterChange(() =>
                    setEstadoFilter(estadoFilter === 'PENDIENTE' ? 'TODOS' : 'PENDIENTE')
                  )
                }
                className={`px-2.5 py-1.5 rounded-md border text-xs font-medium cursor-pointer whitespace-nowrap ${
                  estadoFilter === 'PENDIENTE'
                    ? 'border-[#C06C1B] bg-amber-50 text-[#C06C1B]'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Mi bandeja auxiliar
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleFilterChange(() => setSearchTerm(e.target.value))}
                placeholder="Buscar ID, doc. o glosa..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-md text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#2B6CB0]"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowTraceability((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer whitespace-nowrap ${
                showTraceability
                  ? 'border-[#18365A] bg-[#18365A] text-white'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Trazabilidad ({auditTrail.length})
            </button>
          </div>
        </div>

        {/* Tabla Central */}
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#E2E8F0] text-slate-800 text-xs font-semibold">
                  <th className="py-3 px-4 whitespace-nowrap">ID Reg.</th>
                  <th className="py-3 px-4 whitespace-nowrap">Arch.</th>
                  <th className="py-3 px-4 whitespace-nowrap">Glosa</th>
                  <th className="py-3 px-4 whitespace-nowrap">Diagnóstico Algorítmico</th>
                  <th className="py-3 px-4 whitespace-nowrap">Acción SIGAG-EPS</th>
                  <th className="py-3 px-4 whitespace-nowrap">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                      No se encontraron registros con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => onSelectRecord(row)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-[#18365A] whitespace-nowrap tabular-nums">
                        {row.id}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                        {row.arch}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-medium text-slate-800 whitespace-nowrap">
                        {row.GLOSA}
                      </td>
                      <td className="py-3 px-4 text-xs sm:text-sm text-slate-700">
                        {row.diagnosticoAlgoritmico}
                      </td>
                      <td className="py-3 px-4 text-xs sm:text-sm text-slate-700">
                        <span>{row.accionSigag}</span>
                        {row.estado !== 'LISTO' && row.auxiliarAsignado && (
                          <span className="block text-[11px] text-slate-500">
                            {row.auxiliarAsignado}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            row.estado === 'LISTO'
                              ? 'text-[#1E6B52]'
                              : row.estado === 'PENDIENTE'
                                ? 'text-[#C06C1B]'
                                : 'text-[#2B6CB0]'
                          }`}
                        >
                          {row.estado === 'LISTO' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {row.estado === 'PENDIENTE' && <Clock className="w-3.5 h-3.5" />}
                          {row.estado === 'REVISIÓN' && <AlertTriangle className="w-3.5 h-3.5" />}
                          {row.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span className="tabular-nums">
              Mostrando {filteredRecords.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filteredRecords.length)} de{' '}
              {filteredRecords.length.toLocaleString('es-CO')} registros · Haga clic en una fila para gestionar
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                aria-label="Página anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono tabular-nums">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                aria-label="Página siguiente"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Bitácora de Trazabilidad en Tiempo Real (RF-07) */}
        {showTraceability && (
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <div className="bg-[#E2E8F0] px-4 py-2.5 text-xs font-semibold text-slate-800">
              Trazabilidad de Operaciones en Tiempo Real (RF-07)
            </div>
            <div className="divide-y divide-slate-200 max-h-56 overflow-y-auto text-xs">
              {auditTrail.map((entry) => (
                <div
                  key={entry.id}
                  className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-500 tabular-nums">{entry.hora}</span>
                    <span className="font-semibold text-[#18365A]">{entry.modulo}</span>
                    <span className="text-slate-700">{entry.accion}</span>
                    <span className="text-slate-500">· {entry.detalle}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">{entry.rol}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Pie de página de acción */}
      <footer className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <span className="text-sm text-slate-500">
          Módulo Central de Gestión y Pre-validación
        </span>
        <button
          type="button"
          onClick={onRunPreValidateAndExport}
          className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-lg bg-[#1E6B52] text-white text-sm font-semibold hover:bg-[#16533f] transition-colors cursor-pointer whitespace-nowrap"
        >
          <span>Pre-Validar y Exportar .NC/.NS</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </footer>
    </div>
  );
};
