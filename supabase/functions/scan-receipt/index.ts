import "@supabase/functions-js/edge-runtime.d.ts";

import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "@supabase/supabase-js";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
});
const openaiModel = Deno.env.get("OPENAI_MODEL") || "gpt-5.4-nano";

const Receipt = z.object({
    storeName: z.string().nullable(),
    purchaseDate: z.string().nullable(),
    totalPrice: z.number().nullable(),
    items: z.array(z.object({
        name: z.string().nullable(),
        quantity: z.number().nullable(),
        weight: z.number().nullable(),
        totalPrice: z.number().nullable(),
        estimatedExpirationDays: z.number().nullable(),
    })),
})

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }
  
    // Require authenticated user.
    const token = req.headers.get("Authorization")!.replace("Bearer ", "");
    const claim = await supabase.auth.getClaims(token);
    if (claim.error) throw claim.error;
    
    const { image } = await req.json();

    const response = await openai.responses.parse({
        model: openaiModel,
        input: [
            {
                role: "user",
                content: [
                    { 
                        type: "input_text",
                        text: [
                            "The input image is a receipt, likely in swedish.",
                            "Extract the data into JSON output.", 
                            "Store name, purchase date in YYYY-MM-DD format, total price.",
                            "For each bought item: name, quantity, weight in kg, total price.",
                            "Subtract discounts from the item price.",
                            "Estimate the expiration in days from the item name.",
                            "Normalize the item name to not be in all uppercase.",
                            "If some data is missing use null instead."
                        ].join("\n"),
                    },
                    {
                        type: "input_image",
                        image_url: image,
                        detail: "auto",
                    },
                ],
            },
        ],
        text: {
            format: zodTextFormat(Receipt, "receipt"),
        },
    });

    const data = response.output_parsed;

    return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
});
