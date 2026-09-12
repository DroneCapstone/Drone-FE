# CLAUDE.md

Guidance for Claude Code (or any AI assistant) working in this repository.

## What this project is

A React + TypeScript frontend (Vite) organized by **page**, with shared UI
components and API-calling logic pulled out so nothing is duplicated:

```
src/
  components/   # shared, reusable UI pieces used by any page
  services/     # all HTTP calls to the Drone-BE API, grouped by resource
  types/        # shared TypeScript types
  pages/        # one file per screen — the only place that composes everything
  routes/
    AppRouter.tsx   # route table, maps a URL to a page
  App.tsx
  main.tsx
```

## Folder responsibilities

- **`components/`** — dumb, reusable UI: `Button`, `TextField`, `Loading`,
  `ErrorMessage`, `Layout` (navbar + page frame). No API calls, no
  business logic. If a piece of UI is used by more than one page, it
  belongs here.
- **`services/`** — the *only* place allowed to call `apiClient`
  (axios). One file per backend resource, e.g. `userService.ts` holds
  every user-related call (`getUsers`, `getUserById`, `createUser`).
  `apiClient.ts` is the single shared axios instance (base URL + error
  unwrapping) — never create a second one.
- **`types/`** — TypeScript interfaces shared across pages/services
  (`ApiResponse<T>`, `User`, ...).
- **`pages/`** — one file per screen (`UserListPage`, `UserDetailPage`,
  `CreateUserPage`). A page owns its own `useState`/`useEffect` and calls
  functions from `services/`, then renders using `components/`. Pages are
  not shared or imported by each other.

This is intentionally simple: no per-API-mirroring-backend folders, no
extra hook layer between a page and a service — a page fetches its own
data directly. Keep it that way; don't reintroduce a middle layer unless
a page's data logic actually needs to be reused by another page.

## Adding a new page

To add e.g. a "delete user" screen:

1. Add a function to `src/services/userService.ts` (e.g. `deleteUser(id)`)
   that calls `apiClient`.
2. Create `src/pages/<Name>Page.tsx` that calls that service function
   directly (see `src/pages/CreateUserPage.tsx` for a mutation, or
   `src/pages/UserListPage.tsx` for a fetch-on-mount example).
3. Register the route in `src/routes/AppRouter.tsx`.
4. Reuse `components/Button`, `components/TextField`,
   `components/Loading`, `components/ErrorMessage` instead of writing new
   ones — only add a new shared component if an existing one truly
   doesn't fit.

## Conventions

- The backend always responds with `{ success, message, data }`
  (`types/apiResponse.ts`). `services/apiClient.ts`'s response
  interceptor already unwraps failures into a plain `Error` — catch
  blocks in a page should just read `err.message`.
- Never call `apiClient`/axios directly from a page or component — always
  go through a function in `services/`.
- Env config: `VITE_API_BASE_URL` (see `.env.example`) — never hardcode
  the backend URL.

## Running things

- Install: `npm install`
- Dev server: `npm run dev`
- Type-check + build: `npm run build`
- Lint: `npm run lint`
- Docker: `docker compose up --build`

See [README.md](README.md) for full setup/usage instructions.
