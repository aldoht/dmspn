'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// Ficha Snowflake que devuelve POST /api/audit cuando se audita por RFC.
// Ventana fija de 60 días móviles; tops separados por dirección.
type ResumenSnowflake = {
  empresa: {
    rfc: string;
    razonSocial: string;
    giro: string;
    domicilio: string;
    scoreTotal: number | null;
  };
  duenoMayor: {
    rfcPersona: string;
    nombreCompleto: string;
    pctParticipacion: number;
  } | null;
  ingresos: { numTransacciones: number; montoTotal: number; ticketPromedio: number };
  egresos: { numTransacciones: number; montoTotal: number; ticketPromedio: number };
  topDestinos: { rfc: string; nombre: string; numTransacciones: number; montoTotal: number }[];
  topOrigenes: { rfc: string; nombre: string; numTransacciones: number; montoTotal: number }[];
};

type AuditDictamen = {
  nivelRiesgoDigital?: string;
  scoreIncoherencia?: number;
  justificacionResumida?: string;
  redFlags?: string[];
  recomendacionAuditor?: string;
};

type RealtimeData = {
  googleMaps?: {
    encontrado?: boolean;
    rating?: number;
    userRatingCount?: number;
    direccion?: string;
  };
};

type AuditResponse = {
  success: boolean;
  error?: string;
  resumenSnowflake?: ResumenSnowflake;
  realtimeData?: RealtimeData;
  auditResult?: AuditDictamen | null;
  // Modelo Gemini que respondió (cadena de fallback en /api/audit).
  auditModel?: string;
  // Presente cuando Gemini falló tras reintentos: la ficha Snowflake sí
  // llegó y solo falta el dictamen (se puede reintentar sin perder nada).
  auditWarning?: string;
};

function formatoMoneda(n: number) {
  return `$${Number(n ?? 0).toLocaleString("es-MX")}`;
}

