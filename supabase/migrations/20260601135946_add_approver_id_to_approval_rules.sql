-- Add specific approver assignment per rule
ALTER TABLE approval_rules
  ADD COLUMN IF NOT EXISTS approver_id UUID REFERENCES profiles(id);

-- Make approver_role optional (we now assign specific users)
ALTER TABLE approval_rules ALTER COLUMN approver_role DROP NOT NULL;

-- Update create_approval_records to copy approver_id from the matched rule
CREATE OR REPLACE FUNCTION create_approval_records(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget NUMERIC;
  v_rule RECORD;
BEGIN
  SELECT budget INTO v_budget FROM selection_requests WHERE id = p_request_id;

  DELETE FROM approvals
  WHERE request_id = p_request_id AND status = 'pending';

  FOR v_rule IN
    SELECT level, approver_id
    FROM approval_rules
    WHERE v_budget >= min_budget
      AND (max_budget IS NULL OR v_budget <= max_budget)
    ORDER BY level
  LOOP
    INSERT INTO approvals (request_id, level, status, approver_id)
    VALUES (p_request_id, v_rule.level, 'pending', v_rule.approver_id);
  END LOOP;

  UPDATE selection_requests
  SET status = 'pending_approval'
  WHERE id = p_request_id;
END;
$$;
