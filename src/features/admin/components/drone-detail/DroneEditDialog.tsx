import { AdminSelect } from '../AdminSelect';
import { useState, type FormEvent } from 'react';
import { Dialog, DialogTitle } from '../../../../components/ui/Dialog';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { AdminDialogContent } from '../AdminDialogContent';
import type { AdminDrone, AdminHub } from '../../types';

export function DroneEditDialog({ drone, hubs, onClose, onSave }: {
  drone: AdminDrone;
  hubs: AdminHub[];
  onClose: () => void;
  onSave: (draft: AdminDrone) => string | null;
}) {
  const [draft, setDraft] = useState<AdminDrone>({ ...drone });
  const [error, setError] = useState('');
  const locked = drone.status === 'IN_FLIGHT';
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = onSave(draft);
    if (result) setError(result);
    else onClose();
  }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <AdminDialogContent className="dd-dialog">
      <form onSubmit={submit}>
        <div className="dd-dialog-head">
          <DialogTitle asChild><h2>Edit drone · {drone.id}</h2></DialogTitle>
        </div>
        <div className="dd-dialog-form">
          <label><span className="dd-field-label">Drone name <em aria-hidden="true">*</em></span><input autoFocus required maxLength={80} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
          <label>Model<input value={draft.model} readOnly aria-readonly="true" title="Model is read-only to preserve drone specifications" /></label>
          <label><span className="dd-field-label">Serial number <em aria-hidden="true">*</em></span><input required maxLength={120} value={draft.serialNumber} readOnly={locked} onChange={(e) => setDraft({ ...draft, serialNumber: e.target.value })} /></label>
          <label><span className="dd-field-label">Maximum payload (kg) <em aria-hidden="true">*</em></span><input required type="number" min="0.1" step="0.1" value={draft.maxPayloadKg} readOnly={locked} onChange={(e) => setDraft({ ...draft, maxPayloadKg: Number(e.target.value) })} /></label>
          <label><span className="dd-field-label">Assigned Hub <em aria-hidden="true">*</em></span><AdminSelect required value={draft.hubId} disabled={locked} onChange={(e) => setDraft({ ...draft, hubId: e.target.value })}>
            {hubs.map((h) => <option key={h.id} value={h.id} disabled={h.status !== 'ACTIVE' && h.id !== drone.hubId}>{h.name}{h.status !== 'ACTIVE' ? ' (Inactive)' : ''}</option>)}
          </AdminSelect></label>
        </div>
        {/* <p className="dd-dialog-hint">Mission reservations and live Technician Work Orders are not connected to this Admin prototype. Verify those conditions before changing assignment.</p> */}
        {error && <p role="alert" className="dd-dialog-error">{error}</p>}
        <div className="dd-dialog-actions"><ActionButton variant="secondary" onClick={onClose}>Cancel</ActionButton><ActionButton type="submit">Save changes</ActionButton></div>
      </form>
    </AdminDialogContent>
  </Dialog>;
}
