import { useState } from "react";
import {
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";
import { Link } from "react-router-dom";

import { navigationItems } from "../constants/homeContent";

export function HomeHeader() {
  const [mobileOpen, setMobileOpen] =
    useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-[1500px] items-center justify-between px-5 lg:px-10">
        {/* LOGO */}
        <Link
          to="/"
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 via-orange-500 to-orange-700 font-black text-black shadow-[0_0_30px_rgba(249,115,22,0.25)]">
            D
          </div>

          <div>
            <div className="text-lg font-semibold tracking-tight text-white">
              DroneOptAI
            </div>

            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
              Smart Delivery
            </div>
          </div>
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden items-center gap-8 lg:flex">
          {navigationItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-white/60 transition hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* DESKTOP ACTIONS */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/login"
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white"
          >
            Sign in
          </Link>

          <Link
            to="/login"
            className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
          >
            Get started

            <ArrowUpRight
              size={16}
              className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </div>

        {/* MOBILE */}
        <button
          type="button"
          onClick={() =>
            setMobileOpen((value) => !value)
          }
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white lg:hidden"
        >
          {mobileOpen ? (
            <X size={20} />
          ) : (
            <Menu size={20} />
          )}
        </button>
      </div>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div className="border-t border-white/[0.06] bg-black/95 px-5 py-5 lg:hidden">
          <nav className="flex flex-col gap-2">
            {navigationItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() =>
                  setMobileOpen(false)
                }
                className="rounded-xl px-4 py-3 text-sm text-white/70 transition hover:bg-white/[0.05] hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link
              to="/login"
              className="flex items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-white"
            >
              Sign in
            </Link>

            <Link
              to="/login"
              className="flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-3 text-sm font-semibold text-black"
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}