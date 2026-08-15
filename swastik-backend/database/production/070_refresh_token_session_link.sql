-- ============================================================
-- 070: LINK REFRESH TOKENS TO ACTIVE SESSIONS
-- Adds session_id to refresh_tokens so a session can be revoked
-- without killing unrelated devices.
-- ============================================================

ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS session_id UUID;

COMMENT ON COLUMN refresh_tokens.session_id IS
  'active_sessions.id that issued this refresh token; used to revoke a single device session.';
