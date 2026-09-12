"use client";

import { useEffect, useState } from "react";
import type { EmpresaDetalle } from "../../../lib/types";

export function useEnterpriseDetail(rfc: string | null) {
  const [empresa, setEmpresa] = useState<EmpresaDetalle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rfc) {
      setEmpresa(null);
      return;
    }

    const controller = new AbortController();

    async function fetchEmpresa() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/enterprises/${rfc}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        const data: EmpresaDetalle = await res.json();
        setEmpresa(data);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchEmpresa();
    return () => controller.abort();
  }, [rfc]);

  return { empresa, loading, error };
}
