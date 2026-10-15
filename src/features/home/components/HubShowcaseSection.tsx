import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
} from "motion/react";

import hubImage from "../../../assets/images/home/delivery-hub.png";

export function HubShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const hubY = useTransform(
    scrollYProgress,
    [0, 1],
    ["4%", "-3%"],
  );

  const hubScale = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [0.96, 1.02, 0.98],
  );

  return (
    <section
      ref={sectionRef}
      id="hub"
      className="overflow-hidden border-b border-white/[0.07]"
    >
      <div className="mx-auto grid max-w-[1600px] lg:min-h-[900px] lg:grid-cols-[0.78fr_1.22fr]">
        <div className="flex items-center px-5 py-14 sm:px-6 sm:py-16 lg:px-12 lg:py-24 xl:px-16">
          <div className="w-full max-w-[530px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f47721]">
              Delivery hub
            </p>

            <h2 className="mt-4 text-[38px] font-medium leading-[0.98] tracking-[-0.045em] sm:mt-5 sm:text-5xl lg:mt-7 lg:text-[60px]">
              Where every
              <br />
              mission begins
              <br />
              and ends.
            </h2>

            <p className="mt-5 text-[13px] leading-6 text-white/62 sm:text-[14px] sm:leading-7 lg:mt-7 lg:text-white/40">
              DroneOptAI hubs provide controlled infrastructure for package handling, aircraft dispatch, landing and recipient collection.
            </p>

            <div className="mt-8 overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#101010] lg:mt-14 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:border-t lg:bg-transparent">
              <HubFeature
                number="01"
                title="Package drop-off"
                description="Senders bring their package to the selected Drop-off Point."
              />
              <HubFeature
                number="02"
                title="Drone operations"
                description="Drones launch and land through dedicated hub infrastructure."
              />
              <HubFeature
                number="03"
                title="Package handling"
                description="Arriving deliveries are processed and secured at the Pick-up Point."
              />
              <HubFeature
                number="04"
                title="Recipient collection"
                description="Recipients collect their package from the Pick-up Point."
              />
            </div>
          </div>
        </div>

        <div className="relative flex h-[420px] items-center justify-center overflow-hidden bg-[#090909] sm:h-[520px] lg:h-auto lg:min-h-[700px]">
          <div className="absolute left-5 top-5 lg:left-10 lg:top-10">
            <p className="text-[8px] uppercase tracking-[0.18em] text-white/30 lg:text-[9px] lg:tracking-[0.2em] lg:text-white/25">
              DroneOptAI infrastructure
            </p>
          </div>

          <motion.img
            style={{
              y: hubY,
              scale: hubScale,
            }}
            src={hubImage}
            alt="DroneOptAI delivery hub"
            className="relative z-10 w-[104%] max-w-[900px] object-contain sm:w-[94%] lg:w-[92%]"
          />
        </div>
      </div>
    </section>
  );
}

function HubFeature({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="grid grid-cols-[44px_1fr] border-b border-white/[0.08] px-4 py-4 last:border-b-0 sm:grid-cols-[54px_1fr] lg:grid-cols-[90px_1fr] lg:px-0 lg:py-7 lg:last:border-b">
      <span className="pt-0.5 text-[11px] font-medium text-[#ED742E] lg:text-[13px]">
        {number}
      </span>

      <div>
        <p className="text-[14px] font-medium text-white/92 sm:text-[15px] lg:text-[17px] lg:text-white/85">
          {title}
        </p>

        <p className="mt-1.5 text-[11px] leading-5 text-white/55 sm:text-[12px] lg:mt-2.5 lg:text-[14px] lg:leading-7 lg:text-white/42">
          {description}
        </p>
      </div>
    </div>
  );
}
