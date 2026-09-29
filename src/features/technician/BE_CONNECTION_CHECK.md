# Technician BE connection check

## Frontend issues fixed

- [x] `/api/v1` base normalization
- [x] Bearer token from Auth service
- [x] 401 refresh + one retry
- [x] list envelope parsing
- [x] no fake TanStack placeholder rows for live API lists
- [x] Battery page no longer depends on Outbound API
- [x] hard-coded hub filtering removed from server-scoped lists
- [x] demo battery fallback removed from Fleet / Drone Detail
- [x] reduced query refetch spam
- [x] readable FastAPI 422 messages
- [x] all Technician Swagger endpoints represented in the API layer

## Backend checks still required

From the screenshots, these requests were still browser-blocked while other protected Technician endpoints returned 200:

```text
GET /api/v1/technician/fleet/incoming
GET /api/v1/technician/deliveries/outbound
```

Ask Backend to test both endpoints directly in Swagger with the same Technician account. If Swagger returns an application error/500, fix the route handler first. If Swagger returns 200 but the browser reports CORS, ensure CORS middleware covers `http://localhost:5173` and also adds headers to error responses.

## Recommended test order

1. Login as real Technician.
2. `GET /api/v1/users/me` -> 200.
3. Hub Fleet -> only `drones` (+ header profile/unread-count) should be relevant.
4. Battery Management -> `batteries` should return and render; Outbound must not be required.
5. Transit Missions -> test `incoming`; only after real rows load, test `confirm-arrival`.
6. Outbound Deliveries -> test `outbound`, then `receive`, then battery use + `prepare-battery`.
7. Delivery Confirmations -> `confirmations`, then `confirm-pickup`.
8. Maintenance Alerts / Work Orders -> list, create, detail, update, inspection, record.
