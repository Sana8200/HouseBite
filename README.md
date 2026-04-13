# HouseBite

## Prerequisites

* [Node.js LTS 24](https://nodejs.org/en/download)
* [Deno](https://deno.com/)

## Web

    cd web
    npm install

Start local development server. `npm run dev`.

Create a production build `npm run build`.


## Backend

Create a new function with

    npx supabase functions new the-function-name

Deploy functions with

    npx supabase functions deploy the-function-name --project-ref ikemmjauwrahrrlgewta
