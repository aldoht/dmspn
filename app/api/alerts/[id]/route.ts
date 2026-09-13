import { executeQuery } from "@/lib/db";
import type { Bind } from "snowflake-sdk";

// Cierra una alerta (ej. falso positivo): pasa a resuelta con fecha de
// resolución y deja de salir en la vista default (que filtra abiertas).
// Solo acepta "resuelta" (allowlist); reabrir queda para después.
// Idempotente en la práctica: si ya estaba cerrada devuelve 404 y la UI
// refresca. ANALISTA_ID se deja NULL (sin sistema de auth).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const alertaSk = Number(id);
  if (!Number.isInteger(alertaSk) || alertaSk <= 0) {
    return Response.json({ error: "ID de alerta inválido." }, { status: 400 });
  }

  let estado: unknown;
  try {
    ({ estado } = (await request.json()) as { estado?: unknown });
  } catch {
    return Response.json({ error: "Body JSON inválido." }, { status: 400 });
  }
  if (estado !== "resuelta") {
    return Response.json(
      { error: "Solo se permite cerrar como 'resuelta'." },
      { status: 400 },
    );
  }

  try {
    await executeQuery(
      `
      UPDATE FACT_ALERTA
      SET estado = 'resuelta',
          fecha_resolucion = CURRENT_TIMESTAMP()
      WHERE alerta_sk = ?
        AND estado = 'abierta'
      `,
      [alertaSk] as Bind[],
    );

    // Verificación: si sigue abierta es carrera concurrente (404). Si no
    // existe o ya estaba cerrada, el UPDATE no toca nada y se responde ok
    // (idempotente: cerrar dos veces no es error para la UI).
    const abierta = await executeQuery<{ N: number }>(
      `SELECT 1 AS N FROM FACT_ALERTA WHERE alerta_sk = ? AND estado = 'abierta'`,
      [alertaSk] as Bind[],
    );
    if (abierta.length > 0) {
      return Response.json(
        { error: "No se pudo cerrar la alerta." },
        { status: 404 },
      );
    }
    return Response.json({ ok: true, id: alertaSk });
  } catch (error) {
    console.error("Error while resolving alert:", error);
    return Response.json(
      { error: "Could not resolve alert." },
      { status: 500 },
    );
  }
}
