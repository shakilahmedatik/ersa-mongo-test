import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";

const heroButtonClass =
  "inline-flex items-center justify-center rounded-full border px-8 py-3.5 text-base font-semibold transition-all";

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main className="relative flex min-h-[calc(100vh-65px)] items-center justify-center overflow-hidden bg-[linear-gradient(180deg,rgba(8,145,178,0.08),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.12),transparent_55%)] px-4 py-14 text-foreground sm:px-6 md:px-8 md:py-16">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:44px_44px] opacity-40" />

        <div className="pointer-events-none absolute top-[20%] left-[20%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute right-[18%] bottom-[18%] h-64 w-64 translate-x-1/2 translate-y-1/2 rounded-full bg-primary/10 blur-[110px]" />

        <section className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary/80">
            Welcome to
          </p>
          <h1 className="mt-4 max-w-4xl text-balance text-5xl font-semibold leading-tight tracking-tight text-foreground sm:text-6xl md:text-7xl">
            Ersa The Chatbot
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Ask questions, get guided answers, and continue the conversation
            inside a fast static frontend backed by your AI workspace.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              className={`${heroButtonClass} border-transparent bg-primary text-primary-foreground hover:scale-[1.02] hover:bg-primary/85`}
              href="/chat"
            >
              Chat with Ersa
            </Link>
            <Link
              className={`${heroButtonClass} border-border bg-background text-foreground hover:bg-muted`}
              href="/sign-up"
            >
              Join now
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
