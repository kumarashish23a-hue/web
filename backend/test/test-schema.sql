-- Minimal contract-derived schema for backend tests ONLY.
-- Used solely when database/migrations/*.sql is empty (i.e. the DB worker
-- has not landed the real migrations yet). It mirrors the table/column
-- names from CONTRACT.md so backend behaviour is identical either way.
-- DO NOT treat this as the real migration set.

CREATE TYPE verification_status AS ENUM ('verified','partially_verified','unverified','outdated','disputed');
CREATE TYPE monitoring_status AS ENUM ('current','due_for_check','outdated','changed','under_review');
CREATE TYPE admin_role AS ENUM ('super_admin','admin','editor','verifier');
CREATE TYPE plan_kind AS ENUM ('free','free_trial','freemium','paid','usage_based','subscription','api_only');
CREATE TYPE billing_cycle AS ENUM ('monthly','yearly','one_time','usage','none');
CREATE TYPE submission_kind AS ENUM ('website','model','pricing','free_access','correction');
CREATE TYPE submission_status AS ENUM ('pending_review','approved','rejected','needs_info');
CREATE TYPE favorite_kind AS ENUM ('website','model','stack');
CREATE TYPE source_type AS ENUM ('official_pricing','official_model_page','official_docs','official_terms','official_billing','official_cancellation','other');
CREATE TYPE payment_method_code AS ENUM ('credit_card','debit_card','upi','paypal','bank_transfer','apple_pay','google_pay','other');
CREATE TYPE ai_type AS ENUM ('chat','image','video','audio','music','voice','stt','embedding','code','agent','multimodal','other');

CREATE TABLE providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  website_url text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  sort_order int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE ai_websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  tagline text,
  description text,
  official_url text,
  logo_url text,
  is_open_source boolean DEFAULT false,
  beginner_friendly boolean DEFAULT false,
  monitoring_status monitoring_status,
  last_checked_at timestamptz,
  is_demo boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  model_type ai_type DEFAULT 'other',
  is_open_source boolean DEFAULT false,
  license text,
  context_window_tokens int,
  input_modalities text[],
  output_modalities text[],
  api_available boolean DEFAULT false,
  is_demo boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE website_categories (
  website_id uuid REFERENCES ai_websites(id),
  category_id uuid REFERENCES categories(id),
  PRIMARY KEY (website_id, category_id)
);

CREATE TABLE model_categories (
  model_id uuid REFERENCES ai_models(id),
  category_id uuid REFERENCES categories(id),
  PRIMARY KEY (model_id, category_id)
);

CREATE TABLE model_capabilities (
  model_id uuid REFERENCES ai_models(id),
  capability_id uuid REFERENCES capabilities(id),
  PRIMARY KEY (model_id, capability_id)
);

CREATE TABLE website_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid REFERENCES ai_websites(id),
  model_id uuid REFERENCES ai_models(id),
  UNIQUE (website_id, model_id),
  access_status text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid REFERENCES ai_websites(id),
  name text NOT NULL,
  kind plan_kind NOT NULL,
  billing_cycle billing_cycle DEFAULT 'none',
  price_amount numeric(12,2),
  price_currency char(3),
  price_per text,
  is_current boolean DEFAULT true,
  is_demo boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE plan_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES plans(id),
  limit_kind text NOT NULL,
  limit_value numeric,
  limit_unit text,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code payment_method_code UNIQUE NOT NULL,
  label text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE website_payment_methods (
  website_id uuid REFERENCES ai_websites(id),
  payment_method_id uuid REFERENCES payment_methods(id),
  notes text,
  PRIMARY KEY (website_id, payment_method_id)
);

CREATE TABLE access_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid REFERENCES ai_websites(id) UNIQUE,
  account_required boolean DEFAULT false,
  email_verification boolean DEFAULT false,
  phone_verification boolean DEFAULT false,
  credit_card_required boolean DEFAULT false,
  debit_card_required boolean DEFAULT false,
  payment_method_required boolean DEFAULT false,
  payment_required boolean DEFAULT false,
  minimum_age int,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE regional_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid REFERENCES ai_websites(id),
  country_code char(2) NOT NULL,
  available boolean NOT NULL,
  notes text,
  UNIQUE (website_id, country_code)
);

CREATE TABLE cancellation_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid REFERENCES ai_websites(id),
  can_cancel boolean,
  method text,
  timing text,
  auto_renewal boolean,
  access_after_cancel text,
  refund_info text,
  source_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE api_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid REFERENCES ai_websites(id) UNIQUE,
  has_api boolean,
  free_tier boolean,
  pricing_text text,
  rate_limits_text text,
  docs_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type source_type NOT NULL,
  url text NOT NULL,
  page_title text,
  retrieved_at timestamptz,
  notes text,
  created_by_admin uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE verification_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  claim text NOT NULL,
  status verification_status NOT NULL,
  source_id uuid REFERENCES sources(id),
  verified_by_admin uuid,
  verified_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX ON verification_records (entity_type, entity_id);

CREATE TABLE change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_by_admin uuid,
  changed_at timestamptz DEFAULT now()
);
CREATE INDEX ON change_history (entity_type, entity_id);

CREATE TABLE monitoring_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid REFERENCES ai_websites(id),
  checked_at timestamptz DEFAULT now(),
  status monitoring_status NOT NULL,
  findings text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE discovery_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL,
  config jsonb,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE discovery_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_source_id uuid REFERENCES discovery_sources(id),
  name text NOT NULL,
  url text,
  raw jsonb,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  email_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE TABLE password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES users(id),
  display_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE user_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  prefer_free boolean DEFAULT false,
  no_credit_card boolean DEFAULT false,
  no_payment boolean DEFAULT false,
  beginner_friendly boolean DEFAULT false,
  api_required boolean DEFAULT false,
  region_code char(2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE saved_stacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  title text NOT NULL,
  goal_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  kind favorite_kind NOT NULL,
  website_id uuid REFERENCES ai_websites(id),
  model_id uuid REFERENCES ai_models(id),
  stack_id uuid REFERENCES saved_stacks(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, kind, website_id, model_id, stack_id)
);

CREATE TABLE stack_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stack_id uuid REFERENCES saved_stacks(id),
  position int DEFAULT 0,
  requirement_label text,
  website_id uuid REFERENCES ai_websites(id),
  model_id uuid REFERENCES ai_models(id),
  reason text,
  free_status text,
  requirements_summary text,
  limits_summary text,
  confidence text,
  verification_status verification_status,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  query text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Contract-derived: analytics_events from database/migrations/004_users.sql.
-- Only ever written by POST /api/v1/analytics/events (coarse, non-PII fields).
CREATE TABLE analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_events_user_id ON analytics_events (user_id);

CREATE TABLE submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  kind submission_kind NOT NULL,
  status submission_status DEFAULT 'pending_review',
  payload jsonb NOT NULL,
  source_url text,
  reviewed_by_admin uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code admin_role UNIQUE NOT NULL,
  label text NOT NULL
);
INSERT INTO admin_roles (code, label) VALUES
  ('super_admin','Super Admin'), ('admin','Admin'), ('editor','Editor'), ('verifier','Verifier');

CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES users(id),
  role admin_role NOT NULL,
  created_by_admin uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES admin_users(id),
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip text,
  created_at timestamptz DEFAULT now()
);
