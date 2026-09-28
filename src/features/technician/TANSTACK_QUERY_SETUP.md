# Technician API + TanStack Query setup

## 1. Install dependency

From the frontend project root:

```bash
npm install @tanstack/react-query
```

## 2. Environment

Create/update `.env`:

```env
VITE_API_BASE_URL=https://execute-blind-pitch-frequently.trycloudflare.com
VITE_API_WITH_CREDENTIALS=false
```

Use `VITE_API_WITH_CREDENTIALS=true` only if Backend authentication uses cookies/session.
For Bearer-token authentication, keep it `false`.

Restart Vite after changing `.env`.

## 3. Architecture

```text
technician/
├── api/          HTTP/API endpoint layer
├── hooks/        TanStack Query queries + mutations
├── query/        QueryClient + QueryClientProvider
├── pages/        UI only: consumes query hooks
├── components/
└── utils/        domain mapping + temporary mock/local fallback logic
```

Request lifecycle:

```text
Page
  -> useQuery / useMutation
  -> domain helper/API
  -> Backend
  -> TanStack cache
  -> UI rerender
```

Pages no longer manually fetch backend data using `useEffect + refreshXFromApi()`.
`useEffect` remains only for UI/local browser events where appropriate.

## 4. Query behavior

- Fleet: cached and refetched on invalidation/window focus.
- Transit Missions: polls every 15 seconds.
- Battery Management: polls every 10 seconds.
- Delivery Confirmations: polls every 30 seconds.
- Notifications / unread count: polls every 30 seconds.
- Mutations invalidate only the affected query keys.
- 4xx responses are not retried.
- Network/5xx errors retry once.

## 5. Important Backend API gaps

The supplied Backend document does not define endpoints for:

- Outbound `Dispatch`
- Transit `Dispatch/Continue`
- Technician `Cannot Continue` / replacement request
- Transit/Outbound/Battery history endpoints
- Single notification `mark read`

Those existing frontend-only behaviors are preserved and clearly separated from backend-owned query data.
Do not invent endpoint URLs until Backend provides them.

## 6. CORS

TanStack Query does not fix CORS. If browser Network shows `CORS error`, Backend still needs to allow the frontend origin, e.g.:

```text
http://localhost:5173
```

The HTTP client defaults to `credentials: "omit"` to avoid unnecessarily strict credentialed CORS when Bearer auth is used.
Set `VITE_API_WITH_CREDENTIALS=true` only when the Backend explicitly uses cookies/session.
