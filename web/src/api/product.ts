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
