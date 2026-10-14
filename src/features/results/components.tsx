import { ArrowUpRight, Briefcase, Clock, GraduationCap, Laptop, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { DIMENSIONS, DIM_KEYS, type Dim } from "@/features/dna/dimensions";
import type { Profile } from "@/features/dna/profile";
import type { CareerMatch, PathMatch } from "@/features/careers/match";
import { blsUrl, myNextMoveUrl } from "@/features/careers/types";
import { cn } from "@/lib/utils";

const money = (n: number) => `$${Math.round(n / 1000)}k`;

// Approximate BLS outlook wording (average growth across all occupations is ~4% for 2023–33)
function outlook(growth: number) {
  if (growth >= 10) return "Much faster than average";
  if (growth >= 5) return "Faster than average";
  if (growth >= 2) return "About average";
  if (growth >= 0) return "Slower than average";
  return "Declining";
}

const GROUPS = [
  { id: "interest", title: "What you're drawn to" },
  { id: "style", title: "How you like to work" },
  { id: "setting", title: "Conditions you seek" },
] as const;

export function DnaChart({ profile }: { profile: Profile }) {
  return (
    <div className="grid gap-8 md:grid-cols-3">
      {GROUPS.map((g) => {
        const dims = DIM_KEYS.filter((d) => DIMENSIONS[d].group === g.id).sort(
          (a, b) => profile.scores[b] - profile.scores[a],
        );
        return (
          <figure key={g.id}>
            <figcaption className="mb-3 text-sm font-medium">{g.title}</figcaption>
            <ul className="space-y-2.5">
              {dims.map((d) => (
                <DnaBar key={d} dim={d} value={profile.scores[d]} />
              ))}
            </ul>
          </figure>
        );
      })}
    </div>
  );
}

function DnaBar({ dim, value }: { dim: Dim; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <li className="group" title={`${DIMENSIONS[dim].label}: ${pct}/100. ${DIMENSIONS[dim].blurb}`}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate">{DIMENSIONS[dim].label}</span>
        <span className="tabular-nums text-muted-foreground">{pct}</span>
      </div>
      <div className="relative mt-1 h-1.5 rounded-full bg-chart-track">
        <div className="h-full rounded-full bg-chart-1 transition-opacity group-hover:opacity-80" style={{ width: `${pct}%` }} />
        {/* Neutral midpoint: left of this is a drain, right is energy */}
        <div className="absolute inset-y-[-2px] left-1/2 w-px bg-muted-foreground/40" />
      </div>
    </li>
  );
}

const AXIS_NAMES: Record<string, string> = {
  I: "Introverted", E: "Extraverted", S: "Practical", N: "Big-picture", T: "Logic-led", F: "Values-led", P: "Flexible", J: "Planned",
};

export function WorkType({ type }: { type: Profile["type"] }) {
  return (
    <div className="space-y-3">
      {type.axes.map((a) => (
        <div key={a.left + a.right}>
          <div className="flex justify-between text-xs">
            <span className={cn(a.pick === a.left ? "font-semibold" : "text-muted-foreground")}>{AXIS_NAMES[a.left]}</span>
            <span className={cn(a.pick === a.right ? "font-semibold" : "text-muted-foreground")}>{AXIS_NAMES[a.right]}</span>
          </div>
          <div className="relative mt-1 h-1.5 rounded-full bg-chart-track" title={`${AXIS_NAMES[a.pick]}, ${a.strength}% lean`}>
            <div
              className={cn("absolute inset-y-0 rounded-full bg-chart-2", a.pick === a.right ? "left-1/2" : "right-1/2")}
              style={{ width: `${Math.max(2, a.strength / 2)}%` }}
            />
            <div className="absolute inset-y-[-2px] left-1/2 w-px bg-muted-foreground/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PathCard({ match, rank }: { match: PathMatch; rank: number }) {
  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <header className="flex items-start justify-between gap-4 border-b p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Path {rank}</p>
          <h3 className="mt-1 text-xl font-semibold">{match.path.name}</h3>
          <p className="text-sm text-muted-foreground">{match.path.tagline}</p>
        </div>
        <MatchBadge score={match.score} />
      </header>
      <div className="divide-y">
        {match.careers.map((c, i) => (
          <CareerDetails key={c.career.id} match={c} open={i === 0} />
        ))}
      </div>
    </section>
  );
}

function MatchBadge({ score, small }: { score: number; small?: boolean }) {
  return (
    <div className={cn("shrink-0 text-right", small && "flex items-baseline gap-1")}>
      <p className={cn("font-semibold tabular-nums", small ? "text-sm" : "text-2xl")}>{score}%</p>
      <p className="text-xs text-muted-foreground">match</p>
    </div>
  );
}

function CareerDetails({ match, open }: { match: CareerMatch; open: boolean }) {
  const c = match.career;
  const hidden = c.obscurity >= 0.7;
  return (
    <details open={open} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
        <div>
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {c.title}
            {hidden && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">Hidden gem</span>
            )}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{c.summary}</p>
        </div>
        <MatchBadge score={match.score} small />
      </summary>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<Wallet />} label="Median pay" value={money(c.pay)} sub="per year" />
        <Stat
          icon={c.growth >= 0 ? <TrendingUp /> : <TrendingDown />}
          label="10-yr outlook"
          value={`${c.growth > 0 ? "+" : ""}${c.growth}%`}
          sub={outlook(c.growth)}
        />
        <Stat icon={<GraduationCap />} label="Training" value={["", "Months", "1–2 yrs", "4-yr degree", "Graduate"][c.eduLevel]!} sub={c.education} />
        <Stat
          icon={c.remote === 2 ? <Laptop /> : <Clock />}
          label="Setup"
          value={["On-site", "Some remote", "Remote-friendly"][c.remote]!}
          sub={{ standard: "Regular hours", shifts: "Shift work", irregular: "Irregular / on-call" }[c.schedule]}
        />
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          {match.reasons.length > 0 && (
            <Block title="Why it fits your DNA">
              {match.reasons.map((d) => (
                <li key={d}>
                  <span className="font-medium">{DIMENSIONS[d].label}</span>: {DIMENSIONS[d].blurb.toLowerCase()}
                </li>
              ))}
            </Block>
          )}
          {match.watchouts.length > 0 && (
            <Block title="Heads up" className="mt-4">
              {match.watchouts.map((d) => (
                <li key={d}>
                  Leans on <span className="font-medium">{DIMENSIONS[d].label.toLowerCase()}</span>, which you were lukewarm about
                </li>
              ))}
            </Block>
          )}
          <Block title="A day might include" className="mt-4">
            {c.tasks.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </Block>
        </div>
        <div>
          <Block title="How to break in" ordered>
            {c.start.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </Block>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <a href={myNextMoveUrl(c)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              My Next Move <ArrowUpRight className="size-3.5" />
            </a>
            <a href={blsUrl(c)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              BLS wage data <ArrowUpRight className="size-3.5" />
            </a>
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Briefcase className="mt-0.5 size-3.5 shrink-0" />
            Stats from parent occupation: {c.socTitle} (SOC {c.soc})
          </p>
        </div>
      </div>
    </details>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Block({ title, children, ordered, className }: { title: string; children: React.ReactNode; ordered?: boolean; className?: string }) {
  const List = ordered ? "ol" : "ul";
  return (
    <div className={className}>
      <p className="text-sm font-medium">{title}</p>
      <List className={cn("mt-1.5 space-y-1 pl-5 text-sm text-muted-foreground", ordered ? "list-decimal" : "list-disc")}>
        {children}
      </List>
    </div>
  );
}
