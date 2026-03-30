import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Navbar } from "@/components/layout/navbar";

export default function SignInPage() {
  return (
    <>
      <Navbar />
      <AuthShell
        title="Sign in"
        description="Use your email and password to access your session from a fully static frontend."
        alternateHref="/sign-up"
        alternateLabel="Create one"
        alternateText="Need an account?"
      >
        <SignInForm />
      </AuthShell>
    </>
  );
}
