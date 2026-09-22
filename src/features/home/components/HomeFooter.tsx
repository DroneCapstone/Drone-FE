import { Link } from "react-router-dom";

import { navigationItems } from "../constants/homeContent";

export function HomeFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-black px-5 py-10 lg:px-10">
      <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-8 md:flex-row md:items-center">
        <Link
          to="/"
          className="flex items-center gap-3"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-black text-black">
            D
          </div>

          <div>
            <p className="text-sm font-semibold text-white">
              DroneOptAI
            </p>

            <p className="text-[10px] uppercase tracking-[0.15em] text-white/30">
              Smart Delivery Platform
            </p>
          </div>
        </Link>

        <nav className="flex flex-wrap gap-x-7 gap-y-3">
          {navigationItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-xs text-white/35 transition hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <p className="text-xs text-white/25">
          © 2026 DroneOptAI.
        </p>
      </div>
    </footer>
  );
}