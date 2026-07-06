-- ============================================================
-- Migration: allow multiple slip images per expense request
-- รันไฟล์นี้ใน Supabase SQL Editor (เฉพาะฐานข้อมูลที่เคยรัน supabase-schema.sql เวอร์ชันเก่าแล้ว)
-- ============================================================

ALTER TABLE public.expense_requests ADD COLUMN IF NOT EXISTS slip_urls TEXT[];

UPDATE public.expense_requests
SET slip_urls = ARRAY[slip_url]
WHERE slip_url IS NOT NULL AND slip_urls IS NULL;

ALTER TABLE public.expense_requests DROP COLUMN IF EXISTS slip_url;
