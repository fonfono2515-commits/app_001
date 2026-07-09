import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import Link from "next/link";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ExportExcelButton } from "@/components/employee/ExportExcelButton";
import { ArchiveCheckbox } from "@/components/employee/ArchiveCheckbox";
import type { ExpenseRequest, ExpenseStatus } from "@/types";

const STATUS_GROUPS: { statuses: ExpenseStatus[]; label: string }[] = [
  { statuses: ["pending", "reviewing"], label: "รอตรวจสอบ" },
  { statuses: ["approved"], label: "อนุมัติแล้ว" },
  { statuses: ["transferred"], label: "โอนแล้ว" },
  { statuses: ["rejected"], label: "ปฏิเสธ" },
];

function RequestRow({ req, showArchive }: { req: ExpenseRequest; showArchive?: boolean }) {
  return (
    <Link
      href={`/employee/requests/${req.id}`}
      className="flex items-start justify-between gap-3 px-4 sm:px-6 py-4 hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div
          className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
          style={{ backgroundColor: req.category?.color || "#94a3b8" }}
        />
        <div className="min-w-0">
          <p className="font-medium text-slate-900 text-sm sm:text-base break-words">{req.title}</p>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {req.category?.name} • {req.topic?.name} • {formatDate(req.expense_date)}
          </p>
          <p className="text-xs text-slate-400 mt-1">สร้างเมื่อ {formatDateTime(req.created_at)}</p>
          {req.transferred_at && (
            <p className="text-xs text-slate-400 mt-0.5">โอนเมื่อ {formatDateTime(req.transferred_at)}</p>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <p className="font-semibold text-slate-900 text-sm sm:text-base whitespace-nowrap">{formatCurrency(req.amount)}</p>
        <StatusBadge status={req.status} />
        {showArchive && <ArchiveCheckbox requestId={req.id} />}
      </div>
    </Link>
  );
}

export default async function EmployeeDashboard() {
  const user = await getAuthUser();
  const supabase = createClient();

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">รายการของฉัน</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">รายการสำรองจ่ายทั้งหมดของคุณ</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <ExportExcelButton requests={(requests as ExpenseRequest[]) || []} />
          <Link
            href="/employee/create"
            className="btn-primary flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            สร้างใบสำรองจ่าย
          </Link>
        </div>
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
      {!requests || requests.length === 0 ? (
        <div className="card overflow-hidden">
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-3 text-slate-500">ยังไม่มีรายการสำรองจ่าย</p>
            <Link href="/employee/create" className="mt-4 inline-block btn-primary">
              สร้างรายการแรก
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {STATUS_GROUPS.map((group) => {
            const isTransferredGroup = group.statuses.includes("transferred");
            const items = (requests as ExpenseRequest[]).filter(
              (r) => group.statuses.includes(r.status) && !(isTransferredGroup && r.archived_at)
            );
            if (items.length === 0) return null;
            return (
              <div key={group.label} className="card overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                  <h2 className="font-semibold text-slate-900">{group.label}</h2>
                  <span className="text-sm text-slate-400">({items.length})</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map((req) => (
                    <RequestRow key={req.id} req={req} showArchive={isTransferredGroup} />
                  ))}
                </div>
              </div>
            );
          })}

          {(() => {
            const archivedItems = (requests as ExpenseRequest[]).filter(
              (r) => r.status === "transferred" && r.archived_at
            );
            if (archivedItems.length === 0) return null;
            return (
              <div className="card overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                  <h2 className="font-semibold text-slate-900">จัดเก็บแล้ว</h2>
                  <span className="text-sm text-slate-400">({archivedItems.length})</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {archivedItems.map((req) => (
                    <RequestRow key={req.id} req={req} />
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
