export type UserRole = "employee" | "accounting";

export type ExpenseStatus =
  | "pending"
  | "reviewing"
  | "approved"
  | "transferred"
  | "rejected";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department?: string;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  created_at: string;
}

export interface ExpenseTopic {
  id: string;
  name: string;
  category_id: string;
  category?: ExpenseCategory;
  created_at: string;
}

export interface ExpenseRequest {
  id: string;
  employee_id: string;
  employee?: Profile;
  title: string;
  topic_id: string;
  topic?: ExpenseTopic;
  category_id: string;
  category?: ExpenseCategory;
  amount: number;
  expense_date: string;
  slip_urls?: string[];
  notes?: string;
  status: ExpenseStatus;
  reviewed_by?: string;
  reviewer?: Profile;
  reviewed_at?: string;
  transfer_slip_url?: string;
  transferred_at?: string;
  transferred_by?: string;
  transferrer?: Profile;
  transfer_note?: string;
  created_at: string;
  updated_at: string;
}
