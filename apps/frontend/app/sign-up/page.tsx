import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { Navbar } from "@/components/layout/navbar";

export default function SignUpPage() {
  return (
    <>
      <Navbar />
      <AuthShell
        title="Create account"
        description="Register with your name, email, and password. The form submits directly to your Better Auth backend."
        alternateHref="/sign-in"
        alternateLabel="Sign in"
        alternateText="Already have an account?"
      >
        <SignUpForm />
      </AuthShell>
    </>
  );
}
