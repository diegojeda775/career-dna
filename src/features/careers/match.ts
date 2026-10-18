import { DIM_KEYS, DIMENSIONS, dimDefault, type Dim, type DnaVector } from "@/features/dna/dimensions";
import type { Profile } from "@/features/dna/profile";
import { CAREER_BY_ID, CAREERS, PATH_BY_ID } from "./data";
import type { Career, CareerPath } from "./types";
import { DEFAULT_FILTERS, type ResultFilters } from "./filters";

export * from "./filters";

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

// Lightweight shapes for the results page; full details load when a career is opened
export type CareerRow = {
  id: string;
  title: string;
  path: string;
  score: number;
  pay: number;
  growth: number;
  hidden: boolean;
};
// Paths reference careers by id so each row is only sent once
export type PathRow = { path: CareerPath; score: number; careerIds: string[] };

export function toRow(m: CareerMatch): CareerRow {
  const c = m.career;
  return { id: c.id, title: c.title, path: c.path, score: m.score, pay: c.pay, growth: c.growth, hidden: c.obscurity >= 0.7 };
}

// Why a career fits (or doesn't) for one person, without the discovery-adjusted score
export function explainCareer(profile: Profile, careerId: string) {
  const career = CAREER_BY_ID.get(careerId);
  if (!career) return null;
  const { reasons, watchouts } = scoreCareer(profile, career);
  return { career, reasons, watchouts };
}

export type MatchResult = {
  // Every path with at least one surviving career, best first (or by the chosen sort)
  paths: PathMatch[];
  // Every surviving career, for the by-field view
  careers: CareerMatch[];
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
  {
    reason: "Too physically demanding",
    fails: (c, k) => (k.physical === "desk" && c.physical >= 1) || (k.physical === "mix" && c.physical === 2),
  },
  { reason: "Physical danger", fails: (c, k) => k.danger === "none" && c.danger === 2 },
  { reason: "Outdoors in all weather", fails: (c, k) => k.outdoor === "indoor" && c.outdoor === 2 },
  { reason: "Medical procedures", fails: (c, k) => k.medical === "no" && !!c.medical },
];

// ── Results-page filters & sorting ───────────────────────────────────────────
// These are chosen on the results page rather than in the questionnaire, so people
// can explore trade-offs (e.g. "what if I'd commute?") without retaking anything.

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
  // Shared energy has diminishing returns, so careers tagged on many attributes can't run away with it
  const raw = fit + 0.45 * Math.tanh(joy / 0.2) - 3 * drain;

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
): MatchResult {
  const byReason = new Map<string, number>();
  const count = (reason: string) => byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
  const eligible: Career[] = [];
  for (const c of CAREERS) {
    const failed =
      FILTERS.find((f) => f.fails(c, profile.constraints)) ?? RESULT_FILTERS.find((f) => f.fails(c, filters));
    if (failed) count(failed.reason);
    else eligible.push(c);
  }

  // Like a recommendation feed: lean toward or away from obscure careers
  const discoveryBoost = [-0.03, 0.015, 0.05][discovery] ?? 0.015;
  const scored: (CareerMatch & { raw: number })[] = [];
  for (const c of eligible) {
    const m = scoreCareer(profile, c);
    const raw = m.score + discoveryBoost * (c.obscurity - 0.5) * 2;
    const score = toPercent(raw);
    if (score < filters.minMatch) count("Below your match threshold");
    else scored.push({ ...m, raw, score });
  }

  // Group into paths; a path is as strong as its best career, plus a little depth
  const groups = new Map<string, typeof scored>();
  for (const m of scored) groups.set(m.career.path, [...(groups.get(m.career.path) ?? []), m]);
  const candidates = [...groups.entries()].map(([id, matches]) => {
    matches.sort((a, b) => b.raw - a.raw);
    const depth = matches.length > 1 ? matches[1]!.raw : matches[0]!.raw;
    const centroid = matches.reduce(
      (acc, m) => acc.map((x, i) => x + centered(VECTORS.get(m.career.id)!)[i]! / matches.length),
      DIM_KEYS.map(() => 0),
    );
    return { path: PATH_BY_ID.get(id)!, careers: matches, raw: matches[0]!.raw * 0.8 + depth * 0.2, centroid };
  });

  // Diversify (maximal marginal relevance) so the top paths aren't near-duplicates
  const picked: typeof candidates = [];
  const pool = [...candidates];
  while (pool.length) {
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

  // Diversity decides which paths make the top 5; within the top 5 and the rest, show best first
  const byRaw = (x: (typeof picked)[number], y: (typeof picked)[number]) => y.raw - x.raw;
  picked.splice(0, picked.length, ...picked.slice(0, 5).sort(byRaw), ...picked.slice(5).sort(byRaw));

  // Matching decides the default order; another sort just reorders
  const key = SORT_KEY[filters.sort];
  const strip = ({ raw: _raw, ...m }: (typeof scored)[number]): CareerMatch => m;
  const paths = picked.map((p) => ({
    path: p.path,
    score: toPercent(p.raw),
    careers: p.careers.map(strip).sort((a, b) => key(b) - key(a)),
  }));
  if (filters.sort !== "match") paths.sort((a, b) => key(b.careers[0]!) - key(a.careers[0]!));

  return {
    paths,
    careers: scored.map(strip).sort((a, b) => key(b) - key(a)),
    filtered: {
      total: CAREERS.length,
      removed: CAREERS.length - scored.length,
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
