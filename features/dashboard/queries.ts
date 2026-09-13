import { executeQuery } from "@/lib/db";

type BasicAlert = {
  ESTADO: string,
  FECHA_GENERACION: string,
  FECHA_RESOLUCION: string | null,
  SEVERIDAD: string,
}

export async function getCriticalAlertsOpen() {
  const rows = await executeQuery<BasicAlert[]>(
    `
    SELECT
      fa.estado as ESTADO,
      fa.fecha_generacion as FECHA_GENERACION,
      fa.fecha_resolucion as FECHA_RESOLUCION,
      fa.severidad as SEVERIDAD
    FROM FACT_ALERTA fa
    WHERE fa.fecha_resolucion IS NULL
      AND fa.severidad = 'CRITICAL'
    `,
    [],
  );
  return rows[0] ?? [];
}

export function mapCriticalAlertsToKpi(
  alerts: BasicAlert[],
) {
  const value = alerts.length;

  const groupedByDate = alerts.reduce<Record<string, number>>(
    (acc, alert) => {
      const date = new Date(alert.FECHA_GENERACION)
        .toISOString()
        .slice(0, 10);

      acc[date] = (acc[date] ?? 0) + 1;

      return acc;
    },
    {},
  );

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
