import type { Mission } from '../types/operator';

export const missions: Mission[] = [
  { id: 'MSN-2841', name: 'Harbor medical relay', drone: 'AX-17', route: 'R-04 Coastal', status: 'In flight', tone: 'success', eta: '18 min', battery: 76 },
  { id: 'MSN-2839', name: 'North grid inspection', drone: 'NX-08', route: 'R-12 North', status: 'Delayed', tone: 'warning', eta: '+12 min', battery: 54 },
  { id: 'MSN-2837', name: 'District 7 resupply', drone: 'AX-04', route: 'R-08 Urban', status: 'Scheduled', tone: 'info', eta: '14:30', battery: 100 },
  { id: 'MSN-2833', name: 'River sensor pickup', drone: 'MX-22', route: 'R-02 River', status: 'Completed', tone: 'neutral', eta: '09:42', battery: 31 },
  { id: 'MSN-2828', name: 'Warehouse transfer', drone: 'CX-11', route: 'R-17 Express', status: 'Review', tone: 'warning', eta: 'Pending', battery: 88 },
];
