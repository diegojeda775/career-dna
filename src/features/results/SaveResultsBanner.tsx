import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shown to guests: their results only live in this browser until they make an account
export function SaveResultsBanner({ returnTo }: { returnTo: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-primary bg-accent p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Bookmark className="mt-0.5 size-5 shrink-0 text-accent-foreground" />
        <div>
          <p className="font-semibold text-accent-foreground">Save your results</p>
          <p className="text-sm text-muted-foreground">
            They're only kept in this browser for 30 days. Create a free account to keep them, see them on any device and
            track how your DNA changes.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <SignInButton forceRedirectUrl={returnTo} signUpForceRedirectUrl={returnTo}>
          <Button variant="outline">Sign in</Button>
        </SignInButton>
        <SignUpButton forceRedirectUrl={returnTo} signInForceRedirectUrl={returnTo}>
          <Button>Create account</Button>
        </SignUpButton>
      </div>
    </div>
  );
}
