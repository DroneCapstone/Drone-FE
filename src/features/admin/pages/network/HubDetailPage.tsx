import { OperatorTable, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../operator/components/OperatorTable";
import { OperatorLoadingState } from '../../../operator/components/OperatorLoadingState';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Boxes, MapPin } from 'lucide-react';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { AdminPageShell } from '../../components/AdminPageShell';
import { adminOperationsApi, apiError, type HubDetailApi, type StockApi } from '../../api/adminOperationsApi';
import './HubDetailPage.css';
import { AdminHubTechnicians } from '../../components/AdminHubTechnicians';

export function HubDetailPage() {
  const { hubId } = useParams();
  const [hub, setHub] = useState<HubDetailApi | null>(null);
  const [spareStock, setSpareStock] = useState<StockApi[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [assetTab, setAssetTab] = useState<'drones' | 'batteries'>('drones');
  useEffect(() => {
    if (!hubId) return;
    let live = true; setLoading(true); setHub(null); setSpareStock([]); setError('');
    void Promise.allSettled([adminOperationsApi.hub(hubId), adminOperationsApi.stocks()])
      .then(([detail, stock]) => {
        if (!live) return;
        if (detail.status === 'rejected') { setError(apiError(detail.reason)); return; }
        setHub(detail.value);
        if (stock.status === 'fulfilled') setSpareStock(stock.value.filter(r => String(r.hub_id) === hubId));
        else setError(`Hub loaded, but spare parts could not load: ${apiError(stock.reason)}`);
      }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [hubId]);
  const drones = hub?.assigned_drones ?? [];
  const batteries = hub?.assigned_batteries ?? [];
  const date = hub?.updated_at ? new Date(hub.updated_at) : null;
  const dateLabel = date && !Number.isNaN(date.getTime()) ? date.toLocaleString('en-GB') : '—';

  return <AdminPageShell title={hub?.name ?? `Hub ${hubId ?? ''}`} description="" actions={hub ? <StatusBadge tone={hub.status?.toUpperCase() === 'ACTIVE' ? 'success' : 'neutral'}>{hub.status ?? '—'}</StatusBadge> : undefined}>
    <Link className="mb-4 inline-flex items-center gap-2 text-sm text-orange-600" to="/admin/network/hubs"><ArrowLeft size={15} />Back to Hubs</Link>
    {loading && <OperatorLoadingState label="Loading hub details…" compact />}
    {error && <p role="alert" className="mb-4 text-sm text-red-500">{error}</p>}
    {!loading && hub && <div className="admin-hub-detail">
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
      </section>
      <AdminHubTechnicians key={hub.id} hub={hub} />
      <section className="admin-hub-section" aria-labelledby="hub-assets">
        <div className="admin-hub-assets-header"><h2 id="hub-assets" className="admin-hub-section-title"><Boxes size={17} aria-hidden="true" />Assigned assets</h2>
          <div className="admin-hub-switch" role="tablist" aria-label="Assigned assets">
            <button type="button" role="tab" aria-selected={assetTab === 'drones'} className={assetTab === 'drones' ? 'is-active' : ''} onClick={() => setAssetTab('drones')}>Drones ({drones.length})</button>
            <button type="button" role="tab" aria-selected={assetTab === 'batteries'} className={assetTab === 'batteries' ? 'is-active' : ''} onClick={() => setAssetTab('batteries')}>Batteries ({batteries.length})</button>
          </div>
        </div>
        <div className="admin-hub-assets-table-wrap"><OperatorTable className="admin-hub-assets-table admin-pinned-actions"><TableHeader><TableRow><TableHead>Asset ID</TableHead><TableHead>Model</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader><TableBody>
          {assetTab === 'drones' ? drones.map((d) => <TableRow key={d.id}><TableCell><strong>{d.id}</strong></TableCell><TableCell>{d.model}</TableCell><TableCell>{d.status}</TableCell><TableCell><Link className="text-button" to={`/admin/network/drones/${encodeURIComponent(d.id)}`}>View</Link></TableCell></TableRow>) : batteries.map((b) => <TableRow key={b.id}><TableCell><strong>{b.id}</strong></TableCell><TableCell>{b.battery_model || '—'}</TableCell><TableCell>{b.status ?? '—'}</TableCell><TableCell><Link className="text-button" to={`/admin/network/batteries/${encodeURIComponent(b.id)}`}>View</Link></TableCell></TableRow>)}
          {(assetTab === 'drones' ? drones.length === 0 : batteries.length === 0) && <TableRow><TableCell colSpan={4}>No assets assigned.</TableCell></TableRow>}
        </TableBody></OperatorTable></div>
      </section>
      <section className="admin-hub-section" aria-labelledby="hub-spareparts">
        <h2 id="hub-spareparts" className="admin-hub-section-title"><Boxes size={17} aria-hidden="true" />Spare parts at this Hub</h2>
        <div className="admin-hub-assets-table-wrap"><OperatorTable className="admin-hub-assets-table"><TableHeader><TableRow><TableHead>Part</TableHead><TableHead>Quantity</TableHead><TableHead>Minimum threshold</TableHead><TableHead>Stock alert</TableHead></TableRow></TableHeader><TableBody>
          {spareStock.map((part) => <TableRow key={`${part.hub_id}:${part.part_category_id}`}><TableCell><strong>{part.part_name}</strong></TableCell><TableCell>{part.quantity}</TableCell><TableCell>{part.min_stock_threshold}</TableCell><TableCell>{part.is_low_stock ? 'Low stock' : 'Normal'}</TableCell></TableRow>)}
          {!error && spareStock.length === 0 && <TableRow><TableCell colSpan={4}>No spare parts registered for this Hub.</TableCell></TableRow>}
        </TableBody></OperatorTable></div>
      </section>
    </div>}
  </AdminPageShell>;
}
