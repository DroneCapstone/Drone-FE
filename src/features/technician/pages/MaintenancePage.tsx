import {
  ClipboardCheck,
  Plus,
  TriangleAlert,
  Wrench,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  Button,
} from "@/components/shadcn/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";

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
  workOrders,
} from "../data/technicianMockData";

export function MaintenancePage() {
  const navigate =
    useNavigate();

  return (
    <TechnicianPageShell
      title="Maintenance"
      description="Alerts, inspections and active maintenance work."
      action={
        <Button className="h-9 rounded-md bg-orange-500 text-[11px] text-black hover:bg-orange-600">
          <Plus size={14} />

          Create work order
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <TechnicianStatCard
          label="Maintenance alerts"
          value="3"
          description="1 requires immediate attention"
          icon={TriangleAlert}
        />

        <TechnicianStatCard
          label="Open work orders"
          value="5"
          description="2 high priority"
          icon={Wrench}
        />

        <TechnicianStatCard
          label="Inspections today"
          value="4"
          description="3 completed"
          icon={ClipboardCheck}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card className="rounded-lg border-zinc-800 bg-[#121419] shadow-none">
          <CardHeader>
            <CardTitle className="text-[13px] font-medium">
              Maintenance alerts
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {maintenanceAlerts.map(
              (alert) => (
                <div
                  key={alert.id}
                  className="rounded-md border border-zinc-800 px-3 py-3"
                >
                  <div className="flex justify-between">
                    <span className="text-[10px] text-zinc-600">
                      {alert.id} ·{" "}
                      {alert.drone}
                    </span>

                    <TechnicianStatusBadge
                      status={
                        alert.severity as any
                      }
                    />
                  </div>

                  <p className="mt-2 text-[11px] text-zinc-300">
                    {alert.title}
                  </p>
                </div>
              ),
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-zinc-800 bg-[#121419] shadow-none">
          <CardHeader>
            <CardTitle className="text-[13px] font-medium">
              Work orders
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">
            {workOrders.map(
              (order) => (
                <button
                  key={order.id}
                  onClick={() =>
                    navigate(
                      `/technician/maintenance/work-orders/${order.id}`,
                    )
                  }
                  className="
                    w-full rounded-md
                    border border-zinc-800
                    px-3 py-3
                    text-left
                    transition
                    hover:border-zinc-700
                    hover:bg-zinc-900/40
                  "
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-600">
                      {order.id} ·{" "}
                      {order.drone}
                    </span>

                    <TechnicianStatusBadge
                      status={
                        order.status as any
                      }
                    />
                  </div>

                  <p className="mt-2 text-[11px] text-zinc-300">
                    {order.title}
                  </p>
                </button>
              ),
            )}
          </CardContent>
        </Card>
      </div>
    </TechnicianPageShell>
  );
}