import { DIM_KEYS, DIMENSIONS, dimDefault, type Dim, type DnaVector } from "@/features/dna/dimensions";
import type { Profile } from "@/features/dna/profile";
import { CAREERS, PATH_BY_ID } from "./data";
import type { Career, CareerPath } from "./types";

export type CareerMatch = {
  career: Career;
  score: number; // 0..100
  reasons: Dim[]; // shared strengths
  watchouts: Dim[]; // things this career leans on that you're lukewarm about
};

export type PathMatch = {
  path: CareerPath;
  score: number;
  careers: CareerMatch[];
};

export type MatchResult = {
  paths: PathMatch[];
  filtered: { total: number; removed: number; byReason: { reason: string; count: number }[] };
};

export function careerVector(c: Career): DnaVector {
  const v = Object.fromEntries(DIM_KEYS.map((d) => [d, dimDefault(d)])) as DnaVector;
  // Working conditions imply some DNA even when not spelled out
  v.physical = c.physical / 2;
  v.travel = c.travel / 2;
  v.adrenaline = c.danger / 2;
  v.nature = Math.max(v.nature, c.outdoor * 0.3);
  return { ...v, ...c.dna };
}

const VECTORS = new Map(CAREERS.map((c) => [c.id, careerVector(c)]));

// ── Dealbreakers ────────────────────────────────────────────────────────────

const FILTERS: { reason: string; fails: (c: Career, k: Profile["constraints"]) => boolean }[] = [
  {
    reason: "Nights, weekends or rotations",
    fails: (c, k) => (k.schedule === "standard" && c.schedule !== "standard") || (k.schedule === "shifts" && c.schedule === "irregular"),
  },
  { reason: "Too much training required", fails: (c, k) => k.education != null && c.eduLevel > Number(k.education) },
  { reason: "Too physically demanding", fails: (c, k) => k.physical === "desk" && c.physical === 2 },
  { reason: "Physical danger", fails: (c, k) => k.danger === "none" && c.danger === 2 },
  { reason: "Outdoors in all weather", fails: (c, k) => k.outdoor === "indoor" && c.outdoor === 2 },
  { reason: "Medical procedures", fails: (c, k) => k.medical === "no" && !!c.medical },
];

// ── Results-page filters & sorting ───────────────────────────────────────────
// These are chosen on the results page rather than in the questionnaire, so people
// can explore trade-offs (e.g. "what if I'd commute?") without retaking anything.

export const SORTS = { match: "Best match", pay: "Highest pay", growth: "Fastest growth" } as const;
export const SETUPS = {
  any: "Any setup",
  remote: "Remote-friendly",
  hybrid: "At least some remote",
  onsite: "On-site / out in the world",
} as const;
export const COMMUTES = { any: "Any travel", home: "Home every night", travel: "Travel-heavy" } as const;
export const MIN_PAYS = [0, 40000, 60000, 80000, 100000] as const;

export type ResultFilters = {
  sort: keyof typeof SORTS;
  setup: keyof typeof SETUPS;
  commute: keyof typeof COMMUTES;
  minPay: number;
};

export const DEFAULT_FILTERS: ResultFilters = { sort: "match", setup: "any", commute: "any", minPay: 0 };

const pick = <T extends string>(value: string | undefined, options: Record<T, string>, fallback: T) =>
  value != null && value in options ? (value as T) : fallback;

export function parseFilters(params: Record<string, string | undefined>): ResultFilters {
  const minPay = Number(params.minPay);
  return {
    sort: pick(params.sort, SORTS, "match"),
    setup: pick(params.setup, SETUPS, "any"),
    commute: pick(params.commute, COMMUTES, "any"),
    minPay: (MIN_PAYS as readonly number[]).includes(minPay) ? minPay : 0,
  };
}

const RESULT_FILTERS: { reason: string; fails: (c: Career, f: ResultFilters) => boolean }[] = [
  { reason: "Not remote-friendly", fails: (c, f) => f.setup === "remote" && c.remote < 2 },
  { reason: "No remote option", fails: (c, f) => f.setup === "hybrid" && c.remote < 1 },
  { reason: "Mostly desk-based", fails: (c, f) => f.setup === "onsite" && c.remote === 2 },
  { reason: "Below your pay floor", fails: (c, f) => c.pay < f.minPay },
  { reason: "Too much travel", fails: (c, f) => f.commute === "home" && c.travel === 2 },
  { reason: "Not enough travel", fails: (c, f) => f.commute === "travel" && c.travel === 0 },
];

const SORT_KEY: Record<ResultFilters["sort"], (m: CareerMatch) => number> = {
  match: (m) => m.score,
  pay: (m) => m.career.pay,
  growth: (m) => m.career.growth,
};

// ── Scoring ─────────────────────────────────────────────────────────────────

