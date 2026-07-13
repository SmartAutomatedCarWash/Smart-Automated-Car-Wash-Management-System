"use client";

import { useQuery } from "@tanstack/react-query";
import { getPublicSettings, type PublicSettings } from "@/features/settings/lib/public-settings-service";
import type { ApiErrorResponse } from "@/shared/types/api.types";

export const publicSettingsQueryKey = () => ["settings", "public"] as const;

export function usePublicSettings() {
  return useQuery<PublicSettings, ApiErrorResponse>({
    queryKey: publicSettingsQueryKey(),
    queryFn: getPublicSettings,
    // Cache 5 minutes — settings change rarely
    staleTime: 5 * 60 * 1000,
  });
}
