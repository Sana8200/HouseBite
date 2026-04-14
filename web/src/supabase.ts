import { createClient, type User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseKey);


/**
 * @throws `AuthError` if the sign-in fails.
 */
export async function signIn(email: string, password: string): Promise<User> {
    const result = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (result.error) {
        throw result.error;
    }

    return result.data.user;
}

/**
 * @throws `AuthError` if the sign-in fails.
 */
export async function signUp(email: string, password: string): Promise<User> {
    const result = await supabase.auth.signUp({
        email,
        password,
        phone: "",
    });

    if (result.error) {
        throw result.error;
    }

    // Email confirmation is disabled on the server
    return result.data.user!;
}

export async function signOut(): Promise<void> {
    await supabase.auth.signOut();
    history.pushState({}, "", "/");
    navigation.reload();
}
