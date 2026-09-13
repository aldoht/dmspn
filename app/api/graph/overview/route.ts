import { getTransaccionesRecientesDetalle } from "@/features/graph/queries";
import { Capa1 } from "@/lib/algo/cap1";
import type { Transaccion } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const horas = Number(searchParams.get("horas") ?? 72);
  // Ventana en días para Capa 1 (redondea hacia arriba: 240h -> 10d).
  const dias = Math.max(1, Math.ceil(horas / 24));

  try {
    // Una sola query de detalle (tx por tx): de aquí se derivan nodos,
    // aristas y el flag sospechosa. Se pide el DOBLE de horas porque el
    // crecimiento del Módulo 1 compara ventana actual vs previa.
    const rows = await getTransaccionesRecientesDetalle(horas * 2);

    const transacciones: Transaccion[] = rows.map((t) => ({
      id: String(t.ID),
      origenId: t.ORIGEN_ID,
      destinoId: t.DESTINO_ID,
      monto: Number(t.MONTO),
      // FECHA puede llegar DATE o TIMESTAMP: normalizar a YYYY-MM-DD.
      fecha: String(t.FECHA).slice(0, 10),
    }));

    // Nodos: RFCs distintos. Label temporal = RFC (la razón social llega
    // con la Fase 0 al arreglar getEmpresasConMovimientoReciente).
    const rfcs = [
      ...new Set(transacciones.flatMap((t) => [t.origenId, t.destinoId])),
    ];
    const nodes = rfcs.map((rfc) => ({ id: rfc, label: rfc }));

    // Aristas agregadas por relación (mismo shape que antes: peso = conteo).
    const conteos = new Map<string, number>();
    for (const t of transacciones) {
      const key = `${t.origenId}->${t.destinoId}`;
      conteos.set(key, (conteos.get(key) ?? 0) + 1);
    }

    // Conexión Capa 1 <-> overview: veredicto por empresa, sin fechas
    // manuales (ventana móvil cortada en la fecha máxima de los datos).
    const veredictos = new Map<string, string>();
    for (const rfc of rfcs) {
      veredictos.set(
        rfc,
        new Capa1(rfc, transacciones).analizarModulo1(dias).veredicto,
      );
    }

    const edges = [...conteos].map(([key, count]) => {
      const [source, target] = key.split("->");
      return {
        source,
        target,
        weight: count,
        // Roja si alguna punta está en alerta (regla OR del Módulo 1).
        // "observar" no pinta: se revisa en el Group Detail.
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
