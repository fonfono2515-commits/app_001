import { cn, STATUS_LABELS, STATUS_COLORS } from "@/lib/utils";
import type { ExpenseStatus } from "@/types";

export function StatusBadge({ status }: { status: ExpenseStatus }) {
  return (
    <span className={cn("badge", STATUS_COLORS[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}
