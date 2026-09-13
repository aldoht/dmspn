import { GoogleGenAI, Type, Schema } from '@google/genai';
import { NextResponse } from 'next/server';
import { consultarGoogleMaps } from '@/lib/services/googleMapsService';
import { buscarRedesEnTiempoReal } from '@/lib/services/socialMediaRealtimeService';
import { getResumenAuditoriaRfc } from '@/features/audit/queries';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const auditSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    nivelRiesgoDigital: {
      type: Type.STRING,
      description: "LOW, MEDIUM, HIGH or CRITICAL",
    },
    scoreIncoherencia: {
      type: Type.INTEGER,
      description: "1 to 100 scale of discrepancy between finances and real-world presence",
    },
    justificacionResumida: {
      type: Type.STRING,
      description: "2 to 3 sentence summary of the findings, in English",
    },
    redFlags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of detected red flags, in English",
    },
    recomendacionAuditor: {
      type: Type.STRING,
      description: "Next steps for the compliance team, in English",
    },
  },
  required: ["nivelRiesgoDigital", "scoreIncoherencia", "justificacionResumida", "redFlags", "recomendacionAuditor"],
};

// Deriva la ciudad desde el domicilio registrado para alimentar
// Maps/SerpAPI sin pedirla al usuario. Heurística: el domicilio suele
// venir como "calle, ciudad, estado CP"; se toma el penúltimo segmento
// y se limpian códigos postales, abreviaturas de estado y puntuación.
// Si no es parseable, "" y las APIs buscan solo por nombre del comercio.
function limpiaSegmentoCiudad(segmento: string): string {
  return segmento
    .replace(/\b(C\.?P\.?|CP)\s*\d{4,}/gi, "")
    .replace(/\d{5,}/g, "")
    .replace(/\b([A-ZÑ]{2,4})\b\.?$/g, "")
    .replace(/[.\s]+$/g, "")
    .trim();
}

function parseCiudadDesdeDomicilio(domicilio: string): string {
  const partes = domicilio
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (partes.length === 0) return "";
  if (partes.length === 1) return limpiaSegmentoCiudad(partes[0]);
  return limpiaSegmentoCiudad(partes[partes.length - 2]);
}

// Espera N ms entre reintentos (backoff simple para red saturada).
function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Cadena de modelos: el primario es configurable por env y los siguientes
// son fallbacks vigentes (verificado en docs 2026-09: la familia 2.0 fue
// dada de baja el 2026-06-01 y devuelve 404). Objetivo: maximizar la
// probabilidad de obtener un dictamen aunque el primario esté saturado
// (503) o sin cuota diaria (429 Free-Tier por modelo). Se eliminan
// duplicados por si GEMINI_MODEL repite un fallback.
const MODELOS_GEMINI = [
  process.env.GEMINI_MODEL ?? 'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash-lite',
].filter((m, i, arr) => !!m && arr.indexOf(m) === i);

// Tope por intento: el SDK puede quedarse colgado ~14s+ ante un 503 antes
// de fallar; sin tope, 3 intentos = 45s de espera (lo visto en logs).
// 15s mantiene la cadena completa (3 modelos) por debajo de ~50s.
const TIMEOUT_POR_INTENTO_MS = 15_000;

// Tope de espera ante RetryInfo: si Google pide esperar más que esto, no
// vale la pena bloquear la respuesta; se prueba el siguiente modelo.
const ESPERA_MAXIMA_REINTENTO_MS = 30_000;

// Falla el modelo (no la red): 429 cuota/rate-limit, 5xx saturación y 404
// modelo dado de baja (p. ej. familias retiradas por Google).
// Ante estos, insistir en el mismo modelo es inútil (la cuota Free-Tier es
// diaria por modelo y un sunset no se recupera); lo correcto es probar el
// siguiente de la cadena. 400s y errores de schema/parse son permanentes
// de la petición: se lanzan directo.
function estadoHttpGemini(error: unknown): number | undefined {
  const status = (error as { status?: unknown })?.status;
  return typeof status === "number" ? status : undefined;
}

// Detecta fallos de red ante los que sí vale reintentar el MISMO modelo:
// TypeError "fetch failed" (p. ej. EADDRINUSE por sockets agotados en dev,
// ECONNRESET, ETIMEDOUT). El reintento ~1s después suele funcionar.
function esFalloDeRedGemini(error: unknown): boolean {
  if ((error as { timeoutGemini?: boolean })?.timeoutGemini === true) return false;
  if (error instanceof TypeError) return true;
  const mensaje = error instanceof Error ? error.message : String(error);
  return /fetch failed|EADDRINUSE|ECONNRESET|ETIMEDOUT|ENOTFOUND|socket hang up/i.test(mensaje);
}

