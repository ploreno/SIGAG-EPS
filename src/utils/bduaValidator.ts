import * as XLSX from 'xlsx';
import {
  CODIGOS_NOVEDAD_VALIDOS,
  DANE_MUNICIPIOS,
  GLOSAS_CATALOGO,
  IPS_REPS_ACTIVAS,
  routeAuxiliarOperativo,
  TIPOS_DOC_VALIDOS,
} from '../data/bduaCatalog';
import {
  EntidadCode,
  FileType,
  GlosaCatalogItem,
  GlosaRecord,
  PoblacionRecord,
  RecordStatus,
  ValidationIssue,
} from '../types/bdua';

const DATE_REGEX = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
const SISBEN_REGEX = /^[ABCD](0?[1-9]|1[0-9]|2[01])$/;

export function parseDateDDMMYYYY(value: string): Date | null {
  if (!DATE_REGEX.test(value)) return null;
  const [d, m, y] = value.split('/').map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return null;
  }
  return dt;
}

export function normalizeDateToBdua(value: string): string {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  if (DATE_REGEX.test(trimmed)) return trimmed;

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  // D/M/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return trimmed;
}

export function validateRecordRes762(
  record: GlosaRecord,
  rulesCatalog: GlosaCatalogItem[] = GLOSAS_CATALOGO
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. Entidad vs Archivo (Malla Semántica)
  if (record.arch === 'NC' && record.ENT !== 'EPS012') {
    issues.push({
      recordId: record.id,
      arch: record.arch,
      glosa: record.GLOSA,
      campo: 'ENT',
      tipoMalla: 'SEMANTICA',
      severidad: 'BLOQUEANTE',
      mensaje: 'Archivo NC debe corresponder estrictamente a entidad EPS012.',
      autoCorregible: true,
      valorActual: record.ENT,
    });
  }
  if (record.arch === 'NS' && record.ENT !== 'EPSS12') {
    issues.push({
      recordId: record.id,
      arch: record.arch,
      glosa: record.GLOSA,
      campo: 'ENT',
      tipoMalla: 'SEMANTICA',
      severidad: 'BLOQUEANTE',
      mensaje: 'Archivo NS debe corresponder estrictamente a entidad EPSS12.',
      autoCorregible: true,
      valorActual: record.ENT,
    });
  }

  // 2. Identificación y longitud de campos (Malla Sintáctica)
  if (!TIPOS_DOC_VALIDOS.includes(record.TP_DCTO_AF)) {
    issues.push({
      recordId: record.id,
      arch: record.arch,
      glosa: record.GLOSA,
      campo: 'TP_DCTO_AF',
      tipoMalla: 'SINTACTICA',
      severidad: 'BLOQUEANTE',
      mensaje: 'Tipo de documento no autorizado en Anexo Técnico Res. 762/2023.',
      autoCorregible: false,
      valorActual: record.TP_DCTO_AF,
    });
  }

  if (!/^[A-Z0-9]{3,16}$/i.test(record.NRO_DCTO_AF.trim())) {
    issues.push({
      recordId: record.id,
      arch: record.arch,
      glosa: record.GLOSA,
      campo: 'NRO_DCTO_AF',
      tipoMalla: 'SINTACTICA',
      severidad: 'BLOQUEANTE',
      mensaje: 'Número de documento debe ser alfanumérico entre 3 y 16 caracteres sin espacios.',
      autoCorregible: true,
      valorActual: record.NRO_DCTO_AF,
    });
  }

  if (!record.PRIMER_APLL.trim() || !record.PRIMER_NOMB.trim()) {
    issues.push({
      recordId: record.id,
      arch: record.arch,
      glosa: record.GLOSA,
      campo: '1ER_APLL / 1ER_NOMB',
      tipoMalla: 'SINTACTICA',
      severidad: 'BLOQUEANTE',
      mensaje: 'Primer apellido y primer nombre son obligatorios según Res. 762/2023.',
      autoCorregible: false,
      valorActual: `${record.PRIMER_APLL} ${record.PRIMER_NOMB}`,
    });
  }

  // 3. Fechas DD/MM/AAAA (Sintáctica + Semántica cronológica)
  const fchNac = parseDateDDMMYYYY(record.FCH_NACIM);
  if (!fchNac) {
    issues.push({
      recordId: record.id,
      arch: record.arch,
      glosa: record.GLOSA,
      campo: 'FCH_NACIM',
      tipoMalla: 'SINTACTICA',
      severidad: 'BLOQUEANTE',
      mensaje: 'Formato de fecha de nacimiento inválido; se requiere DD/MM/AAAA.',
      autoCorregible: /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(record.FCH_NACIM),
      valorActual: record.FCH_NACIM,
    });
  }

  const fchIni = parseDateDDMMYYYY(record.FCH_INI_NOV);
  if (!fchIni) {
    issues.push({
      recordId: record.id,
      arch: record.arch,
      glosa: record.GLOSA,
      campo: 'FCH_INI_NOV',
      tipoMalla: 'SINTACTICA',
      severidad: 'BLOQUEANTE',
      mensaje: 'Formato de fecha inicio novedad inválido; se requiere DD/MM/AAAA.',
      autoCorregible: /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(record.FCH_INI_NOV),
      valorActual: record.FCH_INI_NOV,
    });
  } else if (fchNac && fchIni < fchNac) {
    issues.push({
      recordId: record.id,
      arch: record.arch,
      glosa: record.GLOSA,
      campo: 'FCH_INI_NOV',
      tipoMalla: 'SEMANTICA',
      severidad: 'BLOQUEANTE',
      mensaje: 'FCH_INI_NOV no puede ser anterior a FCH_NACIM.',
      autoCorregible: false,
      valorActual: record.FCH_INI_NOV,
    });
  }

  // 4. Códigos DANE (COD_DPTO 2 dígitos, COD_MUNP 3 dígitos)
  if (!/^\d{2}$/.test(record.COD_DPTO) || !DANE_MUNICIPIOS[record.COD_DPTO]) {
    issues.push({
      recordId: record.id,
      arch: record.arch,
      glosa: record.GLOSA,
      campo: 'COD_DPTO',
      tipoMalla: 'SINTACTICA',
      severidad: 'BLOQUEANTE',
      mensaje: 'COD_DPTO debe ser de 2 dígitos y corresponder a departamento DANE válido (76/66).',
      autoCorregible: /^\d{1,2}$/.test(record.COD_DPTO.trim()),
      valorActual: record.COD_DPTO,
    });
  } else if (
    !/^\d{3}$/.test(record.COD_MUNP) ||
    !DANE_MUNICIPIOS[record.COD_DPTO]?.[record.COD_MUNP]
  ) {
    const padded = record.COD_MUNP.trim().padStart(3, '0');
    const canFix = Boolean(DANE_MUNICIPIOS[record.COD_DPTO]?.[padded]);
    issues.push({
      recordId: record.id,
      arch: record.arch,
      glosa: record.GLOSA,
      campo: 'COD_MUNP',
      tipoMalla: 'SINTACTICA',
      severidad: 'BLOQUEANTE',
      mensaje: `COD_MUNP '${record.COD_MUNP}' debe tener 3 dígitos válidos para DANE ${record.COD_DPTO}.`,
      autoCorregible: canFix,
      valorActual: record.COD_MUNP,
    });
  }

  // 5. Consistencia COD_NOV y VLR1..VLR7 (Malla Semántica)
  if (!CODIGOS_NOVEDAD_VALIDOS.includes(record.COD_NOV)) {
    issues.push({
      recordId: record.id,
      arch: record.arch,
      glosa: record.GLOSA,
      campo: 'COD_NOV',
      tipoMalla: 'SEMANTICA',
      severidad: 'BLOQUEANTE',
      mensaje: `Código de novedad '${record.COD_NOV}' no reconocido en Res. 762/2023.`,
      autoCorregible: false,
      valorActual: record.COD_NOV,
    });
  }

  if (record.COD_NOV === 'N04') {
    if (!record.VLR1 || !record.VLR2) {
      issues.push({
        recordId: record.id,
        arch: record.arch,
        glosa: record.GLOSA,
        campo: 'VLR1 / VLR2',
        tipoMalla: 'SEMANTICA',
        severidad: 'BLOQUEANTE',
        mensaje: 'Novedad N04 exige COD_DPTO en VLR1 y COD_MUNP en VLR2.',
        autoCorregible: true,
        valorActual: `${record.VLR1}/${record.VLR2}`,
      });
    }
  } else if (record.COD_NOV === 'N33') {
    if (!/^\d{12}$/.test(record.VLR1.trim())) {
      issues.push({
        recordId: record.id,
        arch: record.arch,
        glosa: record.GLOSA,
        campo: 'VLR1',
        tipoMalla: 'SEMANTICA',
        severidad: 'BLOQUEANTE',
        mensaje: 'Novedad N33 exige código de habilitación IPS REPS de 12 dígitos en VLR1.',
        autoCorregible: true,
        valorActual: record.VLR1 || '(vacío)',
      });
    }
  } else if (
    (record.COD_NOV === 'N21' || record.COD_NOV === 'N31' || record.COD_NOV === 'N32') &&
    record.arch === 'NS'
  ) {
    if (!SISBEN_REGEX.test(record.VLR1.trim().toUpperCase())) {
      issues.push({
        recordId: record.id,
        arch: record.arch,
        glosa: record.GLOSA,
        campo: 'VLR1',
        tipoMalla: 'SEMANTICA',
        severidad: 'BLOQUEANTE',
        mensaje: `Novedad ${record.COD_NOV} en NS requiere subgrupo Sisbén IV válido (A1–D21) en VLR1.`,
        autoCorregible: false,
        valorActual: record.VLR1 || '(vacío)',
      });
    }
  } else if ((record.COD_NOV === 'N01' || record.COD_NOV === 'N02') && !record.VLR1.trim()) {
    issues.push({
      recordId: record.id,
      arch: record.arch,
      glosa: record.GLOSA,
      campo: 'VLR1',
      tipoMalla: 'SEMANTICA',
      severidad: 'ADVERTENCIA',
      mensaje: `Novedad ${record.COD_NOV} recomienda valor de corrección explícito en VLR1.`,
      autoCorregible: true,
      valorActual: record.VLR1 || '(vacío)',
    });
  }

  // 6. Regla especial GN0258 / GN0297 y ventana de plazo parametrizada (RF-02 / RF-03)
  if (
    (record.GLOSA === 'GN0258' || record.GLOSA === 'GN0297') &&
    (record.arch !== 'NS' || !['N21', 'N31', 'N32'].includes(record.COD_NOV))
  ) {
    issues.push({
      recordId: record.id,
      arch: record.arch,
      glosa: record.GLOSA,
      campo: 'GLOSA / COD_NOV',
      tipoMalla: 'SEMANTICA',
      severidad: 'ADVERTENCIA',
      mensaje: `${record.GLOSA} aplica exclusivamente a NS (EPSS12) en novedades N21, N31 y N32.`,
      autoCorregible: false,
      valorActual: `${record.arch} / ${record.COD_NOV}`,
    });
  }

  const rule = rulesCatalog.find((r) => r.codigo === record.GLOSA);
  if (rule && record.GLOSA === 'GN0361' && fchIni) {
    const cycleRef = new Date(2026, 10, 1); // 01/11/2026
    const diffDays = Math.floor((cycleRef.getTime() - fchIni.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > rule.ventanaPlazoDias) {
      issues.push({
        recordId: record.id,
        arch: record.arch,
        glosa: record.GLOSA,
        campo: 'FCH_INI_NOV',
        tipoMalla: 'SEMANTICA',
        severidad: 'BLOQUEANTE',
        mensaje: `FCH_INI_NOV excede la ventana parametrizada de ${rule.ventanaPlazoDias} días (Dec. 780).`,
        autoCorregible: true,
        valorActual: record.FCH_INI_NOV,
      });
    }
  }

  return issues;
}

export const DETERMINISTIC_GLOSAS = [
  'GN0095',
  'GN0340',
  'GN0361',
  'GN0368',
  'GN0369',
  'GN0421',
] as const;

export function applyDeterministicEngine(
  records: GlosaRecord[],
  poblacionMap: Map<string, PoblacionRecord>,
  rulesCatalog: GlosaCatalogItem[]
): { updatedRecords: GlosaRecord[]; adjustedCount: number } {
  const ruleByCode = new Map(rulesCatalog.map((r) => [r.codigo, r]));
  let adjustedCount = 0;

  const updatedRecords = records.map((rec) => {
    if (!DETERMINISTIC_GLOSAS.includes(rec.GLOSA as (typeof DETERMINISTIC_GLOSAS)[number])) {
      return rec;
    }
    const rule = ruleByCode.get(rec.GLOSA);
    if (rule && !rule.autoAjusteActivo) {
      return rec;
    }

    const pob =
      poblacionMap.get(`${rec.TP_DCTO_AF}-${rec.NRO_DCTO_AF}`) ||
      poblacionMap.get(rec.NRO_DCTO_AF);
    const fixed = autoFixRecordSyntax(rec, poblacionMap);
    let changed = false;

    if (rec.GLOSA === 'GN0361') {
      if (fixed.FCH_INI_NOV !== '01/11/2026' || rec.estado !== 'LISTO') {
        fixed.FCH_INI_NOV = '01/11/2026';
        fixed.accionSigag = `Ajuste auto ciclo (${rule?.ventanaPlazoDias ?? 60}d)`;
        fixed.estado = 'LISTO';
        fixed.auxiliarAsignado = 'Motor Algorítmico';
        changed = true;
      }
    } else if (rec.GLOSA === 'GN0421') {
      if (fixed.FCH_INI_NOV !== '01/12/2026' || rec.estado !== 'LISTO') {
        fixed.FCH_INI_NOV = '01/12/2026';
        fixed.accionSigag = 'Ajuste día 1 mes sig.';
        fixed.estado = 'LISTO';
        fixed.auxiliarAsignado = 'Motor Algorítmico';
        changed = true;
      }
    } else if (rec.GLOSA === 'GN0340') {
      const ipsList = IPS_REPS_ACTIVAS[fixed.COD_DPTO] || IPS_REPS_ACTIVAS['76'];
      const targetIps = pob?.IPS_PRIMARIA || ipsList[0].codigo;
      if (fixed.VLR1 !== targetIps || rec.estado !== 'LISTO') {
        fixed.VLR1 = targetIps;
        fixed.accionSigag = 'Reasignación IPS REPS';
        fixed.estado = 'LISTO';
        fixed.auxiliarAsignado = 'Motor Algorítmico';
        changed = true;
      }
    } else if (rec.GLOSA === 'GN0095') {
      if (rec.estado !== 'LISTO') {
        fixed.accionSigag = 'Depuración último ciclo';
        fixed.estado = 'LISTO';
        fixed.auxiliarAsignado = 'Motor Algorítmico';
        changed = true;
      }
    } else if (rec.GLOSA === 'GN0368') {
      if (rec.estado !== 'LISTO') {
        fixed.COD_NOV = fixed.arch === 'NS' ? 'N20' : 'N17';
        fixed.VLR1 = fixed.VLR1 || 'EPS005';
        fixed.VLR2 = fixed.arch === 'NS' ? 'S' : 'C';
        fixed.accionSigag = 'Ajuste auto movilidad BDUA';
        fixed.estado = 'LISTO';
        fixed.auxiliarAsignado = 'Motor Algorítmico';
        changed = true;
      }
    } else if (rec.GLOSA === 'GN0369') {
      if (rec.estado !== 'LISTO') {
        fixed.VLR1 = fixed.arch === 'NC' ? 'C' : 'S';
        fixed.accionSigag = 'Recodificación régimen NC/NS';
        fixed.estado = 'LISTO';
        fixed.auxiliarAsignado = 'Motor Algorítmico';
        changed = true;
      }
    }

    if (changed) adjustedCount++;
    return fixed;
  });

  return { updatedRecords, adjustedCount };
}

export function autoFixRecordSyntax(
  record: GlosaRecord,
  poblacionMap: Map<string, PoblacionRecord>
): GlosaRecord {
  const updated: GlosaRecord = { ...record };

  updated.ENT = updated.arch === 'NC' ? 'EPS012' : 'EPSS12';
  updated.TP_DCTO_AF = updated.TP_DCTO_AF.trim().toUpperCase();
  updated.NRO_DCTO_AF = updated.NRO_DCTO_AF.replace(/\s+/g, '').toUpperCase();
  updated.PRIMER_APLL = updated.PRIMER_APLL.trim().toUpperCase();
  updated.SEGUNDO_APELL = updated.SEGUNDO_APELL.trim().toUpperCase();
  updated.PRIMER_NOMB = updated.PRIMER_NOMB.trim().toUpperCase();
  updated.SEGUNDO_NOMB = updated.SEGUNDO_NOMB.trim().toUpperCase();
  updated.FCH_NACIM = normalizeDateToBdua(updated.FCH_NACIM);
  updated.FCH_INI_NOV = normalizeDateToBdua(updated.FCH_INI_NOV) || '01/11/2026';
  updated.COD_DPTO = updated.COD_DPTO.trim().padStart(2, '0');
  updated.COD_MUNP = updated.COD_MUNP.trim().padStart(3, '0');

  const pob = poblacionMap.get(`${updated.TP_DCTO_AF}-${updated.NRO_DCTO_AF}`) ||
    poblacionMap.get(updated.NRO_DCTO_AF);

  if (updated.COD_NOV === 'N04') {
    updated.VLR1 = updated.COD_DPTO;
    updated.VLR2 = updated.COD_MUNP;
    updated.VLR3 = updated.VLR3 || 'U';
  } else if (updated.COD_NOV === 'N33' && !/^\d{12}$/.test(updated.VLR1)) {
    const ipsList = IPS_REPS_ACTIVAS[updated.COD_DPTO] || IPS_REPS_ACTIVAS['76'];
    updated.VLR1 = pob?.IPS_PRIMARIA || ipsList[0].codigo;
  } else if (
    (updated.COD_NOV === 'N21' || updated.COD_NOV === 'N31' || updated.COD_NOV === 'N32') &&
    updated.arch === 'NS' &&
    !SISBEN_REGEX.test(updated.VLR1) &&
    pob?.SUBGRUPO_SISBEN &&
    SISBEN_REGEX.test(pob.SUBGRUPO_SISBEN)
  ) {
    updated.VLR1 = pob.SUBGRUPO_SISBEN;
    updated.VLR2 = 'IV';
  } else if ((updated.COD_NOV === 'N01' || updated.COD_NOV === 'N02') && !updated.VLR1) {
    updated.VLR1 = updated.COD_NOV === 'N01' ? updated.PRIMER_APLL : updated.FCH_NACIM;
  }

  return updated;
}

export function diagnoseAndClassifyRow(
  raw: Partial<GlosaRecord>,
  index: number,
  poblacionMap: Map<string, PoblacionRecord>,
  fallbackArch?: FileType
): GlosaRecord {
  const entRaw = String(raw.ENT || '').trim().toUpperCase();
  const arch: FileType =
    entRaw === 'EPSS12' ? 'NS' : entRaw === 'EPS012' ? 'NC' : fallbackArch || 'NC';
  const ent: EntidadCode = arch === 'NC' ? 'EPS012' : 'EPSS12';

  const tpDoc = String(raw.TP_DCTO_AF || 'CC').trim().toUpperCase();
  const nroDoc = String(raw.NRO_DCTO_AF || '').replace(/\s+/g, '').toUpperCase();
  const glosa = String(raw.GLOSA || raw.GLOSA_PRINCIPAL || 'GN0501').trim().toUpperCase();
  const glosaPrincipal = String(raw.GLOSA_PRINCIPAL || glosa).trim().toUpperCase();
  const codNov = String(raw.COD_NOV || 'N04').trim().toUpperCase();

  const pob = poblacionMap.get(`${tpDoc}-${nroDoc}`) || poblacionMap.get(nroDoc);
  const catalogMatch = GLOSAS_CATALOGO.find((g) => g.codigo === glosa);

  let dpto = String(raw.COD_DPTO || pob?.COD_DPTO || '76').trim().padStart(2, '0');
  if (!DANE_MUNICIPIOS[dpto]) dpto = pob?.COD_DPTO || '76';
  let munp = String(raw.COD_MUNP || pob?.COD_MUNP || '001').trim().padStart(3, '0');

  let vlr1 = String(raw.VLR1 || '').trim();
  let vlr2 = String(raw.VLR2 || '').trim();
  let vlr3 = String(raw.VLR3 || '').trim();
  let fchIniNov = normalizeDateToBdua(String(raw.FCH_INI_NOV || '01/11/2026'));

  let diagnostico = catalogMatch?.nombre || `Glosa BDUA ${glosa}`;
  let accion = 'Validación algorítmica';
  let estado: RecordStatus = 'PENDIENTE';

  // Reglas algorítmicas SIGAG-EPS
  if (glosa === 'GN0361') {
    diagnostico = 'Fecha > 2 meses (Dec. 780)';
    accion = 'Ajuste auto fecha ciclo';
    fchIniNov = '01/11/2026';
    estado = 'LISTO';
  } else if (glosa === 'GN0421') {
    diagnostico = 'Periodo ya compensado';
    accion = 'Ajuste día 1 mes sig.';
    fchIniNov = '01/12/2026';
    estado = 'LISTO';
  } else if (glosa === 'GN0340') {
    diagnostico = 'IPS Primaria inactiva REPS';
    accion = 'Reasignación IPS REPS';
    const ipsPool = IPS_REPS_ACTIVAS[dpto] || IPS_REPS_ACTIVAS['76'];
    vlr1 = pob?.IPS_PRIMARIA || ipsPool[0].codigo;
    estado = 'LISTO';
  } else if (glosa === 'GN0060') {
    diagnostico = 'Código DANE incompleto';
    accion = 'Normalización DANE 3 díg.';
    if (DANE_MUNICIPIOS[dpto]?.[munp]) {
      estado = 'LISTO';
    } else if (pob) {
      dpto = pob.COD_DPTO;
      munp = pob.COD_MUNP;
      estado = 'LISTO';
    } else {
      estado = 'REVISIÓN';
    }
  } else if (glosa === 'GN0258' || glosa === 'GN0297') {
    diagnostico =
      glosa === 'GN0258' ? 'Subgrupo Sisbén IV inválido' : 'Inconsistencia Sisbén IV N31/N32';
    if (arch === 'NS' && ['N21', 'N31', 'N32'].includes(codNov)) {
      if (pob && SISBEN_REGEX.test(pob.SUBGRUPO_SISBEN)) {
        vlr1 = pob.SUBGRUPO_SISBEN;
        vlr2 = 'IV';
        accion = 'Validación SISBÉN/Retiro';
        estado = 'REVISIÓN';
      } else {
        accion = 'Validación SISBÉN/Retiro';
        estado = 'REVISIÓN';
      }
    } else {
      accion = 'Verificar regla NS (N21/N31/N32)';
      estado = 'REVISIÓN';
    }
  } else if (glosa === 'GN0169' || glosa === 'GN0059') {
    diagnostico =
      glosa === 'GN0169' ? 'Discrepancia nombre RNEC' : 'Diferencia FCH_NACIM RNEC';
    accion = 'Derivado Aux. + SMS';
    estado = 'PENDIENTE';
  } else if (catalogMatch?.resolubleAutoPoblacion && pob) {
    accion = 'Subsanación cruce POBLACION';
    estado = 'LISTO';
  } else if (catalogMatch?.resolubleAutoPoblacion) {
    accion = 'Subsanación algorítmica';
    estado = 'LISTO';
  } else {
    accion = 'Gestión Auxiliar Aseguramiento';
    estado = 'PENDIENTE';
  }

  const cnstvo = String(raw.CNSTVO || 90000 + index).trim();
  return {
    id: raw.id || `REG-${cnstvo}`,
    arch,
    CNSTVO: cnstvo,
    ENT: ent,
    TP_DCTO_AF: tpDoc,
    NRO_DCTO_AF: nroDoc,
    PRIMER_APLL: String(raw.PRIMER_APLL || pob?.PRIMER_APLL || '').trim().toUpperCase(),
    SEGUNDO_APELL: String(raw.SEGUNDO_APELL || pob?.SEGUNDO_APELL || '').trim().toUpperCase(),
    PRIMER_NOMB: String(raw.PRIMER_NOMB || pob?.PRIMER_NOMB || '').trim().toUpperCase(),
    SEGUNDO_NOMB: String(raw.SEGUNDO_NOMB || pob?.SEGUNDO_NOMB || '').trim().toUpperCase(),
    FCH_NACIM: normalizeDateToBdua(String(raw.FCH_NACIM || pob?.FCH_NACIM || '01/01/1990')),
    COD_DPTO: dpto,
    COD_MUNP: munp,
    COD_NOV: codNov,
    FCH_INI_NOV: fchIniNov,
    VLR1: vlr1,
    VLR2: vlr2,
    VLR3: vlr3,
    VLR4: String(raw.VLR4 || '').trim(),
    VLR5: String(raw.VLR5 || '').trim(),
    VLR6: String(raw.VLR6 || '').trim(),
    VLR7: String(raw.VLR7 || '').trim(),
    GLOSA: glosa,
    GLOSA_PRINCIPAL: glosaPrincipal,
    diagnosticoAlgoritmico: diagnostico,
    accionSigag: accion,
    estado,
    auxiliarAsignado: routeAuxiliarOperativo(dpto, glosa, estado),
    crucePoblacion: Boolean(pob),
    requiereSms: Boolean(catalogMatch?.requiereSoporteUsuario),
    smsStatus: pob?.CELULAR ? 'Sin enviar' : 'Sin celular',
    smsEnviosCount: 0,
  };
}

export function parseAdResRawText(
  text: string,
  poblacionMap: Map<string, PoblacionRecord>,
  fallbackArch: FileType = 'NC'
): GlosaRecord[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];
  const delimiter = lines[0].includes(';') ? ';' : ',';
  const firstCols = lines[0].split(delimiter).map((c) => c.trim().toUpperCase());
  const hasHeader = firstCols.includes('TP_DCTO_AF') || firstCols.includes('CNSTVO');
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const headers = hasHeader ? firstCols : [...BDUA_20_HEADERS, 'GLOSA', 'GLOSA_PRINCIPAL'];

  return dataLines.map((line, idx) => {
    const cols = line.split(delimiter).map((c) => c.trim());
    const getCol = (name: string, pos: number) => {
      const hIdx = headers.indexOf(name);
      return hIdx >= 0 ? cols[hIdx] ?? '' : cols[pos] ?? '';
    };

    return diagnoseAndClassifyRow(
      {
        CNSTVO: getCol('CNSTVO', 0),
        ENT: getCol('ENT', 1) as EntidadCode,
        TP_DCTO_AF: getCol('TP_DCTO_AF', 2),
        NRO_DCTO_AF: getCol('NRO_DCTO_AF', 3),
        PRIMER_APLL: getCol('1ER_APLL', 4),
        SEGUNDO_APELL: getCol('2DO_APELL', 5),
        PRIMER_NOMB: getCol('1ER_NOMB', 6),
        SEGUNDO_NOMB: getCol('2DO_NOMB', 7),
        FCH_NACIM: getCol('FCH_NACIM', 8),
        COD_DPTO: getCol('COD_DPTO', 9),
        COD_MUNP: getCol('COD_MUNP', 10),
        COD_NOV: getCol('COD_NOV', 11),
        FCH_INI_NOV: getCol('FCH_INI_NOV', 12),
        VLR1: getCol('VLR1', 13),
        VLR2: getCol('VLR2', 14),
        VLR3: getCol('VLR3', 15),
        VLR4: getCol('VLR4', 16),
        VLR5: getCol('VLR5', 17),
        VLR6: getCol('VLR6', 18),
        VLR7: getCol('VLR7', 19),
        GLOSA: getCol('GLOSA', 20) || 'GN0501',
        GLOSA_PRINCIPAL: getCol('GLOSA_PRINCIPAL', 21) || getCol('GLOSA', 20) || 'GN0501',
      },
      idx,
      poblacionMap,
      fallbackArch
    );
  });
}

