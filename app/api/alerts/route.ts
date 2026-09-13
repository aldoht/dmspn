import { executeQuery } from "@/lib/db";
import type { Bind } from "snowflake-sdk";
import type { AlertaResponse, RiesgoLevel } from "@/lib/types";

type AlertaRow = {
  ID: number;
  RFC: string;
  EMPRESA: string;
  SEVERIDAD: string;
  SCORE: number | null;
  ESTADO: string;
  FECHA: string | Date | null;
};

const NIVELES_VALIDOS: RiesgoLevel[] = [
  "critical",
  "high",
  "medium",
  "low",
  "resolved",
];

// Normaliza TIMESTAMP_NTZ (llega Date u string) a "YYYY-MM-DD HH:mm".
function fechaCorta(v: AlertaRow["FECHA"]): string {
  if (v instanceof Date) {
    return Number.isFinite(v.getTime())
      ? v.toISOString().slice(0, 16).replace("T", " ")
      : "";
  }
  if (v == null) {
    return "";
  }
  const s = String(v);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (m) {
    return `${m[1]} ${m[2]}`;
  }
  return s.slice(0, 16);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Filtros opcionales (?severidad=high&estado=abierta). Por defecto solo
  // abiertas (vista operativa); ?estado=todas muestra el historial.
  const severidad = searchParams.get("severidad");
  const estado = searchParams.get("estado") ?? "abierta";

  try {
    const rows = await executeQuery<AlertaRow>(
      `
      SELECT
        a.alerta_sk         AS ID,
        ea.rfc_empresa      AS RFC,
        ea.razon_social     AS EMPRESA,
        a.severidad         AS SEVERIDAD,
        a.score_al_momento  AS SCORE,
        a.estado            AS ESTADO,
        a.fecha_generacion  AS FECHA
      FROM FACT_ALERTA a
      JOIN DIM_EMPRESA ea
        ON ea.empresa_sk = a.empresa_sk
       AND ea.es_version_actual = TRUE
      WHERE (? IS NULL OR a.severidad = ?)
        AND (? = 'todas' OR a.estado = ?)
      ORDER BY a.fecha_generacion DESC
      LIMIT 50
      `,
      [severidad, severidad, estado, estado] as Bind[],
    );

    const alertas: AlertaResponse[] = rows.map((r) => ({
      id: Number(r.ID),
      rfc: String(r.RFC),
      empresa: String(r.EMPRESA),
      severidad: (NIVELES_VALIDOS as string[]).includes(
        String(r.SEVERIDAD).toLowerCase(),
      )
        ? (String(r.SEVERIDAD).toLowerCase() as RiesgoLevel)
        : "low",
      score: r.SCORE == null ? null : Number(r.SCORE),
      estado: String(r.ESTADO),
      fecha: fechaCorta(r.FECHA),
    }));

    return Response.json(alertas);
  } catch (error) {
    console.error("Error while fetching alerts:", error);
    return Response.json(
      { error: "Could not fetch alerts." },
      { status: 500 },
    );
  }
}
