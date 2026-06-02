-- Allow vendor creator/admin to upsert field values
CREATE POLICY "vendor_field_values: creator can upsert" ON vendor_field_values
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendors v
      WHERE v.id = vendor_id
        AND (v.created_by = auth.uid() OR get_my_role() = 'admin')
    )
  );

CREATE POLICY "vendor_field_values: creator can update" ON vendor_field_values
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM vendors v
      WHERE v.id = vendor_id
        AND (v.created_by = auth.uid() OR get_my_role() = 'admin')
    )
  );
