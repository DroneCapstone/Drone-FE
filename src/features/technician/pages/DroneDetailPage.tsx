import {
  ArrowLeft,
  Battery,
  CheckCircle2,
  MapPin,
  Plane,
  RotateCcw,
  Wrench,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { Button } from "@/components/shadcn/ui/button";

import {
  Card,
  CardContent,
} from "@/components/shadcn/ui/card";

import { TechnicianPageShell } from "../components/TechnicianPageShell";

import {
  loadFleet,
  saveFleet,
  type FleetDrone,
} from "../utils/fleetStorage";

import {
  loadMaintenanceRecords,
  type CompletedMaintenanceRecord,
} from "../utils/maintenanceStorage";

type DetailTab =
  | "overview"
  | "flight"
  | "maintenance";

export function DroneDetailPage() {
  const navigate = useNavigate();

  const { droneId } = useParams();

  const [fleet, setFleet] =
    useState<FleetDrone[]>(loadFleet);

  const [
    maintenanceRecords,
  ] = useState<
    CompletedMaintenanceRecord[]
  >(loadMaintenanceRecords);

  const [activeTab, setActiveTab] =
    useState<DetailTab>("overview");

  const [
    replaceBatteryOpen,
    setReplaceBatteryOpen,
  ] = useState(false);

  const [newBattery, setNewBattery] =
    useState("100");

  const drone = fleet.find(
    (item) => item.id === droneId,
  );

  const droneMaintenanceRecords =
    drone
      ? maintenanceRecords.filter(
          (record) =>
            record.droneId ===
            drone.id,
        )
      : [];

  useEffect(() => {
    saveFleet(fleet);
  }, [fleet]);

  if (!drone) {
    return (
      <TechnicianPageShell
        title="Drone not found"
        description="The requested drone does not exist."
      >
        <Button
          type="button"
          onClick={() =>
            navigate("/technician/fleet")
          }
          className="h-9 rounded-md bg-orange-500 px-4 font-sans text-[11px] text-black hover:bg-orange-600"
        >
          <ArrowLeft size={14} />
          Back to fleet
        </Button>
      </TechnicianPageShell>
    );
  }

  const lowBattery =
    drone.battery < 40;

  const maintenanceLabel =
    drone.status === "Maintenance"
      ? "Required"
      : drone.status ===
          "Battery Replacement"
        ? "Battery service"
        : "Nominal";

  const handleReplaceBattery = () => {
    const battery = Number(newBattery);

    if (
      Number.isNaN(battery) ||
      battery < 0 ||
      battery > 100
    ) {
      return;
    }

    setFleet((current) =>
      current.map((item) =>
        item.id === drone.id
          ? {
              ...item,
              battery,
              status:
                item.status ===
                "Battery Replacement"
                  ? "Available"
                  : item.status,
            }
          : item,
      ),
    );

    setReplaceBatteryOpen(false);
    setNewBattery("100");
  };

  return (
    <div className="px-6 py-5 md:px-8">
      {/* Back */}
      <button
        type="button"
        onClick={() =>
          navigate("/technician/fleet")
        }
        className="
          mb-3 inline-flex items-center gap-2
  font-sans text-[11px] font-medium
  text-[var(--tech-muted)]
  transition-colors duration-150
  hover:!text-orange-500
        "
      >
        <ArrowLeft size={14} />
        Back to fleet
      </button>

      {/* Page heading */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="font-sans text-[28px] font-semibold tracking-tight text-zinc-100">
            {drone.name}
          </h1>

          <p className="mt-1 text-[11px] text-zinc-500">
            {drone.id} · {drone.model}
          </p>

          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-zinc-500">
            <MapPin size={12} />
            {drone.location}
          </div>
        </div>

        <Button
          type="button"
          onClick={() =>
            setReplaceBatteryOpen(true)
          }
          className="h-9 rounded-md bg-orange-500 px-4 font-sans text-[11px] font-medium text-black hover:bg-orange-600"
        >
          <RotateCcw size={14} />
          Replace battery
        </Button>
      </div>

      {/* Summary */}
      <div className="mb-5 grid grid-cols-3 gap-4">
        <SummaryCard
          icon={<Plane size={18} />}
          label="Operational status"
          value={drone.status}
        />

        <SummaryCard
          icon={<Battery size={18} />}
          label="Battery level"
          value={`${drone.battery}%`}
          danger={lowBattery}
        />

        <SummaryCard
          icon={<Wrench size={18} />}
          label="Maintenance"
          value={maintenanceLabel}
        />
      </div>

      {/* Tabs */}
      <div className="mb-5 flex items-center gap-6 border-b border-zinc-800">
        <TabButton
          active={
            activeTab === "overview"
          }
          onClick={() =>
            setActiveTab("overview")
          }
        >
          Overview
        </TabButton>

        <TabButton
          active={
            activeTab === "flight"
          }
          onClick={() =>
            setActiveTab("flight")
          }
        >
          Flight history
        </TabButton>

        <TabButton
          active={
            activeTab === "maintenance"
          }
          onClick={() =>
            setActiveTab("maintenance")
          }
        >
          Maintenance history
        </TabButton>
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-2 gap-5">
          {/* Drone information */}
          <Card className="rounded-lg border-zinc-800 bg-[#121419] shadow-none">
            <CardContent className="p-6">
              <h2 className="font-sans text-[14px] font-semibold text-zinc-100">
                Drone information
              </h2>

              <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-6">
                <InfoItem
                  label="Drone ID"
                  value={drone.id}
                />

                <InfoItem
                  label="Model"
                  value={drone.model}
                />

                <InfoItem
                  label="Status"
                  value={drone.status}
                />

                <InfoItem
                  label="Utilization"
                  value={`${drone.utilization}%`}
                />

                <InfoItem
                  label="Current location"
                  value={drone.location}
                />

                <InfoItem
                  label="Last flight"
                  value={drone.lastFlight}
                />
              </div>
            </CardContent>
          </Card>

          {/* Battery */}
          <Card className="rounded-lg border-zinc-800 bg-[#121419] shadow-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-sans text-[14px] font-semibold text-zinc-100">
                  Battery status
                </h2>

                {lowBattery && (
                  <span className="rounded border border-red-900/70 bg-red-500/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.06em] text-red-500">
                    Low battery
                  </span>
                )}
              </div>

              <div className="mt-7 flex items-end justify-between">
                <span className="text-[11px] text-zinc-500">
                  Remaining level
                </span>

                <strong
                  className={`font-sans text-[23px] font-semibold ${
                    lowBattery
                      ? "text-red-500"
                      : "text-zinc-100"
                  }`}
                >
                  {drone.battery}%
                </strong>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all ${
                    lowBattery
                      ? "bg-red-500"
                      : "bg-orange-500"
                  }`}
                  style={{
                    width: `${drone.battery}%`,
                  }}
                />
              </div>

              <div className="mt-7">
                <InfoItem
                  label="Battery condition"
                  value={
                    lowBattery
                      ? "Low"
                      : "Normal"
                  }
                  danger={lowBattery}
                />
              </div>

              {lowBattery && (
                <div className="mt-6 rounded-md border border-red-900/60 bg-red-500/5 px-4 py-3">
                  <p className="text-[10px] font-medium text-red-400">
                    Battery below 40%.
                  </p>

                  <p className="mt-1 text-[9px] leading-4 text-zinc-500">
                    Check the drone route and
                    arrange landing or battery
                    replacement at the nearest
                    hub when required.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "flight" && (
        <Card className="rounded-lg border-zinc-800 bg-[#121419] shadow-none">
          <CardContent className="p-6">
            <h2 className="font-sans text-[14px] font-semibold text-zinc-100">
              Flight history
            </h2>

            <div className="mt-6 flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <p className="text-[10px] text-zinc-500">
                  Latest flight
                </p>

                <p className="mt-1 text-[11px] text-zinc-200">
                  {drone.lastFlight}
                </p>
              </div>

              <span className="text-[10px] text-zinc-600">
                Historical flight data will be
                connected from the backend.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "maintenance" && (
        <div className="space-y-5">
          <Card className="rounded-lg border-zinc-800 bg-[#121419] shadow-none">
            <CardContent className="p-6">
              <h2 className="font-sans text-[18px] font-semibold text-zinc-100">
                Maintenance history
              </h2>

              <div className="mt-6">
                <InfoItem
                  label="Current maintenance status"
                  value={maintenanceLabel}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-zinc-800 bg-[#121419] shadow-none">
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={17}
                  className="text-emerald-500"
                />

                <h2 className="font-sans text-[18px] font-semibold text-zinc-100">
                  Work complete
                </h2>
              </div>

              <p className="mt-1 text-[13px] text-zinc-500">
                Completed maintenance work and diagnosis records for this drone.
              </p>

              <div className="mt-5 space-y-3">
                {droneMaintenanceRecords.length >
                0 ? (
                  droneMaintenanceRecords.map(
                    (record) => (
                      <details
                        key={record.id}
                        className="group overflow-hidden rounded-md border border-zinc-800 bg-[#111318]"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[14px] font-semibold text-zinc-100">
                                {
                                  record.workOrderId
                                }
                              </span>

                              <span className="text-[12px] font-medium text-emerald-500">
                                Completed
                              </span>
                            </div>

                            <p className="mt-1 text-[14px] text-zinc-300">
                              {record.title}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-[12px] text-zinc-500">
                              {
                                record.completedAt
                              }
                            </p>

                            <p className="mt-1 text-[12px] text-zinc-600">
                              {
                                record.assignedTo
                              }
                            </p>
                          </div>
                        </summary>

                        <div className="border-t border-zinc-800 px-4 py-4">
                          <div className="grid gap-5 md:grid-cols-2">
                            <MaintenanceText
                              label="Diagnosis"
                              value={
                                record.diagnosis
                              }
                            />

                            <MaintenanceText
                              label="Corrective action"
                              value={
                                record.correctiveAction
                              }
                            />
                          </div>

                          <div className="mt-5 grid gap-5 border-t border-zinc-800 pt-4 md:grid-cols-3">
                            <InfoItem
                              label="Resulting status"
                              value={
                                record.resultingStatus
                              }
                            />

                            <InfoItem
                              label="Priority"
                              value={
                                record.priority
                              }
                            />

                            <InfoItem
                              label="Inspection"
                              value={`${record.inspectionItems.length} items completed`}
                            />
                          </div>
                        </div>
                      </details>
                    ),
                  )
                ) : (
                  <div className="rounded-md border border-dashed border-zinc-800 px-4 py-8 text-center">
                    <p className="text-[13px] text-zinc-500">
                      No completed maintenance work for this drone yet.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Replace battery modal */}
      {replaceBatteryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4">
          <div className="w-full max-w-[420px] rounded-lg border border-zinc-800 bg-[#121419] font-sans shadow-2xl">
            <div className="flex items-start justify-between border-b border-zinc-800 px-6 py-5">
              <div>
                <h2 className="font-sans text-[17px] font-semibold text-zinc-100">
                  Replace battery
                </h2>

                <p className="mt-1 text-[11px] text-zinc-500">
                  Update the battery level after
                  replacement.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setReplaceBatteryOpen(
                    false,
                  )
                }
                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <X size={17} />
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="mb-5 rounded-md border border-zinc-800 bg-[#111318] px-4 py-3">
                <p className="text-[9px] uppercase tracking-[0.08em] text-zinc-600">
                  Current battery
                </p>

                <p
                  className={`mt-1 text-[17px] font-semibold ${
                    lowBattery
                      ? "text-red-500"
                      : "text-zinc-100"
                  }`}
                >
                  {drone.battery}%
                </p>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">
                  New battery level
                </span>

                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newBattery}
                    onChange={(event) =>
                      setNewBattery(
                        event.target.value,
                      )
                    }
                    className="tech-control h-10 w-full px-3 pr-9"
                  />

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-600">
                    %
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-800 px-6 py-4">
              <Button
                type="button"
                onClick={() =>
                  setReplaceBatteryOpen(
                    false,
                  )
                }
                className="h-9 rounded-md border border-zinc-700 bg-transparent px-4 font-sans text-[11px] text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={
                  handleReplaceBattery
                }
                className="h-9 rounded-md bg-orange-500 px-4 font-sans text-[11px] font-medium text-black hover:bg-orange-600"
              >
                Confirm replacement
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MaintenanceText({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-zinc-600">
        {label}
      </span>

      <p className="mt-2 whitespace-pre-wrap text-[14px] leading-6 text-zinc-300">
        {value}
      </p>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <Card className="rounded-lg border-zinc-800 bg-[#121419] shadow-none">
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={
            danger
              ? "text-red-500"
              : "text-orange-500"
          }
        >
          {icon}
        </div>

        <div>
          <p className="text-[9px] text-zinc-600">
            {label}
          </p>

          <p
            className={`mt-1 font-sans text-[13px] font-semibold ${
              danger
                ? "text-red-500"
                : "text-zinc-200"
            }`}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoItem({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.08em] text-zinc-600">
        {label}
      </p>

      <p
        className={`mt-1.5 font-sans text-[11px] font-medium ${
          danger
            ? "text-red-500"
            : "text-zinc-200"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative pb-3 font-sans text-[12px] font-medium transition-colors ${
        active
          ? "text-zinc-100"
          : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}

      {active && (
        <span className="absolute bottom-0 left-0 h-[2px] w-full bg-orange-500" />
      )}
    </button>
  );
}