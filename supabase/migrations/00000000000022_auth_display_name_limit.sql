-- Backend enforcement of display_name length limit (≤ 25 chars).
--
-- Passwords cannot be validated at the DB level because Supabase Auth
-- hashes them in the middleware layer before they reach Postgres. Password
-- length is enforced only via frontend validation.
--
-- This trigger fires on every INSERT or UPDATE of auth.users.
-- It rejects any write that would set raw_user_meta_data->>'display_name'
-- to a string longer than 25 characters.

CREATE OR REPLACE FUNCTION public.validate_display_name_length()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_name TEXT;
BEGIN
  v_name := NEW.raw_user_meta_data->>'display_name';
  IF v_name IS NOT NULL AND length(v_name) > 25 THEN
    RAISE EXCEPTION 'Display name must be 25 characters or fewer';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_display_name_length
BEFORE INSERT OR UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.validate_display_name_length();
