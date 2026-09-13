import {
  getEmpresasConMovimientoReciente,
  getRelacionesRecientes,
} from "@/features/graph/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const horas = Number(searchParams.get("horas") ?? 72);

  try {
    const [empresas, relaciones] = await Promise.all([
      getEmpresasConMovimientoReciente(horas),
      getRelacionesRecientes(horas),
    ]);

    const nodes = empresas.map((e) => ({
      id: e.RFC_EMPRESA,
      label: e.RAZON_SOCIAL,
    }));

    const edges = relaciones.map((r) => ({
      source: r.ORIGEN,
      target: r.DESTINO,
      weight: r.NUM_TRANSACCIONES,
      // TODO: USE REAL ALGORITHM TO DETECT SUSPICIOUS ACTIVITY.
      sospechosa: false,
    }));

    return Response.json({ nodes, edges });
  } catch (error) {
    console.error("Error fetching graph overview:", error);
    return Response.json({ error: "Could not fetch graph" }, { status: 500 });
  }
}
