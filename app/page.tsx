export default function Home() {
  return (
    <main className="min-h-screen bg-bg p-12">
      <h1 className="font-serif text-4xl text-text tracking-tight mb-1">TrailFinder</h1>
      <p className="font-mono text-sm text-text-muted mb-10">design token test · T-02</p>

      <div className="flex flex-wrap gap-4 mb-10">
        <Swatch bg="bg-surface" label="surface" border />
        <Swatch bg="bg-accent" label="accent" textClass="text-accent-on" />
        <Swatch bg="bg-surface-muted" label="surface-muted" border />
        <Swatch bg="bg-accent-soft" label="accent-soft" textClass="text-accent" />
        <Swatch bg="bg-bg-elevated" label="bg-elevated" border />
      </div>

      <div className="flex flex-wrap gap-4 mb-10">
        <div className="rounded-lg p-5 shadow-sm bg-surface border border-border w-36">
          <p className="text-text-muted font-mono text-xs">shadow-sm</p>
        </div>
        <div className="rounded-lg p-5 shadow-md bg-surface border border-border w-36">
          <p className="text-text-muted font-mono text-xs">shadow-md</p>
        </div>
        <div className="rounded-lg p-5 shadow-lg bg-surface border border-border w-36">
          <p className="text-text-muted font-mono text-xs">shadow-lg</p>
        </div>
        <div className="rounded-lg p-5 shadow-xl bg-surface border border-border w-36">
          <p className="text-text-muted font-mono text-xs">shadow-xl</p>
        </div>
      </div>

      <div className="max-w-prose mb-10">
        <h2 className="font-serif text-2xl text-text mb-2">Griffith Park Loop</h2>
        <p className="font-mono text-sm text-text-muted mb-3">4.2 mi · +850 ft · Moderate · Loop</p>
        <p className="text-text-soft leading-relaxed text-base">
          A classic LA loop with panoramic views of the city and the Hollywood sign. Best hiked
          early morning before the trails get crowded.
        </p>
      </div>

      <p className="text-text-muted text-sm">
        Toggle{" "}
        <code className="font-mono text-accent bg-accent-soft px-1 rounded-sm">
          data-theme=&quot;dark&quot;
        </code>{" "}
        on{" "}
        <code className="font-mono text-accent bg-accent-soft px-1 rounded-sm">&lt;html&gt;</code>{" "}
        in DevTools to verify dark mode.
      </p>
    </main>
  );
}

function Swatch({
  bg,
  label,
  textClass = "text-text",
  border = false,
}: {
  bg: string;
  label: string;
  textClass?: string;
  border?: boolean;
}) {
  return (
    <div className={`rounded-lg p-5 w-36 shadow-md ${bg} ${border ? "border border-border" : ""}`}>
      <p className={`text-sm font-medium ${textClass}`}>{label}</p>
    </div>
  );
}
