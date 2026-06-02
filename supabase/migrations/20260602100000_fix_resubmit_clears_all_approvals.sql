-- เมื่อ (re)submit อนุมัติ ต้องเริ่มรอบใหม่หมดจด:
-- ลบ approval เดิม "ทุกแถว" ของ request (ไม่ใช่แค่ pending)
-- ป้องกันแถว approved/returned เก่าค้าง → ทำให้ resubmit หลังถูกส่งกลับ approve ไม่ผ่าน
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

  -- เคลียร์ approval ทั้งหมดของ request นี้ก่อนเริ่มรอบใหม่
  DELETE FROM approvals WHERE request_id = p_request_id;

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
