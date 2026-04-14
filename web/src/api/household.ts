import { supabase } from '../supabase'

// Wrapper for a SECURITY DEFINER SQL function that creates the household
// and links the current user in a single transaction. This replaces
// the previous two-step flow (insert household → insert allocation)
// which failed because RLS SELECT policies block RETURNING on a row
// whose allocation doesn't exist yet.
export async function createHousehold(name: string, budget: number | null ) {
    return supabase.rpc('create_household', {
        p_house_name: name,
        p_monthly_budget: budget
    })
}

export async function getHouseholds() {
    return supabase
        .from("household")
        .select("id, house_name, invite_id, monthly_budget")
}

// Wrapper for a SECURITY DEFINER SQL function that finds a household
// by invite_id, checks the caller isn't already a member, and creates
// the allocation — all in a single atomic operation.
export async function joinHousehold(inviteId: string) {
    return supabase.rpc('join_household', {
        p_invite_id: inviteId
    })
}