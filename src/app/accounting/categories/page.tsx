"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ExpenseCategory, ExpenseTopic } from "@/types";

const COLORS = [
  "#3b82f6", "#2563eb", "#1d4ed8", "#06b6d4", "#0891b2",
  "#10b981", "#059669", "#84cc16", "#65a30d", "#eab308",
  "#f59e0b", "#f97316", "#ea580c", "#ef4444", "#dc2626",
  "#ec4899", "#db2777", "#8b5cf6", "#7c3aed", "#6366f1",
  "#64748b", "#475569", "#0f172a", "#92400e", "#78350f",
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [topics, setTopics] = useState<ExpenseTopic[]>([]);
  const [loading, setLoading] = useState(true);

  const [catForm, setCatForm] = useState({ name: "", description: "", color: COLORS[0] });
  const [topicForm, setTopicForm] = useState({ name: "", category_id: "" });
  const [editingCat, setEditingCat] = useState<ExpenseCategory | null>(null);
  const [editingTopic, setEditingTopic] = useState<ExpenseTopic | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const supabase = createClient();
    const [{ data: c }, { data: t }] = await Promise.all([
      supabase.from("expense_categories").select("*").order("name"),
      supabase.from("expense_topics").select("*, category:expense_categories(name, color)").order("name"),
    ]);
    setCategories((c as ExpenseCategory[]) || []);
    setTopics((t as ExpenseTopic[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function saveCategory() {
    if (!catForm.name) return;
    setSaving(true);
    setError("");
    const supabase = createClient();

    if (editingCat) {
      const { error: err } = await supabase
        .from("expense_categories")
        .update({ name: catForm.name, description: catForm.description, color: catForm.color })
        .eq("id", editingCat.id);
      if (err) { setError(err.message); setSaving(false); return; }
      setEditingCat(null);
    } else {
      const { error: err } = await supabase
        .from("expense_categories")
        .insert({ name: catForm.name, description: catForm.description, color: catForm.color });
      if (err) { setError(err.message); setSaving(false); return; }
    }
    setCatForm({ name: "", description: "", color: COLORS[0] });
    await load();
    setSaving(false);
  }

  async function deleteCategory(id: string) {
    if (!confirm("ลบประเภทนี้? หัวข้อที่ผูกอยู่จะไม่มีประเภท")) return;
    const supabase = createClient();
    await supabase.from("expense_categories").delete().eq("id", id);
    await load();
  }

  async function saveTopic() {
    if (!topicForm.name || !topicForm.category_id) return;
    setSaving(true);
    setError("");
    const supabase = createClient();

    if (editingTopic) {
      const { error: err } = await supabase
        .from("expense_topics")
        .update({ name: topicForm.name, category_id: topicForm.category_id })
        .eq("id", editingTopic.id);
      if (err) { setError(err.message); setSaving(false); return; }
      setEditingTopic(null);
    } else {
      const { error: err } = await supabase
        .from("expense_topics")
        .insert({ name: topicForm.name, category_id: topicForm.category_id });
      if (err) { setError(err.message); setSaving(false); return; }
    }
    setTopicForm({ name: "", category_id: "" });
    await load();
    setSaving(false);
  }

  async function deleteTopic(id: string) {
    if (!confirm("ลบหัวข้อนี้?")) return;
    const supabase = createClient();
    await supabase.from("expense_topics").delete().eq("id", id);
    await load();
  }

  function startEditTopic(topic: ExpenseTopic) {
    setEditingTopic(topic);
    setTopicForm({ name: topic.name, category_id: topic.category_id });
  }

  function startEdit(cat: ExpenseCategory) {
    setEditingCat(cat);
    setCatForm({ name: cat.name, description: cat.description || "", color: cat.color });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">จัดการประเภทค่าใช้จ่าย</h1>
        <p className="text-slate-500 text-sm mt-1">ตั้งค่าประเภทและหัวข้อสำรองจ่าย</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Categories */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">ประเภทค่าใช้จ่าย</h2>

          <div className="card p-4 space-y-3">
            <h3 className="font-medium text-slate-700">{editingCat ? "แก้ไขประเภท" : "เพิ่มประเภทใหม่"}</h3>
            <input
              type="text"
              value={catForm.name}
              onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
              className="input-field"
              placeholder="ชื่อประเภท เช่น ค่าเดินทาง"
            />
            <input
              type="text"
              value={catForm.description}
              onChange={(e) => setCatForm((f) => ({ ...f, description: e.target.value }))}
              className="input-field"
              placeholder="คำอธิบาย (ไม่บังคับ)"
            />
            <div>
              <p className="text-sm text-slate-600 mb-2">สีประจำประเภท</p>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCatForm((f) => ({ ...f, color: c }))}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${catForm.color === c ? "border-slate-800 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              {editingCat && (
                <button onClick={() => { setEditingCat(null); setCatForm({ name: "", description: "", color: COLORS[0] }); }} className="btn-secondary flex-1">
                  ยกเลิก
                </button>
              )}
              <button onClick={saveCategory} disabled={saving || !catForm.name} className="btn-primary flex-1">
                {saving ? "กำลังบันทึก..." : editingCat ? "บันทึกการแก้ไข" : "เพิ่มประเภท"}
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-slate-500 text-sm">กำลังโหลด...</p>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="card p-4 flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{cat.name}</p>
                    {cat.description && <p className="text-xs text-slate-500 truncate">{cat.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(cat)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && <p className="text-slate-500 text-sm text-center py-4">ยังไม่มีประเภท</p>}
            </div>
          )}
        </div>

        {/* Topics */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">หัวข้อสำรองจ่าย</h2>

          <div className="card p-4 space-y-3">
            <h3 className="font-medium text-slate-700">{editingTopic ? "แก้ไขหัวข้อ" : "เพิ่มหัวข้อใหม่"}</h3>
            <input
              type="text"
              value={topicForm.name}
              onChange={(e) => setTopicForm((f) => ({ ...f, name: e.target.value }))}
              className="input-field"
              placeholder="ชื่อหัวข้อ เช่น ค่าน้ำมัน"
            />
            <select
              value={topicForm.category_id}
              onChange={(e) => setTopicForm((f) => ({ ...f, category_id: e.target.value }))}
              className="input-field"
            >
              <option value="">-- เลือกประเภทที่ผูกด้วย --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              {editingTopic && (
                <button
                  onClick={() => { setEditingTopic(null); setTopicForm({ name: "", category_id: "" }); }}
                  className="btn-secondary flex-1"
                >
                  ยกเลิก
                </button>
              )}
              <button onClick={saveTopic} disabled={saving || !topicForm.name || !topicForm.category_id} className="btn-primary flex-1">
                {saving ? "กำลังบันทึก..." : editingTopic ? "บันทึกการแก้ไข" : "เพิ่มหัวข้อ"}
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            เมื่อพนักงานเลือกหัวข้อ ระบบจะเลือกประเภทค่าใช้จ่ายให้อัตโนมัติ
          </p>

          {loading ? (
            <p className="text-slate-500 text-sm">กำลังโหลด...</p>
          ) : (
            <div className="space-y-2">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  className={`card p-4 flex items-center gap-3 ${editingTopic?.id === topic.id ? "ring-2 ring-blue-400" : ""}`}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: topic.category?.color || "#94a3b8" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{topic.name}</p>
                    <p className="text-xs text-slate-500">{topic.category?.name}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEditTopic(topic)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => deleteTopic(topic.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {topics.length === 0 && <p className="text-slate-500 text-sm text-center py-4">ยังไม่มีหัวข้อ</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
