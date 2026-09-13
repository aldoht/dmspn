import type { RiesgoLevel } from "../../../lib/types";

// TODO: Define real thresholds for risk scores.
export function scoreToRisk(score: number | null): RiesgoLevel {
  if (score === null) return "low";
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}
