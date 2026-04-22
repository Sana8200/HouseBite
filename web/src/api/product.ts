import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { supabase } from "../supabase";

export interface Product {
    id?: string;
    name: string;
    household_id: string;
    receipt_id: string | null;
}

export type PantryUnit = "gr" | "ml" | "kg" | "L";

export interface ProductSpecs {
    product_id: string;
    quantity: number;
    size: string | null;
    unit: PantryUnit | null;
    expiration_date: string | null;
    price: number | null;
}

export async function insertProduct(product: Product): Promise<PostgrestSingleResponse<Product>> {
    return await supabase
        .from("product")
        .insert(product)
        .select()
        .single();
}

export async function insertProductSpecs(productSpecs: ProductSpecs): Promise<PostgrestSingleResponse<ProductSpecs>> {
    return await supabase
        .from("product_specs")
        .insert(productSpecs)
        .select()
        .single();
}

export async function insertProductWithSpecs(product: Product, productSpecs: Omit<ProductSpecs, "product_id">): Promise<PostgrestSingleResponse<[Product, ProductSpecs]>> {
    const res1 = await insertProduct(product);
    if (res1.error) return res1;

    const res2 = await insertProductSpecs({
        ...productSpecs,
        product_id: res1.data.id!
    });
    if (res2.error) return res2;

    return {
        ...res2,
        data: [res1.data, res2.data],
    };
}
