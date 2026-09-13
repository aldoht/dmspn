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