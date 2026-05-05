import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import { supabase } from '../supabase'
import type { Household } from './schema'

export type NewHousehold = Pick<Household, "id" | "house_name" | "invite_id" | "monthly_budget">;

// Wrapper for a SECURITY DEFINER SQL function that creates the household
// and links the current user in a single transaction. This replaces
// the previous two-step flow (insert household → insert allocation)
// which failed because RLS SELECT policies block RETURNING on a row
// whose allocation doesn't exist yet.
export async function createHousehold(name: string, budget: number | null, color: string): Promise<PostgrestSingleResponse<NewHousehold | NewHousehold[]>> {
    return supabase.rpc('create_household', {
        p_house_name: name,
        p_monthly_budget: budget,
        p_color: color,
    })
}

// Fetches households for the current user, joining allocations for per-user household_color.
export async function getHouseholds(): Promise<PostgrestSingleResponse<Household[]>> {
    const result = await supabase
        .from('allocations')
        .select('household_color, household(*)')

    if (result.error) return result;

    const households: Household[] = (result.data ?? []).map(row => ({
        ...(row.household as unknown as Omit<Household, 'household_color'>),
        household_color: row.household_color as string,
    }))

    households.sort((a, b) => a.house_name.localeCompare(b.house_name));

    return {...result, data: households};
}

// Wrapper for a SECURITY DEFINER SQL function that finds a household
// by invite_id, checks the caller isn't already a member, and creates
// the allocation — all in a single atomic operation.
export interface HouseholdMember {
    id: string
    display_name: string | null
    email: string | null
}

export async function getHouseholdMembers(householdId: string): Promise<PostgrestSingleResponse<HouseholdMember[]>> {
    return supabase.rpc('get_household_members', {
        p_household_id: householdId
    }).order("display_name")
}

export async function getHouseholdMemberCount(householdId: string): Promise<number> {
    const result = await supabase.rpc('get_household_member_count', {
        p_household_id: householdId,
    })
    if (result.error) return 0
    return result.data as number
}

export async function updateHousehold(id: string, name: string, budget: number | null, color: string): Promise<PostgrestSingleResponse<null>> {
    const _result1 = supabase
        .from("household")
        .update({ house_name: name, monthly_budget: budget })
        .eq("id", id);

    const _result2 = supabase
        .from("allocations")
        .update({ household_color: color })
        .eq("household_id", id);

    const result1 = await _result1;

    if (result1.error) return result1;

    return await _result2;
}

export async function updateHouseholdColor(id: string, color: string) {
    return supabase
        .from("allocations")
        .update({ household_color: color })
        .eq("household_id", id)
}

export async function leaveHousehold(userId: string, householdId: string): Promise<PostgrestSingleResponse<null>> {
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
    const result = await supabase.rpc('kick_member_permanently', {
        p_household_id: householdId,
        p_member_id: memberId,
    })
    if (result.error) throw new Error(result.error.message)
    return result.data as string
}

export async function transferAdmin(householdId: string, newAdminId: string): Promise<void> {
    const { error } = await supabase.rpc('transfer_admin', {
        p_household_id: householdId,
        p_new_admin_id: newAdminId,
    })
    if (error) throw new Error(error.message)
}
