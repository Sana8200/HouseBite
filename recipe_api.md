# Recipe Feature

## Overview

fetch recipes via Spoonacular, and save favourites to the database. Dietary restrictions and food intolerances set by household members are automatically applied to every search.

---

## Local setup

1. Copy the course proxy credentials into `supabase/functions/.env`:
   ```
   SPOONACULAR_PROXY_URL=https://brfenergi.se/iprog/group/399/https://spoonacular-recipe-food-nutrition-v1.p.rapidapi.com
   SPOONACULAR_PROXY_KEY=<key>
   ```
   > This file is gitignored — never commit it.

2. Start Supabase and serve both functions **on the host machine** (not inside Docker):
   ```bash
   supabase start
   supabase functions serve --env-file supabase/functions/.env
   ```


> The `--env-file` flag is required. Without it, the proxy credentials are not loaded and all recipe searches will fail. You can either run this or just reset the db with "supabase db reset" which re-runs all migrations in order including the seed for food_restriction.

---

## Production deployment

Set the secrets in the linked Supabase project:
```bash
supabase secrets set SPOONACULAR_PROXY_URL=https://brfenergi.se/iprog/group/399/https://...
supabase secrets set SPOONACULAR_PROXY_KEY=<key>
```

Deploy both functions:
```bash
supabase functions deploy search-recipes
supabase functions deploy save-recipe
```

## Full flow

```
Dashboard → select products → Find Recipes button
    ↓
api/recipe.ts  (frontend lib)
    ↓
search-recipes  (Supabase Edge Function)
    ↓  1. fetch household members' diet/intolerance restrictions from DB
    ↓  2. complexSearch — applies diet + intolerance filters, returns up to 9 candidate IDs
    ↓  3. /recipes/{id}/information — fetch full details (nutrition, ingredients, instructions) per candidate
    ↓  4. discard any without parsed instructions, keep first 3
    ↓  5. return cleaned recipes
    ↓
/recipes page — shows search results with "Add to favorites" button
    ↓  (on click)
save-recipe  (Supabase Edge Function)
    ↓  inserts into `recipe` table + `household_recipes` link table
    ↓
/recipes page — Favorites section always fetches saved recipes from DB on load
```

---

## Edge Functions

### `search-recipes`

**Triggered by:** clicking "Find Recipes" on the Dashboard after selecting products.

**Request body:**
```json
{ "ingredients": "milk,eggs,flour", "household_id": "<uuid>" }
```

**What it does:**
1. Reads all members of the household from the `allocations` table
2. Fetches their food restrictions from `member_restriction` → `food_restriction`
3. Separates restrictions into:
   - `diet` (e.g. vegan, vegetarian, ketogenic) → passed as `diet` param to Spoonacular
   - `intolerance` (e.g. dairy, gluten, peanut) → passed as `intolerances` param
4. Calls Spoonacular `complexSearch` with:
   - `includeIngredients` — the selected product names
   - `diet` — all unique diets across household members (comma-separated)
   - `intolerances` — all unique intolerances across household members
   - `instructionsRequired=true` — pre-filters recipes without instructions
   - `number=9` — fetches extra candidates to have room to discard failures
5. For each candidate, fetches full details via `/recipes/{id}/information?includeNutrition=true` — this is a separate call per recipe because `complexSearch` does not reliably return `analyzedInstructions` in its results
6. Discards any recipe where `analyzedInstructions[0].steps` is empty, keeps the first 3 valid ones
7. Returns up to 3 recipes, each cleaned into this shape:

```json
{
  "title": "Pancakes",
  "description": "Calories: 320 kcal | Protein: 9 g | Fat: 12 g\n\n• 1 cup flour\n• 2 eggs\n...\n\n1. Mix dry ingredients.\n2. Add eggs and milk...",
  "servings": 4,
  "prep_time": 20
}
```

The `description` field stores three sections separated by `\n\n`:
1. Nutrition line (calories, protein, fat)
2. Ingredients list (one per line, prefixed with `•`)
3. Step-by-step instructions (numbered)

---

### `save-recipe`

**Triggered by:** clicking "Add to favorites" on a search result card.

**Request body:**
```json
{
  "recipe": { "title": "...", "description": "...", "servings": 4, "prep_time": 20 },
  "household_id": "<uuid>"
}
```

**What it does:**
1. Inserts the recipe into the `recipe` table (using service role key to bypass RLS)
2. Inserts a row into `household_recipes` linking the recipe to the household

---

## Database tables involved

| Table | Purpose |
|---|---|
| `recipe` | Stores saved favourite recipes |
| `household_recipes` | Links recipes to households (many-to-many) |
| `allocations` | Used to find all members of a household |
| `food_restriction` | Master list of diets and intolerances (seeded, Spoonacular-compatible names) |
| `member_restriction` | Links individual members to their restrictions |

---

## Frontend pages

### `/recipes`

- **Favorites section** — always fetched from DB on mount, persists across reloads. Each card shows title, servings, prep time, and nutrition. Click to expand ingredients and instructions. "Remove from favorites" button deletes the recipe from DB instantly.
- **Search Results section** — only shown when navigating from the Dashboard (passed via React Router state). Shows the same card format with an "Add to favorites" button.

### Dashboard (`/dashboard`)

- The "Products in Danger" section lists products expiring soon. Users can select products (checkboxes) and click "Find Recipes".
- The bottom section shows a carousel of saved favourite recipes fetched from DB. Clicking a recipe card navigates to `/recipes` and auto-opens that card.

---


