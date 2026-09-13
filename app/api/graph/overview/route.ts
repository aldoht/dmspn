import {
  getEmpresasConMovimientoReciente,
  getTransaccionesRecientesDetalle,
} from "@/features/graph/queries";
import { Capa1, type ResultadoModulo1 } from "@/lib/algo/cap1";
import { persistirFeatures } from "@/features/graph/scoreWrite";
import { persistirAlertas } from "@/features/alerts/alertWrite";
import type { Transaccion } from "@/lib/types";

// Normaliza FECHA a YYYY-MM-DD sin importar cómo la entregue el driver:
// objeto Date (snowflake-sdk devuelve DATE así y su String() es
// "Wed Aug 26..." — cortarlo daba basura inválida para PERIODO),
// string ISO ("2026-09-12" o con hora) o timestamp parseable.
// "" = inparseable: esas txs se excluyen solas de las ventanas
// (Date.parse("") es NaN y ningún ms >= NaN es true).
function fechaISO(v: unknown): string {
  if (v instanceof Date) {
    return Number.isFinite(v.getTime())
      ? v.toISOString().slice(0, 10)
      : "";
  }
  const s = String(v ?? "");
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) {
    return m[1];
  }
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : "";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const horas = Number(searchParams.get("horas") ?? 72);
  // Ventana en días para Capa 1 (redondea hacia arriba: 240h -> 10d).
  const dias = Math.max(1, Math.ceil(horas / 24));

  try {
    // Doble fuente en paralelo: detalle para métricas + catálogo de
    // empresas para labels. Si una empresa no viene en el catálogo
    // (ventanas distintas), el label cae a su RFC sin romper.
    // El detalle se pide al DOBLE de horas porque el crecimiento del
    // Módulo 1 compara ventana actual vs previa.
    const [rows, empresas] = await Promise.all([
      getTransaccionesRecientesDetalle(horas * 2),
      getEmpresasConMovimientoReciente(horas),
    ]);

    const transacciones: Transaccion[] = rows.map((t) => ({
      id: String(t.ID),
      origenId: t.ORIGEN_ID,
      destinoId: t.DESTINO_ID,
      monto: Number(t.MONTO),
      // Normalizado robusto (ver fechaISO): el driver puede dar Date.
      fecha: fechaISO(t.FECHA),
      // Geografía (Módulo 4). BOOLEAN de Snowflake llega true/false;
      // ?? cubre nulls y queries sin JOIN geo (undefined).
      codigoPais: t.PAIS ?? null,
      paisAltoRiesgo: t.ALTO_RIESGO ?? false,
      sinRegulacionFormal: t.SIN_REGULACION ?? false,
      // Cuenta destino (Módulo 5). ?? cubre nulls (LEFT JOIN) y queries
      // sin JOIN a DIM_CUENTA (undefined): la métrica excluye nulls.
      cuentaDestinoId: t.CUENTA_DESTINO ?? null,
    }));

    // Ventana VISUAL: solo los últimos `horas` se dibujan (como antes).
    // El análisis de Capa 1 sigue usando el detalle completo (doble
    // ventana) para que la previa del crecimiento tenga datos.
    // Corte relativo a la fecha máxima de los datos (igual que ahoraISO).
    const msPorHora = 60 * 60 * 1000;
    let hastaDia = transacciones[0]?.fecha.slice(0, 10) ?? "";
    for (const t of transacciones) {
      const f = t.fecha.slice(0, 10);
      if (f > hastaDia) hastaDia = f;
    }
    const corteMs = Date.parse(hastaDia) + msPorHora * 24 - horas * msPorHora;
    const visibles = transacciones.filter(
      (t) => Date.parse(t.fecha.slice(0, 10)) >= corteMs,
    );

    // Nodos: RFCs distintos de la ventana visual, con razón social;
    const rfcs = [
      ...new Set(visibles.flatMap((t) => [t.origenId, t.destinoId])),
    ];
    const nombres = new Map(
      empresas.map((e) => [e.RFC_EMPRESA, e.RAZON_SOCIAL]),
    );
    // País registrado por empresa (Módulo 4 Geografía). ?? null si la
    // empresa no viene en el catálogo: discrepancia devuelve 0.
    const paisesReg = new Map(
      empresas.map((e) => [e.RFC_EMPRESA, e.PAIS_REGISTRADO ?? null]),
    );
    const nodes = rfcs.map((rfc) => ({ id: rfc, label: nombres.get(rfc) ?? rfc }));

    // Aristas agregadas por relación SOLO de la ventana visual
    // (mismo shape que antes: peso = conteo).
    const conteos = new Map<string, number>();
    for (const t of visibles) {
      const key = `${t.origenId}->${t.destinoId}`;
      conteos.set(key, (conteos.get(key) ?? 0) + 1);
    }

    // Conexión Capa 1 <-> overview: resultado por empresa, sin fechas
    // manuales (ventana móvil cortada en la fecha máxima de los datos).
    // Se pasa el país registrado para las métricas de Geografía (Bloque B).
    // Se guarda el ResultadoModulo1 completo (no solo el veredicto) para
    // persistirlo a FACT_FEATURES_RIESGO abajo sin recalcular.
    const resultados = new Map<string, ResultadoModulo1>();
    for (const rfc of rfcs) {
      resultados.set(
        rfc,
        new Capa1(rfc, transacciones, paisesReg.get(rfc) ?? null).analizarModulo1(
          dias,
        ),
      );
    }
    const veredictoDe = (rfc: string): string =>
      resultados.get(rfc)?.veredicto ?? "ok";

    const edges = [...conteos].map(([key, count]) => {
      const [source, target] = key.split("->");
      return {
        source,
        target,
        weight: count,
        // Roja solo si alguna punta está en alerta (decisión: alerta-only).
        // "observar" no pinta: se revisa en el Group Detail.
        sospechosa:
          veredictoDe(source) === "alerta" ||
          veredictoDe(target) === "alerta",
      };
    });

    // Persistencia automática (Fases B): features y luego alertas, en
    // background sin bloquear la respuesta. Orden importa: las alertas
    // referencian feature_sk recién escrito por el MERGE. Un fallo solo se
    // loguea y el grafo sigue devolviendo 200 con datos en memoria.
    void (async () => {
      try {
        const items = rfcs.map((rfc) => ({
          rfc,
          resultado: resultados.get(rfc)!,
          transacciones,
        }));
        await persistirFeatures(items);
        await persistirAlertas(
          items.map(({ rfc, resultado }) => ({ rfc, resultado })),
        );
      } catch (e) {
        console.error("persistencia overview failed:", e);
      }
    })();

    return Response.json({ nodes, edges });
  } catch (error) {
    console.error("Error fetching graph overview:", error);
    return Response.json({ error: "Could not fetch graph" }, { status: 500 });
  }
}
