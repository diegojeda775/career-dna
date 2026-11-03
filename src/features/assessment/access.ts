import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/features/user/db";
import type { Prisma } from "@/generated/prisma/client";

// Guests can take the assessment without an account. Their assessments are tied to a random
// token in an httpOnly cookie; the database only stores its hash. Signing up or signing in
// on the same browser moves those assessments onto the account.
const COOKIE = "cdna_guest";
const GUEST_DAYS = 30;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

async function guestTokenHash() {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? hash(token) : null;
}

// Who is looking: the signed-in user (with any guest assessments from this browser claimed), or a guest
export async function getViewer() {
  const [user, tokenHash] = await Promise.all([getDbUser(), guestTokenHash()]);
  if (user && tokenHash) {
    await prisma.assessment.updateMany({
      where: { guestToken: tokenHash, userId: null },
      data: { userId: user.id, guestToken: null },
    });
  }
  return { user, tokenHash };
}

// Prisma filter for "assessments this viewer may see"
export async function ownedBy(): Promise<Prisma.AssessmentWhereInput | null> {
  const { user, tokenHash } = await getViewer();
  if (user) return { userId: user.id };
  if (tokenHash) return { guestToken: tokenHash, userId: null };
  return null;
}

export async function findOwnedAssessment(id: string) {
  const owner = await ownedBy();
  if (!owner) return null;
  return prisma.assessment.findFirst({ where: { id, ...owner } });
}

// Only callable from server actions, since it may set the cookie
export async function ownerForNewAssessment(): Promise<{ userId: string } | { guestToken: string }> {
  const { user, tokenHash } = await getViewer();
  if (user) return { userId: user.id };
  if (tokenHash) return { guestToken: tokenHash };

  const token = randomBytes(32).toString("base64url");
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_DAYS * 24 * 60 * 60,
  });
  return { guestToken: hash(token) };
}

// Guest assessments nobody has touched in 30 days are never coming back
export async function deleteStaleGuestAssessments() {
  const cutoff = new Date(Date.now() - GUEST_DAYS * 24 * 60 * 60 * 1000);
  await prisma.assessment.deleteMany({ where: { userId: null, updatedAt: { lt: cutoff } } });
}

// Best-effort limit on new guest assessments per IP. It's in memory, so on serverless hosts each
// instance counts separately; pair it with your host's rate limiting for real protection.
const starts = new Map<string, number[]>();
const LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;

export async function guestStartAllowed() {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const recent = (starts.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) return false;
  recent.push(now);
  starts.set(ip, recent);
  if (starts.size > 10_000) starts.clear();
  return true;
}
