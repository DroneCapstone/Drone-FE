import { useRef } from "react";

import {
  motion,
  useScroll,
  useTransform,
} from "motion/react";

import droneImage from "../../../assets/images/home/drone-3d.png";

const specifications = [
  {
    label: "Purpose",
    value: "Package delivery",
  },
  {
    label: "Network",
    value: "Hub-to-hub",
  },
  {
    label: "Mission",
    value: "Autonomous / assisted",
  },
  {
    label: "Visibility",
    value: "Real-time",
  },
];

export function DroneShowcaseSection() {
  const sectionRef =
    useRef<HTMLElement>(null);

  const { scrollYProgress } =
    useScroll({
      target: sectionRef,
      offset: ["start end", "end start"],
    });

  const imageX = useTransform(
    scrollYProgress,
    [0, 1],
    ["-8%", "5%"],
  );

  const imageScale = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [0.9, 1.03, 0.96],
  );

  return (
    <section
      ref={sectionRef}
      id="aircraft"
      className="overflow-hidden border-b border-white/[0.07] bg-[#070707]"
    >
      <div className="mx-auto grid min-h-[850px] max-w-[1600px] lg:grid-cols-[1.18fr_0.82fr]">
        {/* DRONE */}
        <div className="relative flex min-h-[600px] items-center justify-center overflow-hidden px-6">
          <motion.div
            style={{
              x: imageX,
              scale: imageScale,
            }}
            className="relative z-10 w-[115%] max-w-none lg:w-[118%]"
          >
            <img
              src={droneImage}
              alt="DroneOptAI delivery aircraft"
              className="w-full object-contain"
            />
          </motion.div>
        </div>

        {/* CONTENT */}
        <div className="flex items-center border-t border-white/[0.07] px-6 py-20 lg:border-l lg:border-t-0 lg:px-14 xl:px-20">
          <div className="w-full max-w-[520px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f47721]">
              Aircraft
            </p>

            <h2 className="mt-7 text-4xl font-medium leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-[60px]">
              Built around
              <br />
              the mission.
            </h2>

            <p className="mt-7 text-[14px] leading-7 text-white/40">
              The DroneOptAI aircraft transports
              packages between delivery hubs
              while remaining connected to the
              operational platform throughout
              each mission.
            </p>

            <div className="mt-14 border-t border-white/[0.1]">
              {specifications.map(
                (item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between border-b border-white/[0.1] py-5"
                  >
                    <span className="text-[11px] text-white/30">
                      {item.label}
                    </span>

                    <span className="text-[13px] text-white/70">
                      {item.value}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}