function esFalloDeModeloGemini(error: unknown): boolean {
  const status = estadoHttpGemini(error);
  return status === 404 || status === 429 || (typeof status === "number" && status >= 500 && status < 600);
}

// Extrae la espera sugerida por Google (RetryInfo.retryDelay "52s"/"52.7s"
// en error.details, o "retry in 52.7s" en el mensaje). Null si no hay.
// Se usa solo en el último modelo de la cadena; en los demás se hace
// failover inmediato porque otro modelo tiene cuota/disponibilidad propia.
function extraerEsperaMs(error: unknown): number | null {
  const details = (error as { details?: unknown })?.details;
  if (Array.isArray(details)) {
    for (const d of details) {
      const retryDelay = (d as { retryDelay?: unknown })?.retryDelay;
      if (typeof retryDelay === "string") {
        const m = retryDelay.match(/(\d+(?:\.\d+)?)\s*s/i);
        if (m) return Math.round(Number(m[1]) * 1000);
      }
    }
  }
  const mensaje = error instanceof Error ? error.message : String(error ?? "");
  const m = mensaje.match(/retry in (\d+(?:\.\d+)?)\s*s/i);
  return m ? Math.round(Number(m[1]) * 1000) : null;
}

// Envuelve una promesa con tope de tiempo. El timeout se marca con
// timeoutGemini para clasificarlo como fallo de modelo (failover) y no
// como fallo de red. La petición original puede seguir viva en segundo
// plano, pero ya no bloquea la respuesta.
function conTimeoutGemini<T>(promesa: Promise<T>, ms: number): Promise<T> {
  let temporizador: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, rechazar) => {
    temporizador = setTimeout(() => {
      rechazar(Object.assign(new Error(`Gemini timeout tras ${ms}ms`), { timeoutGemini: true }));
    }, ms);
  });
  return Promise.race([
    promesa.then(
      (v) => { clearTimeout(temporizador); return v; },
      (e) => { clearTimeout(temporizador); throw e; },
    ),
    timeout,
  ]);
}

// Llama a Gemini recorriendo la cadena de modelos hasta obtener dictamen.
// Por modelo: 1 intento + 1 reintento solo ante fallo de red. Ante
// 429/5xx/timeout se pasa al siguiente modelo sin esperar (cuota y
// saturación son por modelo). Solo en el último modelo se honra el
// RetryInfo de Google (espera acotada) antes del reintento final.
// Si todo falla, lanza y el llamador degrada a respuesta parcial (200).
async function generarDictamenConReintentos(prompt: string): Promise<{ dictamen: Record<string, unknown>; modelo: string }> {
  let ultimoError: unknown = null;
  for (let m = 0; m < MODELOS_GEMINI.length; m++) {
    const modelo = MODELOS_GEMINI[m];
    const esUltimo = m === MODELOS_GEMINI.length - 1;
    for (let intento = 0; intento <= 1; intento++) {
      try {
        const response = await conTimeoutGemini(
          ai.models.generateContent({
            model: modelo,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: auditSchema,
              temperature: 0.1,
            },
          }),
          TIMEOUT_POR_INTENTO_MS,
        );
        return { dictamen: JSON.parse(response.text ?? '{}'), modelo };
      } catch (error) {
        ultimoError = error;
        // Fallo de red: un reintento del mismo modelo tras 1s.
        if (esFalloDeRedGemini(error) && intento === 0) {
          console.warn(`Gemini (${modelo}) fallo de red, reintentando mismo modelo...`, error);
          await esperar(1000);
          continue;
        }
        // Fallo de modelo (404/429/5xx/timeout): último modelo honra RetryInfo.
        if (esFalloDeModeloGemini(error) || (error as { timeoutGemini?: boolean })?.timeoutGemini === true) {
          const espera = extraerEsperaMs(error);
          if (esUltimo && espera !== null && espera <= ESPERA_MAXIMA_REINTENTO_MS && intento === 0) {
            console.warn(`Gemini (${modelo}) saturado, esperando ${espera}ms (RetryInfo) y reintentando...`);
            await esperar(espera);
            continue;
          }
          console.warn(`Gemini (${modelo}) no disponible (status ${estadoHttpGemini(error) ?? "timeout"}), probando siguiente modelo...`);
          break;
        }
        // Error permanente (400, schema): no tiene sentido otro modelo.
        throw error;
      }
    }
  }
  throw ultimoError;
}

