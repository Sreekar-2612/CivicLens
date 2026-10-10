# CivicLens

CivicLens is an application for exploring municipal road and utility work. Residents can browse work orders, see corridor timelines, submit and track grievances, and view department scorecards. Officers can create and update projects, review reports, coordinate overlapping work, and read assigned in-app notifications.

## Run locally

Install dependencies with `npm install`, then run `npm run dev`. On Windows PowerShell installations that block `npm.ps1`, use `npm.cmd install` and `npm.cmd run dev`.

Without Supabase credentials, the app uses synthetic Pune records in `src/data` and persists changes in browser local storage. These records are for demonstration only and are not shared between browsers.

For a Supabase instance, copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Apply all SQL migrations in `supabase/migrations` in order, seed with `supabase/seed.sql` if desired, and deploy the functions in `supabase/functions`. Configure Google sign-in in Supabase Auth for authenticated resident submissions. Assign `department_officer` or `admin` profiles through a trusted administrative process. Do not place a service role key in a `VITE_` variable or other client-side code.

The latest migration detects cross-department project clashes using recorded road names or points within 200 metres, overlapping work dates, and utility work scheduled within 365 days of recorded resurfacing. It also writes durable officer notifications for new high-severity clashes and grievances. Officers can read and mark these notifications in `/officer/notifications`. These are in-app notifications; no email or SMS provider is configured.

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

Run `npm run build`, `npm run lint`, and `npm test`. Automated tests cover project validation, clash scoring, the repeat excavation date window, and mocked Supabase repository routing. Before production use, apply and test migrations, row-level permissions, storage, and end-to-end workflows against an isolated Supabase project. Local CLI database tests require Docker and `supabase start`.

Once an isolated Supabase project has the migrations and functions, run `supabase/tests/clashes_notifications.sql` in its SQL editor; it checks the database triggers inside a transaction that rolls back. Then run `node --env-file=.env.local test_remote_db.js` and `node --env-file=.env.local test_edge_functions.js`. These Node smoke checks are read-only and use the anonymous key. Test authenticated resident, officer, and admin workflows using test accounts.

For the live workflow check: create two work orders in different departments with nearby points and overlapping dates; confirm one new coordination alert and department notifications. Change a date to remove the overlap and confirm an unreviewed generated alert clears. Submit a linked grievance as a resident; confirm the assigned officer receives an inbox item, can open the report, and can mark the notification read. Confirm an anonymous session cannot read grievance contacts, audit logs, or notifications, and that an officer cannot update another department's project.

## Prototype boundaries

The data guide uses scripted responses based on available records; it is not a general AI assistant. Clash scores are scheduling signals based on recorded dates and coordinates; an officer must verify actual location, scope, permits, and applicable rules. A road timeline can flag dates that suggest repeat excavation, but it does not establish a legal violation. Demo role switching is for local exploration and does not grant server permissions.
