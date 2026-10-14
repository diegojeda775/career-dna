import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

// Find (or lazily create) the database user for the signed-in Clerk account.
// Creating on first visit means no webhook setup is needed.
export async function requireDbUser() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const existing = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  return prisma.user.upsert({
    where: { clerkId: userId },
    update: {},
    create: {
      clerkId: userId,
      email: clerkUser?.primaryEmailAddress?.emailAddress ?? null,
      name: [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null,
    },
  });
}
