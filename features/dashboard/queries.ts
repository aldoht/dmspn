import { executeQuery } from "@/lib/db";
import { Transaccion } from "@/lib/types";

type BasicAlert = {
  ESTADO: string;
  FECHA_GENERACION: string;
  FECHA_RESOLUCION: string | null;
  SEVERIDAD: string;
};

export async function getCriticalAlertsOpen() {
  const rows = await executeQuery<BasicAlert>(
    `
    SELECT
      fa.estado as ESTADO,
      fa.fecha_generacion as FECHA_GENERACION,
      fa.fecha_resolucion as FECHA_RESOLUCION,
      fa.severidad as SEVERIDAD
    FROM FACT_ALERTA fa
    WHERE fa.fecha_resolucion IS NULL
      AND fa.severidad = 'critical'
    `,
    [],
  );
  return rows ?? [];
}

export function mapCriticalAlertsToKpi(alerts: BasicAlert[]) {
  const value = alerts.length;

  const groupedByDate = alerts.reduce<Record<string, number>>((acc, alert) => {
    const date = new Date(alert.FECHA_GENERACION).toISOString().slice(0, 10);

    acc[date] = (acc[date] ?? 0) + 1;

    return acc;
  }, {});

  const data = Object.entries(groupedByDate)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, count]) => ({
      label: date,
      value: count,
    }));

  return {
    value,
    change: 0,
    data,
  };
}

type TransaccionDetalleRow = {
  ID: number;
  ORIGEN_ID: string;
  DESTINO_ID: string;
  MONTO: number;
  FECHA: string;
};

export async function getTransactionsOverAmount(
  amount: number = 200_000,
  hours: number = 24 * 7,
) {
  const rows = await executeQuery<TransaccionDetalleRow>(
    `
    SELECT
      t.transaccion_sk AS ID,
      eo.rfc_empresa    AS ORIGEN_ID,
      ed.rfc_empresa    AS DESTINO_ID,
      t.monto          AS MONTO,
      t.fecha_hora          AS FECHA
    FROM FACT_TRANSACCION t
    JOIN DIM_EMPRESA eo
      ON eo.empresa_sk = t.empresa_origen_sk
     AND eo.es_version_actual = TRUE
    JOIN DIM_EMPRESA ed
      ON ed.empresa_sk = t.empresa_destino_sk
     AND ed.es_version_actual = TRUE
    WHERE t.fecha_hora >= DATEADD(hour, -?, CURRENT_TIMESTAMP())
      AND t.monto > ?
    `,
    [hours, amount],
  );

  const mapRow = (t: {
    ID: number;
    ORIGEN_ID: string;
    DESTINO_ID: string;
    MONTO: number;
    FECHA: string;
  }): Transaccion => ({
    id: String(t.ID),
    origenId: t.ORIGEN_ID,
    destinoId: t.DESTINO_ID,
    monto: Number(t.MONTO),
    fecha: String(t.FECHA),
  });

  return rows.map(mapRow) ?? [];
}

export function mapTransactionsToChart(transactions: Transaccion[]) {
  const grouped = transactions.reduce<Record<string, number>>(
    (acc, transaction) => {
      const date = new Date(transaction.fecha);

      date.setMinutes(0, 0, 0);

      const key = date.toISOString();

      acc[key] = (acc[key] ?? 0) + 1;

      return acc;
    },
    {},
  );

  return Object.entries(grouped)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, count]) => ({
      label: new Intl.DateTimeFormat("en", {
        day: "2-digit",
        month: "short",
      }).format(new Date(date)),
      count,
    }));
}

type AlertsBySeverityRow = {
  SEVERIDAD: string;
  COUNT: number;
};

export async function getOpenAlertsBySeverity() {
  const rows = await executeQuery<AlertsBySeverityRow>(
    `
    SELECT
      fa.severidad AS SEVERIDAD,
      COUNT(*)     AS COUNT
    FROM FACT_ALERTA fa
    WHERE fa.fecha_resolucion IS NULL
    GROUP BY fa.severidad
    `,
    [],
  );
  return rows ?? [];
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: "var(--color-risk-critical)",
  high: "var(--color-risk-high)",
  medium: "var(--color-risk-medium)",
  low: "var(--color-risk-low)",
};

export function mapAlertsBySeverityToChart(rows: AlertsBySeverityRow[]) {
  return rows.map((row) => ({
    name: row.SEVERIDAD,
    value: row.COUNT,
    color: SEVERITY_COLOR[row.SEVERIDAD] ?? "var(--color-text-muted)",
  }));
}

export async function getOpenAlertsLast72h() {
  const rows = await executeQuery<BasicAlert>(
    `
    SELECT
      fa.estado           as ESTADO,
      fa.fecha_generacion as FECHA_GENERACION,
      fa.fecha_resolucion as FECHA_RESOLUCION,
      fa.severidad        as SEVERIDAD
    FROM FACT_ALERTA fa
    WHERE fa.fecha_resolucion IS NULL
      AND fa.fecha_generacion >= DATEADD(hour, -72, CURRENT_TIMESTAMP())
    `,
    [],
  );
  return rows ?? [];
}

