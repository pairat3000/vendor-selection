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
  v_assigned UUID;
  v_caller_role user_role;
  v_all_approved BOOLEAN;
BEGIN
  -- Lock and get approval (incl. assigned approver)
  SELECT request_id, level, approver_id
    INTO v_request_id, v_level, v_assigned
  FROM approvals
  WHERE id = p_approval_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval not found or already decided';
  END IF;

  -- Caller role
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  -- Authorization: caller must be the assigned approver OR an admin
  IF v_caller_role <> 'admin' THEN
    IF v_assigned IS NULL OR v_assigned <> auth.uid() THEN
      RAISE EXCEPTION 'You are not the assigned approver for this level';
    END IF;
  END IF;

  -- Sequential gate: previous level must be approved
  IF v_level > 1 THEN
    IF EXISTS (
      SELECT 1 FROM approvals
      WHERE request_id = v_request_id AND level = v_level - 1 AND status <> 'approved'
    ) THEN
      RAISE EXCEPTION 'Previous approval level not yet approved';
    END IF;
  END IF;

  -- Record decision (approver_id = the actual assigned person, not necessarily caller)
  UPDATE approvals
  SET status = p_status,
      approver_id = COALESCE(v_assigned, p_approver_id),
      comment = p_comment,
      decided_at = now()
  WHERE id = p_approval_id;

  IF p_status = 'returned' THEN
    UPDATE selection_requests SET status = 'returned' WHERE id = v_request_id;
    RETURN;
  END IF;

  SELECT NOT EXISTS (
    SELECT 1 FROM approvals
    WHERE request_id = v_request_id AND status <> 'approved'
  ) INTO v_all_approved;

  IF v_all_approved THEN
    UPDATE selection_requests SET status = 'approved' WHERE id = v_request_id;
  END IF;
END;
$$;
