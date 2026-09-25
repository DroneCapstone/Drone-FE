import { operatorDrones } from '../data/droneMockData';
import type { OperatorDrone, TechnicalStatus } from '../types/operator';

const TECHNICIAN_STORAGE_KEY = 'droneoptai.technician.fleet.v2';

type TechnicianFleetRow = {
  id?: string;
  status?: string;
};

function normalizeTechnicalStatus(status: string | undefined): TechnicalStatus | undefined {
  if (status === 'Maintenance' || status === 'Battery Replacement') return 'Maintenance';
  if (status === 'Available' || status === 'Serviceable') return 'Available';
  return undefined;
}

export function loadOperatorFleet(): OperatorDrone[] {
  if (typeof window === 'undefined') return operatorDrones;

  try {
    const raw = localStorage.getItem(TECHNICIAN_STORAGE_KEY);
    if (!raw) return operatorDrones;

    const technicianFleet = JSON.parse(raw) as TechnicianFleetRow[];
    if (!Array.isArray(technicianFleet)) return operatorDrones;

    const statusById = new Map<string, TechnicalStatus>();
    technicianFleet.forEach((drone) => {
      const status = normalizeTechnicalStatus(drone.status);
      if (drone.id && status) statusById.set(drone.id, status);
    });

    return operatorDrones.map((drone) => ({
      ...drone,
      technicalStatus: statusById.get(drone.id) ?? drone.technicalStatus,
    }));
  } catch {
    return operatorDrones;
  }
}
