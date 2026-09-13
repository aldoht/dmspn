// Cliente de auditoría por RFC: el servidor calcula el resumen Snowflake
// (dueño mayor, ingresos/egresos 60d, tops separados) y la huella digital.
// Este módulo es el punto de entrada recomendado desde componentes cliente;
// POST /api/audit también acepta el body manual legacy, pero está deprecado.
export interface AuditByRfcRequest {
  rfc: string;
}

export interface AuditByRfcResponse {
  success: boolean;
  error?: string;
  resumenSnowflake?: unknown;
  realtimeData?: unknown;
  auditResult?: unknown;
  // Modelo Gemini que respondió el dictamen (cadena de fallback).
  auditModel?: string;
  auditWarning?: string;
}

// Audita un comercio por RFC: normaliza a mayúsculas y delega el resumen
// bancario + Gemini al endpoint. La ciudad se deriva en el servidor desde
// el domicilio registrado. Lanza si la respuesta no es exitosa.
export async function auditarComercioPorRfc(rfc: string): Promise<AuditByRfcResponse> {
  const body: AuditByRfcRequest = { rfc: rfc.trim().toUpperCase() };

  const response = await fetch('/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data: AuditByRfcResponse = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Error en la llamada al servidor de auditoría');
  }

  return data;
}

// Contrato legacy con datos digitados (sin RFC). Se conserva solo para
// no romper llamadas viejas; los flujos nuevos deben usar auditarComercioPorRfc.
export interface AuditPayload {
  datosFinancieros: {
    nombre: string;
    giro: string;
    transaccionesMensuales: number;
    montoMensual: number;
    moneda: string;
    ticketPromedio: number;
  };
  huellaDigital: {
    googleMaps: {
      estatus: string;
      resenasCount: number;
      rating: number;
      afluencia: string;
    };
    redes: {
      instagram: { seguidores: number; frecuenciaPosteo: string };
      facebook: { seguidores: number; frecuenciaPosteo: string };
      tiktok: { seguidores: number; frecuenciaPosteo: string };
    };
  };
}

/** @deprecated Usar auditarComercioPorRfc. Solo reenvía el payload legacy. */
export async function analizarComercio(payload: AuditPayload) {
  const response = await fetch('/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Error en la llamada al servidor de auditoría');
  }

  return response.json();
}
