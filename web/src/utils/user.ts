import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../supabase";

export function getUsername(user: User): string {
    return (user.user_metadata?.display_name as string | undefined) ??
        (user.user_metadata?.username as string | undefined) ??
        user.email?.split("@")[0] ??
        "";
}

export function getAvatar(user: User): string | undefined {
    return user.user_metadata?.avatar_url as string | undefined;
}

export function useDisplayName() {
    const [displayName, setDisplayName] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                setDisplayName(getUsername(data.user));
            }
        }).catch(() => {});
    }, []);

    return displayName;
}
