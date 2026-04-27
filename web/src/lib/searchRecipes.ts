import { supabase } from "../supabase"

// Calls the edge function with the ingredients the user picked and the
// restrictions they chose to keep active in the modal. The edge function
// will pass these straight to Spoonacular instead of re-fetching from the DB.
export const searchRecipes = async (
  ingredients: string[],
  householdId: string,
  diets: string[],
  intolerances: string[],
) => {
  const { data, error } = await supabase.functions.invoke("search-recipes", {
    body: {
      ingredients: ingredients.join(","),
      household_id: householdId,
      diets,
      intolerances,
    },
  })

  if (error) throw error
  const recipes = data ?? []

  const matchedIngredients = ingredients.filter((ing) =>
  recipes.some((r: any) =>
    r.description?.toLowerCase().includes(ing.toLowerCase())
    
  )
)

const unmatchedIngredients = ingredients.filter(
  (ing) => !matchedIngredients.includes(ing)
)

return {
  recipes,
  noExactRecipe: matchedIngredients.length === 0,
  matchedIngredients,
  unmatchedIngredients,

}
}