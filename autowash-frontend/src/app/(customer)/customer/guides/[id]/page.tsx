"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { useAuthStore } from "@/features/auth/store/auth.store";
import {
  useBlogArticle,
  useBlogComments,
  useBlogLikeSummary,
  useToggleBlogLike,
  usePostBlogComment,
} from "@/features/blog/hooks/use-blog";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  User,
  BookOpen,
  X,
  Send,
} from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { cn } from "@/shared/lib/utils";

export default function GuideDetailPage() {
  const { id: slug } = useParams<{ id: string }>();
  const router = useRouter();
  const { language } = useLanguageStore();
  const user = useAuthStore((state) => state.user);
  const t = (vi: string, en: string) => translate(language, vi, en);

  const { data: guide, isLoading, error } = useBlogArticle(slug);

  const { data: commentsPage, isLoading: loadingComments } = useBlogComments(guide?.id ?? "", 1, 50);
  const comments = commentsPage?.content ?? [];

  const { data: likeSummary } = useBlogLikeSummary(guide?.id ?? "", !!guide?.id);
  const toggleLikeMutation = useToggleBlogLike(guide?.id ?? "");
  const postCommentMutation = usePostBlogComment(guide?.id ?? "");

  // optimistic like count
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null);

  // comment popup state
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [newComment, setNewComment] = useState("");

  const isLiked = optimisticLiked !== null ? optimisticLiked : (likeSummary?.hasLiked ?? false);
  const likeCount = optimisticCount !== null ? optimisticCount : (likeSummary?.totalLikes ?? guide?.likeCount ?? 0);

  const handleLike = () => {
    if (!user) {
      alert(t("Vui lòng đăng nhập để thích bài viết", "Please log in to like this article"));
      return;
    }
    // Optimistic update
    const newLiked = !isLiked;
    const newCount = newLiked ? likeCount + 1 : likeCount - 1;
    setOptimisticLiked(newLiked);
    setOptimisticCount(newCount);

    toggleLikeMutation.mutate(undefined, {
      onSuccess: (data) => {
        // Sync with server response
        setOptimisticLiked(data.hasLiked);
        setOptimisticCount(data.totalLikes);
      },
      onError: () => {
        // Revert on error
        setOptimisticLiked(!newLiked);
        setOptimisticCount(likeCount);
      },
    });
  };

  const handleOpenComment = () => {
    if (!user) {
      alert(t("Vui lòng đăng nhập để bình luận", "Please log in to comment"));
      return;
    }
    setShowCommentPopup(true);
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    postCommentMutation.mutate(newComment.trim(), {
      onSuccess: () => {
        setNewComment("");
        setShowCommentPopup(false);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="text-xs font-bold text-slate-400">{t("Đang tải bài viết...", "Loading article...")}</span>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 text-center">
        <BookOpen className="h-12 w-12 text-slate-300" />
        <h2 className="text-lg font-black text-slate-800">{t("Không tìm thấy bài viết", "Article not found")}</h2>
        <Button onClick={() => router.push("/customer/guides")} className="rounded-xl font-bold">
          {t("Quay lại danh sách", "Back to list")}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen px-4 py-8 sm:px-6 lg:px-8 bg-slate-50">
      <div className="relative mx-auto flex max-w-5xl flex-col gap-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
          <Link href="/customer/home" className="hover:text-primary">{t("Trang chủ", "Home")}</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/customer/guides" className="hover:text-primary">{t("Cẩm nang", "Guides")}</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-primary font-black truncate max-w-[200px]">{guide.title}</span>
        </nav>

        {/* Header */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
              <BadgeCheck className="h-3.5 w-3.5 text-amber-500" /> {guide.category.name}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600">
              <Eye className="h-3.5 w-3.5" /> {guide.viewCount} {t("lượt xem", "views")}
            </span>
          </div>

          <h1 className="max-w-4xl text-2xl sm:text-3xl font-black leading-tight tracking-tight text-primary">
            {guide.title}
          </h1>

          {guide.excerpt && (
            <p className="max-w-3xl text-sm leading-relaxed text-slate-500 font-semibold">{guide.excerpt}</p>
          )}

          {/* Author info */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-200/60 py-3.5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white">
                <User className="h-5 w-5 text-amber-200" />
              </div>
              <div className="leading-tight">
                <div className="text-xs font-black text-primary">{guide.authorName}</div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                  <Clock className="h-3 w-3" />
                  {guide.publishedAt
                    ? new Date(guide.publishedAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")
                    : new Date(guide.createdAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")}
                </div>
              </div>
            </div>
            <button className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-primary hover:text-primary">
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* Cover Image */}
        {guide.thumbnailUrl && (
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/50 shadow-sm">
            <img src={guide.thumbnailUrl} alt={guide.title} className="h-[360px] w-full object-cover" />
          </div>
        )}

        {/* Content */}
        <div className="grid gap-8 lg:grid-cols-[1fr_280px] mt-2">
          <article className="space-y-6">

            <div className="text-sm leading-relaxed text-slate-700 space-y-4 whitespace-pre-wrap font-semibold">
              {guide.content}
            </div>

            {/* CTA */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-primary p-6 text-white shadow-lg">
              <div>
                <h4 className="text-base font-black text-white tracking-tight">
                  {t("Đặt lịch chăm sóc xe chuyên nghiệp", "Book Professional Car Detailing")}
                </h4>
                <p className="mt-1 text-[11px] text-white/70 font-semibold">
                  {t("Chuyên gia Aura sẵn sàng phục vụ bạn.", "Aura experts are ready to serve you.")}
                </p>
              </div>
              <Button asChild className="rounded-xl bg-amber-500 hover:bg-amber-400 text-primary font-black text-xs px-5">
                <Link href="/customer/services">
                  {t("Đặt lịch ngay", "Book Now")} <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>

            {/* ── Like & Comment action bar ── */}
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/60 bg-white px-5 py-3.5 shadow-sm">
              <div className="flex items-center gap-3">

                {/* Like button */}
                <button
                  type="button"
                  onClick={handleLike}
                  disabled={toggleLikeMutation.isPending}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all border",
                    isLiked
                      ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                  )}
                >
                  <Heart
                    className={cn("h-4 w-4 transition-all", isLiked ? "fill-rose-500 text-rose-500 scale-110" : "")}
                  />
                  <span>{likeCount}</span>
                  <span className="hidden sm:inline">{t("Thích", "Like")}</span>
                </button>

                {/* Comment button */}
                <button
                  type="button"
                  onClick={handleOpenComment}
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>{comments.length}</span>
                  <span className="hidden sm:inline">{t("Bình luận", "Comment")}</span>
                </button>
              </div>

              <Link
                href="/customer/guides"
                className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> {t("Quay lại", "Back")}
              </Link>
            </div>

            {/* Comment list */}
            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                {t("Bình luận", "Comments")} ({comments.length})
              </h4>

              {loadingComments ? (
                <div className="flex justify-center py-6">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 font-semibold">
                  {t("Chưa có bình luận. Hãy là người đầu tiên!", "No comments yet. Be the first!")}
                </div>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.commentId} className="flex gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 shrink-0 flex items-center justify-center font-black text-xs text-primary">
                        {comment.authorAvatarUrl ? (
                          <img src={comment.authorAvatarUrl} alt={comment.authorName} className="h-full w-full object-cover rounded-lg" />
                        ) : (
                          comment.authorName[0]?.toUpperCase() || "U"
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800">{comment.authorName}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            {new Date(comment.createdAt).toLocaleString(language === "vi" ? "vi-VN" : "en-US")}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </article>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-3xl border border-slate-200/50 bg-white p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-black text-primary uppercase tracking-wider pb-2 border-b border-slate-100">
                {t("Thông tin bài viết", "Article Info")}
              </h4>
              <div className="space-y-2 text-xs font-semibold text-slate-500">
                <div className="flex justify-between">
                  <span>{t("Danh mục:", "Category:")}</span>
                  <span className="font-bold text-primary">{guide.category.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("Lượt xem:", "Views:")}</span>
                  <span className="font-bold text-slate-800">{guide.viewCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("Lượt thích:", "Likes:")}</span>
                  <span className="font-bold text-rose-600">{likeCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("Bình luận:", "Comments:")}</span>
                  <span className="font-bold text-slate-800">{comments.length}</span>
                </div>
              </div>

              {/* Quick Like & Comment in sidebar */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleLike}
                  disabled={toggleLikeMutation.isPending}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition border",
                    isLiked ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <Heart className={cn("h-3.5 w-3.5", isLiked && "fill-rose-500 text-rose-500")} />
                  {t("Thích", "Like")}
                </button>
                <button
                  type="button"
                  onClick={handleOpenComment}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {t("Bình luận", "Comment")}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Comment Popup ── */}
      {showCommentPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Popup header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                {t("Viết bình luận", "Write a Comment")}
              </h3>
              <button
                type="button"
                onClick={() => setShowCommentPopup(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Article title preview */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                {t("Bài viết", "Article")}
              </p>
              <p className="text-xs font-black text-slate-700 line-clamp-1">{guide.title}</p>
            </div>

            {/* Comment form */}
            <form onSubmit={handleSubmitComment} className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                {/* User avatar */}
                <div className="h-8 w-8 rounded-lg bg-primary/10 shrink-0 flex items-center justify-center font-black text-xs text-primary">
                  {user?.fullName?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-xs font-black text-slate-700">{user?.fullName}</p>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={t("Chia sẻ suy nghĩ của bạn về bài viết này...", "Share your thoughts about this article...")}
                    className="w-full min-h-[120px] rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none font-medium text-slate-700 placeholder:text-slate-400"
                    disabled={postCommentMutation.isPending}
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-slate-400">
                  {newComment.length}/1000 {t("ký tự", "characters")}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCommentPopup(false)}
                    className="rounded-xl text-xs font-bold h-9 px-4"
                  >
                    {t("Hủy", "Cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={postCommentMutation.isPending || !newComment.trim() || newComment.length > 1000}
                    className="rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold h-9 px-4 gap-1.5"
                  >
                    {postCommentMutation.isPending ? (
                      <><div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" /> {t("Đang gửi...", "Posting...")}</>
                    ) : (
                      <><Send className="h-3.5 w-3.5" /> {t("Gửi bình luận", "Post Comment")}</>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
