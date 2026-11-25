import type {
  ReactNode,
} from "react";

import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Package,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import { Link } from "react-router-dom";

import activeDeliveryImage from "../../../assets/images/customer/active-delivery.png";
import expressDeliveryImage from "../../../assets/images/customer/express-delivery.png";
import scheduledDeliveryImage from "../../../assets/images/customer/scheduled-delivery.png";

import {
  PACKAGE_SIZE_RULES,
} from "../data/customerData";

import {
  formatVnd,
} from "../services/customerDeliveryService";

const pricingTiers = [
  {
    size: "S" as const,
    maxPayload: "≤ 1 kg",
    baseFee: 20000,
    distanceRate: 4000,
    payloadRate: 3000,
  },
  {
    size: "M" as const,
    maxPayload: "≤ 3 kg",
    baseFee: 30000,
    distanceRate: 5000,
    payloadRate: 4000,
  },
  {
    size: "L" as const,
    maxPayload: "≤ 5 kg",
    baseFee: 45000,
    distanceRate: 6000,
    payloadRate: 5000,
  },
  {
    size: "XL" as const,
    maxPayload: "≤ 10 kg",
    baseFee: 65000,
    distanceRate: 8000,
    payloadRate: 6000,
  },
];

export function PricingServiceInfoPage() {
  return (
    <div className="mx-auto w-full max-w-[1360px] px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8 xl:px-10">
      {/* TOP INTRO */}
      <section className="overflow-hidden rounded-[24px] border border-white/[0.09] bg-[#111014] shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
        <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
          <div className="p-5 sm:p-7 lg:p-9">
            <h1 className="max-w-[640px] text-[34px] font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-[44px]">
              Choose a delivery option that fits your order
            </h1>

            <p className="mt-4 max-w-[620px] text-[14px] leading-6 text-white/[0.74] sm:text-[14px]">
              Compare speed, package limits and fees before you book.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <MiniPill>
                Up to 10 kg
              </MiniPill>

              <MiniPill>
                Live quotation
              </MiniPill>

              <MiniPill>
                Hub-to-hub
              </MiniPill>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/customer/deliveries/create?new=1"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 text-[14px] font-semibold text-black transition hover:bg-orange-400"
              >
                Get a quote

                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>

              <a
                href="#package-guide"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.025] px-6 text-[14px] font-semibold text-white/[0.90] transition hover:border-white/[0.20] hover:text-white"
              >
                View package sizes
              </a>
            </div>
          </div>

          <div className="relative hidden min-h-[320px] overflow-hidden lg:block">
            <img
              src={expressDeliveryImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,16,20,0.82),rgba(17,16,20,0.08)_44%,rgba(17,16,20,0.02))]" />

            <div className="customer-keep-dark absolute bottom-5 right-5 rounded-2xl border border-white/[0.12] bg-black/50 px-4 py-3 backdrop-blur-md">
              <p className="text-[10px] font-semibold capitalize tracking-normal text-white/[0.96]">
                Final price
              </p>

              <p className="mt-1 text-[14px] font-semibold text-white">
                Quoted before payment
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DELIVERY OPTIONS */}
      <section className="mt-8">
        <SectionHeader
          title="Choose your delivery"
          subtitle=""
        />

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <CommerceServiceCard
            image={activeDeliveryImage}
            icon={<Package size={20} />}
            title="Normal delivery"
            subtitle="Standard"
            description="Standard delivery using available flight capacity, without choosing a fixed departure time."
            fee="0% surcharge"
            points={[
              "Standard scheduling based on available flights",
              "No delivery-mode surcharge",
            ]}
          />

          <CommerceServiceCard
            image={scheduledDeliveryImage}
            icon={
              <CalendarDays
                size={20}
              />
            }
            title="Scheduled delivery"
            subtitle="Plan ahead"
            description="Choose a preferred delivery time when your shipment is flexible."
            fee="0% surcharge"
            points={[
              "Choose a requested delivery time",
              "Best for planned shipments",
            ]}
          />

          <CommerceServiceCard
            image={expressDeliveryImage}
            icon={<Zap size={20} />}
            title="Express delivery"
            subtitle="Fastest"
            description="Priority handling for packages that need to move sooner."
            fee="+25% core fee"
            points={[
              "Priority delivery option",
              "Best for urgent shipments",
            ]}
            featured
          />
        </div>
      </section>

      {/* PRICE AT A GLANCE */}
      <section className="mt-8">
        <SectionHeader
          title="Price at a glance"
          subtitle=""
        />

        <div className="mt-4 rounded-[22px] border border-white/[0.10] bg-[#151217]/94 p-4 sm:p-5">
          <div className="grid grid-cols-3 gap-2.5">
            <PriceTile
              label="Base fee"
              value="By size"
            />

            <PriceTile
              label="Distance"
              value="Per km"
            />

            <PriceTile
              label="Payload"
              value="Per kg"
            />
          </div>

          <div className="my-4 h-px bg-white/[0.07]" />

          <div className="flex flex-wrap gap-2">
            <SurchargeChip
              label="Fragile"
              value="+15%"
            />

            <SurchargeChip
              label="Insurance"
              value="+10%"
            />

            <SurchargeChip
              label="Express"
              value="+25%"
            />

            <SurchargeChip
              label="Normal"
              value="0%"
              muted
            />
            <SurchargeChip
              label="Scheduled"
              value="0%"
              muted
            />
          </div>

          <details className="group mt-4 border-t border-white/[0.07] pt-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[13px] font-medium text-white/[0.80]">
              How the final price is calculated

              <ChevronDown
                size={16}
                className="transition-transform group-open:rotate-180"
              />
            </summary>

            <div className="mt-3 rounded-xl bg-black/[0.12] px-4 py-3 text-[12px] leading-6 text-white/[0.72]">
              Core fee = Base fee + Distance fee + Payload fee. Normal and Scheduled have no delivery-mode surcharge; Express adds 25% of core fee. Fragile handling and insurance can still add fees when selected. The final quotation is always returned by the backend.
            </div>
          </details>
        </div>
      </section>

      {/* PACKAGE GUIDE */}
      <section
        id="package-guide"
        className="mt-8"
      >
        <SectionHeader
          title="Package size guide"
          subtitle=""
        />

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {pricingTiers.map(
            (tier) => (
              <PackageCard
                key={tier.size}
                tier={tier}
              />
            ),
          )}
        </div>

        <details className="group mt-4 overflow-hidden rounded-[22px] border border-white/[0.10] bg-[#151217]/94">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-[14px] font-semibold text-white/[0.96]">
                Detailed rate table
              </p>

              <p className="mt-1 text-[11px] text-white/[0.68]">
                Base fee, rate per km and rate per kg
              </p>
            </div>

            <ChevronDown
              size={17}
              className="shrink-0 text-white/[0.96] transition-transform group-open:rotate-180"
            />
          </summary>

          <div className="border-t border-white/[0.07]">
            <div className="hidden md:block">
              <div className="grid grid-cols-[80px_130px_1fr_120px_120px_120px] gap-4 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.10em] text-white/[0.62]">
                <span>Size</span>
                <span>Payload</span>
                <span>Dimensions</span>
                <span>Base</span>
                <span>Per km</span>
                <span>Per kg</span>
              </div>

              {pricingTiers.map(
                (tier) => (
                  <div
                    key={
                      tier.size
                    }
                    className="grid grid-cols-[80px_130px_1fr_120px_120px_120px] items-center gap-4 border-t border-white/[0.06] px-5 py-3 text-[12px]"
                  >
                    <strong className="text-white">
                      {tier.size}
                    </strong>

                    <span className="text-white/[0.90]">
                      {
                        tier.maxPayload
                      }
                    </span>

                    <span className="text-white/[0.96]">
                      {
                        PACKAGE_SIZE_RULES[
                          tier.size
                        ].dimensions
                      }
                    </span>

                    <span className="text-white/[0.90]">
                      {formatVnd(
                        tier.baseFee,
                      )}
                    </span>

                    <span className="text-white/[0.90]">
                      {formatVnd(
                        tier.distanceRate,
                      )}
                    </span>

                    <span className="text-white/[0.90]">
                      {formatVnd(
                        tier.payloadRate,
                      )}
                    </span>
                  </div>
                ),
              )}
            </div>

            <div className="divide-y divide-white/[0.06] md:hidden">
              {pricingTiers.map(
                (tier) => (
                  <div
                    key={
                      tier.size
                    }
                    className="px-5 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-[14px] text-white">
                        Size {tier.size}
                      </strong>

                      <span className="text-[11px] font-semibold text-orange-300">
                        {
                          tier.maxPayload
                        }
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <SmallRate
                        label="Base"
                        value={formatVnd(
                          tier.baseFee,
                        )}
                      />

                      <SmallRate
                        label="/ km"
                        value={formatVnd(
                          tier.distanceRate,
                        )}
                      />

                      <SmallRate
                        label="/ kg"
                        value={formatVnd(
                          tier.payloadRate,
                        )}
                      />
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </details>
      </section>

      {/* EXTRA SERVICES */}
      <section className="mt-8">
        <SectionHeader
          title="Extra services"
          subtitle=""
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ExtraServiceCard
            icon={
              <ShieldCheck
                size={20}
              />
            }
            title="Package insurance"
            text="Optional protection for your shipment."
            price="+10% core fee"
          />

          <ExtraServiceCard
            icon={
              <Sparkles size={20} />
            }
            title="Fragile handling"
            text="Extra handling for fragile package types."
            price="+15% core fee"
          />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mt-8 rounded-[22px] border border-orange-500/[0.16] bg-[linear-gradient(135deg,rgba(249,115,22,0.09),rgba(21,18,23,0.96))] p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[18px] font-semibold text-white">
              Ready to check your price?
            </p>

            <p className="mt-1.5 max-w-[600px] text-[12px] leading-5 text-white/[0.96]">
              Enter your route and package details to get the live quotation.
            </p>
          </div>

          <Link
            to="/customer/deliveries/create?new=1"
            className="group inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 text-[14px] font-semibold text-black transition hover:bg-orange-400"
          >
            Create delivery

            <ArrowRight
              size={15}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <h2 className="text-[20px] font-semibold tracking-[-0.035em] text-white sm:text-[22px]">
        {title}
      </h2>

      <p className="mt-1.5 max-w-[720px] text-[12px] leading-5 text-white/[0.68] sm:text-[13px]">
        {subtitle}
      </p>
    </div>
  );
}

function MiniPill({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="rounded-full border border-white/[0.09] bg-white/[0.035] px-3 py-1.5 text-[11px] font-medium text-white/[0.80]">
      {children}
    </span>
  );
}

function CommerceServiceCard({
  image,
  icon,
  title,
  subtitle,
  description,
  fee,
  points,
  featured = false,
}: {
  image: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  description: string;
  fee: string;
  points: string[];
  featured?: boolean;
}) {
  return (
    <article
      className={`overflow-hidden rounded-[22px] border bg-[#151217]/94 ${
        featured
          ? "border-orange-500/[0.22]"
          : "border-white/[0.10]"
      }`}
    >
      <div className="customer-keep-dark relative h-[155px] sm:h-[180px]">
        <img
          src={image}
          alt=""
          className="h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(10,8,11,0.18)_46%,rgba(10,8,11,0.76)_100%)]" />

        <div className="absolute left-4 top-4 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-400 text-black shadow-[0_10px_24px_rgba(251,146,60,0.25)]">
            {icon}
          </div>

          <span className="rounded-full bg-black/46 px-3 py-1 text-[10px] font-semibold text-white/[0.90] backdrop-blur-md">
            {subtitle}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[18px] font-semibold tracking-[-0.025em] text-white">
              {title}
            </h3>

            <p className="mt-1.5 text-[12px] leading-5 text-white/[0.72]">
              {description}
            </p>
          </div>

          <span className="shrink-0 rounded-full border border-orange-500/[0.18] bg-orange-500/[0.06] px-2.5 py-1 text-[10px] font-semibold text-orange-300">
            {fee}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {points.map(
            (point) => (
              <div
                key={point}
                className="flex items-start gap-2 text-[11px] leading-5 text-white/[0.90]"
              >
                <Check
                  size={13}
                  className="mt-0.5 shrink-0 text-orange-400"
                />

                <span>{point}</span>
              </div>
            ),
          )}
        </div>
      </div>
    </article>
  );
}

function PriceTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/[0.12] px-3 py-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/[0.66]">
        {label}
      </p>

      <p className="mt-1 text-[12px] font-semibold text-white/[0.94]">
        {value}
      </p>
    </div>
  );
}

