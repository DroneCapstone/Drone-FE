# Technician BE connection check — Swagger refresh 02 Oct 2026

## Quick smoke test

After logging in with a real Technician account:

1. `GET /api/v1/technician/auth/` -> expect `200`.
2. `GET /api/v1/technician/users/` -> expect `200`.
3. `GET /api/v1/technician/missions/` -> expect `200`.
4. `GET /api/v1/technician/ai_predictions/` -> expect `200`.
5. Hub Fleet -> `GET /technician/fleet/drones`.
6. Transit -> `GET /technician/fleet/incoming`.
7. Battery -> `GET /technician/fleet/batteries`.
8. Outbound -> `GET /technician/deliveries/outbound`.
9. Confirmations -> `GET /technician/deliveries/confirmations`.
10. Maintenance -> alerts + work orders.

## Status interpretation

- `200`: endpoint and auth are working.
- `401`: token/session/authentication problem.
- `403`: authenticated but role/permission denied.
- `404`: route or identifier mismatch.
- `422`: request/path/body validation mismatch.
- `500`: request reached Backend but route/service/query/serialization failed.
- Browser CORS error with no normal HTTP response: Backend CORS/preflight/error-header configuration.

## Important

A `500 Internal Server Error` is not fixed by changing TanStack Query or the frontend URL when the request URL/method are already correct. Backend should check the server traceback.
