import type { PostgrestSingleResponse } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import type { Household } from './schema'

export type NewHousehold = Pick<Household, "id" | "house_name" | "invite_id" | "monthly_budget">;

// Wrapper for a SECURITY DEFINER SQL function that creates the household
// and links the current user in a single transaction. This replaces
// the previous two-step flow (insert household → insert allocation)
// which failed because RLS SELECT policies block RETURNING on a row
// whose allocation doesn't exist yet.
export async function createHousehold(name: string, budget: number | null ): Promise<PostgrestSingleResponse<NewHousehold>> {
    return supabase.rpc('create_household', {
        p_house_name: name,
        p_monthly_budget: budget
    })
}

export async function getHouseholds(): Promise<PostgrestSingleResponse<Household[]>> {
    return supabase
        .from("household")
        .select()
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
    })
}

export async function updateHousehold(id: string, name: string, budget: number | null): Promise<PostgrestSingleResponse<null>> {
    return supabase
        .from("household")
        .update({ house_name: name, monthly_budget: budget })
        .eq("id", id)
}

export async function leaveHousehold(userId: string, householdId: string): Promise<PostgrestSingleResponse<null>> {
    return supabase
        .from("allocations")
        .delete()
        .eq("household_id", householdId)
        .eq("member_id", userId)
}

export async function joinHousehold(inviteId: string): Promise<PostgrestSingleResponse<NewHousehold>> {
    return supabase.rpc('join_household', {
        p_invite_id: inviteId
    })
}
