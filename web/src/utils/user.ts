import type { User } from "@supabase/supabase-js";

const avatars = import.meta.glob("../assets/avatars/*.png", {
    eager: true,
    query: "?url",
    import: "default",
});

export function getUsername(user: User): string {
    return (user.user_metadata?.display_name as string | undefined) ??
        (user.user_metadata?.username as string | undefined) ??
        user.email?.split("@")[0] ??
        "";
}

export function getAvatar(user: User): string | undefined {
    const id = user.user_metadata?.avatar_id as string | undefined;
    if (!id) return undefined;

    const avatar = avatars[`../assets/avatars/${id}.png`] as string | undefined;
    return avatar;
}
