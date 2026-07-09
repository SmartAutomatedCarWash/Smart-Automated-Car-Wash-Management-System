"use client";

import { useState } from "react";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import {
  useAdminArticles,
  useAdminCategories,
  useCreateAdminArticle,
  useUpdateAdminArticle,
  useDeleteAdminArticle,
  useCreateAdminCategory,
  useUpdateAdminCategory,
  useDeleteAdminCategory,
  useBlogComments,
  useDeleteAdminComment,
} from "@/features/blog/hooks/use-blog";
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  FileText,
  FolderOpen,
  Eye,
  ThumbsUp,
  MessageCircle,
  X,
  Lock,
} from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { Input } from "@/shared/ui/ui/input";

export function AdminBlogManagementPage() {
  const { language } = useLanguageStore();
  const t = (vi: string, en: string) => translate(language, vi, en);

  const { data: articles = [], isLoading: loadingArticles } = useAdminArticles();
  const { data: categories = [], isLoading: loadingCategories } = useAdminCategories();

  const createArtMutation = useCreateAdminArticle();
  const updateArtMutation = useUpdateAdminArticle("");
  const deleteArtMutation = useDeleteAdminArticle();

  const createCatMutation = useCreateAdminCategory();
  const updateCatMutation = useUpdateAdminCategory("");
  const deleteCatMutation = useDeleteAdminCategory();

  // Active tabs
  const [activeTab, setActiveTab] = useState<"articles" | "categories" | "moderation">("articles");

  // Article form state
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [artTitle, setArtTitle] = useState("");
  const [artSlug, setArtSlug] = useState("");
  const [artCategoryId, setArtCategoryId] = useState("");
  const [artExcerpt, setArtExcerpt] = useState("");
  const [artContent, setArtContent] = useState("");
  const [artThumbnail, setArtThumbnail] = useState("");
  const [artStatus, setArtStatus] = useState<"DRAFT" | "PUBLISHED" | "HIDDEN">("DRAFT");

  // Category form state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catDesc, setCatDesc] = useState("");

  // Comment moderation state
  const [selectedArticleId, setSelectedArticleId] = useState<string>("");
  const { data: commentsPage, refetch: refetchComments } = useBlogComments(selectedArticleId, 1, 100);
  const deleteCommentMutation = useDeleteAdminComment(selectedArticleId);
  const comments = commentsPage?.content ?? [];

  // Helper auto-slug
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleOpenArticleCreate = () => {
    setEditingArticleId(null);
    setArtTitle("");
    setArtSlug("");
    setArtCategoryId(categories[0]?.id ?? "");
    setArtExcerpt("");
    setArtContent("");
    setArtThumbnail("");
    setArtStatus("DRAFT");
    setShowArticleModal(true);
  };

  const handleOpenArticleEdit = (art: any) => {
    setEditingArticleId(art.id);
    setArtTitle(art.title);
    setArtSlug(art.slug);
    setArtCategoryId(art.category.id);
    setArtExcerpt(art.excerpt ?? "");
    setArtContent(art.content);
    setArtThumbnail(art.thumbnailUrl ?? "");
    setArtStatus(art.status);
    setShowArticleModal(true);
  };

  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      categoryId: artCategoryId,
      title: artTitle,
      slug: artSlug || generateSlug(artTitle),
      excerpt: artExcerpt,
      content: artContent,
      thumbnailUrl: artThumbnail,
      status: artStatus,
    };

    if (editingArticleId) {
      updateArtMutation.mutate(
        { articleId: editingArticleId, ...payload },
        {
          onSuccess: () => setShowArticleModal(false),
        }
      );
    } else {
      createArtMutation.mutate(payload, {
        onSuccess: () => setShowArticleModal(false),
      });
    }
  };

  const handleDeleteArticle = (id: string) => {
    if (confirm(t("Bạn có chắc chắn muốn xóa bài viết này?", "Are you sure you want to delete this article?"))) {
      deleteArtMutation.mutate(id);
    }
  };

  const handleOpenCategoryCreate = () => {
    setEditingCategoryId(null);
    setCatName("");
    setCatSlug("");
    setCatDesc("");
    setShowCategoryModal(true);
  };

  const handleOpenCategoryEdit = (cat: any) => {
    setEditingCategoryId(cat.id);
    setCatName(cat.name);
    setCatSlug(cat.slug);
    setCatDesc(cat.description ?? "");
    setShowCategoryModal(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: catName,
      slug: catSlug || generateSlug(catName),
      description: catDesc,
    };

    if (editingCategoryId) {
      updateCatMutation.mutate(
        { categoryId: editingCategoryId, ...payload },
        {
          onSuccess: () => setShowCategoryModal(false),
        }
      );
    } else {
      createCatMutation.mutate(payload, {
        onSuccess: () => setShowCategoryModal(false),
      });
    }
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm(t("Bạn có chắc chắn muốn xóa chuyên mục này?", "Are you sure you want to delete this category?"))) {
      deleteCatMutation.mutate(id);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (confirm(t("Xóa bình luận này?", "Delete this comment?"))) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Title & Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-teal-600" />
            {t("Quản lý Blog", "Blog Management")}
          </h1>
          <p className="text-xs font-semibold text-slate-500">
            {t("Quản lý các chuyên mục, bài viết và kiểm duyệt bình luận của khách hàng.", "Manage blog articles, categories, and moderate customer reviews/comments.")}
          </p>
        </div>

        {activeTab === "articles" && (
          <Button onClick={handleOpenArticleCreate} className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1.5">
            <Plus className="h-4 w-4" />
            {t("Viết bài mới", "Write Article")}
          </Button>
        )}
        {activeTab === "categories" && (
          <Button onClick={handleOpenCategoryCreate} className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1.5">
            <Plus className="h-4 w-4" />
            {t("Thêm chuyên mục", "Add Category")}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("articles")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "articles" ? "border-teal-650 text-teal-650" : "border-transparent text-slate-400 hover:text-slate-650"
          }`}
        >
          <FileText className="h-4 w-4" />
          {t("Bài viết", "Articles")}
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "categories" ? "border-teal-650 text-teal-650" : "border-transparent text-slate-400 hover:text-slate-650"
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          {t("Chuyên mục", "Categories")}
        </button>
        <button
          onClick={() => setActiveTab("moderation")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "moderation" ? "border-teal-650 text-teal-650" : "border-transparent text-slate-400 hover:text-slate-650"
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          {t("Bình luận", "Comments Moderation")}
        </button>
      </div>

      {/* Loading indicator */}
      {loadingArticles && activeTab === "articles" && (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
        </div>
      )}

      {/* Tab 1: Articles List */}
      {activeTab === "articles" && !loadingArticles && (
        <div className="grid gap-4">
          {articles.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-400 font-semibold text-xs">
              {t("Chưa có bài viết nào.", "No articles created yet.")}
            </div>
          ) : (
            articles.map((art) => (
              <Card key={art.id} className="p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                  {art.thumbnailUrl ? (
                    <img src={art.thumbnailUrl} alt={art.title} className="h-14 w-20 object-cover rounded-lg bg-slate-100 shrink-0" />
                  ) : (
                    <div className="h-14 w-20 rounded-lg bg-slate-100 flex items-center justify-center text-slate-350 shrink-0">
                      <BookOpen className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-black text-slate-800 leading-tight">{art.title}</h3>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                      <span>{art.category.name}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {art.viewCount}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5"><ThumbsUp className="h-3 w-3" /> {art.likeCount}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${
                    art.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-650" : "bg-amber-50 text-amber-650"
                  }`}>
                    {art.status}
                  </span>
                  
                  <button onClick={() => handleOpenArticleEdit(art)} className="p-2 text-slate-500 hover:text-teal-650 hover:bg-slate-100 rounded-xl transition">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDeleteArticle(art.id)} className="p-2 text-slate-500 hover:text-red-650 hover:bg-slate-100 rounded-xl transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Categories List */}
      {activeTab === "categories" && (
        <div className="grid gap-4">
          {categories.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-400 font-semibold text-xs">
              {t("Chưa có chuyên mục nào.", "No categories created yet.")}
            </div>
          ) : (
            categories.map((cat) => (
              <Card key={cat.id} className="p-4 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-800 leading-tight">{cat.name}</h4>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">/{cat.slug}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => handleOpenCategoryEdit(cat)} className="p-2 text-slate-500 hover:text-teal-650 hover:bg-slate-100 rounded-xl transition">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-slate-500 hover:text-red-650 hover:bg-slate-100 rounded-xl transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Comments Moderation */}
      {activeTab === "moderation" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("Chọn bài viết để kiểm duyệt:", "Select article to moderate comments:")}</label>
            <select
              value={selectedArticleId}
              onChange={(e) => setSelectedArticleId(e.target.value)}
              className="w-full max-w-md rounded-xl border border-slate-200 p-2 text-xs font-semibold"
            >
              <option value="">{t("-- Chọn bài viết --", "-- Select Article --")}</option>
              {articles.map((art) => (
                <option key={art.id} value={art.id}>{art.title}</option>
              ))}
            </select>
          </div>

          {selectedArticleId && (
            <div className="space-y-3 mt-4">
              {comments.length === 0 ? (
                <p className="text-xs italic text-slate-400">{t("Không có bình luận nào cho bài viết này.", "No comments for this article.")}</p>
              ) : (
                comments.map((comm) => (
                  <Card key={comm.commentId} className="p-3.5 rounded-2xl border border-slate-200/60 shadow-sm flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800">{comm.authorName}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{new Date(comm.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-650 leading-relaxed">{comm.content}</p>
                    </div>

                    <button onClick={() => handleDeleteComment(comm.commentId)} className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-slate-100 rounded-lg transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Article Form */}
      {showArticleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto space-y-4">
            <button onClick={() => setShowArticleModal(false)} className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full text-slate-400">
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-lg font-black text-slate-800">
              {editingArticleId ? t("Chỉnh sửa bài viết", "Edit Blog Article") : t("Tạo bài viết mới", "Create Blog Article")}
            </h2>

            <form onSubmit={handleSaveArticle} className="space-y-4 text-xs font-bold text-slate-600">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label>{t("Tiêu đề", "Title")}</label>
                  <Input value={artTitle} onChange={(e) => {
                    setArtTitle(e.target.value);
                    if (!editingArticleId) setArtSlug(generateSlug(e.target.value));
                  }} required className="rounded-xl p-3 text-xs" />
                </div>
                <div className="space-y-1">
                  <label>{t("Slug (URL)", "Slug")}</label>
                  <Input value={artSlug} onChange={(e) => setArtSlug(e.target.value)} required className="rounded-xl p-3 text-xs" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label>{t("Chuyên mục", "Category")}</label>
                  <select
                    value={artCategoryId}
                    onChange={(e) => setArtCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold"
                    required
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label>{t("Trạng thái", "Status")}</label>
                  <select
                    value={artStatus}
                    onChange={(e) => setArtStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold"
                    required
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="HIDDEN">HIDDEN</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label>{t("Ảnh thu nhỏ (URL)", "Thumbnail URL")}</label>
                <Input value={artThumbnail} onChange={(e) => setArtThumbnail(e.target.value)} className="rounded-xl p-3 text-xs" />
              </div>

              <div className="space-y-1">
                <label>{t("Tóm tắt ngắn (Excerpt)", "Excerpt")}</label>
                <textarea
                  value={artExcerpt}
                  onChange={(e) => setArtExcerpt(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 outline-none min-h-[60px]"
                />
              </div>

              <div className="space-y-1">
                <label>{t("Nội dung bài viết", "Content")}</label>
                <textarea
                  value={artContent}
                  onChange={(e) => setArtContent(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 outline-none min-h-[180px] font-medium"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" onClick={() => setShowArticleModal(false)} variant="outline" className="rounded-xl font-bold">
                  {t("Hủy bỏ", "Cancel")}
                </Button>
                <Button type="submit" className="rounded-xl bg-teal-650 hover:bg-teal-700 text-white font-bold">
                  {t("Lưu bài viết", "Save Article")}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal 2: Category Form */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl relative space-y-4">
            <button onClick={() => setShowCategoryModal(false)} className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full text-slate-400">
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-base font-black text-slate-800">
              {editingCategoryId ? t("Chỉnh sửa chuyên mục", "Edit Category") : t("Tạo chuyên mục mới", "Create Category")}
            </h2>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs font-bold text-slate-650">
              <div className="space-y-1">
                <label>{t("Tên chuyên mục", "Category Name")}</label>
                <Input value={catName} onChange={(e) => {
                  setCatName(e.target.value);
                  if (!editingCategoryId) setCatSlug(generateSlug(e.target.value));
                }} required className="rounded-xl p-3 text-xs" />
              </div>

              <div className="space-y-1">
                <label>{t("Slug (URL)", "Slug")}</label>
                <Input value={catSlug} onChange={(e) => setCatSlug(e.target.value)} required className="rounded-xl p-3 text-xs" />
              </div>

              <div className="space-y-1">
                <label>{t("Mô tả", "Description")}</label>
                <textarea
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 outline-none min-h-[60px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" onClick={() => setShowCategoryModal(false)} variant="outline" className="rounded-xl font-bold">
                  {t("Hủy bỏ", "Cancel")}
                </Button>
                <Button type="submit" className="rounded-xl bg-teal-650 hover:bg-teal-700 text-white font-bold">
                  {t("Lưu", "Save")}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
