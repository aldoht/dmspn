import { executeQuery } from "@/lib/db";

type EmpresaRow = { RFC_EMPRESA: string; RAZON_SOCIAL: string };

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
    SELECT DISTINCT ea.rfc_empresa AS RFC_EMPRESA, ea.razon_social AS RAZON_SOCIAL
    FROM empresas_relevantes er
    JOIN DIM_EMPRESA e ON e.empresa_sk = er.empresa_sk
    JOIN DIM_EMPRESA_ACTUAL ea ON ea.rfc_empresa = e.rfc_empresa
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
};

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
