import { useRef } from "react";

import {
  motion,
  useScroll,
  useTransform,
} from "motion/react";

import hubImage from "../../../assets/images/home/delivery-hub.png";

export function HubShowcaseSection() {
  const sectionRef =
    useRef<HTMLElement>(null);

  const { scrollYProgress } =
    useScroll({
      target: sectionRef,
      offset: ["start end", "end start"],
    });

  const hubY = useTransform(
    scrollYProgress,
    [0, 1],
    ["7%", "-4%"],
  );

  const hubScale = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [0.94, 1.02, 0.98],
  );

  return (
    <section
      ref={sectionRef}
      id="hub"
      className="overflow-hidden border-b border-white/[0.07]"
    >
      <div className="mx-auto grid min-h-[900px] max-w-[1600px] lg:grid-cols-[0.78fr_1.22fr]">
        {/* CONTENT */}
        <div className="flex items-center px-6 py-24 lg:px-12 xl:px-16">
          <div className="max-w-[530px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f47721]">
              Delivery hub
            </p>

            <h2 className="mt-7 text-4xl font-medium leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-[60px]">
              Where every
              <br />
              mission begins
              <br />
              and ends.
            </h2>

            <p className="mt-7 text-[14px] leading-7 text-white/40">
              DroneOptAI hubs provide controlled
              infrastructure for package handling,
              aircraft dispatch, landing and
              recipient collection.
            </p>

            <div className="mt-14 border-t border-white/[0.1]">
              <HubFeature
                number="01"
                title="Package drop-off"
                description="Senders bring their package to the selected origin hub."
              />

              <HubFeature
                number="02"
                title="Aircraft operations"
                description="Drones launch and land through dedicated hub infrastructure."
              />

              <HubFeature
                number="03"
                title="Package handling"
                description="Arriving deliveries are processed and secured at the destination hub."
              />

              <HubFeature
                number="04"
                title="Recipient collection"
                description="Recipients collect their package from the destination hub."
              />
            </div>
          </div>
        </div>

        {/* IMAGE */}
        <div className="relative flex min-h-[700px] items-center justify-center overflow-hidden bg-[#090909]">
          <div className="absolute left-10 top-10">
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/25">
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
            className="relative z-10 w-[92%] max-w-[900px] object-contain"
          />
        </div>
      </div>
    </section>
  );
}

interface HubFeatureProps {
  number: string;
  title: string;
  description: string;
}

function HubFeature({
  number,
  title,
  description,
}: HubFeatureProps) {
  return (
    <div className="grid grid-cols-[90px_1fr] border-b border-white/[0.1] py-7">
      <span className="text-[13px] font-medium text-[#ED742E]">
        {number}
      </span>

      <div>
        <p className="text-[17px] font-medium text-white/85">
          {title}
        </p>

        <p className="mt-2.5 text-[14px] leading-7 text-white/42">
          {description}
        </p>
      </div>
    </div>
  );
}