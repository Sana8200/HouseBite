import type { User } from "@supabase/supabase-js";

export interface Avatar {
    id: string;
    url: string;
}

export const avatars = Object.entries(import.meta.glob("../assets/avatars/*.png", {
    eager: true,
    query: "?url",
    import: "default",
})).reduce((acc, cur) => {
    const id = cur[0].match("../assets/avatars/(.+).png")![1];
    const url = cur[1] as string;
    acc[id] = {id, url};
    return acc;
}, {} as Record<string, Avatar>);

export function getUsername(user: User): string {
    return (user.user_metadata?.display_name as string | undefined) ??
        (user.user_metadata?.username as string | undefined) ??
        user.email?.split("@")[0] ??
        "";
}

export function getAvatarUrl(user: User): string | undefined {
    const id = user.user_metadata?.avatar_id as string | undefined;
    if (!id) return undefined;

    const avatar = avatars[id] as Avatar | undefined;
    return avatar?.url;
}
