import { render, screen } from "@testing-library/react";
import { StatusBadge } from "../StatusBadge";

describe("StatusBadge", () => {
  it("แสดงข้อความสถานะภาษาไทย", () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText("รอตรวจสอบ")).toBeInTheDocument();
  });

  it("แสดงสถานะ approved", () => {
    render(<StatusBadge status="approved" />);
    expect(screen.getByText("อนุมัติแล้ว")).toBeInTheDocument();
  });

  it("แสดงสถานะ rejected", () => {
    render(<StatusBadge status="rejected" />);
    expect(screen.getByText("ปฏิเสธ")).toBeInTheDocument();
  });

  it("แสดงสถานะ transferred", () => {
    render(<StatusBadge status="transferred" />);
    expect(screen.getByText("โอนแล้ว")).toBeInTheDocument();
  });

  it("แสดงสถานะ reviewing", () => {
    render(<StatusBadge status="reviewing" />);
    expect(screen.getByText("กำลังตรวจสอบ")).toBeInTheDocument();
  });
});
