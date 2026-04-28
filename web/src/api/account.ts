import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import { supabase } from '../supabase'
import type { FoodRestriction } from './schema';


// for a specific user only, it links to it automatically by RLS
// gets their spending for the current month (not entire HH's)
export async function getTotalSpent(): Promise<{ total: number; error: null; } | { total: null; error: Error; }> {
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
        
        // sum of all total values in all receipts
        const total = (data ?? []).reduce((acc, r) => acc + Number(r.total ?? 0), 0);
        
        return { total, error: null };
    } catch (error) {
        console.error('Error in getTotalSpent:', error);
        return { total: null, error: error as Error };
    }
}

export async function deleteAccount() {
    return supabase.rpc("delete_account")
}

export async function getFoodRestrictions(): Promise<PostgrestSingleResponse<FoodRestriction[]>> {
    return supabase
        .from("food_restriction")
        .select()
        .order("category")
        .order("name")
}

export async function getMyRestrictions(userId: string): Promise<PostgrestSingleResponse<{ restriction_id: string; }[]>> {
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
