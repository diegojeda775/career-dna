// Builds src/features/careers/generated/onet.json from official sources:
//   • O*NET 31.0 database (CC BY 4.0): occupations, descriptions, tasks, interests,
//     knowledge, work activities, work context and work styles, which become each career's DNA
//   • BLS Employment Projections, Table 1.2: median pay, 10-year growth, employment,
//     typical education and training, which also refresh the hand-curated careers
//
// Usage: npm run data:import
//   O*NET CSVs are downloaded automatically into data/raw/onet-<version>/.
//   BLS blocks scripted downloads, so save https://www.bls.gov/emp/ind-occ-matrix/occupation.xlsx
//   from a browser to data/raw/bls-occupation.xlsx first.

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import readXlsxFile from "read-excel-file/node";
import { DIM_KEYS, DIMENSIONS, type Dim } from "../src/features/dna/dimensions";
import { GENERAL_CAREERS } from "../src/features/careers/data-general";
import { NICHE_CAREERS } from "../src/features/careers/data-niche";
import type { Career, CareerPath, FieldId, Level } from "../src/features/careers/types";

const ONET_VERSION = process.env.ONET_VERSION ?? "31_0";
const ONET_DIR = `data/raw/onet-${ONET_VERSION}`;
const BLS_FILE = "data/raw/bls-occupation.xlsx";
const OUT_FILE = "src/features/careers/generated/onet.json";
const ONET_FILES = [
  "occupation_data",
  "career_interest_types",
  "knowledge",
  "work_activities",
  "work_context",
  "work_styles",
  "job_zones",
  "task_statements",
] as const;

// ── Loading ─────────────────────────────────────────────────────────────────

const exists = (p: string) => access(p).then(() => true, () => false);

async function ensureOnet() {
  await mkdir(ONET_DIR, { recursive: true });
  for (const name of ONET_FILES) {
    const file = path.join(ONET_DIR, `${name}.csv`);
    if (await exists(file)) continue;
    const url = `https://www.onetcenter.org/dl_files/database/db_${ONET_VERSION}_csv/${name}.csv`;
    console.log(`Downloading ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`O*NET download failed (${res.status}): ${url}`);
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
  }
}

// RFC 4180 CSV: quoted fields may contain commas, quotes ("") and newlines
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') (field += '"'), i++;
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") row.push(field), (field = "");
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field), rows.push(row), (row = []), (field = "");
    } else field += ch;
  }
  if (field || row.length) row.push(field), rows.push(row);
  const [header, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(header!.map((h, i) => [h, r[i] ?? ""])));
}

const loadCsv = async (name: (typeof ONET_FILES)[number]) => parseCsv(await readFile(path.join(ONET_DIR, `${name}.csv`), "utf8"));

// code → element name → value, for one scale
function indexScale(rows: Record<string, string>[], scale: string) {
  const map = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (r["Scale ID"] !== scale || r["Recommend Suppress"] === "Y") continue;
    const code = r["O*NET-SOC Code"]!;
    if (!map.has(code)) map.set(code, new Map());
    map.get(code)!.set(r["Element Name"]!, Number(r["Data Value"]));
  }
  return map;
}

type BlsRow = {
  title: string;
  code: string;
  type: "Summary" | "Line item";
  employment: number; // thousands, 2025
  growth: number; // percent, 2025–35
  pay: number | null; // median annual wage
  education: string;
  experience: string;
  training: string;
  oohUrl?: string;
};

async function loadBls() {
  if (!(await exists(BLS_FILE))) {
    throw new Error(
      `Missing ${BLS_FILE}. BLS blocks scripted downloads, so save\n  https://www.bls.gov/emp/ind-occ-matrix/occupation.xlsx\nfrom a browser to ${BLS_FILE} and re-run.`,
    );
  }
  const sheets = await readXlsxFile(BLS_FILE);
  const table = sheets.find((s) => s.sheet.startsWith("Table 1.2"));
  if (!table) throw new Error("Table 1.2 not found in the BLS workbook");

  const headerIdx = table.data.findIndex((r) => r.some((c) => String(c ?? "").startsWith("Median annual wage")));
  const header = table.data[headerIdx]!.map((c) => String(c ?? ""));
  const col = (prefix: string) => {
    const i = header.findIndex((h) => h.startsWith(prefix));
    if (i < 0) throw new Error(`BLS column "${prefix}" not found`);
    return i;
  };
  const c = {
    title: 0,
    code: header.findIndex((h) => /Matrix code$/.test(h)),
    type: col("Occupation type"),
    employment: col("Employment, 20"),
    growth: col("Employment change, percent"),
    pay: col("Median annual wage"),
    education: col("Typical education"),
    experience: col("Work experience"),
    training: col("Typical on-the-job training"),
  };
  if (c.code < 0) throw new Error("BLS matrix code column not found");

  const num = (v: unknown) => {
    if (typeof v === "number") return v;
    // Text cells look like "—" (no data) or ">=239,200" (top-coded wage)
    const digits = String(v ?? "").replace(/[^0-9.-]/g, "");
    return digits && digits !== "-" ? Number(digits) : null;
  };
  const rows = new Map<string, BlsRow>();
  for (const r of table.data.slice(headerIdx + 1)) {
    const code = String(r[c.code] ?? "");
    if (!/^\d\d-\d{4}$/.test(code)) continue;
    const link = r.find((cell) => typeof cell === "string" && cell.includes("href="));
    rows.set(code, {
      title: String(r[c.title]),
      code,
      type: String(r[c.type]) as BlsRow["type"],
      employment: num(r[c.employment]) ?? 0,
      growth: num(r[c.growth]) ?? 0,
      pay: num(r[c.pay]),
      education: String(r[c.education] ?? ""),
      experience: String(r[c.experience] ?? ""),
      training: String(r[c.training] ?? ""),
      oohUrl: typeof link === "string" ? link.match(/href="([^"]+)"/)?.[1] : undefined,
    });
  }
  return { rows, title: String(table.data[0]?.[0] ?? "Table 1.2") };
}

