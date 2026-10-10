# CivicLens

CivicLens is a prototype for exploring municipal road and utility work. Residents can browse work orders, see corridor timelines, submit and track grievances, and view department scorecards. Officers can create and update projects, review reports, and coordinate overlapping work.

## Run locally

Install dependencies with `npm install`, then run `npm run dev`. On Windows PowerShell installations that block `npm.ps1`, use `npm.cmd install` and `npm.cmd run dev`.

Without Supabase credentials, the app uses synthetic Pune records in `src/data` and persists changes in browser local storage. These records are for demonstration only and are not shared between browsers.

For a Supabase instance, copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Apply the SQL migrations in `supabase/migrations`, seed with `supabase/seed.sql` if desired, and deploy the functions in `supabase/functions`. Configure Google sign-in in Supabase Auth for authenticated resident submissions. Do not place a service role key in a `VITE_` variable or other client-side code.

## Structure

| Path | Purpose |
| --- | --- |
| `src/pages` | Public, officer, admin, and data guide screens |
| `src/components` | Layout, map, and reusable UI |
| `src/types` | Shared application types and labels |
| `src/services/dataRepository.ts` | Data access interface and local demo repository |
| `src/services/supabaseRepository.ts` | Supabase-backed repository |
| `src/context/AuthContext.tsx` | Authentication state and demo role switcher |
| `supabase/migrations` | Database schema and access policies |
| `supabase/functions` | Server-side API operations |

## Checks

Run `npm run build`, `npm run lint`, and `npm test`. Automated tests cover project validation, the repeat excavation date window, and mocked Supabase repository routing. Live authorization, migrations, storage, and end-to-end workflows also need verification against an isolated Supabase project before production use.

## Prototype boundaries

The data guide uses scripted responses based on available records; it is not a general AI assistant. Coordination alerts and notifications are prototype workflows. A road timeline can flag dates that suggest repeat excavation, but a human must verify location, scope, permits, and applicable rules before treating it as a violation. Demo role switching is for local exploration and must not grant server permissions.
