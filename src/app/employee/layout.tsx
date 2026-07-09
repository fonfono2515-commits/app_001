import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/auth";
import { Navbar } from "@/components/ui/Navbar";
import type { Profile } from "@/types";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.role !== "employee") {
    redirect(profile.role === "accounting" ? "/accounting/dashboard" : "/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar profile={profile as Profile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
