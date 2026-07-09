"use client";

import { useState } from "react";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import {
  useAdminReviews,
  useReviewStats,
  useUpdateReviewFeatured,
} from "@/features/bookings/hooks/use-reviews";
import {
  Star,
  Check,
  X,
  MessageSquare,
  ThumbsUp,
  Award,
  AlertTriangle,
  FileSpreadsheet,
  Calendar,
  Filter,
  ArrowUpDown,
  Image,
  Layers3,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { Button } from "@/shared/ui/ui/button";
import { Badge } from "@/shared/ui/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/ui/table";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";
import { getDisplayErrorMessage } from "@/shared/lib/api-errors";

export function AdminReviewManagementPage() {
  const { language } = useLanguageStore();
  const t = (vi: string, en: string) => translate(language, vi, en);

  // States for query filters and pagination
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState("createdAt");
  const [direction, setDirection] = useState("desc");

  // Call Hooks
  const reviewsParams = {
    rating: ratingFilter === "all" ? undefined : Number(ratingFilter),
    page,
    limit,
    sortBy,
    direction,
  };

  const { data: listData, isLoading: loadingReviews, refetch: refetchReviews } = useAdminReviews(reviewsParams);
  const { data: stats, isLoading: loadingStats } = useReviewStats();
  const toggleFeaturedMutation = useUpdateReviewFeatured();

  const reviews = listData?.data ?? [];
  const meta = listData?.pagination;

  const handleToggleFeatured = async (reviewId: string, currentFeatured: boolean) => {
    try {
      await toggleFeaturedMutation.mutateAsync({ reviewId, featured: !currentFeatured });
      toast.success(t("Cập nhật trạng thái nổi bật thành công!", "Featured status updated successfully!"));
      refetchReviews();
    } catch (error) {
      toast.error(getDisplayErrorMessage(error));
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setDirection("desc");
    }
    setPage(1);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            {t("Quản lý Đánh giá & Phản hồi", "Reviews & Feedback Management")}
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            {t("Phân tích dữ liệu phản hồi, kiểm duyệt và đẩy các đánh giá nổi bật lên trang chủ.", "Analyze feedback ratings, moderate reviews, and feature top feedback on home page.")}
          </p>
        </div>
      </div>

      {/* Analytics Cards */}
      {loadingStats ? (
        <div className="grid gap-4 md:grid-cols-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-3xl bg-slate-100 border border-slate-200" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-3xl border-slate-200 shadow-sm bg-gradient-to-tr from-sky-50 to-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t("Tổng đánh giá", "Total Reviews")}
              </CardTitle>
              <MessageSquare className="h-5 w-5 text-sky-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">{stats.totalReviews}</div>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                {t("Đánh giá thực tế từ khách hàng", "Real verified reviews")}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm bg-gradient-to-tr from-amber-50 to-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t("Điểm trung bình", "Average Rating")}
              </CardTitle>
              <div className="flex items-center text-amber-500">
                <Star className="h-5 w-5 fill-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">
                {stats.averageRating ? stats.averageRating.toFixed(1) : "0.0"}/5.0
              </div>
              <div className="flex gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "h-3 w-3",
                      star <= Math.round(stats.averageRating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-200"
                    )}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm bg-gradient-to-tr from-emerald-50 to-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t("Đánh giá tích cực (4-5★)", "Positive Reviews (4-5★)")}
              </CardTitle>
              <ThumbsUp className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">
                {((stats.ratingDistribution?.[5] ?? 0) + (stats.ratingDistribution?.[4] ?? 0))}
              </div>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                {stats.totalReviews > 0
                  ? `${(((stats.ratingDistribution?.[5] ?? 0) + (stats.ratingDistribution?.[4] ?? 0)) / stats.totalReviews * 100).toFixed(0)}% ${t("trên tổng số", "of total reviews")}`
                  : `0% ${t("trên tổng số", "of total reviews")}`}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm bg-gradient-to-tr from-teal-50 to-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t("Đang hiển thị nổi bật", "Featured Reviews")}
              </CardTitle>
              <Award className="h-5 w-5 text-teal-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">{stats.featuredReviewsCount}</div>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                {t("Hiển thị trực tiếp ở trang chủ", "Displayed on the home landing page")}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Star distribution */}
      {stats && stats.totalReviews > 0 && (
        <Card className="rounded-3xl border-slate-200/60 shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-800">
              {t("Phân bố số sao", "Rating Distribution")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[5, 4, 3, 2, 1].map((starsNum) => {
              const count = stats.ratingDistribution?.[starsNum] ?? 0;
              const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
              return (
                <div key={starsNum} className="flex items-center gap-3 text-xs">
                  <span className="w-8 font-bold text-slate-600 flex items-center gap-1">
                    {starsNum} <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                  </span>
                  <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-bold text-slate-500">
                    {count} ({percentage.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Main Reviews Panel */}
      <Card className="rounded-3xl border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-slate-50/50">
          <div>
            <CardTitle className="text-base font-black text-slate-900">{t("Danh sách Đánh giá", "Reviews List")}</CardTitle>
            <CardDescription className="text-xs font-semibold">{t("Quản lý trạng thái và duyệt đánh giá.", "Manage status and moderate reviews.")}</CardDescription>
          </div>

          {/* Filtering */}
          <div className="flex flex-wrap gap-2">
            <Select value={ratingFilter} onValueChange={(val) => { setRatingFilter(val); setPage(1); }}>
              <SelectTrigger className="w-[140px] rounded-xl bg-white text-xs font-bold border-slate-200">
                <SelectValue placeholder={t("Lọc số sao", "Filter rating")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("Tất cả số sao", "All Ratings")}</SelectItem>
                <SelectItem value="5">5 {t("Sao", "Stars")}</SelectItem>
                <SelectItem value="4">4 {t("Sao", "Stars")}</SelectItem>
                <SelectItem value="3">3 {t("Sao", "Stars")}</SelectItem>
                <SelectItem value="2">2 {t("Sao", "Stars")}</SelectItem>
                <SelectItem value="1">1 {t("Sao", "Stars")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loadingReviews ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <span className="text-xs font-bold text-slate-400">{t("Đang tải dữ liệu...", "Loading reviews...")}</span>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <Star className="mx-auto h-12 w-12 text-slate-350" />
              <h3 className="text-base font-black text-slate-700">{t("Không tìm thấy đánh giá nào", "No reviews found")}</h3>
              <p className="text-xs text-slate-400 font-semibold">{t("Hãy thử đổi bộ lọc sao khác.", "Try changing the rating filter.")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700 text-xs tracking-wider">
                      {t("Khách hàng", "Customer")}
                    </TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs tracking-wider">
                      {t("Mã lịch đặt", "Booking ID")}
                    </TableHead>
                    <TableHead
                      className="font-bold text-slate-700 text-xs tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort("rating")}
                    >
                      <div className="flex items-center gap-1">
                        {t("Đánh giá", "Rating")}
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs tracking-wider">
                      {t("Nhận xét", "Comment")}
                    </TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs tracking-wider">
                      {t("Ảnh đính kèm", "Images")}
                    </TableHead>
                    <TableHead
                      className="font-bold text-slate-700 text-xs tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort("createdAt")}
                    >
                      <div className="flex items-center gap-1">
                        {t("Thời gian", "Created At")}
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs tracking-wider text-right">
                      {t("Nổi bật", "Featured")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((rev) => (
                    <TableRow key={rev.id} className="hover:bg-slate-50/30">
                      <TableCell className="font-bold text-slate-800 text-xs">
                        {rev.customerName}
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-slate-400 font-bold">
                        {rev.bookingId}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-black text-slate-800 text-xs">{rev.rating}</span>
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs text-xs font-semibold text-slate-600 truncate" title={rev.comment}>
                        {rev.comment || <em className="text-slate-350">{t("Không có nhận xét", "No comment")}</em>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          {rev.beforeImageUrl && (
                            <a
                              href={rev.beforeImageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="relative h-10 w-10 overflow-hidden rounded-lg border border-slate-200 block shrink-0 hover:scale-105 transition-transform"
                            >
                              <img src={rev.beforeImageUrl} alt="before" className="h-full w-full object-cover" />
                              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] font-black text-white text-center py-0.5 uppercase tracking-wider">
                                Before
                              </span>
                            </a>
                          )}
                          {rev.afterImageUrl && (
                            <a
                              href={rev.afterImageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="relative h-10 w-10 overflow-hidden rounded-lg border border-slate-200 block shrink-0 hover:scale-105 transition-transform"
                            >
                              <img src={rev.afterImageUrl} alt="after" className="h-full w-full object-cover" />
                              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] font-black text-white text-center py-0.5 uppercase tracking-wider">
                                After
                              </span>
                            </a>
                          )}
                          {!rev.beforeImageUrl && !rev.afterImageUrl && (
                            <span className="text-[10px] font-bold text-slate-400">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 font-semibold text-xs">
                        {new Date(rev.createdAt).toLocaleString(language === "vi" ? "vi-VN" : "en-US")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleFeatured(rev.id, rev.featured)}
                          className={cn(
                            "rounded-full p-1.5 h-8 w-8",
                            rev.featured
                              ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
                              : "bg-slate-100 text-slate-400 hover:bg-slate-250"
                          )}
                        >
                          <Award className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {/* Pagination controls */}
        {meta && meta.totalPages > 1 && (
          <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-500">
              {t("Trang", "Page")} {meta.page} / {meta.totalPages} ({meta.total} {t("kết quả", "results")})
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-bold"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={meta.page <= 1}
              >
                {t("Trước", "Previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-bold"
                onClick={() => setPage((prev) => Math.min(prev + 1, meta.totalPages))}
                disabled={!meta.hasMore}
              >
                {t("Sau", "Next")}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
