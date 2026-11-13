import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Boxes, MapPin, UsersRound } from 'lucide-react';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { AdminPageShell } from '../../components/AdminPageShell';
import { adminOperationsApi, apiError, type HubDetailApi, type StockApi } from '../../api/adminOperationsApi';
import './HubDetailPage.css';

export function HubDetailPage() {
  const { hubId } = useParams();
  const [hub, setHub] = useState<HubDetailApi | null>(null);
  const [spareStock, setSpareStock] = useState<StockApi[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [assetTab, setAssetTab] = useState<'drones' | 'batteries'>('drones');
  useEffect(() => {
    if (!hubId) return;
    let live = true; setLoading(true); setHub(null);
    void adminOperationsApi.hub(hubId).then(async (data) => {
      if (!live) return;
      setHub(data); setError('');
      try {
        const rows = await adminOperationsApi.stocks();
        if (live) setSpareStock(rows.filter((r) => String(r.hub_id) === hubId));
      } catch (cause) { if (live) setError(`Hub loaded, but spare parts could not load: ${apiError(cause)}`); }
    }).catch((cause: unknown) => { if (live) setError(apiError(cause)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [hubId]);
  const drones = hub?.assigned_drones ?? [];
  const batteries = hub?.assigned_batteries ?? [];
  const technicians = hub?.assigned_technicians?.length ? hub.assigned_technicians : hub?.assigned_technician ? [hub.assigned_technician] : [];
  const date = hub?.updated_at ? new Date(hub.updated_at) : null;
  const dateLabel = date && !Number.isNaN(date.getTime()) ? date.toLocaleString('en-GB') : '—';

  return <AdminPageShell title={hub?.name ?? `Hub ${hubId ?? ''}`} description="" actions={hub ? <StatusBadge tone={hub.status?.toUpperCase() === 'ACTIVE' ? 'success' : 'neutral'}>{hub.status ?? '—'}</StatusBadge> : undefined}>
    <Link className="mb-4 inline-flex items-center gap-2 text-sm text-orange-600" to="/admin/network/hubs"><ArrowLeft size={15} />Back to Hubs</Link>
    {loading && <p className="mb-4 text-sm text-muted-foreground">Loading Hub Detail…</p>}
    {error && <p role="alert" className="mb-4 text-sm text-red-500">{error}</p>}
    {hub && <div className="admin-hub-detail">
      <section className="admin-hub-section" aria-labelledby="hub-information">
        <h2 id="hub-information" className="admin-hub-section-title"><MapPin size={17} aria-hidden="true" />Hub information</h2>
        <div className="admin-hub-info-grid">
          <div className="admin-hub-info-column">
            <div className="admin-hub-info-row"><span className="admin-hub-info-label">Address</span><strong>{hub.address || '—'}</strong></div>
            <div className="admin-hub-info-row"><span className="admin-hub-info-label">Capacity</span><strong>{hub.capacity} drone slots</strong></div>
          </div>
          <div className="admin-hub-info-column">
            <div className="admin-hub-info-row"><span className="admin-hub-info-label">Coordinates</span><strong>{hub.latitude == null || hub.longitude == null ? '—' : `${hub.latitude.toFixed(4)}, ${hub.longitude.toFixed(4)}`}</strong></div>
            <div className="admin-hub-info-row"><span className="admin-hub-info-label">Last updated</span><strong>{dateLabel}</strong></div>
          </div>
        </div>
        <div className="admin-hub-technician-row"><UsersRound size={17} aria-hidden="true" /><span className="admin-hub-technician-label">Assigned technicians</span>
          <div className="admin-hub-technician-person">{technicians.length ? technicians.map((t) => <span key={t.id}><strong>{t.full_name}</strong> · {t.email} </span>) : <span className="admin-hub-technician-email">Not assigned</span>}</div>
        </div>
      </section>
      <section className="admin-hub-section" aria-labelledby="hub-assets">
        <div className="admin-hub-assets-header"><h2 id="hub-assets" className="admin-hub-section-title"><Boxes size={17} aria-hidden="true" />Assigned assets</h2>
          <div className="admin-hub-switch" role="tablist" aria-label="Assigned assets">
            <button type="button" role="tab" aria-selected={assetTab === 'drones'} className={assetTab === 'drones' ? 'is-active' : ''} onClick={() => setAssetTab('drones')}>Drones ({drones.length})</button>
            <button type="button" role="tab" aria-selected={assetTab === 'batteries'} className={assetTab === 'batteries' ? 'is-active' : ''} onClick={() => setAssetTab('batteries')}>Batteries ({batteries.length})</button>
          </div>
        </div>
        <div className="admin-hub-assets-table-wrap"><table className="admin-hub-assets-table"><thead><tr><th>Asset ID</th><th>Model</th><th>Status</th><th>Action</th></tr></thead><tbody>
          {assetTab === 'drones' ? drones.map((d) => <tr key={d.id}><td><strong>{d.id}</strong></td><td>{d.model}</td><td>{d.status}</td><td><Link className="text-button" to={`/admin/network/drones/${encodeURIComponent(d.id)}`}>View</Link></td></tr>) : batteries.map((b) => <tr key={b.id}><td><strong>{b.id}</strong></td><td>{b.battery_model || '—'}</td><td>{b.status ?? '—'}</td><td><Link className="text-button" to={`/admin/network/batteries/${encodeURIComponent(b.id)}`}>View</Link></td></tr>)}
          {(assetTab === 'drones' ? drones.length === 0 : batteries.length === 0) && <tr><td colSpan={4}>No assets assigned.</td></tr>}
        </tbody></table></div>
      </section>
      <section className="admin-hub-section" aria-labelledby="hub-spareparts">
        <h2 id="hub-spareparts" className="admin-hub-section-title"><Boxes size={17} aria-hidden="true" />Spare parts at this Hub</h2>
        <div className="admin-hub-assets-table-wrap"><table className="admin-hub-assets-table"><thead><tr><th>Part</th><th>Quantity</th><th>Minimum threshold</th><th>Stock alert</th></tr></thead><tbody>
          {spareStock.map((part) => <tr key={`${part.hub_id}:${part.part_category_id}`}><td><strong>{part.part_name}</strong></td><td>{part.quantity}</td><td>{part.min_stock_threshold}</td><td>{part.is_low_stock ? 'Low stock' : 'Normal'}</td></tr>)}
          {spareStock.length === 0 && <tr><td colSpan={4}>No spare parts registered for this Hub.</td></tr>}
        </tbody></table></div>
      </section>
    </div>}
  </AdminPageShell>;
}
