-- 005_admin.sql — admin roles, admin users, audit logs.
-- Plain PostgreSQL 14+. Idempotent-safe. Depends on 001–004.
-- Adds the FKs to admin_users that 003/004 left deferred.

CREATE TABLE IF NOT EXISTS admin_roles (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code  admin_role NOT NULL UNIQUE,
  label text NOT NULL
);

-- Seed all four admin roles (idempotent).
INSERT INTO admin_roles (code, label) VALUES
  ('super_admin', 'Super Admin'),
  ('admin',       'Admin'),
  ('editor',      'Editor'),
  ('verifier',    'Verifier')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS admin_users (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  role             admin_role NOT NULL,
  created_by_admin uuid REFERENCES admin_users (id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES admin_users (id) ON DELETE CASCADE,
  action        text NOT NULL,
  entity_type   text,
  entity_id     uuid,
  old_value     jsonb,
  new_value     jsonb,
  ip            text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Deferred FKs pointing at admin_users (guarded so re-runs are safe).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sources_created_by_admin') THEN
    ALTER TABLE sources
      ADD CONSTRAINT fk_sources_created_by_admin
      FOREIGN KEY (created_by_admin) REFERENCES admin_users (id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_verification_records_verified_by_admin') THEN
    ALTER TABLE verification_records
      ADD CONSTRAINT fk_verification_records_verified_by_admin
      FOREIGN KEY (verified_by_admin) REFERENCES admin_users (id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_change_history_changed_by_admin') THEN
    ALTER TABLE change_history
      ADD CONSTRAINT fk_change_history_changed_by_admin
      FOREIGN KEY (changed_by_admin) REFERENCES admin_users (id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_submissions_reviewed_by_admin') THEN
    ALTER TABLE submissions
      ADD CONSTRAINT fk_submissions_reviewed_by_admin
      FOREIGN KEY (reviewed_by_admin) REFERENCES admin_users (id) ON DELETE SET NULL;
  END IF;
END $$;

-- -------------------------------------------------------------- indexes ---
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_user_id ON audit_logs (admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
