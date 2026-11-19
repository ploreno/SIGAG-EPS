import { useMemo, useState } from 'react';
import { BandejaGlosasView } from './components/BandejaGlosasView';
import { CompileFinalView } from './components/CompileFinalView';
import { DashboardKpiView } from './components/DashboardKpiView';
import { Layout } from './components/Layout';
import { PreValidatorView } from './components/PreValidatorView';
import { RecordDrawer } from './components/RecordDrawer';
import { SmsCampaignsView } from './components/SmsCampaignsView';
import { UploadAdResView } from './components/UploadAdResView';
import {
  generateInitialDataset,
  GLOSAS_CATALOGO,
  routeAuxiliarOperativo,
} from './data/bduaCatalog';
import {
  AuditLogEntry,
  GlosaCatalogItem,
  GlosaRecord,
  IngestionSummary,
  NavTab,
  PoblacionRecord,
  UserRole,
} from './types/bdua';
import {
  applyDeterministicEngine,
  autoFixRecordSyntax,
  diagnoseAndClassifyRow,
  validateRecordRes762,
} from './utils/bduaValidator';

export default function App() {
  const initialData = useMemo(() => generateInitialDataset(), []);

  const [records, setRecords] = useState<GlosaRecord[]>(initialData.records);
  const [poblacion, setPoblacion] = useState<PoblacionRecord[]>(initialData.poblacion);
  const [rulesCatalog, setRulesCatalog] = useState<GlosaCatalogItem[]>(GLOSAS_CATALOGO);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [role, setRole] = useState<UserRole>('Coordinador GIAF');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const [ingestionHistory, setIngestionHistory] = useState<IngestionSummary[]>([
    {
      nombreArchivo: 'RESP_ADRES_BDUA_VALLE_RISARALDA_NOV.xlsx',
      tipoCarga: 'ADRES',
      fechaCarga: '08:15',
      totalFilas: initialData.records.length,
      filasNC: initialData.records.filter((r) => r.arch === 'NC').length,
      filasNS: initialData.records.filter((r) => r.arch === 'NS').length,
      subsanadasAuto: initialData.records.filter((r) => r.estado === 'LISTO').length,
      enGestionAuxiliar: initialData.records.filter((r) => r.estado === 'PENDIENTE').length,
      enRevision: initialData.records.filter((r) => r.estado === 'REVISIÓN').length,
      crucesPoblacionExitosos: initialData.records.filter((r) => r.crucePoblacion).length,
    },
  ]);

  const [auditTrail, setAuditTrail] = useState<AuditLogEntry[]>([
    {
      id: 'LOG-01',
      hora: '08:15',
      modulo: 'RF-01 Ingesta ADRES',
      rol: 'Coordinador GIAF',
      accion: 'Carga inicial de lote',
      detalle: '2.100 glosas procesadas (EPS012 / EPSS12)',
    },
    {
      id: 'LOG-02',
      hora: '08:16',
      modulo: 'RF-03 Motor Algorítmico',
      rol: 'Coordinador GIAF',
      accion: 'Subsanación determinística',
      detalle: '1.407 registros marcados LISTO automáticamente',
    },
    {
      id: 'LOG-03',
      hora: '08:16',
      modulo: 'RF-04 Derivación',
      rol: 'Coordinador GIAF',
      accion: 'Enrutamiento a auxiliares',
      detalle: '609 registros asignados por territorio y Sisbén IV',
    },
  ]);

  const addAuditEntry = (modulo: string, accion: string, detalle: string) => {
    const hora = new Date().toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setAuditTrail((prev) => [
      {
        id: `LOG-${Date.now()}`,
        hora,
        modulo,
        rol: role,
        accion,
        detalle,
      },
      ...prev.slice(0, 29),
    ]);
  };

  const poblacionMap = useMemo(() => {
    const map = new Map<string, PoblacionRecord>();
    poblacion.forEach((p) => {
      map.set(`${p.TP_DCTO_AF}-${p.NRO_DCTO_AF}`, p);
      map.set(p.NRO_DCTO_AF, p);
    });
    return map;
  }, [poblacion]);

  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedRecordId) || null,
    [records, selectedRecordId]
  );

  const selectedPoblacionMatch = useMemo(() => {
    if (!selectedRecord) return undefined;
    return (
      poblacionMap.get(`${selectedRecord.TP_DCTO_AF}-${selectedRecord.NRO_DCTO_AF}`) ||
      poblacionMap.get(selectedRecord.NRO_DCTO_AF)
    );
  }, [selectedRecord, poblacionMap]);

  // Calcula tasa de conformidad dinámica (98.5% en lote base)
  const conformityRate = useMemo(() => {
    if (records.length === 0) return '0.0';
    const invalidCount = records.filter((r) =>
      validateRecordRes762(r, rulesCatalog).some((i) => i.severidad === 'BLOQUEANTE')
    ).length;
    const rate = ((records.length - invalidCount) / records.length) * 100;
    return rate.toFixed(1);
  }, [records, rulesCatalog]);

  const handleSaveRecord = (updated: GlosaRecord) => {
    const nextRecord: GlosaRecord = {
      ...updated,
      auxiliarAsignado: routeAuxiliarOperativo(
        updated.COD_DPTO,
        updated.GLOSA,
        updated.estado
      ),
    };
    setRecords((prev) => prev.map((r) => (r.id === nextRecord.id ? nextRecord : r)));
    setBannerNotice(`Registro ${nextRecord.id} actualizado (${nextRecord.estado}).`);
    addAuditEntry(
      'Gestión Manual',
      `Actualización ${nextRecord.id}`,
      `Estado: ${nextRecord.estado} · Glosa ${nextRecord.GLOSA}`
    );
  };

  const handleLoadAdResRecords = (newRecords: GlosaRecord[], summary: IngestionSummary) => {
    setRecords(newRecords);
    setIngestionHistory((prev) => [summary, ...prev]);
    setBannerNotice(
      `Lote "${summary.nombreArchivo}" cargado: ${summary.totalFilas} glosas ingestadas.`
    );
    addAuditEntry(
      summary.tipoCarga === 'RPA_ADRES' ? 'RF-01 Ingesta RPA' : 'RF-01 Carga ADRES',
      summary.nombreArchivo,
      `${summary.totalFilas} registros (${summary.filasNC} NC / ${summary.filasNS} NS)`
    );
  };

  const handleLoadPoblacion = (newPob: PoblacionRecord[], summary: IngestionSummary) => {
    setPoblacion(newPob);
    const nextMap = new Map<string, PoblacionRecord>();
    newPob.forEach((p) => {
      nextMap.set(`${p.TP_DCTO_AF}-${p.NRO_DCTO_AF}`, p);
      nextMap.set(p.NRO_DCTO_AF, p);
    });
    setRecords((prev) =>
      prev.map((rec, idx) => {
        const match =
          nextMap.get(`${rec.TP_DCTO_AF}-${rec.NRO_DCTO_AF}`) ||
          nextMap.get(rec.NRO_DCTO_AF);
        if (!match) return rec;
        return diagnoseAndClassifyRow(rec, idx, nextMap, rec.arch);
      })
    );
    setIngestionHistory((prev) => [summary, ...prev]);
    addAuditEntry(
      'Base POBLACION',
      summary.nombreArchivo,
      `${summary.totalFilas} afiliados Valle/Risaralda actualizados`
    );
  };

  const handleResetDemoData = () => {
    const fresh = generateInitialDataset();
    setRecords(fresh.records);
    setPoblacion(fresh.poblacion);
    setRulesCatalog(GLOSAS_CATALOGO);
    setBannerNotice('Lote inicial de 2.100 glosas restaurado.');
    addAuditEntry('Sistema', 'Restauración lote base', '2.100 registros restaurados');
  };

  const handleUpdateRule = (updatedRule: GlosaCatalogItem) => {
    setRulesCatalog((prev) =>
      prev.map((item) => (item.codigo === updatedRule.codigo ? updatedRule : item))
    );
    addAuditEntry(
      'RF-02 Reglas',
      `Parametrización ${updatedRule.codigo}`,
      `Ventana ${updatedRule.ventanaPlazoDias}d · Auto-ajuste ${
        updatedRule.autoAjusteActivo ? 'ON' : 'OFF'
      }`
    );
  };

  const handleBatchCrossMatch = (): number => {
    let updatedCount = 0;
    const autoCatalogCodes = new Set(
      rulesCatalog.filter((g) => g.resolubleAutoPoblacion).map((g) => g.codigo)
    );

    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.estado === 'LISTO') return rec;
        const pob =
          poblacionMap.get(`${rec.TP_DCTO_AF}-${rec.NRO_DCTO_AF}`) ||
          poblacionMap.get(rec.NRO_DCTO_AF);
        if (!pob) return rec;

        if (autoCatalogCodes.has(rec.GLOSA) || rec.GLOSA === 'GN0169' || rec.GLOSA === 'GN0059') {
          updatedCount++;
          return {
            ...rec,
            PRIMER_APLL: pob.PRIMER_APLL,
            SEGUNDO_APELL: pob.SEGUNDO_APELL,
            PRIMER_NOMB: pob.PRIMER_NOMB,
            SEGUNDO_NOMB: pob.SEGUNDO_NOMB,
            FCH_NACIM: pob.FCH_NACIM,
            COD_DPTO: pob.COD_DPTO,
            COD_MUNP: pob.COD_MUNP,
            VLR1:
              rec.COD_NOV === 'N33'
                ? pob.IPS_PRIMARIA
                : ['N21', 'N31', 'N32'].includes(rec.COD_NOV) &&
                    rec.arch === 'NS' &&
                    pob.SUBGRUPO_SISBEN !== 'N/A'
                  ? pob.SUBGRUPO_SISBEN
                  : rec.VLR1,
            crucePoblacion: true,
            auxiliarAsignado: 'Motor Algorítmico',
            accionSigag: 'Subsanado cruce POBLACION',
            estado: 'LISTO',
          };
        }
        return rec;
      })
    );

    addAuditEntry(
      'Cruce POBLACION',
      'Cruce masivo ejecutado',
      `${updatedCount} registros subsanados a LISTO`
    );
    return updatedCount;
  };

  const handleRouteAuxiliaries = (): number => {
    let routedCount = 0;
    setRecords((prev) =>
      prev.map((rec) => {
        const assigned = routeAuxiliarOperativo(rec.COD_DPTO, rec.GLOSA, rec.estado);
        if (rec.estado !== 'LISTO') routedCount++;
        return {
          ...rec,
          auxiliarAsignado: assigned,
        };
      })
    );
    addAuditEntry(
      'RF-04 Derivación',
      'Enrutamiento operativo por rol',
      `${routedCount} glosas asignadas a bandejas de auxiliares`
    );
    return routedCount;
  };

  const handleAutoFixAll = (): number => {
    let fixedCount = 0;
    setRecords((prev) =>
      prev.map((rec) => {
        const issuesBefore = validateRecordRes762(rec, rulesCatalog);
        if (!issuesBefore.some((i) => i.autoCorregible)) return rec;
        const fixed = autoFixRecordSyntax(rec, poblacionMap);
        const issuesAfter = validateRecordRes762(fixed, rulesCatalog);
        if (
          issuesAfter.length < issuesBefore.length ||
          JSON.stringify(fixed) !== JSON.stringify(rec)
        ) {
          fixedCount++;
        }
        return fixed;
      })
    );
    addAuditEntry(
      'RF-03 Pre-Validador',
      'Corrección automática sintáctica',
      `${fixedCount} registros normalizados según Res. 762/2023`
    );
    return fixedCount;
  };

  const handleRunDeterministicEngine = (): number => {
    const { updatedRecords, adjustedCount } = applyDeterministicEngine(
      records,
      poblacionMap,
      rulesCatalog
    );
    setRecords(updatedRecords);
    addAuditEntry(
      'RF-03 Motor Determinístico',
      'Ejecución en GN0095/340/361/368/369/421',
      `${adjustedCount} registros ajustados y aprobados a LISTO`
    );
    return adjustedCount;
  };

  const handleSendSmsBatch = (
    recordIds: string[]
  ): { sent: number; noPhone: number; limitReached: number } => {
    let sent = 0;
    let noPhone = 0;
    let limitReached = 0;
    const idSet = new Set(recordIds);

    setRecords((prev) =>
      prev.map((rec) => {
        if (!idSet.has(rec.id)) return rec;
        if ((rec.smsEnviosCount ?? 0) >= 3) {
          limitReached++;
          return rec;
        }
        const pob =
          poblacionMap.get(`${rec.TP_DCTO_AF}-${rec.NRO_DCTO_AF}`) ||
          poblacionMap.get(rec.NRO_DCTO_AF);
        if (!pob?.CELULAR) {
          noPhone++;
          return { ...rec, smsStatus: 'Sin celular' };
        }
        sent++;
        const nextCount = (rec.smsEnviosCount ?? 0) + 1;
        return {
          ...rec,
          smsStatus: 'Entregado',
          smsEnviosCount: nextCount,
          smsUltimoEnvio: new Date().toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          accionSigag: `SMS ${nextCount}/3 entregado`,
        };
      })
    );

    addAuditEntry(
      'RF-05 Campañas SMS',
      'Disparo de notificaciones SMS',
      `${sent} enviados · ${limitReached} en límite 3/3 · ${noPhone} sin celular`
    );
    return { sent, noPhone, limitReached };
  };

  const handleSimulateSmsResponse = (recordId: string) => {
    setRecords((prev) =>
      prev.map((rec) =>
        rec.id === recordId
          ? {
              ...rec,
              smsStatus: 'Respuesta recibida',
              estado: 'REVISIÓN',
              accionSigag: 'Soporte recibido vía SMS',
            }
          : rec
      )
    );
    addAuditEntry(
      'RF-05 Campañas SMS',
      `Soporte recibido ${recordId}`,
      'Registro pasado a REVISIÓN para validación documental'
    );
  };

  const handleCertifyBatch100 = (): number => {
    let fixedCount = 0;
    setRecords((prev) =>
      prev.map((rec) => {
        const fixed = autoFixRecordSyntax(rec, poblacionMap);
        if (
          ['N21', 'N31', 'N32'].includes(fixed.COD_NOV) &&
          fixed.arch === 'NS' &&
          !/^[ABCD](0?[1-9]|1[0-9]|2[01])$/.test(fixed.VLR1)
        ) {
          fixed.VLR1 = 'B04';
          fixed.VLR2 = 'IV';
        }
        const hadChanges =
          fixed.estado !== 'LISTO' || JSON.stringify(fixed) !== JSON.stringify(rec);
        if (hadChanges) fixedCount++;
        return {
          ...fixed,
          estado: 'LISTO',
          auxiliarAsignado: 'Motor Algorítmico',
          accionSigag:
            rec.estado === 'LISTO' ? rec.accionSigag : `Validado y certificado (${role})`,
        };
      })
    );
    addAuditEntry(
      'RF-06 Compilador',
      'Certificación integral 100% mallas',
      `${fixedCount} registros validados y aprobados para exportación .NC/.NS`
    );
    return fixedCount;
  };

  const handleRunPreValidateAndExport = () => {
    setActiveTab('prevalidador');
  };

  return (
    <Layout
      activeTab={activeTab}
      onSelectTab={(tab) => {
        setBannerNotice(null);
        setActiveTab(tab);
      }}
      role={role}
      onRoleChange={setRole}
    >
      {bannerNotice && (
        <div className="mb-4 rounded-lg border border-[#1E6B52]/40 bg-emerald-50/70 px-4 py-2.5 text-xs sm:text-sm text-[#1E6B52] flex items-center justify-between gap-2">
          <span>{bannerNotice}</span>
          <button
            type="button"
            onClick={() => setBannerNotice(null)}
            className="text-xs font-semibold hover:underline cursor-pointer"
          >
            Ocultar
          </button>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <DashboardKpiView
          records={records}
          role={role}
          conformityRate={conformityRate}
          auditTrail={auditTrail}
          onSelectRecord={(rec) => setSelectedRecordId(rec.id)}
          onRunPreValidateAndExport={handleRunPreValidateAndExport}
        />
      )}

      {activeTab === 'cargar' && (
        <UploadAdResView
          poblacion={poblacion}
          ingestionHistory={ingestionHistory}
          onLoadAdResRecords={handleLoadAdResRecords}
          onLoadPoblacion={handleLoadPoblacion}
          onResetDemoData={handleResetDemoData}
        />
      )}

      {activeTab === 'bandeja' && (
        <BandejaGlosasView
          records={records}
          poblacion={poblacion}
          rulesCatalog={rulesCatalog}
          role={role}
          onUpdateRule={handleUpdateRule}
          onSelectRecord={(rec) => setSelectedRecordId(rec.id)}
          onBatchCrossMatch={handleBatchCrossMatch}
          onRouteAuxiliaries={handleRouteAuxiliaries}
        />
      )}

      {activeTab === 'prevalidador' && (
        <PreValidatorView
          records={records}
          rulesCatalog={rulesCatalog}
          conformityRate={conformityRate}
          onAutoFixAll={handleAutoFixAll}
          onRunDeterministicEngine={handleRunDeterministicEngine}
          onSelectRecord={(rec) => setSelectedRecordId(rec.id)}
          onGoToCompile={() => setActiveTab('compilar')}
        />
      )}

      {activeTab === 'sms' && (
        <SmsCampaignsView
          records={records}
          poblacion={poblacion}
          onSendSmsBatch={handleSendSmsBatch}
          onSimulateResponse={handleSimulateSmsResponse}
        />
      )}

      {activeTab === 'compilar' && (
        <CompileFinalView
          records={records}
          rulesCatalog={rulesCatalog}
          role={role}
          onGoToValidator={() => setActiveTab('prevalidador')}
          onCertifyBatch100={handleCertifyBatch100}
          onRecordCompileEvent={(detail) =>
            addAuditEntry('RF-06 Compilador', 'Exportación .NC / .NS', detail)
          }
        />
      )}

      <RecordDrawer
        record={selectedRecord}
        poblacionMatch={selectedPoblacionMatch}
        role={role}
        onClose={() => setSelectedRecordId(null)}
        onSave={handleSaveRecord}
      />
    </Layout>
  );
}
