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

/** Isolated view-only fixtures, NOT shared with Technician or Operator API.
 * Keep actual Admin Drone IDs (e.g. DR-001) to preserve Hub/Battery/Approval links.
 */
const demoOrders: DroneWorkOrder[] = [
  { id: 'WO-2026-004', droneId: 'DR-001', issue: 'Motor inspection', status: 'IN_PROGRESS', technician: 'Tran An', updatedAt: '2026-11-06T10:24:00+07:00', diagnosis: 'Abnormal vibration during routine inspection.', correctiveAction: 'Inspect mount and verify torque settings.' },
  { id: 'WO-2026-003', droneId: 'DR-001', issue: 'Propeller replacement', status: 'COMPLETED', technician: 'Do Minh', updatedAt: '2026-10-29T16:12:00+07:00', diagnosis: 'A propeller had a visible surface crack.', correctiveAction: 'Replacement approved, installed and inspected.' },
  { id: 'WO-2026-002', droneId: 'DR-001', issue: 'Battery connector inspection', status: 'IN_PROGRESS', technician: 'Tran An', updatedAt: '2026-11-04T09:30:00+07:00', diagnosis: 'Intermittent contact reported during preflight preparation.', correctiveAction: 'Inspect connector and document findings.' },
  { id: 'WO-2026-010', droneId: 'DR-003', issue: 'Propeller inspection', status: 'IN_PROGRESS', technician: 'Do Minh', updatedAt: '2026-11-05T14:12:00+07:00', diagnosis: 'Minor chipping on propeller edge.', correctiveAction: 'Request replacement parts.' },
];
const demoFlights: DroneFlightRecord[] = [
  { id: 'FLT-20261106-001', droneId: 'DR-001', missionId: 'MSN-20261106-002', route: 'HCM-01 → HCM-02', departure: '2026-11-06T08:17:00+07:00', arrival: '2026-11-06T08:42:00+07:00', energy: '182.4 Wh', status: 'COMPLETED' },
  { id: 'FLT-20261104-012', droneId: 'DR-001', missionId: 'MSN-20261104-012', route: 'HCM-01 → HCM-03', departure: '2026-11-04T16:02:00+07:00', arrival: '2026-11-04T16:29:00+07:00', energy: '201.6 Wh', status: 'COMPLETED' },
  { id: 'FLT-20261103-006', droneId: 'DR-001', missionId: 'MSN-20261103-008', route: 'HCM-03 → HCM-01', departure: '2026-11-03T09:30:00+07:00', arrival: '2026-11-03T09:52:00+07:00', energy: '168.2 Wh', status: 'COMPLETED' },
  { id: 'FLT-20261030-001', droneId: 'DR-003', missionId: 'MSN-20261030-001', route: 'HCM-01 → HCM-02', departure: '2026-10-30T16:06:00+07:00', arrival: '2026-10-30T16:30:00+07:00', energy: '153.9 Wh', status: 'COMPLETED' },
];

export const getDemoOrders = (id: string) => demoOrders.filter((r) => r.droneId === id);
export const getDemoFlights = (id: string) => demoFlights.filter((r) => r.droneId === id);

/** The original HTML prototype showed historical aggregates, but the table
 * includes only a few sample records. Keep these two concepts distinct. */
export function getDemoFlightSummary(droneId: string, flights: DroneFlightRecord[]) {
  if (droneId === 'DR-001') return {
    count: 128,
    hours: 56.4,
    latest: '2026-11-06T08:42:00+07:00',
  };
  const lastFlight = [...flights].sort((a, b) => b.departure.localeCompare(a.departure))[0];
  return { count: flights.length, hours: null as number | null, latest: lastFlight?.arrival ?? lastFlight?.departure };
}

/** Read-only sample maintenance note for the Admin prototype. */
export function getDemoMaintenanceNote(droneId: string): string {
  if (droneId === 'DR-001') return 'Periodic inspection (500 flight hours)';
  if (droneId === 'DR-003') return 'Propeller inspection required';
  return '';
}

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
