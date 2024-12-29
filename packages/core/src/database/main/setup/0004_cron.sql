CREATE OR REPLACE FUNCTION clean_expired_sessions()
  RETURNS INTEGER
  LANGUAGE plpgsql
AS
$$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP RETURNING COUNT(*) INTO deleted_count;
  RETURN deleted_count;
END;
$$;
SELECT cron.schedule('clean-expired-sessions-weekly', '0 2 * * 0', 'SELECT clean_expired_sessions()')
