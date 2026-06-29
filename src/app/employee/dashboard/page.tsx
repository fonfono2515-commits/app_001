import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ExpenseRequest } from "@/types";

export default async function EmployeeDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: requests } = await supabase
    .from("expense_requests")
    .select(`*, topic:expense_topics(name), category:expense_categories(name, color)`)
    .eq("employee_id", user!.id)
    .order("created_at", { ascending: false });

  const stats = {
    total: requests?.length || 0,
    pending: requests?.filter((r) => r.status === "pending").length || 0,
    transferred: requests?.filter((r) => r.status === "transferred").length || 0,
    totalAmount: requests?.reduce((s, r) => s + r.amount, 0) || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">รายการของฉัน</h1>
          <p className="text-slate-500 text-sm mt-1">รายการสำรองจ่ายทั้งหมดของคุณ</p>
        </div>
        <Link href="/employee/create" className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          สร้างใบสำรองจ่าย
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-slate-500">รายการทั้งหมด</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-500">รอตรวจสอบ</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-500">โอนแล้ว</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.transferred}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-500">ยอดรวม</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(stats.totalAmount)}</p>
        </div>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">รายการล่าสุด</h2>
        </div>
        {!requests || requests.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-3 text-slate-500">ยังไม่มีรายการสำรองจ่าย</p>
            <Link href="/employee/create" className="mt-4 inline-block btn-primary">
              สร้างรายการแรก
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {(requests as ExpenseRequest[]).map((req) => (
              <Link
                key={req.id}
                href={`/employee/requests/${req.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                    style={{ backgroundColor: req.category?.color || "#94a3b8" }}
                  />
                  <div>
                    <p className="font-medium text-slate-900">{req.title}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {req.category?.name} • {req.topic?.name} • {formatDate(req.expense_date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-semibold text-slate-900">{formatCurrency(req.amount)}</p>
                  <StatusBadge status={req.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
