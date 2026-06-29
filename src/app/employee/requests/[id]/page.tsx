import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ExpenseRequest } from "@/types";

export default async function EmployeeRequestDetail({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: req } = await supabase
    .from("expense_requests")
    .select(`*, topic:expense_topics(name), category:expense_categories(name, color), reviewer:profiles!reviewed_by(full_name), transferrer:profiles!transferred_by(full_name)`)
    .eq("id", params.id)
    .eq("employee_id", user!.id)
    .single();

  if (!req) notFound();

  const request = req as ExpenseRequest;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/employee/dashboard" className="text-slate-500 hover:text-slate-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-slate-900">รายละเอียดใบสำรองจ่าย</h1>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{request.title}</h2>
            <p className="text-sm text-slate-500 mt-0.5">สร้างเมื่อ {formatDateTime(request.created_at)}</p>
          </div>
          <StatusBadge status={request.status} />
        </div>

        <hr className="border-slate-100" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">จำนวนเงิน</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(request.amount)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">วันที่</p>
            <p className="font-medium text-slate-900 mt-1">{formatDate(request.expense_date)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">หัวข้อสำรองจ่าย</p>
            <p className="font-medium text-slate-900 mt-1">{request.topic?.name || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">ประเภทค่าใช้จ่าย</p>
            <p className="font-medium text-slate-900 mt-1">{request.category?.name || "-"}</p>
          </div>
        </div>

        {request.notes && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">หมายเหตุ</p>
            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{request.notes}</p>
          </div>
        )}
      </div>

      {request.slip_url && (
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-3">สลิปที่แนบ</h3>
          <Image
            src={request.slip_url}
            alt="expense slip"
            width={500}
            height={300}
            className="rounded-lg w-full object-contain max-h-64"
          />
        </div>
      )}

      {request.status === "transferred" && (
        <div className="card p-6 border-emerald-200 bg-emerald-50">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="font-semibold text-emerald-900">โอนเงินคืนแล้ว</h3>
          </div>
          <div className="space-y-1 text-sm text-emerald-800">
            <p>โอนโดย: {request.transferrer?.full_name}</p>
            <p>วันที่โอน: {request.transferred_at ? formatDateTime(request.transferred_at) : "-"}</p>
            {request.transfer_note && <p>หมายเหตุ: {request.transfer_note}</p>}
          </div>
          {request.transfer_slip_url && (
            <div className="mt-4">
              <p className="text-sm font-medium text-emerald-900 mb-2">สลิปการโอนคืน</p>
              <Image
                src={request.transfer_slip_url}
                alt="transfer slip"
                width={500}
                height={300}
                className="rounded-lg w-full object-contain max-h-64"
              />
            </div>
          )}
        </div>
      )}

      {request.status === "rejected" && (
        <div className="card p-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="font-semibold text-red-900">ปฏิเสธคำขอ</h3>
          </div>
          <p className="text-sm text-red-700 mt-2">รายการนี้ถูกปฏิเสธโดยฝ่ายบัญชี</p>
        </div>
      )}
    </div>
  );
}
