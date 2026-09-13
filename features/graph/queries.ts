import { executeQuery } from "@/lib/db";

type EmpresaRow = {
  RFC_EMPRESA: string;
  RAZON_SOCIAL: string;
  PAIS_REGISTRADO: string | null;
};

export async function getEmpresasConMovimientoReciente(horas = 72) {
  return executeQuery<EmpresaRow>(
    `
    WITH transacciones_recientes AS (
      SELECT empresa_origen_sk, empresa_destino_sk
      FROM FACT_TRANSACCION
      WHERE fecha_hora >= DATEADD(hour, -?, CURRENT_TIMESTAMP())
    ),
    empresas_relevantes AS (
      SELECT DISTINCT empresa_origen_sk AS empresa_sk FROM transacciones_recientes
      UNION
      SELECT DISTINCT empresa_destino_sk FROM transacciones_recientes
    )
    SELECT DISTINCT ea.rfc_empresa AS RFC_EMPRESA, ea.razon_social AS RAZON_SOCIAL,
      gr.codigo_pais AS PAIS_REGISTRADO
    FROM empresas_relevantes er
    JOIN DIM_EMPRESA e ON e.empresa_sk = er.empresa_sk
    JOIN DIM_EMPRESA_ACTUAL ea ON ea.rfc_empresa = e.rfc_empresa
    -- País registrado (Módulo 4 Geografía): DIM_EMPRESA trae GEOGRAFIA_SK
    -- confirmado por DESCRIBE; se usa la versión del FACT (txs recientes).
    LEFT JOIN DIM_GEOGRAFIA gr ON gr.geografia_sk = e.geografia_sk
    `,
    [horas],
  );
}

type RelacionRow = {
  ORIGEN: string;
  DESTINO: string;
  NUM_TRANSACCIONES: number;
  MONTO_TOTAL: number;
};

export async function getRelacionesRecientes(horas = 72) {
  return executeQuery<RelacionRow>(
    `
    SELECT
      eo.rfc_empresa AS ORIGEN,
      ed.rfc_empresa AS DESTINO,
      COUNT(*)        AS NUM_TRANSACCIONES,
      SUM(t.monto)     AS MONTO_TOTAL
    FROM FACT_TRANSACCION t
    JOIN DIM_EMPRESA eo ON eo.empresa_sk = t.empresa_origen_sk
    JOIN DIM_EMPRESA ed ON ed.empresa_sk = t.empresa_destino_sk
    WHERE t.fecha_hora >= DATEADD(hour, -?, CURRENT_TIMESTAMP())
    GROUP BY eo.rfc_empresa, ed.rfc_empresa
    `,
    [horas],
  );
}

type EmpresaDetalleRow = {
  RFC_EMPRESA: string;
  RAZON_SOCIAL: string;
  SCORE_TOTAL: number | null;
};

export async function getEmpresasDelGrupo(rfcs: string[]) {
  const placeholders = rfcs.map(() => "?").join(", ");

  return executeQuery<EmpresaDetalleRow>(
    `
    SELECT
      ea.rfc_empresa AS RFC_EMPRESA,
      ea.razon_social AS RAZON_SOCIAL,
      f.score_total AS SCORE_TOTAL
    FROM DIM_EMPRESA_ACTUAL ea
    LEFT JOIN FACT_FEATURES_RIESGO f
      ON f.empresa_sk = ea.empresa_sk
      AND f.periodo = (
        SELECT MAX(periodo) FROM FACT_FEATURES_RIESGO
        WHERE empresa_sk = ea.empresa_sk
      )
    WHERE ea.rfc_empresa IN (${placeholders})
    `,
    rfcs,
  );
}

type TransaccionDetalleRow = {
  ID: number;
  ORIGEN_ID: string;
  DESTINO_ID: string;
  MONTO: number;
  FECHA: string;
  // Solo las queries con JOIN a DIM_GEOGRAFIA los devuelven
  // (getTransaccionesDelGrupo no: ahí llegan undefined).
  PAIS?: string | null;
  ALTO_RIESGO?: boolean;
  SIN_REGULACION?: boolean;
  // Solo con JOIN a DIM_CUENTA (getTransaccionesDelGrupo no).
  CUENTA_DESTINO?: string | null;
};

