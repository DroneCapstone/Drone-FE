import { Outlet } from "react-router-dom";

import { CustomerHeader } from "../features/customer/components/CustomerHeader";
import { CustomerAnimatedBackground } from "../features/customer/components/CustomerAnimatedBackground";

export function CustomerLayout() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050505] text-white">
      {/* =====================================================
          BACKGROUND
          Giữ nguyên particle background hiện tại
      ====================================================== */}

      <CustomerAnimatedBackground />

      {/* =====================================================
          CUSTOMER APP
      ====================================================== */}

      <div className="customer-workspace relative z-10">
        <CustomerHeader />

        <main className="relative z-10 pt-[72px]">
          <Outlet />
        </main>
      </div>

      {/* =====================================================
          CUSTOMER SURFACE THEME

          Chỉ nâng sáng card / table / form.
          Không thay đổi layout, kích thước hay particle background.
      ====================================================== */}

      <style>
        {`
          /* =================================================
             LARGE PANELS
             bg-[#0a0a0a]
          ================================================== */

          .customer-workspace [class*="bg-[#0a0a0a]"] {
            background-color: rgba(14, 15, 18, 0.94) !important;
            border-color: rgba(255, 255, 255, 0.105) !important;

            box-shadow:
              0 16px 42px rgba(0, 0, 0, 0.22),
              inset 0 1px 0 rgba(255, 255, 255, 0.018);
          }

          /* =================================================
             SECONDARY PANELS
             bg-[#0d0d0d]
          ================================================== */

          .customer-workspace [class*="bg-[#0d0d0d]"] {
            background-color: rgba(17, 18, 21, 0.96) !important;
            border-color: rgba(255, 255, 255, 0.11) !important;

            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.018);
          }

          /* =================================================
             INNER SURFACES
             bg-[#101010]
          ================================================== */

          .customer-workspace [class*="bg-[#101010]"] {
            background-color: rgba(20, 21, 24, 0.96) !important;
            border-color: rgba(255, 255, 255, 0.11) !important;
          }

          /* =================================================
             INPUT SURFACES
          ================================================== */

          .customer-workspace [class*="bg-[#111214]"],
          .customer-workspace [class*="bg-[#131417]"] {
            background-color: rgba(23, 24, 28, 0.98) !important;
            border-color: rgba(255, 255, 255, 0.13) !important;
          }

          /* =================================================
             TABLE / ROW SEPARATORS
          ================================================== */

          .customer-workspace [class*="border-white/[0.06]"],
          .customer-workspace [class*="border-white/[0.065]"],
          .customer-workspace [class*="border-white/[0.07]"] {
            border-color: rgba(255, 255, 255, 0.085) !important;
          }

          .customer-workspace [class*="border-white/[0.08]"] {
            border-color: rgba(255, 255, 255, 0.105) !important;
          }

          .customer-workspace [class*="border-white/[0.09]"],
          .customer-workspace [class*="border-white/[0.1]"] {
            border-color: rgba(255, 255, 255, 0.13) !important;
          }

          /* =================================================
             MUTED TEXT
             Nâng contrast nhưng vẫn giữ hierarchy
          ================================================== */

          .customer-workspace [class*="text-white/20"] {
            color: rgba(255, 255, 255, 0.34) !important;
          }

          .customer-workspace [class*="text-white/25"] {
            color: rgba(255, 255, 255, 0.4) !important;
          }

          .customer-workspace [class*="text-white/30"] {
            color: rgba(255, 255, 255, 0.46) !important;
          }

          .customer-workspace [class*="text-white/35"] {
            color: rgba(255, 255, 255, 0.52) !important;
          }

          .customer-workspace [class*="text-white/40"] {
            color: rgba(255, 255, 255, 0.58) !important;
          }

          .customer-workspace [class*="text-white/45"] {
            color: rgba(255, 255, 255, 0.64) !important;
          }

          .customer-workspace [class*="text-white/50"] {
            color: rgba(255, 255, 255, 0.68) !important;
          }

          .customer-workspace [class*="text-white/55"] {
            color: rgba(255, 255, 255, 0.72) !important;
          }

          .customer-workspace [class*="text-white/60"] {
            color: rgba(255, 255, 255, 0.76) !important;
          }

          /* =================================================
             ARBITRARY OPACITY TEXT CLASSES
          ================================================== */

          .customer-workspace [class*="text-white/[0.2]"] {
            color: rgba(255, 255, 255, 0.34) !important;
          }

          .customer-workspace [class*="text-white/[0.25]"] {
            color: rgba(255, 255, 255, 0.4) !important;
          }

          .customer-workspace [class*="text-white/[0.3]"] {
            color: rgba(255, 255, 255, 0.46) !important;
          }

          .customer-workspace [class*="text-white/[0.35]"] {
            color: rgba(255, 255, 255, 0.52) !important;
          }

          .customer-workspace [class*="text-white/[0.4]"] {
            color: rgba(255, 255, 255, 0.58) !important;
          }

          .customer-workspace [class*="text-white/[0.42]"] {
            color: rgba(255, 255, 255, 0.62) !important;
          }

          .customer-workspace [class*="text-white/[0.45]"] {
            color: rgba(255, 255, 255, 0.66) !important;
          }

          /* =================================================
             TABLE / CARD ROW HOVER

             Tạo feedback nhẹ, không glow, không AI-style.
          ================================================== */

          .customer-workspace a[class*="hover:bg-white"],
          .customer-workspace button[class*="hover:bg-white"] {
            transition:
              background-color 180ms ease,
              border-color 180ms ease,
              color 180ms ease;
          }

          /* =================================================
             INPUTS
          ================================================== */

          .customer-workspace input,
          .customer-workspace select,
          .customer-workspace textarea {
            color: rgba(255, 255, 255, 0.9);
          }

          .customer-workspace input::placeholder,
          .customer-workspace textarea::placeholder {
            color: rgba(255, 255, 255, 0.32);
          }

          /* =================================================
             ACCESSIBILITY / FOCUS
          ================================================== */

          .customer-workspace input:focus,
          .customer-workspace select:focus,
          .customer-workspace textarea:focus {
            box-shadow:
              0 0 0 1px rgba(249, 115, 22, 0.22);
          }
        `}
      </style>
    </div>
  );
}