function scoreCareer(profile: Profile, c: Career): CareerMatch {
  const cv = VECTORS.get(c.id)!;
  const { scores: u, confidence: k } = profile;
  let fitNum = 0;
  let fitDen = 0;
  let joy = 0;
  let drain = 0;

  for (const d of DIM_KEYS) {
    const salience = Math.abs(u[d] - 0.5) * 2; // how strongly the person feels about this axis
    const careerSalience = Math.abs(cv[d] - dimDefault(d));
    const w = k[d] * (0.25 + salience + careerSalience);
    fitNum += w * (1 - Math.abs(u[d] - cv[d]));
    fitDen += w;
    // Energy: both you and the career are high on the same thing
    if (u[d] > 0.62 && cv[d] > 0.6) joy += (u[d] - 0.62) * (cv[d] - 0.6) * k[d];
    // Drain: the career leans hard on something that wears you out
    if (u[d] < 0.42 && cv[d] > 0.6) drain += (0.42 - u[d]) * (cv[d] - 0.6) * k[d];
  }

  const fit = fitDen ? fitNum / fitDen : 0.5;
  const raw = fit + 2.2 * joy - 3 * drain;

  const reasons = DIM_KEYS.filter((d) => u[d] > 0.6 && cv[d] >= 0.6)
    .sort((a, b) => u[b] * cv[b] - u[a] * cv[a])
    .slice(0, 3);
  const watchouts = DIM_KEYS.filter((d) => cv[d] >= 0.6 && u[d] < 0.45 && k[d] > 0.3)
    .sort((a, b) => cv[b] - u[b] - (cv[a] - u[a]))
    .slice(0, 2);

  return { career: c, score: raw, reasons, watchouts };
}

function centered(v: DnaVector) {
  return DIM_KEYS.map((d) => v[d] - dimDefault(d));
}

function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  a.forEach((x, i) => {
    dot += x * b[i]!;
    na += x * x;
    nb += b[i]! * b[i]!;
  });
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

// discovery: 0 = familiar, 1 = balanced, 2 = hidden gems
export function matchCareers(
  profile: Profile,
  discovery = Number(profile.constraints.discovery ?? 1),
  filters: ResultFilters = DEFAULT_FILTERS,
  limit = 5,
): MatchResult {
  const byReason = new Map<string, number>();
  const eligible: Career[] = [];
  for (const c of CAREERS) {
    const failed =
      FILTERS.find((f) => f.fails(c, profile.constraints)) ?? RESULT_FILTERS.find((f) => f.fails(c, filters));
    if (failed) byReason.set(failed.reason, (byReason.get(failed.reason) ?? 0) + 1);
    else eligible.push(c);
  }

  // Like a recommendation feed: lean toward or away from obscure careers
  const discoveryBoost = [-0.03, 0.015, 0.05][discovery] ?? 0.015;
  const scored = eligible
    .map((c) => scoreCareer(profile, c))
    .map((m) => ({ ...m, score: m.score + discoveryBoost * (m.career.obscurity - 0.5) * 2 }));

  // Group into paths; a path is as strong as its best career, plus a little depth
  const groups = new Map<string, CareerMatch[]>();
  for (const m of scored) groups.set(m.career.path, [...(groups.get(m.career.path) ?? []), m]);
  const candidates = [...groups.entries()].map(([id, matches]) => {
    matches.sort((a, b) => b.score - a.score);
    const depth = matches.length > 1 ? matches[1]!.score : matches[0]!.score;
    const centroid = matches.reduce(
      (acc, m) => acc.map((x, i) => x + centered(VECTORS.get(m.career.id)!)[i]! / matches.length),
      DIM_KEYS.map(() => 0),
    );
    return { path: PATH_BY_ID.get(id)!, careers: matches, raw: matches[0]!.score * 0.8 + depth * 0.2, centroid };
  });

  // Diversify (maximal marginal relevance) so the 5 paths aren't near-duplicates
  const picked: typeof candidates = [];
  const pool = [...candidates];
  while (picked.length < limit && pool.length) {
    let bestIdx = 0;
    let bestVal = -Infinity;
    pool.forEach((cand, i) => {
      const overlap = picked.length ? Math.max(...picked.map((p) => cosine(p.centroid, cand.centroid))) : 0;
      const val = cand.raw - 0.06 * Math.max(0, overlap);
      if (val > bestVal) {
        bestVal = val;
        bestIdx = i;
      }
    });
    picked.push(pool.splice(bestIdx, 1)[0]!);
  }

  // Matching decides WHICH paths you see; the sort only decides their order
  const key = SORT_KEY[filters.sort];
  const paths = picked.map((p) => ({
    path: p.path,
    score: toPercent(p.raw),
    careers: p.careers
      .map((m) => ({ ...m, score: toPercent(m.score) }))
      // Keep siblings only when they're genuinely close to the path's best fit
      .filter((m, i, all) => i === 0 || m.score >= Math.max(40, all[0]!.score - 30))
      .slice(0, 3)
      .sort((a, b) => key(b) - key(a)),
  }));
  if (filters.sort !== "match") paths.sort((a, b) => key(b.careers[0]!) - key(a.careers[0]!));

  return {
    paths,
    filtered: {
      total: CAREERS.length,
      removed: CAREERS.length - eligible.length,
      byReason: [...byReason.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
    },
  };
}

// Raw scores run ~0.6 (poor) to ~1.2 (strong fit plus lots of shared energy);
// a logistic curve keeps strong matches distinguishable instead of all pinning at 99
function toPercent(raw: number) {
  return Math.max(1, Math.min(99, Math.round(100 / (1 + Math.exp(-(raw - 0.78) * 12)))));
}

export function dimLabel(d: Dim) {
  return DIMENSIONS[d].label;
}
