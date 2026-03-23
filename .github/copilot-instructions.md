# SODISA Stats Portal — Copilot Instructions

## Project Overview
Single-purpose Next.js 16 portal for company financial statistics. Users log in, pick a company (by `slug`), and see their stats dashboard. The app acts as a **thin, authenticated proxy** between the browser and a backend stats API.

## Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Runtime**: Node.js (server-side only for auth/proxy logic)

## Directory Structure
```
app/
  page.tsx                          # Root: redirect to /login or /stats/{slug}
  login/page.tsx                    # Login form (Client Component)
  companies/page.tsx                # Company picker (Server Component)
  stats/[slug]/page.tsx             # Stats dashboard (Client Component, all widgets)
  api/
    auth/login/route.ts             # POST — proxy to backend, set httpOnly cookie
    auth/logout/route.ts            # POST — clear cookies
    stats/[slug]/[...path]/route.ts # Catch-all proxy — forwards requests with Bearer token
lib/
  types.ts                          # Shared TypeScript interfaces
  auth.ts                           # Server-side cookie helpers (getAccessToken, getPortalSession)
components/
  LogoutButton.tsx                  # Client Component logout button
proxy.ts                            # Next.js 16 proxy (auth guard / redirect logic)
.env.local                          # STATS_BACKEND_URL=<backend url>
```

## Auth Flow
1. `POST /api/auth/login` → backend returns `{ accessToken, user, companies }`
2. `access_token` stored as **httpOnly** cookie (never exposed to JS)
3. `portal_session` stored as base64 JSON cookie (readable by client for display only)
4. **1 company** → auto-redirect to `/stats/{slug}` | **multiple** → `/companies` picker
5. `proxy.ts` protects `/stats/*` and `/companies`; unauthenticated users → `/login`

## API Proxy Pattern
All stats requests go through `/api/stats/[slug]/[...path]`:
- Reads `access_token` from httpOnly cookie server-side
- Forwards to `${STATS_BACKEND_URL}/api/stats/{slug}/{...path}` with `Authorization: Bearer {token}`
- The `slug` in the URL identifies the company — each company maps to its own remote DB on the backend

## Key Conventions
- **Server Components** handle auth checks via `getPortalSession()` and redirect; never expose session to client
- **Client Components** read user info from the readable `portal_session` cookie via `document.cookie`/`atob()`
- API routes validate the token is present before proxying; return `401` if missing
- The backend is responsible for `StatsAccessGuard` — it verifies the user has access to that slug and opens the correct remote DB connection
- All stats widgets use the `useStatWidget<T>(url)` hook for independent parallel fetching
- API URL pattern for widgets: `/api/stats/${slug}/{endpoint}?{queryParams}`

## Stats Dashboard Widgets
All in `app/stats/[slug]/page.tsx`. Each widget receives `slug` and `query` props:

| Widget | Endpoint |
|--------|----------|
| ResumenWidget | `resumen-financiero` |
| TendenciaWidget | `tendencia-diaria` |
| VendedoresWidget | `ventas-por-vendedor` |
| BodegasWidget | `ventas-por-bodega` |
| PuntoVentaWidget | `ventas-por-punto-de-venta` |
| MasVendidosWidget | `articulos-mas-vendidos?limit={n}` |
| RotacionWidget | `rotacion?limit={n}` |
| StockBajoWidget | `stock-bajo?umbral={n}&ano={year}` |
| TopClientesWidget | `top-clientes?limit=5` |
| FrecuenciaClientesWidget | `facturas-por-cliente?limit=5` |
| SinMovimientoWidget | `articulos-sin-movimiento?limit={n}&tipoInventario={tipo}` |

Initial data (periodos, filtros) fetched on mount:
- `GET /api/stats/{slug}/periodos-contables`
- `GET /api/stats/{slug}/articulos/filtros`

## Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `STATS_BACKEND_URL` | Yes | Base URL of the stats backend, e.g. `http://localhost:4000` |

## Build & Dev
```bash
npm run dev      # dev server (default port 3000)
npm run build    # production build
npm run start    # start production server
```

## Security Notes
- `access_token` cookie is `httpOnly: true` — never accessible from browser JS
- `portal_session` cookie is readable for UI display only (user name, company list); never trust it server-side for authorization
- Token forwarded to backend as `Authorization: Bearer` — backend is the authoritative auth layer
- No direct DB access from this app — all data flows through the backend
