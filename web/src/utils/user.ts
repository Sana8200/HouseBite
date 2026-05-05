import type { User } from "@supabase/supabase-js";
import type { HouseholdMember } from "../api/household";

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
    acc.set(id, {id, url});
    return acc;
}, new Map<string, Avatar>());

export function getUsername(user: User | HouseholdMember): string {
    let email: string | undefined = undefined;
    let display_name: string | undefined = undefined;
    let username: string | undefined = undefined;

    if ("user_metadata" in user) {
        email = user.email;
        display_name = user.user_metadata?.display_name as string | undefined;
        username = user.user_metadata?.username as string | undefined;
    } else {
        email = user.email ?? undefined;
        display_name = user.display_name ?? undefined;
    }
    
    return display_name || username || email?.split("@")[0] || "";
}

export function getAvatarUrl(user: User): string | undefined {
    const id = user.user_metadata?.avatar_id as string | undefined;
    if (!id) return undefined;

    const avatar = avatars.get(id);
    return avatar?.url;
}
