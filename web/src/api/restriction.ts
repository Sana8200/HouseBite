import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import type { HouseholdFoodRestriction } from "./schema";

export async function getHouseholdFoodRestriction(householdId: string): Promise<PostgrestSingleResponse<HouseholdFoodRestriction[]>> {
    return await supabase
    .from("household_food_restriction")
    .select()
    .eq("household_id", householdId)
}

export interface HouseholdMemberRestriction {
    member_id: string;
    member_name: string;
    restriction_id: string;
}

export async function getHouseholdRestrictions(householdId: string): Promise<PostgrestSingleResponse<HouseholdMemberRestriction[]>> {
    return await supabase
        .rpc("get_household_restrictions", { p_household_id: householdId })
}
