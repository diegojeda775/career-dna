import type { DnaWeights } from "@/features/dna/dimensions";

export type Level = 0 | 1 | 2;

export const FIELDS = {
  health: "Healthcare",
  tech: "Technology & Data",
  trades: "Skilled Trades & Repair",
  engineering: "Engineering & Architecture",
  science: "Science & Research",
  agri: "Animals, Farming & Land",
  business: "Business, Finance & Law",
  sales: "Sales & Marketing",
  creative: "Arts, Media & Communication",
  education: "Education & Social Services",
  public: "Public Safety & Protection",
  transport: "Transportation & Operations",
  hospitality: "Hospitality, Food & Personal Care",
} as const;
export type FieldId = keyof typeof FIELDS;

export type CareerPath = {
  id: string;
  field: FieldId;
  name: string;
  tagline: string;
};

export type Career = {
  id: string;
  title: string;
  path: string;
  // Parent BLS / O*NET occupation that supplies official statistics
  soc: string;
  socTitle: string;
  // Exact O*NET-SOC code (e.g. "15-1299.08") when the career comes from the O*NET import
  onetCode?: string;
  // BLS Occupational Outlook Handbook page
  oohUrl?: string;
  summary: string;
  tasks: string[];
  // Approximate national median annual pay for the parent occupation (USD)
  pay: number;
  // Projected 10-year employment change for the parent occupation (%)
  growth: number;
  education: string;
  // 0 = none / learn on the job, 1 = short cert or course, 2 = apprenticeship / associate / academy, 3 = bachelor's, 4 = graduate
  eduLevel: 0 | 1 | 2 | 3 | 4;
  // What it takes to break in
  start: string[];
  remote: Level;
  schedule: "standard" | "shifts" | "irregular";
  travel: Level;
  physical: Level;
  outdoor: Level;
  danger: Level;
  medical?: boolean;
  // 0 = everybody's heard of it, 1 = almost nobody has
  obscurity: number;
  dna: DnaWeights;
};


export function myNextMoveUrl(c: Career) {
  if (c.onetCode) return `https://www.mynextmove.org/profile/summary/${c.onetCode}`;
  return `https://www.mynextmove.org/find/search?s=${encodeURIComponent(c.socTitle)}`;
}

export function blsUrl(c: Career) {
  return `https://www.bls.gov/oes/current/oes${c.soc.replace("-", "")}.htm`;
}
