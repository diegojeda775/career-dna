// Sanity-check the engine: simulate people with known traits answering every
// question, then confirm the recommended paths make sense for them.
import { DIM_KEYS, type Dim } from "@/features/dna/dimensions";
import { CORE_QUESTIONS, QUESTION_BY_ID, TOTAL_QUESTIONS } from "@/features/dna/questions";
import { buildProfile, selectProbes, type Answers } from "@/features/dna/profile";
import { matchCareers, type ResultFilters, DEFAULT_FILTERS } from "@/features/careers/match";
import { CAREERS, PATH_BY_ID } from "@/features/careers/data";
import type { FieldId } from "@/features/careers/types";

type Persona = {
  name: string;
  traits: Partial<Record<Dim, number>>; // -1..1, unspecified = 0
  dealbreakers: Record<string, string>;
  filters?: Partial<ResultFilters>; // chosen on the results page
  // The top 3 paths must all sit in these fields (the catalog is too big to pin exact paths)
  expectFields: FieldId[];
};

const PERSONAS: Persona[] = [
  {
    name: "Thrill-seeking tradesperson",
    traits: { hands_on: 1, mechanical: 0.8, adrenaline: 1, physical: 0.9, travel: 0.6, nature: 0.4, abstract: -0.6, social: -0.2, words: -0.7, organizing: -0.5 },
    dealbreakers: { d_danger: "thrill", d_physical: "heavy", d_education: "2", d_schedule: "any" },
    expectFields: ["trades", "public", "agri", "transport"],
  },
  {
    name: "Introverted puzzle-solver who loves computers",
    traits: { tech: 1, investigative: 0.9, analytical: 0.7, social: -0.8, autonomy: 0.7, physical: -0.8, nature: -0.4, helping: -0.4, visibility: -0.7 },
    dealbreakers: { d_physical: "desk", d_danger: "none", d_education: "3" },
    filters: { setup: "hybrid" },
    expectFields: ["tech", "science", "engineering", "public"],
  },
  {
    name: "Empathetic, creative helper",
    traits: { helping: 1, empathy: 1, creative: 0.7, social: 0.6, analytical: -0.6, mechanical: -0.6, adrenaline: -0.5, tech: -0.4 },
    dealbreakers: { d_danger: "none", d_medical: "ok", d_education: "3" },
    expectFields: ["health", "education", "hospitality"],
  },
  {
    name: "Outdoorsy animal lover",
    traits: { animals: 1, nature: 1, investigative: 0.5, physical: 0.4, tech: -0.6, persuading: -0.6, organizing: -0.4, social: -0.3 },
    dealbreakers: { d_outdoor: "outdoor" },
    filters: { setup: "onsite" },
    expectFields: ["agri", "science"],
  },
  {
    name: "Charismatic deal-maker",
    traits: { persuading: 1, social: 1, visibility: 0.8, leading: 0.7, variety: 0.6, detail: -0.6, organizing: -0.5, hands_on: -0.5, structure: -0.4 },
    dealbreakers: {},
    filters: { minPay: 60000 },
    expectFields: ["sales", "business", "education"],
  },
  {
    name: "Remote-only detail organizer",
    traits: { detail: 1, organizing: 1, structure: 0.9, social: -0.7, variety: -0.6, adrenaline: -0.8, creative: -0.3, physical: -0.8 },
    dealbreakers: { d_education: "2", d_physical: "desk", d_danger: "none" },
    filters: { setup: "remote" },
    expectFields: ["business", "health", "creative"],
  },
];

// How would someone with these traits answer this question? (-2..2, a bit fuzzy)
function simulate(traits: Persona["traits"], weights: Partial<Record<Dim, number>>, seed: number) {
  let num = 0, den = 0;
  for (const [d, w] of Object.entries(weights) as [Dim, number][]) {
    num += w * (traits[d] ?? 0);
    den += Math.abs(w);
  }
  const noise = (Math.sin(seed * 9301) * 0.5);
  return Math.max(-2, Math.min(2, Math.round((den ? (2 * num) / den : 0) + noise)));
}

function answerAll(p: Persona): Answers {
  const answers: Answers = {};
  CORE_QUESTIONS.forEach((q, i) => {
    if (q.kind === "choice") answers[q.id] = p.dealbreakers[q.id] ?? (q.id === "d_discovery" ? "1" : null);
    else answers[q.id] = simulate(p.traits, q.weights, i);
  });
  for (const [i, id] of selectProbes(answers).entries()) {
    const q = QUESTION_BY_ID.get(id)!;
    if (q.kind !== "choice") answers[id] = simulate(p.traits, q.weights, 500 + i);
  }
  return answers;
}

