# Technician API coverage

## Used directly by current UI

- `GET /technician/fleet/drones`
- `GET /technician/fleet/drones/{drone_id}`
- `PATCH /technician/fleet/drones/{drone_id}/status`
- `GET /technician/fleet/incoming`
- `POST /technician/fleet/missions/{mission_id}/confirm-arrival`
- `GET /technician/fleet/batteries`
- `POST /technician/fleet/batteries/{battery_id}/use`
- `GET /technician/deliveries/outbound`
- `POST /technician/deliveries/outbound/{orderId}/receive`
- `POST /technician/deliveries/outbound/{orderId}/prepare-battery`
- `GET /technician/deliveries/confirmations`
- `POST /technician/deliveries/confirmations/{orderId}/confirm-pickup`
- `GET /technician/fleet/maintenance-alerts`
- `GET /technician/fleet/work-orders`
- `POST /technician/fleet/work-orders`
- `GET /technician/fleet/work-orders/{work_order_id}`
- `PUT /technician/fleet/work-orders/{work_order_id}`
- `PATCH /technician/fleet/work-orders/{work_order_id}/inspection`
- `GET /technician/fleet/maintenance-records/{drone_id}`
- `POST /technician/fleet/maintenance-records`
- Notification and `/users/me` endpoints from the earlier integration document.

## API helper + TanStack hook ready, but no dedicated UI action currently requires it

- `GET /technician/missions/`
- `GET /technician/fleet/drones/{drone_id}/maintenance-history`
- `POST /technician/fleet/batteries/{battery_id}/mark-charged`
- `GET /technician/fleet/maintenance-alerts/{alert_id}`
- `DELETE /technician/fleet/work-orders/{work_order_id}`
- `GET /technician/fleet/work-orders/{work_order_id}/logs`
- `GET /technician/fleet/maintenance-schedules`
- `POST /technician/fleet/maintenance-schedules`
- `GET /technician/fleet/maintenance-schedules/drone/{drone_id}`
- `POST /technician/fleet/cron/maintenance-alerts`
- `POST /technician/fleet/cron/battery-overdue-alerts`

The two `/cron/...` endpoints should normally be invoked by Backend scheduling/worker infrastructure, not polled by the browser.

## No official Backend endpoint in the supplied Swagger list

- Outbound Dispatch
- Transit Dispatch / Continue
- Transit Cannot Continue / replacement request
- Transit / Outbound / Battery history
- Single-notification mark-read

Those frontend-only behaviours are preserved where needed but should be replaced once Backend exposes official endpoints.
