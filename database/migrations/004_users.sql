-- 004_users.sql — user accounts, tokens, profiles, preferences, favorites, stacks,
-- search history, submissions, analytics events.
-- Plain PostgreSQL 14+. Idempotent-safe. Depends on 001_catalog.sql.
-- FKs to admin_users (created in 005_admin.sql) are added there via ALTER TABLE.
-- Email uniqueness: plain text + UNIQUE (app always stores lowercased). No citext.

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id           uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  display_name text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id          uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  prefer_free      boolean NOT NULL DEFAULT false,
  no_credit_card   boolean NOT NULL DEFAULT false,
  no_payment       boolean NOT NULL DEFAULT false,
  beginner_friendly boolean NOT NULL DEFAULT false,
  api_required     boolean NOT NULL DEFAULT false,
  region_code      char(2),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saved_stacks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title      text NOT NULL,
  goal_text  text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_favorites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind       favorite_kind NOT NULL,
  website_id uuid REFERENCES ai_websites (id) ON DELETE CASCADE,
  model_id   uuid REFERENCES ai_models (id) ON DELETE CASCADE,
  stack_id   uuid REFERENCES saved_stacks (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, website_id, model_id, stack_id)
);

CREATE TABLE IF NOT EXISTS stack_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stack_id            uuid NOT NULL REFERENCES saved_stacks (id) ON DELETE CASCADE,
  position            integer NOT NULL,
  requirement_label   text,
  website_id          uuid REFERENCES ai_websites (id) ON DELETE SET NULL,
  model_id            uuid REFERENCES ai_models (id) ON DELETE SET NULL,
  reason              text,
  free_status         text,
  requirements_summary text,
  limits_summary      text,
  confidence          text,
  verification_status verification_status,
  UNIQUE (stack_id, position)
);

CREATE TABLE IF NOT EXISTS search_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  query      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submissions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES users (id) ON DELETE SET NULL,
  kind             submission_kind NOT NULL,
  status           submission_status NOT NULL DEFAULT 'pending_review',
  payload          jsonb,
  source_url       text,
  reviewed_by_admin uuid, -- FK to admin_users added in 005
  reviewed_at      timestamptz,
  review_notes     text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users (id) ON DELETE SET NULL,
  event_type  text NOT NULL,
  entity_type text,
  entity_id   uuid,
  meta        jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------- indexes ---
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_saved_stacks_user_id ON saved_stacks (user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions (status);
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history (user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events (user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens (user_id);
