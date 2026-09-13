import type { RiesgoLevel } from "../../../lib/types";
import type {
  NivelAlerta,
  ResultadoModulo1,
} from "../../../lib/algo/cap1";

// Umbrales calibrados del score legacy (SCORE_TOTAL del warehouse).
// Los umbrales del score Capa1 viven en PESO_NIVEL + cap1.ts.
export function scoreToRisk(score: number | null): RiesgoLevel {
  if (score === null) return "low";
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

// Peso de cada nivel en el score (Fase A): alerta suma entero,
// observar suma parcial, ok no suma. Calibrar aquí impacta a todas.
const PESO_NIVEL: Record<NivelAlerta, number> = {
  alerta: 1,
  observar: 0.4,
  ok: 0,
};

// Piso por severidad máxima: garantiza coherencia con el veredicto OR
// (una sola alerta ya dispara veredicto=alerta y arista roja).
// Sin piso, 1 alerta promediaba 11 (low) y el rojo no matcheaba el badge.
// Con piso, veredicto=alerta implica score >= 60 (high+).
const PISO_NIVEL: Record<NivelAlerta, number> = {
  alerta: 60,
  observar: 30,
  ok: 0,
};

// Calcula el score 0-100 desde las 9 métricas votantes de analizarModulo1
// (variación, crecimiento, velocidad, estructuración, discrepancia,
// riesgoGeo, concentración, ciclos, zScore), todas con el mismo peso.
// Fórmula: max(promedio, piso) donde promedio = round(100 * Σ pesos / 9)
// y piso = 60 si hay alerta, 30 si hay observar, 0 si todo ok.
// Ej. 1 alerta sola: max(11, 60) = 60; 9 alertas: max(100, 60) = 100.
// Monótono: más severidad nunca baja el score.
// `cuentaTopDestino` no vota (contexto).
// Lee niveles (no valores crudos): hereda umbrales ya calibrados en cap1.ts.
// Pensado para FACT_FEATURES_RIESGO.SCORE_TOTAL (Fase B lo persiste).
export function analisisToScore(resultado: ResultadoModulo1): number {
  const niveles: NivelAlerta[] = [
    resultado.niveles.variacion,
    resultado.niveles.crecimiento,
    resultado.niveles.velocidad,
    resultado.niveles.estructuracion,
    resultado.niveles.discrepancia,
    resultado.niveles.riesgoGeo,
    resultado.niveles.concentracion,
    resultado.niveles.ciclos,
    resultado.niveles.zScore,
  ];
  const suma = niveles.reduce((acc, n) => acc + PESO_NIVEL[n], 0);
  const promedio = Math.round((100 * suma) / niveles.length);
  const piso = niveles.includes("alerta")
    ? PISO_NIVEL.alerta
    : niveles.includes("observar")
      ? PISO_NIVEL.observar
      : PISO_NIVEL.ok;
  return Math.max(promedio, piso);
}
