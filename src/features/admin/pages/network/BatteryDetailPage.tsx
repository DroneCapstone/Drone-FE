import { useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { ActionButton } from "../../../../components/ui/ActionButton";
import { Dialog, DialogContent, DialogTitle } from "../../../../components/ui/Dialog";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { MetricCard } from "../../../operator/components/MetricCard";
import { OperatorPanel } from "../../../operator/components/OperatorPanel";
import { AdminPageShell } from "../../components/AdminPageShell";
import { getAdminBatteries, getAdminHubs, getAdminSettings, upsertAdminBattery } from "../../services/adminStore";
import { batteryHealthTone, batteryOperationalTone } from "../../utils/adminDisplay";

export function BatteryDetailPage() {
  const { batteryId } = useParams();
  const initial = useMemo(() => getAdminBatteries().find((item) => item.id === batteryId), [batteryId]);
  const [battery, setBattery] = useState(initial);
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (!battery) return <Navigate to="/admin/network/batteries" replace />;
  const settings = getAdminSettings();
  const hub = getAdminHubs().find((item) => item.id === battery.hubId);
  const safeEnergyAtCurrentSoc = battery.designEnergyWh * (battery.sohPct / 100) * (battery.chargeLevelPct / 100) * (1 - settings.batterySafetyReservePct / 100);
  const canRetire = battery.administrativeStatus === "ACTIVE" && battery.retirementRecommended && battery.operationalStatus !== "INSTALLED" && !battery.droneId;

  const retire = () => {
    const next = { ...battery, administrativeStatus: "RETIRED" as const, operationalStatus: "MAINTENANCE" as const, retiredBy: "admin", retiredAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setBattery(next);
    upsertAdminBattery(next);
    setConfirmOpen(false);
  };

  return (
    <AdminPageShell title={battery.id} description={`${battery.model} · ${hub?.name ?? "Unknown hub"}`} actions={battery.administrativeStatus === "ACTIVE" ? <ActionButton variant="danger" disabled={!canRetire} onClick={() => setConfirmOpen(true)}>Retire battery</ActionButton> : undefined}>
      <div className="metric-grid">
        <MetricCard label="Charge" value={`${battery.chargeLevelPct}%`} delta="SOC" tone="info" note="Current charge level" />
        <MetricCard label="State of health" value={`${battery.sohPct}%`} delta={battery.sohPct < settings.minimumBatterySohPct ? "Below policy" : "Within policy"} tone={batteryHealthTone(battery.sohPct)} note={`Minimum ${settings.minimumBatterySohPct}%`} />
        <MetricCard label="Cycle count" value={`${battery.cycleCount}`} delta={`/ ${battery.maxCycles}`} tone={battery.cycleCount >= battery.maxCycles ? "warning" : "success"} note="BMS / equivalent cycles" />
        <MetricCard label="Safe energy" value={`${safeEnergyAtCurrentSoc.toFixed(1)} Wh`} delta={`${settings.batterySafetyReservePct}% reserve`} tone="info" note="SOH × SOC × reserve" />
      </div>

      <div className="detail-grid">
        <OperatorPanel title="Health assessment" eyebrow="BATTERY LIFECYCLE">
          <div className="detail-list">
            <span><small>Operational status</small><StatusBadge tone={batteryOperationalTone(battery.operationalStatus)}>{battery.operationalStatus}</StatusBadge></span>
            <span><small>Administrative status</small><StatusBadge tone={battery.administrativeStatus === "ACTIVE" ? "success" : "neutral"}>{battery.administrativeStatus}</StatusBadge></span>
            <span><small>Physical condition</small><StatusBadge tone={battery.physicalCondition === "NORMAL" ? "success" : "danger"}>{battery.physicalCondition}</StatusBadge></span>
            <span><small>Retirement recommendation</small><StatusBadge tone={battery.retirementRecommended ? "warning" : "success"}>{battery.retirementRecommended ? "RECOMMENDED" : "NOT REQUIRED"}</StatusBadge></span>
            <span><small>Reason</small><strong>{battery.retirementReason ?? "—"}</strong></span>
          </div>
        </OperatorPanel>

        <OperatorPanel title="Capacity & cells" eyebrow="BMS / SYSTEM DATA">
          <div className="detail-list">
            <span><small>Design capacity</small><strong>{battery.designCapacityMah.toLocaleString()} mAh</strong></span>
            <span><small>Full-charge capacity</small><strong>{battery.fullChargeCapacityMah.toLocaleString()} mAh</strong></span>
            <span><small>Maximum cell delta</small><strong>{battery.maxCellVoltageDelta != null ? `${battery.maxCellVoltageDelta.toFixed(3)} V` : "—"}</strong></span>
            <span><small>Policy threshold</small><strong>{settings.maximumCellVoltageDelta.toFixed(2)} V</strong></span>
          </div>
          {battery.cellVoltages?.length ? <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{battery.cellVoltages.map((value, index) => <div className="rounded-lg bg-[var(--surface-2)] p-3" key={index}><small className="text-[var(--faint)]">Cell {index + 1}</small><strong className="mt-1 block">{value.toFixed(3)} V</strong></div>)}</div> : null}
        </OperatorPanel>
      </div>

      <OperatorPanel title="Retirement policy" eyebrow="WHY THIS BATTERY IS FLAGGED">
        <div className="detail-list">
          <span><small>SOH rule</small><strong>{battery.sohPct}% {battery.sohPct < settings.minimumBatterySohPct ? `< ${settings.minimumBatterySohPct}% → review` : "→ pass"}</strong></span>
          <span><small>Cycle rule</small><strong>{battery.cycleCount} / {battery.maxCycles} {battery.cycleCount >= battery.maxCycles ? "→ review" : "→ pass"}</strong></span>
          <span><small>Cell delta rule</small><strong>{battery.maxCellVoltageDelta?.toFixed(3) ?? "—"} V {battery.maxCellVoltageDelta != null && battery.maxCellVoltageDelta >= settings.maximumCellVoltageDelta ? "→ inspection" : "→ pass"}</strong></span>
          <span><small>Installed state</small><strong>{battery.droneId ? `Installed on ${battery.droneId}` : "Not installed"}</strong></span>
        </div>
        {!canRetire && battery.administrativeStatus === "ACTIVE" ? <p className="mt-4 text-sm text-[var(--muted)]">Retirement is enabled only when the battery is recommended for retirement and is not installed on a drone.</p> : null}
      </OperatorPanel>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <div className="p-5">
            <DialogTitle className="text-lg font-semibold">Retire {battery.id}?</DialogTitle>
            <p className="mt-2 text-sm text-muted-foreground">This permanently removes the battery from operational use. Reason: {battery.retirementReason ?? "health recommendation"}.</p>
            <div className="form-actions mt-5"><ActionButton variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</ActionButton><ActionButton variant="danger" onClick={retire}>Retire battery</ActionButton></div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
