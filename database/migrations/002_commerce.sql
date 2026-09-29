-- 002_commerce.sql — commerce tables (plans, payments, access, regions, policies, API)
-- Plain PostgreSQL 14+. Idempotent-safe. Depends on 001_catalog.sql.
-- payment_methods rows are static reference data and are seeded here.

CREATE TABLE IF NOT EXISTS plans (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id     uuid NOT NULL REFERENCES ai_websites (id) ON DELETE CASCADE,
  name           text NOT NULL,
  kind           plan_kind NOT NULL,
  billing_cycle  billing_cycle NOT NULL DEFAULT 'none',
  price_amount   numeric(12, 2),
  price_currency char(3),
  price_per      text,
  is_current     boolean NOT NULL DEFAULT true,
  is_demo        boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_limits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     uuid NOT NULL REFERENCES plans (id) ON DELETE CASCADE,
  limit_kind  text NOT NULL
                CHECK (limit_kind IN ('requests_per_day', 'requests_per_month',
                                      'tokens_per_day', 'images_per_day', 'videos_per_day',
                                      'credits', 'storage_mb', 'other')),
  limit_value numeric,
  limit_unit  text,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code  payment_method_code NOT NULL UNIQUE,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Static reference data: every payment_method_code gets a row.
INSERT INTO payment_methods (code, label) VALUES
  ('credit_card',   'Credit card'),
  ('debit_card',    'Debit card'),
  ('upi',           'UPI'),
  ('paypal',        'PayPal'),
  ('bank_transfer', 'Bank transfer'),
  ('apple_pay',     'Apple Pay'),
  ('google_pay',    'Google Pay'),
  ('other',         'Other')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS website_payment_methods (
  website_id        uuid NOT NULL REFERENCES ai_websites (id) ON DELETE CASCADE,
  payment_method_id uuid NOT NULL REFERENCES payment_methods (id) ON DELETE CASCADE,
  notes             text,
  PRIMARY KEY (website_id, payment_method_id)
);

CREATE TABLE IF NOT EXISTS access_requirements (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id              uuid NOT NULL UNIQUE REFERENCES ai_websites (id) ON DELETE CASCADE,
  account_required        boolean NOT NULL DEFAULT false,
  email_verification      boolean NOT NULL DEFAULT false,
  phone_verification      boolean NOT NULL DEFAULT false,
  credit_card_required    boolean NOT NULL DEFAULT false,
  debit_card_required     boolean NOT NULL DEFAULT false,
  payment_method_required boolean NOT NULL DEFAULT false,
  payment_required        boolean NOT NULL DEFAULT false,
  minimum_age             integer,
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS regional_availability (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id   uuid NOT NULL REFERENCES ai_websites (id) ON DELETE CASCADE,
  country_code char(2) NOT NULL,
  available    boolean NOT NULL DEFAULT true,
  notes        text,
  UNIQUE (website_id, country_code)
);

CREATE TABLE IF NOT EXISTS cancellation_policies (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id         uuid NOT NULL UNIQUE REFERENCES ai_websites (id) ON DELETE CASCADE,
  can_cancel         boolean NOT NULL DEFAULT true,
  method             text,
  timing             text,
  auto_renewal       boolean NOT NULL DEFAULT true,
  access_after_cancel text,
  refund_info        text,
  source_url         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_access (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id      uuid NOT NULL UNIQUE REFERENCES ai_websites (id) ON DELETE CASCADE,
  has_api         boolean NOT NULL DEFAULT false,
  free_tier       boolean NOT NULL DEFAULT false,
  pricing_text    text,
  rate_limits_text text,
  docs_url        text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------- indexes ---
CREATE INDEX IF NOT EXISTS idx_plans_website_id ON plans (website_id);
CREATE INDEX IF NOT EXISTS idx_plan_limits_plan_id ON plan_limits (plan_id);
