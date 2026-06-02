-- หมวดหมู่หลักของเกณฑ์การให้คะแนน
CREATE TABLE scoring_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES selection_requests(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scoring_categories_request ON scoring_categories(request_id);

-- เพิ่ม category + description ให้ criteria (nullable = backward compatible)
ALTER TABLE scoring_criteria
  ADD COLUMN category_id UUID REFERENCES scoring_categories(id) ON DELETE SET NULL,
  ADD COLUMN description TEXT;

-- RLS
ALTER TABLE scoring_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories: request owner manage" ON scoring_categories
  FOR ALL USING (
    is_request_owner(request_id) OR get_my_role() = 'admin'
  );

CREATE POLICY "categories: scorer can read" ON scoring_categories
  FOR SELECT USING (is_active_scorer_of(request_id));