// Detalle individual de transacciones recientes para el overview + Capa 1.
// A diferencia de getRelacionesRecientes (agregados COUNT/SUM), aquí se
// devuelve tx por tx porque el Módulo 1 calcula distribución (desviación,
// z-score por tx, crecimiento por ventanas) y eso es imposible desde totales.
// Pedir el DOBLE de horas que la ventana a analizar: el crecimiento compara
// ventana actual vs previa y sin datos en la previa todo sale Infinity.
export async function getTransaccionesRecientesDetalle(horas = 1440) {
  return executeQuery<TransaccionDetalleRow>(
    `
    SELECT
      t.transaccion_sk AS ID,
      eo.rfc_empresa    AS ORIGEN_ID,
      ed.rfc_empresa    AS DESTINO_ID,
      t.monto          AS MONTO,
      t.fecha          AS FECHA,
      g.codigo_pais             AS PAIS,
      g.es_alto_riesgo_gafi     AS ALTO_RIESGO,
      NOT g.tiene_regulacion_formal AS SIN_REGULACION,
      cd.numero_cuenta          AS CUENTA_DESTINO
    FROM FACT_TRANSACCION t
    JOIN DIM_EMPRESA eo
      ON eo.empresa_sk = t.empresa_origen_sk
     AND eo.es_version_actual = TRUE
    JOIN DIM_EMPRESA ed
      ON ed.empresa_sk = t.empresa_destino_sk
     AND ed.es_version_actual = TRUE
    -- Geografía de la tx (Módulo 4): país + flags GAFI/regulación.
    -- Columnas confirmadas por DESCRIBE de DIM_GEOGRAFIA.
    JOIN DIM_GEOGRAFIA g ON g.geografia_sk = t.geografia_sk
    -- Cuenta destino (Módulo 5 Contrapartes): LEFT para no perder la tx
    -- si no tiene cuenta (la métrica excluye nulls, documentado).
    -- Columnas confirmadas por preview de DIM_CUENTA.
    LEFT JOIN DIM_CUENTA cd ON cd.cuenta_sk = t.cuenta_destino_sk
    WHERE t.fecha_hora >= DATEADD(hour, -?, CURRENT_TIMESTAMP())
    ORDER BY t.fecha_hora
    LIMIT 5000
    `,
    [horas],
  );
}

export async function getTransaccionesDelGrupo(rfcs: string[]) {
  const placeholders = rfcs.map(() => "?").join(", ");

  return executeQuery<TransaccionDetalleRow>(
    `
    SELECT
      t.transaccion_sk AS ID,
      eo.rfc_empresa    AS ORIGEN_ID,
      ed.rfc_empresa    AS DESTINO_ID,
      t.monto          AS MONTO,
      t.fecha          AS FECHA
    FROM FACT_TRANSACCION t
    JOIN DIM_EMPRESA eo ON eo.empresa_sk = t.empresa_origen_sk
    JOIN DIM_EMPRESA ed ON ed.empresa_sk = t.empresa_destino_sk
    WHERE eo.rfc_empresa IN (${placeholders}) AND ed.rfc_empresa IN (${placeholders})
    ORDER BY t.fecha_hora
    `,
    [...rfcs, ...rfcs],
  );
}

type EmpresaPorRfcRow = {
  RFC_EMPRESA: string;
  RAZON_SOCIAL: string;
  GIRO: string;
  DOMICILIO_REGISTRADO: string;
  SCORE_TOTAL: number | null;
};

export async function getEmpresaPorRfc(rfc: string) {
  const rows = await executeQuery<EmpresaPorRfcRow>(
    `
    SELECT
      ea.rfc_empresa           AS RFC_EMPRESA,
      ea.razon_social           AS RAZON_SOCIAL,
      ea.giro                  AS GIRO,
      ea.domicilio_registrado    AS DOMICILIO_REGISTRADO,
      f.score_total            AS SCORE_TOTAL
    FROM DIM_EMPRESA_ACTUAL ea
    LEFT JOIN FACT_FEATURES_RIESGO f
      ON f.empresa_sk = ea.empresa_sk
      AND f.periodo = (
        SELECT MAX(periodo) FROM FACT_FEATURES_RIESGO
        WHERE empresa_sk = ea.empresa_sk
      )
    WHERE ea.rfc_empresa = ?
    `,
    [rfc],
  );
  return rows[0] ?? null;
}

type DuenoRow = {
  RFC_PERSONA: string;
  NOMBRE_COMPLETO: string;
  PCT_PARTICIPACION: number;
};

export async function getDuenosDeEmpresa(rfc: string) {
  return executeQuery<DuenoRow>(
    `
    SELECT
      p.rfc_persona      AS RFC_PERSONA,
      p.nombre_completo    AS NOMBRE_COMPLETO,
      b.pct_participacion   AS PCT_PARTICIPACION
    FROM BRIDGE_EMPRESA_DUENO b
    JOIN DIM_PERSONA p ON p.persona_sk = b.persona_sk
    JOIN DIM_EMPRESA_ACTUAL ea ON ea.empresa_sk = b.empresa_sk
    WHERE ea.rfc_empresa = ? AND b.fecha_fin IS NULL
    ORDER BY b.pct_participacion DESC
    `,
    [rfc],
  );
}

type ActividadRow = { NUM_TRANSACCIONES: number; MONTO_TOTAL: number };

export async function getActividadReciente(rfc: string, horas = 72) {
  const rows = await executeQuery<ActividadRow>(
    `
    SELECT
      COUNT(*)                AS NUM_TRANSACCIONES,
      COALESCE(SUM(t.monto), 0) AS MONTO_TOTAL
    FROM FACT_TRANSACCION t
    JOIN DIM_EMPRESA eo ON eo.empresa_sk = t.empresa_origen_sk
    JOIN DIM_EMPRESA ed ON ed.empresa_sk = t.empresa_destino_sk
    WHERE (eo.rfc_empresa = ? OR ed.rfc_empresa = ?)
      AND t.fecha_hora >= DATEADD(hour, -?, CURRENT_TIMESTAMP())
    `,
    [rfc, rfc, horas],
  );
  return rows[0] ?? { NUM_TRANSACCIONES: 0, MONTO_TOTAL: 0 };
}
