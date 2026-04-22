import { supabase } from '../supabase'
import { getHouseholds as getHouseholdsBase } from './household'

export interface Household {
    id: string
    house_name: string
}

interface HouseholdRow { // for data type purposes
    id: string
    house_name: string
    invite_id: string
    monthly_budget: number | null
}

// calls getHouseholds from household api but parses and returns only the data account needs
export async function getHouseholds() {
    const { data, error } = await getHouseholdsBase()
    if (error) return { data: null, error }
    return {
        data: (data as HouseholdRow[] ?? []).map(h => ({ id: h.id, house_name: h.house_name })),
        error: null,
    }
}

// for a specific user only, gets their spending for the current month (not entire HH's)
export async function getTotalSpent() {
    try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { total: null, error: new Error('Not authenticated') };

        // Calculate current month's date range
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0);
        
        // Format dates for Supabase (YYYY-MM-DD)
        const startDate = startOfMonth.toISOString().split('T')[0];
        const endDate = endOfMonth.toISOString().split('T')[0];

        // Query receipts for current user in current month only
        const { data, error } = await supabase
            .from("receipt")
            .select("total")
            .eq("buyer_id", user.id)  // Filter by current user
            .gte("purchase_at", startDate)  // Start of month
            .lte("purchase_at", endDate);  // End of month

        if (error) return { total: null, error };
        
        // Sum all totals for this user this month
        const total = (data ?? []).reduce((acc, r) => acc + Number(r.total ?? 0), 0);
        
        return { total, error: null };
    } catch (error) {
        console.error('Error in getTotalSpent:', error);
        return { total: null, error };
    }
}

export async function deleteAccount() {
    return supabase.rpc("delete_account")
}

export interface FoodRestriction {
    id: string
    name: string
    category: "diet" | "intolerance"
}

export async function getFoodRestrictions() {
    return supabase
        .from("food_restriction")
        .select("id, name, category")
        .order("category")
        .order("name")
}

export async function getMyRestrictions(userId: string): Promise<{ data: { restriction_id: string }[] | null; error: unknown }> {
    return supabase
        .from("member_restriction")
        .select("restriction_id")
        .eq("member_id", userId)
}

export async function addRestriction(userId: string, restrictionId: string) {
    return supabase
        .from("member_restriction")
        .insert({ member_id: userId, restriction_id: restrictionId })
}

export async function removeRestriction(userId: string, restrictionId: string) {
    return supabase
        .from("member_restriction")
        .delete()
        .eq("member_id", userId)
        .eq("restriction_id", restrictionId)
}
