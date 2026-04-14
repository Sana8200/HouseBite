import { supabase } from '../supabase'

export async function createHousehold(name: string, budget: number | null ) {
    return supabase.rpc('create_household', {
        p_house_name: name,
        p_monthly_budget: budget
    })
}