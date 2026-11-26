import { Dialog, DialogTitle } from '../../../../components/ui/Dialog';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { AdminDialogContent } from '../AdminDialogContent';
import type { AdminDrone } from '../../types';
import type { DroneFlightRecord, DroneWorkOrder } from './droneDetailData';
import { formatDroneDate } from './droneDetailData';
import { DetailBadge, DetailRow } from './DroneDetailUI';

export function DroneDetailDialogs({ drone, confirmActive, onConfirmClose, onConfirmActive, order, onOrderClose, flight, onFlightClose }: {
  drone: AdminDrone;
  confirmActive: boolean;
  onConfirmClose: () => void;
  onConfirmActive: () => void;
  order: DroneWorkOrder | null;
  onOrderClose: () => void;
  flight: DroneFlightRecord | null;
  onFlightClose: () => void;
}) {
  return <>
    <Dialog open={confirmActive} onOpenChange={(open) => { if (!open) onConfirmClose(); }}>
      <AdminDialogContent className="dd-dialog"><div className="dd-dialog-head">
        <DialogTitle asChild><h2>{drone.isActive ? 'Deactivate' : 'Activate'} {drone.id}?</h2></DialogTitle>
        <p>{drone.isActive ? 'This drone will be excluded from new mission planning. Historical records remain.' : 'This restores administrative availability; Technician checks are still required.'}</p>
      </div><p className="dd-dialog-hint">Check scheduled missions before changing drone availability.</p>
      <div className="dd-dialog-actions"><ActionButton variant="secondary" onClick={onConfirmClose}>Cancel</ActionButton>
        <ActionButton variant={drone.isActive ? 'danger' : 'primary'} onClick={onConfirmActive}>{drone.isActive ? 'Deactivate' : 'Activate'}</ActionButton>
      </div></AdminDialogContent>
    </Dialog>

    <Dialog open={!!order} onOpenChange={(open) => { if (!open) onOrderClose(); }}>
      {order && <AdminDialogContent className="dd-dialog"><div className="dd-dialog-head"><DialogTitle asChild><h2>{order.id}</h2></DialogTitle><p>Demo Work Order · Read-only for Admin</p></div>
        <div className="dd-dialog-details">
          <DetailRow label="Issue">{order.issue}</DetailRow>
          <DetailRow label="Status"><DetailBadge tone={order.status === 'COMPLETED' ? 'green' : 'blue'}>{order.status.replace('_', ' ')}</DetailBadge></DetailRow>
          <DetailRow label="Technician">{order.technician}</DetailRow>
          <DetailRow label="Updated">{formatDroneDate(order.updatedAt)}</DetailRow>
          <DetailRow label="Diagnosis">{order.diagnosis}</DetailRow>
          <DetailRow label="Corrective action">{order.correctiveAction}</DetailRow>
        </div><div className="dd-dialog-actions"><ActionButton variant="secondary" onClick={onOrderClose}>Close</ActionButton></div>
      </AdminDialogContent>}
    </Dialog>

    <Dialog open={!!flight} onOpenChange={(open) => { if (!open) onFlightClose(); }}>
      {flight && <AdminDialogContent className="dd-dialog"><div className="dd-dialog-head"><DialogTitle asChild><h2>{flight.id}</h2></DialogTitle><p>Demo Flight · Read-only for Admin</p></div>
        <div className="dd-dialog-details">
          <DetailRow label="Mission">{flight.missionId}</DetailRow><DetailRow label="Route">{flight.route}</DetailRow>
          <DetailRow label="Departure">{formatDroneDate(flight.departure)}</DetailRow><DetailRow label="Arrival">{formatDroneDate(flight.arrival)}</DetailRow>
          <DetailRow label="Energy">{flight.energy}</DetailRow><DetailRow label="Status">{flight.status}</DetailRow>
        </div><div className="dd-dialog-actions"><ActionButton variant="secondary" onClick={onFlightClose}>Close</ActionButton></div>
      </AdminDialogContent>}
    </Dialog>
  </>;
}
