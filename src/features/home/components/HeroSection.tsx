import { useEffect, useState } from "react";

import {
  AnimatePresence,
  motion,
} from "motion/react";

import { ArrowRight } from "lucide-react";

import { Link } from "react-router-dom";

import droneImage from "../../../assets/images/home/drone-3d.png";
import hubScreen from "../../../assets/images/home/hub-screen.png";
import droneFly from "../../../assets/images/home/fly.png";

const slides = [
  {
    id: 1,
    image: droneFly,
    alt: "DroneOptAI drone flying above the city",
    type: "cover",
  },

  {
    id: 2,
    image: droneImage,
    alt: "DroneOptAI delivery drone",
    type: "product",
  },

  {
    id: 3,
    image: hubScreen,
    alt: "DroneOptAI delivery hub",
    type: "cover",
  },
];

export function HeroSection() {
  const [activeSlide, setActiveSlide] =
    useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide(
        (current) =>
          (current + 1) % slides.length,
      );
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const currentSlide =
    slides[activeSlide];

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#050505] pt-[76px]">
      {/* =====================================================
          BANNER
      ====================================================== */}

      <div className="absolute inset-0">
        <AnimatePresence mode="sync">
          <motion.div
            key={currentSlide.id}
            initial={{
              opacity: 0,
              scale: 1.03,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              opacity: {
                duration: 1,
              },

              scale: {
                duration: 5.5,
                ease: "linear",
              },
            }}
            className="absolute inset-0"
          >
            {/* =================================================
                PHOTO BANNER
            ================================================= */}

            {currentSlide.type === "cover" && (
              <img
                src={currentSlide.image}
                alt={currentSlide.alt}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            )}

            {/* =================================================
                TRANSPARENT PRODUCT IMAGE
            ================================================= */}

            {currentSlide.type ===
              "product" && (
              <>
                {/* subtle background */}
                <div className="absolute inset-0 bg-[#070707]" />

                <div className="absolute right-[5%] top-[10%] h-[600px] w-[600px] rounded-full bg-[#ED742E]/[0.06] blur-[170px]" />

                <img
                  src={currentSlide.image}
                  alt={currentSlide.alt}
                  className="absolute bottom-[-2%] right-[-1%] h-[92%] w-[72%] object-contain object-right-bottom"
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* =====================================================
            OVERLAY
        ====================================================== */}

        {/* Left side dark enough for text */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/5" />

        {/* Bottom fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />

        {/* Slight overall darkening */}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* =====================================================
          CONTENT
      ====================================================== */}

      <div className="relative z-20 mx-auto flex min-h-[calc(100vh-76px)] max-w-[1600px] items-center px-6 lg:px-12">
        <div className="max-w-[790px] -translate-y-4">
          {/* TITLE */}

          <motion.h1
            initial={{
              opacity: 0,
              y: 24,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.8,
              ease: [
                0.22,
                1,
                0.36,
                1,
              ],
            }}
            className="text-[64px] font-medium leading-[0.9] tracking-[-0.06em] text-white sm:text-[82px] lg:text-[108px] xl:text-[118px]"
          >
            One network.
            <br />

            <span className="text-white/42">
              Built for the sky.
            </span>
          </motion.h1>

          {/* DESCRIPTION */}

          <motion.p
            initial={{
              opacity: 0,
              y: 18,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.7,
              delay: 0.15,
            }}
            className="mt-8 max-w-[650px] text-[17px] leading-8 text-white/65 lg:text-[18px]"
          >
            DroneOptAI connects customers,
            delivery hubs and autonomous
            aircraft in one intelligent
            hub-to-hub delivery network.
          </motion.p>

          {/* =================================================
              ACTIONS
          ================================================= */}

          <motion.div
            initial={{
              opacity: 0,
              y: 18,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.7,
              delay: 0.25,
            }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Link
              to="/register"
              className="group inline-flex h-[58px] items-center justify-center gap-4 bg-orange-500 px-8 text-[15px] font-semibold text-black transition-colors duration-300 hover:bg-orange-400"
            >
              Register now

              <ArrowRight
                size={18}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>

            <a
              href="#delivery"
              className="inline-flex h-[58px] items-center justify-center border border-white/20 bg-black/30 px-8 text-[15px] font-medium text-white backdrop-blur-sm transition duration-300 hover:border-white/40 hover:bg-white/[0.07]"
            >
              See how it works
            </a>
          </motion.div>
        </div>
      </div>

      {/* =====================================================
          SLIDE INDICATOR
      ====================================================== */}

      <div className="absolute bottom-8 right-10 z-30 hidden items-center gap-3 lg:flex">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() =>
              setActiveSlide(index)
            }
            aria-label={`Show banner ${index + 1}`}
            className={`h-[2px] transition-all duration-500 ${
              activeSlide === index
                ? "w-12 bg-[#ED742E]"
                : "w-6 bg-white/25 hover:bg-white/50"
            }`}
          />
        ))}
      </div>

      {/* bottom border */}

      <div className="absolute bottom-0 left-0 right-0 z-30 h-px bg-white/[0.08]" />
    </section>
  );
}