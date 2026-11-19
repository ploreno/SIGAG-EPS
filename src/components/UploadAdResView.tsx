import React, { useRef, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  Play,
  RotateCcw,
  Upload,
} from 'lucide-react';
import { generateRpaSampleFlatText } from '../data/bduaCatalog';
import { GlosaRecord, IngestionSummary, PoblacionRecord } from '../types/bdua';
import {
  BDUA_20_HEADERS,
  downloadTemplateAdResXlsx,
  downloadTemplatePoblacionXlsx,
  parseAdResRawText,
  parseAdResUploadFile,
  parsePoblacionUploadFile,
} from '../utils/bduaValidator';

interface UploadAdResViewProps {
  poblacion: PoblacionRecord[];
  ingestionHistory: IngestionSummary[];
  onLoadAdResRecords: (newRecords: GlosaRecord[], summary: IngestionSummary) => void;
  onLoadPoblacion: (newPob: PoblacionRecord[], summary: IngestionSummary) => void;
  onResetDemoData: () => void;
}

export const UploadAdResView: React.FC<UploadAdResViewProps> = ({
  poblacion,
  ingestionHistory,
  onLoadAdResRecords,
  onLoadPoblacion,
  onResetDemoData,
}) => {
  const [draggingAdRes, setDraggingAdRes] = useState(false);
  const [draggingPob, setDraggingPob] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [processing, setProcessing] = useState(false);

  const adresInputRef = useRef<HTMLInputElement>(null);
  const pobInputRef = useRef<HTMLInputElement>(null);

  const buildPoblacionMap = (list: PoblacionRecord[]) => {
    const map = new Map<string, PoblacionRecord>();
    list.forEach((p) => {
      map.set(`${p.TP_DCTO_AF}-${p.NRO_DCTO_AF}`, p);
      map.set(p.NRO_DCTO_AF, p);
    });
    return map;
  };

  const handleRpaIngestion = () => {
    setProcessing(true);
    setStatusMessage(null);
    const pobMap = buildPoblacionMap(poblacion);
    const rawText = generateRpaSampleFlatText();
    const parsed = parseAdResRawText(rawText, pobMap, 'NC');

    const gnRangeCount = parsed.filter((r) => {
      const codeNum = Number(r.GLOSA.replace('GN', ''));
      return codeNum >= 18 && codeNum <= 501;
    }).length;

    const summary: IngestionSummary = {
      nombreArchivo: 'RPA_SFTP_ADRES_NC_NS_CICLO_ACT.txt',
      tipoCarga: 'RPA_ADRES',
      fechaCarga: new Date().toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      totalFilas: parsed.length,
      filasNC: parsed.filter((r) => r.arch === 'NC').length,
      filasNS: parsed.filter((r) => r.arch === 'NS').length,
      subsanadasAuto: parsed.filter((r) => r.estado === 'LISTO').length,
      enGestionAuxiliar: parsed.filter((r) => r.estado === 'PENDIENTE').length,
      enRevision: parsed.filter((r) => r.estado === 'REVISIÓN').length,
      crucesPoblacionExitosos: parsed.filter((r) => r.crucePoblacion).length,
    };

    onLoadAdResRecords(parsed, summary);
    setStatusMessage({
      type: 'success',
      text: `Ingesta RPA completada (RF-01): ${parsed.length} registros leídos y parseados automáticamente (${gnRangeCount} en rango GN0018–GN0501; ${summary.filasNC} NC EPS012 / ${summary.filasNS} NS EPSS12).`,
    });
    setProcessing(false);
  };

  const handleAdResFile = async (file: File) => {
    setProcessing(true);
    setStatusMessage(null);
    try {
      const pobMap = buildPoblacionMap(poblacion);
      const parsed = await parseAdResUploadFile(file, pobMap);
      if (parsed.length === 0) {
        setStatusMessage({
          type: 'error',
          text: `El archivo "${file.name}" no contiene filas válidas con la estructura BDUA de 20 columnas.`,
        });
        return;
      }

      const gnRangeCount = parsed.filter((r) => {
        const codeNum = Number(r.GLOSA.replace('GN', ''));
        return codeNum >= 18 && codeNum <= 501;
      }).length;

      const summary: IngestionSummary = {
        nombreArchivo: file.name,
        tipoCarga: 'ADRES',
        fechaCarga: new Date().toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        totalFilas: parsed.length,
        filasNC: parsed.filter((r) => r.arch === 'NC').length,
        filasNS: parsed.filter((r) => r.arch === 'NS').length,
        subsanadasAuto: parsed.filter((r) => r.estado === 'LISTO').length,
        enGestionAuxiliar: parsed.filter((r) => r.estado === 'PENDIENTE').length,
        enRevision: parsed.filter((r) => r.estado === 'REVISIÓN').length,
        crucesPoblacionExitosos: parsed.filter((r) => r.crucePoblacion).length,
      };

      onLoadAdResRecords(parsed, summary);
      setStatusMessage({
        type: 'success',
        text: `Ingesta completada: ${parsed.length} glosas procesadas (${gnRangeCount} en rango GN0018–GN0501; ${summary.filasNC} NC EPS012 / ${summary.filasNS} NS EPSS12). KPIs y bandejas actualizados.`,
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: `No se pudo leer "${file.name}". Verifique que sea .xlsx, .csv o .txt válido.`,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handlePoblacionFile = async (file: File) => {
    setProcessing(true);
    setStatusMessage(null);
    try {
      const parsedPob = await parsePoblacionUploadFile(file);
      if (parsedPob.length === 0) {
        setStatusMessage({
          type: 'error',
          text: `No se detectaron registros de afiliados válidos en "${file.name}".`,
        });
        return;
      }

      const summary: IngestionSummary = {
        nombreArchivo: file.name,
        tipoCarga: 'POBLACION',
        fechaCarga: new Date().toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        totalFilas: parsedPob.length,
        filasNC: parsedPob.filter((p) => p.REGIMEN === 'C').length,
        filasNS: parsedPob.filter((p) => p.REGIMEN === 'S').length,
        subsanadasAuto: 0,
        enGestionAuxiliar: 0,
        enRevision: 0,
        crucesPoblacionExitosos: parsedPob.length,
      };

      onLoadPoblacion(parsedPob, summary);
      setStatusMessage({
        type: 'success',
        text: `Tabla maestra POBLACION actualizada con ${parsedPob.length} afiliados (Valle del Cauca 76 / Risaralda 66) y recruzada contra las glosas activas.`,
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: `Error al procesar tabla POBLACION "${file.name}".`,
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-[#18365A]">
            Cargar Respuesta ADRES y Tabla Maestra POBLACION
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Ingesta RPA automatizada o carga manual (.xlsx, .csv, .txt) con estructura BDUA de 20 columnas identificando glosas GN0018 a GN0501.
          </p>
        </div>
        <button
          type="button"
          onClick={onResetDemoData}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restaurar lote inicial (2.100)
        </button>
      </div>

      {/* Panel de Ingesta RPA RF-01 */}
      <div className="border border-[#2B6CB0]/40 bg-blue-50/40 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[#18365A] text-white shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[#18365A]">
              RF-01 · Conector RPA de Respuestas ADRES (Buzón SFTP)
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Lee, parsea y clasifica automáticamente planos de respuesta ADRES identificando las 16 glosas en el rango GN0018–GN0501 y enrutando por régimen (EPS012 / EPSS12).
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={processing}
          onClick={handleRpaIngestion}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2B6CB0] text-white text-xs sm:text-sm font-semibold hover:bg-[#1e548f] cursor-pointer whitespace-nowrap shrink-0"
        >
          <Play className="w-4 h-4" />
          Ejecutar Ingesta RPA ADRES
        </button>
      </div>

      {statusMessage && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm flex items-center gap-2.5 ${
            statusMessage.type === 'success'
              ? 'border-[#1E6B52] bg-emerald-50/70 text-[#1E6B52]'
              : 'border-red-400 bg-red-50 text-red-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Zona Drag & Drop Respuesta ADRES */}
        <div className="border border-slate-200 rounded-xl p-6 bg-white space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-[#18365A]">
                1. Archivo Respuesta ADRES (.NC / .NS)
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Diferencia automáticamente EPS012 (NC) y EPSS12 (NS) + columnas GLOSA y GLOSA_PRINCIPAL.
              </p>
            </div>
            <button
              type="button"
              onClick={downloadTemplateAdResXlsx}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2B6CB0] hover:underline cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Plantilla .xlsx
            </button>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDraggingAdRes(true);
            }}
            onDragLeave={() => setDraggingAdRes(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDraggingAdRes(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleAdResFile(file);
            }}
            onClick={() => adresInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              draggingAdRes
                ? 'border-[#2B6CB0] bg-blue-50/60'
                : 'border-slate-300 bg-slate-50/70 hover:border-[#2B6CB0]'
            }`}
          >
            <input
              ref={adresInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAdResFile(file);
                e.target.value = '';
              }}
            />
            <FileSpreadsheet className="w-9 h-9 text-[#2B6CB0] mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-800">
              {processing ? 'Procesando archivo...' : 'Arrastre aquí su archivo ADRES o haga clic para seleccionar'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Formatos aceptados: .xlsx, .csv, .txt (delimitado por comas)
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
            <div className="text-xs font-semibold text-slate-700 mb-1.5">
              Estructura esperada (20 columnas + Glosas):
            </div>
            <div className="font-mono text-[11px] text-slate-600 leading-relaxed break-words">
              {BDUA_20_HEADERS.join(', ')}, GLOSA, GLOSA_PRINCIPAL
            </div>
          </div>
        </div>

        {/* Zona Drag & Drop Tabla Maestra POBLACION */}
        <div className="border border-slate-200 rounded-xl p-6 bg-white space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-[#18365A]">
                2. Tabla Maestra POBLACION (Valle 76 / Risaralda 66)
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Base vigente ({poblacion.length.toLocaleString('es-CO')} afiliados) para cruce de identidad, DANE, REPS y contacto SMS.
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadTemplatePoblacionXlsx(poblacion)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2B6CB0] hover:underline cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Plantilla .xlsx
            </button>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDraggingPob(true);
            }}
            onDragLeave={() => setDraggingPob(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDraggingPob(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handlePoblacionFile(file);
            }}
            onClick={() => pobInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              draggingPob
                ? 'border-[#1E6B52] bg-emerald-50/50'
                : 'border-slate-300 bg-slate-50/70 hover:border-[#1E6B52]'
            }`}
          >
            <input
              ref={pobInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePoblacionFile(file);
                e.target.value = '';
              }}
            />
            <Database className="w-9 h-9 text-[#1E6B52] mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-800">
              Arrastre aquí la tabla POBLACION (.xlsx / .csv)
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Incluye CELULAR, CORREO_ELECTRONICO, SUBGRUPO_SISBEN e IPS_PRIMARIA
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 border border-slate-200 rounded-md p-3">
            <div>
              <span className="text-slate-500">Valle del Cauca (76):</span>{' '}
              <span className="font-mono font-semibold text-slate-800 tabular-nums">
                {poblacion.filter((p) => p.COD_DPTO === '76').length} reg.
              </span>
            </div>
            <div>
              <span className="text-slate-500">Risaralda (66):</span>{' '}
              <span className="font-mono font-semibold text-slate-800 tabular-nums">
                {poblacion.filter((p) => p.COD_DPTO === '66').length} reg.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Historial de ingestas */}
      <section className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        <div className="bg-[#E2E8F0] px-4 py-2.5 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-2">
            <Upload className="w-3.5 h-3.5" />
            Historial de Cargas e Ingesta RPA
          </h3>
          <span className="text-xs text-slate-600 tabular-nums">
            {ingestionHistory.length} evento{ingestionHistory.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-2.5 px-4">Hora</th>
                <th className="py-2.5 px-4">Tipo</th>
                <th className="py-2.5 px-4">Archivo</th>
                <th className="py-2.5 px-4 text-right">Filas</th>
                <th className="py-2.5 px-4 text-right">NC (EPS012)</th>
                <th className="py-2.5 px-4 text-right">NS (EPSS12)</th>
                <th className="py-2.5 px-4 text-right">Subsanadas Auto.</th>
                <th className="py-2.5 px-4 text-right">Cruces POBLACION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {ingestionHistory.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono text-slate-600 tabular-nums">
                    {item.fechaCarga}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-[#18365A]">{item.tipoCarga}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-800">{item.nombreArchivo}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                    {item.totalFilas.toLocaleString('es-CO')}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                    {item.filasNC.toLocaleString('es-CO')}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                    {item.filasNS.toLocaleString('es-CO')}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-[#1E6B52] font-semibold tabular-nums">
                    {item.subsanadasAuto.toLocaleString('es-CO')}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-[#2B6CB0] tabular-nums">
                    {item.crucesPoblacionExitosos.toLocaleString('es-CO')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
