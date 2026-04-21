import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { supabase } from "../supabase";

export interface Receipt {
    id?: string;
    household_id: string;
    store_name: string | null;
    total: number | null;
    purchase_at: string;
}

export async function insertReceipt(receipt: Receipt): Promise<PostgrestSingleResponse<Receipt>> {
    return await supabase
        .from("receipt")
        .insert(receipt)
        .select()
        .single();
}
