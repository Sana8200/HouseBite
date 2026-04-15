import { useEffect, useState } from "react"
import { supabase } from "../../supabase"

type Recipe = {
  id: string
  title: string
  description: string | null
  servings: number | null
  prep_time: number | null
}

export function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("recipe")
      .select("id, title, description, servings, prep_time")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRecipes(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) return <p>Loading recipes...</p>
  if (!recipes.length) return <p>No recipes yet. Go to the dashboard and select some products.</p>

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Recipes</h1>
      {recipes.map((r) => (
        <div key={r.id} style={{ marginBottom: "2rem", borderBottom: "1px solid #ddd", paddingBottom: "1rem" }}>
          <h2>{r.title}</h2>
          <p>Servings: {r.servings} · Prep time: {r.prep_time} min</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{r.description}</p>
        </div>
      ))}
    </div>
  )
}