// Formats a directional top list for the prompt: "Name — $amount (n ops)".
// Proper business names are kept verbatim (never translated).
function formatoTop(items: { nombre: string; montoTotal: number; numTransacciones: number }[]): string {
  if (items.length === 0) return "No movements recorded in the window.";
  return items
    .map((t) => `- ${t.nombre}: $${t.montoTotal.toLocaleString("es-MX")} in ${t.numTransacciones} ops`)
    .join("\n");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Contrato: { rfc }. Se normaliza a mayúsculas sin espacios porque
    // DIM_EMPRESA_ACTUAL guarda el RFC en ese formato. La ciudad siempre
    // se deriva del domicilio registrado; el cliente ya no la manda.
    // Compatibilidad: si llega el body manual viejo { datosFinancieros, ciudad }
    // sin rfc, se conserva el flujo anterior (ciudad opcional, default "").
    const rfcRaw: string | undefined = body?.rfc;
    if (!rfcRaw && body?.datosFinancieros) {
      return auditarConDatosManuales(body.datosFinancieros, body.ciudad ?? "");
    }

    const rfc = (rfcRaw ?? "").trim().toUpperCase();
    if (!rfc) {
      return NextResponse.json({ success: false, error: "RFC is required" }, { status: 400 });
    }

    // 1. Resumen Snowflake 60d: empresa, dueño mayor, ingresos/egresos,
    // tops separados y serie diaria. Todo desde el RFC, sin inputs manuales.
    const resumen = await getResumenAuditoriaRfc(rfc);
    if (!resumen) {
      return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });
    }

    // Ciudad derivada del domicilio; "" si no es parseable (las APIs
    // de huella degradan a búsqueda solo por nombre del comercio).
    const ciudad = parseCiudadDesdeDomicilio(resumen.empresa.domicilio);

    // 2. Huella digital en tiempo real: nombre legal + ciudad derivada.
    const [datosMaps, datosRedes] = await Promise.all([
      consultarGoogleMaps(resumen.empresa.razonSocial, ciudad),
      buscarRedesEnTiempoReal(resumen.empresa.razonSocial, ciudad),
    ]);

    // 3. AML prompt: crosses the Snowflake banking summary with the footprint.
    // Instructs English output; proper business/person names stay verbatim.
    const prompt = `
      You are a forensic Anti-Money Laundering (AML) auditor.
      Analyze in real time the consistency between the bank movements
      audited in Snowflake (last rolling 60 days) and the digital footprint
      obtained at this instant.
      Respond entirely in English. Keep business and person proper names in their original Spanish.

      --- IDENTITY (SNOWFLAKE) ---
      - Business: ${resumen.empresa.razonSocial}
      - RFC: ${resumen.empresa.rfc}
      - Business line: ${resumen.empresa.giro}
      - Registered address: ${resumen.empresa.domicilio}
      - Majority owner: ${resumen.duenoMayor ? `${resumen.duenoMayor.nombreCompleto} (${resumen.duenoMayor.pctParticipacion}% ownership)` : "Not registered in current BRIDGE_EMPRESA_DUENO"}

      --- 60-DAY FLOW (SNOWFLAKE) ---
      - Inflows (received): ${resumen.ingresos.numTransacciones} ops for $${resumen.ingresos.montoTotal.toLocaleString("es-MX")} (average ticket $${Math.round(resumen.ingresos.ticketPromedio).toLocaleString("es-MX")})
      - Outflows (transferred to other accounts): ${resumen.egresos.numTransacciones} ops for $${resumen.egresos.montoTotal.toLocaleString("es-MX")} (average ticket $${Math.round(resumen.egresos.ticketPromedio).toLocaleString("es-MX")})

      --- TOP TRANSFER DESTINATIONS (60D) ---
      ${formatoTop(resumen.topDestinos)}

      --- TOP FUNDING ORIGINS (60D) ---
      ${formatoTop(resumen.topOrigenes)}

      --- GOOGLE MAPS (REAL TIME) ---
      - Listed on Maps: ${datosMaps.encontrado ? "YES" : "NO"}
      - Address: ${datosMaps.direccion || "Not listed"}
      - Rating: ${datosMaps.rating} stars
      - Review count: ${datosMaps.userRatingCount} reviews
      - Operational status: ${datosMaps.businessStatus}

      --- SOCIAL MEDIA (REAL TIME VIA INDEXING) ---
      - Instagram: ${datosRedes.instagram?.encontrado ? `Found (${datosRedes.instagram.url}) - Excerpt: "${datosRedes.instagram.fragmentoGoogle}"` : "No presence on Instagram"}
      - Facebook: ${datosRedes.facebook?.encontrado ? `Found (${datosRedes.facebook.url}) - Excerpt: "${datosRedes.facebook.fragmentoGoogle}"` : "No presence on Facebook"}
      - TikTok: ${datosRedes.tiktok?.encontrado ? `Found (${datosRedes.tiktok.url}) - Excerpt: "${datosRedes.tiktok.fragmentoGoogle}"` : "No presence on TikTok"}

      Evaluate: business-line vs volume/ticket coherence, registered address vs
      Maps address, operated volume vs reviews and social presence,
      and concentration in few counterparties as a risk signal.
    `;

    // 4. Dictamen con Gemini (recorre la cadena de modelos hasta responder).
    // Si todos los modelos fallan, se degrada a 200 parcial: la ficha
    // Snowflake y la huella ya calculadas no se pierden por un fallo del
    // LLM, y el cliente puede reintentar solo el dictamen.
    let auditResult: Record<string, unknown> | null = null;
    let auditModel: string | undefined;
    let auditWarning: string | undefined;
    try {
      const { dictamen, modelo } = await generarDictamenConReintentos(prompt);
      auditResult = dictamen;
      auditModel = modelo;
    } catch (error) {
      console.error("Gemini no disponible tras reintentos, se devuelve parcial:", error);
      auditWarning = "Gemini verdict unavailable due to a network failure; retry the verdict.";
    }

    return NextResponse.json({
      success: true,
      resumenSnowflake: resumen,
      realtimeData: {
        googleMaps: datosMaps,
        redes: datosRedes,
      },
      auditResult,
      ...(auditModel ? { auditModel } : {}),
      ...(auditWarning ? { auditWarning } : {}),
    });

  } catch (error) {
    console.error("Error en auditoría en tiempo real:", error);
    return NextResponse.json({ success: false, error: "Audit error" }, { status: 500 });
  }
}

