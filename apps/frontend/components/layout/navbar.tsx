"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { authClient } from "@/features/auth/auth-client";
import { useSignOutMutation } from "@/features/auth/use-auth-mutations";

export function Navbar() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const signOutMutation = useSignOutMutation();

  const handleSignOut = async () => {
    try {
      await signOutMutation.mutateAsync();
      router.push("/");
      router.refresh();
    } catch {
      return;
    }
  };

  return (
    <header className="border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link
          href="/"
          className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground"
        >
          Ersa Chat
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/"
            className="px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Home
          </Link>

          {isPending ? (
            <span className="px-3 py-2 text-sm text-muted-foreground">
              Checking session...
            </span>
          ) : session?.user ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {session.user.email}
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={handleSignOut}
                disabled={signOutMutation.isPending}
              >
                {signOutMutation.isPending ? "Signing out..." : "Sign out"}
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className={buttonVariants({ variant: "ghost" })}
              >
                Sign in
              </Link>
              <Link href="/sign-up" className={buttonVariants()}>
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
