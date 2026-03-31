"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAdminStatusQuery } from "@/features/admin/use-admin";
import { authClient } from "@/features/auth/auth-client";
import { useSignOutMutation } from "@/features/auth/use-auth-mutations";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const adminStatusQuery = useAdminStatusQuery(Boolean(session?.user));
  const signOutMutation = useSignOutMutation();

  if (pathname === "/sign-in" || pathname === "/sign-up") {
    return null;
  }

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
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="min-w-0 text-xs font-semibold uppercase tracking-[0.22em] text-foreground sm:text-sm"
        >
          <span className="sm:hidden">Ersa</span>
          <span className="hidden sm:inline lg:hidden">Ersa Chat</span>
          <span className="hidden lg:inline">Ersa The Chatbot</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground sm:px-3 sm:text-sm"
          >
            Home
          </Link>

          {isPending ? (
            <span className="hidden px-3 py-2 text-sm text-muted-foreground sm:inline">
              Checking session...
            </span>
          ) : session?.user ? (
            <>
              <Link
                href="/chat"
                className="px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground sm:px-3 sm:text-sm"
              >
                Chat
              </Link>
              {adminStatusQuery.data?.isAdmin ? (
                <Link
                  href="/admin"
                  className="px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground sm:px-3 sm:text-sm"
                >
                  Admin
                </Link>
              ) : null}
              <span className="hidden text-sm text-muted-foreground xl:inline">
                {session.user.email}
              </span>
              <Button
                className="rounded-xl"
                type="button"
                variant="outline"
                size="sm"
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
                className={buttonVariants({
                  className: "rounded-xl",
                  size: "sm",
                  variant: "ghost",
                })}
              >
                Log in
              </Link>
              <Link
                href="/sign-up"
                className={buttonVariants({
                  className: "rounded-xl",
                  size: "sm",
                })}
              >
                Join now
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
