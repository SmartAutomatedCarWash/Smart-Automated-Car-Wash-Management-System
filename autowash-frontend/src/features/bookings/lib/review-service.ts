import { apiClient, apiRequest } from "@/shared/lib/api";

export interface CreateReviewRequest {
  bookingId: string;
  rating: number;
  comment: string;
  beforeImageUrl?: string | null;
  afterImageUrl?: string | null;
}

export interface ReviewResponse {
  id: string;
  bookingId: string;
  rating: number;
  comment: string;
  customerName: string;
  beforeImageUrl?: string | null;
  afterImageUrl?: string | null;
  featured: boolean;
  createdAt: string;
}

export interface ReviewStatsResponse {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  featuredReviewsCount: number;
}

export interface ReviewPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginatedReviewsResponse {
  content: ReviewResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface BookingReviewCheckResponse {
  hasReview: boolean;
  reviewDetail: ReviewResponse | null;
}

// Submit booking review
export function submitBookingReview(payload: CreateReviewRequest) {
  return apiRequest<ReviewResponse, CreateReviewRequest>({
    method: "POST",
    url: "/reviews",
    data: payload,
  });
}

// Get featured public reviews
export async function getFeaturedReviews(): Promise<ReviewResponse[]> {
  const response = await apiClient.get<{ data: ReviewResponse[] }>("/reviews/featured");
  return response.data.data;
}

// Check booking review status
export async function checkBookingReview(bookingId: string): Promise<BookingReviewCheckResponse> {
  const response = await apiClient.get<{ data: BookingReviewCheckResponse }>(`/reviews/bookings/${bookingId}`);
  return response.data.data;
}

// Upload review image
export async function uploadReviewImage(file: File): Promise<{ url: string; fileName: string; size: number }> {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<{ url: string; fileName: string; size: number }, FormData>({
    method: "POST",
    url: "/uploads/review-images",
    data: formData,
    headers: { "Content-Type": "multipart/form-data" },
  });
}

// ADMIN APIS
export async function getReviewStats(): Promise<ReviewStatsResponse> {
  const response = await apiClient.get<{ data: ReviewStatsResponse }>("/admin/reviews/stats");
  return response.data.data;
}

export async function listAdminReviews(params: {
  rating?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  direction?: string;
}): Promise<{ data: ReviewResponse[]; pagination: ReviewPaginationMeta }> {
  const response = await apiClient.get<{ data: ReviewResponse[]; pagination: ReviewPaginationMeta }>("/admin/reviews", {
    params,
  });
  return response.data;
}

export function updateReviewFeatured(reviewId: string, featured: boolean) {
  return apiRequest<ReviewResponse, { featured: boolean }>({
    method: "PATCH",
    url: `/admin/reviews/${reviewId}/featured`,
    data: { featured },
  });
}
