import { ArrowRight, Package, Plus } from "lucide-react";

import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";

import {
  customerDeliveryService,
  formatDateTime,
} from "../services/customerDeliveryService";

export function MyDeliveriesPage() {
  const { user } = useAuth();

  const deliveries = user
    ? customerDeliveryService.getByCustomer(user.id)
    : [];

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12 lg:px-10 lg:py-14">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-orange-500">
            Deliveries
          </p>

          <h1 className="mt-3 text-[38px] font-semibold tracking-[-0.04em] text-white lg:text-[44px]">
            My deliveries
          </h1>

          <p className="mt-3 max-w-[620px] text-[14px] leading-6 text-white/[0.52]">
            Review your delivery requests, payment state and handover progress.
          </p>
        </div>

        <Link
          to="/customer/deliveries/create"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 text-[14px] font-semibold text-black transition hover:bg-orange-400"
        >
          <Plus size={16} />
          Create delivery
        </Link>
      </div>

      <section className="mt-10 overflow-hidden rounded-2xl border border-white/[0.10] bg-[#0d0d10]/95 shadow-[0_14px_34px_rgba(0,0,0,0.30)] backdrop-blur-sm">
        {deliveries.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-[#15151b] text-white/[0.45]">
              <Package size={20} />
            </div>

            <p className="mt-5 text-[16px] font-medium text-white/[0.82]">
              No deliveries yet
            </p>

            <p className="mt-2 max-w-[360px] text-[13px] leading-6 text-white/[0.48]">
              Create your first hub-to-hub delivery and it will appear here.
            </p>

            <Link
              to="/customer/deliveries/create"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg border border-white/[0.11] bg-[#15151b] px-5 text-[13px] font-medium text-white/[0.78] transition hover:border-orange-500/[0.35] hover:text-white"
            >
              Create delivery
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[150px_minmax(0,1fr)_170px_36px] gap-5 border-b border-white/[0.08] bg-white/[0.018] px-6 py-4 md:grid">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/[0.38]">
                Order
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/[0.38]">
                Route / package
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/[0.38]">
                Status
              </span>
              <span />
            </div>

            {deliveries.map((delivery) => {
              const status = customerDeliveryService.getCustomerStatus(delivery);

              return (
                <Link
                  key={delivery.id}
                  to={`/customer/deliveries/${delivery.id}`}
                  className="group grid gap-5 border-b border-white/[0.075] px-6 py-6 transition last:border-b-0 hover:bg-white/[0.028] md:grid-cols-[150px_minmax(0,1fr)_170px_36px] md:items-center"
                >
                  <div>
                    <p className="text-[14px] font-semibold text-white/[0.88]">
                      {delivery.id}
                    </p>

                    <p className="mt-1 text-[11px] text-white/[0.40]">
                      {formatDateTime(delivery.createdAt)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[14px] text-white/[0.78]">
                      {delivery.originHub.name}
                      <span className="mx-3 text-white/[0.22]">→</span>
                      {delivery.destinationHub.name}
                    </p>

                    <p className="mt-2 text-[12px] text-white/[0.48]">
                      {delivery.weightKg} kg · Size {delivery.packageSize}
                    </p>
                  </div>

                  <div>
                    <span className="inline-flex rounded-full border border-orange-500/[0.15] bg-orange-500/[0.055] px-3 py-1.5 text-[12px] font-medium text-white/[0.72]">
                      {status}
                    </span>
                  </div>

                  <ArrowRight
                    size={17}
                    className="text-white/[0.25] transition group-hover:translate-x-1 group-hover:text-orange-500"
                  />
                </Link>
              );
            })}
          </>
        )}
      </section>
    </div>
  );
}
