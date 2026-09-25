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
      className="border-b border-white/[0.07] px-6 py-28 lg:px-12 lg:py-36"
    >
      <div className="mx-auto max-w-[1500px]">
        <div className="grid gap-16 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f47721]">
              Platform
            </p>
          </div>

          <div>
            <h2 className="max-w-[920px] text-4xl font-medium leading-[1.04] tracking-[-0.045em] sm:text-5xl lg:text-[64px]">
              One network connecting
              customers, hubs and aircraft.
            </h2>

            <p className="mt-7 max-w-[650px] text-[14px] leading-7 text-white/40">
              DroneOptAI brings delivery
              requests, hubs, aircraft and active
              missions into one connected
              operational environment.
            </p>
          </div>
        </div>

        <div className="mt-24 border-t border-white/[0.1]">
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
      </div>
    </section>
  );
}