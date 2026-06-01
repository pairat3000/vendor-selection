# Changelog

All notable changes to Vendor Selection v1.0.0 are documented here.

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
