import { ArrowUpRight } from "lucide-react";

import {
  solutions,
  stats,
} from "../constants/homeContent";

export function SolutionsSection() {
  return (
    <>
      {/* STATS */}
      <section className="px-5 pb-14 lg:px-10">
        <div className="mx-auto grid max-w-[1500px] grid-cols-2 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`p-6 lg:p-8 ${
                index !== stats.length - 1
                  ? "border-r border-white/[0.06]"
                  : ""
              }`}
            >
              <div className="bg-gradient-to-r from-orange-300 to-orange-500 bg-clip-text text-2xl font-semibold text-transparent lg:text-3xl">
                {stat.value}
              </div>

              <p className="mt-2 text-xs text-white/40 lg:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SOLUTIONS */}
      <section
        id="solutions"
        className="px-5 py-24 lg:px-10 lg:py-32"
      >
        <div className="mx-auto max-w-[1500px]">
          <div className="max-w-[780px]">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">
              Solutions
            </span>

            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
              One platform.
              <br />
              Every delivery connected.
            </h2>

            <p className="mt-6 max-w-[650px] text-base leading-7 text-white/45">
              From the moment a customer
              creates an order to the moment the
              drone reaches its destination,
              DroneOptAI keeps the delivery
              workflow connected.
            </p>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {solutions.map((solution) => {
              const Icon = solution.icon;

              return (
                <article
                  key={solution.title}
                  className="group relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-7 transition duration-300 hover:-translate-y-1 hover:border-orange-400/20 hover:bg-white/[0.04]"
                >
                  <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-orange-500/[0.05] blur-[60px] transition group-hover:bg-orange-500/10" />

                  <div className="relative">
                    <div className="flex items-start justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-400/15 bg-orange-500/[0.08]">
                        <Icon
                          size={21}
                          className="text-orange-400"
                        />
                      </div>

                      <ArrowUpRight
                        size={18}
                        className="text-white/20 transition group-hover:text-orange-400"
                      />
                    </div>

                    <span className="mt-8 block text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-400/80">
                      {solution.tag}
                    </span>

                    <h3 className="mt-3 text-xl font-semibold text-white">
                      {solution.title}
                    </h3>

                    <p className="mt-4 text-sm leading-7 text-white/40">
                      {solution.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}