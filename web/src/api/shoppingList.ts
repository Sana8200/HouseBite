import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import type { InsertShoppingItem, ShoppingItem, ShoppingList } from "./schema";
import { supabase } from "../supabase";

export interface ShoppingListItemView {
  id: string;
  name: string;
  notes: string;
  purchased: boolean;
}

// Adapt the raw DB row to the shape expected by the page.
function mapShoppingItemToView(item: ShoppingItem): ShoppingListItemView {
  return {
    id: item.id,
    name: item.name,
    notes: item.notes ?? "",
    purchased: item.checked ?? false,
  };
}

export async function getOrCreateShoppingList( householdId: string ): Promise<PostgrestSingleResponse<ShoppingList>> {
  // The app only uses one list per household, so reuse the first existing one.
  const existingList = await supabase
    .from("shopping_list")
    .select("id, household_id, name, created_at")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingList.error) return existingList as PostgrestSingleResponse<ShoppingList>;
  if (existingList.data) return existingList as PostgrestSingleResponse<ShoppingList>;

  // Create the default list the first time this household opens the page.
  return supabase
    .from("shopping_list")
    .insert({ household_id: householdId, name: "Shopping List" })
    .select("id, household_id, name, created_at")
    .single();
}

export async function getShoppingItems(householdId: string): Promise<ShoppingListItemView[]> {
  // Resolve the household list first, then read the items linked to it.
  const shoppingList = await getOrCreateShoppingList(householdId);
  if (shoppingList.error) {
    throw new Error(shoppingList.error.message);
  }

  const { data, error } = await supabase
    .from("shopping_item")
    .select("id, shopping_list_id, name, notes, checked")
    .eq("shopping_list_id", shoppingList.data.id)
    .order("checked", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((item) => mapShoppingItemToView(item as ShoppingItem));
}

export async function addShoppingListItem( householdId: string, name: string, notes: string ): Promise<ShoppingListItemView> {
  // New items must always belong to the single shopping list of the household.
  const shoppingList = await getOrCreateShoppingList(householdId);
  if (shoppingList.error) {
    throw new Error(shoppingList.error.message);
  }

  const newShoppingItem: InsertShoppingItem = {
    shopping_list_id: shoppingList.data.id,
    name: name.trim(),
    notes: notes.trim() || null,
    checked: false,
  };

  const { data, error } = await supabase
    .from("shopping_item")
    .insert(newShoppingItem)
    .select("id, shopping_list_id, name, notes, checked")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapShoppingItemToView(data as ShoppingItem);
}

// Backward-compatible alias while callers are migrated to the shared name.
export const createShoppingItem = addShoppingListItem;

export async function toggleShoppingItem( itemId: string, checked: boolean ): Promise<ShoppingListItemView> {
  // Persist the current checkbox state directly on the row.
  const { data, error } = await supabase
    .from("shopping_item")
    .update({ checked })
    .eq("id", itemId)
    .select("id, shopping_list_id, name, notes, checked")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapShoppingItemToView(data as ShoppingItem);
}

export async function deleteShoppingItem(itemId: string): Promise<void> {
  // Removing the shopping item row in the DB
  const { error } = await supabase
    .from("shopping_item")
    .delete()
    .eq("id", itemId);

  if (error) {
    throw new Error(error.message);
  }
}
