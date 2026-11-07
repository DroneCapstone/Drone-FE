import {
  defaultAdminBatteries,
  defaultAdminDrones,
  defaultAdminHubs,
  defaultAdminSettings,
  defaultAdminUsers,
} from "../data/adminData";
import type { AdminBattery, AdminDrone, AdminHub, AdminSettings, AdminUser } from "../types";

const HUBS_KEY = "droneoptai.admin.hubs.v2";
const DRONES_KEY = "droneoptai.admin.drones.v2";
const BATTERIES_KEY = "droneoptai.admin.batteries.v2";
const USERS_KEY = "droneoptai.admin.users.v2";
const SETTINGS_KEY = "droneoptai.admin.settings.v2";

function cloneList<T>(items: T[]) {
  return items.map((item) => ({ ...item }));
}

function readList<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return cloneList(fallback);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : cloneList(fallback);
  } catch {
    return cloneList(fallback);
  }
}

function writeList<T>(key: string, value: T[]) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("admin-data-updated", { detail: { key } }));
}

export function getAdminHubs() {
  return readList<AdminHub>(HUBS_KEY, defaultAdminHubs);
}

export function saveAdminHubs(hubs: AdminHub[]) {
  writeList(HUBS_KEY, hubs);
}

export function upsertAdminHub(hub: AdminHub) {
  const current = getAdminHubs();
  const exists = current.some((item) => item.id === hub.id);
  saveAdminHubs(exists ? current.map((item) => (item.id === hub.id ? hub : item)) : [hub, ...current]);
}

export function getAdminDrones() {
  return readList<AdminDrone>(DRONES_KEY, defaultAdminDrones);
}

export function saveAdminDrones(drones: AdminDrone[]) {
  writeList(DRONES_KEY, drones);
}

export function upsertAdminDrone(drone: AdminDrone) {
  const current = getAdminDrones();
  const exists = current.some((item) => item.id === drone.id);
  saveAdminDrones(exists ? current.map((item) => (item.id === drone.id ? drone : item)) : [drone, ...current]);
}

export function getAdminBatteries() {
  return readList<AdminBattery>(BATTERIES_KEY, defaultAdminBatteries);
}

export function saveAdminBatteries(batteries: AdminBattery[]) {
  writeList(BATTERIES_KEY, batteries);
}

export function upsertAdminBattery(battery: AdminBattery) {
  const current = getAdminBatteries();
  const exists = current.some((item) => item.id === battery.id);
  saveAdminBatteries(exists ? current.map((item) => (item.id === battery.id ? battery : item)) : [battery, ...current]);
}

export function getAdminUsers() {
  return readList<AdminUser>(USERS_KEY, defaultAdminUsers);
}

export function saveAdminUsers(users: AdminUser[]) {
  writeList(USERS_KEY, users);
}

export function upsertAdminUser(user: AdminUser) {
  const current = getAdminUsers();
  const exists = current.some((item) => item.id === user.id);
  const updated = exists ? current.map((item) => (item.id === user.id ? user : item)) : [user, ...current];
  saveAdminUsers(updated);
  // Keep hub staffing counts in sync with the Admin User's assigned hub.
  const hubs = getAdminHubs();
  let dirty = false;
  const nextHubs = hubs.map((hub) => {
    const staff = updated.filter((item) => item.role === 'technician' && item.status === 'ACTIVE' && item.hubId === hub.id).map((item) => item.id);
    const ids = [...new Set(staff)];
    const currentIds = hub.technicianIds ?? [];
    if (JSON.stringify([...currentIds].sort()) === JSON.stringify([...ids].sort())) return hub;
    dirty = true;
    return { ...hub, technicianIds: ids };
  });
  if (dirty) saveAdminHubs(nextHubs);
}

export function getAdminSettings(): AdminSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaultAdminSettings, ...JSON.parse(raw) } : { ...defaultAdminSettings };
  } catch {
    return { ...defaultAdminSettings };
  }
}

export function saveAdminSettings(settings: AdminSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent("admin-data-updated", { detail: { key: SETTINGS_KEY } }));
}

export function resetAdminDemoData() {
  [HUBS_KEY, DRONES_KEY, BATTERIES_KEY, USERS_KEY, SETTINGS_KEY,
    'droneoptai.prototype.v1.parts', 'droneoptai.prototype.v1.requests', 'droneoptai.prototype.v1.activity',
    'droneoptai.prototype.v1.payments', 'droneoptai.prototype.v1.refunds', 'droneoptai.prototype.v1.expenses'].forEach((key) => localStorage.removeItem(key));
  window.dispatchEvent(new CustomEvent("admin-data-updated", { detail: { key: "all" } }));
}
