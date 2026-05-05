import "@supabase/functions-js/edge-runtime.d.ts"

import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Require authenticated user.
    const token = req.headers.get("Authorization")!.replace("Bearer ", "");
    const claim = await supabase.auth.getClaims(token);
    if (claim.error) throw claim.error;

    // The client now sends the restrictions the user chose to keep active in the
    // modal, so we trust those instead of re-querying the DB ourselves.
    const { ingredients, household_id, diets = [], intolerances = [] } = await req.json()

    const proxyUrl = Deno.env.get("SPOONACULAR_PROXY_URL")
    const proxyKey = Deno.env.get("SPOONACULAR_PROXY_KEY")
    if (!proxyUrl || !proxyKey) {
      return new Response(JSON.stringify({ error: "Missing proxy credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const rapidHeaders = {
      "X-DH2642-Key": proxyKey,
      "X-DH2642-Stud": "399",
      "X-RapidAPI-Host": "spoonacular-recipe-food-nutrition-v1.p.rapidapi.com",
    }

    // ── Step 1: complexSearch — diet/intolerance filtering + get IDs ──────
    // We ask Spoonacular for 9 candidates so we have some buffer to throw away
    // ones that don't have proper step-by-step instructions.
    const params = new URLSearchParams({
      includeIngredients: ingredients,
      number: "9",
      instructionsRequired: "true",
    })
    if (diets.length > 0) params.set("diet", diets.join(","))
    if (intolerances.length > 0) params.set("intolerances", intolerances.join(","))

    const searchData = await fetch(
      `${proxyUrl}/recipes/complexSearch?${params.toString()}`,
      { headers: rapidHeaders }
    ).then(r => r.json())

    const candidates: { id: number }[] = searchData.results ?? []
    if (candidates.length === 0) {
      return new Response(JSON.stringify({ error: "No matching recipes found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── Step 2: fetch full details per recipe (instructions + nutrition) ───
    const details = await Promise.all(
      candidates.map((r) =>
        fetch(
          `${proxyUrl}/recipes/${r.id}/information?includeNutrition=true`,
          { headers: rapidHeaders }
        ).then(res => res.json())
      )
    )

    // ── Step 3: discard recipes with no parsed instructions, keep 3 ───────
    const validRecipes = details
      .filter((d: any) => d.analyzedInstructions?.[0]?.steps?.length > 0)
      // .slice(0, 3)

    if (validRecipes.length === 0) {
      return new Response(JSON.stringify({ error: "No recipes with instructions found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── Step 4: clean — map to DB shape ───────────────────────────────────
    const cleaned = validRecipes.map((d: any) => {
      const steps = d.analyzedInstructions[0].steps
      const nutrients = d.nutrition?.nutrients ?? []
      const calories = nutrients.find((n: any) => n.name === "Calories")
      const protein  = nutrients.find((n: any) => n.name === "Protein")
      const fat      = nutrients.find((n: any) => n.name === "Fat")

      const nutritionText = `Calories: ${calories?.amount ?? "?"} ${calories?.unit ?? ""} | Protein: ${protein?.amount ?? "?"} ${protein?.unit ?? ""} | Fat: ${fat?.amount ?? "?"} ${fat?.unit ?? ""}`
      const ingredientsText = (d.extendedIngredients ?? []).map((ing: any) => `• ${ing.original}`).join("\n")
      const stepsText = steps.map((s: any) => `${s.number}. ${s.step}`).join("\n")

      return {
        title: d.title,
        description: `${nutritionText}\n\n${ingredientsText}\n\n${stepsText}`,
        servings: d.servings,
        prep_time: d.readyInMinutes,
      }
    })

    return new Response(JSON.stringify(cleaned), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (err) {
    console.error("Unhandled error:", err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
