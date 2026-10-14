import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/features/user/db";
import { Questionnaire } from "@/features/assessment/components/Questionnaire";
import { sanitizeAnswers } from "@/features/assessment/sequence";

export default async function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireDbUser();
  const assessment = await prisma.assessment.findFirst({ where: { id, userId: user.id } });
  if (!assessment) notFound();
  if (assessment.status === "COMPLETED") redirect(`/assessment/${id}/results`);

  return (
    <Questionnaire
      assessmentId={assessment.id}
      initialAnswers={sanitizeAnswers(assessment.answers)}
      initialPosition={assessment.position}
      initialProbeIds={assessment.probeIds}
    />
  );
}
