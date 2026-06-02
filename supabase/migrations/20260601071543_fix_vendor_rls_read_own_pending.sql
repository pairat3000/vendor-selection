-- Allow creator to read their own pending/rejected vendors too
CREATE POLICY "vendors: creator can read own" ON vendors
  FOR SELECT USING (created_by = auth.uid());
