# Supabase — Database Migrations

Schema, RLS policies, functions, และ seed data ทั้งหมดของโปรเจกต์ถูก track เป็นไฟล์ `.sql`
ใน `migrations/` ตามรูปแบบ Supabase CLI: `<timestamp>_<name>.sql`

**Project ref:** `ivkbazkqitckemtjwoml` (region: ap-southeast-1)

## ลำดับ migration

| # | ไฟล์ | สรุป |
|---|------|------|
| 1 | `..110148_create_all_tables` | 12 tables + enums + indexes |
| 2 | `..110221_enable_rls_and_policies` | เปิด RLS + policies ทุก table + `get_my_role()` |
| 3 | `..110245_scoring_functions_and_views` | `is_scoring_unlocked`, `get_final_scores`, view, signup trigger, default rules |
| 4 | `..110309_seed_dev_data` | dynamic fields + 3 sample vendors |
| 5 | `..054705_fix_profiles_rls_and_trigger` | แก้ trigger ให้ bypass RLS ตอน signup |
| 6 | `..071543_fix_vendor_rls_read_own_pending` | creator อ่าน vendor ของตัวเองได้ |
| 7 | `..082645_fix_vendor_field_values_rls` | upsert/update field values |
| 8 | `..085611_create_quotation_storage_bucket` | storage bucket + RLS (PDF/XLSX, 10MB) |
| 9 | `..093258_approval_workflow_functions` | `create_approval_records`, `process_approval` |
| 10 | `..102727_fix_rls_infinite_recursion` | SECURITY DEFINER helpers ตัด circular RLS |
| 11 | `..105001_fix_scorer_submit_policy` | scorer update submitted_at + scores ของตัวเอง |
| 12 | `..105733_fix_scores_vendor_id_fk` | `scores.vendor_id` FK → `vendors(id)` |
| 13 | `..135946_add_approver_id_to_approval_rules` | assign user เฉพาะคนต่อ rule |
| 14 | `..142256_enforce_approver_assignment_in_process_approval` | บังคับสิทธิ์ผู้อนุมัติใน process_approval |

## วิธีใช้กับ Supabase CLI

```bash
# เชื่อมกับ remote project
supabase link --project-ref ivkbazkqitckemtjwoml

# ดูสถานะ migration ที่ apply แล้ว vs ใน repo
supabase migration list

# push migration ใหม่ขึ้น remote
supabase db push

# (local dev) รัน stack ทั้งหมด + apply migrations
supabase start
```

## เพิ่ม migration ใหม่

```bash
supabase migration new <ชื่อ_snake_case>
# แก้ไฟล์ .sql ที่สร้างใน migrations/ แล้ว
supabase db push
```

> ไฟล์เหล่านี้เป็น single source of truth ของ schema — แก้ schema ผ่าน migration ไฟล์เสมอ
> อย่าแก้ผ่าน dashboard โดยตรงโดยไม่บันทึกลง migration
