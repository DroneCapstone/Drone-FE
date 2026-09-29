# Technician TanStack Query setup

## Install

```bash
npm install @tanstack/react-query
```

## Environment

```env
VITE_API_BASE_URL=https://execute-blind-pitch-frequently.trycloudflare.com/api/v1
VITE_API_WITH_CREDENTIALS=false
VITE_ENABLE_DEMO_AUTH=false
```

## Query behaviour

- Fleet: fetch on page load / invalidation; no polling.
- Transit incoming: 15-second polling.
- Battery inventory: 30-second polling.
- Outbound: fetch on page load / invalidation; no polling.
- Delivery confirmations: 30-second polling.
- Notifications / unread count: 30-second polling.
- `refetchOnWindowFocus: false` to avoid request bursts while using DevTools or switching tabs.
- 4xx API responses are not retried.
- Network/5xx errors retry at most once.

## Route provider

`technicianRoutes.tsx` now places one Query provider around the Technician page-route tree instead of wrapping every page separately. The Header keeps its own boundary because it is rendered by `TechnicianLayout` outside the child-route outlet in the current project structure; both boundaries use the same exported `technicianQueryClient` instance.

## Backend-owned vs frontend-only state

Backend list/detail data should not silently fall back to mock rows when an API request fails. This bundle removes TanStack placeholder mocks for live Fleet, Transit, Battery, Outbound, Confirmation, Maintenance Alert and Work Order queries.

Local history is retained only where Backend currently has no history endpoint for that specific UI flow.
