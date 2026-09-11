import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth-guard";

/** Entry point: sends every visitor straight to where they actually belong. */
export default async function Home() {
  const user = await getOptionalUser();
  redirect(user ? "/dashboard" : "/login");
}
