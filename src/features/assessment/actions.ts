"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/features/user/db";
import { buildProfile } from "@/features/dna/profile";
import { matchCareers } from "@/features/careers/match";
import { CORE_QUESTIONS, PROBE_COUNT } from "@/features/dna/questions";
import { isValidProbeSet, questionSequence, sanitizeAnswers } from "./sequence";

async function ownAssessment(id: string) {
  const user = await requireDbUser();
  const assessment = await prisma.assessment.findFirst({ where: { id, userId: user.id } });
  if (!assessment) throw new Error("Assessment not found");
  return assessment;
}

export async function startAssessment() {
  const user = await requireDbUser();
  const assessment = await prisma.assessment.create({ data: { userId: user.id } });
  redirect(`/assessment/${assessment.id}`);
}

export async function saveProgress(id: string, rawAnswers: unknown, position: number, probeIds?: string[]) {
  const assessment = await ownAssessment(id);
  if (assessment.status === "COMPLETED") return { ok: false as const, error: "Already completed" };

  // Probes are locked the first time they're chosen so the deep dive doesn't shift under the person
  let probes = assessment.probeIds;
  if (probes.length === 0 && probeIds && probeIds.length === PROBE_COUNT && isValidProbeSet(probeIds)) {
    probes = probeIds;
  }
  const max = questionSequence(probes).length;

  await prisma.assessment.update({
    where: { id },
    data: {
      answers: sanitizeAnswers(rawAnswers),
      probeIds: probes,
      position: Math.max(0, Math.min(Math.trunc(position) || 0, max)),
    },
  });
  return { ok: true as const, probeIds: probes };
}

export async function completeAssessment(id: string, rawAnswers: unknown) {
  const assessment = await ownAssessment(id);
  if (assessment.probeIds.length === 0) throw new Error("Deep-dive questions not chosen yet");

  const answers = sanitizeAnswers(rawAnswers);
  const sequence = questionSequence(assessment.probeIds);
  const missing = sequence.filter((q) => !(q.id in answers));
  if (missing.length > 0) throw new Error(`${missing.length} questions still unanswered`);

  const profile = buildProfile(answers);
  const match = matchCareers(profile);

  await prisma.assessment.update({
    where: { id },
    data: {
      answers,
      position: sequence.length,
      status: "COMPLETED",
      completedAt: new Date(),
      profile: { type: profile.type.letters, scores: profile.scores },
      results: {
        paths: match.paths.slice(0, 5).map((p) => ({
          id: p.path.id,
          name: p.path.name,
          score: p.score,
          topCareer: p.careers[0]?.career.title ?? null,
        })),
      },
    },
  });
  revalidatePath("/dashboard");
  redirect(`/assessment/${id}/results`);
}

export async function deleteAssessment(id: string) {
  await ownAssessment(id);
  await prisma.assessment.delete({ where: { id } });
  revalidatePath("/dashboard");
}

// Start over from a completed assessment, keeping the answers as a starting point
export async function retakeAssessment(id: string) {
  const source = await ownAssessment(id);
  const answers = sanitizeAnswers(source.answers);
  // Keep only the core answers; the deep dive is re-chosen from the new answers
  const core = Object.fromEntries(CORE_QUESTIONS.filter((q) => q.id in answers).map((q) => [q.id, answers[q.id] ?? null]));
  const copy = await prisma.assessment.create({ data: { userId: source.userId, answers: core } });
  redirect(`/assessment/${copy.id}`);
}
