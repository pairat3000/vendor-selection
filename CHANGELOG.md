# Changelog

All notable changes to Vendor Selection are documented here.

---

## [1.2.1] — 2026-06-03

### เพิ่ม / ปรับ
- เพิ่ม **logo ระบบ** (SVG): favicon, sidebar, หน้า login
- หลัง login ทุก role เข้าหน้า **Dashboard** เป็นหน้าแรก (เดิม admin ไป Approval Rules)

---

## [1.2.0] — 2026-06-03

ยกเครื่อง UX การให้คะแนน + ภาพสรุปการตัดสินใจ + จัดการเอกสาร/โปรเจกต์

### เพิ่มใหม่
- **Scoring UI ใหม่ — Matrix Heatmap**: ตารางเดียวเห็นทุก vendor × ทุกหัวข้อ, ช่องคะแนนเป็นแถบเติมสี (fill bar) คลิก/ลากปรับได้, จัดกลุ่มตามหมวด, แถวรวมถ่วงน้ำหนัก + ไฮไลต์ผู้นำ, header/คอลัมน์แรก sticky
- **Executive Summary** (แท็บผลรวม): กล่องแนะนำ vendor + margin, KPI cards, กราฟเทียบคะแนน, ตารางผู้นำรายหมวด, ราคา/ความคุ้มค่า — สำหรับนำเสนอ EXCOM
- **Compare Dashboard** (หน้าอนุมัติ): ตารางเทียบ vendor (คะแนน/ราคา/ความคุ้มค่า/รายหมวด) ไฮไลต์ตัวที่ดีที่สุด
- **เอกสารการนำเสนอ per-project**: แนบหลายชิ้นต่อ vendor ต่อ request เป็นลิงก์ + หัวข้อ (admin กำหนด list หัวข้อได้ที่ /admin/document-types); แสดงให้ scorer/approver เปิดดูในหน้า scoring + อนุมัติ
- **จัดการ vendor จากหน้า request detail**: เพิ่ม/ลบ vendor, แก้ราคา quotation, แนบไฟล์ — ไม่ต้องผ่าน wizard
- **ลบ/กู้คืนโปรเจกต์ (soft-delete)**: ลบ project ที่ไม่ใช้ (ซ่อนทุกหน้า) + หน้า "คลังที่ลบแล้ว" (/requests/archived) พร้อมปุ่มกู้คืน

### ปรับปรุง / แก้บั๊ก
- ตาราง scoring คงที่ขณะแก้คะแนน (table-fixed) ไม่หด-ขยาย
- status ความครบของการให้คะแนน + บล็อก submit จนกรอกครบ (จากชุด v1.1)
- DB: scoring_categories, request_vendor_documents, document_types,
  get_criteria_avg_scores(); RLS ให้ scorer/approver อ่านข้อมูลที่จำเป็น

---

## [1.1.0] — 2026-06-02

ปรับปรุงและเพิ่มฟีเจอร์หลัง v1.0.0 จากการใช้งานจริง (UAT)

### เพิ่มใหม่
- **User Management** (`/admin/users`): admin สร้าง/แก้ role/รีเซ็ตรหัส/เปิด-ปิด/ลบผู้ใช้ได้ในแอป ผ่าน Edge Function `admin-users` (service_role, ตรวจสิทธิ์ admin) — ไม่ต้องเข้า Supabase dashboard
- **คำอธิบายสิทธิ์แต่ละ role** ในฟอร์มเพิ่มผู้ใช้
- **หมวดหมู่หลักของเกณฑ์ให้คะแนน** (2 ระดับ): `scoring_categories` + `scoring_criteria.category_id`/`description` — สูตรคำนวณไม่เปลี่ยน
- **เลือก scorer จาก dropdown** รายชื่อผู้ใช้ แทนการพิมพ์ UUID
- **Compare Dashboard** ในหน้าอนุมัติ: ตารางเทียบ vendor (คะแนนรวม/ราคา/ความคุ้มค่า/คะแนนรายหมวด) ไฮไลต์ตัวที่ดีที่สุด — `get_criteria_avg_scores()` + RLS ให้ approver อ่านได้
- **แก้ราคา/quotation จากหน้า request detail** (owner/admin) — ไม่ต้องผ่าน wizard

