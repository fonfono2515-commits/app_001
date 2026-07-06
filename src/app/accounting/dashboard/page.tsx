import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ExpenseRequest } from "@/types";

interface EmployeeStat {
  id: string;
  full_name: string;
  department?: string;
  total: number;
  pending: number;
  transferred: number;
  rejected: number;
  totalAmount: number;
  pendingAmount: number;
}

export default async function AccountingDashboard() {
  const supabase = createClient();

  const { data: allRequests } = await supabase
    .from("expense_requests")
    .select(`*, employee:profiles!employee_id(id, full_name, department), category:expense_categories(name, color)`)
    .order("created_at", { ascending: false });

  const requests = (allRequests as ExpenseRequest[]) || [];

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    transferred: requests.filter((r) => r.status === "transferred").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
    pendingAmount: requests
      .filter((r) => !["transferred", "rejected"].includes(r.status))
      .reduce((s, r) => s + r.amount, 0),
    transferredAmount: requests
      .filter((r) => r.status === "transferred")
      .reduce((s, r) => s + r.amount, 0),
  };

  // จัดกลุ่มตาม employee
  const employeeMap = new Map<string, EmployeeStat>();
  for (const req of requests) {
    const emp = req.employee as { id: string; full_name: string; department?: string } | undefined;
    if (!emp) continue;
    if (!employeeMap.has(emp.id)) {
      employeeMap.set(emp.id, {
        id: emp.id,
        full_name: emp.full_name,
        department: emp.department,
        total: 0,
        pending: 0,
        transferred: 0,
        rejected: 0,
        totalAmount: 0,
        pendingAmount: 0,
      });
    }
    const s = employeeMap.get(emp.id)!;
    s.total += 1;
    s.totalAmount += req.amount;
    if (req.status === "pending" || req.status === "reviewing") s.pending += 1;
    if (req.status === "transferred") s.transferred += 1;
    if (req.status === "rejected") s.rejected += 1;
    if (!["transferred", "rejected"].includes(req.status)) s.pendingAmount += req.amount;
  }
  const employeeStats = Array.from(employeeMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);

  const recentPending = requests.filter((r) => r.status === "pending").slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ภาพรวม</h1>
        <p className="text-slate-500 text-sm mt-1">สรุปรายการสำรองจ่ายทั้งหมด</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500">ทั้งหมด</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500">รอตรวจสอบ</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500">โอนแล้ว</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.transferred}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500">ปฏิเสธ</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Amount Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-sm text-slate-500">ยอดรอดำเนินการ</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{formatCurrency(stats.pendingAmount)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">ยอดโอนแล้ว (รวม)</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{formatCurrency(stats.transferredAmount)}</p>
        </div>
      </div>

      {/* Per-employee breakdown */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">สรุปรายพนักงาน</h2>
          <p className="text-xs text-slate-500 mt-0.5">ยอดรวมและสถานะแยกตามพนักงานแต่ละคน</p>
        </div>
        {employeeStats.length === 0 ? (
          <div className="text-center py-8 text-slate-500">ยังไม่มีรายการ</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-slate-600 font-medium">พนักงาน</th>
                  <th className="text-center px-4 py-3 text-slate-600 font-medium">รายการ</th>
                  <th className="text-center px-4 py-3 text-yellow-600 font-medium">รอตรวจ</th>
                  <th className="text-center px-4 py-3 text-emerald-600 font-medium">โอนแล้ว</th>
                  <th className="text-center px-4 py-3 text-red-500 font-medium">ปฏิเสธ</th>
                  <th className="text-right px-4 py-3 text-orange-600 font-medium">ยอดค้าง</th>
                  <th className="text-right px-6 py-3 text-slate-600 font-medium">ยอดรวม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employeeStats.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-700 font-semibold text-xs">
                            {emp.full_name?.[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div className="max-w-[180px]">
                          <p className="font-medium text-slate-900 break-words">{emp.full_name}</p>
                          {emp.department && (
                            <p className="text-xs text-slate-400 break-words">{emp.department}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Link
                        href={`/accounting/requests?employee_id=${emp.id}`}
                        className="font-semibold text-slate-700 hover:text-blue-600 hover:underline"
                      >
                        {emp.total}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {emp.pending > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                          {emp.pending}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {emp.transferred > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                          {emp.transferred}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {emp.rejected > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-red-100 text-red-600 rounded-full text-xs font-bold">
                          {emp.rejected}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-orange-600">
                      {emp.pendingAmount > 0 ? formatCurrency(emp.pendingAmount) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-900">
                      {formatCurrency(emp.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending requests */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">รายการรอตรวจสอบ</h2>
          <Link href="/accounting/requests" className="text-sm text-blue-600 hover:underline">
            ดูทั้งหมด
          </Link>
        </div>
        {recentPending.length === 0 ? (
          <div className="text-center py-8 text-slate-500">ไม่มีรายการรอตรวจสอบ</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentPending.map((req) => (
              <Link
                key={req.id}
                href={`/accounting/requests/${req.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: req.category?.color || "#94a3b8" }}
                  />
                  <div>
                    <p className="font-medium text-slate-900">{req.title}</p>
                    <p className="text-sm text-slate-500">
                      {req.employee?.full_name} • {formatDate(req.expense_date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900">{formatCurrency(req.amount)}</span>
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
