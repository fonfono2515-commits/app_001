"use client";

import * as XLSX from "xlsx-js-style";
import { formatDate, formatCurrency, formatMonthYear, STATUS_LABELS } from "@/lib/utils";
import type { ExpenseRequest } from "@/types";

export function ExportExcelButton({ requests }: { requests: ExpenseRequest[] }) {
  function exportToExcel() {
    const oldestFirst = [...requests].reverse();
    const monthTitle = `รายการสำรองจ่ายของฉัน ${formatMonthYear(new Date())}`;
    const totalAmount = requests.reduce((s, r) => s + r.amount, 0);

    const wb = XLSX.utils.book_new();
    const wsData: (string | number)[][] = [
      [monthTitle, "", "", "", ""],
      ["ลำดับ", "วันที่", "รายการ", "ประเภทค่าใช้จ่าย", "จำนวนเงิน", "สถานะ"],
      ...oldestFirst.map((r, i) => [
        i + 1,
        formatDate(r.expense_date),
        r.title,
        r.category?.name || "",
        r.amount,
        STATUS_LABELS[r.status] || r.status,
      ]),
      ["", "", "", "รวมทั้งสิ้น", totalAmount, ""],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const headerFill = { patternType: "solid", fgColor: { rgb: "E2E8F0" } };
    const border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    const cols = ["A", "B", "C", "D", "E", "F"];

    const titleCell = ws["A1"];
    if (titleCell) titleCell.s = { font: { bold: true, sz: 14, color: { rgb: "1D4ED8" } } };

    cols.forEach((c) => {
      const cell = ws[`${c}2`];
      if (cell) cell.s = { fill: headerFill, font: { bold: true }, border, alignment: { horizontal: "center" } };
    });

    oldestFirst.forEach((r, i) => {
      const row = i + 3;
      cols.forEach((c) => {
        const cell = ws[`${c}${row}`];
        if (!cell) return;
        cell.s = { border };
        if (c === "E") cell.z = "#,##0.00";
      });
    });

    const summaryRow = oldestFirst.length + 3;
    cols.forEach((c) => {
      const cell = ws[`${c}${summaryRow}`];
      if (!cell) return;
      cell.s = { font: { bold: true }, border };
      if (c === "E") cell.z = "#,##0.00";
    });

    ws["!cols"] = [{ wch: 6 }, { wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 14 }, { wch: 14 }];
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];

    XLSX.utils.book_append_sheet(wb, ws, "รายงาน");
    XLSX.writeFile(wb, `รายการสำรองจ่ายของฉัน_${formatDate(new Date())}.xlsx`);
  }

  return (
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
  );
}
