import { useEffect, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { supabase } from "../../supabase"
import "./recipes.css"

export type DbRecipe = {
  id: string
  title: string
  description: string | null
  servings: number | null
  prep_time: number | null
}

type SearchRecipe = Omit<DbRecipe, "id">

function parseDescription(description: string | null): { nutrition: string; ingredients: string; steps: string } {
  if (!description) return { nutrition: "", ingredients: "", steps: "" }
  const [nutrition = "", ingredients = "", ...rest] = description.split("\n\n")
  return { nutrition, ingredients, steps: rest.join("\n\n") }
}

export function RecipeCard({
  recipe,
  isOpen,
  onToggle,
  action,
  onDelete,
}: {
  recipe: SearchRecipe | DbRecipe
  isOpen: boolean
  onToggle: () => void
  action?: React.ReactNode
  onDelete?: () => void
}) {
  const { nutrition, ingredients, steps } = parseDescription(recipe.description)

  return (
    <div className="recipe-card" onClick={onToggle}>
      <div className="recipe-card-body">
        <h3 className="recipe-card-title">{recipe.title}</h3>
        <p className="recipe-card-meta">Servings: {recipe.servings ?? "?"} · Prep: {recipe.prep_time ?? "?"} min</p>
        <p className="recipe-card-nutrition">{nutrition}</p>
        {isOpen && (
          <div onClick={e => e.stopPropagation()}>
            {ingredients && (
              <div className="recipe-card-instructions">
                <strong>Ingredients:</strong>
                <p style={{ whiteSpace: "pre-wrap", margin: "4px 0 0" }}>{ingredients}</p>
              </div>
            )}
            {steps && (
              <div className="recipe-card-instructions">
                <strong>Instructions:</strong>
                <p style={{ whiteSpace: "pre-wrap", margin: "4px 0 0" }}>{steps}</p>
              </div>
            )}
            {onDelete && (
              <button className="recipe-card-delete" onClick={onDelete}>
                Remove from favorites
              </button>
            )}
          </div>
        )}
        {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
      </div>
    </div>
  )
}

export function RecipeCarousel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 300, behavior: "smooth" })

  return (
    <div className="recipe-carousel-wrapper">
      <button className="recipe-carousel-arrow" onClick={() => scroll(-1)}>‹</button>
      <div className="recipe-carousel" ref={ref}>{children}</div>
      <button className="recipe-carousel-arrow" onClick={() => scroll(1)}>›</button>
    </div>
  )
}

export function Recipes() {
  const location = useLocation()
  const searchResults: SearchRecipe[] = location.state?.recipes ?? []
  const householdId: string = location.state?.householdId
  const openRecipeId: string | undefined = location.state?.openRecipeId

  const [saved, setSaved] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState<number | null>(null)
  const [favorites, setFavorites] = useState<DbRecipe[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(true)

  // tracks which card is open: "fav-{id}" or "search-{index}"
  const [openId, setOpenId] = useState<string | null>(
    openRecipeId ? `fav-${openRecipeId}` : null
  )

  const toggle = (key: string) => setOpenId(prev => prev === key ? null : key)

  const fetchFavorites = () =>
    supabase
      .from("recipe")
      .select("id, title, description, servings, prep_time")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setFavorites(data ?? [])
        setLoadingFavorites(false)
      })

  useEffect(() => { void fetchFavorites() }, [])

  const handleDelete = async (id: string) => {
    await supabase.from("recipe").delete().eq("id", id)
    setFavorites(prev => prev.filter(r => r.id !== id))
    setOpenId(null)
  }

  const handleSave = async (recipe: SearchRecipe, index: number) => {
    setSaving(index)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.functions.invoke("save-recipe", {
      body: { recipe, member_id: user?.id }
    })
    setSaving(null)
    if (!error) {
      setSaved(prev => new Set(prev).add(index))
      void fetchFavorites()
    }
  }

  return (
    <div className="recipes-page">
      {searchResults.length > 0 && (
        <>
          <h1>Search Results</h1>
          <p>Click a recipe to see instructions. Add it to favorites to save it.</p>
          <RecipeCarousel>
            {searchResults.map((r, i) => (
              <RecipeCard
                key={i}
                recipe={r}
                isOpen={openId === `search-${i}`}
                onToggle={() => toggle(`search-${i}`)}
                action={
                  <button
                    className="recipe-card-save"
                    disabled={saved.has(i) || saving === i}
                    onClick={() => handleSave(r, i)}
                  >
                    {saved.has(i) ? "Added to favorites" : saving === i ? "Saving..." : "Add to favorites"}
                  </button>
                }
              />
            ))}
          </RecipeCarousel>
        </>
      )}

      <h1>Favorites</h1>
      {loadingFavorites ? (
        <p>Loading...</p>
      ) : favorites.length === 0 ? (
        <p>No favorites yet. Search for recipes and add some.</p>
      ) : (
        <RecipeCarousel>
          {favorites.map(r => (
            <RecipeCard
              key={r.id}
              recipe={r}
              isOpen={openId === `fav-${r.id}`}
              onToggle={() => toggle(`fav-${r.id}`)}
              onDelete={() => handleDelete(r.id)}
            />
          ))}
        </RecipeCarousel>
      )}
    </div>
  )
}
