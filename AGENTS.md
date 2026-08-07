# AGENTS.md — Swastik monorepo

## Repository layout
- `swastik-backend` — Node/Express API + business services (`services/`), routes (`routes/`), Supabase admin. **Start:** `node server.js` (port from `.env`, default 5001).
- `swastik-web` — Next.js patient/pharmacy/pharmacy-owner web app.
- `app/` — Android patient app (Kotlin, Hilt + Retrofit + Room). Package `com.example.swastik`.

## Commands
### Backend (`swastik-backend`)
- `npm run lint` / `npm run lint:fix` — eslint (eslint config: `.eslintrc.cjs`).
- `npm test` — jest unit tests.
- `node --check <file>` — syntax check.
- Run server: `node server.js`; with live-reload: `npm run dev`.
- Seed sample data (idempotent): `node scripts/seedHealthProducts.js`.
- DB: Supabase Postgres (admin) + MongoDB (consultation chat).

### Web (`swastik-web`)
- `npm run dev` — Next dev server (port 3000).
- `npm run lint` — eslint.
- `npx tsc --noEmit` — typecheck.
- `npm run build` — production build.

### Android (`app/`)
- `./gradlew :app:compileDebugKotlin` — compile check.
- `./gradlew :app:lintDebug` — lint.
- Run app on device: Android Studio (uses Hilt DI; no manual service locator wiring).

## Conventions
- Supabase-js PostgrestBuilders are **thenable-chainable**; do NOT use `builder.then(({data,error}) => ...)` — the mapped value is lost. Destructure the resolved response instead: `const { data, error } = await builder;`.
- `campaign_redemptions.patient_id` → `patients(id)`, NOT `users`. Always resolve `patients.user_id` first.
- Backend is the **single source of truth** for campaign prices. Frontends query `POST /api/discounts/campaigns/best-price` (anonymous) and `computeBestPrices` (orders).
- Campaign fields: `discount_value`, `start_at`, `end_at`, `is_active`, `scope_type` (global/category/brand/medicine). The web admin form and backend agree on these names.
