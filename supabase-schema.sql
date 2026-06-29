-- ============================================================
-- EXPENSE REIMBURSEMENT SYSTEM - Supabase Schema
-- รันไฟล์นี้ใน Supabase SQL Editor
-- ============================================================

-- 1. Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('employee', 'accounting')) DEFAULT 'employee',
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, department)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
    NEW.raw_user_meta_data->>'department'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Expense Categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Expense Topics (linked to categories)
CREATE TABLE IF NOT EXISTS public.expense_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Expense Requests
CREATE TABLE IF NOT EXISTS public.expense_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic_id UUID REFERENCES public.expense_topics(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL,
  slip_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewing', 'approved', 'transferred', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  transfer_slip_url TEXT,
  transferred_at TIMESTAMPTZ,
  transferred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  transfer_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_expense_requests_updated ON public.expense_requests;
CREATE TRIGGER on_expense_requests_updated
  BEFORE UPDATE ON public.expense_requests
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_requests ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read all profiles" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow accounting to update any profile (for role management)
CREATE POLICY "Accounting can update any profile" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'accounting'
    )
  );

-- Categories policies (all authenticated users can read, only accounting can write)
CREATE POLICY "All can read categories" ON public.expense_categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Accounting can manage categories" ON public.expense_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'accounting'
    )
  );

-- Topics policies
CREATE POLICY "All can read topics" ON public.expense_topics
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Accounting can manage topics" ON public.expense_topics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'accounting'
    )
  );

-- Expense requests policies
CREATE POLICY "Employees can read own requests" ON public.expense_requests
  FOR SELECT USING (auth.uid() = employee_id);

CREATE POLICY "Employees can insert own requests" ON public.expense_requests
  FOR INSERT WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Accounting can read all requests" ON public.expense_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'accounting'
    )
  );

CREATE POLICY "Accounting can update all requests" ON public.expense_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'accounting'
    )
  );

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
-- รันคำสั่งนี้ใน Supabase Dashboard > Storage > New Bucket
-- ชื่อ: expense-slips, Public: true

INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-slips', 'expense-slips', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'expense-slips' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Anyone can read expense slips" ON storage.objects
  FOR SELECT USING (bucket_id = 'expense-slips');

-- ============================================================
-- SEED DATA (ตัวอย่าง)
-- ============================================================
INSERT INTO public.expense_categories (name, description, color) VALUES
  ('ค่าเดินทาง', 'ค่าใช้จ่ายด้านการเดินทาง', '#3b82f6'),
  ('ค่าอาหาร', 'ค่าอาหารและเครื่องดื่ม', '#f59e0b'),
  ('ค่าที่พัก', 'ค่าโรงแรมและที่พัก', '#8b5cf6'),
  ('ค่าสาธารณูปโภค', 'ค่าน้ำ ค่าไฟ อินเทอร์เน็ต', '#10b981'),
  ('ค่าอุปกรณ์สำนักงาน', 'ซื้ออุปกรณ์ เครื่องเขียน', '#ef4444'),
  ('ค่าอื่นๆ', 'ค่าใช้จ่ายเบ็ดเตล็ด', '#6366f1')
ON CONFLICT DO NOTHING;

-- ตัวอย่างหัวข้อ (ต้องรันหลัง insert categories)
DO $$
DECLARE
  travel_id UUID;
  food_id UUID;
  hotel_id UUID;
  utility_id UUID;
  office_id UUID;
  other_id UUID;
BEGIN
  SELECT id INTO travel_id FROM public.expense_categories WHERE name = 'ค่าเดินทาง';
  SELECT id INTO food_id FROM public.expense_categories WHERE name = 'ค่าอาหาร';
  SELECT id INTO hotel_id FROM public.expense_categories WHERE name = 'ค่าที่พัก';
  SELECT id INTO utility_id FROM public.expense_categories WHERE name = 'ค่าสาธารณูปโภค';
  SELECT id INTO office_id FROM public.expense_categories WHERE name = 'ค่าอุปกรณ์สำนักงาน';
  SELECT id INTO other_id FROM public.expense_categories WHERE name = 'ค่าอื่นๆ';

  INSERT INTO public.expense_topics (name, category_id) VALUES
    ('ค่าน้ำมัน', travel_id),
    ('ค่าแท็กซี่/Grab', travel_id),
    ('ค่าตั๋วเครื่องบิน', travel_id),
    ('ค่ารถไฟ/รถบัส', travel_id),
    ('ค่าอาหารกลางวัน', food_id),
    ('ค่าอาหารเลี้ยงลูกค้า', food_id),
    ('ค่าโรงแรม', hotel_id),
    ('ค่าเน็ต/โทรศัพท์', utility_id),
    ('ค่าเครื่องเขียน', office_id),
    ('ค่าซ่อมอุปกรณ์', office_id),
    ('ค่าใช้จ่ายอื่นๆ', other_id)
  ON CONFLICT DO NOTHING;
END $$;
