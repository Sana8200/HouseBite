# Local Development Environment Setup

## What changed and why

We were all developing against the **production Supabase database**. This means every test user, junk data, and broken insert from any of the 7 devs went straight into the real database. Two people testing at the same time could easily step on each other's data. This setup fixes that by giving each developer their own local database.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) (`brew install supabase/tap/supabase`) — a command-line tool that manages the local Supabase stack. When you run `supabase start`, it spins up all the necessary Docker containers (PostgreSQL, Auth, Storage, API gateway, etc.) for you automatically

That's it. You do NOT need Node.js, npm, or Deno installed on your machine — Docker handles all of that.

## How to start developing

### 1. Set up your `.env`

Create your local environment file (**only needed the first time**):

> After this, you never need to touch this file again unless the env vars change.

**Mac/Linux:**
```bash
cp web/.env.example web/.env
```

**Windows (cmd):**
```cmd
copy web\.env.example web\.env
```

This points the frontend to your local Supabase instead of production.

### 2. Start the local Supabase (database, auth, storage, etc.)

```bash
supabase start
```

First time takes a while (downloads Docker images). After that it's fast.

#### Why `.env.example` and `.env` are separate files

The `.env` file is gitignored — it never gets committed. The reason is simple: the `.env` file's main purpose is to hold the connection to whatever Supabase instance you're targeting. Right now it points to local, but if someone temporarily pointed it to production for testing and accidentally committed it, everyone pulling that change would suddenly be hitting the production database without realizing it. In the future it could also hold secret keys that must never be in git.

The `.env.example` is committed to git and acts as a template with the correct local development values. Everyone copies it to create their own `.env`. The values in `.env.example` are safe to commit — they only work with the local Supabase instance that runs on your machine.

### 3. Start the frontend

```bash
docker compose up --build
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. (Optional) Connect DBeaver to your local database

| Field    | Value       |
|----------|-------------|
| Host     | `127.0.0.1` |
| Port     | `54322`     |
| Database | `postgres`  |
| Username | `postgres`  |
| Password | `postgres`  |

Disable SSL in the connection settings (SSL tab -> uncheck "Use SSL").

Tables are in: **postgres > Schemas > public > Tables**

## How it works

```
Your machine (browser)          Your machine (Docker)
http://localhost:5173    --->    Frontend (Vite + React)
                                      |
                                      v
                                Local Supabase (http://localhost:54321)
                                      |
                                      v
                                Local PostgreSQL (port 54322)
```

Nothing touches production. Your `.env` points to `host.docker.internal:54321` (your local Supabase), not to `ikemmjauwrahrrlgewta.supabase.co` (production).

## Database migrations

The database schema is managed through migration files in `supabase/migrations/`.

- `00000000000000_startPoint.sql` — the initial schema (all tables, RLS policies, functions, views).

When you run `supabase start` or `supabase db reset`, these migrations are applied automatically. You don't need to run any SQL manually.

### Adding new tables or modifying the schema

1. Create a new migration file with an incremented number:
   ```
   supabase/migrations/00000000000001_describe_your_change.sql
   ```
2. Write your SQL in that file (CREATE TABLE, ALTER TABLE, etc.).
3. Run `supabase db reset` to recreate the local database with all migrations applied.
4. Commit the migration file.

Other devs pull your changes and run `supabase db reset` to get the updated schema.

### Pushing migrations to production

```bash
supabase db push --project-ref ikemmjauwrahrrlgewta
```

This only runs migrations that haven't been applied to production yet.

## Seed data (`supabase/seeds/`)

Migrations create the structure (tables, columns, policies). Seeds fill those tables with **test data** (fake users, fake households, fake products, etc.) so you don't develop against an empty database.

The `supabase/seeds/` directory is where seed files go. Right now it's empty — no seed data has been written yet.

Supabase only runs **one specific file** automatically: `supabase/seed.sql`. If that file exists, it gets executed after migrations when you run `supabase db reset`. Files inside `supabase/seeds/` are NOT executed automatically — the directory is just for organizing different seed scripts. When you want to use one, copy its contents into `supabase/seed.sql` or reference it in `supabase/config.toml`.

Seeds only run locally — they are never applied to production.

## Daily workflow summary

```bash
supabase start              # start local database (keep running)
docker compose up --build   # start frontend
# ... develop ...
docker compose down         # stop frontend
supabase stop               # stop local database
```

## Key files

| File | Purpose |
|------|---------|
| `web/Dockerfile` | Builds the frontend container (Node.js + dependencies) |
| `docker-compose.yml` | Orchestrates the frontend service |
| `web/.env` | Local env vars pointing to local Supabase (gitignored) |
| `web/.env.example` | Template to create your `.env` from |
| `supabase/config.toml` | Supabase CLI config (JWT secret, edge functions). The JWT secret is defined here so that all devs generate the same authentication keys — without it, each machine could produce different keys and the `.env.example` values wouldn't work for everyone |
| `supabase/migrations/` | SQL files that define the database schema |
| `supabase/seeds/` | Test data files (empty for now, never applied to production) |
| `.gitignore` | Prevents `.env`, `node_modules`, IDE files from being committed |

## Important rules

- **Never commit `web/.env`** — it's gitignored for a reason.
- **Never develop against production** — your `.env` should always point to `localhost`, not to `ikemmjauwrahrrlgewta.supabase.co`.
- **Never edit old migration files** — create a new one instead. Editing an already-applied migration does nothing in production.

## Known issues and fixes

### "Failed to resolve import" after a branch merge adds a new npm dependency

**What happens:** A teammate merges a branch that adds a new package to `package.json` (e.g. `tesseract.js`). You pull the changes and run `docker compose up`, but Vite throws an error like:

```
Failed to resolve import "tesseract.js" from "src/pages/scan/Scan.tsx". Does the file exist?
```

**Why:** Docker Compose mounts your local `web/` folder into the container, but keeps `node_modules` in a separate anonymous volume that was created when you first built the image. That volume is never automatically updated — it still contains the old `node_modules` from before the new dependency was added. Rebuilding the image alone is not enough because Docker reuses the existing anonymous volume.

**Fix:** Tear down the containers and delete the anonymous volumes, then rebuild:

```bash
docker compose down -v
docker compose build --no-cache web
docker compose up web
```

The `-v` flag deletes the anonymous `node_modules` volume, forcing Docker to use the freshly installed one from the new image.

---
