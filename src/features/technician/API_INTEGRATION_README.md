# Technician Backend API integration — refreshed Swagger 02 Oct 2026

## 1. Root `.env`

```env
VITE_API_BASE_URL=https://execute-blind-pitch-frequently.trycloudflare.com/api/v1
VITE_API_WITH_CREDENTIALS=false
VITE_ENABLE_DEMO_AUTH=false
```

Restart Vite after changing `.env`.

## 2. Authentication

Every Technician request uses the Backend access token from:

```ts
authService.getAccessToken()
```

and sends:

```http
Authorization: Bearer <access_token>
```

If the Backend returns `401`, the client attempts `authService.refreshAccessToken()` once and retries once.

## 3. Swagger changes handled in this version

New endpoints added to the frontend API layer:

```text
GET /api/v1/technician/auth/
GET /api/v1/technician/users/
GET /api/v1/technician/ai_predictions/
```

The refreshed Swagger still shows the same paths for:
- Missions
- Deliveries
- Fleet
- Batteries
- Maintenance records
- Maintenance schedules
- Maintenance alerts
- Work orders
- Cron workers

So those endpoint paths were preserved rather than changed unnecessarily.

## 4. New source files

```text
api/authApi.ts
api/userApi.ts
api/aiPredictionsApi.ts
hooks/useTechnicianMetaQueries.ts
```

New query keys:

```text
technicianAuth
technicianUsers
aiPredictions
```

## 5. Profile behavior

The Technician profile lookup now prefers:

```text
GET /technician/auth/
```

If that response does not contain profile identity fields, it tries:

```text
GET /technician/users/
```

and resolves the current logged-in Technician by email/id.

`/users/me` is retained only as a compatibility fallback because the screenshots do not show a new Technician PATCH profile endpoint.

## 6. Work-order Technician directory

`GET /technician/users/` is connected to the Work Order form as datalist suggestions for the `Assigned technician` field. The mapping accepts common response field names such as:

```text
full_name
name
username
email
```

This keeps the frontend tolerant while Backend response DTOs are still changing.

## 7. AI predictions

The API and TanStack hook are ready:

```ts
getTechnicianAiPredictionsApi()
useTechnicianAiPredictionsQuery()
```

No new UI page was invented because the supplied Technician frontend has no AI prediction screen and the Swagger screenshot provides only the GET endpoint name, not a required presentation flow.

## 8. Do not invent missing actions

No official endpoint was shown for:
- Outbound dispatch
- Transit continue/dispatch
- Cannot-continue/replacement request
- history APIs

Those remain frontend-only until Backend exposes them.

See `TECHNICIAN_API_COVERAGE.md` for the full path-by-path checklist.
