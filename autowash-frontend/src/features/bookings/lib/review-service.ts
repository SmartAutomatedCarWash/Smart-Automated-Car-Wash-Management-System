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
  createdAt: string;
}

export function submitBookingReview(payload: CreateReviewRequest) {
  return apiRequest<ReviewResponse, CreateReviewRequest>({
    method: "POST",
    url: "/reviews",
    data: payload,
  });
}

export async function getFeaturedReviews(): Promise<ReviewResponse[]> {
  const response = await apiClient.get<{ data: ReviewResponse[] }>("/reviews/featured");
  return response.data.data;
}

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
