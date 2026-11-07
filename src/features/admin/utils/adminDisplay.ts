import type { Tone } from "../../operator/types/operator";
import type { AdminBattery, AdminDrone, AdminHub, AdminPaymentStatus, AdminUserStatus } from "../types";

export function hubTone(status: AdminHub["status"]): Tone {
  return status === "ACTIVE" ? "success" : "neutral";
}

export function droneTone(status: AdminDrone["status"]): Tone {
  if (status === "AVAILABLE") return "success";
  if (status === "MAINTENANCE") return "warning";
  return "info";
}

export function batteryOperationalTone(status: AdminBattery["operationalStatus"]): Tone {
  if (status === "READY") return "success";
  if (status === "CHARGING") return "warning";
  if (status === "MAINTENANCE") return "danger";
  return "info";
}

export function batteryHealthTone(soh: number): Tone {
  if (soh >= 90) return "success";
  if (soh >= 80) return "warning";
  return "danger";
}

export function userTone(status: AdminUserStatus): Tone {
  return status === "ACTIVE" ? "success" : "neutral";
}

export function paymentTone(status: AdminPaymentStatus): Tone {
  if (status === "PAID") return "success";
  if (status === "PENDING") return "warning";
  if (status === "FAILED") return "danger";
  return "info";
}

export function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}
