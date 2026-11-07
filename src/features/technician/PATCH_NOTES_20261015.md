# DroneOptAI Technician — patch 2026-10-15

## Backend contracts and fixes

1. `POST /api/v1/technician/fleet/work-orders` returned HTTP 422:
   `battery_id: Input should be a valid string`. The code converted it with
   `toBackendNumericId()` and typed it as `number`. Fixed to send **string**
   and choose the raw battery identifier from `GET /technician/fleet/batteries`
   (while displaying its user-facing BAT code).
2. `GET /api/v1/technician/missions/` is present in the latest Swagger image.
   Restored that endpoint for outbound / confirmation detail enrichment;
   Transit continues to use `/technician/fleet/incoming`.
3. Outbound Prepare Battery previously called both `/batteries/{id}/use` and
   `/deliveries/outbound/{orderId}/prepare-battery` and then forced the FE to
   `Ready`. Changed to use ONLY the documented `/prepare-battery` endpoint;
   the backend response after refresh is the source of truth.
4. Outbound used to reformat order ID before mutations (risking wrong ID).
   Now keeps raw `orderId` for API and separate `orderCode` for presentation.
5. `Dispatch` was 100% local-only; no endpoint is present in supplied Swagger.
   Removed the fake mutation/client hidden records, and visibly disabled the
   control with a reason. BE/Operator must implement/provide the real flight
   departure transition before this can work end-to-end.

## Remaining backend requirements
- Confirm Work Order `battery_id` accepted value: the supplied screenshot only
  proves it must be a STRING; a value like `"7"` or `"BAT-0007"` must be verified
  against its Backend field validation. The FE uses raw battery list id when
  available.
- Provide a mission Dispatch/Departure API with authorization and validated
  mission/drone/battery readiness, or route launch via Operator. Do NOT replace
  this with localStorage/events.
- Backend should return `destination_hub_name` (or at least `destination_hub_id`)
  and battery assignment for `Ready` outbound records to populate the UI.

## Tests performed
- TypeScript / TSX parsing of each changed file.
- Full Vite/TypeScript project build not available: supplied archive only contains
  `technician/`, not the complete React repository and shared modules.

## Additional data-consistency changes
- Removed pre-seeded demo outbound rows. On API failure show the real error, not mock orders.
- Removed duplicate GET refresh inside Receive/Prepare server helpers; query mutations invalidate outbound once after success.
- Updated transitApi compatibility comment and re-export with current `/technician/missions/`.
