-- =========================================
-- ENABLE RLS ON ALL TABLES
-- =========================================
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors             ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_fields       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE selection_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_vendors     ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_criteria    ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores              ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorer_change_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_rules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals           ENABLE ROW LEVEL SECURITY;

-- =========================================
-- HELPER FUNCTION: get current user role
-- =========================================
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- =========================================
-- PROFILES
-- =========================================
CREATE POLICY "profiles: read own" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles: admin read all" ON profiles
  FOR SELECT USING (get_my_role() = 'admin');

CREATE POLICY "profiles: insert own on signup" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: update own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- =========================================
-- VENDORS
-- =========================================
CREATE POLICY "vendors: all can read approved" ON vendors
  FOR SELECT USING (status = 'approved' AND is_active = true);

CREATE POLICY "vendors: admin full access" ON vendors
  FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "vendors: it_user can create" ON vendors
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'it_user'));

CREATE POLICY "vendors: owner can update pending" ON vendors
  FOR UPDATE USING (created_by = auth.uid() AND status = 'pending');

-- =========================================
-- VENDOR FIELDS & VALUES
-- =========================================
CREATE POLICY "vendor_fields: all can read" ON vendor_fields
  FOR SELECT USING (true);

CREATE POLICY "vendor_fields: admin manage" ON vendor_fields
  FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "vendor_field_values: read approved vendor" ON vendor_field_values
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM vendors v
      WHERE v.id = vendor_id AND v.status = 'approved' AND v.is_active = true
    )
    OR get_my_role() = 'admin'
  );

CREATE POLICY "vendor_field_values: manage own vendor" ON vendor_field_values
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM vendors v
      WHERE v.id = vendor_id AND (v.created_by = auth.uid() OR get_my_role() = 'admin')
    )
  );

-- =========================================
-- SELECTION REQUESTS
-- =========================================
CREATE POLICY "requests: owner full access" ON selection_requests
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "requests: admin full access" ON selection_requests
  FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "requests: scorer can read assigned" ON selection_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scorers s
      WHERE s.request_id = id AND s.user_id = auth.uid() AND s.is_active = true
    )
  );

CREATE POLICY "requests: approver can read pending" ON selection_requests
  FOR SELECT USING (
    get_my_role() = 'approver'
    AND status = 'pending_approval'
  );

-- =========================================
-- REQUEST VENDORS
-- =========================================
CREATE POLICY "request_vendors: request owner access" ON request_vendors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM selection_requests r
      WHERE r.id = request_id AND r.owner_id = auth.uid()
    )
    OR get_my_role() = 'admin'
  );

CREATE POLICY "request_vendors: scorer can read" ON request_vendors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scorers s
      WHERE s.request_id = request_id AND s.user_id = auth.uid() AND s.is_active = true
    )
  );

CREATE POLICY "request_vendors: approver can read" ON request_vendors
  FOR SELECT USING (
    get_my_role() = 'approver'
    AND EXISTS (
      SELECT 1 FROM selection_requests r
      WHERE r.id = request_id AND r.status = 'pending_approval'
    )
  );

-- =========================================
-- SCORING CRITERIA
-- =========================================
CREATE POLICY "criteria: request owner manage" ON scoring_criteria
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM selection_requests r
      WHERE r.id = request_id AND r.owner_id = auth.uid()
    )
    OR get_my_role() = 'admin'
  );

CREATE POLICY "criteria: scorer can read" ON scoring_criteria
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scorers s
      WHERE s.request_id = request_id AND s.user_id = auth.uid() AND s.is_active = true
    )
  );

-- =========================================
-- SCORERS
-- =========================================
CREATE POLICY "scorers: request owner manage" ON scorers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM selection_requests r
      WHERE r.id = request_id AND r.owner_id = auth.uid()
    )
    OR get_my_role() = 'admin'
  );

CREATE POLICY "scorers: read own record" ON scorers
  FOR SELECT USING (user_id = auth.uid());

-- =========================================
-- SCORES — สำคัญที่สุด: blind scoring
-- =========================================

-- Scorer เห็นเฉพาะ scores ของตัวเอง
CREATE POLICY "scores: scorer read own" ON scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scorers s
      WHERE s.id = scorer_id AND s.user_id = auth.uid()
    )
  );

-- Scorer เขียน scores ของตัวเองได้ (ยังไม่ submit)
CREATE POLICY "scores: scorer write own" ON scores
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM scorers s
      WHERE s.id = scorer_id
        AND s.user_id = auth.uid()
        AND s.is_active = true
        AND s.submitted_at IS NULL
    )
  );

CREATE POLICY "scores: scorer update own" ON scores
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM scorers s
      WHERE s.id = scorer_id
        AND s.user_id = auth.uid()
        AND s.is_active = true
        AND s.submitted_at IS NULL
    )
  );

-- Admin / owner เห็น aggregate เสมอ (ผ่าน function ด้านล่าง)
CREATE POLICY "scores: admin full access" ON scores
  FOR ALL USING (get_my_role() = 'admin');

-- =========================================
-- SCORER CHANGE LOG
-- =========================================
CREATE POLICY "scorer_log: request owner read" ON scorer_change_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM selection_requests r
      WHERE r.id = request_id AND r.owner_id = auth.uid()
    )
    OR get_my_role() = 'admin'
  );

CREATE POLICY "scorer_log: request owner insert" ON scorer_change_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM selection_requests r
      WHERE r.id = request_id AND r.owner_id = auth.uid()
    )
    OR get_my_role() = 'admin'
  );

-- =========================================
-- APPROVAL RULES
-- =========================================
CREATE POLICY "approval_rules: all can read" ON approval_rules
  FOR SELECT USING (true);

CREATE POLICY "approval_rules: admin manage" ON approval_rules
  FOR ALL USING (get_my_role() = 'admin');

-- =========================================
-- APPROVALS
-- =========================================
CREATE POLICY "approvals: request owner read" ON approvals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM selection_requests r
      WHERE r.id = request_id AND r.owner_id = auth.uid()
    )
    OR get_my_role() = 'admin'
  );

CREATE POLICY "approvals: approver read own level" ON approvals
  FOR SELECT USING (approver_id = auth.uid());

CREATE POLICY "approvals: approver decide own level" ON approvals
  FOR UPDATE USING (
    approver_id = auth.uid() AND status = 'pending'
  );

CREATE POLICY "approvals: admin manage" ON approvals
  FOR ALL USING (get_my_role() = 'admin');
