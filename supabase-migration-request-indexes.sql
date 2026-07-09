-- ============================================================
-- Migration: add indexes for expense_requests lookups
-- รันไฟล์นี้ใน Supabase SQL Editor
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_expense_requests_employee_id ON public.expense_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_requests_status ON public.expense_requests(status);
CREATE INDEX IF NOT EXISTS idx_expense_requests_created_at ON public.expense_requests(created_at DESC);
