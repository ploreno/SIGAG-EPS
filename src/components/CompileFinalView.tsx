import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { GlosaCatalogItem, GlosaRecord, UserRole } from '../types/bdua';
import {
  downloadFinalExcelWorkbook,
  downloadTextFile,
  formatRecordAsBduaTxtLine,
  validateRecordRes762,
} from '../utils/bduaValidator';

interface CompileFinalViewProps {
  records: GlosaRecord[];
  rulesCatalog: GlosaCatalogItem[];
  role: UserRole;
  onGoToValidator: () => void;
  onCertifyBatch100: () => number;
  onRecordCompileEvent: (detail: string) => void;
}

export const CompileFinalView: React.FC<CompileFinalViewProps> = ({
  records,
  rulesCatalog,
  role,
  onGoToValidator,
  onCertifyBatch100,
  onRecordCompileEvent,
}) => {
  const [previewTab, setPreviewTab] = useState<'NC' | 'NS'>('NC');
  const [downloadLog, setDownloadLog] = useState<string | null>(null);

  const stats = useMemo(() => {
    const ncAll = records.filter((r) => r.arch === 'NC');
    const nsAll = records.filter((r) => r.arch === 'NS');

    const isValid = (r: GlosaRecord) =>
      r.estado === 'LISTO' &&
      r.ENT === (r.arch === 'NC' ? 'EPS012' : 'EPSS12') &&
      !validateRecordRes762(r, rulesCatalog).some((i) => i.severidad === 'BLOQUEANTE');

    const ncReady = ncAll.filter(isValid);
    const nsReady = nsAll.filter(isValid);

    const ncBlockers = ncAll.length - ncReady.length;
    const nsBlockers = nsAll.length - nsReady.length;

    const ncPct = ncAll.length > 0 ? ((ncReady.length / ncAll.length) * 100).toFixed(1) : '0.0';
    const nsPct = nsAll.length > 0 ? ((nsReady.length / nsAll.length) * 100).toFixed(1) : '0.0';

    const ncUnlocked = ncAll.length > 0 && ncBlockers === 0;
    const nsUnlocked = nsAll.length > 0 && nsBlockers === 0;
    const allUnlocked = ncUnlocked && nsUnlocked;

    return {
      ncAll,
      nsAll,
      ncReady,
      nsReady,
      ncBlockers,
      nsBlockers,
      ncPct,
      nsPct,
      ncUnlocked,
      nsUnlocked,
      allUnlocked,
    };
  }, [records, rulesCatalog]);

  const todayTag = useMemo(() => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `${d}${m}${y}`;
  }, []);

  const ncFilename = `BDUAEPS012${todayTag}.NC`;
  const nsFilename = `BDUAEPSS12${todayTag}.NS`;
  const xlsxFilename = `SIGAG_EPS_Compilado_NC_NS_${todayTag}.xlsx`;

  const handleDownloadNc = () => {
    if (!stats.ncUnlocked) return;
    const content = stats.ncReady.map(formatRecordAsBduaTxtLine).join('\n');
    downloadTextFile(ncFilename, content);
    const msg = `Plano definitivo ${ncFilename} exportado (100% mallas locales superadas · ${stats.ncReady.length.toLocaleString('es-CO')} registros EPS012).`;
    setDownloadLog(msg);
    onRecordCompileEvent(msg);
  };

  const handleDownloadNs = () => {
    if (!stats.nsUnlocked) return;
    const content = stats.nsReady.map(formatRecordAsBduaTxtLine).join('\n');
    downloadTextFile(nsFilename, content);
    const msg = `Plano definitivo ${nsFilename} exportado (100% mallas locales superadas · ${stats.nsReady.length.toLocaleString('es-CO')} registros EPSS12).`;
    setDownloadLog(msg);
    onRecordCompileEvent(msg);
  };

  const handleDownloadXlsx = () => {
    if (!stats.allUnlocked) return;
    downloadFinalExcelWorkbook(stats.ncReady, stats.nsReady, xlsxFilename);
    const msg = `Libro Excel ${xlsxFilename} exportado con hojas NC_EPS012 (${stats.ncReady.length}) y NS_EPSS12 (${stats.nsReady.length}).`;
    setDownloadLog(msg);
    onRecordCompileEvent(msg);
  };

  const handleCertifyBatch = () => {
    const fixed = onCertifyBatch100();
    setDownloadLog(
      `Certificación integral ejecutada: ${fixed.toLocaleString('es-CO')} registros subsanados/validados. El 100% del lote supera las mallas locales para compilación .NC/.NS.`
    );
  };

  const previewLines = useMemo(() => {
    const source = previewTab === 'NC' ? stats.ncReady : stats.nsReady;
    return source.slice(0, 10).map(formatRecordAsBduaTxtLine);
  }, [previewTab, stats.ncReady, stats.nsReady]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-[#18365A]">
            Compilar Plano Final ADRES (.NC / .NS) · RF-06
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            La generación y exportación de archivos definitivos .NC (EPS012) y .NS (EPSS12) se habilita únicamente cuando el 100% de los registros supera las mallas locales.
          </p>
        </div>

        <button
          type="button"
          disabled={!stats.allUnlocked}
          onClick={handleDownloadXlsx}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1E6B52] text-white text-xs sm:text-sm font-semibold hover:bg-[#16533f] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Descargar Auditoría .XLSX (100% Validado)
        </button>
      </div>

      {/* Control de Compuerta 100% RF-06 */}
      {!stats.allUnlocked ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#C06C1B] shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-slate-800">
              <div className="font-semibold text-[#C06C1B]">
                Compuerta de Compilación Bloqueada (Requerimiento RF-06: 100% Mallas Locales)
              </div>
              <p className="text-xs text-slate-700 mt-1">
                Actualmente existen{' '}
                <strong className="font-mono">{stats.ncBlockers}</strong> registros en NC y{' '}
                <strong className="font-mono">{stats.nsBlockers}</strong> registros en NS pendientes de gestión auxiliar o con errores sintácticos/semánticos.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onGoToValidator}
              className="px-3.5 py-2 rounded-md border border-[#18365A] text-xs font-semibold text-[#18365A] bg-white hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              Ir a Pre-Validador
            </button>
            {role === 'Coordinador GIAF' && (
              <button
                type="button"
                onClick={handleCertifyBatch}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#18365A] text-white text-xs font-semibold hover:bg-[#102642] cursor-pointer whitespace-nowrap"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Subsanar y Certificar Lote 100%
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[#1E6B52] bg-emerald-50/70 p-4 flex items-center gap-3 text-sm text-[#1E6B52]">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>
            <strong>Compuerta RF-06 Superada (100%):</strong> Todos los registros NC (EPS012) y NS (EPSS12) cumplen con las mallas locales sintácticas y semánticas. Listo para descarga oficial.
          </span>
        </div>
      )}

      {downloadLog && (
        <div className="rounded-lg border border-[#2B6CB0] bg-blue-50/60 px-4 py-3 text-sm text-[#18365A] flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 shrink-0 text-[#2B6CB0]" />
          <span>{downloadLog}</span>
        </div>
      )}

      {/* Tarjetas de Compilación por Entidad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border-2 border-[#18365A] rounded-xl p-6 bg-white flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#18365A]">
                Régimen Contributivo · Archivo .NC
              </span>
              <span className="font-mono text-xs font-bold text-[#18365A]">EPS012</span>
            </div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-[#18365A] tabular-nums">
              {stats.ncReady.length.toLocaleString('es-CO')} / {stats.ncAll.length.toLocaleString('es-CO')} ({stats.ncPct}%)
            </div>
            <p className="text-xs text-slate-600">
              {stats.ncUnlocked
                ? '100% de registros NC validados sin bloqueantes. Formato plano ADRES sin encabezados.'
                : `Faltan ${stats.ncBlockers} registros NC por subsanar/validar para alcanzar el 100%.`}
            </p>
          </div>

          <button
            type="button"
            disabled={!stats.ncUnlocked}
            onClick={handleDownloadNc}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#18365A] text-white text-sm font-semibold hover:bg-[#102642] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
          >
            {stats.ncUnlocked ? <Download className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {stats.ncUnlocked
              ? `Descargar ${ncFilename}`
              : `Bloqueado (${stats.ncBlockers} pendientes/errores)`}
          </button>
        </div>

        <div className="border-2 border-[#2B6CB0] rounded-xl p-6 bg-white flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#2B6CB0]">
                Régimen Subsidiado · Archivo .NS
              </span>
              <span className="font-mono text-xs font-bold text-[#2B6CB0]">EPSS12</span>
            </div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-[#2B6CB0] tabular-nums">
              {stats.nsReady.length.toLocaleString('es-CO')} / {stats.nsAll.length.toLocaleString('es-CO')} ({stats.nsPct}%)
            </div>
            <p className="text-xs text-slate-600">
              {stats.nsUnlocked
                ? '100% de registros NS validados sin bloqueantes (incluye Sisbén IV N21/N31/N32).'
                : `Faltan ${stats.nsBlockers} registros NS por subsanar/validar para alcanzar el 100%.`}
            </p>
          </div>

          <button
            type="button"
            disabled={!stats.nsUnlocked}
            onClick={handleDownloadNs}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#2B6CB0] text-white text-sm font-semibold hover:bg-[#1e548f] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
          >
            {stats.nsUnlocked ? <Download className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {stats.nsUnlocked
              ? `Descargar ${nsFilename}`
              : `Bloqueado (${stats.nsBlockers} pendientes/errores)`}
          </button>
        </div>
      </div>

      {/* Vista previa del plano sin encabezados */}
      <section className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        <div className="bg-[#E2E8F0] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <FileText className="w-4 h-4" />
            <span>Vista Previa Estándar ADRES (.NC / .NS delimitado por comas, sin encabezados)</span>
          </div>

          <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setPreviewTab('NC')}
              className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer ${
                previewTab === 'NC' ? 'bg-[#18365A] text-white' : 'text-slate-700'
              }`}
            >
              NC (EPS012)
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab('NS')}
              className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer ${
                previewTab === 'NS' ? 'bg-[#2B6CB0] text-white' : 'text-slate-700'
              }`}
            >
              NS (EPSS12)
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
          {previewLines.length === 0 ? (
            <div className="text-slate-400">
              No hay registros LISTO disponibles para la entidad seleccionada.
            </div>
          ) : (
            previewLines.map((line, i) => (
              <div key={i} className="whitespace-nowrap">
                {line}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
