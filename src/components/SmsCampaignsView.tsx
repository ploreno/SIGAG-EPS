import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Mail,
  MessageSquareText,
  Phone,
  Send,
  Zap,
} from 'lucide-react';
import { DANE_MUNICIPIOS } from '../data/bduaCatalog';
import { GlosaRecord, PoblacionRecord } from '../types/bdua';

interface SmsCampaignsViewProps {
  records: GlosaRecord[];
  poblacion: PoblacionRecord[];
  onSendSmsBatch: (recordIds: string[]) => {
    sent: number;
    noPhone: number;
    limitReached: number;
  };
  onSimulateResponse: (recordId: string) => void;
}

const DEFAULT_TEMPLATE =
  'SIGAG-EPS informa a {NOMBRES} ({TIPO_DOC} {NUM_DOC}): para subsanar la glosa {GLOSA} en {MUNICIPIO} ({ENTIDAD}), por favor envíe soporte de identificación o Sisbén IV actualizado.';

const SMS_GLOSAS_RF05 = ['GN0018', 'GN0059', 'GN0060', 'GN0169', 'GN0258'] as const;

export const SmsCampaignsView: React.FC<SmsCampaignsViewProps> = ({
  records,
  poblacion,
  onSendSmsBatch,
  onSimulateResponse,
}) => {
  const [glosaFilter, setGlosaFilter] = useState<
    'TODAS' | 'GN0018' | 'GN0059' | 'GN0060' | 'GN0169' | 'GN0258'
  >('TODAS');
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dispatchNotice, setDispatchNotice] = useState<string | null>(null);

  const pobMap = useMemo(() => {
    const map = new Map<string, PoblacionRecord>();
    poblacion.forEach((p) => {
      map.set(`${p.TP_DCTO_AF}-${p.NRO_DCTO_AF}`, p);
      map.set(p.NRO_DCTO_AF, p);
    });
    return map;
  }, [poblacion]);

  const targetRecords = useMemo(() => {
    return records
      .filter((r) => {
        const isTarget =
          SMS_GLOSAS_RF05.includes(r.GLOSA as (typeof SMS_GLOSAS_RF05)[number]) ||
          r.requiereSms;
        if (!isTarget) return false;
        if (glosaFilter !== 'TODAS' && r.GLOSA !== glosaFilter) return false;
        return true;
      })
      .slice(0, 45);
  }, [records, glosaFilter]);

  const enrichedRows = useMemo(() => {
    return targetRecords.map((rec) => {
      const pob =
        pobMap.get(`${rec.TP_DCTO_AF}-${rec.NRO_DCTO_AF}`) ||
        pobMap.get(rec.NRO_DCTO_AF);
      const municipio =
        pob?.MUNICIPIO ||
        DANE_MUNICIPIOS[rec.COD_DPTO]?.[rec.COD_MUNP] ||
        `DANE ${rec.COD_DPTO}-${rec.COD_MUNP}`;
      return {
        rec,
        celular: pob?.CELULAR || '',
        correo: pob?.CORREO_ELECTRONICO || 'No registrado',
        municipio,
      };
    });
  }, [targetRecords, pobMap]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllEligible = () => {
    const eligible = enrichedRows
      .filter((item) => item.celular.trim() !== '' && (item.rec.smsEnviosCount ?? 0) < 3)
      .map((item) => item.rec.id);
    setSelectedIds(eligible);
  };

  const renderPreview = () => {
    const sample =
      enrichedRows.find((e) => selectedIds.includes(e.rec.id)) || enrichedRows[0];
    if (!sample) return template;
    const { rec, municipio } = sample;
    return template
      .replace('{NOMBRES}', `${rec.PRIMER_NOMB} ${rec.PRIMER_APLL}`.trim())
      .replace('{TIPO_DOC}', rec.TP_DCTO_AF)
      .replace('{NUM_DOC}', rec.NRO_DCTO_AF)
      .replace('{GLOSA}', rec.GLOSA)
      .replace('{MUNICIPIO}', municipio)
      .replace('{ENTIDAD}', rec.ENT);
  };

  const handleDispatch = (idsToSend: string[]) => {
    if (idsToSend.length === 0) return;
    const res = onSendSmsBatch(idsToSend);
    const parts = [`${res.sent} SMS entregados`];
    if (res.limitReached > 0) parts.push(`${res.limitReached} bloqueados por límite máximo 3/3`);
    if (res.noPhone > 0) parts.push(`${res.noPhone} sin celular en POBLACION`);
    setDispatchNotice(`Campaña SMS ejecutada (RF-05): ${parts.join(' · ')}.`);
  };

  const handleAutoTrigger = () => {
    const pendingEligible = enrichedRows
      .filter(
        (item) =>
          item.rec.estado !== 'LISTO' &&
          item.celular.trim() !== '' &&
          (item.rec.smsEnviosCount ?? 0) < 3
      )
      .map((item) => item.rec.id);
    setSelectedIds(pendingEligible);
    handleDispatch(pendingEligible);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-[#18365A]">
            Campañas SMS Automatizadas (RF-05)
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Notificaciones a afiliados con inconsistencias de identificación o Sisbén (GN0018, GN0059, GN0060, GN0169, GN0258), con control estricto de máximo 3 envíos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleAutoTrigger}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2B6CB0] text-white text-xs sm:text-sm font-semibold hover:bg-[#1e548f] cursor-pointer whitespace-nowrap"
          >
            <Zap className="w-4 h-4" />
            Disparo Auto Pendientes
          </button>
          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => handleDispatch(selectedIds)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1E6B52] text-white text-xs sm:text-sm font-semibold hover:bg-[#16533f] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            Enviar Seleccionados ({selectedIds.length})
          </button>
        </div>
      </div>

      {dispatchNotice && (
        <div className="rounded-lg border border-[#1E6B52] bg-emerald-50/70 px-4 py-3 text-sm text-[#1E6B52] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{dispatchNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Plantilla SMS */}
        <div className="lg:col-span-4 border border-slate-200 rounded-lg p-5 bg-white space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#18365A]">
            <MessageSquareText className="w-4 h-4 text-[#2B6CB0]" />
            Plantilla de Mensaje SMS (Máx. 3 envíos)
          </div>

          <textarea
            rows={4}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="w-full border border-slate-300 rounded-md p-3 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-[#2B6CB0]"
          />

          <div className="flex flex-wrap gap-1.5 text-[11px] font-mono text-slate-600">
            {['{NOMBRES}', '{TIPO_DOC}', '{NUM_DOC}', '{GLOSA}', '{MUNICIPIO}', '{ENTIDAD}'].map(
              (tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTemplate((prev) => `${prev} ${tag}`)}
                  className="px-2 py-0.5 border border-slate-300 rounded bg-slate-50 hover:bg-slate-100 cursor-pointer"
                >
                  {tag}
                </button>
              )
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-md p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
              <span>Vista previa en tiempo real</span>
              <span className="font-mono tabular-nums">{renderPreview().length} caracteres</span>
            </div>
            <p className="text-xs text-slate-800 leading-relaxed">{renderPreview()}</p>
          </div>
        </div>

        {/* Tabla de Destinatarios */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={glosaFilter}
                onChange={(e) =>
                  setGlosaFilter(
                    e.target.value as
                      | 'TODAS'
                      | 'GN0018'
                      | 'GN0059'
                      | 'GN0060'
                      | 'GN0169'
                      | 'GN0258'
                  )
                }
                className="border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white"
              >
                <option value="TODAS">Todas las glosas RF-05 (5 causales)</option>
                <option value="GN0018">GN0018 · Tipo documento vs edad</option>
                <option value="GN0059">GN0059 · Fecha nacimiento RNEC</option>
                <option value="GN0060">GN0060 · Código DANE residencia</option>
                <option value="GN0169">GN0169 · Discrepancia nombre RNEC</option>
                <option value="GN0258">GN0258 · Subgrupo Sisbén IV</option>
              </select>

              <button
                type="button"
                onClick={selectAllEligible}
                className="px-3 py-1.5 rounded-md border border-slate-300 text-xs font-medium text-[#18365A] hover:bg-slate-50 cursor-pointer whitespace-nowrap"
              >
                Seleccionar elegibles (&lt; 3 envíos)
              </button>
            </div>

            <span className="text-xs text-slate-500 tabular-nums">
              {enrichedRows.length} afiliados prioritarios listados
            </span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#E2E8F0] text-slate-800 font-semibold">
                    <th className="py-2.5 px-3 w-8">Sel.</th>
                    <th className="py-2.5 px-3">ID / Glosa</th>
                    <th className="py-2.5 px-3">Afiliado</th>
                    <th className="py-2.5 px-3">Municipio (POBLACION)</th>
                    <th className="py-2.5 px-3">Contacto</th>
                    <th className="py-2.5 px-3">Envíos</th>
                    <th className="py-2.5 px-3">Estado SMS</th>
                    <th className="py-2.5 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {enrichedRows.map(({ rec, celular, correo, municipio }) => {
                    const checked = selectedIds.includes(rec.id);
                    const count = rec.smsEnviosCount ?? 0;
                    const maxed = count >= 3;
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            disabled={maxed}
                            checked={checked}
                            onChange={() => toggleSelect(rec.id)}
                            aria-label={`Seleccionar ${rec.id}`}
                            className="rounded border-slate-300 cursor-pointer disabled:opacity-40"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                          <div className="font-semibold text-[#18365A]">{rec.id}</div>
                          <div className="text-[11px] text-slate-500">
                            {rec.arch} · {rec.GLOSA}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-800">
                            {rec.PRIMER_NOMB} {rec.PRIMER_APLL}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {rec.TP_DCTO_AF} {rec.NRO_DCTO_AF}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                          {municipio}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1 font-mono text-slate-800">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{celular || 'Sin celular'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate max-w-[160px]">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{correo}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                          <span className={maxed ? 'text-red-700 font-semibold' : 'text-slate-700'}>
                            {count}/3
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`font-semibold ${
                              rec.smsStatus === 'Entregado' ||
                              rec.smsStatus === 'Respuesta recibida'
                                ? 'text-[#1E6B52]'
                                : rec.smsStatus === 'Sin celular'
                                  ? 'text-red-700'
                                  : 'text-[#C06C1B]'
                            }`}
                          >
                            {maxed ? 'Límite 3/3' : rec.smsStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {rec.smsStatus === 'Entregado' && (
                            <button
                              type="button"
                              onClick={() => onSimulateResponse(rec.id)}
                              className="text-[11px] font-medium text-[#2B6CB0] hover:underline cursor-pointer"
                            >
                              Registrar soporte
                            </button>
                          )}
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
