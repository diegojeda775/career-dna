import { DIM_KEYS, type Dim, type DnaVector, type DnaWeights } from "./dimensions";
import {
  COPS_CLUSTERS,
  ENERGY,
  PROBE_COUNT,
  PROBES,
  QUESTION_BY_ID,
  type ConstraintKey,
  type CopsCluster,
  type Question,
} from "./questions";

export type AnswerValue = number | string | null;
export type Answers = Record<string, AnswerValue>;

export type Profile = {
  // 0..1 per dimension (0.5 = no signal either way)
  scores: DnaVector;
  // 0..1: how much evidence we have for each dimension
  confidence: DnaVector;
  constraints: Partial<Record<ConstraintKey, string>>;
  cops: { cluster: CopsCluster; name: string; score: number }[];
  type: { letters: string; axes: { left: string; right: string; pick: string; strength: number }[] };
};

// Evidence needed before we fully trust a dimension score
const FULL_CONFIDENCE = 8;

function accumulate(acc: { num: DnaVector; den: DnaVector }, weights: DnaWeights, value: number) {
  for (const [dim, w] of Object.entries(weights) as [Dim, number][]) {
    acc.num[dim] += value * w;
    acc.den[dim] += 2 * Math.abs(w);
  }
}

const zero = () => Object.fromEntries(DIM_KEYS.map((d) => [d, 0])) as DnaVector;

export function buildProfile(answers: Answers): Profile {
  const acc = { num: zero(), den: zero() };
  const constraints: Profile["constraints"] = {};

  for (const [id, value] of Object.entries(answers)) {
    const q = QUESTION_BY_ID.get(id);
    if (!q || value == null) continue;
    if (q.kind === "choice") {
      constraints[q.constraint] = String(value);
      const option = q.options.find((o) => o.value === value);
      // A dealbreaker pick counts like a strong answer
      if (option?.weights) accumulate(acc, option.weights, 2);
    } else if (typeof value === "number") {
      accumulate(acc, q.weights, value);
    }
  }

  const scores = zero();
  const confidence = zero();
  for (const d of DIM_KEYS) {
    scores[d] = acc.den[d] === 0 ? 0.5 : 0.5 + (0.5 * acc.num[d]) / acc.den[d];
    confidence[d] = Math.min(1, acc.den[d] / FULL_CONFIDENCE);
  }

  return { scores, confidence, constraints, cops: copsScores(answers), type: workType(scores) };
}

function copsScores(answers: Answers) {
  const totals = new Map<CopsCluster, { sum: number; n: number }>();
  for (const q of ENERGY) {
    const v = answers[q.id];
    if (q.kind !== "scale" || !q.cluster || typeof v !== "number") continue;
    const t = totals.get(q.cluster) ?? { sum: 0, n: 0 };
    t.sum += v;
    t.n += 1;
    totals.set(q.cluster, t);
  }
  return [...totals.entries()]
    .map(([cluster, t]) => ({ cluster, name: COPS_CLUSTERS[cluster], score: (t.sum / t.n + 2) / 4 }))
    .sort((a, b) => b.score - a.score);
}

// Myers-Briggs-style lean derived from the matching style dimensions
function workType(s: DnaVector): Profile["type"] {
  const axes = [
    { left: "I", right: "E", value: s.social },
    { left: "S", right: "N", value: s.abstract },
    { left: "T", right: "F", value: (s.empathy + (1 - s.analytical)) / 2 },
    { left: "P", right: "J", value: s.structure },
  ].map(({ left, right, value }) => ({
    left,
    right,
    pick: value >= 0.5 ? right : left,
    strength: Math.round(Math.abs(value - 0.5) * 200),
  }));
  return { letters: axes.map((a) => a.pick).join(""), axes };
}

// Pick the deep-dive probes that best match the strongest signals so far,
// so the last stretch of questions separates niche careers within those areas.
export function selectProbes(answers: Answers): string[] {
  const { scores, confidence } = buildProfile(answers);
  const ranked = PROBES.map((q) => {
    const dims = (q as Extract<Question, { kind: "scale" }>).probe ?? [];
    const interest = dims.reduce((sum, d) => sum + scores[d] * (0.5 + 0.5 * confidence[d]), 0) / dims.length;
    return { q, dims, interest };
  }).sort((a, b) => b.interest - a.interest);

  // Spread the probes across areas: at most 3 per lead dimension
  const perDim = new Map<Dim, number>();
  const picked: string[] = [];
  for (const { q, dims } of ranked) {
    const lead = dims[0]!;
    if ((perDim.get(lead) ?? 0) >= 3) continue;
    perDim.set(lead, (perDim.get(lead) ?? 0) + 1);
    picked.push(q.id);
    if (picked.length === PROBE_COUNT) break;
  }
  return picked;
}
