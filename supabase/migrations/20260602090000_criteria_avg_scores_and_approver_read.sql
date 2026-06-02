-- คะแนนเฉลี่ยรายหัวข้อ (เฉลี่ยข้าม active+submitted scorers) — SECURITY DEFINER
-- ใช้สำหรับ Compare Dashboard ของ approver โดยไม่ต้องเปิด RLS ตาราง scores
CREATE OR REPLACE FUNCTION get_criteria_avg_scores(p_request_id UUID)
RETURNS TABLE (vendor_id UUID, criteria_id UUID, avg_score NUMERIC)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_scoring_unlocked(p_request_id) THEN
    RAISE EXCEPTION 'Scoring is not yet complete for this request';
  END IF;

  RETURN QUERY
  SELECT s.vendor_id, s.criteria_id, ROUND(AVG(s.score)::NUMERIC, 1) AS avg_score
  FROM scores s
  JOIN scorers sr ON sr.id = s.scorer_id
  WHERE s.request_id = p_request_id
    AND sr.is_active = true
    AND sr.submitted_at IS NOT NULL
  GROUP BY s.vendor_id, s.criteria_id;
END;
$$;

-- ให้ approver อ่าน categories + criteria ของ request ที่รออนุมัติ (เพื่อแสดงชื่อหมวด/หัวข้อใน compare)
CREATE POLICY "categories: approver can read" ON scoring_categories
  FOR SELECT USING (
    get_my_role() = 'approver'
    AND EXISTS (SELECT 1 FROM selection_requests r WHERE r.id = request_id AND r.status = 'pending_approval')
  );

CREATE POLICY "criteria: approver can read pending" ON scoring_criteria
  FOR SELECT USING (
    get_my_role() = 'approver'
    AND EXISTS (SELECT 1 FROM selection_requests r WHERE r.id = request_id AND r.status = 'pending_approval')
  );
