-- =============================================================================
-- ConED · Set admin login password to Admin123456 (not the shared login1234)
-- Requires: 015 (admin user a1111111-…105)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE auth.users
SET
  encrypted_password = crypt('Admin123456', gen_salt('bf')),
  updated_at = timezone('utc', now())
WHERE id = 'a1111111-1111-4111-8111-111111111105'::uuid;
