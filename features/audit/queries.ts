import { executeQuery } from "@/lib/db";
import { getEmpresaPorRfc, getDuenosDeEmpresa } from "@/features/graph/queries";
import { getVolumenTransaccionesPorDia } from "@/features/enterprises/queries";

// Ventana móvil del resumen de auditoría: últimos 60 días calendario.
// Se usa DATEADD(day, -60, CURRENT_DATE()) para que sea móvil y no
// dependa de meses calendario (decisión de negocio: comparar siempre
// los mismos 60 días hacia atrás desde hoy).
const DIAS_RESUMEN = 60;

// Agregado direccional: ingresos = la empresa es DESTINO, egresos = es ORIGEN.
// FACT_TRANSACCION no tiene tipo/canal/moneda, así que la dirección es la
// única forma de separar "recibir" de "transferir".
export type FlujoResumen = {
  numTransacciones: number;
  montoTotal: number;
  ticketPromedio: number;
};

// Comercio contraparte agregado en la ventana: cuántas veces se repite (NUM)
// y por cuánto dinero (MONTO). Se usa tanto para destinos (a quién
// transfiere) como para orígenes (de quién recibe).
export type TopContraparteResumen = {
  rfc: string;
  nombre: string;
  numTransacciones: number;
  montoTotal: number;
};

// Dueño mayoritario: solo el de mayor pct_participacion (decisión de negocio).
// Si no hay dueño vigente, es null y el prompt lo reporta como no registrado.
export type DuenoMayor = {
  rfcPersona: string;
  nombreCompleto: string;
  pctParticipacion: number;
};

// Resumen completo que alimenta la ficha del Agent y el prompt de Gemini.
export type ResumenAuditoriaRfc = {
  empresa: {
    rfc: string;
    razonSocial: string;
    giro: string;
    domicilio: string;
    scoreTotal: number | null;
  };
  duenoMayor: DuenoMayor | null;
  ingresos: FlujoResumen;
  egresos: FlujoResumen;
  topDestinos: TopContraparteResumen[];
  topOrigenes: TopContraparteResumen[];
  serieDiaria: { fecha: string; numTransacciones: number; montoTotal: number }[];
};

type FlujoRow = { NUM: number; MONTO: number };

type TopRow = {
  RFC: string;
  NOMBRE: string;
  NUM: number;
  MONTO: number;
};

// Ingresos 60d: la empresa auditada es el destino del dinero.
export async function getIngresosUltimos60Dias(rfc: string): Promise<FlujoResumen> {
  const rows = await executeQuery<FlujoRow>(
    `
    SELECT
      COUNT(*) AS NUM,
      COALESCE(SUM(t.monto), 0) AS MONTO
    FROM FACT_TRANSACCION t
    JOIN DIM_EMPRESA ed ON ed.empresa_sk = t.empresa_destino_sk
    WHERE ed.rfc_empresa = ?
      AND t.fecha >= DATEADD(day, -?, CURRENT_DATE())
    `,
    [rfc, DIAS_RESUMEN],
  );
  const row = rows[0] ?? { NUM: 0, MONTO: 0 };
  const num = Number(row.NUM ?? 0);
  const monto = Number(row.MONTO ?? 0);
  return { numTransacciones: num, montoTotal: monto, ticketPromedio: num > 0 ? monto / num : 0 };
}

// Egresos 60d: la empresa auditada es el origen (transfiere a otras cuentas).
export async function getEgresosUltimos60Dias(rfc: string): Promise<FlujoResumen> {
  const rows = await executeQuery<FlujoRow>(
    `
    SELECT
      COUNT(*) AS NUM,
      COALESCE(SUM(t.monto), 0) AS MONTO
    FROM FACT_TRANSACCION t
    JOIN DIM_EMPRESA eo ON eo.empresa_sk = t.empresa_origen_sk
    WHERE eo.rfc_empresa = ?
      AND t.fecha >= DATEADD(day, -?, CURRENT_DATE())
    `,
    [rfc, DIAS_RESUMEN],
  );
  const row = rows[0] ?? { NUM: 0, MONTO: 0 };
  const num = Number(row.NUM ?? 0);
  const monto = Number(row.MONTO ?? 0);
  return { numTransacciones: num, montoTotal: monto, ticketPromedio: num > 0 ? monto / num : 0 };
}

