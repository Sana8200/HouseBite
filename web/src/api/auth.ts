import { supabase } from '../supabase'
import type { User } from '@supabase/supabase-js'

export const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITEKEY as string | undefined) || "1x00000000000000000000AA";

export async function getSession() {
    return supabase.auth.getSession()
}

export async function signOut() {
    return supabase.auth.signOut()
}

/**
 * @throws `AuthError` if the sign-in fails.
 */
export async function signIn(email: string, password: string, captchaToken: string): Promise<User> {
    const result = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken }
    })
    if (result.error) throw result.error
    return result.data.user
}

/**
 * @throws `AuthError` if the sign-up fails.
 */
/**
 * Returns the user. If email confirmation is enabled, the user won't have a
 * session yet — the caller should check `result.identities?.length === 0` to
 * detect an already-registered email (Supabase returns a fake user in that case).
 * @throws `AuthError` if the sign-up fails.
 */
export async function signUp(email: string, password: string, display_name: string, captchaToken: string): Promise<User> {
    const result = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { display_name },
            captchaToken,
            emailRedirectTo: window.location.origin,
        },
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

export async function setAvatar(avatar_id: string) {
    return supabase.auth.updateUser({
        data: { avatar_id },
    });
}
