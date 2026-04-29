import { supabase } from '../supabase'
import type { Household } from './schema'

export type NewHousehold = Pick<Household, "id" | "house_name" | "invite_id" | "monthly_budget">;

// Wrapper for a SECURITY DEFINER SQL function that creates the household
// and links the current user in a single transaction. This replaces
// the previous two-step flow (insert household → insert allocation)
// which failed because RLS SELECT policies block RETURNING on a row
// whose allocation doesn't exist yet.
export async function createHousehold(name: string, budget: number | null, color: string) {
    return supabase.rpc('create_household', {
        p_house_name: name,
        p_monthly_budget: budget,
        p_color: color,
    })
}

// Fetches households for the current user, joining allocations for per-user household_color.
export async function getHouseholds(): Promise<{ data: Household[] | null; error: unknown }> {
    const result = await supabase
        .from('allocations')
        .select('household_color, household(*)')

    if (result.error) return { data: null, error: result.error }

    const households: Household[] = (result.data ?? []).map((row: any) => ({
        ...(row.household as Omit<Household, 'household_color'>),
        household_color: row.household_color,
    }))

    return { data: households, error: null }
}

// Wrapper for a SECURITY DEFINER SQL function that finds a household
// by invite_id, checks the caller isn't already a member, and creates
// the allocation — all in a single atomic operation.
export interface HouseholdMember {
    id: string
    display_name: string | null
    email: string | null
}

export async function getHouseholdMembers(householdId: string): Promise<{ data: HouseholdMember[] | null; error: { message: string } | null }> {
    return supabase.rpc('get_household_members', {
        p_household_id: householdId
    })
}

export async function getHouseholdMemberCount(householdId: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_household_member_count', {
        p_household_id: householdId,
    })
    if (error) return 0
    return data as number
}

export async function updateHousehold(id: string, name: string, budget: number | null) {
    return supabase
        .from("household")
        .update({ house_name: name, monthly_budget: budget })
        .eq("id", id)
}

export async function leaveHousehold(userId: string, householdId: string): Promise<{ data: null; error: { message: string } | null }> {
    return supabase
        .from("allocations")
        .delete()
        .eq("household_id", householdId)
        .eq("member_id", userId)
}

export async function joinHousehold(inviteId: string, color: string) {
    return supabase.rpc('join_household', {
        p_invite_id: inviteId,
        p_color: color,
    })
}

export async function kickMember(householdId: string, memberId: string): Promise<void> {
    const { error } = await supabase.rpc('kick_member', {
        p_household_id: householdId,
        p_member_id: memberId,
    })
    if (error) throw new Error(error.message)
}

export async function kickMemberPermanently(householdId: string, memberId: string): Promise<string> {
    const { data, error } = await supabase.rpc('kick_member_permanently', {
        p_household_id: householdId,
        p_member_id: memberId,
    })
    if (error) throw new Error(error.message)
    return data as string
}

export async function transferAdmin(householdId: string, newAdminId: string): Promise<void> {
    const { error } = await supabase.rpc('transfer_admin', {
        p_household_id: householdId,
        p_new_admin_id: newAdminId,
    })
    if (error) throw new Error(error.message)
}
