/* =========================================================
   DRONEOPTAI CUSTOMER PRICING

   FINAL MOCK PRICING POLICY
   ---------------------------------------------------------
   Pricing tier table:

   S  : payload <= 1 kg, Base 20,000, 4,000/km, 3,000/kg
   M  : payload <= 3 kg, Base 30,000, 5,000/km, 4,000/kg
   L  : payload <= 5 kg, Base 45,000, 6,000/km, 5,000/kg
   XL : payload < 10 kg, Base 65,000, 8,000/km, 6,000/kg

   CoreFee =
     BaseFee + DistanceFee + PayloadFee

   FragileSurcharge =
     CoreFee * 15%
     ONLY when package category is "Fragile items"

   InsuranceSurcharge =
     CoreFee * 10%
     ONLY when customer enables package insurance

   ServiceSurcharge =
     CoreFee * 25% for Express
     0 for Scheduled

   FinalFee =
     CoreFee
     + FragileSurcharge
     + InsuranceSurcharge
     + ServiceSurcharge

   IMPORTANT:
   Surcharges are always calculated from CoreFee.
   They are NOT calculated on top of one another.
========================================================= */

export type PricingTier = "S" | "M" | "L" | "XL";

export type DeliveryPricingBreakdown = {
  droneSize: PricingTier;

  distanceKm: number | null;

  baseFee: number;

  distanceRatePerKm: number;
  distanceFee: number;

  payloadRatePerKg: number;
  payloadFee: number;

  coreFee: number;

  isFragile: boolean;
  fragileRate: number;
  fragileSurcharge: number;

  hasInsurance: boolean;
  insuranceRate: number;
  insuranceSurcharge: number;

  deliveryMode: "express" | "scheduled";
  serviceRate: number;
  serviceSurcharge: number;

  finalFee: number;

  isRoutePriced: boolean;
};

type PriceableDraft = {
  packageSize?: PricingTier | "";
  packageCategory?: unknown;
  weightKg?: number | "";
  hasInsurance?: boolean;
  deliveryMode?:
    | "express"
    | "scheduled"
    | "";
};

type HubLike = {
  id?: string;
  name?: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
};

type PreviewLike = {
  distanceKm?: number | null;
  routeDistanceKm?: number | null;
  distance_km?: number | null;

  originHub?: HubLike;
  destinationHub?: HubLike;
};

/* =========================================================
   PRICING TABLE
========================================================= */

export const PRICING_RULES = {
  S: {
    maxPayloadKg: 1,
    baseFee: 20_000,
    ratePerKm: 4_000,
    ratePerKg: 3_000,
  },

  M: {
    maxPayloadKg: 3,
    baseFee: 30_000,
    ratePerKm: 5_000,
    ratePerKg: 4_000,
  },

  L: {
    maxPayloadKg: 5,
    baseFee: 45_000,
    ratePerKm: 6_000,
    ratePerKg: 5_000,
  },

  XL: {
    // Business rule: payload must be LESS THAN 10 kg.
    maxPayloadKg: 9.999,
    baseFee: 65_000,
    ratePerKm: 8_000,
    ratePerKg: 6_000,
  },
} satisfies Record<
  PricingTier,
  {
    maxPayloadKg: number;
    baseFee: number;
    ratePerKm: number;
    ratePerKg: number;
  }
>;

export const FRAGILE_RATE = 0.15;
export const INSURANCE_RATE = 0.10;
export const EXPRESS_RATE = 0.25;
export const SCHEDULED_RATE = 0;

/* =========================================================
   MOCK HUB COORDINATES

   Prototype fallback only.
   Production should use authoritative route distance from BE.
========================================================= */

const MOCK_HUB_COORDINATES: Record<
  string,
  {
    lat: number;
    lng: number;
  }
