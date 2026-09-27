import { Outlet } from "react-router-dom";

import { CustomerHeader } from "../features/customer/components/CustomerHeader";

export function CustomerLayout() {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <CustomerHeader />

      <main className="pt-[72px]">
        <Outlet />
      </main>
    </div>
  );
}