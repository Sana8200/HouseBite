import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import type { InsertProduct, InsertProductSpecs, Product, ProductSpecs } from "./schema";

export async function softDeleteProduct(productId: string) {
    return await supabase
        .from("product_specs")
        .update({ current_quantity: 0 })
        .eq("product_id", productId);
}


export async function insertProduct(product: InsertProduct): Promise<PostgrestSingleResponse<Product>> {
    return await supabase
        .from("product")
        .insert(product)
        .select()
        .single();
}

export async function insertProductSpecs(productSpecs: InsertProductSpecs): Promise<PostgrestSingleResponse<ProductSpecs>> {
    return await supabase
        .from("product_specs")
        .insert(productSpecs)
        .select()
        .single();
}

export async function insertProductWithSpecs(product: InsertProduct, productSpecs: Omit<InsertProductSpecs, "product_id">): Promise<PostgrestSingleResponse<[Product, ProductSpecs]>> {
    const res1 = await insertProduct(product);
    if (res1.error) return res1;

    const res2 = await insertProductSpecs({
        ...productSpecs,
        product_id: res1.data.id
    });
    if (res2.error) return res2;

    return {
        ...res2,
        data: [res1.data, res2.data],
    };
}

export async function getPantryProductNames(householdId: string): Promise<string[]> {
    const { data, error } = await supabase
        .from("product")
        .select(`
            name,
            product_specs(current_quantity)
        `)
        .eq("household_id", householdId);

    if (error) {
        throw new Error(error.message);
    }

    // "Cook this" only cares whether the household currently has some stock of a product.
    return (data ?? [])
        .filter((product) => {
            const specs = Array.isArray(product.product_specs) ? product.product_specs[0] : product.product_specs;
            return (specs?.current_quantity ?? 0) > 0;
        })
        .map((product) => (product.name as string | null) ?? "")
        .filter(Boolean);
}
