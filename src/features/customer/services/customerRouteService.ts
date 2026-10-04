/* =========================================================
   CUSTOMER ROUTE SERVICE — FRONTEND MOCK

   Purpose
   -------
   customerDeliveryService.preview() in the current mock can
   return the same fallback hub for two different areas.

   This helper resolves the hub independently for EACH selected
   area, so:
     District 1 -> District 1 Hub
     Go Vap     -> Go Vap Hub

   When the real Hub API is connected, replace this mock resolver
   with backend hub-selection data.
========================================================= */

export type CustomerHub = {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
};

export type CustomerRoutePreview = {
  originHub: CustomerHub;
  destinationHub: CustomerHub;
  distanceKm: number | null;
};

type AreaCoordinate = {
  lat: number;
  lng: number;
};

/* =========================================================
   MOCK AREA CENTERS

   Used only to estimate pricing distance in the current mock.
========================================================= */

const AREA_COORDINATES: Record<string, AreaCoordinate> = {
  "district 1": {
    lat: 10.7756,
    lng: 106.7004,
  },
  "district 3": {
    lat: 10.7844,
    lng: 106.6844,
  },
  "district 4": {
    lat: 10.7578,
    lng: 106.7040,
  },
  "district 5": {
    lat: 10.7540,
    lng: 106.6634,
  },
  "district 6": {
    lat: 10.7469,
    lng: 106.6350,
  },
  "district 7": {
    lat: 10.7340,
    lng: 106.7218,
  },
  "district 8": {
    lat: 10.7241,
    lng: 106.6286,
  },
  "district 10": {
    lat: 10.7746,
    lng: 106.6679,
  },
  "district 11": {
    lat: 10.7629,
    lng: 106.6502,
  },
  "district 12": {
    lat: 10.8672,
    lng: 106.6413,
  },
  "go vap": {
    lat: 10.8387,
    lng: 106.6653,
  },
  "thu duc": {
    lat: 10.8494,
    lng: 106.7537,
  },
  "tan binh": {
    lat: 10.8010,
    lng: 106.6520,
  },
  "tan phu": {
    lat: 10.7916,
    lng: 106.6274,
  },
  "phu nhuan": {
    lat: 10.7990,
    lng: 106.6807,
  },
  "binh thanh": {
    lat: 10.8106,
    lng: 106.7091,
  },
  "binh tan": {
    lat: 10.7653,
    lng: 106.6038,
  },
  "nha be": {
    lat: 10.6953,
    lng: 106.7046,
  },
  "hoc mon": {
    lat: 10.8860,
    lng: 106.5927,
  },
  "binh chanh": {
    lat: 10.6870,
    lng: 106.5930,
  },
  "cu chi": {
    lat: 10.9736,
    lng: 106.4933,
  },
  "can gio": {
    lat: 10.4114,
    lng: 106.9547,
  },
};

/* =========================================================
   RESOLVE ROUTE
========================================================= */

export function resolveCustomerRoute(
  originArea: string,
  destinationArea: string,
): CustomerRoutePreview | null {
  if (
    !originArea.trim() ||
    !destinationArea.trim()
  ) {
    return null;
  }

  const originHub =
    resolveHubFromArea(originArea);

  const destinationHub =
    resolveHubFromArea(
      destinationArea,
    );

  const distanceKm =
    originHub.lat !== undefined &&
    originHub.lng !== undefined &&
    destinationHub.lat !== undefined &&
    destinationHub.lng !== undefined
      ? roundDistance(
          haversineKm(
            originHub.lat,
            originHub.lng,
            destinationHub.lat,
            destinationHub.lng,
          ),
        )
      : null;

  return {
    originHub,
    destinationHub,
    distanceKm,
  };
}

/* =========================================================
   AREA -> HUB

   The hub is derived from the selected area itself instead of
   falling back to Go Vap for unmatched text.
========================================================= */

export function resolveHubFromArea(
  area: string,
): CustomerHub {
  const areaName =
    getAreaName(area);

  const normalized =
    normalize(areaName);

  const coordinate =
    AREA_COORDINATES[normalized];

  /*
   * Preserve the current nicer addresses for the two mock hubs
   * already shown in the customer UI.
   */
  if (normalized === "go vap") {
    return {
      id: "HUB-GO-VAP",
      name: "Go Vap Hub",
      address:
        "Nguyen Van Bao, Go Vap, Ho Chi Minh City",
      ...coordinate,
    };
  }

  if (normalized === "thu duc") {
    return {
      id: "HUB-THU-DUC",
      name: "Thu Duc Hub",
      address:
        "Vo Nguyen Giap, Thu Duc, Ho Chi Minh City",
      ...coordinate,
    };
  }

  return {
    id: `HUB-${toSlug(areaName).toUpperCase()}`,
    name: `${areaName} Hub`,
    address: area.trim(),
    ...(coordinate ?? {}),
  };
}

/* =========================================================
   PERSIST CORRECT ROUTE AFTER ORDER CREATION

   customerDeliveryService.create() is kept unchanged.
   Immediately after create(), call this helper so Summary /
   Detail / Payment read the correct selected hubs.
========================================================= */

const DELIVERY_STORAGE_KEY =
  "droneoptai.customer.deliveries";

export function persistDeliveryRouteSnapshot(
  deliveryId: string,
  route: CustomerRoutePreview,
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  try {
    const raw =
      window.localStorage.getItem(
        DELIVERY_STORAGE_KEY,
      );

    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return;
    }

    const next = parsed.map(
      (delivery) =>
        delivery?.id === deliveryId
          ? {
              ...delivery,
              originHub:
                route.originHub,
              destinationHub:
                route.destinationHub,
              distanceKm:
                route.distanceKm,
              updatedAt:
                new Date().toISOString(),
            }
          : delivery,
    );

    window.localStorage.setItem(
      DELIVERY_STORAGE_KEY,
      JSON.stringify(next),
    );
  } catch {
    // Keep the customer prototype usable if storage is unavailable.
  }
}

/* =========================================================
   HELPERS
========================================================= */

function getAreaName(
  location: string,
) {
  const firstPart =
    location
      .split(",")[0]
      ?.trim() || location.trim();

  return firstPart;
}

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /^quan\s+/,
      "district ",
    );
}

function toSlug(value: string) {
  return normalize(value)
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(/^-|-$/g, "");
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const radiusKm = 6371;

  const toRadians = (
    value: number,
  ) => (value * Math.PI) / 180;

  const deltaLat =
    toRadians(lat2 - lat1);

  const deltaLng =
    toRadians(lng2 - lng1);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(
      toRadians(lat1),
    ) *
      Math.cos(
        toRadians(lat2),
      ) *
      Math.sin(
        deltaLng / 2,
      ) **
        2;

  return (
    2 *
    radiusKm *
    Math.asin(Math.sqrt(a))
  );
}

function roundDistance(
  value: number,
) {
  return (
    Math.round(value * 10) /
    10
  );
}
