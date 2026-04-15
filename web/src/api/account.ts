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

// for a specific user only, it links to it automatically by RLS
export async function getTotalSpent() {
    const { data, error } = await supabase
        .from("receipt")
        .select("total")
    if (error) return { total: null, error }
    // sum of all total values in all receipts
    const total = (data ?? []).reduce((acc, r) => acc + Number(r.total ?? 0), 0)
    return { total, error: null }
}

export async function saveUsername(name: string) {
    return supabase.auth.updateUser({
        data: { username: name, display_name: name },
    })
}

export async function savePassword(password: string) {
    return supabase.auth.updateUser({ password })
}

export async function deleteAccount() {
    return supabase.rpc("delete_account")
}
