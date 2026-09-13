import {
  getEvolucionScoreRiesgo,
  getVolumenTransaccionesPorDia,
  getTopContrapartes,
  getHistorialAlertas,
} from "@/features/enterprises/queries";
import type { RiesgoLevel } from "@/lib/types";
import { ScoreRiesgoChart } from "./ScoreRiesgoChart";
import { VolumenTransaccionesChart } from "./VolumenTransaccionesChart";
import { TopContrapartesChart } from "./TopContrapartesChart";
import { AlertasTimeline } from "./AlertasTimeline";

export async function ScoreRiesgoSection({ rfc }: { rfc: string }) {
  const rows = await getEvolucionScoreRiesgo(rfc);
  const data = rows.map((r) => ({ periodo: r.PERIODO, score: r.SCORE_TOTAL }));
  return <ScoreRiesgoChart data={data} />;
}

export async function VolumenTransaccionesSection({ rfc }: { rfc: string }) {
  const rows = await getVolumenTransaccionesPorDia(rfc, 30);
  const data = rows.map((r) => ({
    fecha: r.FECHA,
    numTransacciones: r.NUM_TRANSACCIONES,
    montoTotal: r.MONTO_TOTAL,
  }));
  return <VolumenTransaccionesChart data={data} />;
}

export async function TopContrapartesSection({ rfc }: { rfc: string }) {
  const rows = await getTopContrapartes(rfc, 5);
  const data = rows.map((r) => ({
    nombre: r.CONTRAPARTE_NOMBRE,
    monto: r.MONTO_TOTAL,
  }));
  return <TopContrapartesChart data={data} />;
}

export async function AlertasSection({ rfc }: { rfc: string }) {
  const rows = await getHistorialAlertas(rfc, 10);
  const alertas = rows.map((r) => ({
    alertaSk: r.ALERTA_SK,
    severidad: r.SEVERIDAD as RiesgoLevel,
    estado: r.ESTADO,
    scoreAlMomento: r.SCORE_AL_MOMENTO,
    fechaGeneracion: r.FECHA_GENERACION,
    fechaResolucion: r.FECHA_RESOLUCION,
  }));
  return <AlertasTimeline alertas={alertas} />;
}
