import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth-guard";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getOptionalUser();
  if (user) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 px-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">
          AI Creator Growth Manager
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in to your account</h1>
      </div>
      <LoginForm />
    </main>
  );
}
