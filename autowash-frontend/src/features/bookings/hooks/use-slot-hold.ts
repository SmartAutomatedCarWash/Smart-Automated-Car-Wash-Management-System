"use client";

import { useMutation } from "@tanstack/react-query";
import { holdBookingSlot, releaseBookingSlot } from "@/features/bookings/lib/booking-service";
import type { HoldSlotRequest, HoldSlotResponse } from "@/entities/bookings";
import type { ApiErrorResponse } from "@/shared/types/api.types";

export function useSlotHold() {
  const holdMutation = useMutation<HoldSlotResponse, ApiErrorResponse, HoldSlotRequest>({
    mutationFn: holdBookingSlot,
  });
  const releaseMutation = useMutation<unknown, ApiErrorResponse, HoldSlotRequest>({
    mutationFn: releaseBookingSlot,
  });

  return {
    holdSlot: holdMutation.mutateAsync,
    releaseSlot: releaseMutation.mutateAsync,
    isHolding: holdMutation.isPending,
    isReleasing: releaseMutation.isPending,
    holdError: holdMutation.error,
    releaseError: releaseMutation.error,
  };
}
