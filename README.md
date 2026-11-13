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
