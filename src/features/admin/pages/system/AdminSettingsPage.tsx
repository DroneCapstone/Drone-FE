import { useState } from "react";
import { ActionButton } from "../../../../components/ui/ActionButton";
import { Switch } from "../../../../components/ui/Switch";
import { OperatorPanel } from "../../../operator/components/OperatorPanel";
import { AdminPageShell } from "../../components/AdminPageShell";
import { getAdminSettings, saveAdminSettings } from "../../services/adminStore";

export function AdminSettingsPage() {
  const [settings, setSettings] = useState(getAdminSettings());
  const [saved, setSaved] = useState(false);

  const save = () => {
    saveAdminSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <AdminPageShell title="System Settings" description="Configure cross-system operational thresholds and notification policies. Backend remains the final enforcement point." actions={<ActionButton onClick={save}>Save settings</ActionButton>}>
      <div className="settings-grid">
        <OperatorPanel title="Mission & fleet" eyebrow="OPERATIONAL THRESHOLDS">
          <div className="fields two">
            <label><span>Mission timeout (minutes)</span><input type="number" min={30} max={720} value={settings.missionTimeoutMinutes} onChange={(e) => setSettings({ ...settings, missionTimeoutMinutes: Number(e.target.value) })} /></label>
            <label><span>Planning lead time (minutes)</span><input type="number" min={0} value={settings.planningLeadTimeMinutes} onChange={(e) => setSettings({ ...settings, planningLeadTimeMinutes: Number(e.target.value) })} /></label>
            <label><span>Minimum mission battery (%)</span><input type="number" min={1} max={100} value={settings.minimumMissionBatteryPct} onChange={(e) => setSettings({ ...settings, minimumMissionBatteryPct: Number(e.target.value) })} /></label>
            <label><span>Low battery warning (%)</span><input type="number" min={1} max={100} value={settings.lowBatteryWarningPct} onChange={(e) => setSettings({ ...settings, lowBatteryWarningPct: Number(e.target.value) })} /></label>
            <label><span>Telemetry timeout (seconds)</span><input type="number" min={1} value={settings.telemetryTimeoutSeconds} onChange={(e) => setSettings({ ...settings, telemetryTimeoutSeconds: Number(e.target.value) })} /></label>
          </div>
          {settings.lowBatteryWarningPct >= settings.minimumMissionBatteryPct ? <p className="mt-4 text-sm text-[var(--red)]">Low battery warning must be lower than minimum mission battery.</p> : null}
        </OperatorPanel>

        <OperatorPanel title="Battery health" eyebrow="LIFECYCLE POLICY">
          <div className="fields two">
            <label><span>Minimum SOH (%)</span><input type="number" min={1} max={100} value={settings.minimumBatterySohPct} onChange={(e) => setSettings({ ...settings, minimumBatterySohPct: Number(e.target.value) })} /></label>
            <label><span>Maximum cell delta (V)</span><input type="number" min={0.01} step="0.01" value={settings.maximumCellVoltageDelta} onChange={(e) => setSettings({ ...settings, maximumCellVoltageDelta: Number(e.target.value) })} /></label>
            <label><span>Energy safety reserve (%)</span><input type="number" min={0} max={50} value={settings.batterySafetyReservePct} onChange={(e) => setSettings({ ...settings, batterySafetyReservePct: Number(e.target.value) })} /></label>
          </div>
          <p className="mt-4 text-sm text-[var(--muted)]">SOH below the configured minimum creates a retirement recommendation; it does not automatically retire the battery.</p>
        </OperatorPanel>
      </div>

      <OperatorPanel title="Notification settings" eyebrow="CHANNEL & EVENT POLICY" className="mt-3" >
        <div id="notifications" className="toggle-list">
          {[
            ["Payment notifications", "Payment success, failure and reconciliation events", "paymentNotifications"],
            ["Order status notifications", "Customer order lifecycle changes", "orderStatusNotifications"],
            ["Mission incident notifications", "Important mission incident events", "missionIncidentNotifications"],
            ["Maintenance notifications", "Drone and battery maintenance changes", "maintenanceNotifications"],
            ["Battery health notifications", "SOH, cycle and cell-health warnings", "batteryHealthNotifications"],
            ["Retirement recommendations", "Notify Admin when a battery requires lifecycle review", "retirementRecommendationNotifications"],
            ["System notifications", "Critical administrative platform notices", "systemNotifications"],
            ["Email channel", "Send supported Admin notifications by email", "emailNotifications"],
          ].map(([label, detail, key]) => (
            <div className="toggle-row" key={key}>
              <span><strong>{label}</strong><small>{detail}</small></span>
              <Switch checked={Boolean(settings[key as keyof typeof settings])} onCheckedChange={(checked) => setSettings({ ...settings, [key]: checked })} aria-label={label} />
            </div>
          ))}
        </div>
        {saved ? <div className="operator-toast">Settings saved successfully.</div> : null}
      </OperatorPanel>
    </AdminPageShell>
  );
}
