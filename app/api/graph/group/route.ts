import {
  getEmpresasDelGrupo,
  getTransaccionesDelGrupo,
} from "@/features/graph/queries";
import { scoreToRisk } from "@/features/graph/utils/scoreToRisk";

export async function POST(request: Request) {
  const { rfcs } = (await request.json()) as { rfcs: string[] };

  if (!rfcs?.length) {
    return Response.json(
      { error: "Se requiere al menos un RFC" },
      { status: 400 },
    );
  }

  try {
    const [empresasRows, transaccionesRows] = await Promise.all([
      getEmpresasDelGrupo(rfcs),
      getTransaccionesDelGrupo(rfcs),
    ]);

    const empresas = empresasRows.map((e) => ({
      id: e.RFC_EMPRESA,
      nombre: e.RAZON_SOCIAL,
      riesgo: scoreToRisk(e.SCORE_TOTAL),
    }));

    const transacciones = transaccionesRows.map((t) => ({
      id: String(t.ID),
      origenId: t.ORIGEN_ID,
      destinoId: t.DESTINO_ID,
      monto: t.MONTO,
      fecha: t.FECHA,
    }));

    return Response.json({ empresas, transacciones });
  } catch (error) {
    console.error("Error while fetching group details:", error);
    return Response.json(
      { error: "Could not fetch group details." },
      { status: 500 },
    );
  }
}
