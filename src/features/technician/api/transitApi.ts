/**
 * Transit page consumes GET /technician/fleet/incoming.
 * Delivery enrichment uses GET /technician/missions/ (present in current Swagger).
 * Keep the named export to avoid breaking the existing Delivery modules.
 */
export {
  confirmMissionArrivalApi,
  getIncomingMissionsApi,
  getTechnicianMissionsApi,
} from "../utils/technicianApi";
