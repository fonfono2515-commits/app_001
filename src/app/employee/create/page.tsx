"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/ui/ImageUpload";
import type { ExpenseTopic, ExpenseCategory } from "@/types";

export default function CreateExpensePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [topics, setTopics] = useState<ExpenseTopic[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [slipFile, setSlipFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    title: "",
    topic_id: "",
    category_id: "",
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: t }, { data: c }] = await Promise.all([
        supabase.from("expense_topics").select("*, category:expense_categories(*)").order("name"),
        supabase.from("expense_categories").select("*").order("name"),
      ]);
      setTopics((t as ExpenseTopic[]) || []);
      setCategories((c as ExpenseCategory[]) || []);
    }
    load();
  }, []);

  function handleTopicChange(topicId: string) {
    const topic = topics.find((t) => t.id === topicId);
    setForm((f) => ({
      ...f,
      topic_id: topicId,
      category_id: topic?.category_id || f.category_id,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slipFile) {
      setError("กรุณาอัปโหลดสลิปการโอน");
      return;
    }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const ext = slipFile.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from("expense-slips")
      .upload(fileName, slipFile);

    if (uploadError) {
      setError("อัปโหลดรูปไม่สำเร็จ: " + uploadError.message);
      setLoading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("expense-slips")
      .getPublicUrl(fileName);

    const { error: insertError } = await supabase.from("expense_requests").insert({
      employee_id: user.id,
      title: form.title,
      topic_id: form.topic_id || null,
      category_id: form.category_id || null,
      amount: parseFloat(form.amount),
      expense_date: form.expense_date,
      slip_url: publicUrl,
      notes: form.notes || null,
      status: "pending",
    });

    if (insertError) {
      setError("บันทึกข้อมูลไม่สำเร็จ: " + insertError.message);
      setLoading(false);
      return;
    }

    router.push("/employee/dashboard");
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">สร้างใบสำรองจ่าย</h1>
        <p className="text-slate-500 text-sm mt-1">กรอกข้อมูลการสำรองจ่ายให้ครบถ้วน</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            หัวข้อ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="input-field"
            placeholder="เช่น ค่าเดินทางไปประชุมลูกค้า"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              หัวข้อสำรองจ่าย
            </label>
            <select
              value={form.topic_id}
              onChange={(e) => handleTopicChange(e.target.value)}
              className="input-field"
            >
              <option value="">-- เลือกหัวข้อ --</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ประเภทค่าใช้จ่าย
            </label>
            <select
              value={form.category_id}
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
              className="input-field"
            >
              <option value="">-- เลือกประเภท --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
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
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="input-field"
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              วันที่ <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.expense_date}
              onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
              className="input-field"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            สลิปการโอน <span className="text-red-500">*</span>
          </label>
          <ImageUpload onUpload={setSlipFile} label="อัปโหลดรูปสลิปการโอน" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            หมายเหตุ
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="input-field min-h-[80px] resize-none"
            placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary flex-1"
          >
            ยกเลิก
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? "กำลังบันทึก..." : "ส่งคำขอ"}
          </button>
        </div>
      </form>
    </div>
  );
}
