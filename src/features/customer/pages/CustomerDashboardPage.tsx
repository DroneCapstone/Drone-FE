import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  ArrowRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  CreditCard,
  FileText,
  MapPin,
  Package,
  Truck,
  Wallet,
  Zap,
} from "lucide-react";

import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";

import activeDeliveryImage from "../../../assets/images/customer/active-delivery.png";
import dashboardHeroImage from "../../../assets/images/customer/dashboard-hero.jpg";
import expressDeliveryImage from "../../../assets/images/customer/express-delivery.png";
import helpPoliciesImage from "../../../assets/images/customer/help-policies.png";
import notificationsImage from "../../../assets/images/customer/notifications.png";
import pricingServicesImage from "../../../assets/images/customer/pricing-services.png";
import scheduledDeliveryImage from "../../../assets/images/customer/scheduled-delivery.png";

import { customerDeliveryService } from "../services/customerDeliveryService";

import type { CustomerOrderSummary } from "../services/customerDeliveryService";

export function CustomerDashboardPage() {
  const { user } = useAuth();
  const [, setRevision] =
    useState(0);

  const deliveries = user
    ? customerDeliveryService.getOrderSummariesByCustomer(
        user.id,
      )
    : [];

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const customerId = user.id;

    // Load the list ONCE. The list response can omit estimated_arrival.
    // Then fetch details for the ONE active delivery shown on this card.
    // Never fetch payment status for every order.
    void (async () => {
      try {
        await customerDeliveryService.syncOrdersFromBackend(customerId);
        if (!active) return;
        setRevision((value) => value + 1);
      } catch (error) {
        if (active) {
          console.warn("[CustomerDashboard] Could not refresh orders", error);
        }
        return;
      }

      const currentActive = customerDeliveryService
        .getOrderSummariesByCustomer(customerId)
        .find((order) => ![
          "completed", "picked_up", "collected", "package_collected",
          "cancelled", "canceled", "rejected",
        ].includes(order.orderStatus.trim().toLowerCase()));

      if (!currentActive || !active) return;

      try {
        await customerDeliveryService.loadOrderSummaryFromBackend(
          customerId,
          currentActive.id,
        );
        if (active) setRevision((value) => value + 1);
      } catch (error) {
        // The card remains visible even when detail/ETA is temporarily unavailable.
        if (active) console.warn("[CustomerDashboard] ETA unavailable", error);
      }
    })();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const activeDeliveries = deliveries.filter((delivery) =>
    !["completed", "picked_up", "collected", "package_collected", "cancelled", "canceled", "rejected"].includes(
      delivery.orderStatus.trim().toLowerCase(),
    ),
  );

  const active =
    activeDeliveries[0];

  const completedCount =
    deliveries.filter(
      (delivery) =>
        ["completed", "picked_up", "collected", "package_collected"].includes(delivery.orderStatus.trim().toLowerCase()),
    ).length;

  const awaitingPaymentCount =
    deliveries.filter(
      (delivery) =>
        delivery.paymentStatus ===
        "pending",
    ).length;

  const firstName =
    user?.name
      ?.trim()
      .split(" ")
      .slice(-1)[0] ??
    "Customer";

  return (
    <div className="min-h-[calc(100vh-72px)] bg-transparent pb-16">
      {/* FULL-WIDTH HERO */}
      <section className="customer-keep-dark relative w-full overflow-hidden border-b border-white/[0.08] bg-[#080808] shadow-[0_20px_55px_rgba(0,0,0,0.30)]">
        <img
          src={
            dashboardHeroImage
          }
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[66%_center] sm:object-[70%_center]"
        />

        <div className="customer-hero-overlay-primary absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,6,0.96)_0%,rgba(5,5,6,0.88)_32%,rgba(5,5,6,0.54)_58%,rgba(5,5,6,0.12)_100%)]" />
        <div className="customer-hero-overlay-secondary absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.20))]" />

        <div className="relative mx-auto flex min-h-[400px] w-full max-w-[1440px] items-end px-4 py-7 sm:min-h-[470px] sm:px-6 sm:py-9 lg:min-h-[500px] lg:items-center lg:px-8 lg:py-10 xl:min-h-[520px] xl:px-10">
          <div className="max-w-[470px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/58 sm:text-[12px]">
              Welcome back
            </p>

            <h1 className="mt-3 text-[40px] font-semibold leading-[0.98] tracking-[-0.055em] text-white sm:text-[52px] lg:text-[60px]">
              Hi, {firstName}
            </h1>

            <p className="mt-4 max-w-[420px] text-[15px] leading-7 text-white/78 sm:text-[17px] sm:leading-8">
              Send a package, get a
              live quotation and track
              every handover from one
              place.
            </p>

            <div className="mt-7 grid gap-3 sm:max-w-[370px]">
              <Link
                to="/customer/deliveries/create?new=1"
                className="group inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-orange-500 px-6 text-[16px] font-semibold text-black shadow-[0_16px_34px_rgba(249,115,22,0.24)] transition hover:bg-orange-400 sm:text-[17px]"
              >
                Create delivery

                <ArrowRight
                  size={20}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>

              <Link
                to="/customer/pricing"
                className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl border border-white/[0.22] bg-black/25 px-6 text-[14px] font-semibold text-white transition hover:border-white/[0.38] hover:bg-black/35 sm:text-[15px]"
              >
                <FileText size={18} />

                View pricing & services
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-10">
        {/* DELIVERY OPTIONS */}
      <section className="mt-4 grid gap-4 sm:mt-5 md:grid-cols-2 xl:grid-cols-3 lg:gap-5">
        <DeliveryOptionCard
          to="/customer/pricing"
          image={activeDeliveryImage}
          icon={<Package size={21} />}
          title="Normal delivery"
          description="Standard service, using available flight slots."
          badge="0% service surcharge"
        />

        <DeliveryOptionCard
          to="/customer/pricing"
          image={
            scheduledDeliveryImage
          }
          icon={
            <CalendarDays
              size={21}
            />
          }
          title="Scheduled delivery"
          description="Plan ahead when your delivery time is flexible."
          badge="0% service surcharge"
        />

        <DeliveryOptionCard
          to="/customer/pricing"
          image={
            expressDeliveryImage
          }
          icon={
            <Zap size={21} />
          }
          title="Express delivery"
          description="Priority option for time-sensitive deliveries."
          badge="+25% core fee"
        />
      </section>

      {/* KPI */}
      <section className="mt-4 grid grid-cols-3 gap-2.5 sm:mt-5 sm:gap-4">
        <MetricCard
          icon={<Truck size={23} />}
          label="Active"
          value={String(
            activeDeliveries.length,
          )}
          tone="orange"
        />

        <MetricCard
          icon={<Wallet size={23} />}
          label="Awaiting payment"
          value={String(
            awaitingPaymentCount,
          )}
          tone="blue"
        />

        <MetricCard
          icon={
            <CheckCircle2
              size={23}
            />
          }
          label="Completed"
          value={String(
            completedCount,
          )}
          tone="green"
        />
      </section>

      {/* ACTIVE DELIVERY */}
      <section className="mt-8">
        <SectionHeading
          title="Active delivery"
          action="View all"
          to="/customer/deliveries"
        />

        <div className="mt-4">
          {active ? (
            <ActiveDelivery
              delivery={active}
            />
          ) : (
            <EmptyDelivery />
          )}
        </div>
      </section>

      {/* QUICK LINKS */}
      <section className="mt-8">
        <SectionHeading
          title="Quick links"
        />

        <div className="mt-4 grid gap-4 lg:grid-cols-3 lg:gap-5">
          <QuickLink
            to="/customer/pricing"
            image={
              pricingServicesImage
            }
            icon={
              <FileText size={19} />
            }
            title="Pricing & services"
            description="Compare delivery modes and fees."
          />

          <QuickLink
            to="/customer/help"
            image={
              helpPoliciesImage
            }
            icon={
              <CircleHelp
                size={19}
              />
            }
            title="Help & policies"
            description="Package, payment and handover rules."
          />

          <QuickLink
            to="/customer/notifications"
            image={
              notificationsImage
            }
            icon={
              <BellRing size={19} />
            }
            title="Notifications"
            description="See payment and order updates."
          />
        </div>
      </section>
      </div>
    </div>
  );
}

