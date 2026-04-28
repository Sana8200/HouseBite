import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import type { InsertProduct, InsertProductSpecs, Product, ProductSpecs } from "./schema";


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

export async function getUserScannedProductCount(): Promise<number> {
    const { data, error } = await supabase.rpc('get_user_scanned_product_count')
    if (error) return 0
    return data as number
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
