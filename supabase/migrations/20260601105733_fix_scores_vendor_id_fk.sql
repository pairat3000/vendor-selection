-- scores.vendor_id ควร reference vendors(id) ไม่ใช่ request_vendors(id)
-- เพราะ code ส่ง rv.vendor_id (actual vendor UUID) ไปไม่ใช่ rv.id

ALTER TABLE scores DROP CONSTRAINT scores_vendor_id_fkey;

ALTER TABLE scores
  ADD CONSTRAINT scores_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;
