import "@supabase/functions-js/edge-runtime.d.ts"

Deno.serve(async (req) => {
  const { ingredients } = await req.json()

  const apiKey = Deno.env.get("SPOONACULAR_API_KEY")
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing SPOONACULAR_API_KEY" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  const url = `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${encodeURIComponent(ingredients)}&number=3&apiKey=${apiKey}`

  const response = await fetch(url)
  const data = await response.json()

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  })
})
