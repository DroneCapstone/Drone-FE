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
    <AdminPageShell title="System Settings" description="Manage local operational preferences and notification settings. These preferences are saved in this browser only." actions={<ActionButton onClick={save}>Save settings</ActionButton>}>
      <div className="mb-3">
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


      </div>

      <OperatorPanel title="Notification settings" eyebrow="CHANNEL & EVENT POLICY" >
        <div id="notifications" className="toggle-list">
          {[
            ["Payment notifications", "paymentNotifications"],
            ["Order status notifications", "orderStatusNotifications"],
            ["Mission incident notifications", "missionIncidentNotifications"],
            ["Maintenance notifications", "maintenanceNotifications"],
            ["System notifications", "systemNotifications"],
            ["Email channel", "emailNotifications"],
          ].map(([label, key]) => (
            <div className="toggle-row" key={key}>
              <span><strong>{label}</strong></span>
              <Switch checked={Boolean(settings[key as keyof typeof settings])} onCheckedChange={(checked) => setSettings({ ...settings, [key]: checked })} aria-label={label} />
            </div>
          ))}
        </div>
        {saved ? <div className="operator-toast">Preferences saved on this device.</div> : null}
      </OperatorPanel>
    </AdminPageShell>
  );
}
