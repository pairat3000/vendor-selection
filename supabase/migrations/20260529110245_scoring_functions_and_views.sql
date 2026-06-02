-- =========================================
-- FUNCTION: check if scoring is unlocked
-- (submitted_count = active_scorer_count)
-- =========================================
CREATE OR REPLACE FUNCTION is_scoring_unlocked(p_request_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COUNT(*) FILTER (WHERE submitted_at IS NOT NULL) = COUNT(*)
    AND COUNT(*) > 0
  FROM scorers
  WHERE request_id = p_request_id AND is_active = true;
$$;

-- =========================================
-- VIEW: weighted score per scorer × vendor
-- (SECURITY DEFINER — bypasses RLS เมื่อ unlock)
-- =========================================
CREATE OR REPLACE VIEW vendor_weighted_scores
WITH (security_invoker = false)
AS
SELECT
  sc.request_id,
  s.vendor_id,
  s.scorer_id,
  sr.user_id AS scorer_user_id,
  SUM(s.score * sc.weight / 100.0) AS weighted_score
FROM scores s
JOIN scoring_criteria sc ON sc.id = s.criteria_id
JOIN scorers sr ON sr.id = s.scorer_id
WHERE sr.is_active = true AND sr.submitted_at IS NOT NULL
GROUP BY sc.request_id, s.vendor_id, s.scorer_id, sr.user_id;

-- =========================================
-- FUNCTION: get final scores (unlocked only)
-- =========================================
CREATE OR REPLACE FUNCTION get_final_scores(p_request_id UUID)
RETURNS TABLE (
  vendor_id       UUID,
  final_score     NUMERIC,
  scorer_count    BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_scoring_unlocked(p_request_id) THEN
    RAISE EXCEPTION 'Scoring is not yet complete for this request';
  END IF;

  RETURN QUERY
  SELECT
    vws.vendor_id,
    ROUND(AVG(vws.weighted_score)::NUMERIC, 2) AS final_score,
    COUNT(DISTINCT vws.scorer_id) AS scorer_count
  FROM vendor_weighted_scores vws
  WHERE vws.request_id = p_request_id
  GROUP BY vws.vendor_id
  ORDER BY final_score DESC;
END;
$$;

-- =========================================
-- FUNCTION: auto-create profile on signup
-- =========================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'it_user')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =========================================
-- DEFAULT APPROVAL RULES
-- <500K = 1 level, 500K-1M = 2 levels, >1M = 3 levels
-- =========================================
INSERT INTO approval_rules (min_budget, max_budget, approver_role, level) VALUES
  (0,        499999.99, 'approver', 1),
  (500000,   999999.99, 'approver', 1),
  (500000,   999999.99, 'approver', 2),
  (1000000,  NULL,      'approver', 1),
  (1000000,  NULL,      'approver', 2),
  (1000000,  NULL,      'approver', 3);
