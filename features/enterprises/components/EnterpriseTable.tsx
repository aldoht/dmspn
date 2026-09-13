import Link from "next/link";
import type { EmpresaActualRow } from "@/lib/types";

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function EnterpriseTable({
  enterprises,
}: {
  enterprises: EmpresaActualRow[];
}) {
  if (enterprises.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-border text-sm text-text-muted">
        No hay empresas registradas.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-raised">
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              RFC
            </th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              Razón social
            </th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              Giro
            </th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              Domicilio
            </th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              Constitución
            </th>
          </tr>
        </thead>

        <tbody>
          {enterprises.map((enterprise, i) => (
            <tr
              key={enterprise.empresaSk}
              // `relative` aquí es lo que hace que el <Link> absoluto de
              // adentro se estire para cubrir TODA la fila (todas las
              // celdas), no solo la celda donde vive — el navegador busca
              // el ancestro posicionado más cercano, y como <td> no está
              // posicionado, encuentra el <tr>.
              className={`relative border-b border-border last:border-0 hover:bg-surface-raised ${
                i % 2 === 1 ? "bg-surface-raised/40" : ""
              }`}
            >
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-secondary">
                {/* Único <Link> real de la fila — cubre todo el <tr>
                    gracias al `absolute inset-0`. z-0 explícito para que
                    quede DEBAJO del texto (que no tiene z-index propio,
                    pero así evitamos cualquier ambigüedad de stacking). */}
                <Link
                  href={`/enterprise/${enterprise.rfc}`}
                  className="absolute inset-0 z-0"
                  aria-label={`Ver detalle de ${enterprise.razonSocial}`}
                />
                <span className="relative z-10">{enterprise.rfc}</span>
              </td>

              <td className="px-4 py-3 font-medium text-text-primary">
                {enterprise.razonSocial}
              </td>

              <td className="px-4 py-3">
                <span className="rounded bg-brand-subtle px-2 py-0.5 text-xs font-medium capitalize text-brand">
                  {enterprise.giro}
                </span>
              </td>

              <td
                className="max-w-xs truncate px-4 py-3 text-text-secondary"
                title={enterprise.domicilio}
              >
                {enterprise.domicilio}
              </td>

              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-muted">
                {formatearFecha(enterprise.fechaConstitucion)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="sr-only">
        Cada fila enlaza al detalle de la empresa correspondiente.
      </p>
    </div>
  );
}
