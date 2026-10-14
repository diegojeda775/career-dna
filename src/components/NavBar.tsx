import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Dna } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ThemeToggle";

export default function NavBar() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Dna className="size-5 text-primary" />
          Career DNA
        </Link>
        <div className="flex items-center gap-2">
          <SignedIn>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">My results</Link>
            </Button>
          </SignedIn>
          <ModeToggle />
          <SignedIn>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignInButton>
              <Button size="sm">Sign in</Button>
            </SignInButton>
          </SignedOut>
        </div>
      </nav>
    </header>
  );
}
