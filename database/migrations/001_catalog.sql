-- 001_catalog.sql — enum types + catalog tables
-- Plain PostgreSQL 14+. Idempotent-safe: guards CREATE TYPE with DO blocks,
-- uses IF NOT EXISTS on tables and indexes.

-- ---------------------------------------------------------------- enums ---
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
    CREATE TYPE verification_status AS ENUM
      ('verified', 'partially_verified', 'unverified', 'outdated', 'disputed');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'monitoring_status') THEN
    CREATE TYPE monitoring_status AS ENUM
      ('current', 'due_for_check', 'outdated', 'changed', 'under_review');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
    CREATE TYPE admin_role AS ENUM
      ('super_admin', 'admin', 'editor', 'verifier');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_kind') THEN
    CREATE TYPE plan_kind AS ENUM
      ('free', 'free_trial', 'freemium', 'paid', 'usage_based', 'subscription', 'api_only');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_cycle') THEN
    CREATE TYPE billing_cycle AS ENUM
      ('monthly', 'yearly', 'one_time', 'usage', 'none');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_kind') THEN
    CREATE TYPE submission_kind AS ENUM
      ('website', 'model', 'pricing', 'free_access', 'correction');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_status') THEN
    CREATE TYPE submission_status AS ENUM
      ('pending_review', 'approved', 'rejected', 'needs_info');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'favorite_kind') THEN
    CREATE TYPE favorite_kind AS ENUM ('website', 'model', 'stack');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'source_type') THEN
    CREATE TYPE source_type AS ENUM
      ('official_pricing', 'official_model_page', 'official_docs', 'official_terms',
       'official_billing', 'official_cancellation', 'other');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_code') THEN
    CREATE TYPE payment_method_code AS ENUM
      ('credit_card', 'debit_card', 'upi', 'paypal',
       'bank_transfer', 'apple_pay', 'google_pay', 'other');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_type') THEN
    CREATE TYPE ai_type AS ENUM
      ('chat', 'image', 'video', 'audio', 'music', 'voice', 'stt',
       'embedding', 'code', 'agent', 'multimodal', 'other');
  END IF;
END $$;

-- --------------------------------------------------------------- tables ---
CREATE TABLE IF NOT EXISTS providers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  slug        text NOT NULL UNIQUE,
  website_url text,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

CREATE TABLE IF NOT EXISTS categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  slug        text NOT NULL UNIQUE,
  description text,
  icon        text,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

CREATE TABLE IF NOT EXISTS capabilities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  slug        text NOT NULL UNIQUE,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_websites (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  slug               text NOT NULL UNIQUE,
  tagline            text,
  description        text,
  official_url       text,
  logo_url           text,
  is_open_source     boolean NOT NULL DEFAULT false,
  beginner_friendly  boolean NOT NULL DEFAULT false,
  monitoring_status  monitoring_status NOT NULL DEFAULT 'due_for_check',
  last_checked_at    timestamptz,
  is_demo            boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz
);

CREATE TABLE IF NOT EXISTS ai_models (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id           uuid REFERENCES providers (id),
  name                  text NOT NULL,
  slug                  text NOT NULL UNIQUE,
  description           text,
  model_type            ai_type,
  is_open_source        boolean NOT NULL DEFAULT false,
  license               text,
  context_window_tokens integer,
  input_modalities      text[],
  output_modalities     text[],
  api_available         boolean NOT NULL DEFAULT false,
  is_demo               boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz
);

CREATE TABLE IF NOT EXISTS website_categories (
  website_id  uuid NOT NULL REFERENCES ai_websites (id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  PRIMARY KEY (website_id, category_id)
);

CREATE TABLE IF NOT EXISTS model_categories (
  model_id    uuid NOT NULL REFERENCES ai_models (id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  PRIMARY KEY (model_id, category_id)
);

CREATE TABLE IF NOT EXISTS model_capabilities (
  model_id      uuid NOT NULL REFERENCES ai_models (id) ON DELETE CASCADE,
  capability_id uuid NOT NULL REFERENCES capabilities (id) ON DELETE CASCADE,
  PRIMARY KEY (model_id, capability_id)
);

CREATE TABLE IF NOT EXISTS website_models (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id    uuid NOT NULL REFERENCES ai_websites (id) ON DELETE CASCADE,
  model_id      uuid NOT NULL REFERENCES ai_models (id) ON DELETE CASCADE,
  access_status text NOT NULL DEFAULT 'unavailable'
                  CHECK (access_status IN ('free', 'free_tier', 'free_trial', 'paid', 'unavailable')),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (website_id, model_id)
);

-- -------------------------------------------------------------- indexes ---
CREATE INDEX IF NOT EXISTS idx_ai_websites_slug ON ai_websites (slug);
CREATE INDEX IF NOT EXISTS idx_ai_websites_name ON ai_websites (name);
CREATE INDEX IF NOT EXISTS idx_ai_models_slug ON ai_models (slug);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug);
