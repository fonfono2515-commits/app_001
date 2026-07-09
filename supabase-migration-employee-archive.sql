-- ============================================================
-- Migration: let employees archive their own transferred requests
-- รันไฟล์นี้ใน Supabase SQL Editor
-- ============================================================

CREATE POLICY "Employees can archive own transferred requests" ON public.expense_requests
  FOR UPDATE USING (
    auth.uid() = employee_id AND status = 'transferred'
  );
