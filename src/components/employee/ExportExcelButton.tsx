"use client";

import * as XLSX from "xlsx-js-style";
import { formatDate, formatMonthYear } from "@/lib/utils";
import type { ExpenseRequest, ExpenseStatus } from "@/types";

const STATUS_GROUPS: { statuses: ExpenseStatus[]; label: string; color: string }[] = [
  { statuses: ["transferred"], label: "โอนแล้ว", color: "1D4ED8" },
  { statuses: ["approved"], label: "อนุมัติแล้ว", color: "15803D" },
  { statuses: ["pending", "reviewing"], label: "รอตรวจสอบ", color: "B45309" },
  { statuses: ["rejected"], label: "ปฏิเสธ", color: "B91C1C" },
];

export function ExportExcelButton({ requests }: { requests: ExpenseRequest[] }) {
  function exportToExcel() {
    const monthLabel = formatMonthYear(new Date());
    const headerFill = { patternType: "solid", fgColor: { rgb: "E2E8F0" } };
    const border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    const cols = ["A", "B", "C", "D", "E", "F"];

    const wsData: (string | number)[][] = [];
    const titleRows: { row: number; color: string }[] = [];
    const headerRows: number[] = [];
    const dataRows: number[] = [];
    const summaryRows: number[] = [];

    STATUS_GROUPS.forEach((group) => {
      const items = requests.filter((r) => group.statuses.includes(r.status));
      if (items.length === 0) return;
      const oldestFirst = [...items].reverse();
      const groupTotal = items.reduce((s, r) => s + r.amount, 0);

      titleRows.push({ row: wsData.length, color: group.color });
      wsData.push([`รายการสำรองจ่ายของฉัน ${monthLabel} (${group.label})`, "", "", "", "", ""]);

      headerRows.push(wsData.length);
      wsData.push(["ลำดับ", "วันที่", "รายการ", "ประเภทค่าใช้จ่าย", "จำนวนเงิน", "วันที่โอน"]);

      oldestFirst.forEach((r, i) => {
        dataRows.push(wsData.length);
        const transferDate = r.transferred_at ? formatDate(r.transferred_at) : "-";
        wsData.push([i + 1, formatDate(r.expense_date), r.title, r.category?.name || "", r.amount, transferDate]);
      });

      summaryRows.push(wsData.length);
      wsData.push(["", "", "", "รวมทั้งสิ้น", groupTotal, ""]);

      wsData.push(["", "", "", "", "", ""]);
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

    dataRows.forEach((r) => {
      const row = r + 1;
      cols.forEach((c) => {
        const cell = ws[`${c}${row}`];
        if (!cell) return;
        cell.s = { border };
        if (c === "E") cell.z = "#,##0.00";
      });
    });

    summaryRows.forEach((r) => {
      const row = r + 1;
      cols.forEach((c) => {
        const cell = ws[`${c}${row}`];
        if (!cell) return;
        cell.s = { font: { bold: true }, border };
        if (c === "E") cell.z = "#,##0.00";
      });
    });

    ws["!cols"] = [{ wch: 6 }, { wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 14 }, { wch: 12 }];
    ws["!merges"] = titleRows.map(({ row: r }) => ({ s: { r, c: 0 }, e: { r, c: 5 } }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายงาน");
    XLSX.writeFile(wb, `รายการสำรองจ่ายของฉัน_${formatDate(new Date())}.xlsx`);
  }

  return (
    <button
      onClick={exportToExcel}
      disabled={requests.length === 0}
      className="btn-secondary flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 disabled:opacity-50"
    >
      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
      </svg>
      Export Excel
    </button>
  );
}
