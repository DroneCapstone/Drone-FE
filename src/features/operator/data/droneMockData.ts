import type { OperatorDrone } from '../types/operator';

export const operatorDrones: OperatorDrone[] = [
  { id: 'DR-001', name: 'CX', displayId: '09', model: 'DJI Matrice 350', hubId: 'HUB-HCM-02', technicalStatus: 'Available', maxPayloadKg: 8 },
  { id: 'DR-002', name: 'CX', displayId: '12', model: 'DJI Matrice 350', hubId: 'HUB-HCM-02', technicalStatus: 'Available', maxPayloadKg: 8 },
  { id: 'DR-003', name: 'AX', displayId: '04', model: 'DJI FlyCart 30', hubId: 'HUB-HCM-02', technicalStatus: 'Maintenance', maxPayloadKg: 12 },
  { id: 'DR-004', name: 'AX', displayId: '17', model: 'DJI FlyCart 30', hubId: 'HUB-HCM-01', technicalStatus: 'Available', maxPayloadKg: 12 },
  { id: 'DR-005', name: 'NX', displayId: '08', model: 'DJI Matrice 350', hubId: 'HUB-HCM-01', technicalStatus: 'Available', maxPayloadKg: 8 },
  { id: 'DR-006', name: 'MX', displayId: '22', model: 'DJI Matrice 300', hubId: 'HUB-HCM-01', technicalStatus: 'Available', maxPayloadKg: 6 },
  { id: 'DR-007', name: 'CX', displayId: '21', model: 'DJI Matrice 350', hubId: 'HUB-HCM-03', technicalStatus: 'Available', maxPayloadKg: 8 },
  { id: 'DR-008', name: 'AX', displayId: '26', model: 'DJI FlyCart 30', hubId: 'HUB-HCM-03', technicalStatus: 'Available', maxPayloadKg: 12 },
  { id: 'DR-009', name: 'CX', displayId: '31', model: 'DJI Matrice 350', hubId: 'HUB-HCM-03', technicalStatus: 'Maintenance', maxPayloadKg: 8 },
];
