import { executeQuery } from "@/lib/db";
import type { Bind } from "snowflake-sdk";
import type { ResultadoModulo1 } from "@/lib/algo/cap1";
import { analisisToScore, scoreToRisk } from "../graph/utils/scoreToRisk";

// Entrada por empresa: veredicto ya calculado en el overview.
// Solo veredictos alerta/observar generan fila (decisión: "ok" no alerta).
export type AlertaInput = {
  rfc: string;
  resultado: ResultadoModulo1;
};

// Normaliza DATE de Snowflake (llega Date u string) a YYYY-MM-DD.
// Duplicado mínimo desde overview/route para no acoplar capas.
function fechaCorta(v: unknown): string {
  if (v instanceof Date) {
    return Number.isFinite(v.getTime()) ? v.toISOString().slice(0, 10) : "";
  }
  return String(v ?? "").slice(0, 10);
}

// Persiste alertas en FACT_ALERTA con deduplicación: solo INSERT si no hay
// abierta para la misma (empresa, feature/periodo). Así el poll de 30s no
// genera duplicados: mismo periodo + abierta existente = se omite; nuevo
// periodo (nuevo feature_sk) = nueva alerta permitida.
// Columnas no disponibles quedan NULL (analista, resolución, comentario).
// ALERTA_SK se omite (supuesto identity, como FEATURE_SK).
// Nunca lanza hacia el route: el llamador la ejecuta en background con catch.
export async function persistirAlertas(items: AlertaInput[]): Promise<void> {
  const candidatos = items.filter(
    (i) =>
      i.resultado.veredicto === "alerta" ||
      i.resultado.veredicto === "observar",
  );
  if (candidatos.length === 0) {
    return;
  }
  const rfcs = [...new Set(candidatos.map((i) => i.rfc))];
  const phRfcs = rfcs.map(() => "?").join(", ");

  // 1. empresa_sk vigente por RFC.
  const skRows = await executeQuery<{ RFC: string; SK: number }>(
    `
    SELECT e.rfc_empresa AS RFC, e.empresa_sk AS SK
    FROM DIM_EMPRESA e
    WHERE e.rfc_empresa IN (${phRfcs})
      AND e.es_version_actual = TRUE
    `,
    rfcs as Bind[],
  );
  const skPorRfc = new Map(skRows.map((r) => [String(r.RFC), Number(r.SK)]));
  const sks = [...skPorRfc.values()];
  if (sks.length === 0) {
    return;
  }
  const phSks = sks.map(() => "?").join(", ");

  // 2. feature_sk por (empresa, periodo=hasta) — escrito antes por el MERGE.
  // Si aún no existe (MERGE falló o va después), se omite: el próximo poll
  // lo reintenta. No se inventa feature_sk.
  const featRows = await executeQuery<{
    SK: number;
    PERIODO: string | Date;
    FEATURE: number;
  }>(
    `
    SELECT f.empresa_sk AS SK, f.periodo AS PERIODO, f.feature_sk AS FEATURE
    FROM FACT_FEATURES_RIESGO f
    WHERE f.empresa_sk IN (${phSks})
    `,
    sks as Bind[],
  );
  const featurePorClave = new Map(
    featRows.map((r) => [
      `${Number(r.SK)}|${fechaCorta(r.PERIODO)}`,
      Number(r.FEATURE),
    ]),
  );

  // 3. Abiertas existentes del lote para no duplicar.
  const abiertas = await executeQuery<{ SK: number; FEATURE: number }>(
    `
    SELECT a.empresa_sk AS SK, a.feature_sk AS FEATURE
    FROM FACT_ALERTA a
    WHERE a.estado = 'abierta'
      AND a.empresa_sk IN (${phSks})
    `,
    sks as Bind[],
  );
  const abiertasSet = new Set(
    abiertas.map((a) => `${Number(a.SK)}|${Number(a.FEATURE)}`),
  );

  // 4. Solo nuevas: con feature existente y sin abierta para (empresa, feature).
  // Las omitidas por dedup se guardan aparte para sincronizarlas abajo.
  type FilaAlerta = { sk: number; feat: number; sev: string; score: number };
  const nuevos: FilaAlerta[] = [];
  const existentes: FilaAlerta[] = [];
  for (const c of candidatos) {
    const sk = skPorRfc.get(c.rfc);
    if (sk == null) {
      continue;
    }
    const feat = featurePorClave.get(`${sk}|${c.resultado.hasta}`);
    if (feat == null) {
      continue;
    }
    const score = analisisToScore(c.resultado);
    const fila: FilaAlerta = { sk, feat, sev: scoreToRisk(score), score };
    if (abiertasSet.has(`${sk}|${feat}`)) {
      existentes.push(fila);
      continue;
    }
    nuevos.push(fila);
  }

  if (nuevos.length > 0) {
    const values = nuevos.map(() => "(?, ?, ?, ?, 'abierta', NULL, CURRENT_TIMESTAMP(), NULL, NULL)").join(", ");
    const binds = nuevos.flatMap((n) => [n.sk, n.feat, n.sev, n.score]) as Bind[];

    await executeQuery(
      `
      INSERT INTO FACT_ALERTA
        (empresa_sk, feature_sk, severidad, score_al_momento, estado,
         analista_id, fecha_generacion, fecha_resolucion, comentario_analista)
      VALUES ${values}
      `,
      binds,
    );
  }

  // 5. Sincronizar abiertas: si el score vigente cambió (el MERGE de features
  // lo actualiza cada poll), la alerta abierta lo refleja para que la página
  // de alertas coincida con el panel del grafo. Solo abiertas del periodo
  // vigente; FECHA_GENERACION intacta (sigue siendo cuándo disparó).
  // Funciona subiendo y bajando (estado actual honesto).
  if (existentes.length > 0) {
    const updValues = existentes.map(() => "(?, ?, ?, ?)").join(", ");
    const updBinds = existentes.flatMap((n) => [n.sk, n.feat, n.score, n.sev]) as Bind[];

    await executeQuery(
      `
      UPDATE FACT_ALERTA a
      SET score_al_momento = s.score,
          severidad = s.sev
      FROM (VALUES ${updValues}) AS s(sk, feat, score, sev)
      WHERE a.empresa_sk = s.sk
        AND a.feature_sk = s.feat
        AND a.estado = 'abierta'
      `,
      updBinds,
    );
  }
}
