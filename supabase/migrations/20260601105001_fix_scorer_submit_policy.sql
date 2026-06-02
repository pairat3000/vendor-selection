-- Allow scorer to update their own submitted_at (submit action)
CREATE POLICY "scorers: scorer can submit" ON scorers
  FOR UPDATE
  USING (user_id = auth.uid() AND is_active = true)
  WITH CHECK (user_id = auth.uid());

-- Also allow scorer to write their own scores (INSERT + UPDATE)
DROP POLICY IF EXISTS "scores: scorer write own" ON scores;
DROP POLICY IF EXISTS "scores: scorer update own" ON scores;

CREATE POLICY "scores: scorer write own" ON scores
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM scorers s
      WHERE s.id = scorer_id
        AND s.user_id = auth.uid()
        AND s.is_active = true
    )
  );

CREATE POLICY "scores: scorer update own" ON scores
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM scorers s
      WHERE s.id = scorer_id
        AND s.user_id = auth.uid()
        AND s.is_active = true
    )
  );
