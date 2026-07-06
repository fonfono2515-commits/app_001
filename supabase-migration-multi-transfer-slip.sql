-- ============================================================
-- Migration: allow multiple transfer/reimbursement slip images
-- รันไฟล์นี้ใน Supabase SQL Editor (เฉพาะฐานข้อมูลที่เคยรัน supabase-schema.sql เวอร์ชันเก่าแล้ว)
-- ============================================================

ALTER TABLE public.expense_requests ADD COLUMN IF NOT EXISTS transfer_slip_urls TEXT[];

UPDATE public.expense_requests
SET transfer_slip_urls = ARRAY[transfer_slip_url]
WHERE transfer_slip_url IS NOT NULL AND transfer_slip_urls IS NULL;

ALTER TABLE public.expense_requests DROP COLUMN IF EXISTS transfer_slip_url;
