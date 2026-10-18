import { notFound, redirect } from "next/navigation";
import { Filter, RotateCcw } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/features/user/db";
import { Button } from "@/components/ui/button";
import { DIMENSIONS, DIM_KEYS } from "@/features/dna/dimensions";
import { buildProfile } from "@/features/dna/profile";
import { matchCareers, parseFilters, toRow } from "@/features/careers/match";
import { DataNote } from "@/features/careers/DataNote";
import { sanitizeAnswers } from "@/features/assessment/sequence";
import { retakeAssessment } from "@/features/assessment/actions";
import { DnaChart, WorkType } from "@/features/results/components";
import { ResultsExplorer } from "@/features/results/ResultsExplorer";
import { ResultsControls } from "@/features/results/ResultsControls";

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const user = await requireDbUser();
  const assessment = await prisma.assessment.findFirst({ where: { id, userId: user.id } });
  if (!assessment) notFound();
  if (assessment.status !== "COMPLETED") redirect(`/assessment/${id}`);

  // Recompute live so the discovery dial, filters and any career-data updates apply
  const profile = buildProfile(sanitizeAnswers(assessment.answers));
  const parsed = Number(query.discover);
  const discovery = query.discover != null && [0, 1, 2].includes(parsed) ? parsed : Number(profile.constraints.discovery ?? 1);
  const filters = parseFilters(query);
  const result = matchCareers(profile, discovery, filters);

  const strengths = DIM_KEYS.slice()
    .sort((a, b) => profile.scores[b] - profile.scores[a])
    .slice(0, 3);
  const drains = DIM_KEYS.slice()
    .filter((d) => profile.confidence[d] > 0.3)
    .sort((a, b) => profile.scores[a] - profile.scores[b])
    .slice(0, 3);

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Completed {assessment.completedAt?.toLocaleDateString(undefined, { dateStyle: "long" })}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Your Career DNA</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            You're most drawn to <Em>{DIMENSIONS[strengths[0]!].label}</Em>, <Em>{DIMENSIONS[strengths[1]!].label}</Em> and{" "}
            <Em>{DIMENSIONS[strengths[2]!].label}</Em>, and least interested in{" "}
            {drains.map((d, i) => (
              <span key={d}>
                {i > 0 && (i === drains.length - 1 ? " and " : ", ")}
                <Em>{DIMENSIONS[d].label.toLowerCase()}</Em>
              </span>
            ))}
            .
          </p>
        </div>
        <form action={retakeAssessment.bind(null, assessment.id)}>
          <Button variant="outline">
            <RotateCcw /> Retake with these answers
          </Button>
        </form>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Working attributes</h2>
          <p className="mb-5 text-sm text-muted-foreground">0–100. The center line is neutral; right of it means more interest.</p>
          <DnaChart profile={profile} />
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="font-semibold">Work-style lean</h2>
            <p className="text-3xl font-semibold tracking-widest text-primary">{profile.type.letters}</p>
            <p className="mb-4 text-xs text-muted-foreground">Inspired by Myers-Briggs. Not an official MBTI result.</p>
            <WorkType type={profile.type} />
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="font-semibold">Top interest clusters</h2>
            <p className="mb-3 text-xs text-muted-foreground">Based on the COPS interest system</p>
            <ol className="space-y-2 text-sm">
              {profile.cops.slice(0, 4).map((c, i) => (
                <li key={c.cluster} className="flex justify-between gap-2">
                  <span>
                    {i + 1}. {c.name}
                  </span>
                  <span className="tabular-nums text-muted-foreground">{Math.round(c.score * 100)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold tracking-tight">Your matches</h2>
        <ResultsControls filters={filters} discovery={discovery} />

        {result.filtered.removed > 0 && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-dashed p-4 text-sm">
            <Filter className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">
              Your dealbreakers and filters ruled out {result.filtered.removed} of {result.filtered.total} careers
              {result.filtered.byReason.length > 0 &&
                ` (${result.filtered.byReason.map((r) => `${r.reason.toLowerCase()}: ${r.count}`).join(", ")})`}
              .{result.careers.length < 15 && " Loosening a filter above (or a dealbreaker on a retake) will open up more careers."}
            </p>
          </div>
        )}

        {result.paths.length === 0 ? (
          <p className="rounded-xl border p-8 text-center text-muted-foreground">
            No careers survive every dealbreaker and filter. Try loosening a filter above.
          </p>
        ) : (
          <ResultsExplorer
            assessmentId={assessment.id}
            paths={result.paths.map((p) => ({ path: p.path, score: p.score, careerIds: p.careers.map((c) => c.career.id) }))}
            careers={result.careers.map(toRow)}
          />
        )}
        <DataNote className="mt-6" />
      </section>
    </div>
  );
}

function Em({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-foreground">{children}</span>;
}
