export const technicianDrones = [
  {
    id: "DR-001",
    name: "CX-09",
    model: "DJI Matrice 350",
    status: "available",
    battery: 86,
    utilization: 62,
    flights: 148,
    lastFlight: "18 Sep · 08:42",
  },
  {
    id: "DR-002",
    name: "CX-12",
    model: "DJI Matrice 350",
    status: "in-flight",
    battery: 61,
    utilization: 78,
    flights: 203,
    lastFlight: "In progress",
  },
  {
    id: "DR-003",
    name: "AX-04",
    model: "DJI M300 RTK",
    status: "maintenance",
    battery: 32,
    utilization: 51,
    flights: 121,
    lastFlight: "17 Sep · 16:10",
  },
  {
    id: "DR-004",
    name: "AX-08",
    model: "DJI M300 RTK",
    status: "available",
    battery: 94,
    utilization: 69,
    flights: 176,
    lastFlight: "18 Sep · 07:54",
  },
];

export const maintenanceAlerts = [
  {
    id: "ALT-241",
    drone: "AX-04",
    title: "Battery level below operational threshold",
    severity: "warning",
    time: "8 min ago",
  },
  {
    id: "ALT-239",
    drone: "CX-09",
    title: "Inspection interval approaching",
    severity: "warning",
    time: "36 min ago",
  },
  {
    id: "ALT-233",
    drone: "CX-12",
    title: "Motor vibration anomaly detected",
    severity: "critical",
    time: "1 h ago",
  },
];

export const workOrders = [
  {
    id: "WO-1054",
    drone: "AX-04",
    title: "Battery replacement",
    priority: "High",
    status: "open",
    technician: "Technician Demo",
  },
  {
    id: "WO-1053",
    drone: "CX-12",
    title: "Motor inspection",
    priority: "High",
    status: "open",
    technician: "Technician Demo",
  },
  {
    id: "WO-1049",
    drone: "CX-09",
    title: "Scheduled inspection",
    priority: "Normal",
    status: "completed",
    technician: "Technician Demo",
  },
];

export const incidents = [
  {
    id: "INC-091",
    drone: "CX-12",
    mission: "MSN-2848",
    title: "Unexpected vibration during descent",
    severity: "critical",
    status: "Investigating",
    time: "18 Sep · 08:12",
  },
  {
    id: "INC-087",
    drone: "AX-04",
    mission: "MSN-2821",
    title: "Battery reserve below expected level",
    severity: "warning",
    status: "Corrective action",
    time: "17 Sep · 14:31",
  },
];