export function mapOpenAlerts72hToKpi(alerts: BasicAlert[]) {
  const value = alerts.length;

  const groupedByHour = alerts.reduce<Record<string, number>>((acc, alert) => {
    const hourBucket = new Date(alert.FECHA_GENERACION);
    hourBucket.setMinutes(0, 0, 0);
    const key = hourBucket.toISOString();

    acc[key] = (acc[key] ?? 0) + 1;

    return acc;
  }, {});

  const data = Object.entries(groupedByHour)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([iso, count]) => ({
      label: new Intl.DateTimeFormat("en", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso)),
      value: count,
    }));

  return {
    value,
    change: 0,
    data,
  };
}

type TopEnterpriseRow = {
  RFC: string;
  RAZON_SOCIAL: string;
  TX_COUNT: number;
};

export async function getEnterprisesWithMoreThan10Transactions(
  minTransactions: number = 2,
  hours: number = 24 * 7,
) {
  const rows = await executeQuery<TopEnterpriseRow>(
    `
    WITH tx AS (
      SELECT empresa_origen_sk AS empresa_sk FROM FACT_TRANSACCION
      WHERE fecha_hora >= DATEADD(hour, -?, CURRENT_TIMESTAMP())
      UNION ALL
      SELECT empresa_destino_sk AS empresa_sk FROM FACT_TRANSACCION
      WHERE fecha_hora >= DATEADD(hour, -?, CURRENT_TIMESTAMP())
    )
    SELECT
      e.rfc_empresa   AS RFC,
      e.razon_social  AS RAZON_SOCIAL,
      COUNT(*)        AS TX_COUNT
    FROM tx
    JOIN DIM_EMPRESA e
      ON e.empresa_sk = tx.empresa_sk
     AND e.es_version_actual = TRUE
    GROUP BY e.rfc_empresa, e.razon_social
    HAVING COUNT(*) > ?
    ORDER BY TX_COUNT DESC
    LIMIT 10
    `,
    [hours, hours, minTransactions],
  );
  return rows ?? [];
}

export function mapEnterprisesToChart(rows: TopEnterpriseRow[]) {
  return rows.map((row) => ({
    label: row.RAZON_SOCIAL,
    count: row.TX_COUNT,
  }));
}

type FalsePositiveRow = {
  FECHA_RESOLUCION: string;
};

export async function getFalsePositivesLast30d() {
  const rows = await executeQuery<FalsePositiveRow>(
    `
    SELECT
      fa.fecha_resolucion AS FECHA_RESOLUCION
    FROM FACT_ALERTA fa
    WHERE fa.estado = 'falso_positivo'
      AND fa.fecha_resolucion >= DATEADD(day, -30, CURRENT_TIMESTAMP())
    `,
    [],
  );
  return rows ?? [];
}

