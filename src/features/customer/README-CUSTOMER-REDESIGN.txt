DroneOptAI Customer UI Redesign

Structure
- Dashboard
- Create delivery
- My deliveries
- Notifications
- Pricing & services
- Help & policies
- Profile

Main changes
- Customer logo now returns to /customer/dashboard instead of public landing page.
- Added Pricing & services page.
- Added Help & policies page.
- Dashboard redesigned as a customer service workspace rather than a second landing page.
- Mobile navigation exposes the complete customer structure.
- Profile page redesigned and linked to pricing/help/notifications.

API safety
The following files were intentionally kept unchanged from the uploaded source:
- services/customerApi.ts
- services/customerDeliveryService.ts
- services/customerProfileService.ts
- types/customer.ts

Existing estimate, order, PayOS, notifications, profile and payment API integration remains unchanged.
