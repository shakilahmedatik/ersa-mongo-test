import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";

const heroButtonClass =
  "group/button inline-flex h-9 shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding px-2.5 text-xs font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const highlights = [
  {
    title: "Static by design",
    description:
      "The frontend builds to static files, with auth and data work happening in the browser.",
  },
  {
    title: "Better Auth client",
    description:
      "Authentication calls are made directly from the client against your backend auth service.",
  },
  {
    title: "TanStack Query mutations",
    description:
      "Sign-in and sign-up flows use client-side mutations instead of server actions or route handlers.",
  },
];

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main className="min-h-[calc(100vh-73px)] bg-[linear-gradient(180deg,rgba(8,145,178,0.08),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.12),transparent_55%)] px-6 py-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-16">
          <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <span className="inline-flex w-fit border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Static frontend
              </span>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
                  Ship the UI as static assets and keep auth entirely
                  client-driven.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  This frontend is configured for static export, uses Better
                  Auth client for authentication, and relies on TanStack Query
                  for browser-side mutations.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/sign-up"
                  className={`${heroButtonClass} bg-primary text-primary-foreground hover:bg-primary/80`}
                >
                  Create an account
                </Link>
                <Link
                  href="/sign-in"
                  className={`${heroButtonClass} border-border bg-background text-foreground hover:bg-muted`}
                >
                  Sign in
                </Link>
              </div>
            </div>

            <div className="border border-border bg-card p-8">
              <div className="mb-6 border-b border-border pb-5">
                <p className="text-sm font-medium text-muted-foreground">
                  Frontend delivery model
                </p>
                <p className="mt-2 text-3xl font-semibold text-foreground">
                  Export once, deploy anywhere.
                </p>
              </div>

              <div className="space-y-5">
                {highlights.map((item) => (
                  <div
                    key={item.title}
                    className="border border-border/80 bg-background p-5"
                  >
                    <h2 className="text-lg font-semibold text-foreground">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
