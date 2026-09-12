# Drone-FE

React + TypeScript frontend (Vite) for the Drone project, organized by
**page**, with shared UI components and API calls factored out.

## Architecture

```
src/
  components/   # shared UI: Button, TextField, Loading, ErrorMessage, Layout
  services/     # all API calls to Drone-BE (apiClient.ts + userService.ts)
  types/        # shared TS types (ApiResponse<T>, User, ...)
  pages/        # one file per screen
    UserListPage.tsx    # GET  /users        (paginated list)
    UserDetailPage.tsx  # GET  /users/{id}
    CreateUserPage.tsx  # POST /users
  routes/
    AppRouter.tsx       # route table
```

A page owns its own state and calls a `services/*` function directly,
then renders with shared `components/*`. See [CLAUDE.md](CLAUDE.md) for
the full pattern and how to add a new page.

## Requirements

- Node.js 20+
- The `Drone-BE` API running (see that project's README) — or any
  compatible backend served at `VITE_API_BASE_URL`
- (Optional) Docker

## Setup (local, no Docker)

```bash
npm install
copy .env.example .env
```

Edit `.env` if your backend isn't at `http://localhost:8000`.

Run the dev server:

```bash
npm run dev
```

Open `http://localhost:5173`.

## Run with Docker

```bash
docker compose up --build
```

Serves the production build via nginx on `http://localhost:5173`. The
backend URL is baked in at build time — override it with:

```bash
VITE_API_BASE_URL=http://your-backend:8000 docker compose up --build
```

## Scripts

| Command           | Description                              |
|-------------------|--------------------------------------------|
| `npm run dev`     | Start the Vite dev server                  |
| `npm run build`   | Type-check (`tsc -b`) and build for prod   |
| `npm run preview` | Preview the production build locally       |
| `npm run lint`    | Run oxlint                                 |

## Pages

| Route          | Page              | Description         |
|----------------|-------------------|----------------------|
| `/`            | UserListPage      | Paginated user list  |
| `/users/:id`   | UserDetailPage    | User detail          |
| `/users/new`   | CreateUserPage    | Create-user form     |

## Adding a new page

1. Add the API call to the relevant file in `src/services/` (or create a
   new `services/<resource>Service.ts` for a new backend resource).
2. Create `src/pages/<Name>Page.tsx` — fetch/submit directly with
   `useState`/`useEffect`, reuse components from `src/components/`.
3. Register a route in `src/routes/AppRouter.tsx`.

Full conventions are documented in [CLAUDE.md](CLAUDE.md).
