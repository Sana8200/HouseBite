import type { FunctionsResponse } from "@supabase/functions-js";
import { supabase } from "../supabase";

export interface ReceiptData {
    storeName: string | null;
    /** In format YYYY-MM-DD */
    purchaseDate: string | null;
    totalPrice: number | null;
    items: ReceiptItemData[];
}

export interface ReceiptItemData {
    name: string | null;
    quantity: number | null;
    /** In kg */
    weight: number | null;
    totalPrice: number | null;
    estimatedExpirationDays: number | null;
}

/**
 * Uses OpenAI api to read the receipt.
 * @param image data url of image.
 */
export async function scanReceipt(image: string): Promise<FunctionsResponse<ReceiptData>> {
    return await supabase.functions.invoke<ReceiptData>("scan-receipt", {
        body: {
            image
        }
    });
}
