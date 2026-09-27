import {
  ArrowRight,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";

import {
  customerDeliveryService,
  formatDateTime,
} from "../services/customerDeliveryService";

export function MyDeliveriesPage() {
  const { user } =
    useAuth();

  const deliveries =
    user
      ? customerDeliveryService.getByCustomer(
          user.id,
        )
      : [];

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-14 lg:px-10">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-orange-500">
            Deliveries
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">
            My deliveries
          </h1>
        </div>

        <Link
          to="/customer/deliveries/create"
          className="bg-orange-500 px-6 py-3 text-sm font-semibold text-black hover:bg-orange-400"
        >
          Create delivery
        </Link>
      </div>

      <div className="mt-12 border-t border-white/10">
        {deliveries.length ===
        0 ? (
          <div className="py-20 text-center">
            <p className="text-white/40">
              You don't have any
              deliveries yet.
            </p>
          </div>
        ) : (
          deliveries.map(
            (delivery) => {
              const status =
                customerDeliveryService.getCustomerStatus(
                  delivery,
                );

              return (
                <Link
                  key={
                    delivery.id
                  }
                  to={`/customer/deliveries/${delivery.id}`}
                  className="group grid gap-5 border-b border-white/10 py-7 transition hover:bg-white/[0.015] md:grid-cols-[150px_1fr_220px_30px]"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {
                        delivery.id
                      }
                    </p>

                    <p className="mt-1 text-[11px] text-white/25">
                      {formatDateTime(
                        delivery.createdAt,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-white/80">
                      {
                        delivery
                          .originHub
                          .name
                      }
                      <span className="mx-3 text-white/20">
                        →
                      </span>
                      {
                        delivery
                          .destinationHub
                          .name
                      }
                    </p>

                    <p className="mt-2 text-xs text-white/30">
                      {
                        delivery.weightKg
                      }{" "}
                      kg · Size{" "}
                      {
                        delivery.packageSize
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-white/65">
                      {status}
                    </p>
                  </div>

                  <ArrowRight
                    size={17}
                    className="text-white/20 transition group-hover:translate-x-1 group-hover:text-orange-500"
                  />
                </Link>
              );
            },
          )
        )}
      </div>
    </div>
  );
}