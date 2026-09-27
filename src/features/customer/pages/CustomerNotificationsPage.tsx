import { useAuth } from "../../auth/hooks/useAuth";

import {
  customerDeliveryService,
  formatDateTime,
} from "../services/customerDeliveryService";

export function CustomerNotificationsPage() {
  const { user } =
    useAuth();

  const deliveries =
    user
      ? customerDeliveryService.getByCustomer(
          user.id,
        )
      : [];

  const notifications =
    deliveries.flatMap(
      (delivery) => {
        const items = [
          {
            id: `${delivery.id}-created`,
            title:
              "Delivery order created",
            description: `${delivery.id} has been created successfully.`,
          },
        ];

        if (
          delivery.paymentStatus ===
          "paid"
        ) {
          items.push({
            id: `${delivery.id}-paid`,
            title:
              "Payment confirmed",
            description: `Payment for ${delivery.id} has been confirmed.`,
          });
        }

        if (
          delivery.paymentStatus ===
            "paid" &&
          !delivery.packageReceivedAtHub
        ) {
          items.push({
            id: `${delivery.id}-handover`,
            title:
              "Package handover required",
            description: `Bring your package to ${delivery.originHub.name} before ${formatDateTime(delivery.handoverDeadlineAt)}.`,
          });
        }

        return items;
      },
    );

  return (
    <div className="mx-auto max-w-[900px] px-6 py-14 lg:px-10">
      <h1 className="text-4xl font-semibold tracking-[-0.04em]">
        Notifications
      </h1>

      <div className="mt-10 border-t border-white/10">
        {notifications.length ===
        0 ? (
          <p className="py-16 text-sm text-white/30">
            No notifications yet.
          </p>
        ) : (
          notifications.map(
            (item) => (
              <article
                key={item.id}
                className="border-b border-white/10 py-6"
              >
                <p className="text-sm font-medium">
                  {item.title}
                </p>

                <p className="mt-2 text-xs leading-6 text-white/35">
                  {item.description}
                </p>
              </article>
            ),
          )
        )}
      </div>
    </div>
  );
}