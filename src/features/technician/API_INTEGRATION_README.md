# Technician API integration

## Base URL

The client reads:

```env
VITE_API_BASE_URL=https://execute-blind-pitch-frequently.trycloudflare.com
```

`utils/technicianApi.ts` also contains the URL above as a fallback, but using `.env` is recommended because Cloudflare tunnel URLs can change.

## Authentication

The API client sends a Bearer token when one is found in common frontend storage keys (`access_token`, `accessToken`, `auth_token`, `authToken`, `token`). By default `credentials` is omitted to avoid unnecessary credentialed-CORS restrictions. Set `VITE_API_WITH_CREDENTIALS=true` only if Backend authentication explicitly uses cookies/session. If the main Auth module uses another token key, update `getStoredAccessToken()` in `utils/technicianApi.ts`.

## Connected endpoints

- Hub Fleet: list drones, drone detail, patch status, maintenance history.
- Transit Missions: incoming missions, confirm arrival.
- Battery Management: list batteries, use battery, mark charged API helper.
- Outbound Deliveries: list, receive, prepare battery.
- Delivery Confirmations: list, confirm pickup.
- Maintenance Alerts: list, optional sync/cron API helper.
- Work Orders: list, create, detail, update, inspection update.
- Maintenance Records: create.
- Notifications: list, unread count, mark all read.
- Profile: get current user, update supported profile fields.

## Backend endpoints not present in the supplied API document

The existing UI has business actions for which the supplied Backend document does not define an API endpoint:

- Outbound `Dispatch`.
- Transit `Dispatch / Continue`.
- Transit `Cannot Continue` / replacement request / replacement-drone confirmation.
- Outbound history / Transit history APIs.
- Battery history API.
- Single-notification `mark as read` endpoint.
- Delivery confirmation history / explicit 48-hour cancellation endpoint.

Those existing frontend interactions were preserved where needed so the current UI flow does not break. They are marked in code as frontend-only/TODO until Backend exposes the corresponding endpoint. Do not invent a URL for them; add the actual Backend endpoint when it is available.


## TanStack Query

All Technician pages now consume backend data through TanStack Query hooks under `technician/hooks/`. The page layer no longer manually calls backend refresh functions with `useEffect`. Install the dependency with `npm install @tanstack/react-query`. See `TANSTACK_QUERY_SETUP.md`.
