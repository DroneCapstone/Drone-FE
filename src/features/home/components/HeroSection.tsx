import {
  ArrowRight,
  Play,
  ShieldCheck,
} from "lucide-react";

import { LiveDeliveryVisual } from "./LiveDeliveryVisual";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-5 pb-24 pt-36 lg:px-10 lg:pb-32 lg:pt-44">
      {/* BACKGROUND */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-10%] top-[-10%] h-[620px] w-[620px] rounded-full bg-orange-500/[0.08] blur-[160px]" />

        <div className="absolute bottom-0 left-[-10%] h-[400px] w-[400px] rounded-full bg-orange-700/[0.06] blur-[140px]" />
      </div>

      <div className="relative mx-auto grid max-w-[1500px] items-center gap-16 xl:grid-cols-[0.95fr_1.05fr] xl:gap-10">
        {/* LEFT */}
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/[0.08] px-3.5 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
            </span>

            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-300">
              The future of delivery
            </span>
          </div>

          <h1 className="max-w-[780px] text-[46px] font-semibold leading-[0.98] tracking-[-0.045em] text-white sm:text-[60px] lg:text-[78px] xl:text-[86px]">
            Delivery,
            <br />

            <span className="bg-gradient-to-r from-white via-orange-200 to-orange-500 bg-clip-text text-transparent">
              optimized from
              <br />
              sky to doorstep.
            </span>
          </h1>

          <p className="mt-7 max-w-[650px] text-base leading-7 text-white/50 sm:text-lg sm:leading-8">
            DroneOptAI connects customers,
            drone operations, mission planning
            and real-time delivery tracking in
            one intelligent platform.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#how-it-works"
              className="group inline-flex h-13 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-orange-500 via-orange-400 to-orange-300 px-7 text-sm font-semibold text-black shadow-[0_15px_50px_rgba(249,115,22,0.18)] transition hover:-translate-y-0.5 hover:brightness-110"
            >
              Explore delivery

              <ArrowRight
                size={17}
                className="transition group-hover:translate-x-1"
              />
            </a>

            <a
              href="#live-delivery"
              className="inline-flex h-13 items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-7 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.07]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
                <Play
                  size={12}
                  fill="currentColor"
                />
              </span>

              Watch live mission
            </a>
          </div>

          <div className="mt-10 flex items-center gap-3 text-sm text-white/35">
            <ShieldCheck
              size={17}
              className="text-orange-400"
            />

            Mission visibility from dispatch
            to delivery.
          </div>
        </div>

        {/* RIGHT */}
        <LiveDeliveryVisual />
      </div>
    </section>
  );
}