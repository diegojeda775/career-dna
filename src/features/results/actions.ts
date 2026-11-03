"use server";

import { findOwnedAssessment } from "@/features/assessment/access";
import { buildProfile } from "@/features/dna/profile";
import { explainCareer } from "@/features/careers/match";
import { sanitizeAnswers } from "@/features/assessment/sequence";

// Full details for one career, loaded when someone opens it on the results page
export async function getCareerDetail(assessmentId: string, careerId: string) {
  const assessment = await findOwnedAssessment(assessmentId);
  if (!assessment) throw new Error("Assessment not found");
  return explainCareer(buildProfile(sanitizeAnswers(assessment.answers)), careerId);
}
