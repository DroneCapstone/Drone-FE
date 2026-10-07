# DroneOptAI Customer API Integration

## Base URL

The API client uses:

```env
VITE_API_BASE_URL=https://your-backend.example.com
```

Do not add a trailing `/`.

## Connected endpoints

### Profile
- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`

### Customer hubs / order flow
- `GET /api/v1/customer/hubs`
- `POST /api/v1/customer/orders/estimate`
- `POST /api/v1/customer/orders`

### Payments
- `POST /api/v1/payments/orders/{order_id}/checkout`
- `GET /api/v1/payments/orders/{order_id}/status`
- `POST /api/v1/payments/orders/{order_id}/cancel` is exposed by `customerApi.ts`

### Notifications
- `GET /api/v1/notifications/`
- `GET /api/v1/notifications/unread-count`
- `PATCH /api/v1/notifications/{notification_id}/read`
- `PATCH /api/v1/notifications/read-all`

### Other customer endpoints exposed in the client
- `GET /api/v1/customer/missions/`
- `GET /api/v1/customer/fleet/`
- `GET /api/v1/customer/ai_predictions/`

## Important backend contract gaps

### 1. Customer order list/detail GET endpoints are missing

Swagger currently has `POST /api/v1/customer/orders` but does not list:

```text
GET /api/v1/customer/orders
GET /api/v1/customer/orders/{order_id}
```

Because of that, Dashboard / My Deliveries / Delivery Detail still read a local cache of orders that were successfully created through the backend. This is not a mock order creation flow: order IDs come from the backend, but list/detail persistence across browsers/devices cannot be fully server-backed until those GET endpoints exist.

### 2. Insurance is not supported by the uploaded API contract

The FE previously had package insurance +10%, but the uploaded estimate/create-order request schemas do not contain an insurance field. The checkbox is therefore disabled to avoid showing one price in FE and charging a different price in PayOS.

Recommended backend fields:

```json
{
  "insurance": true
}
```

for both estimate and create-order payloads.

### 3. Fragile pricing cannot be calculated from the documented estimate request

The uploaded estimate request accepts hub IDs, payload, size, delivery mode and requested time, but not `package_type`. Therefore the backend estimate cannot know that the selected category is `Fragile items` from the documented contract.

Recommended addition to estimate request:

```json
{
  "package_type": "Fragile items"
}
```

Then BE can apply the agreed fragile surcharge and return the authoritative total.

## Payment behavior

Review -> `POST /customer/orders` -> Payment page -> `POST /payments/orders/{id}/checkout` -> PayOS.

Payment page polls `GET /payments/orders/{id}/status` every 4 seconds. When backend reports paid, FE updates the local cache and routes to Payment Success.

## Auth token

`customerApi.ts` sends `credentials: include` and also looks for common bearer-token localStorage keys:

- `access_token`
- `accessToken`
- `token`
- `auth_token`
- nested values in `auth`, `session`, `droneoptai.auth`, `droneoptai.session`

If your AuthProvider stores the token under a different key, edit `getAccessToken()` in `services/customerApi.ts`.
