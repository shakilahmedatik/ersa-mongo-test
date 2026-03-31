import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <AuthShell
      alternateHref="/sign-in"
      alternateLabel="Sign In"
      alternateText="Already have an account?"
      description="Start your journey with Ersa and open your first assistant thread."
      eyebrow="Join the workspace"
      title="Create Account"
    >
      <SignUpForm />
    </AuthShell>
  );
}
