import {
  TriangleAlert,
} from "lucide-react";

import {
  Button,
} from "@/components/shadcn/ui/button";

import {
  Card,
  CardContent,
} from "@/components/shadcn/ui/card";

import {
  TechnicianPageShell,
} from "../components/TechnicianPageShell";

import {
  TechnicianStatusBadge,
} from "../components/TechnicianStatusBadge";

import {
  incidents,
} from "../data/technicianMockData";

export function IncidentsPage() {
  return (
    <TechnicianPageShell
      title="Drone incidents"
      description="Investigate technical incidents and record corrective actions."
    >
      <div className="space-y-3">
        {incidents.map(
          (incident) => (
            <Card
              key={incident.id}
              className="rounded-lg border-zinc-800 bg-[#121419] shadow-none"
            >
              <CardContent className="grid gap-4 p-4 md:grid-cols-[44px_1fr_auto] md:items-center">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-zinc-900">
                  <TriangleAlert
                    size={17}
                    className={
                      incident.severity ===
                      "critical"
                        ? "text-red-400"
                        : "text-amber-400"
                    }
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-[12px] font-medium text-zinc-200">
                      {incident.title}
                    </strong>

                    <TechnicianStatusBadge
                      status={
                        incident.severity as any
                      }
                    />
                  </div>

                  <p className="mt-1 text-[10px] text-zinc-600">
                    {incident.id} ·{" "}
                    {incident.drone} ·{" "}
                    {incident.mission}
                  </p>

                  <p className="mt-2 text-[10px] text-zinc-500">
                    {incident.status} ·{" "}
                    {incident.time}
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="h-8 rounded-md border-zinc-700 bg-transparent text-[10px]"
                >
                  Investigate
                </Button>
              </CardContent>
            </Card>
          ),
        )}
      </div>
    </TechnicianPageShell>
  );
}