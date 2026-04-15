  // supabase/functions/search-recipes/index.ts
  import "@supabase/functions-js/edge-runtime.d.ts"

  Deno.serve(async (req) => {
    try {
    const { ingredients } = await req.json()

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

    // fetch more candidates than needed so we can discard those without instructions
    const searchUrl = `${proxyUrl}/recipes/findByIngredients?ingredients=${encodeURIComponent(ingredients)}&number=9`
    const rawRecipes = await fetch(searchUrl, { headers: rapidHeaders }).then(r => r.json())

    if (!Array.isArray(rawRecipes)) {
      return new Response(JSON.stringify({ error: "Spoonacular error", detail: rawRecipes }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    // fetch full details for each candidate
    const details = await Promise.all(
      rawRecipes.map((r: { id: number }) =>
        fetch(`${proxyUrl}/recipes/${r.id}/information?includeNutrition=true`, { headers: rapidHeaders })
          .then(res => res.json())
      )
    )

    // discard recipes without instructions, keep first 3 valid ones
    const validDetails = details
      .filter((d: any) => d.analyzedInstructions?.[0]?.steps?.length > 0)
      .slice(0, 3)

    // clean — map Spoonacular shape → your DB shape
    const cleaned = validDetails.map((d: any) => {
      const steps = d.analyzedInstructions[0].steps
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

    if (cleaned.length === 0) {
      return new Response(JSON.stringify({ error: "No recipes with instructions found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify(cleaned), {
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