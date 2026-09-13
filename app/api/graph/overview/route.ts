import {
  getEmpresasConMovimientoReciente,
  getTransaccionesRecientesDetalle,
} from "@/features/graph/queries";
import { Capa1 } from "@/lib/algo/cap1";
import type { Transaccion } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const horas = Number(searchParams.get("horas") ?? 72);
  const dias = Math.max(1, Math.ceil(horas / 24));

  try {
    // Tres queries en paralelo, cada una ya filtrada por SQL con
    // precisión de hora — nunca reconstruyas el corte de tiempo en
    // JS a partir de columnas DATE, pierdes precisión y te terminas
    // anclando a los datos en vez de al reloj real (el bug que
    // causaba que se viera "apretado": entraban más días de los
    // que debía por el redondeo).
    const [rowsAnalisis, rowsVisibles, empresas] = await Promise.all([
      getTransaccionesRecientesDetalle(horas * 2), // ventana ancha, solo para Capa 1
      getTransaccionesRecientesDetalle(horas), // ventana exacta, lo que se dibuja
      getEmpresasConMovimientoReciente(horas),
    ]);

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
      fecha: String(t.FECHA).slice(0, 10),
    });

    const transaccionesAnalisis = rowsAnalisis.map(mapRow);
    const visibles = rowsVisibles.map(mapRow);

    // Nodos: RFCs distintos de la ventana visual (ya exacta), con
    // razón social desde el catálogo.
    const rfcs = [
      ...new Set(visibles.flatMap((t) => [t.origenId, t.destinoId])),
    ];
    const nombres = new Map(
      empresas.map((e) => [e.RFC_EMPRESA, e.RAZON_SOCIAL]),
    );
    const nodes = rfcs.map((rfc) => ({
      id: rfc,
      label: nombres.get(rfc) ?? rfc,
    }));

    // Aristas agregadas por relación, solo de la ventana visual.
    const conteos = new Map<string, number>();
    for (const t of visibles) {
      const key = `${t.origenId}->${t.destinoId}`;
      conteos.set(key, (conteos.get(key) ?? 0) + 1);
    }

    // Capa 1 SÍ usa la ventana ancha (transaccionesAnalisis) porque
    // necesita la previa para calcular crecimiento — esto no cambió.
    const veredictos = new Map<string, string>();
    for (const rfc of rfcs) {
      veredictos.set(
        rfc,
        new Capa1(rfc, transaccionesAnalisis).analizarModulo1(dias).veredicto,
      );
    }

    const edges = [...conteos].map(([key, count]) => {
      const [source, target] = key.split("->");
      return {
        source,
        target,
        weight: count,
        sospechosa:
          veredictos.get(source) === "alerta" ||
          veredictos.get(target) === "alerta",
      };
    });

    return Response.json({ nodes, edges });
  } catch (error) {
    console.error("Error fetching graph overview:", error);
    return Response.json({ error: "Could not fetch graph" }, { status: 500 });
  }
}