export const BDUA_20_HEADERS = [
  'CNSTVO',
  'ENT',
  'TP_DCTO_AF',
  'NRO_DCTO_AF',
  '1ER_APLL',
  '2DO_APELL',
  '1ER_NOMB',
  '2DO_NOMB',
  'FCH_NACIM',
  'COD_DPTO',
  'COD_MUNP',
  'COD_NOV',
  'FCH_INI_NOV',
  'VLR1',
  'VLR2',
  'VLR3',
  'VLR4',
  'VLR5',
  'VLR6',
  'VLR7',
];

export function formatRecordAsBduaTxtLine(record: GlosaRecord): string {
  const fields = [
    record.CNSTVO,
    record.ENT,
    record.TP_DCTO_AF,
    record.NRO_DCTO_AF,
    record.PRIMER_APLL,
    record.SEGUNDO_APELL,
    record.PRIMER_NOMB,
    record.SEGUNDO_NOMB,
    record.FCH_NACIM,
    record.COD_DPTO,
    record.COD_MUNP,
    record.COD_NOV,
    record.FCH_INI_NOV,
    record.VLR1,
    record.VLR2,
    record.VLR3,
    record.VLR4,
    record.VLR5,
    record.VLR6,
    record.VLR7,
  ];
  return fields.map((v) => String(v ?? '').replace(/,/g, ' ').trim()).join(',');
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadFinalExcelWorkbook(
  ncRecords: GlosaRecord[],
  nsRecords: GlosaRecord[],
  filename: string
): void {
  const toSheetRows = (list: GlosaRecord[]) =>
    list.map((r) => ({
      CNSTVO: r.CNSTVO,
      ENT: r.ENT,
      TP_DCTO_AF: r.TP_DCTO_AF,
      NRO_DCTO_AF: r.NRO_DCTO_AF,
      '1ER_APLL': r.PRIMER_APLL,
      '2DO_APELL': r.SEGUNDO_APELL,
      '1ER_NOMB': r.PRIMER_NOMB,
      '2DO_NOMB': r.SEGUNDO_NOMB,
      FCH_NACIM: r.FCH_NACIM,
      COD_DPTO: r.COD_DPTO,
      COD_MUNP: r.COD_MUNP,
      COD_NOV: r.COD_NOV,
      FCH_INI_NOV: r.FCH_INI_NOV,
      VLR1: r.VLR1,
      VLR2: r.VLR2,
      VLR3: r.VLR3,
      VLR4: r.VLR4,
      VLR5: r.VLR5,
      VLR6: r.VLR6,
      VLR7: r.VLR7,
      GLOSA_ORIGEN: r.GLOSA,
      ESTADO_SIGAG: r.estado,
    }));

  const wb = XLSX.utils.book_new();
  const wsNC = XLSX.utils.json_to_sheet(toSheetRows(ncRecords));
  const wsNS = XLSX.utils.json_to_sheet(toSheetRows(nsRecords));
  const wsResumen = XLSX.utils.json_to_sheet([
    { Archivo: 'NC (Contributivo)', Entidad: 'EPS012', Registros_Listos: ncRecords.length },
    { Archivo: 'NS (Subsidiado)', Entidad: 'EPSS12', Registros_Listos: nsRecords.length },
    {
      Archivo: 'TOTAL COMPILADO',
      Entidad: 'EPS012 + EPSS12',
      Registros_Listos: ncRecords.length + nsRecords.length,
    },
  ]);

  XLSX.utils.book_append_sheet(wb, wsNC, 'NC_EPS012');
  XLSX.utils.book_append_sheet(wb, wsNS, 'NS_EPSS12');
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
  XLSX.writeFile(wb, filename);
}

export async function parseAdResUploadFile(
  file: File,
  poblacionMap: Map<string, PoblacionRecord>
): Promise<GlosaRecord[]> {
  const lower = file.name.toLowerCase();
  const fallbackArch: FileType = lower.includes('ns') || lower.includes('epss12') ? 'NS' : 'NC';

  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });

    return jsonRows.map((row, idx) =>
      diagnoseAndClassifyRow(
        {
          CNSTVO: String(row['CNSTVO'] ?? idx + 1),
          ENT: String(row['ENT'] ?? (fallbackArch === 'NC' ? 'EPS012' : 'EPSS12')) as EntidadCode,
          TP_DCTO_AF: String(row['TP_DCTO_AF'] ?? ''),
          NRO_DCTO_AF: String(row['NRO_DCTO_AF'] ?? ''),
          PRIMER_APLL: String(row['1ER_APLL'] ?? row['PRIMER_APLL'] ?? ''),
          SEGUNDO_APELL: String(row['2DO_APELL'] ?? row['SEGUNDO_APELL'] ?? ''),
          PRIMER_NOMB: String(row['1ER_NOMB'] ?? row['PRIMER_NOMB'] ?? ''),
          SEGUNDO_NOMB: String(row['2DO_NOMB'] ?? row['SEGUNDO_NOMB'] ?? ''),
          FCH_NACIM: String(row['FCH_NACIM'] ?? ''),
          COD_DPTO: String(row['COD_DPTO'] ?? ''),
          COD_MUNP: String(row['COD_MUNP'] ?? ''),
          COD_NOV: String(row['COD_NOV'] ?? ''),
          FCH_INI_NOV: String(row['FCH_INI_NOV'] ?? ''),
          VLR1: String(row['VLR1'] ?? ''),
          VLR2: String(row['VLR2'] ?? ''),
          VLR3: String(row['VLR3'] ?? ''),
          VLR4: String(row['VLR4'] ?? ''),
          VLR5: String(row['VLR5'] ?? ''),
          VLR6: String(row['VLR6'] ?? ''),
          VLR7: String(row['VLR7'] ?? ''),
          GLOSA: String(row['GLOSA'] ?? row['GLOSA_PRINCIPAL'] ?? 'GN0501'),
          GLOSA_PRINCIPAL: String(row['GLOSA_PRINCIPAL'] ?? row['GLOSA'] ?? 'GN0501'),
        },
        idx,
        poblacionMap,
        fallbackArch
      )
    );
  }

  // CSV or TXT
  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const firstCols = lines[0].split(delimiter).map((c) => c.trim().toUpperCase());
  const hasHeader = firstCols.includes('TP_DCTO_AF') || firstCols.includes('CNSTVO');
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const headers = hasHeader ? firstCols : [...BDUA_20_HEADERS, 'GLOSA', 'GLOSA_PRINCIPAL'];

  return dataLines.map((line, idx) => {
    const cols = line.split(delimiter).map((c) => c.trim());
    const getCol = (name: string, pos: number) => {
      const hIdx = headers.indexOf(name);
      return hIdx >= 0 ? cols[hIdx] ?? '' : cols[pos] ?? '';
    };

    return diagnoseAndClassifyRow(
      {
        CNSTVO: getCol('CNSTVO', 0),
        ENT: getCol('ENT', 1) as EntidadCode,
        TP_DCTO_AF: getCol('TP_DCTO_AF', 2),
        NRO_DCTO_AF: getCol('NRO_DCTO_AF', 3),
        PRIMER_APLL: getCol('1ER_APLL', 4),
        SEGUNDO_APELL: getCol('2DO_APELL', 5),
        PRIMER_NOMB: getCol('1ER_NOMB', 6),
        SEGUNDO_NOMB: getCol('2DO_NOMB', 7),
        FCH_NACIM: getCol('FCH_NACIM', 8),
        COD_DPTO: getCol('COD_DPTO', 9),
        COD_MUNP: getCol('COD_MUNP', 10),
        COD_NOV: getCol('COD_NOV', 11),
        FCH_INI_NOV: getCol('FCH_INI_NOV', 12),
        VLR1: getCol('VLR1', 13),
        VLR2: getCol('VLR2', 14),
        VLR3: getCol('VLR3', 15),
        VLR4: getCol('VLR4', 16),
        VLR5: getCol('VLR5', 17),
        VLR6: getCol('VLR6', 18),
        VLR7: getCol('VLR7', 19),
        GLOSA: getCol('GLOSA', 20) || 'GN0501',
        GLOSA_PRINCIPAL: getCol('GLOSA_PRINCIPAL', 21) || getCol('GLOSA', 20) || 'GN0501',
      },
      idx,
      poblacionMap,
      fallbackArch
    );
  });
}

