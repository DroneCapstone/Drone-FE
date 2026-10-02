# Battery Management — HTTP 200 but UI shows 0 batteries

## Root cause found from the supplied browser screenshot

The request to:

`GET /api/v1/technician/fleet/batteries`

returns HTTP `200`, but the response has `Content-Length: 2`. For a JSON endpoint this is consistent with the body:

```json
[]
```

Therefore the frontend has no battery rows to render. This is not a React/TanStack Query loading failure.

The database screenshot contains BAT-001/BAT-002/BAT-003, so Backend is filtering those records out before returning the Technician battery inventory.

## Backend checks required

The endpoint is Technician/hub scoped. Verify that the authenticated Technician's managed `hub_id` matches the `batteries.current_hub_id` values.

The supplied DB screenshot shows batteries at hub IDs `5`, `3`, and `6`. If the logged-in Technician manages another hub, an empty list is correct.

Also verify the Backend query does not exclude the current DB status. The screenshot stores battery status as `Active`, while the Technician UI needs an operational battery state such as `Ready` / `Charging` (or the Backend should deliberately map `Active` using charge level).

Recommended Backend diagnostic query/logic:

```sql
-- 1. Find the hub managed by the logged-in technician.
SELECT id, hub_id, email
FROM users
WHERE id = :current_user_id;

-- 2. Check batteries actually assigned to that hub.
SELECT id, serial_number, capacity_wh, status,
       drone_id, current_hub_id, charge_level_pct
FROM batteries
WHERE current_hub_id = :technician_hub_id;
```

If query 2 returns zero rows, update/seed `current_hub_id` correctly. Do not work around this by inserting mock batteries in the frontend.

## Frontend fixes included in this bundle

1. Battery mapping now follows the current Swagger response exactly.
2. `serial_number` is used as the human-readable Battery ID; numeric DB `id` is retained separately for mutation endpoints.
3. `capacity_wh`, `current_hub_id`, `drone_id`, and `charge_level_pct` are mapped.
4. Generic Backend status `Active` is converted to `Ready` when charge is 100%, otherwise `Charging`, until Backend exposes a dedicated operational state.
5. Invalid `estimated_ready_at` values no longer throw while mapping.
6. The empty state now distinguishes "Backend returned no hub batteries" from "the selected UI status filter has no match".
7. Battery Management displays Capacity from the API response.
8. The page no longer labels an empty response as hard-coded `Hub HCM-02`.

## Important

These frontend changes make the UI correctly consume non-empty Backend data, but they cannot display BAT-001/BAT-002/BAT-003 while the endpoint itself returns `[]`.

The Backend data/hub assignment must be corrected so this endpoint returns the records.