// ── Mapping helpers ─────────────────────────────────────────────────────────

const soc6 = (onetCode: string) => onetCode.slice(0, 7);
const broadOf = (soc: string) => `${soc.slice(0, 6)}0`;
// SOC minor groups are usually XX-Y000; a few (e.g. 15-1200 Computer occupations) use XX-YY00
const minorCandidates = (soc: string) => [`${soc.slice(0, 5)}00`, `${soc.slice(0, 4)}000`];
const majorOf = (soc: string) => `${soc.slice(0, 2)}-0000`;

function blsFor(rows: Map<string, BlsRow>, soc: string) {
  return rows.get(soc) ?? rows.get(broadOf(soc));
}

function fieldFor(soc: string): FieldId {
  if (soc.startsWith("37-3") || soc.startsWith("39-2") || soc.startsWith("45-")) return "agri";
  const byMajor: Record<string, FieldId> = {
    "11": "business", "13": "business", "15": "tech", "17": "engineering", "19": "science",
    "21": "education", "23": "business", "25": "education", "27": "creative", "29": "health",
    "31": "health", "33": "public", "35": "hospitality", "37": "hospitality", "39": "hospitality",
    "41": "sales", "43": "business", "47": "trades", "49": "trades", "51": "trades",
    "53": "transport", "55": "public",
  };
  return byMajor[soc.slice(0, 2)] ?? "business";
}

function eduLevel(education: string, training: string, jobZone?: number): Career["eduLevel"] {
  const e = education.toLowerCase();
  if (e.includes("doctoral") || e.includes("master")) return 4;
  if (e.includes("bachelor")) return 3;
  if (e.includes("associate")) return 2;
  if (e.includes("postsecondary") || e.includes("some college")) return 1;
  if (e.includes("high school") || e.includes("no formal")) {
    const t = training.toLowerCase();
    if (t.includes("apprenticeship")) return 2;
    if (t.includes("long-term") || t.includes("internship")) return 1;
    return 0;
  }
  // Fall back to O*NET job zone when BLS has no education entry
  return jobZone ? (([0, 0, 0, 2, 3, 4] as const)[jobZone] ?? 1) : 1;
}

// Plain-language training summary, e.g. "Bachelor's degree; plus internship/residency"
function educationText(b: BlsRow) {
  const parts = [b.education];
  if (b.training && b.training !== "None" && b.training !== "—") parts.push(b.training.toLowerCase());
  return parts.join("; ");
}

function startSteps(b: BlsRow): string[] {
  const steps = [`Typical entry requirement: ${b.education.toLowerCase()}`];
  if (b.experience && !["None", "—"].includes(b.experience)) {
    steps.push(`Usually needs ${b.experience.toLowerCase()} of experience in a related occupation`);
  }
  if (b.training && !["None", "—"].includes(b.training)) steps.push(`Expect ${b.training.toLowerCase()} once hired`);
  steps.push("Read the full profile on My Next Move for skills, related titles and local job listings");
  return steps;
}

