type VehicleColorOption = {
  value: string;
  label: string;
  hex: string;
  image: string;
  imageFilter?: string;
  imageBackground?: string;
  border?: string;
};

export const VEHICLE_COLOR_OPTIONS: VehicleColorOption[] = [
  {
    value: "White",
    label: "White",
    hex: "#f8fafc",
    image: "/images/vehicles/car-blue.png",
    imageFilter: "grayscale(1) brightness(1.95) contrast(0.9) saturate(0.35)",
    imageBackground: "linear-gradient(135deg,#fbfdff,#eef8ff)",
    border: "#cbd5e1",
  },
  {
    value: "Black",
    label: "Black",
    hex: "#111827",
    image: "/images/vehicles/car-blue.png",
    imageFilter: "grayscale(1) brightness(0.42) contrast(1.5)",
    imageBackground: "linear-gradient(135deg,#f8fafc,#e2e8f0)",
  },
  {
    value: "Silver",
    label: "Silver",
    hex: "#cbd5e1",
    image: "/images/vehicles/car-blue.png",
    imageFilter: "grayscale(1) brightness(1.35) contrast(0.95)",
    imageBackground: "linear-gradient(135deg,#f8fafc,#edf4fb)",
  },
  {
    value: "Gray",
    label: "Gray",
    hex: "#64748b",
    image: "/images/vehicles/car-blue.png",
    imageFilter: "grayscale(1) brightness(0.9) contrast(1.08)",
    imageBackground: "linear-gradient(135deg,#f8fafc,#e5edf5)",
  },
  { value: "Red", label: "Red", hex: "#dc2626", image: "/images/vehicles/car-red.png", imageBackground: "linear-gradient(135deg,#fff7f7,#eef8ff)" },
  { value: "Blue", label: "Blue", hex: "#1d4ed8", image: "/images/vehicles/car-blue.png", imageBackground: "linear-gradient(135deg,#f8fbff,#eef8ff)" },
  {
    value: "Brown",
    label: "Brown",
    hex: "#92400e",
    image: "/images/vehicles/car-yellow.png",
    imageFilter: "hue-rotate(-25deg) saturate(0.85) brightness(0.72) contrast(1.18)",
    imageBackground: "linear-gradient(135deg,#fff8f1,#f5eee7)",
  },
  { value: "Green", label: "Green", hex: "#059669", image: "/images/vehicles/car-green.png", imageBackground: "linear-gradient(135deg,#f0fdf4,#eef8ff)" },
  { value: "Yellow", label: "Yellow", hex: "#facc15", image: "/images/vehicles/car-yellow.png", imageBackground: "linear-gradient(135deg,#fffceb,#eef8ff)" },
  {
    value: "Orange",
    label: "Orange",
    hex: "#f97316",
    image: "/images/vehicles/car-yellow.png",
    imageFilter: "hue-rotate(-18deg) saturate(1.45) brightness(0.98) contrast(1.06)",
    imageBackground: "linear-gradient(135deg,#fff7ed,#eef8ff)",
  },
  {
    value: "Gold",
    label: "Gold",
    hex: "#d4a017",
    image: "/images/vehicles/car-yellow.png",
    imageFilter: "saturate(0.95) brightness(0.88) contrast(1.18)",
    imageBackground: "linear-gradient(135deg,#fff8db,#eef8ff)",
  },
  {
    value: "Beige",
    label: "Beige",
    hex: "#d6c3a5",
    image: "/images/vehicles/car-yellow.png",
    imageFilter: "saturate(0.38) brightness(1.22) contrast(0.88)",
    imageBackground: "linear-gradient(135deg,#fffaf0,#f4f1ea)",
  },
  {
    value: "Navy Blue",
    label: "Navy Blue",
    hex: "#172554",
    image: "/images/vehicles/car-blue.png",
    imageFilter: "brightness(0.62) saturate(1.35) contrast(1.25)",
    imageBackground: "linear-gradient(135deg,#f8fbff,#eaf0ff)",
  },
  {
    value: "Champagne",
    label: "Champagne",
    hex: "#ead7aa",
    image: "/images/vehicles/car-yellow.png",
    imageFilter: "saturate(0.48) brightness(1.32) contrast(0.9)",
    imageBackground: "linear-gradient(135deg,#fffaf0,#eef8ff)",
  },
  {
    value: "Pearl White",
    label: "Pearl White",
    hex: "#fffdf7",
    image: "/images/vehicles/car-blue.png",
    imageFilter: "grayscale(0.8) brightness(2.05) contrast(0.82) saturate(0.28)",
    imageBackground: "linear-gradient(135deg,#ffffff,#edf7ff)",
    border: "#cbd5e1",
  },
  {
    value: "Midnight Black",
    label: "Midnight Black",
    hex: "#020617",
    image: "/images/vehicles/car-blue.png",
    imageFilter: "brightness(0.36) saturate(0.9) contrast(1.65)",
    imageBackground: "linear-gradient(135deg,#f8fafc,#dfe8f3)",
  },
  {
    value: "Other",
    label: "Other color",
    hex: "#94a3b8",
    image: "/images/vehicles/car-blue.png",
    imageFilter: "grayscale(0.55) brightness(1.05) contrast(0.95)",
    imageBackground: "linear-gradient(135deg,#f8fafc,#eef8ff)",
  },
];

export function getVehicleColorOption(color: string | null | undefined) {
  const normalized = color?.trim().toLowerCase();

  return (
    VEHICLE_COLOR_OPTIONS.find((option) => option.value.toLowerCase() === normalized) ??
    VEHICLE_COLOR_OPTIONS[VEHICLE_COLOR_OPTIONS.length - 1]
  );
}
