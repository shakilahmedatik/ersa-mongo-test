export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-50">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <span className="w-fit rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-200">
          Bun + Turborepo
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
          Frontend workspace ready with Next.js, Tailwind CSS, and TypeScript.
        </h1>
        <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
          This app lives in a Bun-managed Turborepo and uses Biome for linting
          and formatting across the monorepo.
        </p>
      </div>
    </main>
  );
}
