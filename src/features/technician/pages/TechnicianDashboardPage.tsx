import {
  BatteryMedium,
  CircleAlert,
  Plane,
  Wrench,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";

import {
  Progress,
} from "@/components/shadcn/ui/progress";

import {
  TechnicianPageShell,
} from "../components/TechnicianPageShell";

import {
  TechnicianStatCard,
} from "../components/TechnicianStatCard";

import {
  TechnicianStatusBadge,
} from "../components/TechnicianStatusBadge";

import {
  maintenanceAlerts,
  technicianDrones,
  workOrders,
} from "../data/technicianMockData";

export function TechnicianDashboardPage() {
  return (
    <TechnicianPageShell
      title="Technician dashboard"
      description="Fleet readiness, battery condition and maintenance workload."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TechnicianStatCard
          label="Fleet status"
          value="12"
          description="10 operational · 2 attention"
          icon={Plane}
        />

        <TechnicianStatCard
          label="Available drones"
          value="8"
          description="66% of fleet available"
          icon={Plane}
        />

        <TechnicianStatCard
          label="Battery attention"
          value="3"
          description="1 replacement required"
          icon={BatteryMedium}
        />

        <TechnicianStatCard
          label="Open maintenance"
          value="5"
          description="2 high priority"
          icon={Wrench}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="rounded-lg border-zinc-800 bg-[#121419] shadow-none">
          <CardHeader>
            <CardTitle className="text-[14px] font-medium text-zinc-200">
              Fleet readiness
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            {technicianDrones.map(
              (drone) => (
                <div
                  key={drone.id}
                  className="grid grid-cols-[1fr_120px_80px] items-center gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-[12px] font-medium text-zinc-200">
                        {drone.name}
                      </strong>

                      <TechnicianStatusBadge
                        status={
                          drone.status as any
                        }
                      />
                    </div>

                    <p className="mt-1 text-[10px] text-zinc-600">
                      {drone.model}
                    </p>
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between text-[9px] text-zinc-600">
                      <span>Battery</span>
                      <span>
                        {drone.battery}%
                      </span>
                    </div>

                    <Progress
                      value={
                        drone.battery
                      }
                      className="h-1 bg-zinc-800"
                    />
                  </div>

                  <span className="text-right text-[10px] text-zinc-500">
                    {drone.lastFlight}
                  </span>
                </div>
              ),
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-zinc-800 bg-[#121419] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[14px] font-medium text-zinc-200">
              <CircleAlert
                size={15}
                className="text-orange-500"
              />

              Maintenance alerts
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {maintenanceAlerts.map(
              (alert) => (
                <div
                  key={alert.id}
                  className="border-b border-zinc-800/80 pb-3 last:border-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-zinc-600">
                        {alert.drone}
                      </span>

                      <p className="mt-1 text-[11px] leading-5 text-zinc-300">
                        {alert.title}
                      </p>
                    </div>

                    <TechnicianStatusBadge
                      status={
                        alert.severity as any
                      }
                    />
                  </div>

                  <p className="mt-2 text-[9px] text-zinc-700">
                    {alert.time}
                  </p>
                </div>
              ),
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5 rounded-lg border-zinc-800 bg-[#121419] shadow-none">
        <CardHeader>
          <CardTitle className="text-[14px] font-medium text-zinc-200">
            Active work orders
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-2">
            {workOrders.map((order) => (
              <div
                key={order.id}
                className="
                  grid
                  grid-cols-[100px_90px_1fr_100px]
                  items-center
                  rounded-md
                  border border-zinc-800
                  px-3 py-3
                  text-[11px]
                "
              >
                <span className="text-zinc-500">
                  {order.id}
                </span>

                <span className="text-zinc-300">
                  {order.drone}
                </span>

                <span className="text-zinc-300">
                  {order.title}
                </span>

                <TechnicianStatusBadge
                  status={
                    order.status as any
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </TechnicianPageShell>
  );
}