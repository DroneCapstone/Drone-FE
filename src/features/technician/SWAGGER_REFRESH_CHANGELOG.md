# Changes in this Technician bundle

Swagger refresh basis: screenshots supplied by user on 02 Oct 2026.

## Added endpoints
- GET /api/v1/technician/auth/
- GET /api/v1/technician/users/
- GET /api/v1/technician/ai_predictions/

## Existing endpoints verified against screenshots
- GET /api/v1/technician/missions/
- Technician Deliveries endpoints
- Technician Fleet endpoints
- Maintenance records / schedules / alerts / work orders
- Cron maintenance / battery-overdue alert workers

## Frontend changes
- Added API modules for auth/users/ai predictions.
- Added TanStack query hooks and query keys.
- Profile lookup now prefers Technician-scoped auth/users endpoints.
- Work Order form can load Technician names from `/technician/users/`.
- Response unwrapping supports `users`, `technicians`, `auth`, `predictions`, and `ai_predictions`.
- Kept legacy `/users/me` only as compatibility fallback because no Technician profile PATCH endpoint is shown in the screenshots.
- No fake Backend route was invented for dispatch/continue/replacement/history actions.
