// Results-page filters & sorting, chosen after the questionnaire so people can explore
// trade-offs (e.g. "what if I'd commute?") without retaking anything.
// Kept free of career data so client components can import it cheaply.

export const SORTS = { match: "Best match", pay: "Highest pay", growth: "Fastest growth" } as const;
export const SETUPS = {
  any: "Any setup",
  remote: "Remote-friendly",
  hybrid: "At least some remote",
  onsite: "On-site / out in the world",
} as const;
export const COMMUTES = { any: "Any travel", home: "Home every night", travel: "Travel-heavy" } as const;
export const MIN_PAYS = [0, 40000, 60000, 80000, 100000] as const;
export const MIN_MATCHES = [0, 50, 60, 70, 80, 90] as const;

export type ResultFilters = {
  sort: keyof typeof SORTS;
  setup: keyof typeof SETUPS;
  commute: keyof typeof COMMUTES;
  minPay: number;
  minMatch: number;
};

export const DEFAULT_FILTERS: ResultFilters = { sort: "match", setup: "any", commute: "any", minPay: 0, minMatch: 0 };

const pick = <T extends string>(value: string | undefined, options: Record<T, string>, fallback: T) =>
  value != null && value in options ? (value as T) : fallback;

export function parseFilters(params: Record<string, string | undefined>): ResultFilters {
  const minPay = Number(params.minPay);
  const minMatch = Number(params.minMatch);
  return {
    sort: pick(params.sort, SORTS, "match"),
    setup: pick(params.setup, SETUPS, "any"),
    commute: pick(params.commute, COMMUTES, "any"),
    minPay: (MIN_PAYS as readonly number[]).includes(minPay) ? minPay : 0,
    minMatch: (MIN_MATCHES as readonly number[]).includes(minMatch) ? minMatch : 0,
  };
}
