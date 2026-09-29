-- 006_users_oauth.sql — allow password-less users for future OAuth sign-in.
-- OAuth users have no password; their email identity is verified by the IdP.
-- They can set a password later via the normal password-reset flow.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
