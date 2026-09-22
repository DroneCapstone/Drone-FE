import {
  ArrowRight,
  PackageOpen,
} from "lucide-react";
import { Link } from "react-router-dom";

export function CTASection() {
  return (
    <section
      id="contact"
      className="px-5 pb-24 pt-12 lg:px-10 lg:pb-32"
    >
      <div className="relative mx-auto max-w-[1500px] overflow-hidden rounded-[32px] border border-orange-400/15 bg-[#0b0b0b] px-6 py-16 sm:px-10 lg:px-16 lg:py-20">
        <div className="absolute right-[-100px] top-[-150px] h-[500px] w-[500px] rounded-full bg-orange-500/[0.13] blur-[140px]" />

        <div className="absolute bottom-[-200px] left-[20%] h-[350px] w-[500px] rounded-full bg-orange-700/[0.08] blur-[130px]" />

        <div className="relative grid items-end gap-10 lg:grid-cols-[1fr_auto]">
          <div className="max-w-[800px]">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-500/10">
              <PackageOpen
                size={21}
                className="text-orange-400"
              />
            </div>

            <h2 className="text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
              Ready for your
              <span className="bg-gradient-to-r from-orange-300 to-orange-500 bg-clip-text text-transparent">
                {" "}
                next delivery?
              </span>
            </h2>

            <p className="mt-5 max-w-[620px] text-base leading-7 text-white/40">
              Create a delivery request and
              experience smarter drone logistics
              with DroneOptAI.
            </p>
          </div>

          <Link
            to="/login"
            className="group inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-300 px-7 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:brightness-110"
          >
            Start a delivery

            <ArrowRight
              size={17}
              className="transition group-hover:translate-x-1"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}