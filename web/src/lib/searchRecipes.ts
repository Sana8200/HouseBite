 // web/src/lib/searchRecipes.ts                                                                                                      
 import { supabase } from "../supabase"

 export const searchRecipes = async (ingredients: string[], householdId: string) => {
   const { data, error } = await supabase.functions.invoke("search-recipes", {
     body: { ingredients: ingredients.join(","), household_id: householdId }
   })

   if (error) throw error
   return data
 }