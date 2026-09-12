import { executeQuery } from "@/lib/db";
import { Bind } from "snowflake-sdk";

type Alerta = {
  ID: number;
  EMPRESA: string;
  SEVERIDAD: "critical" | "high" | "medium" | "low";
  CREATED_AT: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const severidad = searchParams.get("severidad");

  try {
    const alertas = await executeQuery<Alerta>(
      `SELECT id, empresa, severidad, created_at
       FROM alertas
       WHERE (? IS NULL OR severidad = ?)
       ORDER BY created_at DESC
       LIMIT 50`,
      [severidad, severidad] as Bind[],
    );

    return Response.json(alertas);
  } catch (error) {
    console.error("Error while fetching alerts:", error);
    return Response.json({ error: "Could not fetch alerts." }, { status: 500 });
  }
}
