import { type ReactNode, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  MapPin,
  Plane,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/shadcn/ui/button";
import { Card, CardContent } from "@/components/shadcn/ui/card";

import { type FleetDrone } from "../utils/fleetStorage";
import {
  useDroneDetailQuery,
  useDroneMaintenanceHistoryQuery,
  useFleetQuery,
} from "../hooks/useFleetQueries";
import {
  useDroneMaintenanceSchedulesQuery,
  useMaintenanceRecordsQuery,
} from "../hooks/useMaintenanceQueries";
import { type CompletedMaintenanceRecord } from "../utils/maintenanceStorage";
import { isRecord, pickString, unwrapList, unwrapObject } from "../api/httpClient";

type DetailTab = "overview" | "flight" | "maintenance";

const EMPTY = "—";
const TEXT = "text-[var(--tech-text)]";
const SECONDARY = "text-[var(--tech-text-secondary)]";
const MUTED = "text-[var(--tech-muted)]";
const PANEL = "rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none";

function display(value?: string | number | null): string {
  if (value === null || value === undefined || String(value).trim() === "") return EMPTY;
  return String(value);
}

function displayNumber(value: number | undefined, suffix = "", digits = 1): string {
  return value === undefined || !Number.isFinite(value)
    ? EMPTY
    : `${Number.isInteger(value) ? value : value.toFixed(digits)}${suffix}`;
}

function parseApiDate(value: string | null | undefined): Date | null {
  if (!value || value === EMPTY) return null;
  const cleaned = value.replace(/\s*·\s*/g, " ").trim();
  const parsed = new Date(cleaned);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value: Date | null): string {
  if (!value) return EMPTY;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value).replace(",", " ·");
}

function cleanDroneId(value: string): string {
  // Older Maintenance Record mapping could prefix DR- before an existing DRN- id.
  return value.trim().toUpperCase().replace(/^DR-(?=DRN-)/, "");
}

function parseSchedule(payload: unknown): {
  last: Date | null;
  next: Date | null;
  interval: string | null;
} {
  const rows = unwrapList(payload);
  const object = rows.find(isRecord) ?? unwrapObject(payload);
  if (!isRecord(object)) return { last: null, next: null, interval: null };
  const last = pickString(object, [
    "last_maintenance_at", "last_maintenance", "completed_at", "performed_at",
  ], "");
  const next = pickString(object, [
    "next_maintenance_at", "next_maintenance", "scheduled_at", "due_at", "next_due_at",
  ], "");
  const interval = pickString(object, ["frequency", "interval", "maintenance_interval"], "");
  const intervalDays = object.interval_days;
  const intervalMonths = object.interval_months;
  const intervalLabel = interval ||
    (typeof intervalDays === "number" ? `${intervalDays} days` : null) ||
    (typeof intervalMonths === "number" ? `${intervalMonths} months` : null);
  return { last: parseApiDate(last), next: parseApiDate(next), interval: intervalLabel };
}

function maintenanceDueInfo(next: Date | null) {
  if (!next) return { label: "Not provided", danger: false, helper: "No next maintenance date from Backend" };
  const days = Math.ceil((next.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: "Overdue", danger: true, helper: `${-days} day(s) overdue` };
  if (days <= 7) return { label: "Due soon", danger: false, helper: days === 0 ? "Due today" : `Due in ${days} day(s)` };
  return { label: "On schedule", danger: false, helper: `Due in ${days} days` };
}

function latestMaintenance(records: CompletedMaintenanceRecord[]): Date | null {
  const dates = records.map((record) => parseApiDate(record.completedAt))
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime());
  return dates[0] ?? null;
}

function sameDroneId(a: string, b: string): boolean {
  return cleanDroneId(a) === cleanDroneId(b);
}

