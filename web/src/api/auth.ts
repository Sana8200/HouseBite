import { supabase } from '../supabase'

export async function getSession() {
    return supabase.auth.getSession()
}

export async function signOut() {
    return supabase.auth.signOut()
}

export async function saveUsername(name: string) {
    return supabase.auth.updateUser({
        data: { username: name, display_name: name },
    })
}

export async function savePassword(password: string) {
    return supabase.auth.updateUser({ password })
}
