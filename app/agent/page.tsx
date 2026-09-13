'use client';

import { useState } from 'react';

export default function page() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: 'Abarrotes Don Pepe',
    giro: 'Tienda de Abarrotes',
    ciudad: 'Monterrey',
    transaccionesMensuales: 4500,
    montoMensual: 3500000,
    ticketPromedio: 777,
    moneda: 'MXN',
  });

  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResultado(null);

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datosFinancieros: {
            nombre: formData.nombre,
            giro: formData.giro,
            transaccionesMensuales: Number(formData.transaccionesMensuales),
            montoMensual: Number(formData.montoMensual),
            ticketPromedio: Number(formData.ticketPromedio),
            moneda: formData.moneda,
          },
          ciudad: formData.ciudad,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Ocurrió un error en la auditoría.');
      }

      setResultado(data);
    } catch (err: any) {
      setError(err.message || 'Error al conectar con la API de auditoría.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 text-slate-100">
      <header className="border-b border-slate-700 pb-4">
        <h1 className="text-2xl font-bold text-white">Auditoría de Presencia Digital & AML</h1>
        <p className="text-sm text-slate-400">
          Evaluación en tiempo real de la huella digital vs. volumen transaccional mediante Gemini AI.
        </p>
      </header>

      {/* Formulario de Entrada */}
      <form onSubmit={handleAudit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-md">
        <h2 className="text-lg font-semibold text-slate-200">Datos del Comercio Sospechoso</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Nombre del Comercio</label>
            <input
              type="text"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Giro Comercial</label>
            <input
              type="text"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              value={formData.giro}
              onChange={(e) => setFormData({ ...formData, giro: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Ciudad</label>
            <input
              type="text"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              value={formData.ciudad}
              onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Monto Mensual ($)</label>
            <input
              type="number"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              value={formData.montoMensual}
              onChange={(e) => setFormData({ ...formData, montoMensual: Number(e.target.value) })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Transacciones / Mes</label>
            <input
              type="number"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              value={formData.transaccionesMensuales}
              onChange={(e) => setFormData({ ...formData, transaccionesMensuales: Number(e.target.value) })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Ticket Promedio ($)</label>
            <input
              type="number"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              value={formData.ticketPromedio}
              onChange={(e) => setFormData({ ...formData, ticketPromedio: Number(e.target.value) })}
              required
            />
          </div>
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
                <span>Auditando en tiempo real...</span>
              </>
            ) : (
              'Ejecutar Auditoría Digital'
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

      {/* Resultado de la Auditoría */}
      {resultado && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 animate-fade-in shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-xl font-bold text-white">Dictamen de Auditoría</h3>
              <p className="text-xs text-slate-400">Generado por Gemini AI</p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-400">Score de Incoherencia:</span>
              <span className="text-2xl font-extrabold text-amber-400">
                {resultado.auditResult.scoreIncoherencia}/100
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  resultado.auditResult.nivelRiesgoDigital === 'CRITICO' || resultado.auditResult.nivelRiesgoDigital === 'ALTO'
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
            <h4 className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-1">Resumen Evaluativo</h4>
            <p className="text-sm text-slate-200 bg-slate-950 p-3.5 rounded-lg border border-slate-800">
              {resultado.auditResult.justificacionResumida}
            </p>
          </div>

          {/* Red Flags */}
          <div>
            <h4 className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-2">Banderas Rojas Detectadas</h4>
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
            <h4 className="font-semibold text-slate-300">Datos obtenidos de Google Maps (Tiempo Real):</h4>
            <p className="text-slate-400">
              <span className="text-slate-200">Encontrado:</span> {resultado.realtimeData?.googleMaps?.encontrado ? 'SÍ' : 'NO'} |{' '}
              <span className="text-slate-200">Rating:</span> {resultado.realtimeData?.googleMaps?.rating || 0} ⭐ |{' '}
              <span className="text-slate-200">Reseñas:</span> {resultado.realtimeData?.googleMaps?.userRatingCount || 0} opiniones
            </p>
            {resultado.realtimeData?.googleMaps?.direccion && (
              <p className="text-slate-400">
                <span className="text-slate-200">Dirección:</span> {resultado.realtimeData.googleMaps.direccion}
              </p>
            )}
          </div>

          {/* Recomendación para Auditor */}
          <div className="bg-blue-950/30 border border-blue-900/40 p-4 rounded-lg">
            <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">Recomendación para Cumplimiento</h4>
            <p className="text-sm text-blue-200">{resultado.auditResult.recomendacionAuditor}</p>
          </div>
        </div>
      )}
    </div>
  );
}