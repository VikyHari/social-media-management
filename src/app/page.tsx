export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6">
      <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">Phase 0</p>
      <h1 className="text-4xl font-semibold tracking-tight">AI Creator Growth Manager</h1>
      <p className="text-zinc-400">
        Foundation is running. Creator onboarding, social account connection, analytics and the AI
        marketing manager are built on top of this shell.
      </p>
      <a
        href="/api/health"
        className="w-fit rounded-md border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-900"
      >
        Check system health
      </a>
    </main>
  );
}
