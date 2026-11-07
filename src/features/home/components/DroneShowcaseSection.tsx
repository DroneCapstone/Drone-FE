import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
} from "motion/react";

import droneImage from "../../../assets/images/home/drone-3d.png";

const specifications = [
  { label: "Purpose", value: "Package delivery" },
  { label: "Network", value: "Hub-to-hub" },
  { label: "Mission", value: "Autonomous / assisted" },
  { label: "Visibility", value: "Real-time" },
];

export function DroneShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const imageX = useTransform(
    scrollYProgress,
    [0, 1],
    ["-4%", "3%"],
  );

  const imageScale = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [0.94, 1.02, 0.97],
  );

  return (
    <section
      ref={sectionRef}
      id="aircraft"
      className="overflow-hidden border-b border-white/[0.07] bg-[#070707]"
    >
      <div className="mx-auto grid max-w-[1600px] lg:min-h-[850px] lg:grid-cols-[1.18fr_0.82fr]">
        <div className="relative flex h-[360px] items-center justify-center overflow-hidden px-4 sm:h-[430px] sm:px-6 lg:h-auto lg:min-h-[600px]">
          <div className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/[0.05] blur-[100px] lg:hidden" />

          <motion.div
            style={{
              x: imageX,
              scale: imageScale,
            }}
            className="relative z-10 w-[112%] max-w-none sm:w-[105%] lg:w-[118%]"
          >
            <img
              src={droneImage}
              alt="DroneOptAI delivery aircraft"
              className="w-full object-contain"
            />
          </motion.div>
        </div>

        <div className="flex items-center border-t border-white/[0.07] px-5 py-14 sm:px-6 sm:py-16 lg:border-l lg:border-t-0 lg:px-14 lg:py-20 xl:px-20">
          <div className="w-full max-w-[520px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f47721]">
              Drone
            </p>

            <h2 className="mt-4 text-[38px] font-medium leading-[0.98] tracking-[-0.045em] sm:mt-5 sm:text-5xl lg:mt-7 lg:text-[60px]">
              Built around
              <br />
              the mission.
            </h2>

            <p className="mt-5 text-[13px] leading-6 text-white/62 sm:text-[14px] sm:leading-7 lg:mt-7 lg:text-white/40">
              The DroneOptAI aircraft transports packages between delivery hubs while remaining connected to the operational platform throughout each mission.
            </p>

            <div className="mt-8 overflow-hidden rounded-[18px] border border-white/[0.08] bg-white/[0.015] lg:mt-14 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:border-t lg:bg-transparent">
              {specifications.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between border-b border-white/[0.08] px-4 py-4 last:border-b-0 lg:px-0 lg:py-5 lg:last:border-b"
                >
                  <span className="text-[10px] text-white/46 lg:text-[11px] lg:text-white/30">
                    {item.label}
                  </span>

                  <span className="text-[12px] font-medium text-white/84 lg:text-[13px] lg:font-normal lg:text-white/70">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