export async function parsePoblacionUploadFile(file: File): Promise<PoblacionRecord[]> {
  const lower = file.name.toLowerCase();
  let rows: Record<string, unknown>[] = [];

  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
  } else {
    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) return [];
    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map((h) => h.trim().toUpperCase());
    rows = lines.slice(1).map((line) => {
      const cols = line.split(delimiter).map((c) => c.trim());
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        obj[h] = cols[i] ?? '';
      });
      return obj;
    });
  }

  return rows
    .filter((r) => String(r['NRO_DCTO_AF'] ?? '').trim() !== '')
    .map((r) => {
      const dpto = String(r['COD_DPTO'] ?? '76').trim().padStart(2, '0');
      const munp = String(r['COD_MUNP'] ?? '001').trim().padStart(3, '0');
      return {
        TP_DCTO_AF: String(r['TP_DCTO_AF'] ?? 'CC').trim().toUpperCase(),
        NRO_DCTO_AF: String(r['NRO_DCTO_AF'] ?? '').trim().toUpperCase(),
        PRIMER_APLL: String(r['1ER_APLL'] ?? r['PRIMER_APLL'] ?? '').trim().toUpperCase(),
        SEGUNDO_APELL: String(r['2DO_APELL'] ?? r['SEGUNDO_APELL'] ?? '').trim().toUpperCase(),
        PRIMER_NOMB: String(r['1ER_NOMB'] ?? r['PRIMER_NOMB'] ?? '').trim().toUpperCase(),
        SEGUNDO_NOMB: String(r['2DO_NOMB'] ?? r['SEGUNDO_NOMB'] ?? '').trim().toUpperCase(),
        FCH_NACIM: normalizeDateToBdua(String(r['FCH_NACIM'] ?? '01/01/1990')),
        COD_DPTO: dpto,
        COD_MUNP: munp,
        MUNICIPIO:
          String(r['MUNICIPIO'] ?? '').trim() || DANE_MUNICIPIOS[dpto]?.[munp] || 'Municipio DANE',
        DEPARTAMENTO:
          String(r['DEPARTAMENTO'] ?? '').trim() ||
          (dpto === '66' ? 'Risaralda' : 'Valle del Cauca'),
        CELULAR: String(r['CELULAR'] ?? '').trim(),
        CORREO_ELECTRONICO: String(r['CORREO_ELECTRONICO'] ?? '').trim(),
        SUBGRUPO_SISBEN: String(r['SUBGRUPO_SISBEN'] ?? 'N/A').trim().toUpperCase(),
        ESTADO_AFILIACION: (String(r['ESTADO_AFILIACION'] ?? 'AC').trim().toUpperCase() ||
          'AC') as 'AC' | 'RE' | 'AF' | 'PL',
        IPS_PRIMARIA: String(r['IPS_PRIMARIA'] ?? '760010012301').trim(),
        REGIMEN: (String(r['REGIMEN'] ?? 'S').trim().toUpperCase() === 'C' ? 'C' : 'S') as
          | 'C'
          | 'S',
      };
    });
}

