# CloudMarket Supabase Setup

This project now uses the Vite app under `src/` as the active runtime. The Supabase-backed parts are:

- product pages and published storefront catalog
- orders and admin order management
- customer discount tokens
- subscriber activity and subscriber management
- analytics events
- finance settings, finance expenses, and finance sales
- admin preferences and notification read state through `app_settings`
- image and video uploads through Supabase Storage
- client refresh through Supabase Realtime

## Environment

The local env files were converted from legacy Next-style variables to Vite variables:

- [.env.local](c:/Users/USER/cloudmarket/.env.local)
- [.env.example](c:/Users/USER/cloudmarket/.env.example)

Set the same values in Netlify:

1. `VITE_SUPABASE_URL`
2. `VITE_SUPABASE_ANON_KEY`
3. `VITE_SUPABASE_REALTIME_ENABLED=true`

The table and bucket override vars are optional unless you want custom names.

## SQL Setup

Run the SQL in [cloudmarket_schema.sql](c:/Users/USER/cloudmarket/supabase/cloudmarket_schema.sql) inside the Supabase SQL Editor.

That script creates:

- `product_pages`
- `orders`
- `customer_tokens`
- `subscriber_activities`
- `subscriber_management`
- `analytics_events`
- `finance_expenses`
- `finance_sales`
- `app_settings`
- `cloudmarket-assets` storage bucket
- RLS policies
- indexes
- `updated_at` triggers
- Realtime publication entries

## Realtime

Realtime is now wired in the app through [supabaseRealtime.ts](c:/Users/USER/cloudmarket/src/app/lib/supabaseRealtime.ts) and started from [App.tsx](c:/Users/USER/cloudmarket/src/app/App.tsx).

The app listens for database changes on:

- `product_pages`
- `orders`
- `customer_tokens`
- `subscriber_activities`
- `subscriber_management`
- `analytics_events`
- `finance_expenses`
- `finance_sales`
- `app_settings`

When these change, the app refreshes the relevant in-memory caches and updates the UI.

## Storage

Uploads now go through [supabaseStorage.ts](c:/Users/USER/cloudmarket/src/app/lib/supabaseStorage.ts) into the `cloudmarket-assets` bucket.

Recommended bucket mode for the current app:

- public bucket
- public read policy
- client upload/update/delete policy limited to the bucket

Accepted asset types in the SQL file:

- jpeg
- png
- webp
- gif
- avif
- svg
- mp4
- webm
- mov

Current size limit in the SQL file:

- `104857600` bytes (`100 MB`)

## Netlify

Netlify form scaffolding is now present in [index.html](c:/Users/USER/cloudmarket/index.html) for:

- `product-order`
- `email-subscription`

SPA deploy routing was also added in [netlify.toml](c:/Users/USER/cloudmarket/netlify.toml).

## Security Note

The current app still uses a client-side admin access shortcut from the footer and browser-side Supabase writes. The SQL file therefore uses compatibility policies that allow the current app to work immediately with the anon key.

That is functional, but it is not a hardened admin security model.

If you want true production-grade admin security, the next step is:

1. Replace the footer-only admin gate with real Supabase Auth or a server-side Netlify function flow.
2. Restrict admin-only table writes and draft-page reads to authenticated admins.
3. Keep public read access only for published storefront data and public assets.
