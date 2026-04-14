import { supabase } from "../supabase"

export const searchRecipes = async (ingredients: string[]) => {
  const { data, error } = await supabase.functions.invoke("search-recipes", {
    body: { ingredients: ingredients.join(",") }
  })

  if (error) throw error
  return data
}