/**
 * Technician transit API exports.
 *
 * Transit Missions itself uses only getIncomingMissionsApi + confirmMissionArrivalApi.
 * getTechnicianMissionsApi is intentionally re-exported as a compatibility helper
 * because Outbound/Delivery Confirmation mapping still imports it from this module.
 * The helper now points to the shared Swagger route GET /api/v1/missions/ via
 * ../utils/technicianApi; it does NOT restore the removed /technician/missions/ route.
 */
export {
  confirmMissionArrivalApi,
  getIncomingMissionsApi,
  getTechnicianMissionsApi,
} from "../utils/technicianApi";
