# Vendor Selection System — Claude Code Briefing

## Project Overview

ระบบ Vendor Selection สำหรับทีม IT ของ DoHome ใช้คัดเลือก vendor โครงการต่าง ๆ
อย่างโปร่งใส มีมาตรฐาน และ audit trail ครบถ้วน

**Stack:** React + Vite + TypeScript · Zustand · Supabase (PostgreSQL + Auth + Storage) · Tailwind CSS  
**Deploy:** Vercel (auto-deploy จาก `main` branch)  
**Repo:** https://github.com/pairat3000/vendor-selection

---

## User Roles

| Role | สิทธิ์หลัก |
|------|-----------|
| `admin` | จัดการ vendor, กำหนด scorers, ตั้ง approval threshold |
| `it_user` | สร้าง selection request, กรอกคะแนน (ถ้าเป็น scorer) |
| `scorer` | กรอกคะแนน blind scoring ของตัวเอง |
| `approver` | อนุมัติ/ส่งกลับ request ที่ถึงชั้นของตน |

---

## Core Modules (4 หลัก)

### 1. Vendor Registry
- CRUD vendor พร้อม dynamic fields (EAV pattern)
- Admin approve/reject vendor ก่อนใช้งานได้
- tables: `vendors`, `vendor_fields`, `vendor_field_values`

### 2. Selection Request
- สร้าง request แบบ step-by-step (ข้อมูล → เพิ่ม vendor → scoring → approve)
- แนบ quotation files (PDF/XLSX) ต่อ vendor ผ่าน Supabase Storage
- tables: `selection_requests`, `request_vendors`

### 3. Scoring Engine (สำคัญที่สุด — ทำก่อน)
- Weighted scoring matrix: score 0-100 per criteria × vendor
- **Blind multi-scorer:** แต่ละคนกรอกแยก ไม่เห็นคะแนนกัน
- **Lock/unlock:** ผล average ปลดล็อกเมื่อ `submitted_count = active_scorer_count`
- **Scorer management:** เพิ่ม/ลบ scorer mid-process พร้อม audit log + recalc preview
- tables: `scoring_criteria`, `scorers`, `scores`, `scorer_change_log`

**สูตรคำนวณ:**
```
weighted_score(vendor, scorer) = Σ(score_i × weight_i / 100)
final_score(vendor) = avg(weighted_score) across active submitted scorers
```

### 4. Approval Workflow
- Threshold-based multi-level: <500K = 1 ชั้น, 500K-1M = 2 ชั้น, >1M = 3 ชั้น
- Status: `draft → scoring → pending_approval → approved / returned`
- tables: `approval_rules`, `approvals`

---

## Database Schema

```sql
-- Vendors
vendors (id, name, tax_id, type, address, payment_terms, contact_name, contact_email, contact_phone, status, created_by, created_at)
vendor_fields (id, field_key, field_label, field_type, is_required, sort_order)
vendor_field_values (vendor_id, field_key, value)

-- Selection
selection_requests (id, title, budget, type, deadline, description, status, owner_id, created_at)
request_vendors (id, request_id, vendor_id, quotation_url, quotation_price, payment_terms)

-- Scoring
scoring_criteria (id, request_id, name, weight)
scorers (id, request_id, user_id, is_active, submitted_at, created_at)
scores (id, scorer_id, request_id, vendor_id, criteria_id, score)
scorer_change_log (id, request_id, action, target_user_id, reason, changed_by, created_at)

-- Approval
approval_rules (id, min_budget, max_budget, approver_role, level)
approvals (id, request_id, level, approver_id, status, comment, decided_at)
```

**RLS Rules (สำคัญ):**
- `scores`: scorer อ่านเฉพาะ row ของตัวเอง — ห้าม query คนอื่นก่อน unlock
- Aggregate view ปลดล็อกผ่าน Postgres function/view เมื่อ submitted_count = active_scorer_count
- `approvals`: approver เห็นเฉพาะ level ที่ถึงคิวตัวเอง

---

## Folder Structure (แนะนำ)

```
src/
  features/
    vendors/          # Vendor Registry module
    requests/         # Selection Request module
    scoring/          # Scoring Engine module
    approvals/        # Approval Workflow module
    dashboard/        # Dashboard module
  components/         # Shared UI components
  lib/
    supabase.ts       # Supabase client
    auth.ts           # Auth helpers
  types/              # TypeScript types
  stores/             # Zustand stores
```

---

## GitHub Issues (18 tickets)

ดู issues ทั้งหมดได้ที่: https://github.com/pairat3000/vendor-selection/issues

### เริ่มได้เลย (ไม่มี blocker)
- **#1** — Project scaffold + CI/CD pipeline

### ลำดับที่แนะนำ
```
#1 scaffold → #2 schema → #3 auth
→ #4 vendor CRUD → #5 dynamic fields → #6 approve/reject
→ #7 selection request → #8 file upload
→ #9 scoring (single) → #10 multi-scorer → #11 scorer mgmt → #12 recalc
→ #13 approval config (ขนานกับ #3 ได้)
→ #14 approval workflow → #15 approver UI
→ #16 dashboard → #17 export → #18 UAT + deploy
```

---

## Development Rules

- **ใช้ TypeScript strict mode เสมอ** — ห้าม `any`
- **Supabase RLS ต้องเปิดทุก table** — ทดสอบแต่ละ role ก่อน merge
- **Soft-delete เสมอ** — ใช้ `is_active` หรือ `deleted_at` ห้ามลบข้อมูลจริง
- **Scoring lock ต้องทำผ่าน RLS / DB function** — ห้าม enforce เฉพาะ frontend
- **ทุก scorer_change_log entry ต้องมี reason** — required field
- **Test scoring formula ก่อน merge** — เป็น core logic ที่ผิดพลาดไม่ได้

---

## Environment Variables

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

ดู `.env.example` สำหรับ template ครบ

---

## Key Design Decisions

1. **Blind scoring enforce ที่ DB level** ไม่ใช่แค่ UI — ใช้ RLS + Postgres function
2. **Dynamic vendor fields ใช้ EAV** — vendor_fields + vendor_field_values
3. **Scorer removal = soft-delete** (is_active=false) ไม่ลบ scores จริง เพื่อ audit
4. **Approval threshold อ่านจาก approval_rules table** — Admin แก้ได้ไม่ต้อง redeploy
5. **File storage ใช้ Supabase Storage** — bucket per request, RLS based on request owner
