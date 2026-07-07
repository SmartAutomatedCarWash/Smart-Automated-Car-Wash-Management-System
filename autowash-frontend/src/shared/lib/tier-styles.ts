import { useTierStore } from "@/shared/store/tier.store";

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : null;
}

export function generateTierBadgeStyle(hexCode?: string | null) {
  const hex = hexCode || "#cbd5e1"; // slate-300 default
  return {
    color: hex,
    borderColor: hex,
    backgroundColor: `${hex}1A`, // 10% opacity
  };
}

export function generateTierGradientStyle(hexCode?: string | null) {
  const hex = hexCode || "#cbd5e1";
  return {
    background: `linear-gradient(135deg, ${hex}, ${hex}cc, ${hex}99)`,
    boxShadow: `0 4px 14px 0 ${hex}40`,
  };
}

// Generate the metallic style by tinting white/dark with the base hex
export function generateTierMetalStyle(hexCode?: string | null) {
  const hex = hexCode || "#cbd5e1";
  
  // Creates a multi-stop gradient for a metal shine effect based on the hex
  const surface = `linear-gradient(135deg, ${hex}11 0%, ${hex}44 42%, ${hex}66 76%, ${hex}22 100%)`;
  const progress = `linear-gradient(90deg, ${hex}aa 0%, ${hex}ee 42%, ${hex}ff 62%, ${hex}cc 100%)`;
  
  return {
    surface,
    progress,
    text: hex,
    softText: `${hex}bb`,
    border: `${hex}aa`,
    ring: `${hex}aa`,
    glowVar: `${hex}aa`,
  };
}

export function useTierStyle(tierCode?: string | null) {
  const getTierColor = useTierStore((state) => state.getTierColor);
  const hex = getTierColor(tierCode);
  return {
    badge: generateTierBadgeStyle(hex),
    gradient: generateTierGradientStyle(hex),
    metal: generateTierMetalStyle(hex),
    hex,
  };
}
