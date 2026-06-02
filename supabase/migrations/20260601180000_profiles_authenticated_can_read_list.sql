-- Allow any authenticated user to read the profile list
-- (needed for scorer/approver pickers — internal tool, colleague names are not sensitive)
CREATE POLICY "profiles: authenticated can read list" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);
