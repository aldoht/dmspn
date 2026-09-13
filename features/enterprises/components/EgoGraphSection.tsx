import { getTopContrapartes } from "@/features/enterprises/queries";
import {
  getEmpresasDelGrupo,
  getTransaccionesDelGrupo,
} from "@/features/graph/queries";
import { scoreToRisk } from "@/features/graph/utils/scoreToRisk";
import { EmpresaEgoGraph } from "./EmpresaEgoGraph";

export async function EgoGraphSection({ rfc }: { rfc: string }) {
  const contrapartes = await getTopContrapartes(rfc, 8);
  const rfcs = [rfc, ...contrapartes.map((c) => c.CONTRAPARTE_RFC)];

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

  return <EmpresaEgoGraph empresas={empresas} transacciones={transacciones} />;
}
