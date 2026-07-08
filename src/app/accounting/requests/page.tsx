"use client";

import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx-js-style";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatCurrency, formatMonthYear } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ExpenseRequest, ExpenseCategory, ExpenseStatus } from "@/types";

const ACTIVE_STATUS_OPTIONS = [
  { value: "", label: "ทุกสถานะ" },
  { value: "pending", label: "รอตรวจสอบ" },
  { value: "reviewing", label: "กำลังตรวจสอบ" },
  { value: "approved", label: "อนุมัติแล้ว" },
  { value: "rejected", label: "ปฏิเสธ" },
];

const EXPORT_STATUS_GROUPS: { statuses: ExpenseStatus[]; label: string; color: string }[] = [
  { statuses: ["transferred"], label: "โอนแล้ว", color: "1D4ED8" },
  { statuses: ["approved"], label: "อนุมัติแล้ว", color: "15803D" },
  { statuses: ["pending", "reviewing"], label: "รอตรวจสอบ", color: "B45309" },
  { statuses: ["rejected"], label: "ปฏิเสธ", color: "B91C1C" },
];

export default function AccountingRequestsPage() {
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<"active" | "transferred">("active");
  const [transferredView, setTransferredView] = useState<"recent" | "archived">("recent");

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

    if (mainTab === "transferred") {
      query = query.eq("status", "transferred");
      query = transferredView === "archived"
        ? query.not("archived_at", "is", null)
        : query.is("archived_at", null);
    } else {
      query = query.neq("status", "transferred");
      if (filters.status) query = query.eq("status", filters.status);
    }
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
  }, [filters, mainTab, transferredView]);

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

  async function exportToExcel() {
    const supabase = createClient();
    let query = supabase
      .from("expense_requests")
      .select(`*, employee:profiles!employee_id(full_name, department), category:expense_categories(name, color), topic:expense_topics(name), transferrer:profiles!transferred_by(full_name)`)
      .order("created_at", { ascending: false });

    if (filters.category_id) query = query.eq("category_id", filters.category_id);
    if (filters.date_from) query = query.gte("expense_date", filters.date_from);
    if (filters.date_to) query = query.lte("expense_date", filters.date_to);
    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,employee.full_name.ilike.%${filters.search}%`
      );
    }

    const { data } = await query;
    const allRequests = (data as ExpenseRequest[]) || [];
    const monthLabel = formatMonthYear(new Date());

    const employeePalette = [
      "DC2626", "2563EB", "16A34A", "D97706", "9333EA",
      "0891B2", "DB2777", "65A30D", "EA580C", "7C3AED",
    ];
    const uniqueEmployees = Array.from(new Set(allRequests.map((r) => r.employee?.full_name || "")));
    const employeeColorMap: Record<string, string> = {};
    uniqueEmployees.forEach((name, idx) => {
      employeeColorMap[name] = employeePalette[idx % employeePalette.length];
    });

    const headerFill = { patternType: "solid", fgColor: { rgb: "E2E8F0" } };
    const border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    const cols = ["A", "B", "C", "D", "E", "F", "G"];

    const wsData: (string | number)[][] = [];
    const titleRows: { row: number; color: string }[] = [];
    const headerRows: number[] = [];
    const dataRows: { row: number; empName: string }[] = [];
    const summaryRows: number[] = [];

    EXPORT_STATUS_GROUPS.forEach((group) => {
      const items = allRequests.filter((r) => group.statuses.includes(r.status));
      if (items.length === 0) return;
      const oldestFirst = [...items].reverse();
      const groupTotal = items.reduce((s, r) => s + r.amount, 0);

      titleRows.push({ row: wsData.length, color: group.color });
      wsData.push([`สรุปข้อมูลสำรองจ่ายประจำเดือน ${monthLabel} (${group.label})`, "", "", "", "", "", ""]);

      headerRows.push(wsData.length);
      wsData.push(["ลำดับ", "วันที่", "วันที่โอน", "พนักงาน", "รายการ", "ประเภทค่าใช้จ่าย", "จำนวนเงินรวม"]);

      oldestFirst.forEach((r, i) => {
        dataRows.push({ row: wsData.length, empName: r.employee?.full_name || "" });
        const transferDate = r.transferred_at ? formatDate(r.transferred_at) : "-";
        wsData.push([i + 1, formatDate(r.expense_date), transferDate, r.employee?.full_name || "", r.title, r.category?.name || "", r.amount]);
      });

      summaryRows.push(wsData.length);
      wsData.push(["", "", "", "", "", "รวมทั้งสิ้น", groupTotal]);

      wsData.push(["", "", "", "", "", "", ""]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    titleRows.forEach(({ row: r, color }) => {
      const row = r + 1;
      const cell = ws[`A${row}`];
      if (cell) cell.s = { font: { bold: true, sz: 13, color: { rgb: color } } };
    });

    headerRows.forEach((r) => {
      const row = r + 1;
      cols.forEach((c) => {
        const cell = ws[`${c}${row}`];
        if (cell) cell.s = { fill: headerFill, font: { bold: true }, border, alignment: { horizontal: "center" } };
      });
    });

    dataRows.forEach(({ row: r, empName }) => {
      const row = r + 1;
      const empColor = employeeColorMap[empName];
      cols.forEach((c) => {
        const cell = ws[`${c}${row}`];
        if (!cell) return;
        cell.s = c === "D"
          ? { font: { bold: true, color: { rgb: empColor } }, border }
          : { border };
        if (c === "G") cell.z = "#,##0.00";
      });
    });

    summaryRows.forEach((r) => {
      const row = r + 1;
      cols.forEach((c) => {
        const cell = ws[`${c}${row}`];
        if (!cell) return;
        cell.s = { font: { bold: true }, border };
        if (c === "G") cell.z = "#,##0.00";
      });
    });

    ws["!cols"] = [{ wch: 6 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 40 }, { wch: 20 }, { wch: 14 }];
    ws["!merges"] = titleRows.map(({ row: r }) => ({ s: { r, c: 0 }, e: { r, c: 6 } }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายงาน");
    XLSX.writeFile(wb, `รายงานสำรองจ่าย_${formatDate(new Date())}.xlsx`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">รายการสำรองจ่ายทั้งหมด</h1>
        <p className="text-slate-500 text-sm mt-1">จัดการและตรวจสอบรายการสำรองจ่ายของพนักงาน</p>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setMainTab("active")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            mainTab === "active"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          ยังไม่โอน
        </button>
        <button
          onClick={() => setMainTab("transferred")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            mainTab === "transferred"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          โอนแล้ว
        </button>
      </div>

      {mainTab === "transferred" && (
        <div className="flex gap-2">
          <button
            onClick={() => setTransferredView("recent")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              transferredView === "recent"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            รายการล่าสุด
          </button>
          <button
            onClick={() => setTransferredView("archived")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              transferredView === "archived"
                ? "bg-violet-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            จัดเก็บ
          </button>
        </div>
      )}

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
          {mainTab === "active" && (
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="input-field w-40"
            >
              {ACTIVE_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
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
            className="btn-secondary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export Excel (ทั้งหมด)
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
                  <tr key={req.id} className={`transition-colors ${req.status === "transferred" ? "bg-violet-50 hover:bg-violet-100" : "hover:bg-slate-50"}`}>
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
