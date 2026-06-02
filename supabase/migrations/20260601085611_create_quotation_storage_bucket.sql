-- Create storage bucket for quotation files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quotations',
  'quotations',
  false,
  10485760, -- 10 MB
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: request owner can upload/download/delete their own files
CREATE POLICY "quotations: owner upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'quotations'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.selection_requests WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "quotations: owner read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'quotations'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.selection_requests WHERE owner_id = auth.uid()
      )
      OR get_my_role() = 'admin'
      OR (storage.foldername(name))[1] IN (
        SELECT request_id::text FROM public.scorers WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "quotations: owner delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'quotations'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.selection_requests WHERE owner_id = auth.uid()
      )
      OR get_my_role() = 'admin'
    )
  );
