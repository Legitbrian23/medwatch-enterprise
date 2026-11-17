---
inclusion: always
---

# MedWatch — Tech Stack & Tooling Rules

## Runtime & Language
- **Node.js 20+**, **TypeScript 5** in strict mode (`"strict": true` in all tsconfigs).
- `pnpm` workspaces monorepo. Never use `npm` or `yarn`.
- Three workspace packages: `apps/api`, `apps/web`, `packages/shared`.

## Database
- **MongoDB 7** via Docker Compose (image `mongo:7`).
- Use the **official `mongodb` Node.js driver** only. Mongoose is banned.
- All collection access goes through typed accessors in `apps/api/src/db/client.ts`.
- Connection string via `MONGODB_URI` environment variable; never hard-code it.

## API
- **Fastify 4** with `fastify-type-provider-zod`.
- All request/response shapes validated with **Zod schemas** from `packages/shared`.
- OpenAPI docs via `@fastify/swagger` + `@fastify/swagger-ui` mounted at `/docs`.
- Do not use Express.

## Frontend
- **React 18** + **Vite** (latest stable).
- Routing: **React Router 6**.
- Server state: **TanStack Query v5**.
- Styling: **Tailwind CSS v3** (utility-first, no CSS-in-JS).
- Charts: **Recharts**.
- Maps: **Leaflet** (via `react-leaflet`).
- Do not add Redux, MobX, or any other state management library.

## Testing
- Unit + integration: **Vitest** (`--run` for CI, never `--watch` in scripts).
- MongoDB integration: **`mongodb-memory-server`** (no real Mongo required for tests).
- E2E smoke: **Playwright** (one test only, per REQ-06-2).

## Tooling
- **ESLint** with `@typescript-eslint` + `eslint-config-prettier`.
- **Prettier** (single config at repo root).
- All scripts runnable from root via `pnpm --filter` or root-level delegates.
- GitHub Actions CI: lint → typecheck → test.

## Dependency Rules
- Pin **exact** versions in `package.json` (no `^` or `~` ranges).
- Do not add a dependency without checking it is actively maintained.
- Flag any package whose name looks like a typosquat before installing.

## Environment
- All secrets and connection strings in `.env` (git-ignored).
- `.env.example` committed with placeholder values; never commit real secrets.
- Required vars: `MONGODB_URI`, `MONGODB_DB`, `API_PORT`, `VITE_API_BASE_URL`.

## Frontend — v2 Amendment Additions

- **Charts:** Apache ECharts via `echarts-for-react`. Recharts is **removed**. All charts register the shared dark/light theme from `apps/web/src/charts/theme.ts`.
- **Font:** `@fontsource/inter` (self-hosted). No Google Fonts CDN.
- **Virtualisation:** `@tanstack/react-virtual` for DataTable rows.
- **Command palette:** `cmdk`.
- **No icon libraries.** This is an absolute prohibition. No `lucide-react`, `@heroicons/*`, `react-icons`, `phosphor-react`, `tabler-icons-react`, or any package containing "icon" in its name.
- **No emoji in source files.** The Vitest test `apps/web/src/test/no-emoji.test.ts` scans all `.ts`/`.tsx` files and fails the build on any Unicode emoji.
- **CSS custom properties for all colours.** No hard-coded hex values in component files. All values come from `apps/web/src/styles/tokens.css`.
- **Dual theme.** Dark is the default. Light is derived. Theme stored in `localStorage['mw-theme']` and applied as `data-theme="dark"|"light"` on `<html>`.
- **Accessibility:** WCAG 2.1 AA contrast in both themes. `prefers-reduced-motion` disables all CSS animations and ECharts animations.
