import { processSteps } from "../constants/homeContent";

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative border-y border-white/[0.06] bg-white/[0.015] px-5 py-24 lg:px-10 lg:py-32"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[350px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/[0.04] blur-[140px]" />

      <div className="relative mx-auto max-w-[1500px]">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">
            How it works
          </span>

          <h2 className="mx-auto mt-5 max-w-[800px] text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
            From order to arrival.
          </h2>

          <p className="mx-auto mt-6 max-w-[640px] text-base leading-7 text-white/40">
            A simple delivery experience for
            customers, supported by intelligent
            mission operations behind the scenes.
          </p>
        </div>

        <div className="relative mt-16 grid gap-5 lg:grid-cols-4">
          <div className="absolute left-[12%] right-[12%] top-[38px] hidden border-t border-dashed border-orange-500/20 lg:block" />

          {processSteps.map((step) => {
            const Icon = step.icon;

            return (
              <article
                key={step.number}
                className="relative z-10 rounded-[22px] border border-white/[0.07] bg-[#090909] p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-[76px] w-[76px] items-center justify-center rounded-2xl border border-orange-400/15 bg-gradient-to-br from-orange-500/15 to-transparent">
                    <Icon
                      size={25}
                      className="text-orange-400"
                    />
                  </div>

                  <span className="text-4xl font-semibold text-white/[0.05]">
                    {step.number}
                  </span>
                </div>

                <h3 className="mt-7 text-lg font-semibold text-white">
                  {step.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-white/40">
                  {step.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}