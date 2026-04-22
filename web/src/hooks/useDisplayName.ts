import { useState, useEffect } from "react";
import { supabase } from "../supabase";

export function useDisplayName() {
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    const fetchDisplayName = async () => {
      const { data } = await supabase.auth.getUser();
      const meta = data.user?.user_metadata;
      const name = meta?.display_name as string | undefined;
      const username = meta?.username as string | undefined;
      const email = data.user?.email;
      setDisplayName(name ?? username ?? email?.split('@')[0] ?? null);
    };

    void fetchDisplayName();
  }, []);

  return displayName;
}