import { requireUser } from "@/lib/auth-guard";
import { OnboardingChat } from "./onboarding-chat";

export default async function OnboardingPage() {
  await requireUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">Onboarding</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Let&apos;s get to know you</h1>
        <p className="mt-1 text-sm text-zinc-400">
          A few honest answers here shape every recommendation the app makes later.
        </p>
      </div>
      <OnboardingChat />
    </main>
  );
}