> = {
  "go vap hub": {
    lat: 10.8387,
    lng: 106.6653,
  },

  "thu duc hub": {
    lat: 10.8494,
    lng: 106.7537,
  },

  "district 7 hub": {
    lat: 10.7340,
    lng: 106.7218,
  },

  "tan binh hub": {
    lat: 10.8010,
    lng: 106.6520,
  },

  "cau giay hub": {
    lat: 21.0367,
    lng: 105.7907,
  },

  "long bien hub": {
    lat: 21.0400,
    lng: 105.8910,
  },

  "hai chau hub": {
    lat: 16.0600,
    lng: 108.2200,
  },
};

/* =========================================================
   CALCULATE PRICE
========================================================= */

export function calculateDeliveryPricing(
  draft: PriceableDraft,
  preview?: PreviewLike | null,
): DeliveryPricingBreakdown {
  const weightKg = Math.max(
    0,
    Number(draft.weightKg ?? 0),
  );

  /*
   * A delivery must satisfy BOTH:
   * - physical package size
   * - payload capacity
   *
   * Therefore pricing tier is the larger of:
   * package size tier and required payload tier.
   */
  const droneSize =
    resolvePricingTierForDelivery(
      draft.packageSize,
      weightKg,
    );

  const rules = PRICING_RULES[droneSize];

  const distanceKm =
    getRouteDistanceKm(preview);

  const baseFee = rules.baseFee;

  const distanceFee =
    distanceKm === null
      ? 0
      : roundCurrency(
          distanceKm *
            rules.ratePerKm,
        );

  const payloadFee = roundCurrency(
    weightKg * rules.ratePerKg,
  );

  const coreFee =
    baseFee +
    distanceFee +
    payloadFee;

  const isFragile =
    isFragileCategory(
      draft.packageCategory,
    );

  const fragileSurcharge =
    isFragile
      ? roundCurrency(
          coreFee * FRAGILE_RATE,
        )
      : 0;

  const hasInsurance =
    Boolean(draft.hasInsurance);

  const insuranceSurcharge =
    hasInsurance
      ? roundCurrency(
          coreFee * INSURANCE_RATE,
        )
      : 0;

  const deliveryMode =
    draft.deliveryMode === "scheduled"
      ? "scheduled"
      : "express";

  const serviceRate =
    deliveryMode === "express"
      ? EXPRESS_RATE
      : SCHEDULED_RATE;

  const serviceSurcharge =
    roundCurrency(
      coreFee * serviceRate,
    );

  const finalFee =
    coreFee +
    fragileSurcharge +
    insuranceSurcharge +
    serviceSurcharge;

  return {
    droneSize,
    distanceKm,

    baseFee,

    distanceRatePerKm:
      rules.ratePerKm,

    distanceFee,

    payloadRatePerKg:
      rules.ratePerKg,

    payloadFee,

    coreFee,

    isFragile,
    fragileRate: FRAGILE_RATE,
    fragileSurcharge,

    hasInsurance,
    insuranceRate:
      INSURANCE_RATE,
    insuranceSurcharge,

    deliveryMode,
    serviceRate,
    serviceSurcharge,

    finalFee,

    isRoutePriced:
      distanceKm !== null,
  };
}

/* =========================================================
   PRICING TIER
========================================================= */

export function getRequiredPayloadTier(
  weightKg: number,
): PricingTier {
  if (weightKg <= 1) {
    return "S";
  }

  if (weightKg <= 3) {
    return "M";
  }

  if (weightKg <= 5) {
    return "L";
  }

  return "XL";
}

export function resolvePricingTierForDelivery(
  packageSize: unknown,
  weightKg: number,
): PricingTier {
  const packageTier =
    isPricingTier(packageSize)
      ? packageSize
      : "S";

  const payloadTier =
    getRequiredPayloadTier(
      weightKg,
    );

  return getLargerTier(
    packageTier,
    payloadTier,
  );
}

function getLargerTier(
  left: PricingTier,
  right: PricingTier,
): PricingTier {
  const tiers: PricingTier[] = [
    "S",
    "M",
    "L",
    "XL",
  ];

  return tiers[
    Math.max(
      tiers.indexOf(left),
      tiers.indexOf(right),
    )
  ];
}