function AgentContent() {
  // Único input: RFC. La ciudad se deriva en el servidor desde el
  // domicilio registrado, así que el cliente solo manda el RFC.
  // Si se llega desde Graph con ?rfc=, se precarga y auto-audita.
  const searchParams = useSearchParams();
  const [rfc, setRfc] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<AuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Guarda el RFC del URL ya ejecutado: evita doble auditoría en StrictMode
  // (doble invocación de efectos en dev) y re-ejecuciones por re-render.
  const autoRunRef = useRef<string | null>(null);

  // Núcleo reutilizable: audita un RFC ya normalizado. Lo usan tanto el
  // submit manual como el auto-run desde ?rfc=.
  const ejecutarAuditoria = useCallback(async (rfcNormalizado: string) => {
    setLoading(true);
    setError(null);
    setResultado(null);

    try {
      // El resumen bancario (ingresos/egresos 60d, tops, dueño mayor) se
      // calcula en el servidor desde Snowflake; el cliente solo manda el RFC.
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfc: rfcNormalizado }),
      });

      const data: AuditResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'An audit error occurred.');
      }

      setResultado(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect to the audit API.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAudit = (e: React.FormEvent) => {
    e.preventDefault();
    const rfcNormalizado = rfc.trim().toUpperCase();
    if (!rfcNormalizado) {
      setError('Enter an RFC to audit.');
      return;
    }
    void ejecutarAuditoria(rfcNormalizado);
  };

  // Auto-run al llegar con ?rfc= (botón "Run check investigation" del
  // grafo). Precarga el input y audita sin pedir nada más al usuario.
  // Si el RFC da 404, el error queda visible y el input editable.
  useEffect(() => {
    const rfcParam = (searchParams.get('rfc') ?? '').trim().toUpperCase();
    if (!rfcParam || autoRunRef.current === rfcParam) return;
    autoRunRef.current = rfcParam;
    setRfc(rfcParam);
    void ejecutarAuditoria(rfcParam);
  }, [searchParams, ejecutarAuditoria]);

  const resumen = resultado?.resumenSnowflake;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 text-slate-100">
      <header className="border-b border-slate-700 pb-4">
        <h1 className="text-2xl font-bold text-white">Digital Presence & AML Audit</h1>
        <p className="text-sm text-slate-400">
          Enter the RFC: we pull bank movements from Snowflake and Gemini investigates the digital footprint.
        </p>
      </header>

      {/* Búsqueda por RFC */}
      <form onSubmit={handleAudit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-md">
        <h2 className="text-lg font-semibold text-slate-200">Audit business by RFC</h2>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Business RFC</label>
          <input
            type="text"
            placeholder="E.g. AAPO890512XXX"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white uppercase placeholder:normal-case placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            value={rfc}
            onChange={(e) => setRfc(e.target.value.toUpperCase())}
            required
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <span>Querying Snowflake and auditing...</span>
              </>
            ) : (
              'Audit by RFC'
            )}
          </button>
        </div>
      </form>

      {/* Manejo de Errores */}
      {error && (
        <div className="p-4 bg-red-900/40 border border-red-700 text-red-200 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Ficha Snowflake 60d */}
      {resumen && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-lg font-bold text-white">{resumen.empresa.razonSocial}</h3>
            <p className="text-xs text-slate-400">
              RFC {resumen.empresa.rfc} · {resumen.empresa.giro} · {resumen.empresa.domicilio}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Majority owner:{' '}
              <span className="text-slate-200 font-medium">
                {resumen.duenoMayor
                  ? `${resumen.duenoMayor.nombreCompleto} (${resumen.duenoMayor.pctParticipacion}% )`
                  : 'Not registered in the current registry'}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <h4 className="text-xs uppercase font-semibold text-emerald-400 tracking-wider mb-2">
                Inflows · last 60 days (received)
              </h4>
              <p className="text-2xl font-extrabold text-white">{formatoMoneda(resumen.ingresos.montoTotal)}</p>
              <p className="text-xs text-slate-400 mt-1">
                {resumen.ingresos.numTransacciones} operations · average ticket{' '}
                {formatoMoneda(Math.round(resumen.ingresos.ticketPromedio))}
              </p>
            </div>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <h4 className="text-xs uppercase font-semibold text-amber-400 tracking-wider mb-2">
                Outflows · last 60 days (transferred)
              </h4>
              <p className="text-2xl font-extrabold text-white">{formatoMoneda(resumen.egresos.montoTotal)}</p>
              <p className="text-xs text-slate-400 mt-1">
                {resumen.egresos.numTransacciones} operations · average ticket{' '}
                {formatoMoneda(Math.round(resumen.egresos.ticketPromedio))}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <h4 className="text-xs uppercase font-semibold text-slate-300 tracking-wider mb-2">
                Top transfer destinations
              </h4>
              {resumen.topDestinos.length === 0 ? (
                <p className="text-xs text-slate-500">No transfers in the window.</p>
              ) : (
                <ul className="space-y-2">
                  {resumen.topDestinos.map((t) => (
                    <li key={t.rfc} className="flex justify-between gap-2 text-xs">
                      <span className="text-slate-200 truncate">{t.nombre}</span>
                      <span className="text-slate-400 whitespace-nowrap">
                        {formatoMoneda(t.montoTotal)} · {t.numTransacciones} ops
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <h4 className="text-xs uppercase font-semibold text-slate-300 tracking-wider mb-2">
                Top funding origins
              </h4>
              {resumen.topOrigenes.length === 0 ? (
                <p className="text-xs text-slate-500">No inflows in the window.</p>
              ) : (
                <ul className="space-y-2">
                  {resumen.topOrigenes.map((t) => (
                    <li key={t.rfc} className="flex justify-between gap-2 text-xs">
                      <span className="text-slate-200 truncate">{t.nombre}</span>
                      <span className="text-slate-400 whitespace-nowrap">
                        {formatoMoneda(t.montoTotal)} · {t.numTransacciones} ops
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dictamen parcial: Gemini falló pero la ficha Snowflake sí llegó.
          Se conserva todo lo calculado y se ofrece reintentar solo el dictamen. */}
      {resultado && !resultado.auditResult && resumen && (
        <div className="p-4 bg-amber-900/30 border border-amber-700 text-amber-200 rounded-xl text-sm flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <span>{resultado.auditWarning ?? 'Gemini verdict unavailable; the Snowflake record is complete.'}</span>
          <button
            type="button"
            onClick={() => void ejecutarAuditoria(resumen.empresa.rfc)}
            disabled={loading}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg text-sm transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? 'Retrying...' : 'Retry verdict'}
          </button>
        </div>
      )}

      {/* Resultado de la Auditoría */}
      {resultado?.auditResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 animate-fade-in shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-xl font-bold text-white">Audit Verdict</h3>
              <p className="text-xs text-slate-400">Generated by Gemini AI{resultado.auditModel ? ` · ${resultado.auditModel}` : ''}</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-400">Incoherence score:</span>
              <span className="text-2xl font-extrabold text-amber-400">
                {resultado.auditResult.scoreIncoherencia}/100
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  resultado.auditResult.nivelRiesgoDigital === 'CRITICAL' || resultado.auditResult.nivelRiesgoDigital === 'HIGH'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {resultado.auditResult.nivelRiesgoDigital}
              </span>
            </div>
          </div>

          {/* Justificación Resumida */}
          <div>
            <h4 className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-1">Evaluative summary</h4>
            <p className="text-sm text-slate-200 bg-slate-950 p-3.5 rounded-lg border border-slate-800">
              {resultado.auditResult.justificacionResumida}
            </p>
          </div>

          {/* Red Flags */}
          <div>
            <h4 className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-2">Detected Red Flags</h4>
            <ul className="space-y-2">
              {resultado.auditResult.redFlags?.map((flag: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-sm text-red-300 bg-red-950/20 p-2.5 rounded border border-red-900/30">
                  <span className="text-red-400 font-bold">⚠️</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Información de Google Maps Obtenida */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs space-y-2">
            <h4 className="font-semibold text-slate-300">Google Maps data (real time):</h4>
            <p className="text-slate-400">
              <span className="text-slate-200">Found:</span> {resultado.realtimeData?.googleMaps?.encontrado ? 'YES' : 'NO'} |{' '}
              <span className="text-slate-200">Rating:</span> {resultado.realtimeData?.googleMaps?.rating || 0} ⭐ |{' '}
              <span className="text-slate-200">Reviews:</span> {resultado.realtimeData?.googleMaps?.userRatingCount || 0} reviews
            </p>
            {resultado.realtimeData?.googleMaps?.direccion && (
              <p className="text-slate-400">
                <span className="text-slate-200">Address:</span> {resultado.realtimeData.googleMaps.direccion}
              </p>
            )}
          </div>

          {/* Recomendación para Auditor */}
          <div className="bg-blue-950/30 border border-blue-900/40 p-4 rounded-lg">
            <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">Compliance recommendation</h4>
            <p className="text-sm text-blue-200">{resultado.auditResult.recomendacionAuditor}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapper con Suspense: useSearchParams() lo exige en App Router.
// El fallback cubre solo la primera hidratación antes de resolver el ?rfc=.
export default function Page() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto p-6 text-sm text-slate-400">Loading audit...</div>}>
      <AgentContent />
    </Suspense>
  );
}