export function DroneDetailPage() {
  const navigate = useNavigate();
  const { droneId } = useParams();
  const [tab, setTab] = useState<DetailTab>("overview");

  const droneQuery = useDroneDetailQuery(droneId);
  const fleetQuery = useFleetQuery();
  const historyQuery = useDroneMaintenanceHistoryQuery(droneId);
  const recordsQuery = useMaintenanceRecordsQuery(droneId);
  const scheduleQuery = useDroneMaintenanceSchedulesQuery(droneId);

  const fallbackDrone = useMemo(() =>
    (fleetQuery.data ?? []).find((item) => item.id === droneId),
    [droneId, fleetQuery.data],
  );
  const drone: FleetDrone | undefined = droneQuery.data ?? fallbackDrone;

  // Keep maintenance data scoped to this drone, and avoid duplicate rows
  // when the history and maintenance-records APIs return the same record.
  const maintenanceRecords = useMemo(() => {
    const found = new Map<string, CompletedMaintenanceRecord>();
    for (const item of [...(historyQuery.data ?? []), ...(recordsQuery.data ?? [])]) {
      if (!droneId || !sameDroneId(item.droneId, droneId)) continue;
      found.set(item.id, item);
    }
    return [...found.values()];
  }, [historyQuery.data, recordsQuery.data, droneId]);

  const backendSchedule = useMemo(() => parseSchedule(scheduleQuery.data), [scheduleQuery.data]);
  const lastMaintenance = backendSchedule.last ??
    parseApiDate(drone?.lastMaintenanceAt) ?? latestMaintenance(maintenanceRecords);
  const nextMaintenance = backendSchedule.next ?? parseApiDate(drone?.nextMaintenanceAt);
  const due = maintenanceDueInfo(nextMaintenance);

  const loading = !drone && (droneQuery.isPending || fleetQuery.isPending);
  if (loading) {
    return <div className={`px-6 py-8 text-[14px] ${MUTED}`}>Loading drone details...</div>;
  }
  if (!drone) {
    const error = droneQuery.error instanceof Error ? droneQuery.error.message :
      fleetQuery.error instanceof Error ? fleetQuery.error.message : "The requested drone was not found.";
    return (
      <div className="px-6 py-6 md:px-8">
        <h1 className={`text-[26px] font-semibold ${TEXT}`}>Drone not found</h1>
        <p className={`mt-2 text-[14px] ${MUTED}`}>{error}</p>
        <Button type="button" onClick={() => navigate("/technician/fleet")}
          className="mt-5 h-10 rounded-md bg-orange-500 px-4 text-black hover:bg-orange-600">
          <ArrowLeft size={16} className="mr-2" /> Back to fleet
        </Button>
      </div>
    );
  }

  const realStatus = drone.operationalStatus || drone.status;
  const location = drone.currentHubId === null ? "Not assigned to a hub" : display(drone.location);
  const maintenanceBusy = historyQuery.isPending || recordsQuery.isPending;
  const maintenanceError = historyQuery.error instanceof Error
    ? historyQuery.error.message : recordsQuery.error instanceof Error ? recordsQuery.error.message : "";

  return (
    <div className="px-6 py-5 md:px-8">
      {droneQuery.error instanceof Error && fallbackDrone && (
        <div className="mb-4 rounded-md border border-amber-500/25 px-4 py-3 text-[13px] text-amber-500">
          Drone detail API could not be loaded. Showing partial information from Hub Fleet: {droneQuery.error.message}
        </div>
      )}
      <button type="button" onClick={() => navigate("/technician/fleet")}
        className={`mb-4 inline-flex items-center gap-2 text-[13px] font-medium ${MUTED} hover:text-orange-500`}>
        <ArrowLeft size={16} /> Back to fleet
      </button>

      <div className="mb-6">
        <h1 className={`text-[30px] font-semibold tracking-tight ${TEXT}`}>{drone.id}</h1>
        <p className={`mt-1 text-[14px] ${MUTED}`}>
          {display(drone.name)}{drone.name && drone.model && drone.name !== drone.model ? ` · ${drone.model}` : ""}
        </p>
        <p className={`mt-2 flex items-center gap-2 text-[13px] ${MUTED}`}>
          <MapPin size={15} /> {location}
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <SummaryCard icon={<Plane size={20}/>} label="Operational status" value={realStatus}
          danger={realStatus.toLowerCase().includes("maintenance") || realStatus.toLowerCase() === "incident"} />
        <SummaryCard icon={<MapPin size={20}/>} label="Current hub" value={location} />
      </div>

      <div className="mb-6 flex flex-wrap gap-7 border-b border-[var(--tech-border)]">
        <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>Overview</TabButton>
        <TabButton active={tab === "flight"} onClick={() => setTab("flight")}>Flight history</TabButton>
        <TabButton active={tab === "maintenance"} onClick={() => setTab("maintenance")}>Maintenance history</TabButton>
      </div>

      {tab === "overview" && <div className="space-y-5">
        <Card className={PANEL}><CardContent className="p-6">
          <h2 className={`text-[18px] font-semibold ${TEXT}`}>Drone information</h2>
          <div className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem label="Drone ID" value={drone.id} />
            <InfoItem label="Name" value={drone.name} />
            <InfoItem label="Model" value={drone.model} />
            <InfoItem label="Status" value={realStatus} />
            <InfoItem label="Current hub" value={location} />
            <InfoItem label="Hub ID" value={drone.currentHubId === null ? EMPTY : display(drone.currentHubId)} />
            <InfoItem label="Payload capacity" value={displayNumber(drone.payloadKg, " kg")} />
            <InfoItem label="Maximum speed" value={displayNumber(drone.maxSpeed)} />
            <InfoItem label="Utilization" value={displayNumber(drone.utilizationPct, "%")} />
            <InfoItem label="Last flight" value={drone.lastFlightAt ? formatDate(parseApiDate(drone.lastFlightAt)) : display(drone.lastFlight)} />
          </div>
        </CardContent></Card>

        <Card className={PANEL}><CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className={`text-[18px] font-semibold ${TEXT}`}>Maintenance schedule</h2>
              <p className={`mt-1 text-[13px] ${MUTED}`}>
                Schedule dates are displayed only when returned by Backend.
              </p>
            </div>
            <span className={`rounded-md border border-[var(--tech-border)] px-3 py-1.5 text-[12px] font-medium ${due.danger ? "text-red-500" : SECONDARY}`}>
              {scheduleQuery.isPending ? "Loading..." : due.label}
            </span>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <ScheduleItem label="Maintenance interval" value={display(backendSchedule.interval)}
              helper={backendSchedule.interval ? "Backend schedule" : "Not provided by Backend"} />
            <ScheduleItem label="Last maintenance" value={formatDate(lastMaintenance)}
              helper={lastMaintenance ? "Recorded maintenance date" : "No recorded date"} />
            <ScheduleItem label="Next maintenance" value={formatDate(nextMaintenance)}
              helper={due.helper} danger={due.danger} />
          </div>
          {scheduleQuery.error instanceof Error && <p className="mt-4 text-[12px] text-amber-500">
            Maintenance schedule could not be loaded: {scheduleQuery.error.message}
          </p>}
        </CardContent></Card>
      </div>}

      {tab === "flight" && <Card className={PANEL}><CardContent className="p-6">
        <h2 className={`text-[18px] font-semibold ${TEXT}`}>Flight history</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <InfoItem label="Last flight time" value={formatDate(parseApiDate(drone.lastFlightAt))} />
          <InfoItem label="Last flight / mission reference" value={display(drone.lastFlight)} />
        </div>
       
      </CardContent></Card>}

      {tab === "maintenance" && <div className="space-y-5">
        <Card className={PANEL}><CardContent className="p-6">
          <h2 className={`text-[18px] font-semibold ${TEXT}`}>Maintenance overview</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <InfoItem label="Maintenance schedule" value={due.label} danger={due.danger} />
            <InfoItem label="Last maintenance" value={formatDate(lastMaintenance)} />
            <InfoItem label="Next maintenance" value={formatDate(nextMaintenance)} danger={due.danger} />
          </div>
        </CardContent></Card>

        <Card className={PANEL}><CardContent className="p-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={19} className="text-emerald-500" />
            <h2 className={`text-[18px] font-semibold ${TEXT}`}>Maintenance records</h2>
          </div>
         
          {maintenanceError && <p className="mt-3 text-[12px] text-amber-500">
            Some maintenance data could not be loaded: {maintenanceError}
          </p>}
          <div className="mt-5 space-y-3">
            {maintenanceBusy && maintenanceRecords.length === 0 ? (
              <p className={`py-7 text-center text-[13px] ${MUTED}`}>Loading maintenance records...</p>
            ) : maintenanceRecords.length > 0 ? maintenanceRecords.map((record) => (
              <details key={record.id} className="group overflow-hidden rounded-md border border-[var(--tech-border)] bg-[var(--tech-surface-2)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[15px] font-semibold ${TEXT}`}>{record.workOrderId}</span>
                      <span className="text-[12px] font-medium text-emerald-500">{record.workOrderStatus || "Recorded"}</span>
                    </div>
                    <p className={`mt-1 text-[14px] ${SECONDARY}`}>{record.title}</p>
                    {record.maintenanceType && (
                      <p className={`mt-1 text-[12px] ${MUTED}`}>
                        {[record.maintenanceType].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 text-right text-[12px] ${MUTED}`}>{parseApiDate(record.completedAt) ? formatDate(parseApiDate(record.completedAt)) : display(record.completedAt)}</span>
                </summary>
                <div className="border-t border-[var(--tech-border)] px-4 py-4">
                  <div className="grid gap-5 md:grid-cols-2">
                    {record.recordDescription &&
                      <InfoItem label="Record description" value={record.recordDescription} />}
                    
                    <InfoItem label="Corrective action" value={record.correctiveAction} />
             
                    <InfoItem label="Performed / assigned to" value={record.assignedTo} />
                  </div>
                  
                </div>
              </details>
            )) : <div className={`rounded-md border border-dashed border-[var(--tech-border)] px-4 py-9 text-center text-[14px] ${MUTED}`}>
              No maintenance records returned for this drone.
            </div>}
          </div>
        </CardContent></Card>
      </div>}
    </div>
  );
}

function SummaryCard({ icon, label, value, helper, danger = false }: {
  icon: ReactNode; label: string; value: string; helper?: string; danger?: boolean;
}) {
  return <Card className={PANEL}><CardContent className="flex min-h-[118px] items-center gap-4 p-5">
    <span className={danger ? "text-red-500" : "text-orange-500"}>{icon}</span>
    <div className="min-w-0">
      <p className={`text-[12px] font-medium ${MUTED}`}>{label}</p>
      <p title={value} className={`mt-1.5 truncate text-[17px] font-semibold ${danger ? "text-red-500" : TEXT}`}>{value}</p>
      {helper && <p className={`mt-1 truncate text-[11px] ${MUTED}`}>{helper}</p>}
    </div>
  </CardContent></Card>;
}

function InfoItem({ label, value, danger = false }: { label: string; value?: string; danger?: boolean }) {
  return <div className="min-w-0">
    <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-[var(--tech-subtle)]">{label}</p>
    <p className={`mt-2 break-words text-[15px] font-medium ${danger ? "text-red-500" : SECONDARY}`}>{display(value)}</p>
  </div>;
}

function ScheduleItem({ label, value, helper, danger = false }: {
  label: string; value: string; helper: string; danger?: boolean;
}) {
  return <div className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface-2)] px-4 py-4">
    <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-[var(--tech-subtle)]">{label}</p>
    <p className={`mt-2 text-[16px] font-semibold ${danger ? "text-red-500" : TEXT}`}>{value}</p>
    <p className={`mt-1 text-[12px] ${MUTED}`}>{helper}</p>
  </div>;
}

function TabButton({ active, children, onClick }: {
  active: boolean; children: ReactNode; onClick: () => void;
}) {
  return <button type="button" onClick={onClick}
    className={`relative pb-3 text-[14px] font-medium transition-colors ${active ? TEXT : `${MUTED} hover:${SECONDARY}`}`}>
    {children}
    {active && <span className="absolute bottom-0 left-0 h-[2px] w-full bg-orange-500" />}
  </button>;
}
