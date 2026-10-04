import { Outlet } from "react-router-dom";

import { CustomerHeader } from "../features/customer/components/CustomerHeader";
import { CustomerAnimatedBackground } from "../features/customer/components/CustomerAnimatedBackground";

export function CustomerLayout() {
  return (
    <div className="relative min-h-screen overflow-x-hidden text-white">
      <CustomerAnimatedBackground />

      <div className="customer-workspace relative z-10 min-h-screen">
        <CustomerHeader />

        <main className="relative z-10 pt-[72px]">
          <Outlet />
        </main>
      </div>

      <style>
        {`
          /* =================================================
             BASE TEXT
          ================================================== */

          .customer-workspace {
            color: rgba(255, 255, 255, 0.96);
          }

          /* =================================================
             CARD / TABLE / PANEL BACKGROUND
             đổi từ đen xám sang đen pha cam rất nhẹ
          ================================================== */

          .customer-workspace [class*="bg-[#0a0a0a]"] {
            background: rgba(15, 12, 13, 0.94) !important;
            border-color: rgba(255, 255, 255, 0.12) !important;
            box-shadow:
              0 14px 40px rgba(0, 0, 0, 0.22),
              inset 0 1px 0 rgba(255, 255, 255, 0.025);
          }

          .customer-workspace [class*="bg-[#0d0d0d]"] {
            background: rgba(17, 14, 15, 0.95) !important;
            border-color: rgba(255, 255, 255, 0.12) !important;
            box-shadow:
              0 12px 30px rgba(0, 0, 0, 0.18),
              inset 0 1px 0 rgba(255, 255, 255, 0.02);
          }

          .customer-workspace [class*="bg-[#101010]"] {
            background: rgba(21, 17, 18, 0.96) !important;
            border-color: rgba(255, 255, 255, 0.12) !important;
          }

          .customer-workspace [class*="bg-[#111214]"],
          .customer-workspace [class*="bg-[#131417]"] {
            background: rgba(24, 19, 20, 0.98) !important;
            border-color: rgba(255, 255, 255, 0.14) !important;
          }

          /* =================================================
             GENERIC BORDER IMPROVEMENT
          ================================================== */

          .customer-workspace [class*="border-white/[0.06]"],
          .customer-workspace [class*="border-white/[0.065]"],
          .customer-workspace [class*="border-white/[0.07]"],
          .customer-workspace [class*="border-white/[0.08]"],
          .customer-workspace [class*="border-white/[0.09]"],
          .customer-workspace [class*="border-white/[0.1]"] {
            border-color: rgba(255, 255, 255, 0.12) !important;
          }

          /* =================================================
             TABLE / CARD TEXT
             bỏ cảm giác xám, cho sáng hơn
          ================================================== */

          .customer-workspace [class*="text-white/20"],
          .customer-workspace [class*="text-white/25"],
          .customer-workspace [class*="text-white/30"],
          .customer-workspace [class*="text-white/[0.2]"],
          .customer-workspace [class*="text-white/[0.25]"],
          .customer-workspace [class*="text-white/[0.3]"] {
            color: rgba(255, 255, 255, 0.78) !important;
          }

          .customer-workspace [class*="text-white/35"],
          .customer-workspace [class*="text-white/40"],
          .customer-workspace [class*="text-white/45"],
          .customer-workspace [class*="text-white/[0.35]"],
          .customer-workspace [class*="text-white/[0.4]"],
          .customer-workspace [class*="text-white/[0.45]"] {
            color: rgba(255, 255, 255, 0.86) !important;
          }

          .customer-workspace [class*="text-white/50"],
          .customer-workspace [class*="text-white/55"],
          .customer-workspace [class*="text-white/60"],
          .customer-workspace [class*="text-white/[0.5]"],
          .customer-workspace [class*="text-white/[0.55]"],
          .customer-workspace [class*="text-white/[0.6]"] {
            color: rgba(255, 255, 255, 0.92) !important;
          }

          /* =================================================
             COMMON TEXT COLORS INSIDE TABLES / CARDS
          ================================================== */

          .customer-workspace table,
          .customer-workspace th,
          .customer-workspace td,
          .customer-workspace p,
          .customer-workspace span,
          .customer-workspace h1,
          .customer-workspace h2,
          .customer-workspace h3,
          .customer-workspace h4 {
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
          }

          /* =================================================
             TABLE HEADING / SMALL LABELS
          ================================================== */

          .customer-workspace [class*="tracking-[0.2em]"],
          .customer-workspace [class*="tracking-[0.18em]"],
          .customer-workspace [class*="tracking-[0.16em]"],
          .customer-workspace [class*="tracking-[0.15em]"] {
            color: rgba(255, 255, 255, 0.78) !important;
          }

          /* =================================================
             FONT SIZE BOOST
             làm chữ trong bảng to hơn chút
          ================================================== */

          .customer-workspace [class*="text-[10px]"] {
            font-size: 11px !important;
          }

          .customer-workspace [class*="text-[11px]"] {
            font-size: 12px !important;
          }

          .customer-workspace [class*="text-[12px]"] {
            font-size: 13px !important;
          }

          .customer-workspace [class*="text-[13px]"] {
            font-size: 14px !important;
          }

          .customer-workspace [class*="text-[14px]"] {
            font-size: 15px !important;
          }

          .customer-workspace [class*="text-[15px]"] {
            font-size: 16px !important;
          }

          .customer-workspace [class*="text-[16px]"] {
            font-size: 17px !important;
          }

          /* =================================================
             TABLE ROWS / LIST ITEMS
          ================================================== */

          .customer-workspace tr,
          .customer-workspace [role="row"] {
            transition: background-color 180ms ease, border-color 180ms ease;
          }

          /* =================================================
             INPUT / SELECT / TEXTAREA
          ================================================== */

          .customer-workspace input,
          .customer-workspace select,
          .customer-workspace textarea {
            color: rgba(255, 255, 255, 0.96) !important;
            background-color: rgba(22, 18, 19, 0.96) !important;
            border-color: rgba(255, 255, 255, 0.14) !important;
          }

          .customer-workspace input::placeholder,
          .customer-workspace textarea::placeholder {
            color: rgba(255, 255, 255, 0.46) !important;
          }

          .customer-workspace input:focus,
          .customer-workspace select:focus,
          .customer-workspace textarea:focus {
            box-shadow: 0 0 0 1px rgba(249, 115, 22, 0.28);
            border-color: rgba(249, 115, 22, 0.8) !important;
          }

          /* =================================================
             LINKS / ACTION TEXT
          ================================================== */

          .customer-workspace a,
          .customer-workspace button {
            -webkit-tap-highlight-color: transparent;
          }
        `}
      </style>
    </div>
  );
}