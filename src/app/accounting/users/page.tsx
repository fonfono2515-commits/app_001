"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import type { Profile, UserRole } from "@/types";

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    department: "",
    role: "employee" as UserRole,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", department: "" });

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers((data as Profile[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createUser() {
    if (!form.email || !form.password || !form.full_name) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "สร้างผู้ใช้ไม่สำเร็จ");
    } else {
      setSuccess(`สร้างผู้ใช้ ${form.full_name} สำเร็จ`);
      setForm({ email: "", password: "", full_name: "", department: "", role: "employee" });
      await load();
    }
    setSaving(false);
  }

  async function updateRole(userId: string, role: UserRole) {
    const supabase = createClient();
    await supabase.from("profiles").update({ role }).eq("id", userId);
    await load();
  }

  function startEdit(u: Profile) {
    setEditingId(u.id);
    setEditForm({ full_name: u.full_name, department: u.department || "" });
  }

  async function saveEdit(userId: string) {
    if (!editForm.full_name.trim()) return;
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ full_name: editForm.full_name.trim(), department: editForm.department || null })
      .eq("id", userId);
    setEditingId(null);
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">จัดการผู้ใช้</h1>
        <p className="text-slate-500 text-sm mt-1">เพิ่มและจัดการบัญชีผู้ใช้งาน</p>
      </div>

      {/* Create User Form */}
      <div className="card p-6">
        <h2 className="font-semibold text-slate-900 mb-4">เพิ่มผู้ใช้ใหม่</h2>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">{success}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ-นามสกุล *</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              className="input-field"
              placeholder="ชื่อ นามสกุล"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">แผนก</label>
            <input
              type="text"
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              className="input-field"
              placeholder="แผนก (ไม่บังคับ)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">อีเมล *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="input-field"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">รหัสผ่าน *</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="input-field"
              placeholder="อย่างน้อย 6 ตัวอักษร"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">บทบาท *</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
              className="input-field"
            >
              <option value="employee">พนักงาน</option>
              <option value="accounting">ฝ่ายบัญชี</option>
            </select>
          </div>
        </div>
        <button
          onClick={createUser}
          disabled={saving}
          className="btn-primary mt-4"
        >
          {saving ? "กำลังสร้าง..." : "สร้างผู้ใช้"}
        </button>
      </div>

      {/* User List */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">รายชื่อผู้ใช้ทั้งหมด</h2>
        </div>
        {loading ? (
          <div className="text-center py-8 text-slate-500">กำลังโหลด...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">ชื่อ</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">อีเมล</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">แผนก</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">บทบาท</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">สร้างเมื่อ</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    {editingId === u.id ? (
                      <>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editForm.full_name}
                            onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                            className="input-field text-sm py-1"
                          />
                        </td>
                        <td className="px-4 py-3 text-slate-600">{u.email}</td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editForm.department}
                            onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
                            className="input-field text-sm py-1"
                            placeholder="แผนก"
                          />
                        </td>
                        <td className="px-4 py-3 text-slate-400">-</td>
                        <td className="px-4 py-3 text-slate-500">{formatDateTime(u.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(u.id)}
                              className="text-xs font-medium text-blue-600 hover:underline"
                            >
                              บันทึก
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-xs font-medium text-slate-500 hover:underline"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium text-slate-900 max-w-[220px] break-words">{u.full_name}</td>
                        <td className="px-4 py-3 text-slate-600">{u.email}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-[160px] break-words">{u.department || "-"}</td>
                        <td className="px-4 py-3">
                          <select
                            value={u.role}
                            onChange={(e) => updateRole(u.id, e.target.value as UserRole)}
                            className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${
                              u.role === "accounting"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            <option value="employee">พนักงาน</option>
                            <option value="accounting">ฝ่ายบัญชี</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{formatDateTime(u.created_at)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => startEdit(u)}
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            แก้ไข
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
