import {
  getEmpresaPorRfc,
  getDuenosDeEmpresa,
  getActividadReciente,
} from "@/features/graph/queries";
import { scoreToRisk } from "@/features/graph/utils/scoreToRisk";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ rfc: string }> },
) {
  const { rfc } = await params;

  try {
    const [empresa, duenos, actividad] = await Promise.all([
      getEmpresaPorRfc(rfc),
      getDuenosDeEmpresa(rfc),
      getActividadReciente(rfc, 210),
    ]);

    if (!empresa) {
      return Response.json({ error: "Empresa no encontrada" }, { status: 404 });
    }

    return Response.json({
      id: empresa.RFC_EMPRESA,
      nombre: empresa.RAZON_SOCIAL,
      giro: empresa.GIRO,
      domicilio: empresa.DOMICILIO_REGISTRADO,
      riesgo: scoreToRisk(empresa.SCORE_TOTAL),
      duenos: duenos.map((d) => ({
        rfcPersona: d.RFC_PERSONA,
        nombre: d.NOMBRE_COMPLETO,
        pctParticipacion: d.PCT_PARTICIPACION,
      })),
      numTransaccionesRecientes: actividad.NUM_TRANSACCIONES,
      montoTotalReciente: actividad.MONTO_TOTAL,
    });
  } catch (error) {
    console.error("Error while fetching enterprise details:", error);
    return Response.json(
      { error: "Could not fetch enterprise details." },
      { status: 500 },
    );
  }
}