function SectionHeading({
  title,
  action,
  to,
}: {
  title: string;
  action?: string;
  to?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-[20px] font-semibold tracking-[-0.04em] text-white sm:text-[24px]">
        {title}
      </h2>

      {action && to ? (
        <Link
          to={to}
          className="group inline-flex items-center gap-2 text-[13px] font-semibold text-orange-400 transition hover:text-orange-300 sm:text-[14px]"
        >
          {action}

          <ArrowRight
            size={16}
            className="transition-transform group-hover:translate-x-1"
          />
        </Link>
      ) : null}
    </div>
  );
}

function DeliveryOptionCard({
  to,
  image,
  icon,
  title,
  description,
  badge,
}: {
  to: string;
  image: string;
  icon: ReactNode;
  title: string;
  description: string;
  badge: string;
}) {
  return (
    <Link
      to={to}
      className="customer-keep-dark group relative min-h-[215px] overflow-hidden rounded-[22px] border border-white/[0.10] bg-[#111014] shadow-[0_14px_34px_rgba(0,0,0,0.24)] sm:min-h-[245px] sm:rounded-[26px]"
    >
      <img
        src={image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
      />

      <div className="customer-card-overlay absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.10)_0%,rgba(0,0,0,0.20)_36%,rgba(7,7,9,0.84)_76%,rgba(7,7,9,0.97)_100%)]" />

      <div className="relative flex min-h-[215px] flex-col justify-end p-5 sm:min-h-[245px] sm:p-6">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ffad42] text-black shadow-[0_10px_26px_rgba(255,173,66,0.24)] sm:h-12 sm:w-12">
          {icon}
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-[21px] font-semibold tracking-[-0.035em] text-white sm:text-[25px]">
              {title}
            </h3>

            <p className="mt-1.5 max-w-[420px] text-[13px] leading-6 text-white/67 sm:text-[15px]">
              {description}
            </p>

            <span className="mt-3 inline-flex rounded-lg bg-orange-500/[0.16] px-2.5 py-1 text-[12px] font-medium text-orange-300 sm:text-[13px]">
              {badge}
            </span>
          </div>

          <ArrowRight
            size={22}
            className="mb-1 shrink-0 text-white/75 transition-transform group-hover:translate-x-1"
          />
        </div>
      </div>
    </Link>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone:
    | "orange"
    | "blue"
    | "green";
}) {
  const toneClasses = {
    orange:
      "border-orange-500/[0.22] bg-[linear-gradient(135deg,rgba(120,53,15,0.36),rgba(14,12,14,0.96))] text-orange-300",
    blue:
      "border-sky-500/[0.22] bg-[linear-gradient(135deg,rgba(17,55,105,0.34),rgba(14,12,14,0.96))] text-sky-300",
    green:
      "border-emerald-500/[0.22] bg-[linear-gradient(135deg,rgba(7,72,52,0.34),rgba(14,12,14,0.96))] text-emerald-300",
  };

  return (
    <div
      className={`min-w-0 min-h-[118px] overflow-hidden rounded-[18px] border px-3 py-3.5 shadow-[0_12px_28px_rgba(0,0,0,0.20)] sm:min-h-0 sm:rounded-[22px] sm:px-5 sm:py-5 ${
        toneClasses[tone]
      }`}
    >
      {/* Mobile: icon on top, label below, value at the bottom.
          From sm upward, keep the wider desktop layout. */}
      <div className="flex min-w-0 flex-col items-start sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-black/[0.20] sm:h-12 sm:w-12 sm:rounded-2xl">
          {icon}
        </div>

        <p className="mt-2 min-h-[28px] w-full whitespace-normal text-left text-[8px] font-semibold uppercase leading-[1.2] tracking-[0.035em] text-white/64 sm:mt-0 sm:min-h-0 sm:w-auto sm:text-right sm:text-[11px] sm:leading-4 sm:tracking-[0.10em]">
          {label}
        </p>
      </div>

      <p className="mt-2 text-[27px] font-semibold leading-none tracking-[-0.055em] text-white sm:mt-4 sm:text-[38px]">
        {value}
      </p>
    </div>
  );
}

