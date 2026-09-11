import Link from "next/link";
import { requireUser } from "@/lib/auth-guard";
import { getEnv } from "@/lib/env";
import { getGoals, getProfile } from "@/modules/creator";
import { listAccounts, PLATFORMS } from "@/modules/integrations";
import { PlatformSection } from "./platform-section";
import { SignOutButton } from "./sign-out-button";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; integration_error?: string }>;
}) {
  const user = await requireUser();
  const [profile, goals, accounts] = await Promise.all([
    getProfile(user.id),
    getGoals(user.id),
    listAccounts(user.id),
  ]);
  const { connected, integration_error: integrationError } = await searchParams;

  const env = getEnv();
  const configured = {
    instagram: Boolean(env.INSTAGRAM_APP_ID && env.INSTAGRAM_APP_SECRET),
    facebook: Boolean(env.META_APP_ID && env.META_APP_SECRET),
    youtube: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">
            {greeting()}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{user.name ?? user.email}</h1>
        </div>
        <SignOutButton />
      </header>

      {connected && (
        <p className="rounded-md border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          {connected} connected successfully.
        </p>
      )}
      {integrationError && (
        <p className="rounded-md border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          Couldn&apos;t connect that account: {integrationError}
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Your profile</h2>
        {!profile ? (
          <div className="rounded-md border border-zinc-800 px-4 py-4">
            <p className="text-zinc-300">
              Let&apos;s get to know you. A short interview builds the strategy everything else is
              based on.
            </p>
            <Link
              href="/onboarding"
              className="mt-3 inline-block rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-emerald-400"
            >
              Start onboarding
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-md border border-zinc-800 px-4 py-4">
            <div>
              <p className="text-sm text-zinc-500">Primary niche</p>
              <p className="text-zinc-100">{profile.primaryNiche}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500">Target audience</p>
              <p className="text-zinc-100">{profile.targetAudience}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500">Platforms</p>
              <p className="text-zinc-100">{profile.platforms.join(", ")}</p>
            </div>
            {goals.length > 0 && (
              <div>
                <p className="text-sm text-zinc-500">Goals</p>
                <ul className="list-inside list-disc text-zinc-100">
                  {goals.map((goal) => (
                    <li key={goal.id}>{goal.description}</li>
                  ))}
                </ul>
              </div>
            )}
            <Link
              href="/onboarding"
              className="mt-1 w-fit text-sm text-zinc-400 underline decoration-dotted hover:text-zinc-200"
            >
              Redo the interview
            </Link>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Connected accounts</h2>
        <div className="flex flex-col gap-3">
          {PLATFORMS.map((platform) => (
            <PlatformSection
              key={platform}
              platform={platform}
              configured={configured[platform]}
              accounts={accounts
                .filter((account) => account.platform === platform)
                .map((account) => ({
                  id: account.id,
                  externalAccountName: account.externalAccountName,
                  status: account.status,
                }))}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
