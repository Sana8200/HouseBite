import type { User } from "@supabase/supabase-js";

export function getUsername(user: User): string {
    return (user.user_metadata?.display_name as string | undefined) ??
        (user.user_metadata?.username as string | undefined) ??
        user.email?.split("@")[0] ??
        "";
}

export function getAvatar(user: User): string | undefined {
    return user.user_metadata?.avatar_url as string | undefined;
}
