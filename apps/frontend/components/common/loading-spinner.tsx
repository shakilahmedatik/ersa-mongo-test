"use client";

type LoadingSpinnerProps = {
  text: string;
};

export function LoadingSpinner({ text }: LoadingSpinnerProps) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[linear-gradient(180deg,rgba(8,145,178,0.08),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.12),transparent_55%)] px-6">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="h-20 w-20 animate-spin rounded-full border-4 border-border/40 border-t-primary shadow-[0_0_30px_rgba(8,145,178,0.18)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-card text-sm font-semibold tracking-[0.18em] text-primary">
              EC
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            {text}
          </p>
          <div className="flex gap-1">
            <div className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
            <div className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
            <div className="size-1.5 animate-bounce rounded-full bg-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
