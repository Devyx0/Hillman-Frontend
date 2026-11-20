# Hillman Centrale — Frontend

Frontend for the Groupe Hillman management platform (Toitures Hillman, Signature Gouttières,
Rénovations Hillman). This repo is UI only; the backend lives in a separate repo.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 (design tokens in `src/index.css`)
- React Router (hash routing), lucide-react icons

## Run

```bash
npm install
npm run dev
```

`npm run build` type-checks and produces `dist/`.

## Structure

| Path | What |
| --- | --- |
| `src/index.css` | Theme tokens (colours, type scale, radii, shadows) and component classes (`.btn`, `.form-input`, …) |
| `src/data/mock.ts` | Deterministic mock data. Replace with API calls when the backend is ready — keep the shapes |
| `src/context/AppContext.tsx` | Active company scope (`toit` / `sg` / `reno` / `all`) and command-palette state |
| `src/components/ui.tsx` | Shared primitives: Page, Card, Stat, Badge, Avatar, Tabs, Drawer, … |
| `src/components/messaging.tsx` | Texto / courriel / relance compose drawer and action menus |
| `src/layout/AppLayout.tsx` | Sidebar, top bar, company switcher, ⌘K search, toasts |
| `src/pages/*` | One file per route |

## Demo accounts

There is no backend yet: sign in at `/connexion` with any demo account listed on the sign-in page
(shared demo password shown there, defined in `src/auth/permissions.ts`). Admins can use "Voir comme…" in the
user menu to preview a rep's or the coordinator's view. All data lives in memory and resets on reload.

## Data and backend seam

| Path | What |
| --- | --- |
| `src/data/store.ts` | The only place that mutates data (`addQuote`, `setQuoteStatus`, `signQuote`, `recordPayment`, …). Each mutator becomes an API call when the backend exists; `request()` simulates latency/errors |
| `src/data/settings.ts` | Lead sources, statuses, numbering, payment schedules, follow-up sequences (days 6/12/20), templates, connections, Loi 25 |
| `src/auth/` | Roles (admin / coordinator / rep), editable permission table, session, route guards |
| `src/data/crews.ts` | Crews, job scheduling, absences, external calendar connections |
| `src/data/quote-builder.ts` | Per-quote builder state and the pricing rule (the quote amount drives every total) |

Phase 2 (not built): Facebook Lead Ads, reports, reactivation campaigns, Google review requests, satellite
measurements, online payments, crew app, route optimization. The AI agent is labelled "January 2027"
(`AI_AGENT_LIVE` in `src/data/settings.ts`).

## Routes

`/` Aujourd'hui · `/leads` · `/leads/:id` · `/pipeline` · `/soumissions` · `/soumissions/:id` (quote builder) ·
`/clients` · `/clients/:id` · `/conversations` · `/agenda` · `/catalogue` (`?tab=parametres` for settings) ·
`/profil` · `/connexion`, `/invitation/:token`, `/mot-de-passe` (account, no app chrome) ·
`/portail/:no` (client-facing quote portal; `?mode=tablette` for in-person signing), `/portail/:no/copie-signee`,
`/portail/:no/annulation` (art. 58 LPC cancellation form)

## Language (EN / FR)

The UI is English by default, with an EN/FR switch in the top bar (and on the client portal). The choice is
remembered in `localStorage` (`hillman.lang`).

- French is the source language: UI strings are written in French and wrapped in `t()` from `src/i18n`.
- English translations live in `src/i18n/en/*.ts`, keyed by the exact French string.
- `tx(context, text)` handles the few strings whose English depends on where they appear.
- Canonical values used in logic (statuses, stages, filter values) stay French and are translated only where displayed.
- In dev, `window.__i18nMissing` lists strings rendered in English mode without a translation.
