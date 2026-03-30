import Link from "next/link";

export function AuthShell({
  title,
  description,
  alternateHref,
  alternateLabel,
  alternateText,
  children,
}: {
  title: string;
  description: string;
  alternateHref: string;
  alternateLabel: string;
  alternateText: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-[calc(100vh-73px)] bg-[linear-gradient(135deg,rgba(8,145,178,0.08),transparent_35%),linear-gradient(225deg,rgba(15,23,42,0.14),transparent_45%)] px-6 py-16">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-between gap-10 border border-border bg-card p-8">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Client-only frontend
            </p>
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Auth flows handled in the browser with Better Auth and TanStack
              Query.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">
              This frontend ships as a static export. Authentication requests go
              directly from the browser to the backend API.
            </p>
          </div>

          <div className="grid gap-4 border border-border/80 bg-muted/30 p-5 text-sm text-muted-foreground sm:grid-cols-2">
            <div>
              <p className="font-medium text-foreground">Static pages</p>
              <p>No Next.js server runtime required for auth screens.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Browser mutations</p>
              <p>Sign-in and sign-up are driven by TanStack Query mutations.</p>
            </div>
          </div>
        </section>

        <section className="border border-border bg-background p-8">
          <div className="mb-8 space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>

          {children}

          <p className="mt-6 text-sm text-muted-foreground">
            {alternateText}{" "}
            <Link
              href={alternateHref}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {alternateLabel}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
