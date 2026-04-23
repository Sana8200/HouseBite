import type { PostgrestResponse, PostgrestSingleResponse } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import type { InsertReceipt, Product, ProductSpecs, Receipt } from "./schema";


export type ReceiptProduct = Pick<Product, "id" |"name"> & Pick<ProductSpecs, "quantity" | "price">

export interface ReceiptWithProducts extends Pick<Receipt, "id" | "household_id" | "store_name" | "total" | "purchase_at"> {
    products: ReceiptProduct[];
}

export async function insertReceipt(receipt: InsertReceipt): Promise<PostgrestSingleResponse<Receipt>> {
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
