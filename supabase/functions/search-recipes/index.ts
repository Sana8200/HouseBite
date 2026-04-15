  // supabase/functions/search-recipes/index.ts
  import "@supabase/functions-js/edge-runtime.d.ts"
  import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

  Deno.serve(async (req) => {
    try {
    const { ingredients, household_id } = await req.json()

    const proxyUrl = Deno.env.get("SPOONACULAR_PROXY_URL")
    const proxyKey = Deno.env.get("SPOONACULAR_PROXY_KEY")
    if (!proxyUrl || !proxyKey) {
      return new Response(JSON.stringify({ error: "Missing proxy credentials" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    const rapidHeaders = {
      "X-DH2642-Key": proxyKey,
      "X-DH2642-Stud": "399",
      "X-RapidAPI-Host": "spoonacular-recipe-food-nutrition-v1.p.rapidapi.com",
    }

    // find recipes by ingredients
    const searchUrl = `${proxyUrl}/recipes/findByIngredients?ingredients=${encodeURIComponent(ingredients)}&number=3`
    const rawRecipes = await fetch(searchUrl, { headers: rapidHeaders }).then(r => r.json())

    if (!Array.isArray(rawRecipes)) {
      return new Response(JSON.stringify({ error: "Spoonacular error", detail: rawRecipes }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    // fetch full details for each recipe
    const detailPromises = rawRecipes.map((r: { id: number }) =>
      fetch(`${proxyUrl}/recipes/${r.id}/information?includeNutrition=true`, { headers: rapidHeaders })
        .then(res => res.json())
    )
    const details = await Promise.all(detailPromises)
    // each detail has: title, summary, servings, readyInMinutes, image, ...

    // clean — map Spoonacular shape → your DB shape
    const cleaned = details.map((d: any) => {
      const steps = d.analyzedInstructions?.[0]?.steps ?? []
      const nutrients = d.nutrition?.nutrients ?? []
      const calories = nutrients.find((n: any) => n.name === "Calories")
      const protein  = nutrients.find((n: any) => n.name === "Protein")
      const fat      = nutrients.find((n: any) => n.name === "Fat")

      const nutritionText = `Calories: ${calories?.amount ?? "?"} ${calories?.unit ?? ""} | Protein: ${protein?.amount ?? "?"} ${protein?.unit ?? ""} | Fat: ${fat?.amount ?? "?"} ${fat?.unit ?? ""}`
      const stepsText = steps.map((s: any) => `${s.number}. ${s.step}`).join("\n")

      return {
        title: d.title,
        description: `${nutritionText}\n\n${stepsText}`,
        servings: d.servings,
        prep_time: d.readyInMinutes,
      }
    })

    // use service role key to bypass RLS for inserts — edge function is trusted server-side code
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    const { data: inserted, error: insertError } = await supabase
      .from("recipe")
      .insert(cleaned)
      .select("id, title, description, servings, prep_time")

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    // link recipes to the household
    const links = inserted.map((r: { id: string }) => ({
      household_id,
      recipe_id: r.id,
    }))

    const { error: linkError } = await supabase
      .from("household_recipes")
      .insert(links)

    if (linkError) {
      return new Response(JSON.stringify({ error: linkError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    // return the cleaned recipes to the frontend
    return new Response(JSON.stringify(inserted), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("Unhandled error:", err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
  })