function ActiveDelivery({
  delivery,
}: {
  delivery: CustomerOrderSummary;
}) {
  const status = delivery.statusLabel;

  return (
    <Link
      to={`/customer/deliveries/${delivery.id}`}
      className="group block overflow-hidden rounded-[22px] border border-white/[0.10] bg-[linear-gradient(135deg,rgba(20,18,22,0.98),rgba(8,8,10,0.97))] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.25)] transition hover:border-orange-500/[0.30] sm:rounded-[26px] sm:p-5 lg:grid lg:grid-cols-[190px_minmax(0,1fr)_28px] lg:items-center lg:gap-5"
    >
      <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[112px_minmax(0,1fr)] lg:contents">
        {/* Fixed aspect ratio prevents the image wrapper from stretching
            taller than the image on mobile. */}
        <div className="h-[120px] w-[96px] self-start overflow-hidden rounded-[16px] border border-white/[0.10] bg-black/20 sm:h-[140px] sm:w-[112px] lg:h-[145px] lg:w-[190px] lg:rounded-[18px]">
          <img
            src={
              activeDeliveryImage
            }
            alt=""
            className="h-full w-full object-cover object-center"
          />
        </div>

        <div className="min-w-0 pt-0.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="break-all text-[14px] font-semibold text-white sm:text-[17px] lg:text-[18px]">
              {delivery.id}
            </p>

            <span className="max-w-full rounded-full border border-orange-500/[0.25] bg-orange-500/[0.09] px-2.5 py-1 text-[10px] font-medium leading-4 text-orange-300 sm:text-[11px]">
              {status}
            </span>
          </div>

          <div className="mt-3 flex items-start gap-2 text-[12px] font-medium leading-5 text-white/80 sm:text-[14px] sm:leading-6">
            <MapPin
              size={16}
              className="mt-0.5 shrink-0 text-white/55"
            />

            <p className="min-w-0">
              {delivery.originHub.name}

              <span className="mx-2 text-white/30">
                →
              </span>

              {delivery.destinationHub.name}
            </p>
          </div>
        </div>

        {/* Equal-width columns with left / center / right alignment make
            Package, ETA and Payment visually balanced on mobile. */}
        <div className="col-span-2 mt-4 grid grid-cols-3 gap-0 border-t border-white/[0.08] pt-4 sm:mt-5 sm:pt-5 lg:col-span-1 lg:col-start-2 lg:mt-4 lg:pt-4">
          <DeliveryMeta
            align="start"
            icon={
              <Package size={15} />
            }
            value={`${delivery.weightKg === null ? "—" : `${delivery.weightKg} kg`}${delivery.packageSize ? ` · Size ${delivery.packageSize}` : ""}`}
          />

          <DeliveryMeta
            align="center"
            icon={
              <CalendarDays
                size={15}
              />
            }
            value={formatActiveDeliveryEta(delivery.estimatedArrivalAt)}
          />

          <DeliveryMeta
            align="end"
            icon={
              <CreditCard
                size={15}
              />
            }
            value={
              delivery.paymentStatus ===
              "paid"
                ? "Paid"
                : "Pending"
            }
          />
        </div>
      </div>

      <ArrowRight
        size={20}
        className="hidden text-white/35 transition-transform group-hover:translate-x-1 group-hover:text-orange-400 lg:block"
      />
    </Link>
  );
}

