import type { PostgrestResponse, PostgrestSingleResponse } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import type { InsertReceipt, Product, ProductSpecs, Receipt } from "./schema";


export type ReceiptProduct = Pick<Product, "id" | "name"> & Pick<ProductSpecs, "bought_quantity" | "price">

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

export async function deleteReceipt(receiptId: string): Promise<{ error: Error | null }> {
    // Products must be deleted first — receipt.id is ON DELETE SET NULL on product,
    // so deleting the receipt alone would orphan them. product_specs cascade from product.
    const { error: productsError } = await supabase
        .from("product")
        .delete()
        .eq("receipt_id", receiptId);
    if (productsError) return { error: productsError };

    const { error } = await supabase
        .from("receipt")
        .delete()
        .eq("id", receiptId);
    return { error };
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
                product_specs(bought_quantity, price)
            )
        `)
        .order("purchase_at", { ascending: false });

    if (householdId) {
        query = query.eq("household_id", householdId);
    }

    const { data, error, ...rest } = await query;

    const mapped: ReceiptWithProducts[] = (data ?? []).map(r => ({
        id: r.id as string,
        household_id: r.household_id as string,
        store_name: r.store_name as string,
        total: r.total as number,
        purchase_at: r.purchase_at as string,
        products: (r.product ?? []).map(p => {
            const specs = Array.isArray(p.product_specs) ? p.product_specs[0] : p.product_specs;
            return {
                id: p.id as string,
                name: p.name as string ,
                bought_quantity: specs?.bought_quantity as number ?? 1,
                price: specs?.price as number ?? null,
            };
        }),
    }));

    return { data: mapped, error, ...rest } as PostgrestResponse<ReceiptWithProducts>;
}
