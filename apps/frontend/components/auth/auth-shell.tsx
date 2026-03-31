import Link from "next/link";

export function AuthShell({
  title,
  description,
  eyebrow,
  alternateHref,
  alternateLabel,
  alternateText,
  children,
}: {
  title: string;
  description: string;
  eyebrow: string;
  alternateHref: string;
  alternateLabel: string;
  alternateText: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,rgba(8,145,178,0.08),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.12),transparent_55%)] px-4 py-16 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:44px_44px] opacity-25" />
      <div className="pointer-events-none absolute top-0 right-0 h-80 w-80 rounded-full bg-primary/6 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 rounded-full bg-cyan-500/6 blur-[120px]" />

      <section className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card/92 pb-4 text-foreground shadow-2xl backdrop-blur-xl">
        <div className="space-y-2 px-8 pt-10 pb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80">
            {eyebrow}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-base text-muted-foreground">{description}</p>
        </div>

        <div>{children}</div>

        <div className="px-8 pt-2 pb-8">
          <p className="text-center text-sm text-muted-foreground">
            {alternateText}{" "}
            <Link
              className="font-semibold text-foreground transition-colors hover:text-primary"
              href={alternateHref}
            >
              {alternateLabel}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