/** Compact, explicitly estimated arrival time for the dashboard card. */
function formatActiveDeliveryEta(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const formatted = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);

  return `Est. ${formatted.replace(", ", " · ")}`;
}

function DeliveryMeta({
  icon,
  value,
  align = "start",
}: {
  icon: ReactNode;
  value: string;
  align?: "start" | "center" | "end";
}) {
  const alignment = {
    start:
      "items-start text-left",
    center:
      "items-center text-center",
    end:
      "items-end text-right",
  };

  return (
    <div
      className={`flex min-w-0 flex-col ${alignment[align]}`}
    >
      <div className="mb-1.5 text-white/48">
        {icon}
      </div>

      <p className="w-full text-[10px] font-medium leading-4 text-white/68 sm:text-[12px] sm:leading-5">
        {value}
      </p>
    </div>
  );
}

function EmptyDelivery() {
  return (
    <div className="rounded-[22px] border border-dashed border-white/[0.12] bg-[#131216]/94 px-5 py-9 text-center sm:rounded-[26px] sm:px-7 sm:py-11">
      <p className="text-[17px] font-semibold text-white">
        No active delivery
      </p>

      <p className="mx-auto mt-2 max-w-[560px] text-[12px] leading-6 text-white/48 sm:text-[13px]">
        Create a delivery to start
        tracking package handover,
        payment and estimated arrival.
      </p>

      <Link
        to="/customer/deliveries/create?new=1"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-[13px] font-semibold text-black transition hover:bg-orange-400"
      >
        Create delivery

        <ArrowRight size={15} />
      </Link>
    </div>
  );
}

function QuickLink({
  to,
  image,
  icon,
  title,
  description,
}: {
  to: string;
  image: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group grid min-h-[128px] grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-[22px] border border-white/[0.10] bg-[#111014] shadow-[0_14px_32px_rgba(0,0,0,0.24)] transition hover:border-white/[0.17] sm:grid-cols-[160px_minmax(0,1fr)] lg:block lg:min-h-0 lg:rounded-[26px]"
    >
      <div className="overflow-hidden">
        <img
          src={image}
          alt=""
          className="h-full min-h-[128px] w-full object-cover transition duration-500 group-hover:scale-[1.035] lg:h-[180px] lg:min-h-0"
        />
      </div>

      <div className="flex min-w-0 items-center p-4 sm:p-5 lg:block">
        <div className="w-full">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#ffad42] text-black sm:h-10 sm:w-10 lg:h-11 lg:w-11 lg:rounded-2xl">
            {icon}
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-[14px] font-semibold text-white sm:text-[16px] lg:text-[18px]">
                {title}
              </h3>

              <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-white/52 sm:text-[12px] lg:text-[13px]">
                {description}
              </p>
            </div>

            <ArrowRight
              size={18}
              className="shrink-0 text-white/45 transition-transform group-hover:translate-x-1 group-hover:text-orange-400"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
