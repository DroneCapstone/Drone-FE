import {
  BatteryCharging,
  CloudSun,
  Navigation,
  Package,
} from "lucide-react";

import { platformFeatures } from "../constants/homeContent";

export function PlatformSection() {
  return (
    <section
      id="platform"
      className="px-5 py-24 lg:px-10 lg:py-32"
    >
      <div className="mx-auto grid max-w-[1500px] items-center gap-16 xl:grid-cols-2">
        {/* LEFT */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">
            DroneOptAI Platform
          </span>

          <h2 className="mt-5 max-w-[650px] text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
            Know what is happening in the sky.
          </h2>

          <p className="mt-6 max-w-[620px] text-base leading-7 text-white/45">
            Mission information, energy status
            and delivery progress are presented
            in one clear operational experience
            for customers and operators.
          </p>

          <div className="mt-10 space-y-4">
            {platformFeatures.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="flex gap-4 rounded-2xl border border-transparent p-4 transition hover:border-white/[0.07] hover:bg-white/[0.02]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
                    <Icon
                      size={19}
                      className="text-orange-400"
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {feature.title}
                    </h3>

                    <p className="mt-1.5 max-w-[500px] text-sm leading-6 text-white/35">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DASHBOARD VISUAL */}
        <div className="relative">
          <div className="absolute inset-0 bg-orange-500/[0.08] blur-[120px]" />

          <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0b0b0b] shadow-[0_30px_100px_rgba(0,0,0,.5)]">
            {/* TOPBAR */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div>
                <p className="text-xs text-white/35">
                  Mission Overview
                </p>

                <p className="mt-1 text-sm font-medium text-white">
                  DL-2048
                </p>
              </div>

              <div className="rounded-full bg-orange-500/10 px-3 py-1.5 text-[11px] font-medium text-orange-300">
                Active Mission
              </div>
            </div>

            {/* MAP */}
            <div className="relative h-[310px] overflow-hidden border-b border-white/[0.06] bg-black">
              <div
                className="absolute inset-0 opacity-[0.12]"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)
                  `,
                  backgroundSize: "36px 36px",
                }}
              />

              <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 700 310"
              >
                <path
                  d="M70 240 C210 180 250 250 360 160 C430 100 520 155 625 70"
                  stroke="#f97316"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>

              <div className="absolute left-[48%] top-[42%] flex h-11 w-11 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/15">
                <Navigation
                  size={18}
                  className="rotate-45 text-orange-400"
                />
              </div>
            </div>

            {/* DATA */}
            <div className="grid grid-cols-2 gap-px bg-white/[0.06] sm:grid-cols-4">
              <DashboardMetric
                icon={Navigation}
                label="Distance"
                value="6.8 km"
              />

              <DashboardMetric
                icon={BatteryCharging}
                label="Battery"
                value="82%"
              />

              <DashboardMetric
                icon={Package}
                label="Payload"
                value="1.2 kg"
              />

              <DashboardMetric
                icon={CloudSun}
                label="Weather"
                value="Clear"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

interface DashboardMetricProps {
  icon: React.ElementType;
  label: string;
  value: string;
}

function DashboardMetric({
  icon: Icon,
  label,
  value,
}: DashboardMetricProps) {
  return (
    <div className="bg-[#0b0b0b] p-5">
      <Icon
        size={16}
        className="text-orange-400"
      />

      <p className="mt-4 text-[10px] uppercase tracking-[0.12em] text-white/30">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-white">
        {value}
      </p>
    </div>
  );
}