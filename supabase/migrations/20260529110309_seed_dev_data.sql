-- =========================================
-- SEED: dynamic vendor fields
-- =========================================
INSERT INTO vendor_fields (field_key, field_label, field_type, is_required, sort_order) VALUES
  ('bank_account',    'เลขบัญชีธนาคาร',      'text',    false, 1),
  ('bank_name',       'ธนาคาร',               'text',    false, 2),
  ('cert_iso',        'ใบรับรอง ISO',          'boolean', false, 3),
  ('year_founded',    'ปีที่ก่อตั้ง',           'number',  false, 4),
  ('product_catalog', 'URL รายการสินค้า',      'text',    false, 5);

-- =========================================
-- SEED: 3 sample vendors (status=approved for dev)
-- =========================================
INSERT INTO vendors (id, name, tax_id, type, address, payment_terms, contact_name, contact_email, contact_phone, status) VALUES
  (
    '11111111-0000-0000-0000-000000000001',
    'บริษัท เทคโนวิชั่น จำกัด',
    '0105560123456',
    'company',
    '123 ถ.สุขุมวิท แขวงคลองเตย กรุงเทพฯ 10110',
    'Net 30',
    'คุณสมชาย ดีใจ',
    'somchai@technovision.co.th',
    '02-123-4567',
    'approved'
  ),
  (
    '11111111-0000-0000-0000-000000000002',
    'ห้างหุ้นส่วน ดิจิทัลโซลูชั่น',
    '0103550234567',
    'partnership',
    '456 ถ.พระราม 9 เขตห้วยขวาง กรุงเทพฯ 10310',
    'Net 45',
    'คุณวิไล รักงาน',
    'wilai@digitalsolution.th',
    '081-234-5678',
    'approved'
  ),
  (
    '11111111-0000-0000-0000-000000000003',
    'บริษัท ซอฟต์แวร์พลัส จำกัด',
    '0105570345678',
    'company',
    '789 ถ.รัชดาภิเษก เขตดินแดง กรุงเทพฯ 10400',
    'Net 60',
    'คุณประภาส พัฒนา',
    'prapas@softwareplus.co.th',
    '02-987-6543',
    'approved'
  );

-- vendor field values สำหรับ seed vendors
INSERT INTO vendor_field_values (vendor_id, field_key, value) VALUES
  ('11111111-0000-0000-0000-000000000001', 'cert_iso',     'true'),
  ('11111111-0000-0000-0000-000000000001', 'year_founded', '2010'),
  ('11111111-0000-0000-0000-000000000002', 'cert_iso',     'false'),
  ('11111111-0000-0000-0000-000000000002', 'year_founded', '2015'),
  ('11111111-0000-0000-0000-000000000003', 'cert_iso',     'true'),
  ('11111111-0000-0000-0000-000000000003', 'year_founded', '2008');
