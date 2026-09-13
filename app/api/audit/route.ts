import { GoogleGenAI, Type, Schema } from '@google/genai';
import { NextResponse } from 'next/server';
import { consultarGoogleMaps } from '@/lib/services/googleMapsService';
import { buscarRedesEnTiempoReal } from '@/lib/services/socialMediaRealtimeService';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const auditSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    nivelRiesgoDigital: {
      type: Type.STRING,
      description: "BAJO, MEDIO, ALTO o CRITICO",
    },
    scoreIncoherencia: {
      type: Type.INTEGER,
      description: "Escala 1 a 100 de discrepancia entre finanzas y presencia real",
    },
    justificacionResumida: {
      type: Type.STRING,
      description: "Resumen de 2 a 3 oraciones de los hallazgos",
    },
    redFlags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Lista de banderas rojas detectadas",
    },
    recomendacionAuditor: {
      type: Type.STRING,
      description: "Pasos a seguir por el equipo de cumplimiento",
    },
  },
  required: ["nivelRiesgoDigital", "scoreIncoherencia", "justificacionResumida", "redFlags", "recomendacionAuditor"],
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { datosFinancieros, ciudad } = body;

    // 1. Ejecutar las búsquedas en TIEMPO REAL en paralelo
    const [datosMaps, datosRedes] = await Promise.all([
      consultarGoogleMaps(datosFinancieros.nombre, ciudad),
      buscarRedesEnTiempoReal(datosFinancieros.nombre, ciudad),
    ]);

    // 2. Construir el prompt con la data fresca recién obtenida
    const prompt = `
      Eres un auditor forense de Prevención de Lavado de Dinero (AML).
      Analiza en tiempo real la consistencia entre los datos financieros transaccionados y los resultados de búsqueda web reales obtenidos en este instante.

      --- DATOS FINANCIEROS AUDITADOS ---
      - Nombre del Comercio: ${datosFinancieros.nombre}
      - Giro Comercial: ${datosFinancieros.giro}
      - Transacciones Mensuales: ${datosFinancieros.transaccionesMensuales}
      - Monto Mensual Total: $${datosFinancieros.montoMensual} ${datosFinancieros.moneda || 'MXN'}
      - Ticket Promedio: $${datosFinancieros.ticketPromedio} ${datosFinancieros.moneda || 'MXN'}

      --- GOOGLE MAPS (DATOS TIEMPO REAL) ---
      - Existe en Maps: ${datosMaps.encontrado ? "SÍ" : "NO"}
      - Dirección: ${datosMaps.direccion || "No registrada"}
      - Calificación: ${datosMaps.rating} estrellas
      - Conteo de Reseñas: ${datosMaps.userRatingCount} opiniones
      - Estatus Operativo: ${datosMaps.businessStatus}

      --- REDES SOCIALES (DATOS TIEMPO REAL VÍA INDEXACIÓN) ---
      - Instagram: ${datosRedes.instagram?.encontrado ? `Encontrado (${datosRedes.instagram.url}) - Extrato: "${datosRedes.instagram.fragmentoGoogle}"` : "Sin presencia en Instagram"}
      - Facebook: ${datosRedes.facebook?.encontrado ? `Encontrado (${datosRedes.facebook.url}) - Extracto: "${datosRedes.facebook.fragmentoGoogle}"` : "Sin presencia en Facebook"}
      - TikTok: ${datosRedes.tiktok?.encontrado ? `Encontrado (${datosRedes.tiktok.url}) - Extracto: "${datosRedes.tiktok.fragmentoGoogle}"` : "Sin presencia en TikTok"}
    `;

    // 3. Generar dictamen con Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: auditSchema,
        temperature: 0.1,
      },
    });

    const auditResult = JSON.parse(response.text ?? '{}');

    return NextResponse.json({
      success: true,
      realtimeData: {
        googleMaps: datosMaps,
        redes: datosRedes,
      },
      auditResult,
    });

  } catch (error) {
    console.error("Error en auditoría en tiempo real:", error);
    return NextResponse.json({ success: false, error: "Error en la auditoría" }, { status: 500 });
  }
}