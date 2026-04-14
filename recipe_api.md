# Recipe API Setup

## How it works

- The frontend (`searchRecipes.ts`) calls a Supabase Edge Function called `search-recipes`, passing the selected ingredient names.
- The edge function (`supabase/functions/search-recipes/index.ts`) calls the [Spoonacular API](https://spoonacular.com/food-api) with those ingredients and returns up to3 matching recipes.
- Results are passed via React Router state to the `/recipes` page for display.

## Local setup

1. Get a free Spoonacular API key at https://spoonacular.com/food-api/console#Dashboard

2. Add it to `supabase/functions/.env`:
   ```
   SPOONACULAR_API_KEY=your_key_here
   ```
   > This file is gitignored — never commit it.

3. Start Supabase locally and serve the functions:
   ```bash
   supabase start
   supabase functions serve
   ```

## Production

Set the secret in our linked Supabase project:
```bash
supabase secrets set SPOONACULAR_API_KEY=your_key_here
```

Then deploy the function:
```bash
supabase functions deploy search-recipes
```