/* =========================================================
   FRAGILE CATEGORY

   Avoid depending on the exact enum casing/value.
   "Fragile items", "fragile", "FRAGILE_ITEMS", etc.
   will all be recognized.
========================================================= */

export function isFragileCategory(
  value: unknown,
) {
  if (typeof value !== "string") {
    return false;
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .includes("fragile");
}

/* =========================================================
   STORED PRICE COMPATIBILITY

   Keep legacy fields used by current Payment UI:
   price.deliveryFee
   price.serviceFee
   price.total

   deliveryFee =
     CoreFee
     + FragileSurcharge
     + InsuranceSurcharge

   serviceFee =
     Express/Service surcharge
========================================================= */

export function toStoredPrice(
  pricing: DeliveryPricingBreakdown,
) {
  return {
    deliveryFee:
      pricing.coreFee +
      pricing.fragileSurcharge +
      pricing.insuranceSurcharge,

    serviceFee:
      pricing.serviceSurcharge,

    total: pricing.finalFee,

    baseFee: pricing.baseFee,

    distanceKm:
      pricing.distanceKm,

    distanceRatePerKm:
      pricing.distanceRatePerKm,

    distanceFee:
      pricing.distanceFee,

    payloadRatePerKg:
      pricing.payloadRatePerKg,

    payloadFee:
      pricing.payloadFee,

    coreFee:
      pricing.coreFee,

    fragileRate:
      pricing.fragileRate,

    fragileSurcharge:
      pricing.fragileSurcharge,

    insuranceRate:
      pricing.insuranceRate,

    insuranceSurcharge:
      pricing.insuranceSurcharge,

    serviceRate:
      pricing.serviceRate,

    serviceSurcharge:
      pricing.serviceSurcharge,

    finalFee:
      pricing.finalFee,

    droneSize:
      pricing.droneSize,
  };
}

/* =========================================================
   PERSIST PRICE SNAPSHOT AFTER CREATE
========================================================= */

const DELIVERY_STORAGE_KEY =
  "droneoptai.customer.deliveries";

export function persistDeliveryPricingSnapshot(
  deliveryId: string,
  pricing: DeliveryPricingBreakdown,
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

    const price =
      toStoredPrice(pricing);

    const next = parsed.map(
      (delivery) =>
        delivery?.id === deliveryId
          ? {
              ...delivery,

              isFragile:
                pricing.isFragile,

              hasInsurance:
                pricing.hasInsurance,

              distanceKm:
                pricing.distanceKm,

              pricingTier:
                pricing.droneSize,

              price,

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
    // Keep prototype usable if localStorage is unavailable.
  }
}

/* =========================================================
   READ PRICE FROM EXISTING DELIVERY
========================================================= */

export function getDeliveryPricing(
  delivery: any,
): DeliveryPricingBreakdown {
  const price = delivery?.price;

  if (
    price &&
    typeof price.coreFee ===
      "number" &&
    typeof price.finalFee ===
      "number"
  ) {
    const deliveryMode =
      delivery?.deliveryMode ===
      "scheduled"
        ? "scheduled"
        : "express";

    return {
      droneSize:
        isPricingTier(
          price.droneSize,
        )
          ? price.droneSize
          : resolvePricingTierForDelivery(
              delivery?.packageSize,
              Number(
                delivery?.weightKg ??
                  0,
              ),
            ),

      distanceKm:
        typeof price.distanceKm ===
        "number"
          ? price.distanceKm
          : null,

      baseFee:
        Number(
          price.baseFee ?? 0,
        ),

      distanceRatePerKm:
        Number(
          price.distanceRatePerKm ??
            0,
        ),

      distanceFee:
        Number(
          price.distanceFee ?? 0,
        ),

      payloadRatePerKg:
        Number(
          price.payloadRatePerKg ??
            0,
        ),

      payloadFee:
        Number(
          price.payloadFee ?? 0,
        ),

      coreFee:
        Number(price.coreFee),

      isFragile:
        Boolean(
          delivery?.isFragile ??
            Number(
              price.fragileSurcharge ??
                0,
            ) > 0,
        ),

      fragileRate:
        Number(
          price.fragileRate ??
            FRAGILE_RATE,
        ),

      fragileSurcharge:
        Number(
          price.fragileSurcharge ??
            0,
        ),

      hasInsurance:
        Boolean(
          delivery?.hasInsurance ??
            Number(
              price.insuranceSurcharge ??
                0,
            ) > 0,
        ),

      insuranceRate:
        Number(
          price.insuranceRate ??
            INSURANCE_RATE,
        ),

      insuranceSurcharge:
        Number(
          price.insuranceSurcharge ??
            0,
        ),

      deliveryMode,

      serviceRate:
        Number(
          price.serviceRate ??
            (deliveryMode ===
            "express"
              ? EXPRESS_RATE
              : 0),
        ),

      serviceSurcharge:
        Number(
          price.serviceSurcharge ??
            price.serviceFee ??
            0,
        ),

      finalFee:
        Number(price.finalFee),

      isRoutePriced:
        typeof price.distanceKm ===
        "number",
    };
  }

  return calculateDeliveryPricing(
    {
      packageSize:
        delivery?.packageSize,

      packageCategory:
        delivery?.packageCategory,

      weightKg:
        delivery?.weightKg,

      hasInsurance:
        delivery?.hasInsurance,

      deliveryMode:
        delivery?.deliveryMode,
    },

    {
      distanceKm:
        delivery?.distanceKm,

      originHub:
        delivery?.originHub,

      destinationHub:
        delivery?.destinationHub,
    },
  );
}

/* =========================================================
   DISTANCE
========================================================= */

export function getRouteDistanceKm(
  preview?: PreviewLike | null,
): number | null {
  if (!preview) {
    return null;
  }

  const directCandidates = [
    preview.distanceKm,
    preview.routeDistanceKm,
    preview.distance_km,
  ];

  for (const value of directCandidates) {
    if (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0
    ) {
      return roundDistance(value);
    }
  }

  const origin =
    resolveHubCoordinate(
      preview.originHub,
    );

  const destination =
    resolveHubCoordinate(
      preview.destinationHub,
    );

  if (
    !origin ||
    !destination
  ) {
    return null;
  }

  return roundDistance(
    haversineKm(
      origin.lat,
      origin.lng,
      destination.lat,
      destination.lng,
    ),
  );
}

function resolveHubCoordinate(
  hub?: HubLike,
) {
  if (!hub) {
    return null;
  }

  const lat =
    typeof hub.lat === "number"
      ? hub.lat
      : hub.latitude;

  const lng =
    typeof hub.lng === "number"
      ? hub.lng
      : hub.longitude;

  if (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    return {
      lat,
      lng,
    };
  }

  return (
    MOCK_HUB_COORDINATES[
      normalizeHubName(
        hub.name,
      )
    ] ?? null
  );
}

function normalizeHubName(
  value?: string,
) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    );
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const earthRadiusKm = 6371;

  const toRadians = (
    value: number,
  ) => (value * Math.PI) / 180;

  const deltaLat = toRadians(
    lat2 - lat1,
  );

  const deltaLng = toRadians(
    lng2 - lng1,
  );

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
    earthRadiusKm *
    Math.asin(Math.sqrt(a))
  );
}

/* =========================================================
   HELPERS
========================================================= */

function isPricingTier(
  value: unknown,
): value is PricingTier {
  return (
    value === "S" ||
    value === "M" ||
    value === "L" ||
    value === "XL"
  );
}

function roundCurrency(
  value: number,
) {
  return Math.round(value);
}

function roundDistance(
  value: number,
) {
  return (
    Math.round(value * 10) /
    10
  );
}
