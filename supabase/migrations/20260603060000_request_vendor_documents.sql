-- รายการหัวข้อเอกสาร (admin กำหนดไว้เป็น suggestion)
CREATE TABLE document_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- เอกสารการนำเสนอต่อ vendor ต่อ request (หัวข้อ + ลิงก์)
CREATE TABLE request_vendor_documents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_vendor_id  UUID NOT NULL REFERENCES request_vendors(id) ON DELETE CASCADE,
  label              TEXT NOT NULL,
  url                TEXT NOT NULL,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rvd_request_vendor ON request_vendor_documents(request_vendor_id);

-- seed หัวข้อเริ่มต้น
INSERT INTO document_types (name, sort_order) VALUES
  ('Quotation ครั้งที่ 1', 1),
  ('Quotation ครั้งที่ 2', 2),
  ('Quotation ครั้งที่ 3', 3),
  ('Proposal', 4),
  ('Site Reference', 5),
  ('อื่นๆ', 6);

-- helper: request_id ของ request_vendor (bypass RLS)
CREATE OR REPLACE FUNCTION request_id_of_rv(p_rv UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$ SELECT request_id FROM request_vendors WHERE id = p_rv $$;

-- RLS
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_vendor_documents ENABLE ROW LEVEL SECURITY;

-- document_types: ทุกคนอ่าน, admin จัดการ
CREATE POLICY "doc_types: all read" ON document_types
  FOR SELECT USING (true);
CREATE POLICY "doc_types: admin manage" ON document_types
  FOR ALL USING (get_my_role() = 'admin');

-- request_vendor_documents
CREATE POLICY "rvd: owner/admin manage" ON request_vendor_documents
  FOR ALL USING (
    is_request_owner(request_id_of_rv(request_vendor_id)) OR get_my_role() = 'admin'
  );

CREATE POLICY "rvd: scorer read" ON request_vendor_documents
  FOR SELECT USING (is_active_scorer_of(request_id_of_rv(request_vendor_id)));

CREATE POLICY "rvd: approver read pending" ON request_vendor_documents
  FOR SELECT USING (
    get_my_role() = 'approver'
    AND EXISTS (
      SELECT 1 FROM selection_requests r
      WHERE r.id = request_id_of_rv(request_vendor_id) AND r.status = 'pending_approval'
    )
  );
