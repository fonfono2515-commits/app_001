# ระบบสำรองจ่าย - คู่มือติดตั้ง

## ความต้องการ
- Node.js 18+
- บัญชี Supabase (supabase.com)

## ขั้นตอนการติดตั้ง

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. สร้างโปรเจกต์บน Supabase
1. ไปที่ [supabase.com](https://supabase.com) และสร้างโปรเจกต์ใหม่
2. รอให้โปรเจกต์พร้อม

### 3. รัน SQL Schema
1. ไปที่ Supabase Dashboard > SQL Editor
2. คัดลอกเนื้อหาจากไฟล์ `supabase-schema.sql` แล้ววาง
3. กด Run

### 4. ตั้งค่า Environment Variables
สร้างไฟล์ `.env.local` จาก `.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

หา keys ได้ที่: Supabase Dashboard > Settings > API

### 5. สร้างผู้ใช้แรก (Admin)
ไปที่ Supabase Dashboard > Authentication > Users > Add User
- สร้างผู้ใช้ฝ่ายบัญชีคนแรก
- จากนั้นไปที่ SQL Editor แล้วรัน:
```sql
UPDATE public.profiles SET role = 'accounting' WHERE email = 'your-accounting-email@example.com';
```

### 6. รันแอพ
```bash
npm run dev
```
เปิด http://localhost:3000

## โครงสร้างหน้าเว็บ

### พนักงาน
- `/login` — เข้าสู่ระบบ
- `/employee/dashboard` — รายการสำรองจ่ายของฉัน
- `/employee/create` — สร้างใบสำรองจ่าย
- `/employee/requests/[id]` — รายละเอียดรายการ

### ฝ่ายบัญชี
- `/accounting/dashboard` — ภาพรวม Dashboard
- `/accounting/requests` — รายการทั้งหมด (ค้นหา/กรองได้)
- `/accounting/requests/[id]` — จัดการรายการ
- `/accounting/categories` — จัดการประเภท + หัวข้อสำรองจ่าย
- `/accounting/users` — จัดการผู้ใช้

## Storage Bucket
Supabase Storage bucket ชื่อ `expense-slips` ถูกสร้างอัตโนมัติจาก SQL Schema
ถ้าไม่สำเร็จ ให้สร้างเองใน Dashboard > Storage > New Bucket ชื่อ `expense-slips` (Public)
