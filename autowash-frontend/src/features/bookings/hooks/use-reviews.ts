"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  submitBookingReview,
  getFeaturedReviews,
  checkBookingReview,
  getReviewStats,
  listAdminReviews,
  updateReviewFeatured,
  CreateReviewRequest,
  ReviewResponse,
  ReviewStatsResponse,
} from "@/features/bookings/lib/review-service";
import type { ApiErrorResponse } from "@/shared/types/api.types";

export const reviewFeaturedQueryKey = () => ["reviews", "featured"];
export const reviewStatsQueryKey = () => ["admin", "reviews", "stats"];
export const reviewListQueryKey = (params: any) => ["admin", "reviews", "list", params];
export const bookingReviewCheckQueryKey = (bookingId: string) => ["reviews", "booking-check", bookingId];

// Customer hooks
export function useSubmitBookingReview() {
  const queryClient = useQueryClient();
  return useMutation<ReviewResponse, ApiErrorResponse, CreateReviewRequest>({
    mutationFn: submitBookingReview,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: reviewFeaturedQueryKey() });
      queryClient.invalidateQueries({ queryKey: bookingReviewCheckQueryKey(data.bookingId) });
    },
  });
}

export function useFeaturedReviews() {
  return useQuery<ReviewResponse[], ApiErrorResponse>({
    queryKey: reviewFeaturedQueryKey(),
    queryFn: getFeaturedReviews,
  });
}

export function useBookingReviewCheck(bookingId: string, enabled = true) {
  return useQuery({
    queryKey: bookingReviewCheckQueryKey(bookingId),
    queryFn: () => checkBookingReview(bookingId),
    enabled: enabled && bookingId.length > 0,
  });
}

// Admin hooks
export function useReviewStats() {
  return useQuery<ReviewStatsResponse, ApiErrorResponse>({
    queryKey: reviewStatsQueryKey(),
    queryFn: getReviewStats,
  });
}

export function useAdminReviews(params: {
  rating?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  direction?: string;
}) {
  return useQuery({
    queryKey: reviewListQueryKey(params),
    queryFn: () => listAdminReviews(params),
  });
}

export function useUpdateReviewFeatured() {
  const queryClient = useQueryClient();
  return useMutation<ReviewResponse, ApiErrorResponse, { reviewId: string; featured: boolean }>({
    mutationFn: ({ reviewId, featured }) => updateReviewFeatured(reviewId, featured),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewFeaturedQueryKey() });
      queryClient.invalidateQueries({ queryKey: reviewStatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews", "list"] });
    },
  });
}
