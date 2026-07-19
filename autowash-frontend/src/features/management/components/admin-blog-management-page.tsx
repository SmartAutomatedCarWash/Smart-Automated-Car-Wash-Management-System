"use client";

import { useState, useRef } from "react";
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
  useAdminAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
} from "@/features/public/components/hooks/use-announcements";
import type { Announcement } from "@/features/public/components/api/announcements-service";
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  FileText,
  FolderOpen,
  Eye,
  ThumbsUp,
  MessageCircle,
  X,
  Megaphone,
  ImageUp,
  Loader2,
  Star,
  Send,
} from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { Input } from "@/shared/ui/ui/input";
import { uploadCatalogImage } from "@/features/management/lib/admin-service-management-service";
import { AdminReviewManagementPage } from "@/features/management/components/admin-reviews-management-page";
import { AdminNotificationCampaignsPage } from "@/features/notifications/components/admin-notification-campaigns-page";

// BlogThumbnailUpload: upload to R2 cloud via /admin/uploads/images
function BlogThumbnailUpload({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (url: string) => void;
  t: (vi: string, en: string) => string;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadCatalogImage(file);
      onChange(res.url);
    } catch {
      alert(t("Tải ảnh lên thất bại.", "Failed to upload image."));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {/* Preview */}
      {value && (
        <div className="relative inline-block">
          <img
            src={value}
            alt="thumbnail preview"
            className="h-28 w-48 rounded-xl object-cover border border-slate-200"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white hover:bg-rose-600 transition"
            title={t("Xóa ảnh", "Remove image")}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Upload button */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl gap-1.5 text-xs"
        >
          {uploading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <ImageUp className="h-3.5 w-3.5" />}
          {uploading
            ? t("Đang tải lên...", "Uploading...")
            : value
              ? t("Đổi ảnh", "Change image")
              : t("Tải ảnh lên", "Upload image")}
        </Button>
        {value && (
          <span className="truncate max-w-[260px] text-[11px] text-slate-400">{value}</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

// RichTextArea: enhanced textarea with HTML insertion toolbar
function RichTextArea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function insertTag(open: string, close: string) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const newVal = value.slice(0, start) + open + selected + close + value.slice(end);
    onChange(newVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + open.length, start + open.length + selected.length);
    }, 0);
  }

  function insertImagePrompt() {
    const url = prompt("Image URL:");
    if (url) {
      const el = ref.current;
      if (!el) return;
      const pos = el.selectionStart;
      const img = `<img src="${url}" alt="image" style="width:100%;border-radius:8px;margin:12px 0;" />`;
      onChange(value.slice(0, pos) + img + value.slice(pos));
    }
  }

  return (
    <div className="space-y-0">
      <div className="flex flex-wrap gap-1 border border-slate-200 rounded-t-xl bg-slate-50 px-2 py-1.5">
        <button type="button" onClick={() => insertTag("<strong>", "</strong>")} className="px-2 py-1 text-xs font-black hover:bg-slate-200 rounded transition">B</button>
        <button type="button" onClick={() => insertTag("<em>", "</em>")} className="px-2 py-1 text-xs italic hover:bg-slate-200 rounded transition">I</button>
        <button type="button" onClick={() => insertTag("<h2>", "</h2>")} className="px-2 py-1 text-xs font-bold hover:bg-slate-200 rounded transition">H2</button>
        <button type="button" onClick={() => insertTag("<h3>", "</h3>")} className="px-2 py-1 text-xs font-bold hover:bg-slate-200 rounded transition">H3</button>
        <button type="button" onClick={() => insertTag("<p>", "</p>")} className="px-2 py-1 text-xs hover:bg-slate-200 rounded transition">P</button>
        <button type="button" onClick={() => insertTag("<ul>\n<li>", "</li>\n</ul>")} className="px-2 py-1 text-xs hover:bg-slate-200 rounded transition">• List</button>
        <button type="button" onClick={insertImagePrompt} className="px-2 py-1 text-xs hover:bg-slate-200 rounded transition">🖼</button>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-b-xl border border-t-0 border-slate-200 p-3 outline-none min-h-[220px] font-mono text-xs"
        placeholder={"<p>Nội dung bài viết...</p>\n<h2>Tiêu đề phụ</h2>\n<p>Đoạn văn tiếp theo...</p>"}
        required
      />
    </div>
  );
}

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

  // Announcement hooks
  const { data: announcements = [], isLoading: loadingAnnouncements } = useAdminAnnouncements();
  const createAnnouncementMutation = useCreateAnnouncement();
  const updateAnnouncementMutation = useUpdateAnnouncement();
  const deleteAnnouncementMutation = useDeleteAnnouncement();

  // Announcement form state
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [annTitle, setAnnTitle] = useState("");
  const [annType, setAnnType] = useState<"PROMO" | "INFO" | "WARNING">("PROMO");
  const [annActive, setAnnActive] = useState(true);
  const [annPriority, setAnnPriority] = useState(0);
  const [annLinkUrl, setAnnLinkUrl] = useState("");
  const [annLinkLabel, setAnnLinkLabel] = useState("");
  const [annExpiresAt, setAnnExpiresAt] = useState("");

  const handleOpenAnnouncementCreate = () => {
    setEditingAnnouncementId(null);
    setAnnTitle("");
    setAnnType("PROMO");
    setAnnActive(true);
    setAnnPriority(0);
    setAnnLinkUrl("");
    setAnnLinkLabel("");
    setAnnExpiresAt("");
    setShowAnnouncementModal(true);
  };

  const handleOpenAnnouncementEdit = (ann: Announcement) => {
    setEditingAnnouncementId(ann.id);
    setAnnTitle(ann.title);
    setAnnType(ann.type as "PROMO" | "INFO" | "WARNING");
    setAnnActive(ann.active);
    setAnnPriority(ann.priority);
    setAnnLinkUrl(ann.linkUrl ?? "");
    setAnnLinkLabel(ann.linkLabel ?? "");
    setAnnExpiresAt(ann.expiresAt ? ann.expiresAt.substring(0, 16) : "");
    setShowAnnouncementModal(true);
  };

  const handleSaveAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: annTitle,
      message: null,
      linkUrl: annLinkUrl || null,
      linkLabel: annLinkLabel || null,
      type: annType,
      active: annActive,
      priority: annPriority,
      expiresAt: annExpiresAt ? new Date(annExpiresAt).toISOString() : null,
    };
    if (editingAnnouncementId) {
      updateAnnouncementMutation.mutate(
        { id: editingAnnouncementId, payload },
        { onSuccess: () => setShowAnnouncementModal(false) }
      );
    } else {
      createAnnouncementMutation.mutate(payload, {
        onSuccess: () => setShowAnnouncementModal(false),
      });
    }
  };

  const handleDeleteAnnouncement = (id: string) => {
    if (confirm(t("Xóa thông báo này?", "Delete this announcement?"))) {
      deleteAnnouncementMutation.mutate(id);
    }
  };

  // Active tab — articles, announcements, reviews, campaigns
  const [activeTab, setActiveTab] = useState<"articles" | "announcements" | "reviews" | "campaigns">("articles");

  // Category filter for articles list
  const [articleCategoryFilter, setArticleCategoryFilter] = useState<string>("all");

  // Inline add-new-category state (inside article form)
  const [showInlineCatForm, setShowInlineCatForm] = useState(false);
  const [inlineCatName, setInlineCatName] = useState("");
  const [inlineCatSlug, setInlineCatSlug] = useState("");
  const [inlineCatDesc, setInlineCatDesc] = useState("");
  const [inlineCatSaving, setInlineCatSaving] = useState(false);

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

  // Preview modal state
  const [previewArticle, setPreviewArticle] = useState<any>(null);

  // Inline comment expansion (replaces separate moderation tab)
  const [expandedCommentArticleId, setExpandedCommentArticleId] = useState<string | null>(null);
  const { data: commentsPage } = useBlogComments(expandedCommentArticleId || "", 1, 100);
  const deleteCommentMutation = useDeleteAdminComment(expandedCommentArticleId || "");
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
    setShowInlineCatForm(false);
    setInlineCatName(""); setInlineCatSlug(""); setInlineCatDesc("");
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
    setShowInlineCatForm(false);
    setInlineCatName(""); setInlineCatSlug(""); setInlineCatDesc("");
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
        { onSuccess: () => setShowArticleModal(false) }
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
        { onSuccess: () => setShowCategoryModal(false) }
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

  const handleToggleComments = (articleId: string) => {
    setExpandedCommentArticleId((prev) => (prev === articleId ? null : articleId));
  };

  return (
    <div className="space-y-6 p-6">
      {/* Tab bar — articles + announcements; categories merged into article form */}
      <div className="flex items-center border-b border-slate-200">
        <button
          onClick={() => setActiveTab("articles")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === "articles" ? "border-teal-600 text-teal-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
        >
          <FileText className="h-4 w-4" />{t("Bài viết", "Articles")}
        </button>
        <button
          onClick={() => setActiveTab("announcements")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === "announcements" ? "border-teal-600 text-teal-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
        >
          <Megaphone className="h-4 w-4" />{t("Thông báo", "Announcements")}
        </button>
        <button
          onClick={() => setActiveTab("reviews")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === "reviews" ? "border-teal-600 text-teal-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
        >
          <Star className="h-4 w-4" />{t("Quản lý Đánh giá", "Reviews")}
        </button>
        <button
          onClick={() => setActiveTab("campaigns")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === "campaigns" ? "border-teal-600 text-teal-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
        >
          <Send className="h-4 w-4" />{t("Gửi Thông báo", "Send Notifications")}
        </button>

        {/* Action button pushed to the far right */}
        {activeTab === "articles" && (
          <Button onClick={handleOpenArticleCreate} className="ml-auto rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1.5 h-9 px-3 shrink-0">
            <Plus className="h-3.5 w-3.5" />
            {t("Viết bài mới", "Write Article")}
          </Button>
        )}
        {activeTab === "announcements" && (
          <Button onClick={handleOpenAnnouncementCreate} className="ml-auto rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1.5 h-9 px-3 shrink-0">
            <Plus className="h-3.5 w-3.5" />
            {t("Thêm thông báo", "Add Announcement")}
          </Button>
        )}
      </div>

      {loadingArticles && activeTab === "articles" && (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
        </div>
      )}

      {/* Tab 1: Articles List */}
      {activeTab === "articles" && !loadingArticles && (
        <div className="space-y-4">
          {/* Category filter pills */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setArticleCategoryFilter("all")}
                className={`rounded-full border px-3 py-1 text-xs font-bold transition-all ${articleCategoryFilter === "all" ? "border-teal-600 bg-teal-600 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-teal-400 hover:text-teal-600"}`}
              >
                {t("Tất cả", "All")}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setArticleCategoryFilter(cat.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-bold transition-all ${articleCategoryFilter === cat.id ? "border-teal-600 bg-teal-600 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-teal-400 hover:text-teal-600"}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Articles */}
          <div className="grid gap-4">
            {(() => {
              const filtered = articleCategoryFilter === "all"
                ? articles
                : articles.filter((a) => a.category.id === articleCategoryFilter);
              if (filtered.length === 0) return (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-400 font-semibold text-xs">
                  {t("Chưa có bài viết nào.", "No articles created yet.")}
                </div>
              );
              return filtered.map((art) => (
              <div key={art.id}>
                <Card className="p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-wrap gap-4 items-center justify-between">
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

                    {/* Comments expand button */}
                    <button
                      onClick={() => handleToggleComments(art.id)}
                      className={`flex items-center gap-1.5 p-2 rounded-xl text-xs font-bold transition ${expandedCommentArticleId === art.id ? "text-teal-600 bg-teal-50" : "text-slate-500 hover:text-teal-600 hover:bg-slate-100"}`}
                      title={t("Xem bình luận", "View comments")}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      {(art as any).commentCount ?? 0}
                    </button>

                    <button onClick={(e) => { e.stopPropagation(); setPreviewArticle(art); }} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition" title="Preview">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleOpenArticleEdit(art)} className="p-2 text-slate-500 hover:text-teal-650 hover:bg-slate-100 rounded-xl transition">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDeleteArticle(art.id)} className="p-2 text-slate-500 hover:text-red-650 hover:bg-slate-100 rounded-xl transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </Card>

                {/* Inline comments panel */}
                {expandedCommentArticleId === art.id && (
                  <div className="mt-1 rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider">{t("Bình luận", "Comments")}</p>
                    {comments.length === 0 ? (
                      <p className="text-xs italic text-slate-400">{t("Không có bình luận nào.", "No comments yet.")}</p>
                    ) : (
                      comments.map((comm) => (
                        <div key={comm.commentId} className="flex items-start justify-between gap-4 bg-white rounded-xl border border-slate-200/60 p-3 shadow-sm">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-800">{comm.authorName}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{new Date(comm.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-xs font-medium text-slate-650 leading-relaxed">{comm.content}</p>
                          </div>
                          <button onClick={() => handleDeleteComment(comm.commentId)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          })()}
          </div>
        </div>
      )}

      {/* Tab 2: Announcements */}
      {activeTab === "announcements" && (
        <div className="space-y-4">
          {loadingAnnouncements ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-400 font-semibold text-xs">
              {t("Chưa có thông báo nào.", "No announcements yet.")}
            </div>
          ) : (
            announcements.map((ann) => (
              <Card key={ann.id} className="p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${
                        ann.type === "PROMO" ? "bg-amber-50 text-amber-700" :
                        ann.type === "WARNING" ? "bg-rose-50 text-rose-700" :
                        "bg-blue-50 text-blue-700"
                      }`}>{ann.type}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${
                        ann.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}>{ann.active ? t("Đang hiển thị", "Active") : t("Đã ẩn", "Inactive")}</span>
                      {ann.expiresAt && (
                        <span className="text-[10px] text-slate-400">
                          {t("Hết hạn", "Expires")}: {new Date(ann.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm font-bold text-slate-800 leading-snug">{ann.title}</p>
                    {ann.linkUrl && (
                      <p className="text-[11px] text-teal-600 mt-0.5">🔗 {ann.linkUrl}</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">
                      {t("Ưu tiên", "Priority")}: {ann.priority}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleOpenAnnouncementEdit(ann)} className="p-2 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded-xl transition">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDeleteAnnouncement(ann.id)} className="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-xl transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Reviews Management */}
      {activeTab === "reviews" && (
        <div className="-mx-6 -my-6">
          <AdminReviewManagementPage />
        </div>
      )}

      {/* Tab 4: Notification Campaigns */}
      {activeTab === "campaigns" && (
        <AdminNotificationCampaignsPage />
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
                  {!showInlineCatForm ? (
                    <div className="space-y-1.5">
                      <select
                        value={artCategoryId}
                        onChange={(e) => setArtCategoryId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold"
                        required
                      >
                        <option value="" disabled>{t("Chọn chuyên mục...", "Select category...")}</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowInlineCatForm(true)}
                        className="flex items-center gap-1 text-[11px] font-bold text-teal-600 hover:text-teal-700 transition"
                      >
                        <Plus className="h-3 w-3" />
                        {t("Thêm chuyên mục mới", "Add new category")}
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 space-y-2">
                      <p className="text-[11px] font-black text-teal-700 uppercase tracking-wider">{t("Chuyên mục mới", "New Category")}</p>
                      <Input
                        value={inlineCatName}
                        onChange={(e) => {
                          setInlineCatName(e.target.value);
                          setInlineCatSlug(generateSlug(e.target.value));
                        }}
                        placeholder={t("Tên chuyên mục", "Category name")}
                        className="rounded-lg text-xs h-8"
                      />
                      <Input
                        value={inlineCatSlug}
                        onChange={(e) => setInlineCatSlug(e.target.value)}
                        placeholder="slug-url"
                        className="rounded-lg text-xs h-8"
                      />
                      <Input
                        value={inlineCatDesc}
                        onChange={(e) => setInlineCatDesc(e.target.value)}
                        placeholder={t("Mô tả (tuỳ chọn)", "Description (optional)")}
                        className="rounded-lg text-xs h-8"
                      />
                      <div className="flex gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          disabled={!inlineCatName.trim() || inlineCatSaving}
                          className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs h-7 px-3"
                          onClick={async () => {
                            if (!inlineCatName.trim()) return;
                            setInlineCatSaving(true);
                            try {
                              const created = await createCatMutation.mutateAsync({
                                name: inlineCatName,
                                slug: inlineCatSlug || generateSlug(inlineCatName),
                                description: inlineCatDesc,
                              });
                              const newCat = created as any;
                              if (newCat?.id) setArtCategoryId(newCat.id);
                              setInlineCatName("");
                              setInlineCatSlug("");
                              setInlineCatDesc("");
                              setShowInlineCatForm(false);
                            } finally {
                              setInlineCatSaving(false);
                            }
                          }}
                        >
                          {inlineCatSaving ? "..." : t("Tạo & chọn", "Create & select")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="rounded-lg text-xs h-7 px-3 text-slate-500"
                          onClick={() => {
                            setShowInlineCatForm(false);
                            setInlineCatName("");
                            setInlineCatSlug("");
                            setInlineCatDesc("");
                          }}
                        >
                          {t("Hủy", "Cancel")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label>{t("Trạng thái", "Status")}</label>
                  <select value={artStatus} onChange={(e) => setArtStatus(e.target.value as any)} className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold" required>
                    <option value="DRAFT">DRAFT</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="HIDDEN">HIDDEN</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label>{t("Ảnh thu nhỏ", "Thumbnail")}</label>
                <BlogThumbnailUpload
                  value={artThumbnail}
                  onChange={setArtThumbnail}
                  t={t}
                />
              </div>
              <div className="space-y-1">
                <label>{t("Tóm tắt ngắn (Excerpt)", "Excerpt")}</label>
                <textarea value={artExcerpt} onChange={(e) => setArtExcerpt(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 outline-none min-h-[60px]" />
              </div>
              <div className="space-y-1">
                <label>{t("Nội dung bài viết", "Content")}</label>
                <RichTextArea value={artContent} onChange={setArtContent} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" onClick={() => setShowArticleModal(false)} variant="outline" className="rounded-xl font-bold">
                  {t("Hủy bỏ", "Cancel")}
                </Button>
                <Button type="submit" className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold">
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
                <textarea value={catDesc} onChange={(e) => setCatDesc(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 outline-none min-h-[60px]" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" onClick={() => setShowCategoryModal(false)} variant="outline" className="rounded-xl font-bold">
                  {t("Hủy bỏ", "Cancel")}
                </Button>
                <Button type="submit" className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold">
                  {t("Lưu", "Save")}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal 3: Announcement Form */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-xl relative space-y-4">
            <button onClick={() => setShowAnnouncementModal(false)} className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full text-slate-400">
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-lg font-black text-slate-800">
              {editingAnnouncementId ? t("Chỉnh sửa thông báo", "Edit Announcement") : t("Tạo thông báo mới", "New Announcement")}
            </h2>
            <form onSubmit={handleSaveAnnouncement} className="space-y-4 text-xs font-bold text-slate-600">
              <div className="space-y-1">
                <label>{t("Nội dung hiển thị", "Message text")} *</label>
                <Input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} required className="rounded-xl text-xs" placeholder={t("Nhập nội dung thông báo...", "Enter announcement text...")} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label>{t("Loại", "Type")}</label>
                  <select value={annType} onChange={(e) => setAnnType(e.target.value as any)} className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold">
                    <option value="PROMO">PROMO — {t("Khuyến mãi / ưu đãi", "Discount / deal")}</option>
                    <option value="INFO">INFO — {t("Thông tin chung", "General information")}</option>
                    <option value="WARNING">WARNING — {t("Cảnh báo / lưu ý quan trọng", "Alert / important notice")}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label>{t("Độ ưu tiên", "Priority")}</label>
                  <Input type="number" value={annPriority} onChange={(e) => setAnnPriority(Number(e.target.value))} className="rounded-xl text-xs" />
                  <p className="text-[10px] text-slate-400 font-normal mt-0.5">{t("Số càng lớn hiển thị càng trước", "Higher number shows first")}</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("Nút hành động (tuỳ chọn)", "Call-to-action button (optional)")}</p>
                <p className="text-[11px] text-slate-500 font-normal leading-relaxed">
                  {t("Nếu điền Link URL, thanh thông báo sẽ hiển thị một nút bấm. Link Label là tên nút đó (ví dụ: \"Đặt ngay\", \"Xem thêm\").", "If Link URL is filled, the announcement bar will show a clickable button. Link Label is the button text (e.g. \"Book now\", \"Learn more\").")}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label>{t("Link URL", "Link URL")}</label>
                    <Input value={annLinkUrl} onChange={(e) => setAnnLinkUrl(e.target.value)} className="rounded-xl text-xs" placeholder="/customer/bookings/new" />
                  </div>
                  <div className="space-y-1">
                    <label>{t("Link Label", "Link Label")}</label>
                    <Input value={annLinkLabel} onChange={(e) => setAnnLinkLabel(e.target.value)} className="rounded-xl text-xs" placeholder={t("Đặt ngay", "Book now")} />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label>{t("Hết hạn vào (tuỳ chọn)", "Expires At (optional)")}</label>
                <Input type="datetime-local" value={annExpiresAt} onChange={(e) => setAnnExpiresAt(e.target.value)} className="rounded-xl text-xs" />
              </div>
              <div className="flex items-center gap-3">
                <input id="annActive" type="checkbox" checked={annActive} onChange={(e) => setAnnActive(e.target.checked)} className="h-4 w-4 rounded accent-teal-600" />
                <label htmlFor="annActive" className="cursor-pointer">{t("Hiển thị trên thanh thông báo", "Active — show in announcement bar")}</label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAnnouncementModal(false)} className="rounded-xl font-bold">{t("Hủy", "Cancel")}</Button>
                <Button type="submit" className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold">{t("Lưu", "Save")}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal 4: Article Preview */}
      {previewArticle && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setPreviewArticle(null)}>
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewArticle(null)} className="absolute top-4 right-4 z-10 p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition">
              <X className="h-5 w-5" />
            </button>
            {previewArticle.thumbnailUrl && (
              <img src={previewArticle.thumbnailUrl} alt={previewArticle.title} className="w-full rounded-t-3xl object-cover aspect-video" />
            )}
            <div className="p-6 space-y-4">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-teal-50 text-teal-650 tracking-wide">
                {previewArticle.category?.name}
              </span>
              <h2 className="text-2xl font-black text-slate-900 leading-tight">
                {previewArticle.title}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-400">
                <span>{previewArticle.authorName ?? t("Admin", "Admin")}</span>
                {previewArticle.publishedAt && (
                  <>
                    <span>•</span>
                    <span>{new Date(previewArticle.publishedAt).toLocaleDateString("vi-VN")}</span>
                  </>
                )}
                <span>•</span>
                <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {previewArticle.viewCount ?? 0}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> {previewArticle.likeCount ?? 0}</span>
              </div>
              <hr className="border-slate-100" />
              <div
                className="[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-slate-800 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-slate-800 [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:mb-3 [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:mb-3 [&_strong]:font-bold [&_em]:italic [&_img]:rounded-xl [&_img]:my-4 [&_img]:w-full text-slate-700 text-sm"
                dangerouslySetInnerHTML={{ __html: previewArticle.content }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
