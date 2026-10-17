"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, TrendingDown, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CareerMatch, PathMatch } from "@/features/careers/match";
import { FIELDS, type FieldId } from "@/features/careers/types";
import { CareerFull, HiddenGem, isHiddenGem, money } from "./components";

const TOP_PATHS = 5;
const ROWS_PER_FIELD = 5;

export function ResultsExplorer({ paths, careers }: { paths: PathMatch[]; careers: CareerMatch[] }) {
  const [selected, setSelected] = useState<CareerMatch | null>(null);
  const [showAllPaths, setShowAllPaths] = useState(false);

  const pathById = useMemo(() => new Map(paths.map((p) => [p.path.id, p.path])), [paths]);

  // Careers arrive already sorted, so each field's order (and the field order itself) follows the sort
  const fields = useMemo(() => {
    const groups = new Map<FieldId, CareerMatch[]>();
    for (const m of careers) {
      const field = pathById.get(m.career.path)?.field;
      if (field) groups.set(field, [...(groups.get(field) ?? []), m]);
    }
    return [...groups.entries()].map(([id, list]) => ({ id, name: FIELDS[id], careers: list }));
  }, [careers, pathById]);

  const visiblePaths = showAllPaths ? paths : paths.slice(0, TOP_PATHS);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-2xl font-semibold tracking-tight">
          {showAllPaths ? `All ${paths.length} paths` : `Your top ${Math.min(TOP_PATHS, paths.length)} paths`}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">Each path groups careers that share your DNA. Tap a career for the full picture.</p>
        <div className="grid gap-4 md:grid-cols-2">
          {visiblePaths.map((p, i) => (
            <PathSummary key={p.path.id} match={p} rank={i + 1} onSelect={setSelected} />
          ))}
        </div>
        {paths.length > TOP_PATHS && (
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={() => setShowAllPaths((v) => !v)}>
              {showAllPaths ? "Show top 5 only" : `Show all ${paths.length} paths`}
              <ChevronDown className={cn("transition-transform", showAllPaths && "rotate-180")} />
            </Button>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight">All matches by field</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {careers.length} careers across {fields.length} fields, general and niche alike.
        </p>
        <div className="space-y-4">
          {fields.map((f) => (
            <FieldGroup key={f.id} name={f.name} careers={f.careers} pathName={(id) => pathById.get(id)?.name ?? ""} onSelect={setSelected} />
          ))}
        </div>
      </section>

      <CareerPanel match={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function PathSummary({ match, rank, onSelect }: { match: PathMatch; rank: number; onSelect: (m: CareerMatch) => void }) {
  const shown = match.careers.slice(0, 3);
  const more = match.careers.length - shown.length;
  return (
    <div className="flex flex-col rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">
            #{rank} · {FIELDS[match.path.field]}
          </p>
          <h3 className="mt-0.5 font-semibold">{match.path.name}</h3>
        </div>
        <p className="shrink-0 text-xl font-semibold tabular-nums">{match.score}%</p>
      </div>
      <ul className="mt-3 space-y-1">
        {shown.map((m) => (
          <li key={m.career.id}>
            <button
              onClick={() => onSelect(m)}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate">{m.career.title}</span>
                {isHiddenGem(m) && <HiddenGem />}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {money(m.career.pay)} · {m.score}%
              </span>
            </button>
          </li>
        ))}
      </ul>
      {more > 0 && <p className="mt-1 px-2 text-xs text-muted-foreground">+{more} more in this path, listed by field below</p>}
    </div>
  );
}

function FieldGroup({
  name,
  careers,
  pathName,
  onSelect,
}: {
  name: string;
  careers: CareerMatch[];
  pathName: (id: string) => string;
  onSelect: (m: CareerMatch) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const rows = expanded ? careers : careers.slice(0, ROWS_PER_FIELD);
  const best = Math.max(...careers.map((c) => c.score));

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-baseline justify-between gap-3 border-b bg-muted/50 px-4 py-3">
        <h3 className="font-semibold">{name}</h3>
        <p className="text-xs text-muted-foreground">
          {careers.length} {careers.length === 1 ? "career" : "careers"} · best {best}%
        </p>
      </div>
      <div className="hidden grid-cols-[1fr_4.5rem_4.5rem_4.5rem] gap-3 px-4 pt-2 text-xs text-muted-foreground sm:grid">
        <span>Career</span>
        <span className="text-right">Match</span>
        <span className="text-right">Pay</span>
        <span className="text-right">Growth</span>
      </div>
      <ul className="divide-y">
        {rows.map((m) => (
          <li key={m.career.id}>
            <button
              onClick={() => onSelect(m)}
              className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent sm:grid-cols-[1fr_4.5rem_4.5rem_4.5rem]"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className="truncate">{m.career.title}</span>
                  {isHiddenGem(m) && <HiddenGem />}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{pathName(m.career.path)}</span>
              </span>
              <span className="text-right text-sm font-semibold tabular-nums">{m.score}%</span>
              <span className="hidden text-right text-sm tabular-nums sm:block">{money(m.career.pay)}</span>
              <span
                className="hidden items-center justify-end gap-1 text-sm tabular-nums sm:flex"
                title={`${m.career.growth}% projected 10-year change`}
              >
                {m.career.growth >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                {m.career.growth > 0 ? "+" : ""}
                {m.career.growth}%
              </span>
            </button>
          </li>
        ))}
      </ul>
      {careers.length > ROWS_PER_FIELD && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-center gap-1 border-t py-2 text-sm text-primary hover:bg-accent"
        >
          {expanded ? "Show fewer" : `Show all ${careers.length}`}
          <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
        </button>
      )}
    </div>
  );
}

// Side panel built on <dialog> for free focus trapping, Esc-to-close and backdrop
function CareerPanel({ match, onClose }: { match: CareerMatch | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (match && !dialog.open) dialog.showModal();
    if (!match && dialog.open) dialog.close();
  }, [match]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={match?.career.title ?? "Career details"}
      className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-xl bg-transparent p-0 backdrop:bg-black/50"
    >
      {match && (
        <div className="h-full overflow-y-auto border-l bg-background p-6 text-foreground shadow-xl">
          <div className="mb-4 flex justify-end">
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X />
            </Button>
          </div>
          <CareerFull match={match} />
        </div>
      )}
    </dialog>
  );
}
