import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { supabase } from "../../supabase"

type Recipe = {
  title: string
  description: string | null
  servings: number | null
  prep_time: number | null
}

type SavedRecipe = Recipe & { id: string }

export function Recipes() {
  const location = useLocation()
  const searchResults: Recipe[] = location.state?.recipes ?? []
  const householdId: string = location.state?.householdId

  const [saved, setSaved] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState<number | null>(null)
  const [favorites, setFavorites] = useState<SavedRecipe[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(true)

  useEffect(() => {
    supabase
      .from("recipe")
      .select("id, title, description, servings, prep_time")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setFavorites(data ?? [])
        setLoadingFavorites(false)
      })
  }, [])

  const handleSave = async (recipe: Recipe, index: number) => {
    setSaving(index)
    const { error } = await supabase.functions.invoke("save-recipe", {
      body: { recipe, household_id: householdId }
    })
    setSaving(null)
    if (!error) {
      setSaved(prev => new Set(prev).add(index))
      // refresh favorites list
      supabase
        .from("recipe")
        .select("id, title, description, servings, prep_time")
        .order("created_at", { ascending: false })
        .then(({ data }) => setFavorites(data ?? []))
    }
  }

  return (
    <div style={{ padding: "2rem" }}>
      {searchResults.length > 0 && (
        <>
          <h1>Search Results</h1>
          {searchResults.map((r, i) => (
            <div key={i} style={{ marginBottom: "2rem", borderBottom: "1px solid #ddd", paddingBottom: "1rem" }}>
              <h2>{r.title}</h2>
              <p>Servings: {r.servings} · Prep time: {r.prep_time} min</p>
              <p style={{ whiteSpace: "pre-wrap" }}>{r.description}</p>
              <button
                onClick={() => handleSave(r, i)}
                disabled={saved.has(i) || saving === i}
              >
                {saved.has(i) ? "Added to favorites" : saving === i ? "Saving..." : "Add to favorites"}
              </button>
            </div>
          ))}
        </>
      )}

      <h1>Favorites</h1>
      {loadingFavorites ? (
        <p>Loading...</p>
      ) : favorites.length === 0 ? (
        <p>No favorites yet. Search for recipes and add some.</p>
      ) : (
        favorites.map((r) => (
          <div key={r.id} style={{ marginBottom: "2rem", borderBottom: "1px solid #ddd", paddingBottom: "1rem" }}>
            <h2>{r.title}</h2>
            <p>Servings: {r.servings} · Prep time: {r.prep_time} min</p>
            <p style={{ whiteSpace: "pre-wrap" }}>{r.description}</p>
          </div>
        ))
      )}
    </div>
  )
}
