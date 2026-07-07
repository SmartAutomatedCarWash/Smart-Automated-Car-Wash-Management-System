import { create } from "zustand";
import { apiRequest } from "@/shared/lib/api";

export type TierConfig = {
  tier: string;
  name: string;
  minPoints: number;
  pointMultiplier: number;
  priorityScore: number;
  rankOrder: number;
  systemTier: boolean;
  imageUrl?: string | null;
  active: boolean;
};

interface TierState {
  tiers: TierConfig[];
  isLoaded: boolean;
  fetchTiers: () => Promise<void>;
  getTierColor: (tierCode?: string | null) => string;
}

export const useTierStore = create<TierState>((set, get) => ({
  tiers: [],
  isLoaded: false,
  fetchTiers: async () => {
    if (get().isLoaded) return;
    try {
      const tiers = await apiRequest<TierConfig[]>({ url: "/tiers", method: "GET" });
      set({ tiers, isLoaded: true });
    } catch (error) {
      console.error("Failed to fetch public tiers", error);
    }
  },
  getTierColor: (tierCode) => {
    if (!tierCode) return "#cbd5e1"; // default slate-300
    const tier = get().tiers.find((t) => t.tier === tierCode);
    if (tier?.imageUrl && tier.imageUrl.startsWith("#")) {
      return tier.imageUrl;
    }
    // Fallbacks if not set in DB
    const fallbacks: Record<string, string> = {
      BRONZE: "#B07D4B",
      SILVER: "#94A3B8",
      GOLD: "#EAB308",
      PLATINUM: "#64748B",
      DIAMOND: "#A855F7",
    };
    return fallbacks[tierCode] || "#cbd5e1";
  },
}));
