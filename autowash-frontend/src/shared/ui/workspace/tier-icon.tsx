import type { LucideIcon } from "lucide-react";
import { Award, Crown, Gem, Shield, Sparkles } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type TierIconProps = {
  tier?: string | null;
  className?: string;
  iconClassName?: string;
  style?: React.CSSProperties;
};

const TIER_ICON_MAP: Record<string, LucideIcon> = {
  BRONZE: Shield,
  SILVER: Award,
  GOLD: Crown,
  PLATINUM: Sparkles,
  DIAMOND: Gem,
};

export function TierIcon({ tier, className, iconClassName, style }: TierIconProps) {
  const normalizedTier = (tier ?? "BRONZE").toUpperCase();
  const Icon = TIER_ICON_MAP[normalizedTier] ?? Shield;

  return (
    <span
      className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current/15 bg-white/70", className)}
      style={style}
      aria-hidden="true"
    >
      <Icon className={cn("h-4 w-4", iconClassName)} />
    </span>
  );
}
