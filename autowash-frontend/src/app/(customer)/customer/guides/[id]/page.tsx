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
  Bookmark,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  ThumbsUp,
  User,
  BookOpen,
} from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { cn } from "@/shared/lib/utils";
import { notify } from "@/shared/lib/notify";

export default function GuideDetailPage() {
  const { id: slug } = useParams<{ id: string }>();
  const router = useRouter();
  const { language } = useLanguageStore();
  const user = useAuthStore((state) => state.user);

  const t = (vi: string, en: string) => translate(language, vi, en);

  // Fetch article detail
  const { data: guide, isLoading, error } = useBlogArticle(slug);

  // Fetch comments (default page 1)
  const { data: commentsPage, isLoading: loadingComments } = useBlogComments(guide?.id ?? "", 1, 50);
  const comments = commentsPage?.content ?? [];

  // Fetch like status/summary
  const { data: likeSummary } = useBlogLikeSummary(guide?.id ?? "", !!guide?.id);
  const toggleLikeMutation = useToggleBlogLike(guide?.id ?? "");
  const postCommentMutation = usePostBlogComment(guide?.id ?? "");

  const [newComment, setNewComment] = useState("");

  const handleLike = () => {
    if (!user) {
      notify.info(t("Vui lòng đăng nhập để thích bài viết", "Please log in to like this article"));
      return;
    }
    toggleLikeMutation.mutate();
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      notify.info(t("Vui lòng đăng nhập để bình luận", "Please log in to comment"));
      return;
    }
    if (!newComment.trim()) return;
    postCommentMutation.mutate(newComment.trim(), {
      onSuccess: () => {
        setNewComment("");
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
        <BookOpen className="h-12 w-12 text-slate-350" />
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
          <Link href="/customer/home" className="hover:text-primary">
            {t("Trang chủ", "Home")}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/customer/guides" className="hover:text-primary">
            {t("Cẩm nang", "Guides")}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-primary font-black truncate max-w-[200px]">{guide.title}</span>
        </nav>

        {/* Header */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
              <BadgeCheck className="h-3.5 w-3.5 text-amber-500" /> {guide.category.name}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-650">
              <Eye className="h-3.5 w-3.5" /> {guide.viewCount} {t("lượt xem", "views")}
            </span>
          </div>

          <h1 className="max-w-4xl text-2xl sm:text-3xl font-black leading-tight tracking-tight text-primary">
            {guide.title}
          </h1>
          
          {guide.excerpt && (
            <p className="max-w-3xl text-sm leading-relaxed text-slate-500 font-semibold">
              {guide.excerpt}
            </p>
          )}

          {/* Author info */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-200/60 py-3.5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white">
                <User className="h-5 w-5 text-amber-200" />
              </div>
              <div className="leading-tight">
                <div className="text-xs font-black text-primary">
                  {guide.authorName}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                  <Clock className="h-3 w-3" /> 
                  {guide.publishedAt 
                    ? new Date(guide.publishedAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")
                    : new Date(guide.createdAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-primary hover:text-primary">
                <Share2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Cover Image */}
        {guide.thumbnailUrl && (
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/50 shadow-sm">
            <img
              src={guide.thumbnailUrl}
              alt={guide.title}
              className="h-[360px] w-full object-cover"
            />
          </div>
        )}

        {/* Content body layout */}
        <div className="grid gap-8 lg:grid-cols-[1fr_300px] mt-2">
          
          <article className="space-y-6">
            
            {/* Content HTML/Text */}
            <div className="text-sm leading-relaxed text-slate-650 space-y-4 whitespace-pre-wrap font-semibold">
              {guide.content}
            </div>

            {/* Call To Action Block */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-primary p-6 text-white shadow-lg">
              <div>
                <h4 className="text-base font-black text-white tracking-tight">
                  {t("Đặt lịch chăm sóc xe chuyên nghiệp", "Book Professional Car Detailing")}
                </h4>
                <p className="mt-1 text-[11px] text-slate-350 font-semibold">
                  {t("Chuyên gia Aura sẵn sàng phục vụ và nâng tầm đẳng cấp xế yêu của bạn.", "Aura experts are ready to elevate your car beauty experience.")}
                </p>
              </div>
              <Button asChild className="rounded-xl bg-amber-500 hover:bg-amber-500/90 text-primary font-black text-xs px-5">
                <Link href="/customer/services">
                  {t("Đặt lịch ngay", "Book Now")}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>

            {/* Engagement buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/60 pt-5">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleLike}
                  className={cn(
                    "rounded-full h-8 text-[11px] font-bold border-slate-200 transition",
                    likeSummary?.hasLiked ? "text-primary bg-primary/5 border-primary/20" : "text-slate-600 hover:text-primary"
                  )}
                  disabled={toggleLikeMutation.isPending}
                >
                  <ThumbsUp className={cn("h-3 w-3 mr-1.5", likeSummary?.hasLiked && "fill-[#155345]")} /> 
                  {t("Hữu ích", "Helpful")} • {likeSummary?.totalLikes ?? guide.likeCount}
                </Button>
              </div>
              
              <Link
                href="/customer/guides"
                className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> {t("Quay lại cẩm nang", "Back to Guides")}
              </Link>
            </div>

            {/* Interactive Comment Section */}
            <div className="mt-8 space-y-6 border-t border-slate-200/60 pt-6">
              <h4 className="text-base font-black text-primary flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                {t("Bình luận", "Comments")} ({comments.length})
              </h4>

              {/* Comment Input */}
              <form onSubmit={handleAddComment} className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={t("Viết bình luận của bạn...", "Write a comment...")}
                  className="w-full min-h-[80px] rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-[#155345]/20 resize-none font-semibold text-slate-750"
                  disabled={postCommentMutation.isPending}
                />
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    className="rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs px-4"
                    disabled={postCommentMutation.isPending || !newComment.trim()}
                  >
                    {postCommentMutation.isPending ? t("Đang gửi...", "Posting...") : t("Gửi bình luận", "Post Comment")}
                  </Button>
                </div>
              </form>

              {/* Comment List */}
              {loadingComments ? (
                <div className="flex justify-center py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-xs italic text-slate-400 text-center py-4">{t("Chưa có bình luận nào. Hãy là người đầu tiên bình luận!", "No comments yet. Be the first to comment!")}</p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.commentId} className="flex gap-3 bg-white/50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="h-8 w-8 rounded-lg bg-slate-200 shrink-0 overflow-hidden flex items-center justify-center font-black text-xs text-slate-650">
                        {comment.authorAvatarUrl ? (
                          <img src={comment.authorAvatarUrl} alt={comment.authorName} className="h-full w-full object-cover" />
                        ) : (
                          comment.authorName[0]?.toUpperCase() || "C"
                        )}
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800">{comment.authorName}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            {new Date(comment.createdAt).toLocaleString(language === "vi" ? "vi-VN" : "en-US")}
                          </span>
                        </div>
                        <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </article>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
            {/* Info Card */}
            <div className="rounded-3xl border border-slate-200/50 bg-white p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-black text-primary uppercase tracking-wider pb-2 border-b border-slate-100">
                {t("Thông tin bài viết", "Article Info")}
              </h4>
              <div className="space-y-2 text-xs font-semibold text-slate-550">
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
                  <span className="font-bold text-slate-800">{likeSummary?.totalLikes ?? guide.likeCount}</span>
                </div>
              </div>
            </div>
          </aside>

        </div>

      </div>
    </div>
  );
}
