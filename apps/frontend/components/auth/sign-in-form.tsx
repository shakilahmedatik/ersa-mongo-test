"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSignInMutation } from "@/features/auth/use-auth-mutations";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const signInMutation = useSignInMutation();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    try {
      await signInMutation.mutateAsync({ email, password });
      router.push("/chat");
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Unable to sign in.",
      );
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2 px-8">
        <Input
          className="rounded-2xl border-border bg-background/90 px-5 py-7"
          id="email"
          type="email"
          autoComplete="email"
          placeholder="Email Address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <div className="space-y-2 px-8">
        <Input
          className="rounded-2xl border-border bg-background/90 px-5 py-7"
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      {feedback ? (
        <div className="mx-8 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {feedback}
        </div>
      ) : null}

      <div className="px-8 pt-3">
        <Button
          className="h-14 w-full rounded-2xl text-base font-semibold"
          type="submit"
          disabled={signInMutation.isPending}
        >
          {signInMutation.isPending ? "Signing in..." : "Sign In"}
        </Button>
      </div>
    </form>
  );
}
