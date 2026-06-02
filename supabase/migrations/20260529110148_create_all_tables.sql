-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE user_role AS ENUM ('admin', 'it_user', 'scorer', 'approver');
CREATE TYPE vendor_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE request_status AS ENUM ('draft', 'scoring', 'pending_approval', 'approved', 'returned');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'returned');
CREATE TYPE scorer_change_action AS ENUM ('added', 'removed');
CREATE TYPE vendor_field_type AS ENUM ('text', 'number', 'date', 'select', 'boolean');

-- =========================================
-- USER PROFILES (extends auth.users)
-- =========================================
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL DEFAULT '',
  role         user_role NOT NULL DEFAULT 'it_user',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================
-- VENDOR REGISTRY
-- =========================================
CREATE TABLE vendors (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  tax_id         TEXT UNIQUE,
  type           TEXT NOT NULL DEFAULT 'company',
  address        TEXT,
  payment_terms  TEXT,
  contact_name   TEXT,
  contact_email  TEXT,
  contact_phone  TEXT,
  status         vendor_status NOT NULL DEFAULT 'pending',
  created_by     UUID REFERENCES profiles(id),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vendor_fields (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key    TEXT NOT NULL UNIQUE,
  field_label  TEXT NOT NULL,
  field_type   vendor_field_type NOT NULL DEFAULT 'text',
  is_required  BOOLEAN NOT NULL DEFAULT false,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vendor_field_values (
  vendor_id   UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  field_key   TEXT NOT NULL REFERENCES vendor_fields(field_key) ON DELETE CASCADE,
  value       TEXT,
  PRIMARY KEY (vendor_id, field_key)
);

-- =========================================
-- SELECTION REQUESTS
-- =========================================
CREATE TABLE selection_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  budget       NUMERIC(15,2) NOT NULL DEFAULT 0,
  type         TEXT NOT NULL DEFAULT 'general',
  deadline     DATE,
  description  TEXT,
  status       request_status NOT NULL DEFAULT 'draft',
  owner_id     UUID NOT NULL REFERENCES profiles(id),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE request_vendors (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id       UUID NOT NULL REFERENCES selection_requests(id) ON DELETE CASCADE,
  vendor_id        UUID NOT NULL REFERENCES vendors(id),
  quotation_url    TEXT,
  quotation_price  NUMERIC(15,2),
  payment_terms    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, vendor_id)
);

-- =========================================
-- SCORING ENGINE
-- =========================================
CREATE TABLE scoring_criteria (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES selection_requests(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  weight      NUMERIC(5,2) NOT NULL CHECK (weight > 0 AND weight <= 100),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE scorers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   UUID NOT NULL REFERENCES selection_requests(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  submitted_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, user_id)
);

CREATE TABLE scores (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scorer_id    UUID NOT NULL REFERENCES scorers(id) ON DELETE CASCADE,
  request_id   UUID NOT NULL REFERENCES selection_requests(id) ON DELETE CASCADE,
  vendor_id    UUID NOT NULL REFERENCES request_vendors(id) ON DELETE CASCADE,
  criteria_id  UUID NOT NULL REFERENCES scoring_criteria(id) ON DELETE CASCADE,
  score        NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scorer_id, vendor_id, criteria_id)
);

CREATE TABLE scorer_change_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES selection_requests(id) ON DELETE CASCADE,
  action          scorer_change_action NOT NULL,
  target_user_id  UUID NOT NULL REFERENCES profiles(id),
  reason          TEXT NOT NULL,
  changed_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================
-- APPROVAL WORKFLOW
-- =========================================
CREATE TABLE approval_rules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_budget     NUMERIC(15,2) NOT NULL DEFAULT 0,
  max_budget     NUMERIC(15,2),
  approver_role  TEXT NOT NULL,
  level          INTEGER NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE approvals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   UUID NOT NULL REFERENCES selection_requests(id) ON DELETE CASCADE,
  level        INTEGER NOT NULL,
  approver_id  UUID REFERENCES profiles(id),
  status       approval_status NOT NULL DEFAULT 'pending',
  comment      TEXT,
  decided_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================
-- INDEXES
-- =========================================
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_created_by ON vendors(created_by);
CREATE INDEX idx_selection_requests_owner ON selection_requests(owner_id);
CREATE INDEX idx_selection_requests_status ON selection_requests(status);
CREATE INDEX idx_scorers_request ON scorers(request_id);
CREATE INDEX idx_scorers_user ON scorers(user_id);
CREATE INDEX idx_scores_scorer ON scores(scorer_id);
CREATE INDEX idx_scores_request ON scores(request_id);
CREATE INDEX idx_approvals_request ON approvals(request_id);
