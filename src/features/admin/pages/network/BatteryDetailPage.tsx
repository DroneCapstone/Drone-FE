import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, ClipboardList } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Dialog, DialogTitle } from '../../../../components/ui/Dialog';
import { AdminDialogContent as DialogContent } from '../../components/AdminDialogContent';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { AdminPageShell } from '../../components/AdminPageShell';
import { getAdminBatteries, getAdminDrones, getAdminHubs, upsertAdminBattery } from '../../services/adminStore';
import { canRetireBattery } from '../../services/batteryLifecycle';
import { getReplacementRequests } from '../../services/prototypeWorkflow';
import { getAdminEffectiveStatus, getAdminSupplyRecords } from '../../services/adminReplacementSupply';
import { batteryOperationalTone } from '../../utils/adminDisplay';
import './BatteryDetailPage.css';

/** Admin sees battery identity, assignment and lifecycle only.
 * Operational verification and install/remove actions belong to Technician.
 * Browser-local prototype; no live Technician/Operator API synchronization. */
export function BatteryDetailPage() {
  const { batteryId } = useParams();
  const [, refreshVersion] = useState(0);
  const [retireOpen, setRetireOpen] = useState(false);
  const [retireReason, setRetireReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const refresh = () => refreshVersion((current) => current + 1);
    window.addEventListener('admin-data-updated', refresh);
    return () => window.removeEventListener('admin-data-updated', refresh);
  }, []);

  const battery = getAdminBatteries().find((item) => item.id === batteryId);
  if (!battery) return <Navigate to="/admin/network/batteries" replace />;

  const hub = getAdminHubs().find((item) => item.id === battery.hubId);
  const drones = getAdminDrones();
  const linkedDrone = drones.find((item) => item.installedBatteryId === battery.id || item.id === battery.droneId);
  const isStillLinked = Boolean(battery.droneId || drones.some((item) => item.installedBatteryId === battery.id));

  // Link both sides of a replacement: damaged battery (request.batteryId),
  // or new/supplied battery (record.selectedBatteryId/registeredBatteryId).
  const records = getAdminSupplyRecords();
  const related = getReplacementRequests()
    .filter((request) => request.type === 'BATTERY' && (
      request.batteryId === battery.id ||
      battery.replacementRequestId === request.id ||
      records.some((record) => record.requestId === request.id &&
        (record.selectedBatteryId === battery.id || record.registeredBatteryId === battery.id))
    ))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Local guard only. Backend must additionally validate active mission
  // reservations, work orders and Technician's actual removal confirmation.
  const activeReplacement = related.some((request) =>
    !['RECEIVED', 'REJECTED'].includes(getAdminEffectiveStatus(request))
  );
  const canRetire = canRetireBattery(battery) && !isStillLinked && !activeReplacement;
  const canShowHistory = related.length > 0 || Boolean(battery.retiredAt || battery.retirementReason || battery.inspectionNote || battery.inspectionCheckedAt || battery.inspectionPending);

  const timeLabel = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-GB');
  };
  const issueReason = (value?: string) => {
    if (!value) return '—';
    if (value === 'TECHNICIAN_REPORTED_FAILURE') return 'Reported damaged by Technician';
    if (value === 'PHYSICAL_DAMAGE') return 'Physical damage';
    if (value === 'MAX_CYCLE_REACHED' || value === 'SOH_BELOW_THRESHOLD') return 'Retired under legacy policy';
    return value;
  };

  const retire = () => {
    setError('');
    // Always recheck at submit time, not just when the popup was opened.
    const latest = getAdminBatteries().find((item) => item.id === battery.id);
    if (!latest) { setError('This battery no longer exists.'); return; }
    const linked = Boolean(latest.droneId || getAdminDrones().some((item) => item.installedBatteryId === latest.id));
    const freshRecords = getAdminSupplyRecords();
    const stillOpen = getReplacementRequests().some((request) => request.type === 'BATTERY' &&
      (request.batteryId === latest.id || latest.replacementRequestId === request.id ||
        freshRecords.some((record) => record.requestId === request.id &&
          (record.selectedBatteryId === latest.id || record.registeredBatteryId === latest.id))) &&
      !['RECEIVED', 'REJECTED'].includes(getAdminEffectiveStatus(request)));
    if (!canRetireBattery(latest) || linked || stillOpen) {
      setError('Cannot retire: battery remains installed, awaiting verification or linked to an open replacement.');
      return;
    }
    if (!retireReason.trim()) { setError('Enter a retirement reason.'); return; }
    try {
      const stamp = new Date().toISOString();
      upsertAdminBattery({
        ...latest, administrativeStatus: 'RETIRED',
        operationalStatus: 'MAINTENANCE', retiredAt: stamp, retiredBy: 'admin',
        retirementReason: retireReason.trim(), updatedAt: stamp