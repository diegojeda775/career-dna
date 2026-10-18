"use server";

import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/features/user/db";
import { buildProfile } from "@/features/dna/profile";
import { explainCareer } from "@/features/careers/match";
import { sanitizeAnswers } from "@/features/assessment/sequence";

// Full details for one career, loaded when someone opens it on the results page
export async function getCareerDetail(assessmentId: string, careerId: string) {
  const user = await requireDbUser();
  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, userId: user.id },
    select: { answers: true },
  });
  if (!assessment) throw new Error("Assessment not found");
  return explainCareer(buildProfile(sanitizeAnswers(assessment.answers)), careerId);
}
