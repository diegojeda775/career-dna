import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/features/user/db";
import { Button } from "@/components/ui/button";
import { startAssessment } from "@/features/assessment/actions";
import { DeleteAssessmentButton } from "@/features/assessment/components/DeleteAssessmentButton";
import { TOTAL_QUESTIONS } from "@/features/dna/questions";

type ResultsSnapshot = { paths: { id: string; name: string; score: number; topCareer: string | null }[] };
type ProfileSnapshot = { type: string };

export default async function DashboardPage() {
  const user = await requireDbUser();
  const assessments = await prisma.assessment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  const inProgress = assessments.find((a) => a.status === "IN_PROGRESS");

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{user.name ? `Hi, ${user.name.split(" ")[0]}` : "Your results"}</h1>
          <p className="mt-1 text-muted-foreground">Every assessment you take is saved here so you can compare how your DNA changes.</p>
        </div>
        <form action={startAssessment}>
          <Button size="lg">
            <Plus /> New assessment
          </Button>
        </form>
      </header>

      {inProgress && (
        <Link
          href={`/assessment/${inProgress.id}`}
          className="flex items-center justify-between rounded-xl border border-primary bg-accent p-5 transition-colors hover:bg-accent/70"
        >
          <div>
            <p className="font-semibold text-accent-foreground">Pick up where you left off</p>
            <p className="text-sm text-muted-foreground">
              {Object.keys(inProgress.answers as object).length} of {TOTAL_QUESTIONS} answered · started{" "}
              {inProgress.createdAt.toLocaleDateString()}
            </p>
          </div>
          <ArrowRight className="text-accent-foreground" />
        </Link>
      )}

      {assessments.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="text-lg font-medium">No assessments yet</p>
          <p className="mx-auto mt-1 max-w-md text-muted-foreground">
            It takes about 20–25 minutes. You can stop anytime and your progress is saved.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {assessments.map((a) => {
            const results = a.results as ResultsSnapshot | null;
            const profile = a.profile as ProfileSnapshot | null;
            const href = a.status === "COMPLETED" ? `/assessment/${a.id}/results` : `/assessment/${a.id}`;
            return (
              <li key={a.id} className="flex items-center gap-2 rounded-xl border bg-card p-4 shadow-sm">
                <Link href={href} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="font-medium">{(a.completedAt ?? a.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</p>
                    {profile?.type && <span className="font-mono text-sm text-primary">{profile.type}</span>}
                    {a.status === "IN_PROGRESS" && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">In progress</span>
                    )}
                  </div>
                  {results?.paths?.length ? (
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {results.paths
                        .slice(0, 3)
                        .map((p) => p.topCareer ?? p.name)
                        .join(" · ")}
                    </p>
                  ) : null}
                </Link>
                <DeleteAssessmentButton id={a.id} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
