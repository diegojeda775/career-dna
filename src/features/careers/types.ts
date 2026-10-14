import type { DnaWeights } from "@/features/dna/dimensions";

export type Level = 0 | 1 | 2;

export type CareerPath = {
  id: string;
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
  summary: string;
  tasks: string[];
  // Approximate national median annual pay for the parent occupation (USD)
  pay: number;
  // Projected 10-year employment change for the parent occupation (%)
  growth: number;
  education: string;
  // 1 = short cert / on-the-job, 2 = apprenticeship / associate / academy, 3 = bachelor's, 4 = graduate
  eduLevel: 1 | 2 | 3 | 4;
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

export const DATA_NOTE =
  "Pay and outlook are approximate national figures for each career's parent occupation (BLS Occupational Employment & Wage Statistics, May 2023; Employment Projections 2023–33). Niche specialists can earn noticeably more or less than the parent median.";

export function myNextMoveUrl(c: Career) {
  return `https://www.mynextmove.org/find/search?s=${encodeURIComponent(c.socTitle)}`;
}

export function blsUrl(c: Career) {
  return `https://www.bls.gov/oes/current/oes${c.soc.replace("-", "")}.htm`;
}
