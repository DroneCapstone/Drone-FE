# Technician API audit — current Swagger / frontend

## Immediate findings

### Hub Fleet battery column
The latest integration bundle accidentally restored the Battery column from an older FleetPage version.
It has been removed again in this patch.

Hub Fleet now shows:
- Drone
- Model
- Status
- Hub
- Actions

### Battery Management shows 0 while GET /batteries returns 200
A 200 only proves the endpoint succeeded. The UI can still be empty when:
1. Backend returns an empty inventory for the Technician hub; or
2. Backend changed the response envelope / field names.

This patch broadens the parser for:
- `batteries`
- `hub_batteries`
- `battery_inventory`
- `inventory`

and battery fields such as:
- `battery_id`, `battery_code`, `code`
- `charge_level_pct`, `charge_level`, `soc`, `percentage`
- `status`, `battery_status`, `state`

If the page is still empty after this patch, inspect:
Network -> batteries -> Response.
If the response list itself is empty, the remaining issue is Backend data, not FE.

### Drone Detail
The current browser trace shows the request to the single-drone endpoint (for example `/technician/fleet/drones/2`) reaching Backend and returning HTTP 500.

This patch keeps the official detail API call, but falls back to the already-working `GET /technician/fleet/drones` data so the page does not become unusable while Backend fixes the detail endpoint.

Backend should still fix the 500 from:
`GET /api/v1/technician/fleet/drones/{drone_id}`.

---

## Swagger endpoints connected AND used by current UI

- GET `/technician/auth/`
- GET `/technician/users/`
- GET `/technician/fleet/incoming`
- POST `/technician/fleet/missions/{mission_id}/confirm-arrival`
- GET `/technician/fleet/drones`
- GET `/technician/fleet/drones/{drone_id}` (currently BE 500 for some records; FE fallback added)
- PATCH `/technician/fleet/drones/{drone_id}/status`
- GET `/technician/fleet/batteries`
- POST `/technician/fleet/batteries/{battery_id}/use`
- GET `/technician/deliveries/outbound`
- POST `/technician/deliveries/outbound/{orderId}/receive`
- POST `/technician/deliveries/outbound/{orderId}/prepare-battery`
- GET `/technician/deliveries/confirmations`
- POST `/technician/deliveries/confirmations/{orderId}/confirm-pickup`
- GET `/technician/fleet/maintenance-alerts`
- GET `/technician/fleet/work-orders`
- POST `/technician/fleet/work-orders`
- GET `/technician/fleet/work-orders/{work_order_id}`
- PUT `/technician/fleet/work-orders/{work_order_id}`
- PATCH `/technician/fleet/work-orders/{work_order_id}/inspection`
- GET `/technician/fleet/work-orders/{work_order_id}/logs`
- GET `/technician/fleet/maintenance-schedules/drone/{drone_id}`
- GET `/technician/fleet/maintenance-records/{drone_id}`
- POST `/technician/fleet/maintenance-records`
- GET `/notifications/`
- GET `/notifications/unread-count`
- PATCH `/notifications/read-all`

## Endpoint helper/hook exists, but no current UI screen/action consumes it

- GET `/technician/missions/`
- GET `/technician/ai_predictions/`
- POST `/technician/fleet/batteries/{battery_id}/mark-charged`
- GET `/technician/fleet/drones/{drone_id}/maintenance-history`
- GET `/technician/fleet/maintenance-schedules`
- POST `/technician/fleet/maintenance-schedules`
- GET `/technician/fleet/maintenance-alerts/{alert_id}`
- DELETE `/technician/fleet/work-orders/{work_order_id}`
- POST `/technician/fleet/cron/maintenance-alerts`
- POST `/technician/fleet/cron/battery-overdue-alerts`

Notes:
- `mark-charged` is intentionally not exposed if charging completion is Backend-owned/automatic.
- `cron/*` should normally be run by Backend workers, not by a normal Technician page.
- `ai_predictions` has no dedicated Technician UI in the supplied source.
- Drone Detail now consumes the per-drone maintenance schedule endpoint; the schedule list/create endpoints still have no dedicated management UI.
- Work-order history now attempts to load the Backend work-order logs endpoint and falls back to local history only when no server log data is available.
- Drone Detail now reads the per-drone maintenance-schedule endpoint when available; the list/create schedule endpoints still have no dedicated management UI.

## Current frontend-only functions because Swagger does not expose an official endpoint

- Outbound manual Dispatch
- Transit Continue / Dispatch
- Transit Cannot Continue / replacement workflow
- Transit history
- Outbound history
- Battery history
- Mark one notification as read
- Mark maintenance alert as handled

These should stay frontend-only until Backend publishes official endpoints. Do not invent API routes.

## Profile warning

The refreshed Technician Swagger screenshots show:
- GET `/technician/auth/`
- GET `/technician/users/`

but no Technician profile update endpoint.

The current FE still keeps legacy:
- PATCH `/users/me`

for compatibility. If the new Backend removed that shared endpoint, editing Profile will fail and the edit action should be disabled until Backend publishes an update endpoint.
