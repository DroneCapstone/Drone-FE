import {
  Bell,
} from "lucide-react";

import {
  Card,
  CardContent,
} from "@/components/shadcn/ui/card";

import {
  TechnicianPageShell,
} from "../components/TechnicianPageShell";

export function TechnicianNotificationsPage() {
  return (
    <TechnicianPageShell
      title="Notifications"
      description="Fleet and maintenance updates requiring technician attention."
    >
      <Card className="rounded-lg border-zinc-800 bg-[#121419] shadow-none">
        <CardContent className="divide-y divide-zinc-800 p-0">
          {[
            "AX-04 battery replacement required",
            "CX-12 motor inspection work order created",
            "CX-09 scheduled inspection due tomorrow",
          ].map((item, index) => (
            <div
              key={item}
              className="flex gap-3 px-4 py-4"
            >
              <Bell
                size={15}
                className={
                  index === 0
                    ? "text-orange-500"
                    : "text-zinc-600"
                }
              />

              <div>
                <p className="text-[11px] text-zinc-300">
                  {item}
                </p>

                <p className="mt-1 text-[9px] text-zinc-600">
                  {index + 1} h ago
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </TechnicianPageShell>
  );
}