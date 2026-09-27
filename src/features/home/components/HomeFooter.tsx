import { Link } from "react-router-dom";

import logo from "../../../assets/images/home/logo.png";

const links = [
  {
    label: "How it works",
    href: "#delivery",
  },
  {
    label: "Drone",
    href: "#aircraft",
  },
  {
    label: "Hub network",
    href: "#hub",
  },
  {
    label: "Platform",
    href: "#platform",
  },
];

export function HomeFooter() {
  return (
    <footer className="bg-[#050505] px-6 py-12 lg:px-12">
      <div className="mx-auto max-w-[1500px] border-t border-white/[0.08] pt-10">
        <div className="grid gap-12 md:grid-cols-[1fr_auto_auto] md:items-start">
          {/* BRAND */}
          <Link
            to="/"
            className="flex items-center gap-3"
          >
            <img
              src={logo}
              alt="DroneOptAI"
              className="h-10 w-auto object-contain"
            />

            <div className="flex items-baseline tracking-[-0.035em]">
              <span className="bg-gradient-to-r from-[#F9B35B] via-[#F28A3C] to-[#ED742E] bg-clip-text text-[18px] font-semibold text-transparent">
                Drone
              </span>

              <span className="bg-gradient-to-r from-[#F1A14B] to-[#ED742E] bg-clip-text text-[18px] font-light text-transparent">
                OptAI
              </span>
            </div>
          </Link>

          {/* LINKS */}
          <nav className="grid grid-cols-2 gap-x-10 gap-y-4">
            {links.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-[13px] text-white/35 transition-colors hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* COPYRIGHT */}
          <p className="text-[12px] text-white/25">
            © 2026 DroneOptAI
          </p>
        </div>
      </div>
    </footer>
  );
}