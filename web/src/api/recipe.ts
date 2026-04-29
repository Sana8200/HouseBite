import type { PostgrestSingleResponse } from "@supabase/supabase-js"
import type { FunctionsResponse } from "@supabase/functions-js"
import { supabase } from "../supabase"
import type { Recipe } from "./schema"

export interface SearchRecipe {
  title: string
  description: string | null
  servings: number | null
  prep_time: number | null
}

export interface SearchRecipesResult {
  recipes: SearchRecipe[],
  noExactRecipe: boolean;
  matchedIngredients: string[];
  unmatchedIngredients: string[];
}

// Calls the edge function with the ingredients the user picked and the
// restrictions they chose to keep active in the modal. The edge function
// will pass these straight to Spoonacular instead of re-fetching from the DB.
export const searchRecipes = async (
  ingredients: string[],
  householdId: string,
  diets: string[],
  intolerances: string[],
): Promise<SearchRecipesResult> => {
  const result = await supabase.functions.invoke<SearchRecipe[]>("search-recipes", {
    body: {
      ingredients: ingredients.join(","),
      household_id: householdId,
      diets,
      intolerances,
    },
  })

  if (result.response?.status == 404) {
    throw new Error((await result.response?.json() as {error: string}).error)
  } 
  else if (result.error) throw result.error
  const recipes = result.data ?? []

  const matchedIngredients = ingredients.filter((ing) =>
    recipes.some(r =>
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

export async function saveRecipe(recipe: SearchRecipe): Promise<FunctionsResponse<null>> {
  return await supabase.functions.invoke("save-recipe", {
    body: { recipe }
  })
}

export async function getRecipes(): Promise<PostgrestSingleResponse<Recipe[]>> {
  return await supabase
    .from("recipe")
    .select()
    .order("created_at", { ascending: false })
}
