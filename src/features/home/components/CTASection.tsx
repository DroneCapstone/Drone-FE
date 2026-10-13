import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function CTASection() {
  return (
    <section className="bg-[#F97316] px-5 py-16 text-black sm:px-6 sm:py-20 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-[1500px]">
        <div className="grid items-end gap-9 lg:grid-cols-[1fr_auto] lg:gap-14">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] lg:text-[10px] lg:tracking-[0.22em]">
              DroneOptAI
            </p>

            <h2 className="mt-5 max-w-[980px] text-[46px] font-semibold leading-[0.92] tracking-[-0.055em] sm:text-6xl lg:mt-7 lg:text-[84px] lg:leading-[0.94]">
              From one hub
              <br />
              to the next.
            </h2>

            <p className="mt-5 max-w-[520px] text-[13px] leading-6 text-black/65 lg:mt-7 lg:text-sm">
              Connected hub-to-hub drone delivery built around smarter operations.
            </p>
          </div>

          <Link
            to="/login"
            className="group inline-flex w-fit min-w-[185px] items-center justify-between gap-8 border-b-2 border-black pb-2 text-[13px] font-semibold text-black transition-opacity hover:opacity-65 lg:min-w-[200px] lg:text-sm"
          >
            Start a delivery

            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