export function downloadTemplateAdResXlsx(): void {
  const sampleRows = [
    {
      CNSTVO: '90001',
      ENT: 'EPS012',
      TP_DCTO_AF: 'CC',
      NRO_DCTO_AF: '1144089231',
      '1ER_APLL': 'RESTREPO',
      '2DO_APELL': 'VALENCIA',
      '1ER_NOMB': 'CARLOS',
      '2DO_NOMB': 'ANDRES',
      FCH_NACIM: '14/05/1991',
      COD_DPTO: '76',
      COD_MUNP: '001',
      COD_NOV: 'N04',
      FCH_INI_NOV: '01/08/2026',
      VLR1: '76',
      VLR2: '001',
      VLR3: 'U',
      VLR4: '',
      VLR5: '',
      VLR6: '',
      VLR7: '',
      GLOSA: 'GN0361',
      GLOSA_PRINCIPAL: 'GN0361',
    },
    {
      CNSTVO: '90002',
      ENT: 'EPSS12',
      TP_DCTO_AF: 'CC',
      NRO_DCTO_AF: '31984512',
      '1ER_APLL': 'GOMES',
      '2DO_APELL': 'LONDONO',
      '1ER_NOMB': 'MARTHA',
      '2DO_NOMB': 'LUCIA',
      FCH_NACIM: '22/08/1978',
      COD_DPTO: '76',
      COD_MUNP: '520',
      COD_NOV: 'N01',
      FCH_INI_NOV: '01/11/2026',
      VLR1: 'GOMEZ',
      VLR2: 'LONDOÑO',
      VLR3: 'MARTHA',
      VLR4: 'LUCIA',
      VLR5: '',
      VLR6: '',
      VLR7: '',
      GLOSA: 'GN0169',
      GLOSA_PRINCIPAL: 'GN0169',
    },
    {
      CNSTVO: '90003',
      ENT: 'EPSS12',
      TP_DCTO_AF: 'CC',
      NRO_DCTO_AF: '42119044',
      '1ER_APLL': 'SALAZAR',
      '2DO_APELL': 'HENAO',
      '1ER_NOMB': 'LUZ',
      '2DO_NOMB': 'MARINA',
      FCH_NACIM: '19/02/1983',
      COD_DPTO: '66',
      COD_MUNP: '170',
      COD_NOV: 'N31',
      FCH_INI_NOV: '01/11/2026',
      VLR1: 'X99',
      VLR2: 'IV',
      VLR3: '',
      VLR4: '',
      VLR5: '',
      VLR6: '',
      VLR7: '',
      GLOSA: 'GN0258',
      GLOSA_PRINCIPAL: 'GN0258',
    },
    {
      CNSTVO: '90004',
      ENT: 'EPS012',
      TP_DCTO_AF: 'CC',
      NRO_DCTO_AF: '1113672910',
      '1ER_APLL': 'CAICEDO',
      '2DO_APELL': 'MINA',
      '1ER_NOMB': 'JHON',
      '2DO_NOMB': 'EDINSON',
      FCH_NACIM: '09/07/1996',
      COD_DPTO: '76',
      COD_MUNP: '109',
      COD_NOV: 'N33',
      FCH_INI_NOV: '01/11/2026',
      VLR1: '761090000000',
      VLR2: '',
      VLR3: '',
      VLR4: '',
      VLR5: '',
      VLR6: '',
      VLR7: '',
      GLOSA: 'GN0340',
      GLOSA_PRINCIPAL: 'GN0340',
    },
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Resp_ADRES');
  XLSX.writeFile(wb, 'Plantilla_Respuesta_ADRES_20Cols.xlsx');
}

export function downloadTemplatePoblacionXlsx(poblacion: PoblacionRecord[]): void {
  const rows = poblacion.slice(0, 12).map((p) => ({
    TP_DCTO_AF: p.TP_DCTO_AF,
    NRO_DCTO_AF: p.NRO_DCTO_AF,
    '1ER_APLL': p.PRIMER_APLL,
    '2DO_APELL': p.SEGUNDO_APELL,
    '1ER_NOMB': p.PRIMER_NOMB,
    '2DO_NOMB': p.SEGUNDO_NOMB,
    FCH_NACIM: p.FCH_NACIM,
    COD_DPTO: p.COD_DPTO,
    COD_MUNP: p.COD_MUNP,
    MUNICIPIO: p.MUNICIPIO,
    DEPARTAMENTO: p.DEPARTAMENTO,
    CELULAR: p.CELULAR,
    CORREO_ELECTRONICO: p.CORREO_ELECTRONICO,
    SUBGRUPO_SISBEN: p.SUBGRUPO_SISBEN,
    ESTADO_AFILIACION: p.ESTADO_AFILIACION,
    IPS_PRIMARIA: p.IPS_PRIMARIA,
    REGIMEN: p.REGIMEN,
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'POBLACION');
  XLSX.writeFile(wb, 'Plantilla_POBLACION_Valle_Risaralda.xlsx');
}