### ปรับปรุง
- **UI กรอกคะแนนใหม่**: vendor selector pills, ช่องพิมพ์ตัวเลข + ปุ่ม ±, คะแนนถ่วงน้ำหนักต่อหมวด, สีบอกระดับ
- **Status ความครบของการให้คะแนน**: progress bar + บล็อก submit จนกว่าจะกรอกครบทุก vendor × ทุกหัวข้อ (แยก "ยังไม่กรอก" จาก "ให้ 0")
- **Approval Rules แบบ assign user**: เลือกผู้อนุมัติเฉพาะคนต่อ level (เดิมเป็น role)
- **Approval Overview** (`/admin/approvals`): ภาพรวมการอนุมัติทุก request ทุก level
- เก็บ Supabase migrations ทั้งหมดลง repo (`supabase/migrations/`)
- CI: bump `actions/checkout`/`setup-node` → v5

### แก้บั๊ก
- **Deactivate ผู้ใช้ใช้งานได้จริง**: ban auth user (login ไม่ได้) + เด้ง session ที่ค้าง
- **Resubmit หลังส่งกลับ**: `create_approval_records` ลบ approval ทุกแถวก่อนสร้างรอบใหม่ (เดิมลบแค่ pending → approve ไม่ผ่าน)
- **`process_approval` ตรวจสิทธิ์**: เฉพาะผู้ถูก assign หรือ admin เท่านั้น
- RLS infinite recursion (SECURITY DEFINER helpers), `scores.vendor_id` FK, scorer submit policy, ภาษาไทยใน PDF export (html2canvas + Sarabun), GitHub Pages SPA 404

---

## [1.0.0] — 2026-06-01

### Phase 0 — Foundation
- **#1** Project scaffold: Vite + React 18 + TypeScript strict, Tailwind CSS, Zustand, Supabase JS, React Router v6, GitHub Actions CI/CD → GitHub Pages
- **#2** Supabase schema: 12 tables, RLS policies per role, scoring functions (`is_scoring_unlocked`, `get_final_scores`), trigger auto-create profiles
- **#3** Auth + role-based routing: Supabase Auth, `ProtectedRoute`, `AppLayout` sidebar with role-filtered nav, session persistence

### Phase 1 — Vendor Registry
- **#4** Vendor CRUD: list (search/filter), add/edit forms, detail page with status badge
- **#5** Dynamic fields (EAV): Admin manages custom fields (text/number/date/boolean), rendered in vendor forms, saved to `vendor_field_values`
- **#6** Vendor approve/reject: Admin approves with one click or rejects with modal + required reason, audit trail displayed in-page

### Phase 2 — Selection Request
- **#7** Selection Request wizard: 2-step (project info → vendors), draft auto-save, request list with status badges
- **#8** Quotation file upload: PDF/XLSX up to 10 MB via Supabase Storage, download via signed URL, delete, RLS per request owner

### Phase 3 — Scoring Engine
- **#9** Scoring matrix UI: criteria editor with weight%, slider 0-100 per vendor×criteria, real-time weighted score
- **#10** Multi-scorer blind scoring: each scorer sees only own scores (RLS), results locked until all submit, final score = avg weighted scores
- **#11** Scorer management: add/remove/restore scorers with mandatory reason, `scorer_change_log` audit trail
- **#12** Recalculation preview: removing a submitted scorer shows before/after vendor scores in modal

### Phase 4 — Approval Workflow
- **#13** Approval threshold config: Admin sets min/max budget + level rules, stored in `approval_rules` table
- **#14** Multi-level approval workflow: `create_approval_records()` creates levels per budget, `process_approval()` enforces sequential levels, status transitions
- **#15** Approver UI: pending approvals dashboard, detail page with scoring summary + timeline, approve (optional comment) / return (required comment)

### Phase 5 — Dashboard & Export
- **#16** Dashboard: stat cards (vendors, open requests, approval rate, pending actions), request list with filter + highlight action items
- **#17** Scoring report export: XLSX (3 sheets: Summary, Criteria Detail, Per-Scorer Breakdown) + PDF with auto-table, filename `{project}-scoring-report-{date}`
- **#18** UAT + v1.0.0 production deploy: GitHub Pages at `https://pairat3000.github.io/vendor-selection/`

### Security
- RLS enabled on all 12 tables
- Blind scoring enforced at DB level (RLS on `scores` table)
- Supabase Storage bucket with RLS per request owner
- Approval sequential level enforcement via Postgres function with row-level lock

---

## Production URL
**https://pairat3000.github.io/vendor-selection/**
