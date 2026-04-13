# Household Food Manager — Database Report

## Overview

The database is built on **PostgreSQL** via Supabase. It manages households, family members, food products, receipts, shopping lists, and recipes. All primary keys use `UUID` for compatibility with Supabase Auth.

---

## Tables

| Table | Purpose |
|---|---|
| `household` | The core unit. Stores house name and monthly budget. |
| `family_member` | A user linked 1:1 to `auth.users`. Only stores the auth UUID — all other user info is retrieved from Supabase Auth directly. |
| `allocations` | Cross table linking members to households (many-to-many). |
| `food_restriction` | Enum-based list of dietary restrictions (vegan, gluten-free, etc). |
| `member_restriction` | Cross table linking members to their dietary restrictions. |
| `receipt` | A shopping trip. Stores store name, total spend, and date. |
| `product` | A food item belonging to a household, optionally linked to a receipt. |
| `product_specs` | Size, quantity, unit, expiry date, and price for a product. |
| `shopping_list` | A named list of items to buy, belonging to a household. |
| `shopping_item` | Individual items on a shopping list, with a checked/unchecked state. |
| `recipe` | A recipe with title, description, servings, and prep time. |
| `household_recipes` | Cross table linking households to recipes (many-to-many). |

---

## Relationships

- A **household** has many **family members** (via `allocations`), many **receipts**, many **products**, many **shopping lists**, and many **recipes**.
- A **family member** belongs to one or more households and can have multiple dietary restrictions.
- A **product** belongs to a household and optionally links to a receipt (nullable, for manually-added items).
- A **product** has one **product_specs** record with its physical details.
- A **shopping list** belongs to one household and contains many **shopping items**.
- **Recipes** are shared via `household_recipes` so multiple households can save the same recipe.

---

## Enums

Two custom types are defined to constrain values at the database level:

- `restriction_type` — dietary restrictions: `vegan`, `vegetarian`, `pescetarian`, `gluten_free`, `dairy_free`, `nut_free`, `halal`, `kosher`
- `size_unit` — product size units: `gr`, `ml`, `kg`, `L`

---

## Auth & User Trigger

Supabase manages authentication internally in a separate `auth.users` table. When a user signs up, they appear there automatically — but your custom `family_member` table has no way of knowing.

To bridge this, a **Postgres trigger** fires automatically every time a new user is created in `auth.users`, and inserts their UUID into `family_member`:

```sql
-- 1. The function that runs on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.family_member (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach it to auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

The function uses `SECURITY DEFINER` so it runs with elevated privileges, bypassing RLS during the insert. Without this, the trigger would be blocked by the `family_member` policy since the user has no session yet at the moment of signup.

The `family_member` table intentionally only stores the `id`. All other user info (name, email, metadata) is retrieved directly from Supabase Auth, avoiding duplication.

---

## Views

### `household_stats`

A read-only view that computes spending statistics per household. Nothing is stored — it derives everything live from the `receipt` table.

```sql
SELECT
  household_id,
  house_name,
  monthly_budget,
  total_spent,       -- SUM of all receipt totals
  avg_receipt_value, -- AVG of all receipt totals
  receipt_count      -- number of receipts (supermarket trips)
FROM household_stats;
```

Using a view instead of a stored column means the numbers are always accurate and never go stale.

---

## Row Level Security (RLS)

RLS is enabled on all 12 tables. This means the database itself enforces data access rules — not just the app. Even if someone has the Supabase public key, they cannot read another household's data.

### How it works

Every query automatically gets an invisible `WHERE` clause added by the policy. If a row doesn't pass the check, it is silently excluded from results — no error, just nothing returned.

Supabase exposes the logged-in user's ID via `auth.uid()`. All policies use this to identify who is asking.

### Helper function

To avoid repeating the same subquery in every policy, a helper function was created:

```sql
CREATE FUNCTION my_households()
  RETURNS SETOF uuid AS $$
    SELECT household_id FROM allocations WHERE member_id = auth.uid()
  $$
```

This returns the list of household UUIDs the current user belongs to, and is used across all household-scoped policies.

---

## Policies

| Table | Rule |
|---|---|
| `household` | User can only see/edit households they are a member of. |
| `family_member` | User can only see and edit their own profile. |
| `allocations` | User can only see their own household memberships. |
| `receipt` | User can only access receipts from their households. |
| `product` | User can only access products from their households. |
| `product_specs` | Accessible only if the parent product belongs to the user's household. |
| `shopping_list` | User can only access lists from their households. |
| `shopping_item` | Accessible only if the parent list belongs to the user's household. |
| `household_recipes` | User can only see recipe links for their households. |
| `recipe` | User can only see recipes linked to their households. |
| `food_restriction` | Any authenticated user can read (it's a shared reference list). |
| `member_restriction` | User can only see and edit their own dietary restrictions. |

---

## Resetting the Database

If you ever need to wipe and re-run the migration from scratch, drop everything in the correct order first to avoid dependency errors:

```sql
DROP TABLE IF EXISTS
  shopping_item, shopping_list, household_recipes, recipe,
  product_specs, product, receipt, member_restriction,
  food_restriction, allocations, family_member, household
CASCADE;

DROP VIEW IF EXISTS household_stats;
DROP TYPE IF EXISTS restriction_type;
DROP TYPE IF EXISTS size_unit;
```