function SurchargeChip({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 ${
        muted
          ? "border-white/[0.08] bg-white/[0.025]"
          : "border-orange-500/[0.14] bg-orange-500/[0.04]"
      }`}
    >
      <span className="text-[11px] text-white/[0.72]">
        {label}
      </span>

      <strong
        className={`text-[11px] ${
          muted
            ? "text-white/[0.94]"
            : "text-orange-300"
        }`}
      >
        {value}
      </strong>
    </div>
  );
}

function PackageCard({
  tier,
}: {
  tier: (typeof pricingTiers)[number];
}) {
  return (
    <article className="rounded-[18px] border border-white/[0.10] bg-[#151217]/94 p-4 transition hover:border-orange-500/[0.22]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-white/[0.90]">
          <Package size={17} />
        </div>

        <span className="text-[11px] font-semibold text-orange-300">
          {tier.maxPayload}
        </span>
      </div>

      <p className="mt-4 text-[18px] font-semibold text-white">
        Size {tier.size}
      </p>

      <p className="mt-1 text-[11px] leading-4 text-white/[0.66]">
        {
          PACKAGE_SIZE_RULES[
            tier.size
          ].dimensions
        }
      </p>

      <div className="mt-4 border-t border-white/[0.07] pt-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.10em] text-white/[0.80]">
          From
        </p>

        <p className="mt-1 text-[13px] font-semibold text-white/[0.90]">
          {formatVnd(
            tier.baseFee,
          )}
        </p>
      </div>
    </article>
  );
}

function SmallRate({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/[0.80]">
        {label}
      </p>

      <p className="mt-1 text-[11px] font-medium text-white/[0.96]">
        {value}
      </p>
    </div>
  );
}

function ExtraServiceCard({
  icon,
  title,
  text,
  price,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  price: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/[0.09] bg-[#151217]/90 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/[0.09] text-orange-300">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white/[0.96]">
            {title}
          </p>

          <p className="mt-1 text-[11px] leading-4 text-white/[0.68]">
            {text}
          </p>
        </div>
      </div>

      <span className="shrink-0 text-[11px] font-semibold text-orange-300">
        {price}
      </span>
    </div>
  );
}
