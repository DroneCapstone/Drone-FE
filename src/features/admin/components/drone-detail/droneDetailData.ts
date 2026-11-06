import type { AdminDrone } from '../../types';

export type DetailTab = 'overview' | 'maintenance' | 'orders' | 'flights';
export type WorkOrderStatus = 'IN_PROGRESS' | 'COMPLETED';
export interface DroneWorkOrder {
  id: string;
  droneId: string;
  issue: string;
  status: WorkOrderStatus;
  technician: string;
  updatedAt: string;
  diagnosis: string;
  correctiveAction: string;
}
export interface DroneFlightRecord {
  id: string;
  droneId: string;
  missionId: string;
  route: string;
  departure: string;
  arrival: string;
  energy: string;
  status: 'COMPLETED';
}

// Explicitly isolated demo fixtures. No Technician/Operator API is called.
// IDs are not relabeled: keep the real Admin DR-001 reference for this prototype.
const demoOrders: DroneWorkOrder[] = [
  { id: 'WO-DEMO-004', droneId: 'DR-001', issue: 'Motor inspection', status: 'IN_PROGRESS', technician: 'Tran An', updatedAt: '2026-11-06T10:24:00+07:00', diagnosis: 'Unusual vibration reported during inspection.', correctiveAction: 'Inspect motor mount and verify torque settings.' },
  { id: 'WO-DEMO-003', droneId: 'DR-001', issue: 'Propeller replacement', status: 'COMPLETED', technician: 'Do Minh', updatedAt: '2026-10-29T16:12:00+07:00', diagnosis: 'Visible crack on a propeller.', correctiveAction: 'Replaced propeller and completed inspection.' },
  { id: 'WO-DEMO-002', droneId: 'DR-001', issue: 'Battery connector inspection', status: 'IN_PROGRESS', technician: 'Tran An', updatedAt: '2026-11-04T09:30:00+07:00', diagnosis: 'Intermittent connection reported.', correctiveAction: 'Inspect contacts and document findings.' },
];
const demoFlights: DroneFlightRecord[] = [
  { id: 'FLT-DEMO-003', droneId: 'DR-001', missionId: 'MSN-DEMO-003', route: 'HCM-01 → HCM-02', departure: '2026-10-02T17:17:00+07:00', arrival: '2026-10-02T17:42:00+07:00', energy: '182.4 Wh', status: 'COMPLETED' },
  { id: 'FLT-DEMO-002', droneId: 'DR-001', missionId: 'MSN-DEMO-002', route: 'HCM-01 → HCM-03', departure: '2026-09-30T16:02:00+07:00', arrival: '2026-09-30T16:29:00+07:00', energy: '201.6 Wh', status: 'COMPLETED' },
  { id: 'FLT-DEMO-001', droneId: 'DR-001', missionId: 'MSN-DEMO-001', route: 'HCM-03 → HCM-01', departure: '2026-09-28T09:30:00+07:00', arrival: '2026-09-28T09:52:00+07:00', energy: '168.2 Wh', status: 'COMPLETED' },
];
export const getDemoOrders = (id: string) => demoOrders.filter((r) => r.droneId === id);
export const getDemoFlights = (id: string) => demoFlights.filter((r) => r.droneId === id);

export const formatDroneDate = (date?: string) => {
  if (!date) return '—';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
};
export function getMaintenanceDue(drone: AdminDrone): { label: string; tone: 'red' | 'orange' | 'green' | 'gray' } {
  if (!drone.nextMaintenanceAt) return { label: 'Not scheduled', tone: 'gray' };
  const ms = Date.parse(drone.nextMaintenanceAt) - Date.now();
  if (!Number.isFinite(ms)) return { label: 'Not scheduled', tone: 'gray' };
  if (ms < 0) return { label: 'Overdue', tone: 'red' };
  if (ms < 7 * 86400000) return { label: 'Due soon', tone: 'orange' };
  return { label: 'On schedule', tone: 'green' };
}
