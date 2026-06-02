-- Function: create approval records for a request based on budget threshold
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

  -- Delete any existing pending approvals (re-submission case)
  DELETE FROM approvals
  WHERE request_id = p_request_id AND status = 'pending';

  -- Create new approval records per matching rule level
  FOR v_rule IN
    SELECT level, approver_role
    FROM approval_rules
    WHERE v_budget >= min_budget
      AND (max_budget IS NULL OR v_budget <= max_budget)
    ORDER BY level
  LOOP
    INSERT INTO approvals (request_id, level, status)
    VALUES (p_request_id, v_rule.level, 'pending')
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Advance request to pending_approval
  UPDATE selection_requests
  SET status = 'pending_approval'
  WHERE id = p_request_id;
END;
$$;

-- Function: process an approval decision
CREATE OR REPLACE FUNCTION process_approval(
  p_approval_id UUID,
  p_approver_id UUID,
  p_status approval_status,
  p_comment TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id UUID;
  v_level INT;
  v_next_level INT;
  v_next_approval UUID;
  v_all_approved BOOLEAN;
BEGIN
  -- Lock and get approval
  SELECT request_id, level INTO v_request_id, v_level
  FROM approvals WHERE id = p_approval_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval not found or already decided';
  END IF;

  -- Check previous level is approved
  IF v_level > 1 THEN
    IF EXISTS (
      SELECT 1 FROM approvals
      WHERE request_id = v_request_id AND level = v_level - 1 AND status != 'approved'
    ) THEN
      RAISE EXCEPTION 'Previous approval level not yet approved';
    END IF;
  END IF;

  -- Record decision
  UPDATE approvals
  SET status = p_status, approver_id = p_approver_id,
      comment = p_comment, decided_at = now()
  WHERE id = p_approval_id;

  IF p_status = 'returned' THEN
    -- Return request
    UPDATE selection_requests SET status = 'returned' WHERE id = v_request_id;
    RETURN;
  END IF;

  -- Check if all levels approved
  SELECT NOT EXISTS (
    SELECT 1 FROM approvals
    WHERE request_id = v_request_id AND status != 'approved'
  ) INTO v_all_approved;

  IF v_all_approved THEN
    UPDATE selection_requests SET status = 'approved' WHERE id = v_request_id;
  END IF;
END;
$$;
