# Technician Backend API integration

## Runtime configuration

Use the project-root `.env`:

```env
VITE_API_BASE_URL=https://execute-blind-pitch-frequently.trycloudflare.com/api/v1
VITE_API_WITH_CREDENTIALS=false
VITE_ENABLE_DEMO_AUTH=false
```

Restart Vite after editing `.env`.

`utils/technicianApi.ts` also normalizes a host-only URL by appending `/api/v1`, but using the full `/api/v1` base in `.env` is recommended so Auth and Technician use the same convention.

## Authentication

All Technician requests read the real Backend access token from `authService.getAccessToken()` and send:

```http
Authorization: Bearer <access_token>
```

On `401`, the client attempts `authService.refreshAccessToken()` once and retries the original request once.

## Important fixes in this bundle

1. Successful list responses are no longer assumed to use only `data/items/results/rows`. The client also understands envelopes such as `drones`, `missions`, `batteries`, `deliveries`, `confirmations`, `maintenance_alerts`, `work_orders`, `records`, `logs`, `schedules`, and `notifications`.
2. Battery Management no longer calls Outbound Deliveries just to render the battery inventory. It now depends only on `GET /technician/fleet/batteries`.
3. Battery Management no longer filters a valid Backend response by the hard-coded string `Hub HCM-02`.
4. Transit Missions no longer renders mock incoming missions when the Backend request fails. This prevents `Confirm arrival` from POSTing fake IDs and producing the previous `404 -> 422` pair.
5. Transit/Outbound data is no longer filtered again by the hard-coded hub name. The Backend endpoints are already scoped to the authenticated Technician.
6. Fleet/Drone Detail no longer fall back to demo battery assignments when Backend drone data says no battery is installed.
7. TanStack Query `refetchOnWindowFocus` is disabled and battery polling is reduced to 30 seconds.
8. Technician page routes now use one shared Query provider boundary instead of wrapping every page separately.
9. FastAPI `422` validation details are surfaced as readable field errors.
10. Network/CORS failures now return a clearer frontend error instead of only `Failed to fetch`.

## Swagger endpoint coverage

The API client now contains helpers for the complete Technician list supplied on 29 Sep 2026:

### Missions
- `GET /technician/missions/`

### Deliveries
- `GET /technician/deliveries/outbound`
- `POST /technician/deliveries/outbound/{orderId}/receive`
- `POST /technician/deliveries/outbound/{orderId}/prepare-battery`
- `GET /technician/deliveries/confirmations`
- `POST /technician/deliveries/confirmations/{orderId}/confirm-pickup`

### Fleet
- `GET /technician/fleet/incoming`
- `POST /technician/fleet/missions/{mission_id}/confirm-arrival`
- `GET /technician/fleet/drones`
- `GET /technician/fleet/drones/{drone_id}`
- `PATCH /technician/fleet/drones/{drone_id}/status`
- `GET /technician/fleet/batteries`
- `POST /technician/fleet/batteries/{battery_id}/use`
- `POST /technician/fleet/batteries/{battery_id}/mark-charged`
- `GET /technician/fleet/drones/{drone_id}/maintenance-history`
- `GET /technician/fleet/maintenance-records/{drone_id}`
- `POST /technician/fleet/maintenance-records`
- `GET /technician/fleet/work-orders/{work_order_id}/logs`
- `GET /technician/fleet/maintenance-schedules`
- `POST /technician/fleet/maintenance-schedules`
- `GET /technician/fleet/maintenance-schedules/drone/{drone_id}`
- `GET /technician/fleet/maintenance-alerts`
- `GET /technician/fleet/maintenance-alerts/{alert_id}`
- `GET /technician/fleet/work-orders`
- `POST /technician/fleet/work-orders`
- `GET /technician/fleet/work-orders/{work_order_id}`
- `PUT /technician/fleet/work-orders/{work_order_id}`
- `DELETE /technician/fleet/work-orders/{work_order_id}`
- `PATCH /technician/fleet/work-orders/{work_order_id}/inspection`
- `POST /technician/fleet/cron/maintenance-alerts`
- `POST /technician/fleet/cron/battery-overdue-alerts`

Notification and `/users/me` helpers remain connected from the earlier Backend integration document.

## UI actions still missing Backend endpoints

Do not invent routes for these actions:

- Outbound `Dispatch`
- Transit `Dispatch / Continue`
- Transit `Cannot Continue / replacement request`
- Outbound / Transit / Battery history
- Single notification `mark read`

They remain frontend-only until Backend exposes official endpoints.

## CORS note

TanStack Query cannot fix CORS. In the screenshots supplied during integration:

- `GET /technician/fleet/drones` returned `200`.
- `GET /technician/fleet/batteries` returned `200`.
- `GET /notifications/unread-count` returned `200`.
- `GET /technician/fleet/incoming` was blocked as CORS/network.
- `GET /technician/deliveries/outbound` was blocked as CORS/network.

Because the same base URL and Bearer token work for other routes, route-specific failures on `incoming` and `outbound` must also be checked in Backend/Swagger. Test those two endpoints with Swagger `Try it out`; if they fail there as well, the route handler/server is the blocker. If they succeed in Swagger but fail only from `http://localhost:5173`, Backend must return the correct CORS headers for those responses too.
