import { useEffect, useRef, useState } from "react"
import { useLocation} from "react-router-dom"
import { supabase } from "../../supabase"
import "./recipes.css"
import { Paper, Text, SimpleGrid, Stack, ActionIcon, Button} from "@mantine/core"
import { IconX } from "@tabler/icons-react"

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
                Remove from favourites
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
  const [favourites, setFavourites] = useState<DbRecipe[]>([])
  const [loadingFavourites, setLoadingFavourites] = useState(true)
  const [selectedRecipe, setSelectedRecipe] = useState<DbRecipe | null>(null)

  // tracks which card is open: "fav-{id}" or "search-{index}"
  const [openId, setOpenId] = useState<string | null>(
    openRecipeId ? `fav-${openRecipeId}` : null
  )

  const toggle = (key: string) => setOpenId(prev => prev === key ? null : key)

  const fetchFavourites = () =>
    supabase
      .from("recipe")
      .select("id, title, description, servings, prep_time")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const list = data ?? []
        setFavourites(list)
        setLoadingFavourites(false)
        if (openRecipeId) {
          const match = list.find(r => r.id === openRecipeId)
          if (match) setSelectedRecipe(match)
        }
      })

  useEffect(() => { void fetchFavourites() }, [])

  const handleDelete = async (id: string) => {
    await supabase.from("recipe").delete().eq("id", id)
    setFavourites(prev => prev.filter(r => r.id !== id))
    setOpenId(null)
  }

  const handleSave = async (recipe: SearchRecipe, index: number) => {
    if (favourites.some(f => f.title === recipe.title)) {
      setSaved(prev => new Set(prev).add(index))
      return
    }
    setSaving(index)
    const { error } = await supabase.functions.invoke("save-recipe", {
      body: { recipe }
    })
    setSaving(null)
    if (!error) {
      setSaved(prev => new Set(prev).add(index))
      void fetchFavourites()
    }
  }

  return (
    <div className="recipes-page">
      {searchResults.length > 0 && (
        <>
          <h1>Search Results</h1>
          <p>Click a recipe to see instructions. Add it to favourites to save it.</p>
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
                    disabled={saved.has(i) || saving === i || favourites.some(f => f.title === r.title)}
                    onClick={() => handleSave(r, i)}
                  >
                    {saved.has(i) || favourites.some(f => f.title === r.title) ? "Already in favourites" : saving === i ? "Saving..." : "Add to favourites"}
                  </button>
                }
              />
            ))}
          </RecipeCarousel>
        </>
      )}

      <h1>Favourites</h1>
   {loadingFavourites ? (
  <p>Loading...</p>
) : favourites.length === 0 ? (
  <p>No favourites yet. Search for recipes and add some.</p>
) : (
  <div style={{ display: "flex", gap: "20px", alignItems: "stretch" }}>

    {/* LEFT - GRID */}
    <div style={{ flex: 1 }}>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
        {favourites.map(r => (
          <Paper
            key={r.id}
            p="md"
            radius="md"
            withBorder
            shadow="sm"
            style={{ cursor: "pointer", position: "relative" }}
            onClick={() => setSelectedRecipe(r)}
          >
            <Stack gap="xs">
              <Text fw={600}>{r.title}</Text>

              <Text size="sm" c="dimmed">
                Servings: {r.servings ?? "?"} · Prep: {r.prep_time ?? "?"} min
              </Text>

              <Text size="xs" c="dimmed">
                {r.description?.split("\n\n")[0] ?? ""}
              </Text>
            </Stack>

            <ActionIcon
              variant="subtle"
              color="red"
              onClick={(e) => {
                e.stopPropagation()
                if (confirm("Remove from favourites?")) {
                  handleDelete(r.id)
                }
              }}
              style={{ position: "absolute", top: 8, right: 8 }}
            >
              <IconX size={16} />
            </ActionIcon>
          </Paper>
        ))}
      </SimpleGrid>
    </div>

    {/* RIGHT - DETAIL PANEL (ONLY FAVOURITES) */}
    <div style={{ flex: 1 }}>
      {selectedRecipe ? (
        <Paper p="lg" radius="md" withBorder shadow="md">
          <Stack>
            
            <Button
            variant="subtle"
            size="xs"
            onClick={() => setSelectedRecipe(null)}
          >
            Close
          </Button>
          
            <Text fw={700} size="lg">
              {selectedRecipe.title}
            </Text>

            <Text size="sm" c="dimmed">
              Servings: {selectedRecipe.servings ?? "?"} · Prep: {selectedRecipe.prep_time ?? "?"} min
            </Text>

            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {selectedRecipe.description}
            </Text>
          </Stack>
        </Paper>
      ) : (
        <Text c="dimmed">Select a recipe to see details</Text>
      )}
    </div>

  </div>
)}
 </div>
)}
