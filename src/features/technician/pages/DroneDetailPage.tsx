import {
  BatteryMedium,
  History,
  Plane,
  RotateCcw,
  Wrench,
} from "lucide-react";

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
  Progress,
} from "@/components/shadcn/ui/progress";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shadcn/ui/tabs";

import {
  TechnicianPageShell,
} from "../components/TechnicianPageShell";

export function DroneDetailPage() {
  return (
    <TechnicianPageShell
      title="CX-09"
      description="DR-001 · DJI Matrice 350"
      action={
        <Button className="h-9 rounded-md bg-orange-500 text-[11px] text-black hover:bg-orange-600">
          <RotateCcw size={14} />

          Replace battery
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard
          icon={Plane}
          label="Operational status"
          value="Available"
        />

        <InfoCard
          icon={BatteryMedium}
          label="Battery level"
          value="86%"
        />

        <InfoCard
          icon={Wrench}
          label="Maintenance"
          value="Nominal"
        />
      </div>

      <Tabs
        defaultValue="overview"
        className="mt-5"
      >
        <TabsList className="rounded-md border border-zinc-800 bg-[#121419]">
          <TabsTrigger value="overview">
            Overview
          </TabsTrigger>

          <TabsTrigger value="flights">
            Flight history
          </TabsTrigger>

          <TabsTrigger value="maintenance">
            Maintenance history
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <Card className="rounded-lg border-zinc-800 bg-[#121419] shadow-none">
              <CardHeader>
                <CardTitle className="text-[13px] font-medium">
                  Drone information
                </CardTitle>
              </CardHeader>

              <CardContent className="grid grid-cols-2 gap-y-5 text-[11px]">
                <Detail
                  label="Serial number"
                  value="M350-29341"
                />
                <Detail
                  label="Model"
                  value="DJI Matrice 350"
                />
                <Detail
                  label="Total flights"
                  value="148"
                />
                <Detail
                  label="Flight hours"
                  value="91.4 h"
                />
                <Detail
                  label="Utilization"
                  value="62%"
                />
                <Detail
                  label="Last inspection"
                  value="14 Sep 2026"
                />
              </CardContent>
            </Card>

            <Card className="rounded-lg border-zinc-800 bg-[#121419] shadow-none">
              <CardHeader>
                <CardTitle className="text-[13px] font-medium">
                  Battery status
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="flex justify-between">
                  <span className="text-[11px] text-zinc-500">
                    Remaining level
                  </span>

                  <strong className="text-[18px] font-medium text-zinc-200">
                    86%
                  </strong>
                </div>

                <Progress
                  value={86}
                  className="mt-3 h-1.5 bg-zinc-800"
                />

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <Detail
                    label="Battery ID"
                    value="BAT-091"
                  />

                  <Detail
                    label="Cycles"
                    value="73"
                  />

                  <Detail
                    label="Temperature"
                    value="31°C"
                  />

                  <Detail
                    label="State"
                    value="Operational"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="flights">
          <HistoryPanel
            icon={History}
            title="Flight history"
          />
        </TabsContent>

        <TabsContent value="maintenance">
          <HistoryPanel
            icon={Wrench}
            title="Maintenance history"
          />
        </TabsContent>
      </Tabs>
    </TechnicianPageShell>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <span className="block text-[9px] uppercase tracking-[0.08em] text-zinc-600">
        {label}
      </span>

      <strong className="mt-1 block text-[11px] font-medium text-zinc-300">
        {value}
      </strong>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: any) {
  return (
    <Card className="rounded-lg border-zinc-800 bg-[#121419] shadow-none">
      <CardContent className="flex items-center gap-4 p-4">
        <Icon
          size={18}
          className="text-orange-500"
        />

        <div>
          <p className="text-[9px] text-zinc-600">
            {label}
          </p>

          <strong className="text-[13px] font-medium text-zinc-200">
            {value}
          </strong>
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryPanel({
  icon: Icon,
  title,
}: any) {
  return (
    <Card className="mt-4 rounded-lg border-zinc-800 bg-[#121419] shadow-none">
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <Icon
            size={15}
            className="text-zinc-500"
          />

          <h3 className="text-[13px] font-medium">
            {title}
          </h3>
        </div>

        <p className="mt-5 text-[11px] text-zinc-600">
          Historical records will appear here.
        </p>
      </CardContent>
    </Card>
  );
}