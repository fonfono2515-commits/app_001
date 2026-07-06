import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return format(new Date(date), "d MMM yyyy", { locale: th });
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), "d MMM yyyy HH:mm", { locale: th });
}

export function formatMonthYear(date: string | Date) {
  return format(new Date(date), "MMMM yyyy", { locale: th });
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(amount);
}

export const STATUS_LABELS: Record<string, string> = {
  pending: "รอตรวจสอบ",
  reviewing: "กำลังตรวจสอบ",
  approved: "อนุมัติแล้ว",
  transferred: "โอนแล้ว",
  rejected: "ปฏิเสธ",
};

export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  reviewing: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  transferred: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};
