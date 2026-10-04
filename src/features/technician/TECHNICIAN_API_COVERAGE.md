# Technician API coverage — Swagger refresh 02 Oct 2026

This bundle was checked against the Technician Swagger screenshots supplied on 02 Oct 2026.

## New Technician endpoints added

- `GET /technician/auth/`
- `GET /technician/users/`
- `GET /technician/ai_predictions/`

`GET /technician/missions/` was already present in the frontend API layer and remains unchanged.

## Deliveries — paths unchanged

- `GET /technician/deliveries/outbound`
- `POST /technician/deliveries/outbound/{orderId}/receive`
- `POST /technician/deliveries/outbound/{orderId}/prepare-battery`
- `GET /technician/deliveries/confirmations`
- `POST /technician/deliveries/confirmations/{orderId}/confirm-pickup`

## Fleet / maintenance — paths unchanged

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

## Current UI usage

Used by existing Technician screens:
- Fleet list/detail/status
- Transit incoming + confirm arrival
- Battery inventory/use
- Outbound list/receive/prepare battery
- Delivery confirmations/confirm pickup
- Maintenance alerts
- Work orders + detail/update/inspection
- Maintenance records
- Notifications
- Profile

New connections:
- `/technician/auth/` is preferred for Technician identity/profile lookup.
- `/technician/users/` is used as the Technician directory and as a profile fallback.
- `/technician/ai_predictions/` has an API helper and TanStack query hook ready. No dedicated Technician AI-predictions screen exists in the supplied frontend, so the endpoint is not polled automatically.
- `/technician/missions/` has an API helper and TanStack query hook ready. Transit continues to use `/technician/fleet/incoming` because that endpoint is specifically the hub-handling queue.

## Important: endpoints not shown in the supplied Swagger screenshots

The screenshots do not show official Backend endpoints for:
- Outbound Dispatch
- Transit Dispatch / Continue
- Transit Cannot Continue / replacement request
- Transit / Outbound / Battery history
- Single-notification mark-read
- Technician profile update

Do not invent routes for these actions. Existing frontend-only behavior remains until Backend publishes official endpoints.

## Profile compatibility note

The refreshed Technician Swagger shows `GET /technician/auth/` and `GET /technician/users/`, but no Technician profile-update endpoint. The frontend therefore:
1. reads identity from `/technician/auth/`,
2. falls back to `/technician/users/`,
3. keeps legacy `/users/me` only as a compatibility fallback for older/shared backend builds.

The old `PATCH /users/me` is kept only for deployments where the shared Users router still exposes it.


See `TECHNICIAN_API_AUDIT_CURRENT.md` for the latest screen-level usage audit and known remaining gaps.
