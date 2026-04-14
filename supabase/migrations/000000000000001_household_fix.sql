 -- Allow any logged-in user to create a new household
  CREATE POLICY "authenticated users can create households"
    ON household
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

  -- Allow any logged-in user to add themselves to a household
  CREATE POLICY "add self to household"
    ON allocations
    FOR INSERT
    WITH CHECK (member_id = auth.uid());