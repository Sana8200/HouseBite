<div align="center">

# 🍽️ HouseBite

**Smart household food management — track your pantry, scan receipts, discover recipes, and reduce waste together.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-housebite.app-4CAF50?style=for-the-badge&logo=vercel)](https://housebite.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Vite](https://img.shields.io/badge/Vite-Build-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)

</div>

---

## What is HouseBite?

HouseBite is a web app for households and shared living spaces to manage food together. It helps you:

- Know what's in your fridge and when it expires
- Scan grocery receipts to auto-log purchases
- Find recipes based on what you already have
- Coordinate a shared shopping list
- Track your household's grocery budget

Built as a university project for **ICT II (1305)**.

---

## Features

| Feature | Description |
|---|---|
| **Pantry Tracker** | Monitor food inventory with expiry dates; get alerts for items expiring soon |
| **Receipt Scanner** | Photograph a receipt and have items auto-extracted via OCR into your pantry |
| **Recipe Discovery** | Search recipes filtered by ingredients you own and household dietary restrictions |
| **Shopping List** | Shared, real-time list with checkboxes and notes for your whole household |
| **Budget Tracking** | Set a monthly budget per household and track spending over time |
| **Multi-Household** | Belong to multiple households, switch context instantly |
| **Dietary Restrictions** | Per-member diet and intolerance preferences respected across recipe search |
| **PWA Support** | Installable as a Progressive Web App on mobile and desktop |

---

## Tech Stack

**Frontend**
- [React 19](https://react.dev/) + TypeScript (strict)
- [Vite](https://vitejs.dev/) with React Compiler (auto-memoization)
- [Mantine](https://mantine.dev/) UI component library
- [React Router 7](https://reactrouter.com/) for client-side navigation

**Backend & Database**
- [Supabase](https://supabase.com/) — PostgreSQL, Auth, Storage, Row-Level Security
- [Deno](https://deno.com/) Edge Functions (receipt scanning, recipe proxy)

**External APIs**
- [Spoonacular](https://spoonacular.com/food-api) — Recipe search and nutrition data

**Tooling**
- Docker & Docker Compose for local development
- ESLint 9 with TypeScript rules

---

## Getting Started

### Prerequisites

- [Node.js LTS 24](https://nodejs.org/en/download)
- [Deno](https://deno.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/your-username/HouseBite.git
cd HouseBite

# 2. Set up environment variables
cp web/.env.example web/.env

# 3. Start local Supabase (database + auth + storage)
supabase start

# 4. Serve edge functions
supabase functions serve --env-file supabase/functions/.env &

# 5. Start the frontend
docker compose up --build
```

App runs at **http://localhost:5173**

### Frontend only (no Docker)

```bash
cd web
npm install
npm run dev
```

### Useful Commands

```bash
npm run build      # Production build
npm run lint       # ESLint check
npm run preview    # Preview production build locally

supabase db reset  # Re-apply all migrations locally
```

---

## Project Structure

```
HouseBite/
├── web/                    # React + TypeScript frontend
│   └── src/
│       ├── pages/          # App pages (dashboard, pantry, recipes, scan, …)
│       ├── components/     # Shared UI components
│       ├── api/            # Supabase data layer
│       ├── hooks/          # Custom React hooks
│       └── utils/          # Date, currency, user helpers
│
├── supabase/
│   ├── functions/          # Deno edge functions
│   │   ├── scan-receipt/   # OCR receipt parsing
│   │   ├── search-recipes/ # Spoonacular recipe proxy
│   │   └── save-recipe/    # Favorite recipe persistence
│   └── migrations/         # SQL schema migrations
│
├── database/               # Schema documentation
├── docker-compose.yml
└── start.sh                # One-shot bootstrap script
```

---

## Deployment

**Frontend** — deployed automatically via hosting platform of choice.

**Supabase Edge Functions**

```bash
# Deploy a specific function
npx supabase functions deploy <function-name> --project-ref ikemmjauwrahrrlgewta

# Push schema migrations to production
supabase db push --project-ref ikemmjauwrahrrlgewta
```

---

## Contributing

1. Check [gitHubWorkflow.md](gitHubWorkflow.md) for the branching and PR convention used on this project.
2. Open an issue or pick an existing one.
3. Branch off `main`, make your changes, and open a pull request.

---

<div align="center">

Made with ❤️ as part of ICT II (1305)

[housebite.app](https://housebite.app/)

</div>
