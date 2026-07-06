"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatCurrency } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ExpenseRequest, ExpenseCategory } from "@/types";

const STATUS_OPTIONS = [
  { value: "", label: "ทุกสถานะ" },
  { value: "pending", label: "รอตรวจสอบ" },
  { value: "reviewing", label: "กำลังตรวจสอบ" },
  { value: "approved", label: "อนุมัติแล้ว" },
  { value: "transferred", label: "โอนแล้ว" },
  { value: "rejected", label: "ปฏิเสธ" },
];

export default function AccountingRequestsPage() {
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    category_id: "",
    date_from: "",
    date_to: "",
  });

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("expense_requests")
      .select(`*, employee:profiles!employee_id(full_name, department), category:expense_categories(name, color), topic:expense_topics(name), transferrer:profiles!transferred_by(full_name)`)
      .order("created_at", { ascending: false });

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.category_id) query = query.eq("category_id", filters.category_id);
    if (filters.date_from) query = query.gte("expense_date", filters.date_from);
    if (filters.date_to) query = query.lte("expense_date", filters.date_to);
    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,employee.full_name.ilike.%${filters.search}%`
      );
    }

    const { data } = await query;
    setRequests((data as ExpenseRequest[]) || []);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    async function loadCategories() {
      const supabase = createClient();
      const { data } = await supabase.from("expense_categories").select("*").order("name");
      setCategories((data as ExpenseCategory[]) || []);
    }
    loadCategories();
  }, []);

  const totalAmount = requests.reduce((s, r) => s + r.amount, 0);

  function csvEscape(value: string) {
    if (/[",\n]/.test(value)) return '"' + value.replace(/"/g, '""') + '"';
    return value;
  }

  function exportToExcel() {
    const header = ["วันที่", "ผู้โอน", "รายการ", "ประเภทค่าใช้จ่าย", "จำนวนเงินรวม"];
    const rows = requests.map((r) => [
      r.transferred_at ? formatDate(r.transferred_at) : formatDate(r.expense_date),
      r.transferrer?.full_name || "",
      r.title,
      r.category?.name || "",
      String(r.amount),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `รายงานสำรองจ่าย_${formatDate(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">รายการสำรองจ่ายทั้งหมด</h1>
        <p className="text-slate-500 text-sm mt-1">จัดการและตรวจสอบรายการสำรองจ่ายของพนักงาน</p>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="ค้นหา หัวข้อ หรือ ชื่อพนักงาน..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="input-field flex-1 min-w-[200px]"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="input-field w-40"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={filters.category_id}
            onChange={(e) => setFilters((f) => ({ ...f, category_id: e.target.value }))}
            className="input-field w-44"
          >
            <option value="">ทุกประเภท</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>วันที่:</span>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
              className="input-field w-36"
            />
            <span>ถึง</span>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
              className="input-field w-36"
            />
          </div>
          <button
            onClick={() => setFilters({ search: "", status: "", category_id: "", date_from: "", date_to: "" })}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            ล้างตัวกรอง
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>พบ {requests.length} รายการ</span>
        <div className="flex items-center gap-4">
          <span className="font-semibold">รวม: {formatCurrency(totalAmount)}</span>
          <button
            onClick={exportToExcel}
            disabled={requests.length === 0}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-500">กำลังโหลด...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-slate-500">ไม่พบรายการที่ค้นหา</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">หัวข้อ</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">พนักงาน</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">ประเภท</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">วันที่</th>
                  <th className="text-right px-4 py-3 text-slate-600 font-medium">จำนวน</th>
                  <th className="text-center px-4 py-3 text-slate-600 font-medium">สถานะ</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{req.title}</p>
                      <p className="text-xs text-slate-500">{req.topic?.name}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{req.employee?.full_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: req.category?.color || "#94a3b8" }}
                        />
                        <span className="text-slate-700">{req.category?.name || "-"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(req.expense_date)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatCurrency(req.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/accounting/requests/${req.id}`}
                        className="text-blue-600 hover:underline text-xs font-medium"
                      >
                        จัดการ
                      </Link>
                    </td>
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