// Trim long O*NET descriptions to the first sentence or two
function shortSummary(description: string) {
  const sentences = description.match(/[^.!?]+[.!?]+/g) ?? [description];
  let out = "";
  for (const s of sentences) {
    if (out && (out + s).length > 260) break;
    out += s;
  }
  return out.trim();
}

const STOP = new Set(["and", "of", "the", "except", "all", "other", "or", "a", "in", "for"]);
const tokens = (title: string) =>
  new Set(
    title
      .toLowerCase()
      .replace(/[^a-z ]/g, " ")
      .split(/\s+/)
      .filter((w) => w && !STOP.has(w))
      .map((w) => w.replace(/(ies)$/, "y").replace(/s$/, "")),
  );
function similarTitles(a: string, b: string) {
  const ta = tokens(a);
  const tb = tokens(b);
  const shared = [...ta].filter((t) => tb.has(t)).length;
  return shared / Math.min(ta.size, tb.size) > 0.5;
}

const ANIMALS = /animal|veterinar|livestock|\bzoo|wildlife|\bfish\b|fishers|aquacultur|poultry|cattle|horse|\bdog|kennel|\bpet\b|ranch/i;
const TRAVEL_HEAVY = /pilot|flight attendant|\bship|vessel|sailor|deckhand|merchant|tractor-trailer|locomotive|railroad conductor|travel guide|tour guide|captains, mates|fishing and hunting/i;
const TRAVEL_SOME = /driver|sales representative|\bfield\b|inspector|installer|surveyor|appraiser|claims|consultant|auditor|courier|delivery|transit|\bbus\b/i;

// ── Build ───────────────────────────────────────────────────────────────────

