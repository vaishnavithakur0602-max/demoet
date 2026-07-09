/*
# Create WebAuthn Credentials Table

## Summary
Stores WebAuthn (passkey/biometric) credentials linked to authenticated Supabase users.
Each row represents a single registered credential (e.g. Touch ID on a specific device).

## New Tables
- `webauthn_credentials`
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to auth.users, not null, defaults to auth.uid())
  - `credential_id` (text, unique — the base64url-encoded credential ID from the authenticator)
  - `public_key` (text — COSE-encoded public key, stored as base64url)
  - `counter` (bigint — sign count for replay attack detection)
  - `device_name` (text — optional human-readable device label)
  - `created_at` (timestamptz)

## Security
- RLS enabled.
- Authenticated users can only read/write their own credentials.
*/

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id text UNIQUE NOT NULL,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  device_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_credentials" ON webauthn_credentials;
CREATE POLICY "select_own_credentials" ON webauthn_credentials FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_credentials" ON webauthn_credentials;
CREATE POLICY "insert_own_credentials" ON webauthn_credentials FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_credentials" ON webauthn_credentials;
CREATE POLICY "update_own_credentials" ON webauthn_credentials FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_credentials" ON webauthn_credentials;
CREATE POLICY "delete_own_credentials" ON webauthn_credentials FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
