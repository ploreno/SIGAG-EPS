import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  ShieldCheck,
  Wand2,
} from 'lucide-react';
import { FileType, GlosaCatalogItem, GlosaRecord, ValidationIssue } from '../types/bdua';
import { validateRecordRes762 } from '../utils/bduaValidator';

interface PreValidatorViewProps {
  records: GlosaRecord[];
  rulesCatalog: GlosaCatalogItem[];
  conformityRate: string;
  onAutoFixAll: () => number;
  onRunDeterministicEngine: () => number;
  onSelectRecord: (record: GlosaRecord) => void;
  onGoToCompile: () => void;
}

export const PreValidatorView: React.FC<PreValidatorViewProps> = ({
  records,
  rulesCatalog,
  conformityRate,
  onAutoFixAll,
  onRunDeterministicEngine,
  onSelectRecord,
  onGoToCompile,
}) => {
  const [archFilter, setArchFilter] = useState<'TODOS' | FileType>('TODOS');
  const [mallaFilter, setMallaFilter] = useState<'TODAS' | 'SINTACTICA' | 'SEMANTICA'>('TODAS');
  const [sevFilter, setSevFilter] = useState<'TODAS' | 'BLOQUEANTE' | 'ADVERTENCIA'>('TODAS');
  const [fixMessage, setFixMessage] = useState<string | null>(null);

  const allIssues = useMemo(() => {
    const list: ValidationIssue[] = [];
    records.forEach((r) => {
      const res = validateRecordRes762(r, rulesCatalog);
      list.push(...res);
    });
    return list;
  }, [records, rulesCatalog]);

  const syntacticCount = useMemo(
    () => allIssues.filter((i) => i.tipoMalla === 'SINTACTICA').length,
    [allIssues]
  );
  const semanticCount = useMemo(
    () => allIssues.filter((i) => i.tipoMalla === 'SEMANTICA').length,
    [allIssues]
  );
  const blockingCount = useMemo(
    () => allIssues.filter((i) => i.severidad === 'BLOQUEANTE').length,
    [allIssues]
  );
  const readyValidCount = useMemo(
    () =>
      records.filter(
        (r) =>
          r.estado === 'LISTO' &&
          !validateRecordRes762(r, rulesCatalog).some((i) => i.severidad === 'BLOQUEANTE')
      ).length,
    [records, rulesCatalog]
  );

  const filteredIssues = useMemo(() => {
    return allIssues.filter((iss) => {
      if (archFilter !== 'TODOS' && iss.arch !== archFilter) return false;
      if (mallaFilter !== 'TODAS' && iss.tipoMalla !== mallaFilter) return false;
      if (sevFilter !== 'TODAS' && iss.severidad !== sevFilter) return false;
      return true;
    });
  }, [allIssues, archFilter, mallaFilter, sevFilter]);

  const handleAutoFix = () => {
    const fixed = onAutoFixAll();
    setFixMessage(
      fixed > 0
        ? `Malla sintáctica Res. 762/2023 ejecutada: ${fixed} registros corregidos automáticamente (formato DD/MM/AAAA, ceros DANE y estructura VLR1–VLR7).`
        : 'No se encontraron errores sintácticos auto-corregibles pendientes en el lote actual.'
    );
  };

  const handleDeterministicRun = () => {
    const adjusted = onRunDeterministicEngine();
    setFixMessage(
      adjusted > 0
        ? `Motor algorítmico RF-03 aplicado sobre glosas determinísticas (GN0095, GN0340, GN0361, GN0368, GN0369, GN0421): ${adjusted} registros ajustados y marcados LISTO.`
        : 'Todas las glosas determinísticas con auto-ajuste activo ya se encuentran subsanadas en estado LISTO.'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-[#18365A]">
            Pre-Validador Sintáctico y Semántico NC / NS (RF-03)
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Ejecuta mallas sintácticas y semánticas (Res. 762/2023) y aplica ajustes automáticos en glosas determinísticas (GN0095, GN0340, GN0361, GN0368, GN0369, GN0421).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleDeterministicRun}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#18365A] text-white text-xs sm:text-sm font-semibold hover:bg-[#102642] cursor-pointer whitespace-nowrap"
          >
            <Cpu className="w-4 h-4" />
            Motor Determinístico (RF-03)
          </button>
          <button
            type="button"
            onClick={handleAutoFix}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#2B6CB0] text-[#2B6CB0] text-xs sm:text-sm font-semibold hover:bg-blue-50 cursor-pointer whitespace-nowrap"
          >
            <Wand2 className="w-4 h-4" />
            Corregir Formato Auto
          </button>
          <button
            type="button"
            onClick={onGoToCompile}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1E6B52] text-white text-xs sm:text-sm font-semibold hover:bg-[#16533f] cursor-pointer whitespace-nowrap"
          >
            <span>Ir a Compilar Plano Final</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {fixMessage && (
        <div className="rounded-lg border border-[#1E6B52] bg-emerald-50/70 px-4 py-3 text-sm text-[#1E6B52] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{fixMessage}</span>
        </div>
      )}

      {/* Métricas de Validación */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-slate-200 rounded-lg p-4 bg-white">
          <div className="text-xs font-medium text-slate-500">Registros Aptos para Plano</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#1E6B52] tabular-nums">
            {readyValidCount.toLocaleString('es-CO')}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Estado LISTO sin errores bloqueantes</div>
        </div>

        <div className="border border-slate-200 rounded-lg p-4 bg-white">
          <div className="text-xs font-medium text-slate-500">Malla Sintáctica</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#C06C1B] tabular-nums">
            {syntacticCount.toLocaleString('es-CO')}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Fechas DD/MM/AAAA, DANE, longitud</div>
        </div>

        <div className="border border-slate-200 rounded-lg p-4 bg-white">
          <div className="text-xs font-medium text-slate-500">Malla Semántica</div>
          <div className="mt-1 font-display text-2xl font-bold text-red-700 tabular-nums">
            {semanticCount.toLocaleString('es-CO')}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {blockingCount} bloqueantes totales en lote
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg p-4 bg-white">
          <div className="text-xs font-medium text-slate-500">Conformidad Sintáctica/Semántica</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#2B6CB0] tabular-nums">
            {conformityRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Anexo Técnico Res. 762/2023</div>
        </div>
      </div>

      {/* Matriz de Reglas Res. 762/2023 */}
      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
        <div className="text-xs font-semibold text-[#18365A] mb-2.5 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#2B6CB0]" />
          Mallas Sintácticas, Semánticas y Glosas Determinísticas (RF-03)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
          <div className="bg-white border border-slate-200 rounded-md p-3">
            <div className="font-semibold text-[#18365A]">1. Malla Sintáctica</div>
            <p className="mt-1 text-slate-600">
              Formato estricto <span className="font-mono">DD/MM/AAAA</span>, DANE 2+3 dígitos (<span className="font-mono">76</span> Valle / <span className="font-mono">66</span> Risaralda) y longitud de los 20 campos.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-3">
            <div className="font-semibold text-[#18365A]">2. Malla Semántica</div>
            <p className="mt-1 text-slate-600">
              Coherencia <span className="font-mono">EPS012</span>/<span className="font-mono">EPSS12</span>, N33 REPS 12 dígitos, N21/N31/N32 Sisbén IV (A1–D21) y ventanas de plazo (RF-02).
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-3">
            <div className="font-semibold text-[#18365A]">3. Ajustes Determinísticos</div>
            <p className="mt-1 text-slate-600">
              Subsanación algorítmica directa en <span className="font-mono">GN0095, GN0340, GN0361, GN0368, GN0369, GN0421</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Tabla de Hallazgos */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
              {(['TODOS', 'NC', 'NS'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setArchFilter(opt)}
                  className={`px-2.5 py-1 text-xs font-medium rounded cursor-pointer ${
                    archFilter === opt ? 'bg-[#2B6CB0] text-white' : 'text-slate-700'
                  }`}
                >
                  {opt === 'TODOS' ? 'NC / NS' : opt}
                </button>
              ))}
            </div>

            <select
              value={mallaFilter}
              onChange={(e) =>
                setMallaFilter(e.target.value as 'TODAS' | 'SINTACTICA' | 'SEMANTICA')
              }
              className="border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white"
            >
              <option value="TODAS">Malla: Todas</option>
              <option value="SINTACTICA">Solo Malla Sintáctica</option>
              <option value="SEMANTICA">Solo Malla Semántica</option>
            </select>

            <select
              value={sevFilter}
              onChange={(e) =>
                setSevFilter(e.target.value as 'TODAS' | 'BLOQUEANTE' | 'ADVERTENCIA')
              }
              className="border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white"
            >
              <option value="TODAS">Severidad: Todas</option>
              <option value="BLOQUEANTE">Solo Bloqueantes</option>
              <option value="ADVERTENCIA">Solo Advertencias</option>
            </select>
          </div>

          <span className="text-xs text-slate-500 tabular-nums">
            Mostrando {Math.min(50, filteredIssues.length)} de {filteredIssues.length} hallazgos
          </span>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#E2E8F0] text-slate-800 font-semibold">
                  <th className="py-2.5 px-4">ID Reg.</th>
                  <th className="py-2.5 px-4">Arch. / Glosa</th>
                  <th className="py-2.5 px-4">Malla</th>
                  <th className="py-2.5 px-4">Campo</th>
                  <th className="py-2.5 px-4">Valor Actual</th>
                  <th className="py-2.5 px-4">Detalle de Validación</th>
                  <th className="py-2.5 px-4">Severidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredIssues.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-sm text-[#1E6B52] font-medium">
                      Sin errores sintácticos ni semánticos detectados. El 100% de registros cumple con la Resolución 762 de 2023.
                    </td>
                  </tr>
                ) : (
                  filteredIssues.slice(0, 50).map((issue, idx) => {
                    const rec = records.find((r) => r.id === issue.recordId);
                    return (
                      <tr
                        key={`${issue.recordId}-${issue.campo}-${idx}`}
                        onClick={() => rec && onSelectRecord(rec)}
                        className="hover:bg-slate-50 cursor-pointer"
                      >
                        <td className="py-2.5 px-4 font-mono font-semibold text-[#18365A] whitespace-nowrap">
                          {issue.recordId}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                          {issue.arch} · {issue.glosa}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {issue.tipoMalla}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-semibold text-[#2B6CB0]">
                          {issue.campo}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">
                          {issue.valorActual || '(vacío)'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">{issue.mensaje}</td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {issue.severidad === 'BLOQUEANTE' ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                              <AlertCircle className="w-3.5 h-3.5" />
                              BLOQUEANTE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-[#C06C1B]">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              ADVERTENCIA
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
