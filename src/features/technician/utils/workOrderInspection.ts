// Templates from AUTO_GENERATE_INSPECTION_CHECKLIST.md. No new API is needed
// to preview a checklist: send the actual checked items with the final PATCH.
export const defectTemplates = {
  MOTOR_ESC: { label: "Motor / ESC failure", items: ["Check motor left", "Check motor right", "Check ESC connections", "Test motor rotation (no load)"] },
  SIGNAL_LOSS: { label: "Signal loss", items: ["Check telemetry module", "Check antenna", "Test signal strength", "Verify receiver pairing"] },
  BATTERY_BMS: { label: "Battery / BMS failure", items: ["Check battery voltage", "Check battery cells balance", "Inspect battery case for damage", "Test BMS communication"] },
  SENSOR_GPS: { label: "Sensor / GPS failure", items: ["Check GPS module", "Check compass calibration", "Check barometer", "Verify IMU orientation"] },
  FRAME_DAMAGE: { label: "Frame damage", items: ["Inspect frame for cracks", "Check arm alignment", "Verify landing gear"] },
  PROPELLER_DAMAGE: { label: "Propeller damage", items: ["Inspect all 4 propellers", "Check propeller balance", "Verify propeller mounting"] },
  OTHER: { label: "Other", items: ["General inspection"] },
} as const;
export type DefectType = keyof typeof defectTemplates;
export function isDefectType(value: unknown): value is DefectType {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(defectTemplates, value);
}
export function checklistFor(defect: DefectType | "", checked: readonly string[] = []) {
  return defect ? defectTemplates[defect].items.map(item => ({ item, checked: checked.includes(item) })) : [];
}
export function defectLabel(value: string) { return isDefectType(value) ? defectTemplates[value].label : value; }
export function validProofUrl(value: unknown): string {
  return typeof value === "string" && (/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=\s]+$/i.test(value) || /^https?:\/\//i.test(value)) ? value : "";
}
