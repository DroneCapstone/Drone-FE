import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { AdminPageShell } from '../../components/AdminPageShell';
import { adminOperationsApi, apiError, type BatteryApi, type HubApi } from '../../api/adminOperationsApi';
import './BatteryDetailPage.css';

/** Read-only Backend battery view. Technician owns physical installation and verification. */
export function BatteryDetailPage() {
  const { batteryId } = useParams();
  const [battery, setBattery] = useState<BatteryApi | null>(null);
  const [hubs, setHubs] = useState<HubApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!batteryId) return;
    let live = true;
    setBattery(null); setLoading(true);
    void Promise.all([adminOperationsApi.battery(batteryId), adminOperationsApi.hubs()])
      .then(([data, hs]) => { if (live) { setBattery(data); setHubs(hs); setError(''); } })
      .catch((cause: unknown) => { if (live) setError(apiError(cause)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [batteryId]);
  const hub = hubs.find((item) => item.id === battery?.current_hub_id);
  const operational = battery?.available_status ?? (battery?.drone_id != null ? 'Installed' : battery?.status) ?? '—';
  const lifecycle = battery?.lifecycle_status ?? battery?.status ?? '—';
  return <AdminPageShell title={battery?.id ?? batteryId ?? 'Battery'} description={`${battery?.battery_model ?? 'Battery'} · ${hub?.name ?? 'Unassigned'}`} hideSectionTabs>
    <div className="admin-battery-detail">
      <div className="abd-back"><Link to="/admin/network/batteries"><ArrowLeft size={16}/>Back to Batteries</Link></div>
      {loading && <p className="text-sm text-muted-foreground">Loading Battery Detail from Backend…</p>}
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      {battery && <div className="abd-grid">
        <section className="abd-card"><h2>Battery information</h2><dl className="abd-data">
          <div><dt>Battery ID</dt><dd>{battery.id}</dd></div>
          <div><dt>Battery model</dt><dd>{battery.battery_model ?? 'Not provided by Backend'}</dd></div>
          <div><dt>Serial number</dt><dd>{battery.serial_number}</dd></div>
          <div><dt>Energy capacity</dt><dd>{battery.capacity_wh} Wh</dd></div>
          <div><dt>Assigned Hub</dt><dd>{hub ? <Link className="abd-link" to={`/admin/network/hubs/${hub.id}`}>{hub.name}<ExternalLink size={12}/></Link> : 'Not assigned'}</dd></div>
        </dl></section>
        <section className="abd-card"><h2>Status &amp; assignment</h2><dl className="abd-data">
          <div><dt>Operational status</dt><dd><StatusBadge tone={operational.toUpperCase() === 'READY' ? 'success' : 'warning'}>{operational}</StatusBadge></dd></div>
          <div><dt>Lifecycle</dt><dd><StatusBadge tone={lifecycle.toUpperCase() === 'ACTIVE' ? 'success' : 'neutral'}>{lifecycle}</StatusBadge></dd></div>
          <div><dt>Installed on Drone</dt><dd>{battery.drone_id != null ? <Link className="abd-link" to={`/admin/network/drones/${encodeURIComponent(String(battery.drone_id))}`}>{String(battery.drone_id)}<ExternalLink size={12}/></Link> : 'Not installed'}</dd></div>
          <div><dt>Charge level</dt><dd>{battery.charge_level_pct == null ? '—' : `${battery.charge_level_pct}%`}</dd></div>
          <div><dt>Last charged</dt><dd>{battery.last_charged_at ? new Date(battery.last_charged_at).toLocaleString('en-GB') : '—'}</dd></div>
        </dl></section>
      </div>}
      {battery && <p className="mt-4 text-xs text-muted-foreground">Battery retirement and Technician verification are read-only here. The current Backend DELETE endpoint is not used as an administrative retire action.</p>}
    </div>
  </AdminPageShell>;
}
