import { executeQuery } from "@/lib/db";
import type { EmpresaActualRow } from "@/lib/types";

type EmpresaRow = {
  EMPRESA_SK: number;
  RFC_EMPRESA: string;
  RAZON_SOCIAL: string;
  GIRO: string;
  DOMICILIO_REGISTRADO: string;
  FECHA_CONSTITUCION: string;
};

export async function getEmpresasActuales(): Promise<EmpresaActualRow[]> {
  const rows = await executeQuery<EmpresaRow>(
    `
    SELECT
      empresa_sk,
      rfc_empresa,
      razon_social,
      giro,
      domicilio_registrado,
      fecha_constitucion
    FROM DIM_EMPRESA_ACTUAL
    ORDER BY razon_social
    `,
  );

  return rows.map((e) => ({
    empresaSk: e.EMPRESA_SK,
    rfc: e.RFC_EMPRESA,
    razonSocial: e.RAZON_SOCIAL,
    giro: e.GIRO,
    domicilio: e.DOMICILIO_REGISTRADO,
    fechaConstitucion: e.FECHA_CONSTITUCION,
  }));
}

type ScoreEvolucionRow = { PERIODO: string; SCORE_TOTAL: number };

export async function getEvolucionScoreRiesgo(rfc: string) {
  return executeQuery<ScoreEvolucionRow>(
    `
    SELECT
      f.periodo     AS PERIODO,
      f.score_total AS SCORE_TOTAL
    FROM FACT_FEATURES_RIESGO f
    JOIN DIM_EMPRESA_ACTUAL ea ON ea.empresa_sk = f.empresa_sk
    WHERE ea.rfc_empresa = ?
    ORDER BY f.periodo
    `,
    [rfc],
  );
}

type VolumenRow = {
  FECHA: string;
  NUM_TRANSACCIONES: number;
  MONTO_TOTAL: number;
};

export async function getVolumenTransaccionesPorDia(rfc: string, dias = 30) {
  return executeQuery<VolumenRow>(
    `
    SELECT
      t.fecha              AS FECHA,
      COUNT(*)              AS NUM_TRANSACCIONES,
      SUM(t.monto)           AS MONTO_TOTAL
    FROM FACT_TRANSACCION t
    JOIN DIM_EMPRESA eo ON eo.empresa_sk = t.empresa_origen_sk
    JOIN DIM_EMPRESA ed ON ed.empresa_sk = t.empresa_destino_sk
    WHERE (eo.rfc_empresa = ? OR ed.rfc_empresa = ?)
      AND t.fecha >= DATEADD(day, -?, CURRENT_DATE())
    GROUP BY t.fecha
    ORDER BY t.fecha
    `,
    [rfc, rfc, dias],
  );
}

type ContraparteRow = {
  CONTRAPARTE_RFC: string;
  CONTRAPARTE_NOMBRE: string;
  MONTO_TOTAL: number;
};

export async function getTopContrapartes(rfc: string, limite = 5) {
  return executeQuery<ContraparteRow>(
    `
    SELECT
      CASE WHEN eo.rfc_empresa = ? THEN ed.rfc_empresa ELSE eo.rfc_empresa END AS CONTRAPARTE_RFC,
      CASE WHEN eo.rfc_empresa = ? THEN ed_actual.razon_social ELSE eo_actual.razon_social END AS CONTRAPARTE_NOMBRE,
      SUM(t.monto) AS MONTO_TOTAL
    FROM FACT_TRANSACCION t
    JOIN DIM_EMPRESA eo ON eo.empresa_sk = t.empresa_origen_sk
    JOIN DIM_EMPRESA ed ON ed.empresa_sk = t.empresa_destino_sk
    JOIN DIM_EMPRESA_ACTUAL eo_actual ON eo_actual.rfc_empresa = eo.rfc_empresa
    JOIN DIM_EMPRESA_ACTUAL ed_actual ON ed_actual.rfc_empresa = ed.rfc_empresa
    WHERE eo.rfc_empresa = ? OR ed.rfc_empresa = ?
    GROUP BY 1, 2
    ORDER BY MONTO_TOTAL DESC
    LIMIT ?
    `,
    [rfc, rfc, rfc, rfc, limite],
  );
}

type AlertaHistorialRow = {
  ALERTA_SK: number;
  SEVERIDAD: string;
  ESTADO: string;
  SCORE_AL_MOMENTO: number;
  FECHA_GENERACION: string;
  FECHA_RESOLUCION: string | null;
};

export async function getHistorialAlertas(rfc: string, limite = 10) {
  return executeQuery<AlertaHistorialRow>(
    `
    SELECT
      a.alerta_sk         AS ALERTA_SK,
      a.severidad          AS SEVERIDAD,
      a.estado            AS ESTADO,
      a.score_al_momento    AS SCORE_AL_MOMENTO,
      a.fecha_generacion    AS FECHA_GENERACION,
      a.fecha_resolucion    AS FECHA_RESOLUCION
    FROM FACT_ALERTA a
    JOIN DIM_EMPRESA_ACTUAL ea ON ea.empresa_sk = a.empresa_sk
    WHERE ea.rfc_empresa = ?
    ORDER BY a.fecha_generacion DESC
    LIMIT ?
    `,
    [rfc, limite],
  );
}