export function mapFalsePositivesToKpi(rows: FalsePositiveRow[]) {
  const value = rows.length;

  const groupedByDate = rows.reduce<Record<string, number>>((acc, row) => {
    const date = new Date(row.FECHA_RESOLUCION).toISOString().slice(0, 10);
    acc[date] = (acc[date] ?? 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(groupedByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      label: date,
      value: count,
    }));

  return {
    value,
    change: 0,
    data,
  };
}

type GeneratedVsResolvedRow = {
  DIA: string;
  GENERADAS: number;
  RESUELTAS: number;
};

export async function getGeneratedVsResolvedAlerts(days: number = 30) {
  const rows = await executeQuery<GeneratedVsResolvedRow>(
    `
    WITH generadas AS (
      SELECT
        DATE_TRUNC('day', fecha_generacion) AS DIA,
        COUNT(*) AS GENERADAS
      FROM FACT_ALERTA
      WHERE fecha_generacion >= DATEADD(day, -?, CURRENT_TIMESTAMP())
      GROUP BY 1
    ),
    resueltas AS (
      SELECT
        DATE_TRUNC('day', fecha_resolucion) AS DIA,
        COUNT(*) AS RESUELTAS
      FROM FACT_ALERTA
      WHERE fecha_resolucion IS NOT NULL
        AND fecha_resolucion >= DATEADD(day, -?, CURRENT_TIMESTAMP())
      GROUP BY 1
    )
    SELECT
      COALESCE(g.dia, r.dia)   AS DIA,
      COALESCE(g.generadas, 0) AS GENERADAS,
      COALESCE(r.resueltas, 0) AS RESUELTAS
    FROM generadas g
    FULL OUTER JOIN resueltas r ON g.dia = r.dia
    ORDER BY 1
    `,
    [days, days],
  );
  return rows ?? [];
}

export function mapGeneratedVsResolvedToChart(rows: GeneratedVsResolvedRow[]) {
  return rows.map((row) => ({
    label: new Intl.DateTimeFormat("en", {
      day: "2-digit",
      month: "short",
    }).format(new Date(row.DIA)),
    generated: row.GENERADAS,
    resolved: row.RESUELTAS,
  }));
}

type AvgRiskScoreRow = {
  PERIODO: string;
  AVG_SCORE: number;
};

export async function getAverageRiskScoreOverTime(days: number = 30) {
  const rows = await executeQuery<AvgRiskScoreRow>(
    `
    SELECT
      periodo         AS PERIODO,
      AVG(score_total) AS AVG_SCORE
    FROM FACT_FEATURES_RIESGO
    WHERE periodo >= DATEADD(day, -?, CURRENT_DATE())
    GROUP BY periodo
    ORDER BY periodo
    `,
    [days],
  );
  return rows ?? [];
}

export function mapAverageRiskScoreToChart(rows: AvgRiskScoreRow[]) {
  return rows.map((row) => ({
    label: new Intl.DateTimeFormat("en", {
      day: "2-digit",
      month: "short",
    }).format(new Date(row.PERIODO)),
    score: Number(row.AVG_SCORE.toFixed(2)),
  }));
}

type VolumeRow = {
  MONTO: number;
  FECHA: string;
};

export async function getTotalVolumeLast48h() {
  const rows = await executeQuery<VolumeRow>(
    `
    SELECT
      t.monto     AS MONTO,
      t.fecha_hora AS FECHA
    FROM FACT_TRANSACCION t
    WHERE t.fecha_hora >= DATEADD(hour, -48, CURRENT_TIMESTAMP())
    `,
    [],
  );
  return rows ?? [];
}

export function mapTotalVolumeToKpi(rows: VolumeRow[]) {
  const value = rows.reduce((sum, row) => sum + Number(row.MONTO), 0);

  const groupedByHour = rows.reduce<Record<string, number>>((acc, row) => {
    const hourBucket = new Date(row.FECHA);
    hourBucket.setMinutes(0, 0, 0);
    const key = hourBucket.toISOString();

    acc[key] = (acc[key] ?? 0) + Number(row.MONTO);

    return acc;
  }, {});

  const data = Object.entries(groupedByHour)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([iso, total]) => ({
      label: new Intl.DateTimeFormat("en", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso)),
      value: Math.round(total),
    }));

  return {
    value: Math.round(value),
    change: 0,
    data,
  };
}

type FirstActivityRow = {
  EMPRESA_SK: number;
  PRIMERA_FECHA: string;
};

export async function getEnterprisesFirstActivityThisMonth() {
  const rows = await executeQuery<FirstActivityRow>(
    `
    WITH primera_transaccion AS (
      SELECT empresa_sk, MIN(fecha_hora) AS primera_fecha
      FROM (
        SELECT empresa_origen_sk AS empresa_sk, fecha_hora FROM FACT_TRANSACCION
        UNION ALL
        SELECT empresa_destino_sk AS empresa_sk, fecha_hora FROM FACT_TRANSACCION
      )
      GROUP BY empresa_sk
    )
    SELECT
      empresa_sk    AS EMPRESA_SK,
      primera_fecha AS PRIMERA_FECHA
    FROM primera_transaccion
    WHERE primera_fecha >= DATEADD(month, -1, CURRENT_TIMESTAMP())
    `,
    [],
  );
  return rows ?? [];
}

export function mapFirstActivityToKpi(rows: FirstActivityRow[]) {
  const value = rows.length;

  const groupedByDate = rows.reduce<Record<string, number>>((acc, row) => {
    const date = new Date(row.PRIMERA_FECHA).toISOString().slice(0, 10);
    acc[date] = (acc[date] ?? 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(groupedByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      label: date,
      value: count,
    }));

  return {
    value,
    change: 0,
    data,
  };
}

type ClusterAlertRow = {
  CLUSTER_ID: number;
  FECHA_GENERACION: string;
};

export async function getClustersWithActiveAlert() {
  const rows = await executeQuery<ClusterAlertRow>(
    `
    SELECT DISTINCT
      fce.cluster_id       AS CLUSTER_ID,
      fa.fecha_generacion  AS FECHA_GENERACION
    FROM FACT_CLUSTER_EMPRESA fce
    JOIN FACT_ALERTA fa
      ON fa.empresa_sk = fce.empresa_sk
     AND fa.fecha_resolucion IS NULL
    `,
    [],
  );
  return rows ?? [];
}

export function mapClustersWithActiveAlertToKpi(rows: ClusterAlertRow[]) {
  const uniqueClusters = new Set(rows.map((row) => row.CLUSTER_ID));
  const value = uniqueClusters.size;

  const groupedByDate = rows.reduce<Record<string, Set<number>>>((acc, row) => {
    const date = new Date(row.FECHA_GENERACION).toISOString().slice(0, 10);
    if (!acc[date]) acc[date] = new Set();
    acc[date].add(row.CLUSTER_ID);
    return acc;
  }, {});

  const data = Object.entries(groupedByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, clusterSet]) => ({
      label: date,
      value: clusterSet.size,
    }));

  return {
    value,
    change: 0,
    data,
  };
}
