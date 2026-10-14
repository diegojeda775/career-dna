import { CORE_QUESTIONS, PROBES, QUESTION_BY_ID, type Question } from "@/features/dna/questions";
import type { Answers, AnswerValue } from "@/features/dna/profile";

const PROBE_IDS = new Set(PROBES.map((p) => p.id));

// Everyone answers the core questions; the adaptive deep-dive is appended once chosen.
export function questionSequence(probeIds: string[]): Question[] {
  return [...CORE_QUESTIONS, ...probeIds.map((id) => QUESTION_BY_ID.get(id)!).filter(Boolean)];
}

export function isValidProbeSet(ids: string[]) {
  return ids.every((id) => PROBE_IDS.has(id)) && new Set(ids).size === ids.length;
}

// Drop anything that isn't a legitimate answer to a known question
export function sanitizeAnswers(raw: unknown): Answers {
  if (raw == null || typeof raw !== "object") return {};
  const clean: Answers = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const q = QUESTION_BY_ID.get(id);
    if (!q) continue;
    if (value === null) {
      clean[id] = null;
    } else if (q.kind === "choice") {
      if (typeof value === "string" && q.options.some((o) => o.value === value)) clean[id] = value;
    } else if (typeof value === "number" && Number.isInteger(value) && value >= -2 && value <= 2) {
      clean[id] = value as AnswerValue;
    }
  }
  return clean;
}
