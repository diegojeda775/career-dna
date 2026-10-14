"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMMUTES, DEFAULT_FILTERS, MIN_PAYS, SETUPS, SORTS, type ResultFilters } from "@/features/careers/match";

const DISCOVERY = ["Familiar", "Balanced", "Hidden gems"];

export function ResultsControls({ filters, discovery }: { filters: ResultFilters; discovery: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function set(key: string, value: string | number, fallback: string | number) {
    const next = new URLSearchParams(params);
    if (value === fallback) next.delete(key);
    else next.set(key, String(value));
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  const isDefault =
    filters.sort === DEFAULT_FILTERS.sort &&
    filters.setup === DEFAULT_FILTERS.setup &&
    filters.commute === DEFAULT_FILTERS.commute &&
    filters.minPay === DEFAULT_FILTERS.minPay;

  return (
    <div className="mb-6 space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border p-1 text-sm" role="group" aria-label="Discovery level">
          {DISCOVERY.map((label, value) => (
            <button
              key={label}
              onClick={() => set("discover", value, -1)}
              aria-pressed={discovery === value}
              className={cn(
                "rounded-md px-3 py-1.5 transition-colors",
                discovery === value ? "bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm">
          {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Updating" />}
          {!isDefault && (
            <button
              onClick={() => {
                const next = new URLSearchParams(params);
                ["sort", "setup", "commute", "minPay"].forEach((k) => next.delete(k));
                const qs = next.toString();
                startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
              }}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3.5" /> Reset filters
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select label="Sort by" value={filters.sort} options={SORTS} onChange={(v) => set("sort", v, DEFAULT_FILTERS.sort)} />
        <Select
          label="Minimum salary"
          value={String(filters.minPay)}
          options={Object.fromEntries(MIN_PAYS.map((p) => [String(p), p === 0 ? "Any salary" : `$${p / 1000}k+ median`]))}
          onChange={(v) => set("minPay", Number(v), DEFAULT_FILTERS.minPay)}
        />
        <Select label="Remote or on-site" value={filters.setup} options={SETUPS} onChange={(v) => set("setup", v, DEFAULT_FILTERS.setup)} />
        <Select
          label="Commuting & travel"
          value={filters.commute}
          options={COMMUTES}
          onChange={(v) => set("commute", v, DEFAULT_FILTERS.commute)}
        />
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border bg-background px-2 text-sm font-normal text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {Object.entries(options).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