// Top destinos 60d: comercios a los que MÁS dinero transfirió (origen = rfc).
// Ordenado por monto descendente; NUM indica cuántas veces se repite.
export async function getTopDestinos60Dias(rfc: string, limite = 5): Promise<TopContraparteResumen[]> {
  const rows = await executeQuery<TopRow>(
    `
    SELECT
      ed.rfc_empresa AS RFC,
      ea.razon_social AS NOMBRE,
      COUNT(*) AS NUM,
      SUM(t.monto) AS MONTO
    FROM FACT_TRANSACCION t
    JOIN DIM_EMPRESA eo ON eo.empresa_sk = t.empresa_origen_sk
    JOIN DIM_EMPRESA ed ON ed.empresa_sk = t.empresa_destino_sk
    JOIN DIM_EMPRESA_ACTUAL ea ON ea.rfc_empresa = ed.rfc_empresa
    WHERE eo.rfc_empresa = ?
      AND t.fecha >= DATEADD(day, -?, CURRENT_DATE())
    GROUP BY 1, 2
    ORDER BY MONTO DESC
    LIMIT ?
    `,
    [rfc, DIAS_RESUMEN, limite],
  );
  return rows.map((r) => ({
    rfc: r.RFC,
    nombre: r.NOMBRE,
    numTransacciones: Number(r.NUM ?? 0),
    montoTotal: Number(r.MONTO ?? 0),
  }));
}

// Top orígenes 60d: comercios de los que MÁS dinero recibió (destino = rfc).
export async function getTopOrigenes60Dias(rfc: string, limite = 5): Promise<TopContraparteResumen[]> {
  const rows = await executeQuery<TopRow>(
    `
    SELECT
      eo.rfc_empresa AS RFC,
      ea.razon_social AS NOMBRE,
      COUNT(*) AS NUM,
      SUM(t.monto) AS MONTO
    FROM FACT_TRANSACCION t
    JOIN DIM_EMPRESA eo ON eo.empresa_sk = t.empresa_origen_sk
    JOIN DIM_EMPRESA ed ON ed.empresa_sk = t.empresa_destino_sk
    JOIN DIM_EMPRESA_ACTUAL ea ON ea.rfc_empresa = eo.rfc_empresa
    WHERE ed.rfc_empresa = ?
      AND t.fecha >= DATEADD(day, -?, CURRENT_DATE())
    GROUP BY 1, 2
    ORDER BY MONTO DESC
    LIMIT ?
    `,
    [rfc, DIAS_RESUMEN, limite],
  );
  return rows.map((r) => ({
    rfc: r.RFC,
    nombre: r.NOMBRE,
    numTransacciones: Number(r.NUM ?? 0),
    montoTotal: Number(r.MONTO ?? 0),
  }));
}

// Compositor del resumen: ejecuta en paralelo empresa, dueño mayor,
// flujos direccionales, tops separados y serie diaria para el prompt.
// Retorna null si el RFC no existe en DIM_EMPRESA_ACTUAL.
export async function getResumenAuditoriaRfc(rfcNormalizado: string): Promise<ResumenAuditoriaRfc | null> {
  const [empresa, duenos, ingresos, egresos, topDestinos, topOrigenes, serie] = await Promise.all([
    getEmpresaPorRfc(rfcNormalizado),
    getDuenosDeEmpresa(rfcNormalizado),
    getIngresosUltimos60Dias(rfcNormalizado),
    getEgresosUltimos60Dias(rfcNormalizado),
    getTopDestinos60Dias(rfcNormalizado),
    getTopOrigenes60Dias(rfcNormalizado),
    getVolumenTransaccionesPorDia(rfcNormalizado, DIAS_RESUMEN),
  ]);

  if (!empresa) return null;

  const mayor = duenos[0] ?? null;

  return {
    empresa: {
      rfc: empresa.RFC_EMPRESA,
      razonSocial: empresa.RAZON_SOCIAL,
      giro: empresa.GIRO,
      domicilio: empresa.DOMICILIO_REGISTRADO,
      scoreTotal: empresa.SCORE_TOTAL,
    },
    duenoMayor: mayor
      ? {
          rfcPersona: mayor.RFC_PERSONA,
          nombreCompleto: mayor.NOMBRE_COMPLETO,
          pctParticipacion: Number(mayor.PCT_PARTICIPACION ?? 0),
        }
      : null,
    ingresos,
    egresos,
    topDestinos,
    topOrigenes,
    serieDiaria: serie.map((s) => ({
      fecha: s.FECHA,
      numTransacciones: Number(s.NUM_TRANSACCIONES ?? 0),
      montoTotal: Number(s.MONTO_TOTAL ?? 0),
    })),
  };
}