let failures = 0;
console.log(`Questions per assessment: ${TOTAL_QUESTIONS} · careers: ${CAREERS.length}\n`);

for (const p of PERSONAS) {
  const answers = answerAll(p);
  const profile = buildProfile(answers);
  const result = matchCareers(profile, 1, { ...DEFAULT_FILTERS, ...p.filters });
  const top3 = result.paths.slice(0, 3).map((x) => x.path.field);
  const ok = top3.length > 0 && top3.every((f) => p.expectFields.includes(f));
  if (!ok) failures++;

  const strongest = DIM_KEYS.slice().sort((a, b) => profile.scores[b] - profile.scores[a]).slice(0, 4);
  console.log(`${ok ? "✓" : "✗"} ${p.name}  [${profile.type.letters}]  strongest: ${strongest.join(", ")}`);
  console.log(`   filtered ${result.filtered.removed}/${result.filtered.total}`);
  for (const pm of result.paths.slice(0, 5)) {
    console.log(`   ${String(pm.score).padStart(3)}  ${PATH_BY_ID.get(pm.path.id)!.name}: ${pm.careers.slice(0, 4).map((c) => `${c.career.title} (${c.score})`).join(", ")}`);
  }
  if (!ok) console.log(`   expected top 3 paths in ${p.expectFields.join(", ")}; got ${top3.join(", ")}`);
  console.log();
}

// Discovery dial should surface more obscure careers
const sample = buildProfile(answerAll(PERSONAS[1]!));
const avgObscurity = (d: number) => {
  const tops = matchCareers(sample, d).paths.slice(0, 5).map((p) => p.careers[0]!.career.obscurity);
  return tops.reduce((a, b) => a + b, 0) / tops.length;
};
const familiar = avgObscurity(0), hidden = avgObscurity(2);
console.log(`Discovery dial: avg obscurity familiar=${familiar.toFixed(2)} hidden=${hidden.toFixed(2)} ${hidden >= familiar ? "✓" : "✗"}`);
if (hidden < familiar) failures++;

// Sorting reorders the same matched paths; filters actually constrain careers
const base = buildProfile(answerAll(PERSONAS[1]!));
const byMatch = matchCareers(base, 1);
const byPay = matchCareers(base, 1, { ...DEFAULT_FILTERS, sort: "pay" });
const pays = byPay.paths.map((p) => p.careers[0]!.career.pay);
const samePaths = byMatch.paths.map((p) => p.path.id).sort().join() === byPay.paths.map((p) => p.path.id).sort().join();
const sortedDesc = pays.every((v, i) => i === 0 || pays[i - 1]! >= v);
console.log(`Sort by pay: ${pays.slice(0, 6).map((v) => `$${Math.round(v / 1000)}k`).join(" > ")} … ${samePaths && sortedDesc ? "✓" : "✗"}`);
if (!samePaths || !sortedDesc) failures++;

const floor = matchCareers(base, 1, { ...DEFAULT_FILTERS, minPay: 100000 });
const floorOk = floor.paths.every((p) => p.careers.every((c) => c.career.pay >= 100000));
const remote = matchCareers(base, 1, { ...DEFAULT_FILTERS, setup: "remote", commute: "home" });
const remoteOk = remote.paths.every((p) => p.careers.every((c) => c.career.remote === 2 && c.career.travel < 2));
const strict = matchCareers(base, 1, { ...DEFAULT_FILTERS, minMatch: 80 });
const strictOk = strict.careers.every((c) => c.score >= 80) && strict.paths.every((p) => p.careers.every((c) => c.score >= 80));
const everything = matchCareers(base, 1);
const allOk = everything.careers.length === everything.paths.reduce((n, p) => n + p.careers.length, 0);
console.log(`Min match 80%: ${strict.careers.length} careers ${strictOk ? "✓" : "✗"} · all ${everything.paths.length} paths returned ${allOk ? "✓" : "✗"}`);
if (!strictOk || !allOk) failures++;

console.log(`Filters: $100k floor ${floorOk ? "✓" : "✗"} · remote + home nightly ${remoteOk ? "✓" : "✗"}`);
if (!floorOk || !remoteOk) failures++;

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll checks passed");
