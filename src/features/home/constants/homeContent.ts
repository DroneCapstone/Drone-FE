import {
  Activity,
  BatteryCharging,
  Box,
  MapPinned,
  PackageCheck,
  PlaneTakeoff,
  Route,
  ShieldCheck,
} from "lucide-react";

export const navigationItems = [
  {
    label: "Solutions",
    href: "#solutions",
  },
  {
    label: "How it works",
    href: "#how-it-works",
  },
  {
    label: "Platform",
    href: "#platform",
  },
  {
    label: "Contact",
    href: "#contact",
  },
];

export const stats = [
  {
    value: "24/7",
    label: "Delivery operations",
  },
  {
    value: "Live",
    label: "Mission tracking",
  },
  {
    value: "Smart",
    label: "Route optimization",
  },
  {
    value: "Real-time",
    label: "Fleet monitoring",
  },
];

export const solutions = [
  {
    icon: PackageCheck,
    tag: "DELIVERY",
    title: "Smart drone delivery",
    description:
      "Create and manage delivery orders while DroneOptAI coordinates missions from dispatch to destination.",
  },
  {
    icon: Route,
    tag: "ROUTING",
    title: "Intelligent route planning",
    description:
      "Visualize routes, estimate mission duration, and support safer and more efficient drone operations.",
  },
  {
    icon: Activity,
    tag: "OPERATIONS",
    title: "Mission control",
    description:
      "Track active missions, drone status, ETA, energy consumption, and operational information in real time.",
  },
];

export const processSteps = [
  {
    number: "01",
    icon: Box,
    title: "Create delivery",
    description:
      "Customer enters pickup location, destination, package information, payload and preferred delivery time.",
  },
  {
    number: "02",
    icon: MapPinned,
    title: "Plan mission",
    description:
      "DroneOptAI prepares the route and matches the mission with an eligible drone and dispatch hub.",
  },
  {
    number: "03",
    icon: PlaneTakeoff,
    title: "Drone takes off",
    description:
      "The operator dispatches the mission while the customer can follow progress and estimated arrival.",
  },
  {
    number: "04",
    icon: PackageCheck,
    title: "Package delivered",
    description:
      "The package reaches its destination and the mission is completed with delivery information recorded.",
  },
];

export const platformFeatures = [
  {
    icon: Route,
    title: "Route visibility",
    description:
      "Follow drone delivery routes and important mission checkpoints.",
  },
  {
    icon: BatteryCharging,
    title: "Energy monitoring",
    description:
      "Monitor battery status and estimated energy consumption during missions.",
  },
  {
    icon: ShieldCheck,
    title: "Operational awareness",
    description:
      "Keep customers and operators informed throughout the delivery lifecycle.",
  },
];