/**
 * This mirrors the schema in the database.
 * 
 * If you want to fetch partial row you can use the Pick typescript generic.
 * For example to only pick the id and name of a household:
 * type SimpleHousehold = Pick<Household, "id" | "house_name">;
 */

type OmitOnInsert<T> = Omit<T, "id" | "created_at">;

export interface FamilyMember {
    id: string;
}

export interface Household {
    id: string;
    house_name: string;
    monthly_budget: number | null;
    created_at: string | null;
    invite_id: string | null;
}

export type InsertHousehold = OmitOnInsert<Household>;

export interface FoodRestriction {
    id: string;
    category: string;
    name: string;
}

export type InsertFoodRestriction = OmitOnInsert<FoodRestriction>;

export interface Recipe {
    id: string;
    title: string;
    description: string | null;
    servings: number | null;
    prep_time: number | null;
    created_at: string | null;
}

export type InsertRecipe = OmitOnInsert<Recipe>;

export interface ShoppingList {
    id: string;
    household_id: string;
    name: string;
    created_at: string | null;
}

export type InsertShoppingList = OmitOnInsert<ShoppingList>;

export interface ShoppingItem {
    id: string;
    shopping_list_id: string;
    name: string;
    quantity: number;
    size: string | null;
    checked: boolean | null;
}

export type InsertShoppingItem = OmitOnInsert<ShoppingItem>;

export interface HouseholdFoodRestriction {
    household_id: string;
    restriction_id: string;
}

export interface Receipt {
    id: string;
    household_id: string;
    store_name: string | null;
    total: number | null;
    purchase_at: string;
    created_at: string | null;
    buyer_id: string | null;
}

export type InsertReceipt = OmitOnInsert<Receipt>;

export interface Allocations {
    restriction_id: string;
    member_id: string;
}

export interface MemberRecipes {
    member_id: string;
    recipe_id: string;
    created_at: string | null;
}

export type InsertMemberRecipes = OmitOnInsert<MemberRecipes>;

export interface MemberRestriction {
    member_id: string;
    restriction_id: string;
}

export interface Product {
    id: string;
    household_id: string;
    receipt_id: string | null;
    name: string;
    created_at: string | null;
}

export type InsertProduct = OmitOnInsert<Product>;

export type ProductSizeUnit = "gr" | "ml" | "kg" | "L";

export interface ProductSpecs {
    product_id: string;
    size: string | null;
    quantity: number;
    unit: ProductSizeUnit | null;
    expiration_date: string | null;
    price: number | null;
}

export type InsertProductSpecs = OmitOnInsert<ProductSpecs>;