async function main() {
  await ensureOnet();
  const [occupations, interests, knowledge, activities, context, styles, zones, tasks] = await Promise.all(
    ONET_FILES.map(loadCsv),
  );
  const bls = await loadBls();

  const OI = indexScale(interests, "OI"); // 1–7
  const K = indexScale(knowledge, "IM"); // 1–5
  const WA = indexScale(activities, "IM"); // 1–5
  const CX = indexScale(context, "CX"); // 1–5
  const WI = indexScale(styles, "WI"); // roughly -1.4–3
  const scheduleShare = new Map<string, Map<string, number>>(); // Work Schedules: 1 regular, 2 irregular, 3 seasonal
  for (const r of context) {
    if (r["Element Name"] !== "Work Schedules" || r["Scale ID"] !== "CTP") continue;
    const code = r["O*NET-SOC Code"]!;
    if (!scheduleShare.has(code)) scheduleShare.set(code, new Map());
    scheduleShare.get(code)!.set(r["Category"]!, Number(r["Data Value"]));
  }
  const jobZone = new Map(zones.map((z) => [z["O*NET-SOC Code"]!, Number(z["Job Zone"])]));
  const coreTasks = new Map<string, { task: string; n: number }[]>();
  for (const t of tasks) {
    if (t["Task Type"] !== "Core") continue;
    const list = coreTasks.get(t["O*NET-SOC Code"]!) ?? [];
    list.push({ task: t["Task"]!, n: Number(t["Incumbents Responding"]) || 0 });
    coreTasks.set(t["O*NET-SOC Code"]!, list);
  }

  // Work-style impact runs on its own scale; rescale each style to 0–1 across occupations
  const wsRange = new Map<string, [number, number]>();
  for (const m of WI.values())
    for (const [name, v] of m) {
      const [lo, hi] = wsRange.get(name) ?? [Infinity, -Infinity];
      wsRange.set(name, [Math.min(lo, v), Math.max(hi, v)]);
    }

  const curated = [...NICHE_CAREERS, ...GENERAL_CAREERS];
  const generalSocs = new Set(GENERAL_CAREERS.map((c) => c.soc));
  // Curated careers that are exactly an O*NET occupation say so with onetCode
  const curatedCodes = new Set(curated.map((c) => c.onetCode).filter(Boolean));
  const skipped = { noData: 0, noBls: 0, noPay: 0, duplicate: 0, allOther: 0 };

  type Draft = { code: string; title: string; description: string; raw: Partial<Record<Dim, number>>; extra: Record<string, number> };
  const drafts: Draft[] = [];

  for (const occ of occupations) {
    const code = occ["O*NET-SOC Code"]!;
    const title = occ["Title"]!;
    if (/all other/i.test(title)) {
      skipped.allOther++;
      continue;
    }
    if (!OI.has(code) || !CX.has(code) || !K.has(code) || !WA.has(code)) {
      skipped.noData++;
      continue;
    }
    const soc = soc6(code);
    const b = blsFor(bls.rows, soc);
    if (!b) {
      skipped.noBls++;
      continue;
    }
    if (b.pay == null) {
      skipped.noPay++;
      continue;
    }
    const isBase = code.endsWith(".00");
    const dup =
      curatedCodes.has(code) ||
      (isBase && generalSocs.has(soc)) ||
      curated.some((c) => c.soc === soc && similarTitles(c.title, title));
    if (dup) {
      if (process.env.DEBUG_DUPES) console.log(`  dup: ${code} ${title}`);
      skipped.duplicate++;
      continue;
    }

    const oi = (n: string) => ((OI.get(code)!.get(n) ?? NaN) - 1) / 6;
    const k = (n: string) => ((K.get(code)!.get(n) ?? NaN) - 1) / 4;
    const wa = (n: string) => ((WA.get(code)!.get(n) ?? NaN) - 1) / 4;
    const cx = (n: string) => ((CX.get(code)!.get(n) ?? NaN) - 1) / 4;
    const ws = (n: string) => {
      const v = WI.get(code)?.get(n);
      const [lo, hi] = wsRange.get(n) ?? [0, 1];
      return v == null ? NaN : (v - lo) / (hi - lo || 1);
    };
    const mean = (...xs: number[]) => {
      const ok = xs.filter((x) => Number.isFinite(x));
      return ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : NaN;
    };
    const max = (...xs: number[]) => Math.max(...xs.filter((x) => Number.isFinite(x)));
    const topTwo = (...xs: number[]) => mean(...xs.filter(Number.isFinite).sort((a, b) => b - a).slice(0, 2));

    const raw: Partial<Record<Dim, number>> = {
      hands_on: mean(oi("Realistic"), wa("Handling and Moving Objects"), cx("Spend Time Using Your Hands to Handle, Control, or Feel Objects, Tools, or Controls")),
      mechanical: mean(k("Mechanical"), wa("Repairing and Maintaining Mechanical Equipment"), wa("Controlling Machines and Processes"), wa("Repairing and Maintaining Electronic Equipment")),
      tech: mean(k("Computers and Electronics"), wa("Working with Computers"), k("Telecommunications")),
      analytical: mean(k("Mathematics"), wa("Analyzing Data or Information"), k("Economics and Accounting")),
      investigative: mean(oi("Investigative"), ws("Intellectual Curiosity"), max(k("Biology"), k("Chemistry"), k("Physics"))),
      creative: mean(oi("Artistic"), wa("Thinking Creatively"), max(k("Fine Arts"), k("Design"))),
      words: mean(k("English Language"), k("Communications and Media"), cx("Written Letters and Memos")),
      helping: mean(oi("Social"), wa("Assisting and Caring for Others"), max(k("Therapy and Counseling"), k("Medicine and Dentistry"), k("Education and Training"))),
      persuading: mean(oi("Enterprising"), wa("Selling or Influencing Others"), k("Sales and Marketing"), wa("Resolving Conflicts and Negotiating with Others")),
      leading: mean(wa("Guiding, Directing, and Motivating Subordinates"), wa("Coordinating the Work and Activities of Others"), ws("Leadership Orientation"), cx("Coordinate or Lead Others in Accomplishing Work Activities")),
      organizing: mean(oi("Conventional"), k("Administrative"), wa("Documenting/Recording Information"), wa("Performing Administrative Activities")),
      nature: mean(cx("Outdoors, Exposed to All Weather Conditions"), cx("Outdoors, Exposed to All Weather Conditions"), max(k("Biology"), k("Geography"), k("Food Production"))),
      detail: mean(ws("Attention to Detail"), cx("Importance of Being Exact or Accurate")),
      abstract: mean(ws("Innovation"), wa("Developing Objectives and Strategies"), ws("Intellectual Curiosity"), wa("Thinking Creatively")),
      social: mean(cx("Contact With Others"), cx("Face-to-Face Discussions with Individuals and Within Teams"), cx("Deal With External Customers or the Public in General"), ws("Social Orientation")),
      empathy: mean(ws("Empathy"), oi("Social"), k("Psychology"), k("Therapy and Counseling")),
      structure: mean(cx("Importance of Repeating Same Tasks"), cx("Pace Determined by Speed of Equipment"), 1 - cx("Determine Tasks, Priorities and Goals")),
      autonomy: mean(cx("Freedom to Make Decisions"), cx("Determine Tasks, Priorities and Goals"), ws("Initiative")),
      variety: mean(1 - cx("Importance of Repeating Same Tasks"), ws("Adaptability"), ws("Tolerance for Ambiguity")),
      pressure: mean(cx("Time Pressure"), cx("Consequence of Error"), ws("Stress Tolerance"), cx("Impact of Decisions on Co-workers or Company Results")),
      adrenaline: topTwo(cx("Exposed to Hazardous Conditions"), cx("Exposed to High Places"), cx("Exposed to Hazardous Equipment"), cx("Wear Specialized Protective or Safety Equipment such as Breathing Apparatus, Safety Harness, Full Protection Suits, or Radiation Protection"), cx("Dealing with Violent or Physically Aggressive People")),
      physical: mean(wa("Performing General Physical Activities"), cx("Spend Time Standing"), cx("Spend Time Walking or Running"), cx("Spend Time Climbing Ladders, Scaffolds, or Poles"), cx("Spend Time Kneeling, Crouching, Stooping, or Crawling")),
      visibility: mean(wa("Performing for or Working Directly with the Public"), cx("Public Speaking"), k("Communications and Media")),
    };
    const extra = {
      remote: mean(cx("Spend Time Sitting"), wa("Working with Computers"), cx("E-Mail"), 1 - cx("Physical Proximity"), 1 - wa("Handling and Moving Objects"), 1 - wa("Performing for or Working Directly with the Public")),
      outdoorAll: cx("Outdoors, Exposed to All Weather Conditions"),
      outdoorAny: max(cx("Outdoors, Exposed to All Weather Conditions"), cx("Outdoors, Under Cover")),
      danger: max(cx("Exposed to High Places"), cx("Exposed to Hazardous Conditions"), cx("Exposed to Hazardous Equipment"), cx("Dealing with Violent or Physically Aggressive People")),
      medicine: k("Medicine and Dentistry"),
      disease: cx("Exposed to Disease or Infections"),
      vehicle: cx("In an Enclosed Vehicle or Operate Enclosed Equipment"),
    };
    drafts.push({ code, title, description: occ["Description"]!, raw, extra });
  }

  // Percentile-rank each dimension across occupations so O*NET's mid-heavy scales
  // become comparable to the hand-tagged careers: interests/settings are skewed low
  // (most jobs involve little of any one thing), styles stay centered on 0.5.
  const rawDims = DIM_KEYS.filter((d) => d !== "animals" && d !== "travel");
  const percentile = new Map<Dim, Map<string, number>>();
  for (const d of rawDims) {
    const vals = drafts.map((x) => ({ code: x.code, v: x.raw[d] ?? NaN })).filter((x) => Number.isFinite(x.v));
    vals.sort((a, b) => a.v - b.v);
    percentile.set(d, new Map(vals.map((x, i) => [x.code, vals.length > 1 ? i / (vals.length - 1) : 0.5])));
  }
  const physicalPct = percentile.get("physical")!;

  // Paths are SOC minor groups, named from the BLS summary rows
  const minorOf = (soc: string) =>
    minorCandidates(soc).find((code) => bls.rows.get(code)?.type === "Summary") ?? majorOf(soc);
  const pathTitle = (code: string) => {
    const t = bls.rows.get(code)?.title ?? "Other occupations";
    return t.charAt(0).toUpperCase() + t.slice(1);
  };

  const paths = new Map<string, CareerPath>();
  const careers: Career[] = drafts.map((x) => {
    const soc = soc6(x.code);
    const b = blsFor(bls.rows, soc)!;
    const minor = minorOf(soc);
    const pathId = `onet-${minor}`;
    if (!paths.has(pathId)) {
      paths.set(pathId, {
        id: pathId,
        field: fieldFor(soc),
        name: pathTitle(minor),
        tagline: `From the O*NET catalog · ${pathTitle(majorOf(soc))}`,
      });
    }

    const dna: Partial<Record<Dim, number>> = {};
    for (const d of rawDims) {
      const p = percentile.get(d)!.get(x.code);
      if (p == null) continue;
      // Cubing keeps "strong" (> 0.6) to roughly the top 15%, matching how sparsely the
      // curated careers are tagged; styles are compressed toward neutral for the same reason
      dna[d] = round(DIMENSIONS[d].group === "style" ? 0.5 + (p - 0.5) * 0.75 : Math.max(0.03, p ** 3));
    }
    const text = `${x.title} ${x.description}`;
    if (ANIMALS.test(x.title) || ANIMALS.test(x.description.split(".")[0] ?? "")) dna.animals = 0.85;
    const travel: Level = TRAVEL_HEAVY.test(x.title) ? 2 : TRAVEL_SOME.test(x.title) || x.extra.vehicle! >= 0.65 ? 1 : 0;
    dna.travel = [0.1, 0.5, 0.9][travel];

    const pPhysical = physicalPct.get(x.code) ?? 0.5;
    const physical: Level = pPhysical >= 0.72 ? 2 : pPhysical >= 0.45 ? 1 : 0;
    const outdoor: Level = x.extra.outdoorAll! >= 0.625 ? 2 : x.extra.outdoorAny! >= 0.375 ? 1 : 0;
    const danger: Level = x.extra.danger! >= 0.69 ? 2 : x.extra.danger! >= 0.44 ? 1 : 0;
    const remote: Level = physical === 0 && outdoor === 0 ? (x.extra.remote! >= 0.72 ? 2 : x.extra.remote! >= 0.62 ? 1 : 0) : 0;
    const share = scheduleShare.get(x.code);
    const irregular = share?.get("2") ?? 0;
    const schedule: Career["schedule"] =
      irregular >= 50 ? "irregular" : irregular >= 25 || (["29", "31", "33", "35"].includes(soc.slice(0, 2)) && irregular >= 15) ? "shifts" : "standard";

    // Big occupations are familiar; tiny or specialized ones are the hidden gems
    const isDetailed = !x.code.endsWith(".00");
    const obscurity = clamp(0.9 - 0.27 * Math.log10(Math.max(b.employment, 0.1)) + (isDetailed ? 0.2 : 0), 0.02, 0.95);

    const topTasks = (coreTasks.get(x.code) ?? []).sort((a, z) => z.n - a.n).slice(0, 3).map((t) => t.task);

    return {
      id: `onet-${x.code}`,
      title: x.title,
      path: pathId,
      soc,
      socTitle: b.title,
      onetCode: x.code,
      oohUrl: b.oohUrl,
      summary: shortSummary(x.description),
      tasks: topTasks,
      pay: b.pay!,
      growth: b.growth,
      education: educationText(b),
      eduLevel: eduLevel(b.education, b.training, jobZone.get(x.code)),
      start: startSteps(b),
      remote,
      schedule,
      travel,
      physical,
      outdoor,
      danger,
      // Blood and procedures: mostly medical knowledge; disease exposure alone (e.g. teachers) isn't enough
      medical: x.extra.medicine! >= 0.5 || (x.extra.disease! >= 0.75 && x.extra.medicine! >= 0.35) || undefined,
      obscurity: round(obscurity),
      dna,
    };
  });

  // Fresh pay & growth for the hand-curated careers, keyed by SOC code
  const stats: Record<string, { pay: number; growth: number; employment: number; oohUrl?: string }> = {};
  for (const c of curated) {
    const b = blsFor(bls.rows, c.soc);
    if (b?.pay != null) stats[c.soc] = { pay: b.pay, growth: b.growth, employment: b.employment, oohUrl: b.oohUrl };
  }
  const unknownCodes = [...curatedCodes].filter((code) => !occupations.some((o) => o["O*NET-SOC Code"] === code));
  if (unknownCodes.length) console.warn(`  Curated onetCode not in O*NET ${ONET_VERSION}: ${unknownCodes.join(", ")}`);
  const missingStats = curated.filter((c) => !stats[c.soc]).map((c) => `${c.title} (${c.soc})`);

  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      onetVersion: ONET_VERSION.replace("_", "."),
      blsTable: bls.title,
      counts: { careers: careers.length, paths: paths.size, curatedRefreshed: Object.keys(stats).length },
    },
    paths: [...paths.values()].sort((a, b) => a.id.localeCompare(b.id)),
    careers: careers.sort((a, b) => a.id.localeCompare(b.id)),
    stats,
  };
  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(output));

  console.log(`O*NET ${output.meta.onetVersion} + ${bls.title}`);
  console.log(`Imported ${careers.length} careers in ${paths.size} paths → ${OUT_FILE}`);
  console.log(`Skipped: ${Object.entries(skipped).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  console.log(`Refreshed pay/growth for ${Object.keys(stats).length}/${curated.length} curated careers`);
  if (missingStats.length) console.log(`  No BLS match for: ${missingStats.join("; ")}`);
}

const round = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
