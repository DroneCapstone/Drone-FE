import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowRight } from "lucide-react";
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
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const currentSlide = slides[activeSlide];

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-[#050505] pt-[68px] lg:min-h-screen lg:pt-[76px]">
      <div className="absolute inset-0">
        <AnimatePresence mode="sync">
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0, scale: 1.035 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.8 },
              scale: { duration: 5.5, ease: "linear" },
            }}
            className="absolute inset-0"
          >
            {currentSlide.type === "cover" && (
              <img
                src={currentSlide.image}
                alt={currentSlide.alt}
                className="absolute inset-0 h-full w-full object-cover object-[58%_58%] sm:object-center"
              />
            )}

            {currentSlide.type === "product" && (
              <>
                <div className="absolute inset-0 bg-[#070707]" />
                <div className="absolute right-[-20%] top-[18%] h-[380px] w-[380px] rounded-full bg-[#ED742E]/[0.08] blur-[110px] sm:right-[5%] sm:top-[10%] sm:h-[600px] sm:w-[600px] sm:blur-[170px]" />
                <img
                  src={currentSlide.image}
                  alt={currentSlide.alt}
                  className="absolute bottom-[10%] right-[-24%] h-[58%] w-[105%] object-contain object-right-bottom sm:bottom-[-2%] sm:right-[-1%] sm:h-[92%] sm:w-[72%]"
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/72 to-black/10 lg:from-black lg:via-black/75 lg:to-black/5" />
        <div className="absolute inset-x-0 top-[18%] h-[46%] bg-gradient-to-b from-transparent via-black/[0.10] to-black/55 lg:hidden" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/18 to-black/15 lg:from-black/55 lg:via-transparent lg:to-black/10" />
        <div className="absolute inset-0 bg-black/10" />
      </div>

      <div className="relative z-20 mx-auto flex min-h-[calc(100svh-68px)] max-w-[1600px] items-center px-5 pb-[118px] pt-[88px] sm:px-6 sm:pb-24 sm:pt-[96px] lg:min-h-[calc(100vh-76px)] lg:items-center lg:px-12 lg:pb-0 lg:pt-0">
        <div className="w-full max-w-[790px] lg:-translate-y-4">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-300 lg:hidden"
          >
            Hub-to-hub drone delivery
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="text-[45px] font-medium leading-[0.93] tracking-[-0.052em] text-white sm:text-[60px] lg:text-[108px] xl:text-[118px]"
          >
            One network.
            <br />
            <span className="text-white/48">
              Built for the sky.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-4 max-w-[560px] text-[13px] leading-6 text-white/76 sm:mt-5 sm:text-[15px] sm:leading-7 lg:mt-8 lg:max-w-[650px] lg:text-[18px] lg:leading-8 lg:text-white/65"
          >
            DroneOptAI connects customers, delivery hubs and autonomous aircraft in one intelligent hub-to-hub delivery network.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-6 grid gap-3 sm:mt-7 sm:flex sm:flex-wrap sm:items-center sm:gap-4 lg:mt-10"
          >
            <Link
              to="/register"
              className="group inline-flex h-[52px] items-center justify-center gap-3 rounded-xl bg-orange-500 px-6 text-[14px] font-semibold text-black transition-colors duration-300 hover:bg-orange-400 sm:w-auto lg:h-[58px] lg:rounded-none lg:px-8 lg:text-[15px]"
            >
              Register now
              <ArrowRight
                size={17}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>

            <a
              href="#delivery"
              className="inline-flex h-[52px] items-center justify-center rounded-xl border border-white/20 bg-black/25 px-6 text-[14px] font-medium text-white backdrop-blur-md transition hover:border-white/40 hover:bg-white/[0.07] sm:w-auto lg:h-[58px] lg:rounded-none lg:px-8 lg:text-[15px]"
            >
              See how it works
            </a>
          </motion.div>
        </div>
      </div>

      <a
        href="#delivery"
        className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/46 lg:hidden"
      >
        Scroll to explore
        <ArrowDown size={13} />
      </a>

      <div className="absolute bottom-[54px] left-5 right-5 z-30 flex items-center gap-2 sm:left-6 sm:right-auto sm:w-[180px] lg:bottom-8 lg:left-auto lg:right-10 lg:w-auto lg:gap-3">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => setActiveSlide(index)}
            aria-label={`Show banner ${index + 1}`}
            className={`h-[2px] flex-1 transition-all duration-500 lg:flex-none ${
              activeSlide === index
                ? "bg-[#ED742E] lg:w-12"
                : "bg-white/25 hover:bg-white/50 lg:w-6"
            }`}
          />
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-30 h-px bg-white/[0.08]" />
    </section>
  );
}
