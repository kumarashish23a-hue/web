-- 003_verification.sql — sources, verification, change history, monitoring, discovery
-- Plain PostgreSQL 14+. Idempotent-safe. Depends on 001_catalog.sql.
-- FKs to admin_users (created in 005_admin.sql) are added there via ALTER TABLE.

CREATE TABLE IF NOT EXISTS sources (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type      source_type NOT NULL,
  url              text NOT NULL,
  page_title       text,
  retrieved_at     timestamptz,
  notes            text,
  created_by_admin uuid, -- FK to admin_users added in 005
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS verification_records (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type      text NOT NULL
                     CHECK (entity_type IN ('website', 'model', 'plan', 'plan_limit',
                                            'access_requirement', 'cancellation_policy',
                                            'api_access', 'regional_availability',
                                            'website_model')),
  entity_id        uuid NOT NULL,
  claim            text,
  status           verification_status NOT NULL DEFAULT 'unverified',
  source_id        uuid REFERENCES sources (id),
  verified_by_admin uuid, -- FK to admin_users added in 005
  verified_at      timestamptz,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS change_history (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type      text NOT NULL,
  entity_id        uuid NOT NULL,
  field_name       text NOT NULL,
  old_value        text,
  new_value        text,
  changed_by_admin uuid, -- FK to admin_users added in 005
  changed_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monitoring_checks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES ai_websites (id) ON DELETE CASCADE,
  checked_at timestamptz NOT NULL DEFAULT now(),
  status     monitoring_status NOT NULL,
  findings   text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS discovery_sources (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  kind       text NOT NULL,
  config     jsonb,
  enabled    boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS discovery_candidates (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_source_id uuid NOT NULL REFERENCES discovery_sources (id) ON DELETE CASCADE,
  name               text,
  url                text,
  raw                jsonb,
  status             text NOT NULL DEFAULT 'new',
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------- indexes ---
CREATE INDEX IF NOT EXISTS idx_verification_records_entity
  ON verification_records (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_change_history_entity
  ON change_history (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_checks_website_id
  ON monitoring_checks (website_id);
