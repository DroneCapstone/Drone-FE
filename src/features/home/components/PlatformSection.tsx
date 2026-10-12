const capabilities = [
  {
    number: "01",
    title: "Customer delivery",
    description:
      "Create hub-to-hub delivery requests and follow package status throughout the delivery.",
  },
  {
    number: "02",
    title: "Hub network",
    description:
      "Manage origin hubs, destination hubs and delivery capacity across the network.",
  },
  {
    number: "03",
    title: "Mission operations",
    description:
      "Coordinate drone assignment, mission scheduling and active flight operations.",
  },
  {
    number: "04",
    title: "Fleet visibility",
    description:
      "Monitor aircraft availability, battery condition and technical readiness.",
  },
  {
    number: "05",
    title: "Operational intelligence",
    description:
      "Support route and mission decisions using weather, energy and operational data.",
  },
];

export function PlatformSection() {
  return (
    <section
      id="platform"
      className="border-b border-white/[0.07] px-5 py-16 sm:px-6 sm:py-20 lg:px-12 lg:py-36"
    >
      <div className="mx-auto max-w-[1500px]">
        <div className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f47721] lg:tracking-[0.22em]">
              Platform
            </p>
          </div>

          <div>
            <h2 className="max-w-[920px] text-[38px] font-medium leading-[1] tracking-[-0.045em] sm:text-5xl lg:text-[64px] lg:leading-[1.04]">
              One network connecting customers, hubs and aircraft.
            </h2>

            <p className="mt-5 max-w-[650px] text-[13px] leading-6 text-white/62 sm:text-[14px] sm:leading-7 lg:mt-7 lg:text-white/40">
              DroneOptAI brings delivery requests, hubs, aircraft and active missions into one connected operational environment.
            </p>
          </div>
        </div>

        {/* Mobile: swipeable cards */}
        <div className="-mx-5 mt-9 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6 lg:hidden">
          {capabilities.map((item) => (
            <article
              key={item.number}
              className="w-[82vw] max-w-[330px] shrink-0 snap-start rounded-[20px] border border-white/[0.09] bg-[#111013] p-5"
            >
              <span className="text-[11px] font-medium text-[#ED742E]">
                {item.number}
              </span>

              <h3 className="mt-8 text-[20px] font-medium tracking-[-0.025em] text-white">
                {item.title}
              </h3>

              <p className="mt-3 text-[12px] leading-6 text-white/56">
                {item.description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-24 hidden border-t border-white/[0.1] lg:block">
          {capabilities.map((item) => (
            <article
              key={item.number}
              className="grid gap-6 border-b border-white/[0.1] py-9 transition-colors hover:bg-white/[0.012] md:grid-cols-[120px_0.85fr_1.25fr]"
            >
              <span className="text-[13px] font-medium text-[#ED742E]">
                {item.number}
              </span>

              <h3 className="text-[20px] font-medium tracking-[-0.02em] text-white/90">
                {item.title}
              </h3>

              <p className="max-w-[620px] text-[15px] leading-7 text-white/42">
                {item.description}
              </p>
            </article>
          ))}
        </div>

        <p className="mt-4 text-[10px] uppercase tracking-[0.14em] text-white/30 lg:hidden">
          Swipe to explore
        </p>
      </div>
    </section>
  );
}
