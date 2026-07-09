import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/auth";

export default async function Home() {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");

  if (profile.role === "accounting") {
    redirect("/accounting/dashboard");
  } else {
    redirect("/employee/dashboard");
  }
}
