import { Link } from "react-router-dom";

export function CTASection() {
  return (
    <section className="bg-[#F97316] px-6 py-24 text-black lg:px-12 lg:py-32">
      <div className="mx-auto max-w-[1500px]">
        <div className="grid items-end gap-14 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em]">
              DroneOptAI
            </p>

            <h2 className="mt-7 max-w-[980px] text-5xl font-semibold leading-[0.94] tracking-[-0.055em] sm:text-6xl lg:text-[84px]">
              From one hub
              <br />
              to the next.
            </h2>

            <p className="mt-7 max-w-[520px] text-sm leading-6 text-black/60">
              Connected hub-to-hub drone
              delivery built around smarter
              operations.
            </p>
          </div>

          <Link
            to="/login"
            className="group flex w-fit items-center gap-5 border-b-2 border-black pb-2 text-sm font-semibold"
          >
            Start a delivery

            <span className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}