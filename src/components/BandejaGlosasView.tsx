import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  RefreshCw,
  Save,
  SlidersHorizontal,
  UserCheck,
} from 'lucide-react';
import { DANE_MUNICIPIOS } from '../data/bduaCatalog';
import { GlosaCatalogItem, GlosaRecord, PoblacionRecord, UserRole } from '../types/bdua';

interface BandejaGlosasViewProps {
  records: GlosaRecord[];
  poblacion: PoblacionRecord[];
  rulesCatalog: GlosaCatalogItem[];
  role: UserRole;
  onUpdateRule: (updatedRule: GlosaCatalogItem) => void;
  onSelectRecord: (record: GlosaRecord) => void;
  onBatchCrossMatch: () => number;
  onRouteAuxiliaries: () => number;
}

export const BandejaGlosasView: React.FC<BandejaGlosasViewProps> = ({
  records,
  poblacion,
  rulesCatalog,
  role,
  onUpdateRule,
  onSelectRecord,
  onBatchCrossMatch,
  onRouteAuxiliaries,
}) => {
  const [selectedGlosa, setSelectedGlosa] = useState<string>('GN0258');
  const [editingRules, setEditingRules] = useState(false);
  const [draftRule, setDraftRule] = useState<GlosaCatalogItem | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const glosaSummaries = useMemo(() => {
    return rulesCatalog.map((cat) => {
      const matched = records.filter((r) => r.GLOSA === cat.codigo);
      const listo = matched.filter((r) => r.estado === 'LISTO').length;
      const pendiente = matched.filter((r) => r.estado === 'PENDIENTE').length;
      const revision = matched.filter((r) => r.estado === 'REVISIÓN').length;
      return {
        ...cat,
        total: matched.length,
        listo,
        pendiente,
        revision,
      };
    });
  }, [records, rulesCatalog]);

  const activeCatalog =
    rulesCatalog.find((g) => g.codigo === selectedGlosa) || rulesCatalog[0];

  useEffect(() => {
    setDraftRule({ ...activeCatalog });
    setEditingRules(false);
  }, [activeCatalog]);

  const activeRecords = useMemo(
    () => records.filter((r) => r.GLOSA === selectedGlosa),
    [records, selectedGlosa]
  );

  const pobByDoc = useMemo(() => {
    const map = new Map<string, PoblacionRecord>();
    poblacion.forEach((p) => {
      map.set(`${p.TP_DCTO_AF}-${p.NRO_DCTO_AF}`, p);
      map.set(p.NRO_DCTO_AF, p);
    });
    return map;
  }, [poblacion]);

  const handleRunCrossMatch = () => {
    const updatedCount = onBatchCrossMatch();
    setStatusNotice(
      updatedCount > 0
        ? `Cruce automático ejecutado contra POBLACION (${poblacion.length} registros): ${updatedCount} glosas actualizadas a LISTO.`
        : 'Todos los registros elegibles para cruce automático ya se encuentran sincronizados con POBLACION.'
    );
  };

  const handleRunRouting = () => {
    const routed = onRouteAuxiliaries();
    setStatusNotice(
      `Derivación operativa por rol ejecutada (RF-04): ${routed.toLocaleString('es-CO')} registros asignados a bandejas territoriales y especializadas.`
    );
  };

  const handleSaveRule = () => {
    if (!draftRule) return;
    onUpdateRule(draftRule);
    setEditingRules(false);
    setStatusNotice(
      `Regla de negocio y ventana de plazo (${draftRule.ventanaPlazoDias} días) actualizadas para ${draftRule.codigo}.`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-[#18365A]">
            Bandeja 16 Glosas y Parametrización de Reglas (Res. 762/2023)
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Consulta y parametrización de ventanas de plazo (RF-02), derivación operativa por rol (RF-04) y cruce maestro POBLACION.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleRunRouting}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#2B6CB0] text-[#2B6CB0] text-xs sm:text-sm font-semibold hover:bg-blue-50 cursor-pointer whitespace-nowrap"
          >
            <UserCheck className="w-4 h-4" />
            Enrutar Auxiliares (RF-04)
          </button>
          <button
            type="button"
            onClick={handleRunCrossMatch}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1E6B52] text-white text-xs sm:text-sm font-semibold hover:bg-[#16533f] cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4" />
            Cruce Masivo POBLACION
          </button>
        </div>
      </div>

      {/* Regla de Negocio Destacada */}
      <div className="rounded-lg border border-[#2B6CB0]/40 bg-blue-50/50 px-4 py-3 text-xs sm:text-sm text-[#18365A] flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-semibold">Regla especial GN0258 y GN0297:</span> Aplican exclusivamente a régimen subsidiado{' '}
          <span className="font-mono font-semibold">NS (EPSS12)</span> en novedades{' '}
          <span className="font-mono font-semibold">N21, N31 y N32</span>.
        </div>
        <span className="font-mono text-xs text-[#2B6CB0]">
          DANE habilitados: 76 (Valle) · 66 (Risaralda)
        </span>
      </div>

      {statusNotice && (
        <div className="rounded-lg border border-[#1E6B52] bg-emerald-50/70 px-4 py-3 text-sm text-[#1E6B52] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Lista de 16 Glosas */}
        <div className="lg:col-span-5 border border-slate-200 rounded-lg overflow-hidden bg-white">
          <div className="bg-[#E2E8F0] px-4 py-2.5 text-xs font-semibold text-slate-800 flex items-center justify-between">
            <span>Catálogo de 16 Glosas</span>
            <span>Registros</span>
          </div>
          <div className="divide-y divide-slate-200 max-h-[640px] overflow-y-auto">
            {glosaSummaries.map((item) => {
              const isSelected = item.codigo === selectedGlosa;
              return (
                <button
                  key={item.codigo}
                  type="button"
                  onClick={() => setSelectedGlosa(item.codigo)}
                  className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
                    isSelected ? 'bg-[#2B6CB0] text-white' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold">
                      {item.codigo}
                      {item.esDeterministica ? ' · Determinística' : ''}
                    </span>
                    <span
                      className={`font-mono text-xs font-semibold tabular-nums ${
                        isSelected ? 'text-white' : 'text-[#18365A]'
                      }`}
                    >
                      {item.total.toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div
                    className={`text-xs mt-1 line-clamp-1 ${
                      isSelected ? 'text-blue-50' : 'text-slate-600'
                    }`}
                  >
                    {item.nombre}
                  </div>
                  <div
                    className={`mt-1.5 flex flex-wrap items-center gap-2 text-[11px] font-mono tabular-nums ${
                      isSelected ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    <span>{item.regimenAplicable}</span>
                    <span aria-hidden="true">·</span>
                    <span>Plazo: {item.ventanaPlazoDias}d</span>
                    <span aria-hidden="true">·</span>
                    <span>Listo: {item.listo}</span>
                    <span aria-hidden="true">·</span>
                    <span>Pend: {item.pendiente}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detalle, Parametrización RF-02 y tabla de registros */}
        <div className="lg:col-span-7 space-y-4">
          <div className="border border-slate-200 rounded-lg p-5 bg-white space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-sm font-bold text-[#18365A]">
                  {activeCatalog.codigo}
                </span>
                <span className="text-slate-300">/</span>
                <span className="text-xs font-medium text-slate-600">
                  Archivo {activeCatalog.regimenAplicable} · Novedades:{' '}
                  <span className="font-mono">{activeCatalog.novedadesFrecuentes.join(', ')}</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {role === 'Coordinador GIAF' ? (
                  <button
                    type="button"
                    onClick={() => setEditingRules((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 text-xs font-medium text-[#18365A] hover:bg-slate-50 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    {editingRules ? 'Cancelar edición' : 'Parametrizar regla (RF-02)'}
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500">
                    Modo consulta (solo Coordinador GIAF parametriza)
                  </span>
                )}
              </div>
            </div>

            <h2 className="font-display text-base font-semibold text-slate-900">
              {activeCatalog.nombre}
            </h2>

            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-700">Norma ADRES:</span>{' '}
              {activeCatalog.descripcionNormativa}
            </p>

            {!editingRules ? (
              <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5 space-y-2 text-xs text-slate-700">
                <div>
                  <span className="font-semibold text-[#18365A]">Regla de Negocio SIGAG-EPS:</span>{' '}
                  {activeCatalog.reglaNegocio}
                </div>
                <div className="flex flex-wrap items-center gap-4 pt-1 font-mono text-[11px] text-slate-600">
                  <span>Ventana plazo: {activeCatalog.ventanaPlazoDias} días</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Auto-ajuste algorítmico: {activeCatalog.autoAjusteActivo ? 'Activo' : 'Manual'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Derivación: {activeCatalog.rolResponsable}</span>
                </div>
              </div>
            ) : (
              draftRule && (
                <div className="bg-slate-50 border border-[#2B6CB0]/40 rounded-md p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Ventana de plazo (días)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={draftRule.ventanaPlazoDias}
                        onChange={(e) =>
                          setDraftRule({
                            ...draftRule,
                            ventanaPlazoDias: Number(e.target.value) || 30,
                          })
                        }
                        className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 font-mono bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Auto-ajuste algorítmico
                      </label>
                      <select
                        value={draftRule.autoAjusteActivo ? 'true' : 'false'}
                        onChange={(e) =>
                          setDraftRule({
                            ...draftRule,
                            autoAjusteActivo: e.target.value === 'true',
                          })
                        }
                        className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 bg-white"
                      >
                        <option value="true">Activo (Automático)</option>
                        <option value="false">Inactivo (Manual Aux.)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Rol de derivación
                      </label>
                      <input
                        type="text"
                        value={draftRule.rolResponsable}
                        onChange={(e) =>
                          setDraftRule({ ...draftRule, rolResponsable: e.target.value })
                        }
                        className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Descripción de regla de negocio
                    </label>
                    <textarea
                      rows={2}
                      value={draftRule.reglaNegocio}
                      onChange={(e) =>
                        setDraftRule({ ...draftRule, reglaNegocio: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-md p-2 bg-white"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveRule}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[#1E6B52] text-white font-semibold hover:bg-[#16533f] cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Guardar parámetros RF-02
                    </button>
                  </div>
                </div>
              )
            )}
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <div className="bg-[#E2E8F0] px-4 py-2.5 text-xs font-semibold text-slate-800 flex items-center justify-between">
              <span>Registros asociados a {activeCatalog.codigo}</span>
              <span className="font-normal text-slate-600">
                Mostrando primeros {Math.min(25, activeRecords.length)} de {activeRecords.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">ID Reg.</th>
                    <th className="py-2.5 px-3">Arch / Nov</th>
                    <th className="py-2.5 px-3">Afiliado</th>
                    <th className="py-2.5 px-3">Responsable (RF-04)</th>
                    <th className="py-2.5 px-3">Cruce POBLACION</th>
                    <th className="py-2.5 px-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeRecords.slice(0, 25).map((rec) => {
                    const pobMatch =
                      pobByDoc.get(`${rec.TP_DCTO_AF}-${rec.NRO_DCTO_AF}`) ||
                      pobByDoc.get(rec.NRO_DCTO_AF);
                    const munName =
                      DANE_MUNICIPIOS[rec.COD_DPTO]?.[rec.COD_MUNP] || rec.COD_MUNP;

                    return (
                      <tr
                        key={rec.id}
                        onClick={() => onSelectRecord(rec)}
                        className="hover:bg-slate-50 cursor-pointer"
                      >
                        <td className="py-2.5 px-3 font-mono font-semibold text-[#18365A] whitespace-nowrap">
                          {rec.id}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                          {rec.arch} · {rec.COD_NOV}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800">
                          <div className="font-medium">
                            {rec.PRIMER_NOMB} {rec.PRIMER_APLL}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {rec.TP_DCTO_AF} {rec.NRO_DCTO_AF} · {munName}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                          {rec.auxiliarAsignado || 'Motor Algorítmico'}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {pobMatch ? (
                            <span className="inline-flex items-center gap-1 text-[#1E6B52] font-medium">
                              <Database className="w-3 h-3" />
                              Encontrado
                            </span>
                          ) : (
                            <span className="text-slate-400">Sin coincidencia</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              rec.estado === 'LISTO'
                                ? 'text-[#1E6B52]'
                                : rec.estado === 'PENDIENTE'
                                  ? 'text-[#C06C1B]'
                                  : 'text-[#2B6CB0]'
                            }`}
                          >
                            {rec.estado === 'LISTO' && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {rec.estado === 'PENDIENTE' && <Clock className="w-3.5 h-3.5" />}
                            {rec.estado === 'REVISIÓN' && <AlertTriangle className="w-3.5 h-3.5" />}
                            {rec.estado}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
