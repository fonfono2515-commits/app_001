-- ============================================================
-- Migration: track archiving of transferred requests
-- รันไฟล์นี้ใน Supabase SQL Editor (เฉพาะฐานข้อมูลที่เคยรัน supabase-schema.sql เวอร์ชันเก่าแล้ว)
-- ============================================================

ALTER TABLE public.expense_requests ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.expense_requests ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
