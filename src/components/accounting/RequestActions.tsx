"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/ui/ImageUpload";
import type { ExpenseRequest, ExpenseCategory, ExpenseTopic, ExpenseStatus } from "@/types";

interface RequestActionsProps {
  request: ExpenseRequest;
  categories: ExpenseCategory[];
  topics: ExpenseTopic[];
}

function slipStoragePath(url: string): string | null {
  const marker = "/object/public/expense-slips/";
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

export function RequestActions({ request, categories, topics }: RequestActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [transferNote, setTransferNote] = useState("");
  const [transferSlips, setTransferSlips] = useState<File[]>([]);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [error, setError] = useState("");

  const [showEditForm, setShowEditForm] = useState(false);
  const [editTitle, setEditTitle] = useState(request.title);
  const [editTopicId, setEditTopicId] = useState(request.topic_id || "");
  const [editCategoryId, setEditCategoryId] = useState(request.category_id || "");
  const [editAmount, setEditAmount] = useState(String(request.amount));
  const [editDate, setEditDate] = useState(request.expense_date);
  const [editNotes, setEditNotes] = useState(request.notes || "");
  const [editSlipUrls, setEditSlipUrls] = useState<string[]>(request.slip_urls || []);
  const [editNewFiles, setEditNewFiles] = useState<File[]>([]);

  if (["transferred", "rejected"].includes(request.status)) return null;

  function openEditForm() {
    setEditTitle(request.title);
    setEditTopicId(request.topic_id || "");
    setEditCategoryId(request.category_id || "");
    setEditAmount(String(request.amount));
    setEditDate(request.expense_date);
    setEditNotes(request.notes || "");
    setEditSlipUrls(request.slip_urls || []);
    setEditNewFiles([]);
    setError("");
    setShowEditForm(true);
  }

  function handleEditTopicChange(topicId: string) {
    setEditTopicId(topicId);
    const topic = topics.find((t) => t.id === topicId);
    if (topic?.category_id) setEditCategoryId(topic.category_id);
  }

  async function updateStatus(status: ExpenseStatus) {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error: err } = await supabase
      .from("expense_requests")
      .update({
        status,
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

  async function handleTransfer() {
    if (transferSlips.length === 0) {
      setError("กรุณาแนบสลิปการโอนอย่างน้อย 1 รูป");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const publicUrls: string[] = [];
    for (const slip of transferSlips) {
      const ext = slip.name.split(".").pop();
      const fileName = `transfers/${request.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("expense-slips")
        .upload(fileName, slip);

      if (uploadError) {
        setError("อัปโหลดสลิปไม่สำเร็จ: " + uploadError.message);
        setLoading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("expense-slips")
        .getPublicUrl(fileName);
      publicUrls.push(publicUrl);
    }

    const { error: err } = await supabase
      .from("expense_requests")
      .update({
        status: "transferred",
        transfer_slip_urls: publicUrls,
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

  function removeEditSlip(index: number) {
    setEditSlipUrls((urls) => urls.filter((_, i) => i !== index));
  }

  async function handleSaveEdit() {
    if (!editTitle.trim() || !editAmount || !editDate) {
      setError("กรุณากรอกหัวข้อ จำนวนเงิน และวันที่ให้ครบถ้วน");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();

    const newUrls: string[] = [];
    for (const file of editNewFiles) {
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

    const finalSlipUrls = [...editSlipUrls, ...newUrls];

    const { error: err } = await supabase
      .from("expense_requests")
      .update({
        title: editTitle.trim(),
        topic_id: editTopicId || null,
        category_id: editCategoryId || null,
        amount: parseFloat(editAmount),
        expense_date: editDate,
        notes: editNotes || null,
        slip_urls: finalSlipUrls,
      })
      .eq("id", request.id);

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    const removedUrls = (request.slip_urls || []).filter((u) => !finalSlipUrls.includes(u));
    const removedPaths = removedUrls.map(slipStoragePath).filter((p): p is string => !!p);
    if (removedPaths.length > 0) {
      await supabase.storage.from("expense-slips").remove(removedPaths);
    }

    setShowEditForm(false);
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

      {/* Status Actions */}
      {!showTransferForm && !showEditForm && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={openEditForm}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            แก้ไขข้อมูล
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

      {/* Edit Form */}
      {showEditForm && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-4">
          <h4 className="font-medium text-blue-900">แก้ไขข้อมูลใบสำรองจ่าย</h4>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              หัวข้อ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">หัวข้อสำรองจ่าย</label>
              <select
                value={editTopicId}
                onChange={(e) => handleEditTopicChange(e.target.value)}
                className="input-field"
              >
                <option value="">-- เลือกหัวข้อ --</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ประเภทค่าใช้จ่าย</label>
              <select
                value={editCategoryId}
                onChange={(e) => setEditCategoryId(e.target.value)}
                className="input-field"
              >
                <option value="">-- เลือกประเภท --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                จำนวนเงิน (บาท) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="input-field"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                วันที่ <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="input-field min-h-[80px] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">สลิป / เอกสารที่แนบไว้</label>
            {editSlipUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {editSlipUrls.map((url, i) => (
                  <div key={url} className="relative">
                    <img src={url} alt={`slip ${i + 1}`} className="w-24 h-24 object-contain rounded-lg border border-slate-200 bg-white" />
                    <button
                      type="button"
                      onClick={() => removeEditSlip(i)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                      aria-label="ลบรูปนี้"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <ImageUpload onUpload={setEditNewFiles} label="แนบสลิป/เอกสารเพิ่มเติม" multiple />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setShowEditForm(false); setError(""); }}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={loading}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {loading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
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
            <ImageUpload onUpload={setTransferSlips} label="แนบสลิปการโอนเงินคืน (แนบได้หลายรูป)" multiple />
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
