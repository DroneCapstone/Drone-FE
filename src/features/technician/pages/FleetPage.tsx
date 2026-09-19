import {
  ArrowUpRight,
  Plus,
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
} from "@/components/shadcn/ui/card";

import {
  Progress,
} from "@/components/shadcn/ui/progress";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/ui/table";

import {
  TechnicianPageShell,
} from "../components/TechnicianPageShell";

import {
  TechnicianStatusBadge,
} from "../components/TechnicianStatusBadge";

import {
  technicianDrones,
} from "../data/technicianMockData";

export function FleetPage() {
  const navigate =
    useNavigate();

  return (
    <TechnicianPageShell
      title="Fleet"
      description="View and manage drone operational status."
      action={
        <Button className="h-9 rounded-md bg-orange-500 text-[11px] font-medium text-black hover:bg-orange-600">
          <Plus size={14} />

          Register drone
        </Button>
      }
    >
      <Card className="rounded-lg border-zinc-800 bg-[#121419] shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead>Drone</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Battery</TableHead>
                <TableHead>
                  Utilization
                </TableHead>
                <TableHead>
                  Last flight
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>

            <TableBody>
              {technicianDrones.map(
                (drone) => (
                  <TableRow
                    key={drone.id}
                    className="border-zinc-800/80 hover:bg-zinc-900/40"
                  >
                    <TableCell>
                      <strong className="text-[12px] font-medium text-zinc-200">
                        {drone.name}
                      </strong>

                      <p className="text-[9px] text-zinc-600">
                        {drone.id}
                      </p>
                    </TableCell>

                    <TableCell className="text-[11px] text-zinc-500">
                      {drone.model}
                    </TableCell>

                    <TableCell>
                      <TechnicianStatusBadge
                        status={
                          drone.status as any
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <div className="w-24">
                        <span className="text-[10px] text-zinc-400">
                          {drone.battery}%
                        </span>

                        <Progress
                          value={
                            drone.battery
                          }
                          className="mt-1 h-1 bg-zinc-800"
                        />
                      </div>
                    </TableCell>

                    <TableCell className="text-[11px] text-zinc-500">
                      {drone.utilization}%
                    </TableCell>

                    <TableCell className="text-[10px] text-zinc-500">
                      {drone.lastFlight}
                    </TableCell>

                    <TableCell>
                      <button
                        onClick={() =>
                          navigate(
                            `/technician/fleet/${drone.id}`,
                          )
                        }
                        className="text-zinc-600 transition hover:text-orange-500"
                      >
                        <ArrowUpRight
                          size={15}
                        />
                      </button>
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TechnicianPageShell>
  );
}