-- Helper functions that bypass RLS to break circular dependency
-- selection_requests ↔ scorers ↔ selection_requests

CREATE OR REPLACE FUNCTION is_request_owner(p_request_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM selection_requests
    WHERE id = p_request_id AND owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_active_scorer_of(p_request_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM scorers
    WHERE request_id = p_request_id
      AND user_id = auth.uid()
      AND is_active = true
  );
$$;

-- Drop old cross-table policies that cause recursion
DROP POLICY IF EXISTS "requests: scorer can read assigned" ON selection_requests;
DROP POLICY IF EXISTS "requests: approver can read pending" ON selection_requests;
DROP POLICY IF EXISTS "scorers: request owner manage" ON scorers;
DROP POLICY IF EXISTS "request_vendors: scorer can read" ON request_vendors;
DROP POLICY IF EXISTS "request_vendors: approver can read" ON request_vendors;
DROP POLICY IF EXISTS "criteria: scorer can read" ON scoring_criteria;
DROP POLICY IF EXISTS "criteria: request owner manage" ON scoring_criteria;

-- Recreate using SECURITY DEFINER helpers (no circular ref)

CREATE POLICY "requests: scorer can read assigned" ON selection_requests
  FOR SELECT USING (is_active_scorer_of(id));

CREATE POLICY "requests: approver can read pending" ON selection_requests
  FOR SELECT USING (
    get_my_role() = 'approver' AND status = 'pending_approval'
  );

CREATE POLICY "scorers: request owner manage" ON scorers
  FOR ALL USING (
    is_request_owner(request_id) OR get_my_role() = 'admin'
  );

CREATE POLICY "request_vendors: scorer can read" ON request_vendors
  FOR SELECT USING (is_active_scorer_of(request_id));

CREATE POLICY "request_vendors: approver can read" ON request_vendors
  FOR SELECT USING (
    get_my_role() = 'approver'
    AND EXISTS (
      SELECT 1 FROM selection_requests r
      WHERE r.id = request_id AND r.status = 'pending_approval'
    )
  );

CREATE POLICY "criteria: request owner manage" ON scoring_criteria
  FOR ALL USING (
    is_request_owner(request_id) OR get_my_role() = 'admin'
  );

CREATE POLICY "criteria: scorer can read" ON scoring_criteria
  FOR SELECT USING (is_active_scorer_of(request_id));
