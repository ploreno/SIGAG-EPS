export type NavTab =
  | 'dashboard'
  | 'cargar'
  | 'bandeja'
  | 'prevalidador'
  | 'sms'
  | 'compilar';

export type UserRole = 'Coordinador GIAF' | 'Auxiliar de Aseguramiento';

export type FileType = 'NC' | 'NS';

export type EntidadCode = 'EPS012' | 'EPSS12';

export type RecordStatus = 'LISTO' | 'PENDIENTE' | 'REVISIÓN';

export type SmsStatus =
  | 'Sin enviar'
  | 'Enviado'
  | 'Entregado'
  | 'Respuesta recibida'
  | 'Sin celular';

export interface GlosaRecord {
  id: string; // e.g., REG-88412
  arch: FileType; // NC | NS
  CNSTVO: string;
  ENT: EntidadCode;
  TP_DCTO_AF: string;
  NRO_DCTO_AF: string;
  PRIMER_APLL: string; // 1ER_APLL
  SEGUNDO_APELL: string; // 2DO_APELL
  PRIMER_NOMB: string; // 1ER_NOMB
  SEGUNDO_NOMB: string; // 2DO_NOMB
  FCH_NACIM: string; // DD/MM/AAAA
  COD_DPTO: string; // 2 digits
  COD_MUNP: string; // 3 digits
  COD_NOV: string; // e.g., N01, N02, N04, N14, N21, N31, N32, N33
  FCH_INI_NOV: string; // DD/MM/AAAA
  VLR1: string;
  VLR2: string;
  VLR3: string;
  VLR4: string;
  VLR5: string;
  VLR6: string;
  VLR7: string;
  GLOSA: string;
  GLOSA_PRINCIPAL: string;
  diagnosticoAlgoritmico: string;
  accionSigag: string;
  estado: RecordStatus;
  auxiliarAsignado?: string;
  crucePoblacion?: boolean;
  requiereSms?: boolean;
  smsStatus: SmsStatus;
  smsEnviosCount: number; // Control máximo 3 envíos (RF-05)
  smsUltimoEnvio?: string;
  notasAuditoria?: string;
}

export interface PoblacionRecord {
  TP_DCTO_AF: string;
  NRO_DCTO_AF: string;
  PRIMER_APLL: string;
  SEGUNDO_APELL: string;
  PRIMER_NOMB: string;
  SEGUNDO_NOMB: string;
  FCH_NACIM: string;
  COD_DPTO: string;
  COD_MUNP: string;
  MUNICIPIO: string;
  DEPARTAMENTO: string;
  CELULAR: string;
  CORREO_ELECTRONICO: string;
  SUBGRUPO_SISBEN: string;
  ESTADO_AFILIACION: 'AC' | 'RE' | 'AF' | 'PL';
  IPS_PRIMARIA: string;
  REGIMEN: 'C' | 'S';
}

export interface GlosaCatalogItem {
  codigo: string;
  nombre: string;
  descripcionNormativa: string;
  reglaNegocio: string;
  reglaEspecial?: string;
  ventanaPlazoDias: number;
  autoAjusteActivo: boolean;
  esDeterministica: boolean;
  resolubleAutoPoblacion: boolean;
  requiereSoporteUsuario: boolean;
  regimenAplicable: 'NC' | 'NS' | 'NC/NS';
  novedadesFrecuentes: string[];
  rolResponsable: string;
}

export interface ValidationIssue {
  recordId: string;
  arch: FileType;
  glosa: string;
  campo: string;
  tipoMalla: 'SINTACTICA' | 'SEMANTICA';
  severidad: 'BLOQUEANTE' | 'ADVERTENCIA';
  mensaje: string;
  autoCorregible: boolean;
  valorActual: string;
}

export interface IngestionSummary {
  nombreArchivo: string;
  tipoCarga: 'ADRES' | 'POBLACION' | 'RPA_ADRES';
  fechaCarga: string;
  totalFilas: number;
  filasNC: number;
  filasNS: number;
  subsanadasAuto: number;
  enGestionAuxiliar: number;
  enRevision: number;
  crucesPoblacionExitosos: number;
}

export interface AuditLogEntry {
  id: string;
  hora: string;
  modulo: string;
  rol: UserRole;
  accion: string;
  detalle: string;
}
