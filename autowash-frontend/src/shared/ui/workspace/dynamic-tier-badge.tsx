import { useTierStyle } from "@/shared/lib/tier-styles";
import { Badge } from "@/shared/ui/ui/badge";
import { cn } from "@/shared/lib/utils";

export function DynamicTierBadge({ tier, className, children }: { tier: string; className?: string; children?: React.ReactNode }) {
  const { badge } = useTierStyle(tier);
  
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm", className)}
      style={badge}
    >
      {children ?? tier}
    </Badge>
  );
}
