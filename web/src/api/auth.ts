import { supabase } from '../supabase'
import type { User } from '@supabase/supabase-js'

export async function getSession() {
    return supabase.auth.getSession()
}

export async function signOut() {
    return supabase.auth.signOut()
}

/**
 * @throws `AuthError` if the sign-in fails.
 */
export async function signIn(email: string, password: string): Promise<User> {
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (result.error) throw result.error
    return result.data.user
}

/**
 * @throws `AuthError` if the sign-up fails.
 */
export async function signUp(email: string, password: string, display_name: string): Promise<User> {
    const result = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name } },
    })
    if (result.error) throw result.error
    return result.data.user!
}

export function onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
        callback(session?.user ?? null)
    })
}

export async function saveUsername(name: string) {
    return supabase.auth.updateUser({
        data: { username: name, display_name: name },
    })
}

export async function savePassword(password: string) {
    return supabase.auth.updateUser({ password })
}
