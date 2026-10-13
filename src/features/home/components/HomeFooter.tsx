import { Link } from "react-router-dom";

import logo from "../../../assets/images/home/logo.png";

export function HomeFooter() {
  return (
    <footer className="border-t border-white/[0.07] bg-[#050505]">
      <div className="mx-auto max-w-[1500px] px-5 py-10 sm:px-6 lg:px-12 lg:py-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2.5"
            >
              <img
                src={logo}
                alt="DroneOptAI"
                className="h-8 w-auto object-contain"
              />

              <span className="text-[16px] font-semibold tracking-[-0.03em] text-orange-400">
                DroneOptAI
              </span>
            </Link>

            <p className="mt-4 max-w-[430px] text-[12px] leading-6 text-white/[0.46]">
              Hub-to-hub drone delivery connecting customers, delivery hubs and aircraft in one operational network.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-4 text-[12px] sm:flex sm:flex-wrap sm:items-center sm:gap-7">
            <a
              href="#delivery"
              className="text-white/[0.46] transition hover:text-white"
            >
              How it works
            </a>

            <a
              href="#aircraft"
              className="text-white/[0.46] transition hover:text-white"
            >
              Drone
            </a>

            <a
              href="#hub"
              className="text-white/[0.46] transition hover:text-white"
            >
              Hub network
            </a>

            <a
              href="#platform"
              className="text-white/[0.46] transition hover:text-white"
            >
              Platform
            </a>
          </div>
        </div>

        <div className="mt-9 flex flex-col gap-3 border-t border-white/[0.07] pt-5 text-[10px] text-white/[0.28] sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 DroneOptAI</span>
          <span>Hub-to-hub delivery platform</span>
        </div>
      </div>
    </footer>
  );
}
