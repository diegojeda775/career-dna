import { SignUpButton } from "@clerk/nextjs";
import { Compass, Gauge, ShieldBan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CAREERS, DATA_SOURCES, PATHS } from "@/features/careers/data";
import { TOTAL_QUESTIONS } from "@/features/dna/questions";

const PILLARS = [
  {
    icon: Gauge,
    title: "Interest, not either/or",
    body: "Instead of forced choices, rate how much real, specific tasks would intrigue you, or not.",
  },
  {
    icon: ShieldBan,
    title: "Dealbreakers, then your filters",
    body: "Hard lines like no weekends or no heights drop whole industries. Then sort and filter your matches by salary, remote work and commute.",
  },
  {
    icon: Compass,
    title: "Hidden-career discovery",
    body: "You're matched to a profile of working attributes, so niche careers you've never heard of can surface.",
  },
];

const EXAMPLES = ["Underwater Welder", "Flavorist", "Foley Artist", "Genetic Counselor", "Catastrophe Adjuster", "ROV Pilot", "Child Life Specialist", "E-Discovery Specialist"];

export default function Home() {
  return (
    <div className="space-y-16 py-6">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium text-primary">
          {TOTAL_QUESTIONS} questions · {CAREERS.length} careers · {PATHS.length} paths
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Find the career you didn't know existed</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Career DNA works like a music recommendation engine. It learns what intrigues you, builds your working-attribute
          profile, and matches it to niche careers that share it, with real pay and growth data.
        </p>
        <div className="mt-8 flex justify-center">
          <SignUpButton>
            <Button size="lg">Start free assessment</Button>
          </SignUpButton>
        </div>
        <ul className="mt-8 flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((e) => (
            <li key={e} className="rounded-full border px-3 py-1 text-sm text-muted-foreground">
              {e}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {PILLARS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl border bg-card p-6 shadow-sm">
            <Icon className="size-6 text-primary" />
            <h2 className="mt-3 font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Question design draws on the COPS interest system and Myers-Briggs-style preferences. Career data comes from the
        O*NET {DATA_SOURCES.onetVersion} database (USDOL/ETA, CC BY 4.0) and U.S. Bureau of Labor Statistics projections.
      </p>
    </div>
  );
}
