import "@supabase/functions-js/edge-runtime.d.ts"

import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
)

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Require authenticated user.
    const token = req.headers.get("Authorization")!.replace("Bearer ", "");
    const claim = await supabase.auth.getClaims(token);
    if (claim.error) throw claim.error;

    const member_id = claim.data?.claims.sub;
    const { recipe } = await req.json()
    // recipe: { title, description, servings, prep_time }

    const { data: inserted, error: insertError } = await supabase
      .from("recipe")
      .insert(recipe)
      .select("id")
      .single()

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { error: linkError } = await supabase
      .from("member_recipes")
      .insert({ member_id, recipe_id: inserted.id })

    if (linkError) {
      return new Response(JSON.stringify({ error: linkError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ id: inserted.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
