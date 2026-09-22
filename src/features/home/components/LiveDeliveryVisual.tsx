import {
  BatteryCharging,
  CheckCircle2,
  Clock3,
  MapPin,
  Navigation,
  Package,
  Radio,
} from "lucide-react";

import droneImage from "../../../assets/images/home/drone-3d.png";

export function LiveDeliveryVisual() {
  return (
    <div
      id="live-delivery"
      className="relative mx-auto w-full max-w-[620px]"
    >
      {/* BACKGROUND GLOW */}
      <div className="absolute left-1/2 top-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/10 blur-[120px]" />

      {/* RADAR */}
      <div className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-500/[0.06]" />

      <div className="absolute left-1/2 top-1/2 h-[430px] w-[430px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-500/[0.08]" />

      <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-500/10" />

      {/* MAIN CARD */}
      <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.035] shadow-[0_35px_100px_rgba(0,0,0,0.65)] backdrop-blur-xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-500" />
            </span>

            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
              Live Delivery
            </span>
          </div>

          <div className="rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-300">
            In Transit
          </div>
        </div>

        {/* MAP */}
        <div className="relative h-[520px] overflow-hidden bg-[#090909]">
          {/* GRID */}
          <div
            className="absolute inset-0 opacity-[0.13]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)
              `,
              backgroundSize: "34px 34px",
            }}
          />

          {/* FADE */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_15%,#090909_78%)]" />

          {/* ROUTE */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 600 520"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M86 420 C150 345 165 260 280 286 C380 310 382 160 515 105"
              stroke="rgba(255,255,255,0.14)"
              strokeWidth="3"
              strokeDasharray="8 10"
            />

            <path
              d="M86 420 C150 345 165 260 280 286 C380 310 382 160 515 105"
              stroke="url(#routeGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="120 1000"
            />

            <defs>
              <linearGradient
                id="routeGradient"
                x1="86"
                y1="420"
                x2="515"
                y2="105"
              >
                <stop stopColor="#ea580c" />
                <stop
                  offset="1"
                  stopColor="#fb923c"
                />
              </linearGradient>
            </defs>
          </svg>

          {/* START */}
          <div className="absolute bottom-[15%] left-[11%]">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/80 shadow-xl">
              <Package
                size={20}
                className="text-orange-400"
              />
            </div>

            <div className="mt-2 whitespace-nowrap text-[11px] text-white/40">
              Central Hub
            </div>
          </div>

          {/* DESTINATION */}
          <div className="absolute right-[10%] top-[13%]">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-500/10">
              <MapPin
                size={20}
                className="text-orange-400"
              />

              <span className="absolute inset-0 -z-10 animate-ping rounded-2xl border border-orange-500/20" />
            </div>

            <div className="mt-2 whitespace-nowrap text-[11px] text-white/40">
              Delivery Point
            </div>
          </div>

          {/* DRONE */}
          <div className="absolute left-[42%] top-[37%] z-10 w-[220px] -translate-x-1/2 animate-[bounce_5s_ease-in-out_infinite] sm:w-[265px]">
            <div className="[perspective:1000px]">
              <img
                src={droneImage}
                alt="Drone delivering package"
                className="w-full object-contain drop-shadow-[0_30px_35px_rgba(249,115,22,0.18)] [transform:rotateX(4deg)_rotateY(-8deg)]"
              />
            </div>

            <div className="mx-auto mt-[-18px] h-7 w-36 rounded-[100%] bg-black/70 blur-xl" />
          </div>

          {/* GPS */}
          <div className="absolute left-[51%] top-[52%] flex items-center gap-2 rounded-full border border-white/10 bg-black/80 px-3 py-2 backdrop-blur-lg">
            <Navigation
              size={13}
              className="text-orange-400"
            />

            <span className="text-[11px] text-white/60">
              48 km/h
            </span>
          </div>

          {/* ORDER CARD */}
          <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-black/75 p-4 backdrop-blur-xl sm:left-5 sm:right-auto sm:w-[330px]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/35">
                  Current mission
                </p>

                <h3 className="mt-1 text-sm font-semibold text-white">
                  Order #DRO-1024
                </h3>
              </div>

              <Radio
                size={18}
                className="text-orange-400"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="mb-1 flex items-center gap-1 text-white/35">
                  <Clock3 size={12} />
                  <span className="text-[10px]">
                    ETA
                  </span>
                </div>

                <span className="text-xs font-medium text-white">
                  08 min
                </span>
              </div>

              <div>
                <div className="mb-1 flex items-center gap-1 text-white/35">
                  <BatteryCharging size={12} />
                  <span className="text-[10px]">
                    Battery
                  </span>
                </div>

                <span className="text-xs font-medium text-white">
                  82%
                </span>
              </div>

              <div>
                <div className="mb-1 flex items-center gap-1 text-white/35">
                  <Navigation size={12} />
                  <span className="text-[10px]">
                    Distance
                  </span>
                </div>

                <span className="text-xs font-medium text-white">
                  2.4 km
                </span>
              </div>
            </div>
          </div>

          {/* VERIFIED */}
          <div className="absolute right-4 top-[42%] hidden rounded-xl border border-white/10 bg-black/70 px-3 py-2 backdrop-blur-md sm:flex sm:items-center sm:gap-2">
            <CheckCircle2
              size={14}
              className="text-orange-400"
            />

            <span className="text-[10px] text-white/60">
              Package secured
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}