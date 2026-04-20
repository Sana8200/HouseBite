-- Add profile columns to family_member
ALTER TABLE family_member ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE family_member ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill from auth.users
UPDATE family_member fm
SET
  display_name = u.raw_user_meta_data->>'display_name',
  email = u.email
FROM auth.users u
WHERE u.id = fm.id
  AND (fm.display_name IS NULL OR fm.email IS NULL);

-- Update trigger to populate new columns on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.family_member (id, display_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'display_name',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow household members to see each other's profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'household members can read' AND tablename = 'family_member'
  ) THEN
    CREATE POLICY "household members can read" ON family_member
      FOR SELECT USING (
        id IN (
          SELECT a.member_id FROM allocations a
          WHERE a.household_id IN (SELECT my_households())
        )
      );
  END IF;

  -- Allow seeing all allocations in your households (needed to list members)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'see household allocations' AND tablename = 'allocations'
  ) THEN
    CREATE POLICY "see household allocations" ON allocations
      FOR SELECT USING (household_id IN (SELECT my_households()));
  END IF;
END $$;
