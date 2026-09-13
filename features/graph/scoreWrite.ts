import { executeQuery } from "@/lib/db";
import type { Transaccion } from "@/lib/types";
import type { ResultadoModulo1 } from "@/lib/algo/cap1";
import { analisisToScore } from "./utils/scoreToRisk";
import type { Bind } from "snowflake-sdk";

// Entrada por empresa: veredicto ya calculado + txs para conteos.
// `transacciones` son TODAS (el subset por empresa y ventana se deriva aquí
// desde resultado.hasta + resultado.ventanaDias, igual que ahoraISO).
export type PersistInput = {
  rfc: string;
  resultado: ResultadoModulo1;
  transacciones: Transaccion[];
};

// Fila lista para FACT_FEATURES_RIESGO (pura, testeable sin Snowflake).
// Nombres de columna según captura de la tabla; si Snowflake responde
// 002003 en alguna, ajustar aquí (una sola línea por columna).
export type FeaturesRow = {
  rfc: string;
  periodo: string; // YYYY-MM-DD (= hasta): 1 fila diaria por empresa
  numTransacciones: number;
  montoTotal: number;
  ticketPromedio: number;
  desviacionEstandar: number;
  pctCrecimiento: number | null; // tanto por uno; null si Infinity
  discrepanciaGeo: boolean;
  score: number; // 0-100 vía analisisToScore
};

// Deriva la fila de features desde el resultado + el array completo.
// No toca cap1.ts: todo sale de ResultadoModulo1 y filtros locales.
export function filaFeatures(input: PersistInput): FeaturesRow {
  const { rfc, resultado, transacciones } = input;
  const msPorDia = 24 * 60 * 60 * 1000;
  const hastaMs = Date.parse(resultado.hasta) + msPorDia;
  const desdeMs = hastaMs - resultado.ventanaDias * msPorDia;
  const subset = transacciones.filter(
    (t) =>
      t.origenId === rfc &&
      Date.parse(t.fecha.slice(0, 10)) >= desdeMs &&
      Date.parse(t.fecha.slice(0, 10)) < hastaMs,
  );
  const suma = subset.reduce((acc, t) => acc + t.monto, 0);
  const n = subset.length;
  return {
    rfc,
    periodo: resultado.hasta,
    numTransacciones: n,
    montoTotal: suma,
    // 0 si n = 0 (nunca NaN).
    ticketPromedio: n === 0 ? 0 : suma / n,
    desviacionEstandar: resultado.desviacionEstandar,
    // NUMERIC no acepta Infinity: sin base previa se guarda NULL.
    pctCrecimiento:
      resultado.crecimientoMensual === Infinity
        ? null
        : resultado.crecimientoMensual,
    discrepanciaGeo: resultado.discrepanciaPais > 0,
    score: analisisToScore(resultado),
  };
}

// Persiste en lote con UN solo MERGE (1 roundtrip, no N inserts).
// Clave: (empresa_sk vigente por RFC, periodo). Si la fila existe hace
// UPDATE (incluye FECHA_CALCULO); si no, INSERT con MODELO_VERSION.
// Supuesto: FEATURE_SK autoincremental (patrón IDENTITY de tus DIMs);
// si el INSERT lo exigiera, el error lo dirá y se agrega MAX+1.
// Nunca lanza: el route la llama en background y un fallo de escritura
// no debe romper el 200 del grafo (aquí solo se propaga para log).
export async function persistirFeatures(items: PersistInput[]): Promise<void> {
  const filas = items.map(filaFeatures);
  if (filas.length === 0) {
    return;
  }

  // 10 binds por fila en el mismo orden del SELECT.
  const placeholdersPorFila =
    "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  const values = filas.map(() => placeholdersPorFila).join(", ");
  // null/boolean/number/string: se castea a Bind como en el resto del repo
  // (ver app/api/alerts/routes.ts); executeQuery los pasa tal cual.
  const binds = filas.flatMap((f) => [
    f.rfc,
    f.periodo,
    f.numTransacciones,
    f.montoTotal,
    f.ticketPromedio,
    f.desviacionEstandar,
    f.pctCrecimiento,
    f.discrepanciaGeo,
    f.score,
    "capa1-v1",
  ]) as Bind[];

  await executeQuery(
    `
    MERGE INTO FACT_FEATURES_RIESGO f
    USING (
      SELECT v.rfc, v.periodo, v.num_tx, v.monto, v.ticket, v.desv,
             v.pct, v.disc, v.score, v.modelo, e.empresa_sk
      FROM (VALUES ${values}) AS v(rfc, periodo, num_tx, monto, ticket, desv, pct, disc, score, modelo)
      JOIN DIM_EMPRESA e
        ON e.rfc_empresa = v.rfc
       AND e.es_version_actual = TRUE
    ) s
      ON f.empresa_sk = s.empresa_sk
     AND f.periodo = s.periodo
    WHEN MATCHED THEN UPDATE SET
      num_transacciones_periodo = s.num_tx,
      monto_total_periodo = s.monto,
      ticket_promedio = s.ticket,
      desviacion_estandar_monto = s.desv,
      pct_crecimiento_mensual = s.pct,
      discrepancia_geografica = s.disc,
      score_total = s.score,
      modelo_version = s.modelo,
      fecha_calculo = CURRENT_TIMESTAMP()
    WHEN NOT MATCHED THEN INSERT
      (empresa_sk, periodo, num_transacciones_periodo, monto_total_periodo,
       ticket_promedio, desviacion_estandar_monto, pct_crecimiento_mensual,
       discrepancia_geografica, score_total, modelo_version, fecha_calculo)
    VALUES
      (s.empresa_sk, s.periodo, s.num_tx, s.monto, s.ticket, s.desv,
       s.pct, s.disc, s.score, s.modelo, CURRENT_TIMESTAMP())
    `,
    binds,
  );
}
