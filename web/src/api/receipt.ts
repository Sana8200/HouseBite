import type { PostgrestResponse, PostgrestSingleResponse } from "@supabase/supabase-js";
import { supabase } from "../supabase";

export interface Receipt {
    id?: string;
    household_id: string;
    store_name: string | null;
    total: number | null;
    purchase_at: string;
}

export interface ReceiptProduct {
    id: string;
    name: string;
    quantity: number;
    price: number | null;
}

export interface ReceiptWithProducts extends Receipt {
    id: string;
    products: ReceiptProduct[];
}

export async function insertReceipt(receipt: Receipt): Promise<PostgrestSingleResponse<Receipt>> {
    return await supabase
        .from("receipt")
        .insert(receipt)
        .select()
        .single();
}

export async function fetchReceiptsByHousehold(householdId?: string): Promise<PostgrestResponse<ReceiptWithProducts>> {
    let query = supabase
        .from("receipt")
        .select(`
            id,
            household_id,
            store_name,
            total,
            purchase_at,
            product(
                id,
                name,
                product_specs(quantity, price)
            )
        `)
        .order("purchase_at", { ascending: false });

    if (householdId) {
        query = query.eq("household_id", householdId);
    }

    const { data, error, ...rest } = await query;

    const mapped: ReceiptWithProducts[] = (data ?? []).map((r: any) => ({
        id: r.id,
        household_id: r.household_id,
        store_name: r.store_name,
        total: r.total,
        purchase_at: r.purchase_at,
        products: (r.product ?? []).map((p: any) => {
            const specs = Array.isArray(p.product_specs) ? p.product_specs[0] : p.product_specs;
            return {
                id: p.id,
                name: p.name,
                quantity: specs?.quantity ?? 1,
                price: specs?.price ?? null,
            };
        }),
    }));

    return { data: mapped, error, ...rest } as PostgrestResponse<ReceiptWithProducts>;
}