// Datos digitados del contrato manual legacy (sin RFC). Se conserva solo
// para no romper clientes viejos; los flujos nuevos usan RFC + Snowflake.
type DatosFinancierosManuales = {
  nombre: string;
  giro: string;
  transaccionesMensuales: number;
  montoMensual: number;
  moneda?: string;
  ticketPromedio: number;
};

// Flujo legacy con datos digitados (se conserva para no romper clientes
// que aún mandan { datosFinancieros, ciudad } sin RFC).
async function auditarConDatosManuales(datosFinancieros: DatosFinancierosManuales, ciudad = "") {
  const [datosMaps, datosRedes] = await Promise.all([
    consultarGoogleMaps(datosFinancieros.nombre, ciudad),
    buscarRedesEnTiempoReal(datosFinancieros.nombre, ciudad),
  ]);

  const prompt = `
      You are a forensic Anti-Money Laundering (AML) auditor.
      Analyze in real time the consistency between the transacted financial data and the real web search results obtained at this instant.
      Respond entirely in English. Keep business proper names in their original Spanish.

      --- AUDITED FINANCIAL DATA ---
      - Business name: ${datosFinancieros.nombre}
      - Business line: ${datosFinancieros.giro}
      - Monthly transactions: ${datosFinancieros.transaccionesMensuales}
      - Total monthly amount: $${datosFinancieros.montoMensual} ${datosFinancieros.moneda || 'MXN'}
      - Average ticket: $${datosFinancieros.ticketPromedio} ${datosFinancieros.moneda || 'MXN'}

      --- GOOGLE MAPS (REAL-TIME DATA) ---
      - Listed on Maps: ${datosMaps.encontrado ? "YES" : "NO"}
      - Address: ${datosMaps.direccion || "Not listed"}
      - Rating: ${datosMaps.rating} stars
      - Review count: ${datosMaps.userRatingCount} reviews
      - Operational status: ${datosMaps.businessStatus}

      --- SOCIAL MEDIA (REAL-TIME DATA VIA INDEXING) ---
      - Instagram: ${datosRedes.instagram?.encontrado ? `Found (${datosRedes.instagram.url}) - Excerpt: "${datosRedes.instagram.fragmentoGoogle}"` : "No presence on Instagram"}
      - Facebook: ${datosRedes.facebook?.encontrado ? `Found (${datosRedes.facebook.url}) - Excerpt: "${datosRedes.facebook.fragmentoGoogle}"` : "No presence on Facebook"}
      - TikTok: ${datosRedes.tiktok?.encontrado ? `Found (${datosRedes.tiktok.url}) - Excerpt: "${datosRedes.tiktok.fragmentoGoogle}"` : "No presence on TikTok"}
    `;

  // Misma resiliencia que el flujo por RFC: cadena de modelos con failover.
  const { dictamen: auditResult, modelo: auditModel } = await generarDictamenConReintentos(prompt);

  return NextResponse.json({
    success: true,
    realtimeData: {
      googleMaps: datosMaps,
      redes: datosRedes,
    },
    auditResult,
    auditModel,
  });
}
