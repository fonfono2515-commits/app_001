"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ArchiveCheckbox({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.checked || loading) return;
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase
      .from("expense_requests")
      .update({ archived_at: new Date().toISOString(), archived_by: user?.id })
      .eq("id", requestId);

    router.refresh();
  }

  return (
    <label
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none"
    >
      <input
        type="checkbox"
        disabled={loading}
        onChange={handleChange}
        className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
      />
      จัดเก็บ
    </label>
  );
}
