import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RequestActions } from "@/components/accounting/RequestActions";
import type { ExpenseRequest, ExpenseCategory } from "@/types";

export default async function AccountingRequestDetail({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [{ data: req }, { data: categories }] = await Promise.all([
    supabase
      .from("expense_requests")
      .select(`*, employee:profiles!employee_id(full_name, department, email), topic:expense_topics(name), category:expense_categories(name, color), reviewer:profiles!reviewed_by(full_name), transferrer:profiles!transferred_by(full_name)`)
      .eq("id", params.id)
      .single(),
    supabase.from("expense_categories").select("*").order("name"),
  ]);

  if (!req) notFound();

  const request = req as ExpenseRequest;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/accounting/requests" className="text-slate-500 hover:text-slate-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">{request.title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">ส่งเมื่อ {formatDateTime(request.created_at)}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 mb-3">ข้อมูลพนักงาน</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-500">ชื่อ-นามสกุล</p>
            <p className="font-medium text-slate-900">{request.employee?.full_name}</p>
          </div>
          <div>
            <p className="text-slate-500">แผนก</p>
            <p className="font-medium text-slate-900">{request.employee?.department || "-"}</p>
          </div>
          <div>
            <p className="text-slate-500">อีเมล</p>
            <p className="font-medium text-slate-900">{request.employee?.email || "-"}</p>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 mb-3">รายละเอียดการสำรองจ่าย</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-500">จำนวนเงิน</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(request.amount)}</p>
          </div>
          <div>
            <p className="text-slate-500">วันที่</p>
            <p className="font-medium text-slate-900">{formatDate(request.expense_date)}</p>
          </div>
          <div>
            <p className="text-slate-500">หัวข้อสำรองจ่าย</p>
            <p className="font-medium text-slate-900">{request.topic?.name || "-"}</p>
          </div>
          <div>
            <p className="text-slate-500">ประเภทค่าใช้จ่าย</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {request.category?.color && (
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: request.category.color }} />
              )}
              <span className="font-medium text-slate-900">{request.category?.name || "-"}</span>
            </div>
          </div>
        </div>
        {request.notes && (
          <div className="mt-4">
            <p className="text-slate-500 text-sm">หมายเหตุ</p>
            <p className="mt-1 text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{request.notes}</p>
          </div>
        )}
      </div>

      {request.slip_urls && request.slip_urls.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-3">สลิปที่แนบ (พนักงาน)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {request.slip_urls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img
                  src={url}
                  alt={`expense slip ${i + 1}`}
                  className="rounded-lg max-h-48 object-contain w-full cursor-zoom-in hover:opacity-90 transition-opacity"
                />
              </a>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">คลิกที่รูปเพื่อดูขนาดเต็ม</p>
        </div>
      )}

      {request.status === "transferred" && request.transfer_slip_url && (
        <div className="card p-5 border-emerald-200">
          <h3 className="font-semibold text-emerald-900 mb-3">หลักฐานการโอนคืน</h3>
          <div className="text-sm text-slate-600 mb-3 space-y-1">
            <p>โอนโดย: {request.transferrer?.full_name}</p>
            <p>วันที่: {request.transferred_at ? formatDateTime(request.transferred_at) : "-"}</p>
            {request.transfer_note && <p>หมายเหตุ: {request.transfer_note}</p>}
          </div>
          <a href={request.transfer_slip_url} target="_blank" rel="noopener noreferrer">
            <img
              src={request.transfer_slip_url}
              alt="transfer slip"
              className="rounded-lg max-h-80 object-contain w-full cursor-zoom-in hover:opacity-90 transition-opacity"
            />
          </a>
        </div>
      )}

      <RequestActions
        request={request}
        categories={(categories as ExpenseCategory[]) || []}
      />
    </div>
  );
}
