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

## Routes

`/` Aujourd'hui · `/leads` · `/leads/:id` · `/pipeline` · `/soumissions` · `/soumissions/:id` (quote builder) ·
`/clients` · `/clients/:id` · `/conversations` · `/agenda` · `/catalogue` (`?tab=parametres` for settings) ·
`/portail/:no` (client-facing quote portal, no app chrome)

## Language (EN / FR)

The UI is English by default, with an EN/FR switch in the top bar (and on the client portal). The choice is
remembered in `localStorage` (`hillman.lang`).

- French is the source language: UI strings are written in French and wrapped in `t()` from `src/i18n`.
- English translations live in `src/i18n/en/*.ts`, keyed by the exact French string.
- `tx(context, text)` handles the few strings whose English depends on where they appear.
- Canonical values used in logic (statuses, stages, filter values) stay French and are translated only where displayed.
- In dev, `window.__i18nMissing` lists strings rendered in English mode without a translation.
