import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ImageOff, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '../../../components/ui/Dialog';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { getMissionLegEvidence, missionEvidenceOrderIds, type LegEvidence, type LegEvidenceStage } from '../api/missionLegEvidenceApi';
import type { Mission } from '../types/operator';
import { formatMissionTime } from '../utils/missionTiming';
import './package-receipt.css';
import './mission-leg-evidence.css';

const labels: Record<LegEvidenceStage, string> = {
  'check-in': 'Drone check-in', loaded: 'Package loaded', 'check-out': 'Drone check-out',
  received: 'Drone received', unloaded: 'Package unloaded',
};
interface Props { mission: Mission; legIndex: number; fromName: string; toName: string; }
function EvidenceImage({item}: {item: LegEvidence}) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className="operator-receipt-image-fallback"><ImageOff size={20} /><span>Image unavailable</span></span>
    : <img src={item.url} alt={labels[item.stage]} onError={() => setFailed(true)} />;
}
export function MissionLegEvidence({mission, legIndex, fromName, toName}: Props) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState<LegEvidence | null>(null);
  const leg = mission.legs?.[legIndex];
  const query = useQuery({
    queryKey: ['operator', 'mission-leg-evidence', mission.id, leg?.id, legIndex, missionEvidenceOrderIds(mission), mission.totalOrdersCount, mission.destinationHubId, mission.legs?.map(l => [l.id, l.fromHubId, l.toHubId])],
    queryFn: ({signal}) => getMissionLegEvidence(mission, legIndex, signal),
    enabled: open && leg?.status === 'Completed',
    staleTime: 0, retry: false, refetchOnWindowFocus: false,
    refetchInterval: open && mission.status === 'Flying' ? 10_000 : false,
  });
  if (leg?.status !== 'Completed') return null;
  const items = query.data?.items ?? [];
  const final = legIndex === (mission.legs?.length ?? 0) - 1 && leg.toHubId === mission.destinationHubId;
  const expected: LegEvidenceStage[] = final ? ['received'] : ['check-in', 'check-out'];
  const groups: LegEvidenceStage[] = final ? ['received', 'unloaded'] : ['check-in', 'unloaded', 'loaded', 'check-out'];
  return (
    <Dialog open={open} onOpenChange={next => {setOpen(next); setZoomed(null);}}>
      <DialogTrigger asChild><button type="button" className="operator-receipt-view" title="View" aria-label={`View leg ${legIndex + 1} history`}>View</button></DialogTrigger>
      <DialogContent className={`operator-receipt-dialog operator-leg-evidence-dialog${zoomed ? ' operator-receipt-dialog--zoomed' : ''}`}
        aria-describedby={undefined} onEscapeKeyDown={event => {if (zoomed) {event.preventDefault(); setZoomed(null);}}}>
        <div className="operator-receipt-dialog-header">
          <DialogTitle className="operator-receipt-title">Leg {legIndex + 1} history</DialogTitle>
          <button type="button" className="operator-receipt-icon-button" aria-label={zoomed ? 'Exit enlarged photo' : 'Close leg history'} onClick={() => zoomed ? setZoomed(null) : setOpen(false)}><X size={20}/></button>
        </div>
        <div className="operator-receipt-dialog-body">
          {zoomed ? <><button type="button" className="operator-receipt-photo" onClick={() => setZoomed(null)} aria-label="Reduce photo size"><EvidenceImage key={zoomed.url} item={zoomed}/><span className="operator-receipt-photo-icon"><ZoomOut size={18}/></span></button><div className="operator-receipt-photo-nav">{labels[zoomed.stage]}{zoomed.orderId ? ` · ${zoomed.orderId}` : ''}</div></> : <>
            <div className="operator-receipt-order"><div className="operator-leg-evidence-summary"><small>{mission.id}</small><strong>{fromName} → {toName}</strong></div><StatusBadge tone="success">Completed</StatusBadge></div>
            {(query.isError || query.data?.partial) && <div className="operator-leg-evidence-notice" role="status"><span>{query.isError ? 'Unable to load leg photos.' : 'Some order evidence could not be loaded.'}</span><button type="button" className="operator-receipt-view" disabled={query.isFetching} onClick={() => void query.refetch()}>Retry</button></div>}
            {!query.data && !query.isError && <div className="operator-receipt-empty" role="status">Loading leg photos…</div>}
            {query.data && groups.map(stage => {
              const photos = items.filter(item => item.stage === stage);
              if (!photos.length && !expected.includes(stage)) return null;
              return <section key={stage} className="operator-leg-evidence-record">
                <h3>{labels[stage]}</h3>
                {!photos.length ? <div className="operator-receipt-empty operator-leg-evidence-missing"><ImageOff size={18}/><span>No photo available yet.</span></div> : photos.map((item, i) => <div key={`${item.orderId}-${item.url}-${i}`} className="operator-leg-evidence-item">
                  {item.orderId && <div className="operator-leg-evidence-order-id">{item.orderId}</div>}
                  <button type="button" className="operator-receipt-photo" aria-label={`Enlarge ${labels[stage]} photo ${i + 1}`} onClick={() => setZoomed(item)}><EvidenceImage key={item.url} item={item}/><span className="operator-receipt-photo-icon"><ZoomIn size={17}/></span></button>
                  <dl className="operator-receipt-meta"><div><dt>Hub</dt><dd>{toName}</dd></div><div><dt>Recorded at</dt><dd>{item.recordedAt ? formatMissionTime(item.recordedAt) : '—'}</dd></div><div><dt>Recorded by</dt><dd>{item.recordedBy || '—'}</dd></div><div><dt>Stage</dt><dd>{labels[stage]}</dd></div></dl>
                </div>)}
              </section>;
            })}
          </>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
