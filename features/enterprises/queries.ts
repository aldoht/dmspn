import { executeQuery } from "@/lib/db";
import type { EmpresaActualRow } from "@/lib/types";

type EmpresaRow = {
  EMPRESA_SK: number;
  RFC_EMPRESA: string;
  RAZON_SOCIAL: string;
  GIRO: string;
  DOMICILIO_REGISTRADO: string;
  FECHA_CONSTITUCION: string;
};

export async function getEmpresasActuales(): Promise<EmpresaActualRow[]> {
  const rows = await executeQuery<EmpresaRow>(
    `
    SELECT
      empresa_sk,
      rfc_empresa,
      razon_social,
      giro,
      domicilio_registrado,
      fecha_constitucion
    FROM DIM_EMPRESA_ACTUAL
    ORDER BY razon_social
    `,
  );

  return rows.map((e) => ({
    empresaSk: e.EMPRESA_SK,
    rfc: e.RFC_EMPRESA,
    razonSocial: e.RAZON_SOCIAL,
    giro: e.GIRO,
    domicilio: e.DOMICILIO_REGISTRADO,
    fechaConstitucion: e.FECHA_CONSTITUCION,
  }));
}
