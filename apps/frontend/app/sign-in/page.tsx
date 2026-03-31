import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function SignInPage() {
  return (
    <AuthShell
      alternateHref="/sign-up"
      alternateLabel="Create one now"
      alternateText="Don't have an account?"
      description="Sign in to your Ersa account and jump back into the conversation."
      eyebrow="Continue your journey"
      title="Welcome Back"
    >
      <SignInForm />
    </AuthShell>
  );
}
