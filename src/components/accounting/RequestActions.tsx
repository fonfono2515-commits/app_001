"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/ui/ImageUpload";
import type { ExpenseRequest, ExpenseCategory, ExpenseStatus } from "@/types";

interface RequestActionsProps {
  request: ExpenseRequest;
  categories: ExpenseCategory[];
}

export function RequestActions({ request, categories }: RequestActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [transferNote, setTransferNote] = useState("");
  const [transferSlip, setTransferSlip] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(request.category_id || "");
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [showAddSlipForm, setShowAddSlipForm] = useState(false);
  const [additionalSlips, setAdditionalSlips] = useState<File[]>([]);
  const [error, setError] = useState("");

  if (["transferred", "rejected"].includes(request.status)) return null;

  async function updateStatus(status: ExpenseStatus) {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const updates: Record<string, unknown> = {
      status,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    };
    if (selectedCategory) updates.category_id = selectedCategory;

    const { error: err } = await supabase
      .from("expense_requests")
      .update(updates)
      .eq("id", request.id);

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    router.refresh();
    setLoading(false);
  }

  async function handleTransfer() {
    if (!transferSlip) {
      setError("กรุณาแนบสลิปการโอน");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const ext = transferSlip.name.split(".").pop();
    const fileName = `transfers/${request.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("expense-slips")
      .upload(fileName, transferSlip);

    if (uploadError) {
      setError("อัปโหลดสลิปไม่สำเร็จ: " + uploadError.message);
      setLoading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("expense-slips")
      .getPublicUrl(fileName);

    const { error: err } = await supabase
      .from("expense_requests")
      .update({
        status: "transferred",
        transfer_slip_url: publicUrl,
        transferred_at: new Date().toISOString(),
        transferred_by: user?.id,
        transfer_note: transferNote || null,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    router.refresh();
    setLoading(false);
  }

  async function handleAddSlips() {
    if (additionalSlips.length === 0) {
      setError("กรุณาเลือกรูปสลิปที่ต้องการแนบเพิ่ม");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();

    const newUrls: string[] = [];
    for (const file of additionalSlips) {
      const ext = file.name.split(".").pop();
      const fileName = `additional/${request.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("expense-slips")
        .upload(fileName, file);

      if (uploadError) {
        setError("อัปโหลดสลิปไม่สำเร็จ: " + uploadError.message);
        setLoading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("expense-slips")
        .getPublicUrl(fileName);
      newUrls.push(publicUrl);
    }

    const { error: err } = await supabase
      .from("expense_requests")
      .update({ slip_urls: [...(request.slip_urls || []), ...newUrls] })
      .eq("id", request.id);

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setAdditionalSlips([]);
    setShowAddSlipForm(false);
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="card p-5 space-y-4">
      <h3 className="font-semibold text-slate-900">จัดการรายการ</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Edit Category */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          แก้ไขประเภทค่าใช้จ่าย
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="input-field"
        >
          <option value="">-- เลือกประเภท --</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Status Actions */}
      {!showTransferForm && !showAddSlipForm && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowAddSlipForm(true)}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            แนบสลิปเพิ่มเติม
          </button>
          {request.status === "pending" && (
            <button
              onClick={() => updateStatus("reviewing")}
              disabled={loading}
              className="btn-secondary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              เริ่มตรวจสอบ
            </button>
          )}
          {["pending", "reviewing"].includes(request.status) && (
            <>
              <button
                onClick={() => updateStatus("approved")}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                อนุมัติ
              </button>
              <button
                onClick={() => updateStatus("rejected")}
                disabled={loading}
                className="btn-danger flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                ปฏิเสธ
              </button>
            </>
          )}
          {["approved", "reviewing", "pending"].includes(request.status) && (
            <button
              onClick={() => setShowTransferForm(true)}
              disabled={loading}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              บันทึกการโอน
            </button>
          )}
        </div>
      )}

      {/* Add Slip Form */}
      {showAddSlipForm && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-4">
          <h4 className="font-medium text-blue-900">แนบสลิปเพิ่มเติมให้พนักงาน</h4>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              สลิป / คำสั่งซื้อ / เอกสารอื่นๆ <span className="text-red-500">*</span>
            </label>
            <ImageUpload onUpload={setAdditionalSlips} label="แนบรูปสลิปเพิ่มเติม" multiple />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setShowAddSlipForm(false); setAdditionalSlips([]); setError(""); }}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              ยกเลิก
            </button>
            <button
              onClick={handleAddSlips}
              disabled={loading}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {loading ? "กำลังบันทึก..." : "บันทึกสลิปเพิ่มเติม"}
            </button>
          </div>
        </div>
      )}

      {/* Transfer Form */}
      {showTransferForm && (
        <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50 space-y-4">
          <h4 className="font-medium text-emerald-900">บันทึกการโอนเงินคืน</h4>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              สลิปการโอน <span className="text-red-500">*</span>
            </label>
            <ImageUpload onUpload={(files) => setTransferSlip(files[0] || null)} label="แนบสลิปการโอนเงินคืน" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุการโอน</label>
            <input
              type="text"
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              className="input-field"
              placeholder="เช่น โอนผ่าน KBank ชื่อบัญชี..."
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setShowTransferForm(false); setError(""); }}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              ยกเลิก
            </button>
            <button
              onClick={handleTransfer}
              disabled={loading}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium flex-1 disabled:opacity-50"
            >
              {loading ? "กำลังบันทึก..." : "ยืนยันการโอน"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
