import { cn, formatDate, formatDateTime, formatCurrency, STATUS_LABELS, STATUS_COLORS } from "../utils";

describe("cn", () => {
  it("รวม class ปกติได้", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("ตัด Tailwind class ที่ขัดแย้งกัน", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("ข้ามค่า falsy", () => {
    expect(cn("foo", false && "bar", undefined, null, "baz")).toBe("foo baz");
  });
});

describe("formatDate", () => {
  it("แปลงวันที่เป็นรูปแบบไทย", () => {
    const result = formatDate("2024-06-25");
    expect(result).toMatch(/25/);
    expect(result).toMatch(/2567|2024/);
  });

  it("รับ Date object ได้", () => {
    const result = formatDate(new Date("2024-01-01"));
    expect(result).toMatch(/1/);
  });
});

describe("formatDateTime", () => {
  it("มีทั้งวันที่และเวลา", () => {
    const result = formatDateTime("2024-06-25T14:30:00");
    expect(result).toMatch(/14:30/);
  });
});

describe("formatCurrency", () => {
  it("แสดงสกุลเงินบาท", () => {
    const result = formatCurrency(1000);
    expect(result).toContain("1,000");
    expect(result).toMatch(/฿|THB/);
  });

  it("มีทศนิยม 2 ตำแหน่ง", () => {
    const result = formatCurrency(500);
    expect(result).toMatch(/\.00/);
  });

  it("จัดการตัวเลข 0", () => {
    const result = formatCurrency(0);
    expect(result).toMatch(/0\.00/);
  });
});

describe("STATUS_LABELS", () => {
  it("มีป้ายกำกับครบทุกสถานะ", () => {
    expect(STATUS_LABELS.pending).toBe("รอตรวจสอบ");
    expect(STATUS_LABELS.reviewing).toBe("กำลังตรวจสอบ");
    expect(STATUS_LABELS.approved).toBe("อนุมัติแล้ว");
    expect(STATUS_LABELS.transferred).toBe("โอนแล้ว");
    expect(STATUS_LABELS.rejected).toBe("ปฏิเสธ");
  });
});

describe("STATUS_COLORS", () => {
  it("มีสีครบทุกสถานะ", () => {
    const statuses = ["pending", "reviewing", "approved", "transferred", "rejected"];
    statuses.forEach((s) => {
      expect(STATUS_COLORS[s]).toBeTruthy();
    });
  });
});
