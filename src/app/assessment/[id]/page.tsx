import { notFound, redirect } from "next/navigation";
import { findOwnedAssessment } from "@/features/assessment/access";
import { Questionnaire } from "@/features/assessment/components/Questionnaire";
import { sanitizeAnswers } from "@/features/assessment/sequence";
import { AdBanner } from "@/components/AdBanner";

const SIDE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT_TEST_SIDE;
const BOTTOM_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT_TEST_BOTTOM;

export default async function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assessment = await findOwnedAssessment(id);
  if (!assessment) notFound();
  if (assessment.status === "COMPLETED") redirect(`/assessment/${id}/results`);

  // 160×600 ads on each side, only on screens wide enough to fit them beside the questions,
  // and one under the test on smaller screens instead.
  // The columns are pinned so nothing shifts while the ads mount after hydration.
  const sideAd = <AdBanner slot={SIDE_SLOT} width={160} height={600} minWidth={1280} className="sticky top-20" />;
  return (
    <div className="xl:grid xl:grid-cols-[160px_minmax(0,1fr)_160px] xl:gap-4">
      <div className="hidden xl:col-start-1 xl:row-start-1 xl:block">{sideAd}</div>
      <div className="xl:col-start-2 xl:row-start-1">
        <Questionnaire
          assessmentId={assessment.id}
          initialAnswers={sanitizeAnswers(assessment.answers)}
          initialPosition={assessment.position}
          initialProbeIds={assessment.probeIds}
          isGuest={!assessment.userId}
        />
        {/* Below the tips, well clear of the answer buttons. Only where the side ads don't fit:
            a leaderboard on tablets, a mobile banner on phones */}
        <AdBanner slot={BOTTOM_SLOT} width={728} height={90} minWidth={768} maxWidth={1280} className="mt-10" />
        <AdBanner slot={BOTTOM_SLOT} width={320} height={100} maxWidth={768} className="mt-10" />
      </div>
      <div className="hidden xl:col-start-3 xl:row-start-1 xl:block">{sideAd}</div>
    </div>
  );
}
