import { useSyncExternalStore } from "react";

export type CustomerTheme = "dark" | "light";

const STORAGE_KEY = "droneoptai.customer.theme";

function readStoredTheme(): CustomerTheme {
  if (typeof window === "undefined") return "dark";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

let currentTheme: CustomerTheme = readStoredTheme();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function setCustomerTheme(next: CustomerTheme) {
  if (currentTheme === next) return;
  currentTheme = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Theme selection still works when storage is restricted.
    }
  }
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      const next = readStoredTheme();
      if (next !== currentTheme) {
        currentTheme = next;
        notify();
      }
    }
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export function useCustomerTheme(): CustomerTheme {
  return useSyncExternalStore(subscribe, () => currentTheme, () => "dark");
}
