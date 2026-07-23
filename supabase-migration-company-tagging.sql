-- ============================================================
-- Migration: tag expense requests with company (ODF / TR)
-- รันไฟล์นี้ใน Supabase SQL Editor (เฉพาะฐานข้อมูลที่เคยรัน supabase-schema.sql เวอร์ชันเก่าแล้ว)
-- ============================================================

ALTER TABLE public.expense_requests ADD COLUMN IF NOT EXISTS company TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expense_requests_company_check'
  ) THEN
    ALTER TABLE public.expense_requests
      ADD CONSTRAINT expense_requests_company_check CHECK (company IN ('ODF', 'TR'));
  END IF;
END $$;
