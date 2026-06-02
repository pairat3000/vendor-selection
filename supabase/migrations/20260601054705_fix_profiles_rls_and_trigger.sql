-- Drop old INSERT policy ที่ block trigger (auth.uid() = NULL ตอน trigger ยิง)
DROP POLICY IF EXISTS "profiles: insert own on signup" ON profiles;

-- ให้ trigger function bypass RLS ได้ (run as postgres superuser)
ALTER FUNCTION handle_new_user() SET row_security = off;

-- Recreate trigger function ให้ robust ขึ้น
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'it_user'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Policy สำหรับ service_role และ authenticated insert (ไม่ใช้ auth.uid() check)
-- การ insert จริงทำผ่าน trigger เท่านั้น ไม่ต้องมี policy insert สำหรับ client
-- แต่เพิ่ม policy สำหรับ admin ที่ต้องการ insert manual ได้
CREATE POLICY "profiles: admin can insert" ON profiles
  FOR INSERT WITH CHECK (get_my_role() = 'admin');
