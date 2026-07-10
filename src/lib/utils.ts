import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const BANGKOK_TZ = "Asia/Bangkok";
const BANGKOK_LOCALE = "th-TH-u-ca-gregory";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isPdfUrl(url: string) {
  return url.toLowerCase().split("?")[0].endsWith(".pdf");
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat(BANGKOK_LOCALE, {
    timeZone: BANGKOK_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date) {
  const time = new Intl.DateTimeFormat(BANGKOK_LOCALE, {
    timeZone: BANGKOK_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(date));
  return `${formatDate(date)} ${time} น.`;
}

export function formatMonthYear(date: string | Date) {
  return new Intl.DateTimeFormat(BANGKOK_LOCALE, {
    timeZone: BANGKOK_TZ,
    month: "long",
    year: "numeric",
  }).format(new Date(date));
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
