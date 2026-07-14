"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { useBlogArticles, useBlogCategories } from "@/features/blog/hooks/use-blog";
import {
  ChevronRight,
  CircleDot,
  Eye,
  MessageSquare,
  ThumbsUp,
  BookOpen,
} from "lucide-react";
import { Card } from "@/shared/ui/ui/card";
import { cn } from "@/shared/lib/utils";

export default function GuidesPage() {
  const { language } = useLanguageStore();
  const t = (vi: string, en: string) => translate(language, vi, en);

  const { data: articles = [], isLoading: loadingArticles } = useBlogArticles();
  const { data: categories = [], isLoading: loadingCategories } = useBlogCategories();

  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredArticles = useMemo(() => {
    if (activeCategory === "all") return articles;
    return articles.filter(article => article.category.id === activeCategory);
  }, [articles, activeCategory]);

  return (
    <div className="relative min-h-screen px-4 py-8 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#05080d]">
      <div className="relative mx-auto flex max-w-5xl flex-col gap-6">
        
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
          <Link href="/customer/home" className="hover:text-primary">
            {t("Trang chủ", "Home")}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-primary font-black">{t("Cẩm nang", "Guides")}</span>
        </nav>

        {/* Title */}
        <header className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight text-primary">
            {t("Cẩm nang Chăm sóc Xe chuyên sâu", "Expert Car Care Guides")}
          </h1>
        </header>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200">
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border whitespace-nowrap",
              activeCategory === "all"
                ? "bg-primary text-white border-primary"
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 dark:hover:bg-slate-800"
            )}
          >
            {t("Tất cả", "All")}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border whitespace-nowrap",
                activeCategory === cat.id
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 dark:hover:bg-slate-800"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Articles List */}
        {loadingArticles ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="text-xs font-bold text-slate-400">{t("Đang tải bài viết...", "Loading articles...")}</span>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#071016]/90 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-4">
            <BookOpen className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
            <h3 className="text-base font-black text-slate-800 dark:text-slate-200">{t("Không tìm thấy bài viết nào", "No articles found")}</h3>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">{t("Hãy quay lại sau hoặc chọn danh mục khác.", "Please check back later or select another category.")}</p>
          </div>
        ) : (
          <div className="grid gap-5">
            {filteredArticles.map((post) => (
              <Card
                key={post.id}
                className="overflow-hidden rounded-3xl border border-slate-200/50 dark:border-slate-800/60 bg-white dark:bg-[#071016]/90 p-5 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="flex flex-col gap-5 sm:flex-row">
                  <Link
                    href={`/customer/guides/${post.slug}`}
                    className="relative h-40 w-full sm:w-48 rounded-2xl overflow-hidden shrink-0 block bg-slate-100 dark:bg-slate-900"
                  >
                    {post.thumbnailUrl ? (
                      <img src={post.thumbnailUrl} alt={post.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-300">
                        <BookOpen className="h-10 w-10" />
                      </div>
                    )}
                    <span className="absolute top-2.5 left-2.5 bg-black/75 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white">
                      {post.category.name}
                    </span>
                  </Link>

                  <div className="flex flex-col justify-between flex-1 py-1">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
                        <span>{post.authorName}</span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" /> {post.viewCount} {t("lượt xem", "views")}
                        </span>
                      </div>
                      <Link href={`/customer/guides/${post.slug}`} className="hover:underline block">
                        <h4 className="text-base font-black text-slate-800 dark:text-slate-100 leading-tight">
                          {post.title}
                        </h4>
                      </Link>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                        {post.excerpt}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold px-2 py-1">
                          <ThumbsUp className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                          {post.likeCount}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold px-2 py-1">
                          <MessageSquare className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                          {post.commentCount}
                        </span>
                      </div>

                      <Link
                        href={`/customer/guides/${post.slug}`}
                        className="text-xs font-black text-primary flex items-center gap-1 hover:underline"
                      >
                        {t("Xem chi tiết", "Read Detail")}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
