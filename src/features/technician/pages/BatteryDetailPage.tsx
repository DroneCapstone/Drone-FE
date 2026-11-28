import { TechnicianLoadingState } from "../components/TechnicianLoadingState";
import {
  type ReactNode,
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  BatteryCharging,
  BatteryFull,
  Box,
  Clock3,
  Cpu,
  MapPin,
  Plane,
  RefreshCw,
} from "lucide-react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

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
  useBatteriesQuery,
} from "../hooks/useBatteryQueries";
import type { BatteryStatus } from "../utils/batteryStorage";

function formatDroneId(value?: string) {
  if (!value) return "—";
  if (!/^\d+$/.test(value)) return value;
  return `Drone #${value}`;
}

/** FE countdown is display-only. BE remains authoritative for charging status. */
function formatBatteryEta(battery: {
  status: BatteryStatus;
  estimatedReadyAt?: string;
  estimatedMinutesRemaining?: number;
}, now: number): string {
  if (battery.status !== "Charging") return "—";
  if (!battery.estimatedReadyAt) return "ETA unavailable";
  const readyAt = Date.parse(battery.estimatedReadyAt);
  if (!Number.isFinite(readyAt)) return "ETA unavailable";
  const remaining = Math.max(0, Math.ceil((readyAt - now) / 1000));
  if (!remaining) return "Awaiting status update";
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function BatteryDetailPage() {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const { batteryId } = useParams();

  const batteriesQuery = useBatteriesQuery();

  const battery = (batteriesQuery.data ?? []).find(
    (item) =>
      item.id === batteryId ||
      item.backendId === batteryId ||
      item.serialNumber === batteryId,
  );

  const detailAction = battery ? (
    <Button
      type="button"
      variant="outline"
      onClick={() =>
        batteriesQuery.refetch()
      }
      className="h-10 border-[var(--tech-border)] bg-transparent px-3 text-[var(--tech-text-secondary)] hover:border-orange-500/50 hover:bg-transparent hover:text-orange-500"
      aria-label="Refresh battery details"
      title="Refresh battery details"
    >
      <RefreshCw size={15} />
    </Button>
  ) : undefined;

  return (
    <TechnicianPageShell
      title={battery?.id ?? "Battery details"}
      description=""
      action={detailAction}
    >
      <button
        type="button"
        onClick={() =>
          navigate("/technician/fleet/batteries")
        }
        className="mb-5 inline-flex items-center gap-2 text-[13px] font-medium text-[var(--tech-muted)] transition-colors hover:text-orange-500"
      >
        <ArrowLeft size={15} />
        Back to Battery management
      </button>

      {batteriesQuery.isPending && !battery && (
        <Card className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
          <CardContent className="p-0"><TechnicianLoadingState label="Loading battery details..." /></CardContent>
        </Card>
      )}

      {batteriesQuery.error instanceof Error && (
        <div className="mb-5 rounded-md border border-red-500/25 px-4 py-3 text-[13px] text-red-500">
          Unable to load battery information. Please refresh.
        </div>
      )}

      {!batteriesQuery.isPending && !batteriesQuery.isError && !battery && (
        <Card className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
          <CardContent className="px-6 py-14 text-center">
            <p className="text-[14px] font-medium text-[var(--tech-text-secondary)]">
              Battery not found.
            </p>
            <p className="mx-auto mt-2 max-w-[620px] text-[12px] leading-5 text-[var(--tech-muted)]">
              Make sure this battery belongs to the Technician&apos;s managed hub and is returned by GET /technician/fleet/batteries.
            </p>
          </CardContent>
        </Card>
      )}

      {battery && (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <StatusBadge
              status={battery.status}
            />

            <span className="text-[13px] text-[var(--tech-muted)]">
              {battery.model ?? "Model not provided"}
            </span>
          </div>

          <div className="mb-5 grid gap-4 md:grid-cols-2">
            <OverviewCard
              icon={
                battery.status !== "Charging" ? (
                  <BatteryFull size={18} />
                ) : (
                  <BatteryCharging size={18} />
                )
              }
              label="Charge level"
              value={`${battery.chargeLevelPct}%`}
              helper={
                battery.status === "In Use"
                  ? "Battery currently in use"
                  : battery.status === "Ready"
                    ? (battery.droneId ? `Fully charged · installed on ${battery.droneId}` : "Fully charged")
                    : "Currently charging"
              }
            >
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--tech-surface-2)]">
                <div
                  className="h-full rounded-full bg-orange-500 transition-all"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(
                        100,
                        battery.chargeLevelPct,
                      ),
                    )}%`,
                  }}
                />
              </div>
            </OverviewCard>

            <OverviewCard
              icon={<Box size={18} />}
              label="Energy capacity"
              value={
                battery.capacityWh
                  ? `${battery.capacityWh} Wh`
                  : "—"
              }
              helper=""
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <InfoCard
              title="Battery information"
              description=""
              icon={<Cpu size={17} />}
            >
              <InfoRow
                label="Battery ID"
                value={battery.id}
              />
              <InfoRow
                label="Serial number"
                value={battery.serialNumber ?? "—"}
              />
              <InfoRow
                label="Model"
                value={battery.model ?? "—"}
              />
              <InfoRow
                label="Capacity"
                value={
                  battery.capacityWh
                    ? `${battery.capacityWh} Wh`
                    : "—"
                }
              />
              <InfoRow
                label="Charge level"
                value={`${battery.chargeLevelPct}%`}
              />
              <InfoRow
                label="Charging status"
                value={battery.status}
              />
              <InfoRow
                label="Current status"
                value={battery.backendStatus ?? "—"}
                last
              />
            </InfoCard>

            <InfoCard
              title="Current assignment"
              description=""
              icon={<MapPin size={17} />}
            >
              <InfoRow
                label="Current hub"
                value={battery.hubId ? battery.hub : "—"}
              />
              <InfoRow
                label="Hub ID"
                value={battery.hubId ?? "—"}
              />
              <InfoRow
                label="Installed drone"
                value={formatDroneId(
                  battery.droneId,
                )}
                icon={
                  battery.droneId ? (
                    <Plane size={14} />
                  ) : undefined
                }
                last
              />
            </InfoCard>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <InfoCard
              title="Battery lifecycle"
              description=""
              icon={<Cpu size={17} />}
            >
              <InfoRow label="Lifecycle status" value={battery.lifecycleStatus ?? "—"} />
              <InfoRow
                label="Days until expiry"
                value={battery.daysUntilExpiry !== undefined ? `${battery.daysUntilExpiry} days` : "—"}
              />
              <InfoRow label="Last charged at" value={battery.lastChargedAt ?? "—"} last />
            </InfoCard>
            <InfoCard
              title="Charging information"
              description=""
              icon={<Clock3 size={17} />}
            >
              <InfoRow
                label="Estimated minutes remaining"
                value={battery.status === "Charging" && battery.estimatedMinutesRemaining !== undefined && battery.estimatedMinutesRemaining > 0
                  ? `${battery.estimatedMinutesRemaining} min`
                  : battery.status === "Charging" ? "ETA unavailable" : "—"}
              />
              <InfoRow
                label="Time left"
                value={formatBatteryEta(battery, now)}
                last
              />
            </InfoCard>
          </div>

          <Card className="mt-5 rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
            <CardContent className="p-0">
              <div className="border-b border-[var(--tech-border)] px-6 py-5">
                <h2 className="text-[15px] font-semibold text-[var(--tech-text)]">
                  System information
                </h2>
                
              </div>

              <div className="grid md:grid-cols-2">
                <div className="border-b border-[var(--tech-border)] px-6 py-5 md:border-b-0 md:border-r">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-muted)]">
                    Created at
                  </p>
                  <p className="mt-2 text-[14px] font-medium text-[var(--tech-text-secondary)]">
                    {battery.createdAt ?? "—"}
                  </p>
                </div>

                <div className="px-6 py-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-muted)]">
                    Last updated
                  </p>
                  <p className="mt-2 text-[14px] font-medium text-[var(--tech-text-secondary)]">
                    {battery.updatedAt || "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </>
      )}
    </TechnicianPageShell>
  );
}

function StatusBadge({
  status,
}: {
  status: BatteryStatus;
}) {
  return (
    <span
      className={
        status === "Ready"
          ? "inline-flex h-7 items-center rounded-full border border-orange-500/25 bg-orange-500/10 px-3 text-[12px] font-semibold text-orange-500"
          : status === "In Use"
            ? "inline-flex h-7 items-center rounded-full border border-sky-500/25 bg-sky-500/10 px-3 text-[12px] font-semibold text-sky-600 dark:text-sky-400"
            : "inline-flex h-7 items-center rounded-full border border-[var(--tech-border)] bg-[var(--tech-surface-2)] px-3 text-[12px] font-medium text-[var(--tech-text-secondary)]"
      }
    >
      {status}
    </span>
  );
}

function OverviewCard({
  icon,
  label,
  value,
  helper,
  children,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
  children?: ReactNode;
}) {
  return (
    <Card className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] font-medium text-[var(--tech-muted)]">
            {label}
          </p>
          <span className="text-orange-500">
            {icon}
          </span>
        </div>

        <p className="mt-4 text-[28px] font-semibold tracking-[-0.02em] text-[var(--tech-text)]">
          {value}
        </p>
        <p className="mt-1 text-[12px] text-[var(--tech-muted)]">
          {helper}
        </p>

        {children}
      </CardContent>
    </Card>
  );
}

function InfoCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
      <CardContent className="p-0">
        <div className="flex items-start gap-3 border-b border-[var(--tech-border)] px-6 py-5">
          <span className="mt-0.5 text-orange-500">
            {icon}
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--tech-text)]">
              {title}
            </h2>
            <p className="mt-1 text-[12px] text-[var(--tech-muted)]">
              {description}
            </p>
          </div>
        </div>

        <div className="px-6">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({
  label,
  value,
  icon,
  last = false,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex min-h-14 items-center justify-between gap-5 py-4 ${
        last
          ? ""
          : "border-b border-[var(--tech-border)]"
      }`}
    >
      <span className="text-[12px] text-[var(--tech-muted)]">
        {label}
      </span>

      <span className="inline-flex items-center gap-2 text-right text-[13px] font-medium text-[var(--tech-text-secondary)]">
        {icon}
        {value}
      </span>
    </div>
  );
}
