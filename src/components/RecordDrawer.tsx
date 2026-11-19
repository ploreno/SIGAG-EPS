import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  RefreshCw,
  Save,
  X,
} from 'lucide-react';
import {
  CODIGOS_NOVEDAD_VALIDOS,
  DANE_MUNICIPIOS,
  DEPARTAMENTOS_HABILITADOS,
  GLOSAS_CATALOGO,
  TIPOS_DOC_VALIDOS,
} from '../data/bduaCatalog';
import { GlosaRecord, PoblacionRecord, RecordStatus, UserRole } from '../types/bdua';
import { validateRecordRes762 } from '../utils/bduaValidator';

interface RecordDrawerProps {
  record: GlosaRecord | null;
  poblacionMatch?: PoblacionRecord;
  role: UserRole;
  onClose: () => void;
  onSave: (updated: GlosaRecord) => void;
}

export const RecordDrawer: React.FC<RecordDrawerProps> = ({
  record,
  poblacionMatch,
  role,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<GlosaRecord | null>(null);

  useEffect(() => {
    setForm(record ? { ...record } : null);
  }, [record]);

  if (!record || !form) return null;

  const glosaInfo = GLOSAS_CATALOGO.find((g) => g.codigo === form.GLOSA);
  const issues = validateRecordRes762(form);
  const blockingIssues = issues.filter((i) => i.severidad === 'BLOQUEANTE');
  const munNombre =
    DANE_MUNICIPIOS[form.COD_DPTO]?.[form.COD_MUNP] || 'Municipio no catalogado';
  const dptoNombre = DEPARTAMENTOS_HABILITADOS[form.COD_DPTO] || 'Departamento DANE';

  const handleFieldChange = (field: keyof GlosaRecord, value: string) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleApplyPoblacion = () => {
    if (!poblacionMatch || !form) return;
    setForm({
      ...form,
      TP_DCTO_AF: poblacionMatch.TP_DCTO_AF,
      NRO_DCTO_AF: poblacionMatch.NRO_DCTO_AF,
      PRIMER_APLL: poblacionMatch.PRIMER_APLL,
      SEGUNDO_APELL: poblacionMatch.SEGUNDO_APELL,
      PRIMER_NOMB: poblacionMatch.PRIMER_NOMB,
      SEGUNDO_NOMB: poblacionMatch.SEGUNDO_NOMB,
      FCH_NACIM: poblacionMatch.FCH_NACIM,
      COD_DPTO: poblacionMatch.COD_DPTO,
      COD_MUNP: poblacionMatch.COD_MUNP,
      VLR1:
        form.COD_NOV === 'N33'
          ? poblacionMatch.IPS_PRIMARIA
          : ['N21', 'N31', 'N32'].includes(form.COD_NOV) &&
              form.arch === 'NS' &&
              poblacionMatch.SUBGRUPO_SISBEN !== 'N/A'
            ? poblacionMatch.SUBGRUPO_SISBEN
            : form.COD_NOV === 'N04'
              ? poblacionMatch.COD_DPTO
              : poblacionMatch.PRIMER_APLL,
      VLR2:
        form.COD_NOV === 'N04'
          ? poblacionMatch.COD_MUNP
          : ['N21', 'N31', 'N32'].includes(form.COD_NOV) && form.arch === 'NS'
            ? 'IV'
            : form.VLR2,
      accionSigag: 'Sincronizado con POBLACION',
      crucePoblacion: true,
    });
  };

  const handleSaveWithStatus = (newStatus?: RecordStatus) => {
    if (!form) return;
    const next: GlosaRecord = {
      ...form,
      estado: newStatus || form.estado,
      accionSigag:
        newStatus === 'LISTO'
          ? `Aprobado (${role})`
          : form.accionSigag,
    };
    onSave(next);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/45" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
        {/* Drawer Header */}
        <div className="bg-[#18365A] text-white px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2.5 text-xs text-slate-200 font-mono">
              <span>{form.id}</span>
              <span aria-hidden="true">·</span>
              <span>Archivo {form.arch} ({form.ENT})</span>
              <span aria-hidden="true">·</span>
              <span>Glosa {form.GLOSA}</span>
            </div>
            <h2 className="font-display text-lg font-semibold mt-0.5">
              Detalle del Afiliado y Gestión BDUA
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-white hover:bg-white/10 cursor-pointer"
            aria-label="Cerrar panel de detalle"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Diagnóstico y Estado */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500">
                Diagnóstico Algorítmico · {form.GLOSA_PRINCIPAL}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                  form.estado === 'LISTO'
                    ? 'text-[#1E6B52]'
                    : form.estado === 'PENDIENTE'
                      ? 'text-[#C06C1B]'
                      : 'text-[#2B6CB0]'
                }`}
              >
                {form.estado === 'LISTO' && <CheckCircle2 className="w-4 h-4" />}
                {form.estado === 'PENDIENTE' && <Clock className="w-4 h-4" />}
                {form.estado === 'REVISIÓN' && <AlertTriangle className="w-4 h-4" />}
                {form.estado}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-900">{form.diagnosticoAlgoritmico}</p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
              <span>
                Responsable operativo:{' '}
                <strong className="text-[#18365A]">
                  {form.auxiliarAsignado || 'Motor Algorítmico'}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">
                SMS enviados: {form.smsEnviosCount ?? 0}/3
              </span>
            </div>
            {glosaInfo && (
              <p className="text-xs text-slate-600 leading-relaxed">
                {glosaInfo.reglaNegocio}
              </p>
            )}
          </div>

          {/* Cruce Maestro POBLACION */}
          {poblacionMatch ? (
            <div className="border border-[#2B6CB0]/30 bg-blue-50/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#18365A]">
                  <Database className="w-4 h-4 text-[#2B6CB0]" />
                  Coincidencia en Tabla Maestra POBLACION
                </div>
                <button
                  type="button"
                  onClick={handleApplyPoblacion}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2B6CB0] text-white text-xs font-medium hover:bg-[#1e548f] cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Aplicar datos POBLACION
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700 pt-1">
                <div>
                  <span className="text-slate-500">Nombre maestro:</span>{' '}
                  <span className="font-medium">
                    {poblacionMatch.PRIMER_NOMB} {poblacionMatch.PRIMER_APLL}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Celular:</span>{' '}
                  <span className="font-mono">{poblacionMatch.CELULAR}</span>
                </div>
                <div>
                  <span className="text-slate-500">Sisbén IV:</span>{' '}
                  <span className="font-mono font-semibold">{poblacionMatch.SUBGRUPO_SISBEN}</span>
                </div>
                <div>
                  <span className="text-slate-500">Municipio:</span>{' '}
                  <span>{poblacionMatch.MUNICIPIO}</span>
                </div>
                <div>
                  <span className="text-slate-500">Estado:</span>{' '}
                  <span className="font-mono">{poblacionMatch.ESTADO_AFILIACION}</span>
                </div>
                <div>
                  <span className="text-slate-500">IPS REPS:</span>{' '}
                  <span className="font-mono">{poblacionMatch.IPS_PRIMARIA}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg p-3.5 text-xs text-slate-600">
              Sin coincidencia exacta en la muestra local de POBLACION. Puede corregir manualmente los campos BDUA abajo.
            </div>
          )}

          {/* Alertas sintácticas Res. 762/2023 */}
          {issues.length > 0 && (
            <div className="border border-amber-300 bg-amber-50/60 rounded-lg p-4 space-y-1.5">
              <div className="text-xs font-semibold text-[#C06C1B]">
                Validación Sintáctica Res. 762/2023 ({issues.length} hallazgo{issues.length > 1 ? 's' : ''})
              </div>
              <ul className="space-y-1 text-xs text-slate-700 list-disc pl-4">
                {issues.map((iss, idx) => (
                  <li key={idx}>
                    <span className="font-mono font-semibold">{iss.campo}:</span> {iss.mensaje}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Formulario de 20 columnas BDUA */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#18365A] border-b border-slate-200 pb-2">
              Estructura Oficial BDUA (20 Campos)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  TP_DCTO_AF
                </label>
                <select
                  value={form.TP_DCTO_AF}
                  onChange={(e) => handleFieldChange('TP_DCTO_AF', e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-sm font-mono bg-white"
                >
                  {TIPOS_DOC_VALIDOS.map((tp) => (
                    <option key={tp} value={tp}>
                      {tp}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  NRO_DCTO_AF
                </label>
                <input
                  type="text"
                  value={form.NRO_DCTO_AF}
                  onChange={(e) => handleFieldChange('NRO_DCTO_AF', e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  FCH_NACIM (DD/MM/AAAA)
                </label>
                <input
                  type="text"
                  value={form.FCH_NACIM}
                  onChange={(e) => handleFieldChange('FCH_NACIM', e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">1ER_APLL</label>
                <input
                  type="text"
                  value={form.PRIMER_APLL}
                  onChange={(e) => handleFieldChange('PRIMER_APLL', e.target.value.toUpperCase())}
                  className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">2DO_APELL</label>
                <input
                  type="text"
                  value={form.SEGUNDO_APELL}
                  onChange={(e) => handleFieldChange('SEGUNDO_APELL', e.target.value.toUpperCase())}
                  className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">1ER_NOMB</label>
                <input
                  type="text"
                  value={form.PRIMER_NOMB}
                  onChange={(e) => handleFieldChange('PRIMER_NOMB', e.target.value.toUpperCase())}
                  className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">2DO_NOMB</label>
                <input
                  type="text"
                  value={form.SEGUNDO_NOMB}
                  onChange={(e) => handleFieldChange('SEGUNDO_NOMB', e.target.value.toUpperCase())}
                  className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  COD_DPTO
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={form.COD_DPTO}
                  onChange={(e) => handleFieldChange('COD_DPTO', e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-sm font-mono"
                />
                <span className="text-[11px] text-slate-500">{dptoNombre}</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  COD_MUNP
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={form.COD_MUNP}
                  onChange={(e) => handleFieldChange('COD_MUNP', e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-sm font-mono"
                />
                <span className="text-[11px] text-slate-500 truncate block">{munNombre}</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  COD_NOV
                </label>
                <select
                  value={form.COD_NOV}
                  onChange={(e) => handleFieldChange('COD_NOV', e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-sm font-mono bg-white"
                >
                  {CODIGOS_NOVEDAD_VALIDOS.map((nov) => (
                    <option key={nov} value={nov}>
                      {nov}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  FCH_INI_NOV
                </label>
                <input
                  type="text"
                  value={form.FCH_INI_NOV}
                  onChange={(e) => handleFieldChange('FCH_INI_NOV', e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['VLR1', 'VLR2', 'VLR3', 'VLR4', 'VLR5', 'VLR6', 'VLR7'] as const).map(
                (field) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {field}
                    </label>
                    <input
                      type="text"
                      value={form[field]}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                      className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-sm font-mono"
                    />
                  </div>
                )
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Estado actual
                </label>
                <select
                  value={form.estado}
                  onChange={(e) =>
                    setForm((prev) =>
                      prev ? { ...prev, estado: e.target.value as RecordStatus } : null
                    )
                  }
                  className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-sm font-semibold bg-white"
                >
                  <option value="LISTO">LISTO</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="REVISIÓN">REVISIÓN</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Observaciones de auditoría
              </label>
              <textarea
                rows={2}
                value={form.notasAuditoria || ''}
                onChange={(e) => handleFieldChange('notasAuditoria', e.target.value)}
                placeholder="Registre el soporte verificado (ej. copia de cédula RNEC o ficha Sisbén IV)."
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleSaveWithStatus()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-[#18365A] text-sm font-medium text-[#18365A] hover:bg-slate-100 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Guardar cambios
            </button>
            <button
              type="button"
              disabled={blockingIssues.length > 0 && role !== 'Coordinador GIAF'}
              onClick={() => handleSaveWithStatus('LISTO')}
              title={
                blockingIssues.length > 0 && role !== 'Coordinador GIAF'
                  ? 'Resuelva los errores sintácticos bloqueantes antes de aprobar'
                  : 'Aprobar y marcar registro como LISTO para compilación'
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1E6B52] text-white text-sm font-medium hover:bg-[#16533f] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Aprobar y marcar LISTO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
