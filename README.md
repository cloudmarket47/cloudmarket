# CloudMarket

CloudMarket is a Vite + React storefront and admin workspace backed by Supabase.

## Active Runtime

The active frontend app lives under `src/`.

Primary entry points:

- [src/main.tsx](c:/Users/USER/cloudmarket/src/main.tsx)
- [src/app/App.tsx](c:/Users/USER/cloudmarket/src/app/App.tsx)
- [src/app/routes.tsx](c:/Users/USER/cloudmarket/src/app/routes.tsx)

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run type-check
```

## Environment

This project uses Vite env variables, not Next.js env variables.

See:

- [.env.example](c:/Users/USER/cloudmarket/.env.example)
- [.env.local](c:/Users/USER/cloudmarket/.env.local)

Required variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_REALTIME_ENABLED`

## Supabase Setup

Run the SQL in:

- [cloudmarket_schema.sql](c:/Users/USER/cloudmarket/supabase/cloudmarket_schema.sql)

Setup notes and security guidance:

- [SUPABASE_PRODUCTION_SETUP.md](c:/Users/USER/cloudmarket/SUPABASE_PRODUCTION_SETUP.md)

## Netlify

Netlify deployment is configured in:

- [netlify.toml](c:/Users/USER/cloudmarket/netlify.toml)

Netlify form scaffolding is in:

- [index.html](c:/Users/USER/cloudmarket/index.html)

## Notes

The current admin access pattern is still client-side. If you want hardened production security, replace the footer-only admin unlock flow with real authentication and move admin-only mutations behind authenticated policies or server-side functions.
