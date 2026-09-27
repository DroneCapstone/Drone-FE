import type {
  DeliveryHub,
  PackageCategory,
  PackageSize,
} from "../types/customer";

export const PACKAGE_CATEGORIES: {
  value: PackageCategory;
  label: string;
}[] = [
  {
    value: "food",
    label: "Food",
  },
  {
    value: "documents",
    label: "Documents",
  },
  {
    value: "electronics",
    label: "Electronics",
  },
  {
    value: "medical",
    label: "Medical supplies",
  },
  {
    value: "clothing",
    label: "Clothing",
  },
  {
    value: "household",
    label: "Household goods",
  },
  {
    value: "fragile",
    label: "Fragile items",
  },
  {
    value: "other",
    label: "Other",
  },
];

export const PACKAGE_SIZE_RULES: Record<
  PackageSize,
  {
    label: string;
    dimensions: string;
    description: string;
  }
> = {
  S: {
    label: "S",
    dimensions: "20 × 20 × 15 cm",
    description:
      "Small documents, food boxes and compact items.",
  },

  M: {
    label: "M",
    dimensions: "30 × 25 × 20 cm",
    description:
      "Standard parcels and small electronics.",
  },

  L: {
    label: "L",
    dimensions: "40 × 30 × 25 cm",
    description:
      "Medium packages and household items.",
  },

  XL: {
    label: "XL",
    dimensions: "50 × 40 × 30 cm",
    description:
      "Largest package size accepted by the network.",
  },
};

export const DELIVERY_HUBS: DeliveryHub[] = [
  {
    id: "hub-go-vap",
    name: "Go Vap Hub",
    city: "Ho Chi Minh City",
    area: "Go Vap",
    address:
      "Nguyen Van Bao, Go Vap, Ho Chi Minh City",
  },

  {
    id: "hub-thu-duc",
    name: "Thu Duc Hub",
    city: "Ho Chi Minh City",
    area: "Thu Duc",
    address:
      "Vo Nguyen Giap, Thu Duc, Ho Chi Minh City",
  },

  {
    id: "hub-district-7",
    name: "District 7 Hub",
    city: "Ho Chi Minh City",
    area: "District 7",
    address:
      "Nguyen Van Linh, District 7, Ho Chi Minh City",
  },

  {
    id: "hub-tan-binh",
    name: "Tan Binh Hub",
    city: "Ho Chi Minh City",
    area: "Tan Binh",
    address:
      "Cong Hoa, Tan Binh, Ho Chi Minh City",
  },

  {
    id: "hub-cau-giay",
    name: "Cau Giay Hub",
    city: "Ha Noi",
    area: "Cau Giay",
    address:
      "Cau Giay District, Ha Noi",
  },

  {
    id: "hub-long-bien",
    name: "Long Bien Hub",
    city: "Ha Noi",
    area: "Long Bien",
    address:
      "Long Bien District, Ha Noi",
  },

  {
    id: "hub-hai-chau",
    name: "Hai Chau Hub",
    city: "Da Nang",
    area: "Hai Chau",
    address:
      "Hai Chau District, Da Nang",
  },
];

export const VIETNAM_LOCATIONS = [
  "Go Vap, Ho Chi Minh City",
  "Thu Duc, Ho Chi Minh City",
  "District 1, Ho Chi Minh City",
  "District 3, Ho Chi Minh City",
  "District 5, Ho Chi Minh City",
  "District 7, Ho Chi Minh City",
  "Tan Binh, Ho Chi Minh City",
  "Binh Thanh, Ho Chi Minh City",
  "Phu Nhuan, Ho Chi Minh City",
  "Binh Tan, Ho Chi Minh City",

  "Cau Giay, Ha Noi",
  "Long Bien, Ha Noi",
  "Ba Dinh, Ha Noi",
  "Hoan Kiem, Ha Noi",
  "Thanh Xuan, Ha Noi",

  "Hai Chau, Da Nang",
  "Son Tra, Da Nang",
  "Thanh Khe, Da Nang",

  "Ninh Kieu, Can Tho",
  "Bien Hoa, Dong Nai",
  "Thu Dau Mot, Binh Duong",
];