import { defaultAdminDrones, defaultAdminHubs, defaultAdminUsers } from "../data/adminData";
import type { AdminDrone, AdminHub, AdminUser } from "../types";

const HUBS_KEY = "droneoptai.admin.hubs";
const DRONES_KEY = "droneoptai.admin.drones";
const USERS_KEY = "droneoptai.admin.users";

function readList<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback.map((item) => ({ ...item }));
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback.map((item) => ({ ...item }));
  } catch {
    return fallback.map((item) => ({ ...item }));
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

export function getAdminUsers() {
  return readList<AdminUser>(USERS_KEY, defaultAdminUsers);
}

export function saveAdminUsers(users: AdminUser[]) {
  writeList(USERS_KEY, users);
}

export function upsertAdminUser(user: AdminUser) {
  const current = getAdminUsers();
  const exists = current.some((item) => item.id === user.id);
  saveAdminUsers(exists ? current.map((item) => (item.id === user.id ? user : item)) : [user, ...current]);
}

export function resetAdminDemoData() {
  localStorage.removeItem(HUBS_KEY);
  localStorage.removeItem(DRONES_KEY);
  localStorage.removeItem(USERS_KEY);
  window.dispatchEvent(new CustomEvent("admin-data-updated", { detail: { key: "all" } }));
}
