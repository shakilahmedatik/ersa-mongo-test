"use client";

// biome-ignore assist/source/organizeImports: Intentionally
import { LogOutIcon, MenuIcon, SettingsIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAdminStatusQuery } from "@/features/admin/use-admin";
import { authClient } from "@/features/auth/auth-client";
import { useSignOutMutation } from "@/features/auth/use-auth-mutations";
import type { ChatThreadSummary } from "@/features/chat/chat.types";
import { cn } from "@/lib/utils";
type ChatHeaderProps = {
  activeThread: ChatThreadSummary | undefined;
  onToggleSidebar: () => void;
};

const formatThreadTime = (value?: string) => {
  if (!value) {
    return "Ready to start";
  }

  const date = new Date(value);

  return Number.isNaN(date.valueOf())
    ? "Ready to start"
    : date.toLocaleString();
};

const getInitials = (name?: string | null, email?: string | null) => {
  const source = name?.trim() || email?.trim() || "U";

  return source.slice(0, 1).toUpperCase();
};

export function ChatHeader({ activeThread, onToggleSidebar }: ChatHeaderProps) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const adminStatusQuery = useAdminStatusQuery(Boolean(session?.user));
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
    <header className="flex min-h-16.25 items-center gap-3 border-b border-border bg-background/70 px-4 py-3 backdrop-blur-md sm:px-6">
      <Button
        aria-label="Toggle thread list"
        className="size-9 rounded-xl border-border bg-card/80 md:hidden"
        onClick={onToggleSidebar}
        type="button"
        variant="outline"
      >
        <MenuIcon className="size-4" />
      </Button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {activeThread?.title || "Fresh conversation"}
        </p>
        <p className="truncate text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {formatThreadTime(activeThread?.updatedAt)}
        </p>
      </div>

      {isPending ? (
        <div className="h-10 w-10 animate-pulse rounded-full border border-border bg-card" />
      ) : session?.user ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                className="relative h-10 w-10 rounded-full border-border bg-card/80 p-0 shadow-none transition hover:border-primary/30"
                type="button"
                variant="outline"
              />
            }
          >
            <span
              className={cn(
                "flex h-full w-full items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary",
                signOutMutation.isPending && "opacity-60",
              )}
            >
              {getInitials(session.user.name, session.user.email)}
            </span>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="rounded-xl border border-border bg-background px-4 py-3 text-left">
                <p className="truncate text-sm font-semibold text-foreground">
                  {session.user.name || "Workspace member"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {session.user.email}
                </p>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="my-2" />

            {adminStatusQuery.data?.isAdmin ? (
              <DropdownMenuItem
                className="rounded-xl px-3 py-2.5"
                onClick={() => {
                  router.push("/admin");
                }}
              >
                <SettingsIcon className="size-4" />
                Knowledge workspace
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator className="my-2" />
            <DropdownMenuItem
              className="rounded-xl px-3 py-2.5"
              onClick={() => {
                void handleSignOut();
              }}
              variant="destructive"
            >
              <LogOutIcon className="size-4" />
              {signOutMutation.isPending ? "Signing out..." : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </header>
  );
}
