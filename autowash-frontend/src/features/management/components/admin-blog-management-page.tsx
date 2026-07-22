"use client";

import { useState, useRef, useEffect } from "react";
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
  Eye,
  ThumbsUp,
  MessageCircle,
  X,
  ImageUp,
  Loader2,
  AlertTriangle,
  GripVertical,
  Tag,
  Star,
  FileText,
  Megaphone,
  Send,
  Folder,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  Calendar,
  Users,
  Link,
  ArrowUp,
  Minus,
} from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { Input } from "@/shared/ui/ui/input";
import { uploadCatalogImage } from "@/features/management/lib/admin-service-management-service";
import { AdminSessionHistoryReviews } from "@/features/management/components/admin-session-history-reviews";
import { AdminNotificationCampaignsPage } from "@/features/notifications/components/admin-notification-campaigns-page";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

// ── SweetAlert2 notification helpers ──
const swalSuccess = (message: string) =>
  Swal.fire({
    icon: "success",
    title: "Thành công!",
    text: message,
    confirmButtonText: "OK",
    customClass: {
      popup: "swal-blog-popup",
      title: "swal-blog-title",
      htmlContainer: "swal-blog-message",
      confirmButton: "swal-blog-btn-success",
    },
    buttonsStyling: false,
    timer: 10000,
    timerProgressBar: true,
  });

const swalError = (message: string) =>
  Swal.fire({
    icon: "error",
    title: "Có lỗi xảy ra!",
    text: message,
    confirmButtonText: "OK",
    customClass: {
      popup: "swal-blog-popup",
      title: "swal-blog-title",
      htmlContainer: "swal-blog-message",
      confirmButton: "swal-blog-btn-error",
    },
    buttonsStyling: false,
    timer: 10000,
    timerProgressBar: true,
  });

const swalInfo = (message: string) =>
  Swal.fire({
    icon: "info",
    title: "Thông báo",
    text: message,
    confirmButtonText: "OK",
    customClass: {
      popup: "swal-blog-popup",
      title: "swal-blog-title",
      htmlContainer: "swal-blog-message",
      confirmButton: "swal-blog-btn-info",
    },
    buttonsStyling: false,
    timer: 10000,
    timerProgressBar: true,
  });

// ── ConfirmDialog: custom popup thay thế window.confirm ──
function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800">{title}</h3>
            {description && <p className="mt-1 text-xs font-medium text-slate-500">{description}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl text-xs font-bold h-9 px-4">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-9 px-4"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function BlogThumbnailUpload({
  value,
  onChange,
  t,
  onError,
}: {
  value: string;
  onChange: (url: string) => void;
  t: (vi: string, en: string) => string;
  onError?: (msg: string) => void;
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
      onError?.(t("Tải ảnh lên thất bại.", "Failed to upload image."));
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
            onClick={() => { onChange(""); }}
            className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white hover:bg-rose-600 transition"
            title={t("Xóa ảnh", "Remove image")}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Upload button - no filename shown */}
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
        placeholder=""
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

  // Articles pagination state
  const [artPage, setArtPage] = useState(1);
  const artItemsPerPage = 5;

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

  const [localAnnouncements, setLocalAnnouncements] = useState<Announcement[]>([]);
  
  // Announcements filter & pagination state
  const [annSearch, setAnnSearch] = useState("");
  const [annTypeFilter, setAnnTypeFilter] = useState("ALL");
  const [annStatusFilter, setAnnStatusFilter] = useState("ALL");
  const [annPriorityFilter, setAnnPriorityFilter] = useState("ALL");
  const [annPage, setAnnPage] = useState(1);
  const annItemsPerPage = 5;

  useEffect(() => {
    // Sort by priority descending initially
    setLocalAnnouncements([...announcements].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)));
  }, [announcements]);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const _announcements = [...localAnnouncements];
    const draggedItemContent = _announcements.splice(dragItem.current, 1)[0];
    _announcements.splice(dragOverItem.current, 0, draggedItemContent);
    setLocalAnnouncements(_announcements);

    // Update priorities in backend based on new order
    const total = _announcements.length;
    _announcements.forEach((ann, index) => {
      const newPriority = total - index;
      if (ann.priority !== newPriority) {
        updateAnnouncementMutation.mutate({
          id: ann.id,
          payload: {
            title: ann.title,
            message: ann.message,
            linkUrl: ann.linkUrl,
            linkLabel: ann.linkLabel,
            type: ann.type,
            active: ann.active,
            priority: newPriority,
            expiresAt: ann.expiresAt,
          }
        });
      }
    });

    dragItem.current = null;
    dragOverItem.current = null;
    setDragOverIndex(null);
    setDraggingIndex(null);
  };

  // ── Confirm dialog state ──
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    onConfirm: () => void;
  }>({ open: false, title: "", onConfirm: () => {} });

  const openConfirm = (title: string, description: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, description, onConfirm });
  };
  const closeConfirm = () => setConfirmDialog((prev) => ({ ...prev, open: false }));

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
    setAnnPriority(localAnnouncements.length > 0 ? localAnnouncements.length + 1 : 1);
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
        {
          onSuccess: () => {
            setShowAnnouncementModal(false);
            swalSuccess("Announcement updated successfully.");
          },
          onError: () => swalError("Failed to update announcement."),
        }
      );
    } else {
      createAnnouncementMutation.mutate(payload, {
        onSuccess: () => {
          setShowAnnouncementModal(false);
          swalSuccess("Announcement created successfully.");
        },
        onError: () => swalError("Failed to create announcement."),
      });
    }
  };

  const handleDeleteAnnouncement = (id: string) => {
    openConfirm(
      "Delete announcement?",
      "This action cannot be undone.",
      () => {
        deleteAnnouncementMutation.mutate(id, {
          onSuccess: () => swalSuccess("Announcement deleted."),
          onError: () => swalError("Failed to delete announcement."),
        });
        closeConfirm();
      }
    );
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
  const [inlineCatError, setInlineCatError] = useState("");

  // Article form state
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [artTitle, setArtTitle] = useState("");
  const [artTitleError, setArtTitleError] = useState("");
  const [artSlug, setArtSlug] = useState("");
  const [artSlugError, setArtSlugError] = useState("");
  const [artCategoryId, setArtCategoryId] = useState("");
  const [artCategoryError, setArtCategoryError] = useState("");
  const [artExcerpt, setArtExcerpt] = useState("");
  const [artContent, setArtContent] = useState("");
  const [artContentError, setArtContentError] = useState("");
  const [artThumbnail, setArtThumbnail] = useState("");
  const [artStatus, setArtStatus] = useState<"DRAFT" | "PUBLISHED" | "HIDDEN">("PUBLISHED");

  // Category form state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catNameError, setCatNameError] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catDesc, setCatDesc] = useState("");

  // Preview modal state
  const [previewArticle, setPreviewArticle] = useState<any>(null);

  // Comment popup modal state
  const [commentModalArticleId, setCommentModalArticleId] = useState<string | null>(null);
  const [commentModalTitle, setCommentModalTitle] = useState<string>("");
  const { data: commentModalPage } = useBlogComments(commentModalArticleId || "", 1, 100);
  const deleteCommentModalMutation = useDeleteAdminComment(commentModalArticleId || "");
  const modalComments = commentModalPage?.content ?? [];

  // Category manager modal
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // ── Validation helpers ──
  const SPECIAL_CHARS_RE = /[!@#$%^&*()+=\[\]{};':"\\|,.<>\/?`~]/;

  const validateCategoryName = (name: string): string => {
    if (!name.trim()) return "Category name is required.";
    if (SPECIAL_CHARS_RE.test(name)) return "Category name must not contain special characters.";
    return "";
  };

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
    setArtTitle(""); setArtTitleError("");
    setArtSlug(""); setArtSlugError("");
    setArtCategoryId(categories[0]?.id ?? ""); setArtCategoryError("");
    setArtExcerpt("");
    setArtContent(""); setArtContentError("");
    setArtThumbnail("");
    setArtStatus("PUBLISHED");
    setShowInlineCatForm(false);
    setInlineCatName(""); setInlineCatSlug(""); setInlineCatDesc(""); setInlineCatError("");
    setShowArticleModal(true);
  };

  const handleOpenArticleEdit = (art: any) => {
    setEditingArticleId(art.id);
    setArtTitle(art.title); setArtTitleError("");
    setArtSlug(art.slug); setArtSlugError("");
    setArtCategoryId(art.category.id); setArtCategoryError("");
    setArtExcerpt(art.excerpt ?? "");
    setArtContent(art.content); setArtContentError("");
    setArtThumbnail(art.thumbnailUrl ?? "");
    setArtStatus(art.status);
    setShowInlineCatForm(false);
    setInlineCatName(""); setInlineCatSlug(""); setInlineCatDesc(""); setInlineCatError("");
    setShowArticleModal(true);
  };

  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate all fields before submit
    let valid = true;
    if (!artTitle.trim()) { setArtTitleError("Title is required."); valid = false; }
    if (!artSlug.trim()) { setArtSlugError("Slug is required."); valid = false; }
    if (!artCategoryId) { setArtCategoryError("Please select a category."); valid = false; }
    if (!artContent.trim()) { setArtContentError("Content is required."); valid = false; }
    if (!valid) return;

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
          onSuccess: () => {
            setShowArticleModal(false);
            swalSuccess("Article updated successfully.");
          },
          onError: () => swalError("Failed to update article. Please try again."),
        }
      );
    } else {
      createArtMutation.mutate(payload, {
        onSuccess: () => {
          setShowArticleModal(false);
          swalSuccess("Article created successfully.");
        },
        onError: () => swalError("Failed to create article. Please try again."),
      });
    }
  };

  const handleDeleteArticle = (id: string) => {
    openConfirm(
      "Delete this article?",
      "This action is permanent and cannot be undone.",
      () => {
        deleteArtMutation.mutate(id, {
          onSuccess: () => swalSuccess("Article deleted successfully."),
          onError: () => swalError("Failed to delete article."),
        });
        closeConfirm();
      }
    );
  };

  const handleOpenCategoryCreate = () => {
    setEditingCategoryId(null);
    setCatName(""); setCatNameError("");
    setCatSlug("");
    setCatDesc("");
    setShowCategoryModal(true);
  };

  const handleOpenCategoryEdit = (cat: any) => {
    setEditingCategoryId(cat.id);
    setCatName(cat.name); setCatNameError("");
    setCatSlug(cat.slug);
    setCatDesc(cat.description ?? "");
    setShowCategoryModal(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const nameErr = validateCategoryName(catName);
    if (nameErr) { setCatNameError(nameErr); return; }

    const payload = {
      name: catName,
      slug: catSlug || generateSlug(catName),
      description: catDesc,
    };
    if (editingCategoryId) {
      updateCatMutation.mutate(
        { categoryId: editingCategoryId, ...payload },
        {
          onSuccess: () => {
            setShowCategoryModal(false);
            swalSuccess("Category updated successfully.");
          },
          onError: () => swalError("Failed to update category."),
        }
      );
    } else {
      createCatMutation.mutate(payload, {
        onSuccess: () => {
          setShowCategoryModal(false);
          swalSuccess("Category created successfully.");
        },
        onError: () => swalError("Failed to create category."),
      });
    }
  };

  const handleDeleteCategory = (id: string, name: string) => {
    // Check if category is linked to any articles
    const linkedCount = articles.filter((a) => a.category.id === id).length;
    if (linkedCount > 0) {
      swalError(
        `Cannot delete "${name}". It is linked to ${linkedCount} article${linkedCount > 1 ? "s" : ""}. Please reassign or delete those articles first.`
      );
      return;
    }
    openConfirm(
      `Delete category "${name}"?`,
      "This action cannot be undone.",
      () => {
        deleteCatMutation.mutate(id, {
          onSuccess: () => swalSuccess("Category deleted successfully."),
          onError: () => swalError("Failed to delete category."),
        });
        closeConfirm();
      }
    );
  };

  const handleDeleteComment = (commentId: string) => {
    openConfirm(
      "Delete this comment?",
      "This action cannot be undone.",
      () => {
        deleteCommentModalMutation.mutate(commentId, {
          onSuccess: () => swalSuccess("Comment deleted."),
          onError: () => swalError("Failed to delete comment."),
        });
        closeConfirm();
      }
    );
  };

  const handleOpenCommentModal = (articleId: string, articleTitle: string) => {
    setCommentModalArticleId(articleId);
    setCommentModalTitle(articleTitle);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
      {/* Tab bar */}
      <div className="flex items-center gap-6 border-b border-slate-200 px-2">
        <button
          onClick={() => setActiveTab("articles")}
          className={`flex items-center gap-2 py-4 text-[13px] font-semibold transition-all ${activeTab === "articles" ? "border-b-2 border-teal-600 text-slate-900" : "border-b-2 border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          <FileText className="h-4 w-4" />
          {t("Articles", "Articles")}
        </button>
        <button
          onClick={() => setActiveTab("announcements")}
          className={`flex items-center gap-2 py-4 text-[13px] font-semibold transition-all ${activeTab === "announcements" ? "border-b-2 border-teal-600 text-slate-900" : "border-b-2 border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          <Megaphone className="h-4 w-4" />
          {t("Announcements", "Announcements")}
        </button>
        <button
          onClick={() => setActiveTab("reviews")}
          className={`flex items-center gap-2 py-4 text-[13px] font-semibold transition-all ${activeTab === "reviews" ? "border-b-2 border-teal-600 text-slate-900" : "border-b-2 border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          <Star className="h-4 w-4" />
          {t("Reviews", "Reviews")}
        </button>
        <button
          onClick={() => setActiveTab("campaigns")}
          className={`flex items-center gap-2 py-4 text-[13px] font-semibold transition-all ${activeTab === "campaigns" ? "border-b-2 border-teal-600 text-slate-900" : "border-b-2 border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          <Send className="h-4 w-4" />
          {t("Send Notifications", "Send Notifications")}
        </button>

        {/* Action button pushed to the far right */}
        {activeTab === "articles" && (
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <Button
              onClick={() => setShowCategoryManager(true)}
              variant="outline"
              className="rounded-full border-slate-200 font-bold text-[13px] gap-2 h-10 px-5 text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition"
            >
              <Folder className="h-4 w-4" />
              {t("Quản lý danh mục", "Manage Categories")}
            </Button>
            <Button onClick={handleOpenArticleCreate} className="rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-[13px] gap-2 h-10 px-5 transition">
              <Plus className="h-4 w-4" />
              {t("Tạo bài viết", "Write Article")}
            </Button>
          </div>
        )}
        {activeTab === "announcements" && (
          <Button onClick={handleOpenAnnouncementCreate} className="ml-auto rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1.5 h-9 px-4 shrink-0">
            <Plus className="h-3.5 w-3.5" />
            {t("Add Announcement", "Add Announcement")}
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
        <div className="space-y-6">
          {/* Category filter pills */}
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => { setArticleCategoryFilter("all"); setArtPage(1); }}
                className={`rounded-full px-5 py-2 text-[13px] font-bold transition-all ${articleCategoryFilter === "all" ? "bg-teal-600 text-white border border-teal-600" : "bg-transparent text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-800"}`}
              >
                {t("Tất cả", "All")}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setArticleCategoryFilter(cat.id); setArtPage(1); }}
                  className={`rounded-full px-5 py-2 text-[13px] font-bold transition-all ${articleCategoryFilter === cat.id ? "bg-teal-600 text-white border border-teal-600" : "bg-transparent text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-800"}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Articles */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            {(() => {
              const filtered = articleCategoryFilter === "all"
                ? articles
                : articles.filter((a) => a.category.id === articleCategoryFilter);
              
              if (filtered.length === 0) return (
                <div className="text-center py-16 text-slate-400 font-semibold text-sm">
                  {t("Chưa có bài viết nào.", "No articles created yet.")}
                </div>
              );

              // Apply pagination
              const totalPages = Math.ceil(filtered.length / artItemsPerPage) || 1;
              const currentPage = Math.min(artPage, totalPages);
              const startIndex = (currentPage - 1) * artItemsPerPage;
              const paginated = filtered.slice(startIndex, startIndex + artItemsPerPage);

              return (
                <>
                  <div className="flex flex-col divide-y divide-slate-100">
                    {paginated.map((art) => (
                      <div key={art.id} className="p-6 flex flex-wrap gap-6 items-center justify-between hover:bg-slate-50/50 transition">
                        <div className="flex items-center gap-6">
                          <div className="h-20 w-24 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                            <BookOpen className="h-8 w-8 stroke-[1.5]" />
                          </div>
                          
                          <div>
                            <h3 className="text-[17px] font-black text-slate-800 leading-tight mb-2">{art.title}</h3>
                            <div className="flex items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                              <span>{art.category.name}</span>
                              <span className="text-slate-300">•</span>
                              <span className="flex items-center gap-1.5"><Eye className="h-4 w-4" /> {art.viewCount}</span>
                              <span className="text-slate-300">•</span>
                              <span className="flex items-center gap-1.5"><ThumbsUp className="h-4 w-4" /> {art.likeCount}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 shrink-0">
                          {/* Status */}
                          <span className={`px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase ${
                            art.status === "PUBLISHED" ? "bg-emerald-50/80 text-emerald-600 border border-emerald-100" :
                            art.status === "HIDDEN" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                            "bg-slate-50 text-slate-500 border border-slate-100"
                          }`}>
                            {art.status}
                          </span>

                          <div className="flex items-center gap-1 text-slate-400">
                            {/* Comments modal button */}
                            <button
                              onClick={() => handleOpenCommentModal(art.id, art.title)}
                              className="flex items-center gap-1.5 p-2 rounded-xl text-sm font-bold transition hover:text-teal-600 hover:bg-slate-50"
                              title={t("Xem bình luận", "View comments")}
                            >
                              <MessageCircle className="h-[18px] w-[18px]" strokeWidth={2} />
                              <span className="text-slate-600">{(art as any).commentCount ?? 0}</span>
                            </button>

                            <button onClick={(e) => { e.stopPropagation(); setPreviewArticle(art); }} className="p-2 hover:text-teal-600 hover:bg-slate-50 rounded-xl transition" title="Preview">
                              <Eye className="h-[18px] w-[18px]" strokeWidth={2} />
                            </button>
                            <button onClick={() => handleOpenArticleEdit(art)} className="p-2 hover:text-teal-600 hover:bg-slate-50 rounded-xl transition">
                              <Edit2 className="h-[18px] w-[18px]" strokeWidth={2} />
                            </button>
                            <button onClick={() => handleDeleteArticle(art.id)} className="p-2 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition">
                              <Trash2 className="h-[18px] w-[18px]" strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination Footer */}
                  {filtered.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-5 border-t border-slate-100 bg-white">
                      <p className="text-[13px] font-semibold text-slate-500">
                        {t("Đang hiển thị", "Showing")} {startIndex + 1} {t("đến", "to")} {Math.min(startIndex + artItemsPerPage, filtered.length)} {t("của", "of")} {filtered.length} {t("bài viết", "articles")}
                      </p>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setArtPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setArtPage(page)}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-bold transition-colors border ${
                              currentPage === page 
                                ? "bg-teal-600 text-white border-teal-600" 
                                : "text-slate-600 border-transparent hover:bg-slate-50"
                            }`}
                          >
                            {page}
                          </button>
                        ))}

                        <button 
                          onClick={() => setArtPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Tab 2: Announcements */}
      {activeTab === "announcements" && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="rounded-2xl border-slate-100 shadow-sm bg-white p-5 flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                <Megaphone className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{t("Total Announcements", "Total Announcements")}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-800">{announcements.length}</span>
                </div>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{t("All time", "All time")}</p>
              </div>
            </Card>
            <Card className="rounded-2xl border-slate-100 shadow-sm bg-white p-5 flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{t("Active Announcements", "Active Announcements")}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-800">{announcements.filter(a => a.active).length}</span>
                </div>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{t("Currently active", "Currently active")}</p>
              </div>
            </Card>
            <Card className="rounded-2xl border-slate-100 shadow-sm bg-white p-5 flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{t("Total Reach", "Total Reach")}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-800">3,245</span>
                </div>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{t("Estimated recipients", "Estimated recipients")}</p>
              </div>
            </Card>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder={t("Tìm kiếm tiêu đề hoặc nội dung...", "Search title or content...")}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-teal-500 outline-none"
                value={annSearch}
                onChange={(e) => { setAnnSearch(e.target.value); setAnnPage(1); }}
              />
            </div>
            <select 
              value={annTypeFilter} 
              onChange={(e) => { setAnnTypeFilter(e.target.value); setAnnPage(1); }}
              className="bg-slate-50 border-none rounded-xl text-sm font-semibold py-2 px-3 outline-none min-w-[140px]"
            >
              <option value="ALL">{t("Tất cả loại", "All Types")}</option>
              <option value="PROMO">PROMO</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
            </select>
            <select 
              value={annStatusFilter} 
              onChange={(e) => { setAnnStatusFilter(e.target.value); setAnnPage(1); }}
              className="bg-slate-50 border-none rounded-xl text-sm font-semibold py-2 px-3 outline-none min-w-[120px]"
            >
              <option value="ALL">{t("Tất cả trạng thái", "All Status")}</option>
              <option value="ACTIVE">{t("Hoạt động", "Active")}</option>
              <option value="INACTIVE">{t("Đã ẩn", "Inactive")}</option>
            </select>
            <button 
              onClick={() => {
                setAnnSearch("");
                setAnnTypeFilter("ALL");
                setAnnStatusFilter("ALL");
                setAnnPriorityFilter("ALL");
                setAnnPage(1);
              }}
              className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 px-3 py-2"
            >
              <RefreshCw className="h-4 w-4" />
              {t("Xoá bộ lọc", "Clear filters")}
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {loadingAnnouncements ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
              </div>
            ) : (() => {
              // Apply filters
              const filtered = localAnnouncements.filter(a => {
                if (annTypeFilter !== "ALL" && a.type !== annTypeFilter) return false;
                if (annStatusFilter === "ACTIVE" && !a.active) return false;
                if (annStatusFilter === "INACTIVE" && a.active) return false;
                if (annSearch) {
                  const s = annSearch.toLowerCase();
                  return a.title.toLowerCase().includes(s) || (a.message || "").toLowerCase().includes(s);
                }
                return true;
              });

              // Apply pagination
              const totalPages = Math.ceil(filtered.length / annItemsPerPage) || 1;
              const currentPage = Math.min(annPage, totalPages);
              const startIndex = (currentPage - 1) * annItemsPerPage;
              const paginated = filtered.slice(startIndex, startIndex + annItemsPerPage);

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-12 text-slate-400 font-semibold text-sm bg-white">
                    {t("Chưa có thông báo nào.", "No announcements found.")}
                  </div>
                );
              }

              return (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="border-b border-slate-100 bg-white">
                          <th className="px-3 py-4 w-10"></th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">{t("TIÊU ĐỀ", "TITLE")}</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">{t("LOẠI", "TYPE")}</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">{t("TRẠNG THÁI", "STATUS")}</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">{t("ƯU TIÊN", "PRIORITY")}</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">{t("HẾT HẠN", "EXPIRES AT")}</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">{t("TẠO LÚC", "CREATED AT")}</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">{t("HÀNH ĐỘNG", "ACTIONS")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {paginated.map((ann) => {
                          // Find real index in localAnnouncements for drag
                          const realIndex = localAnnouncements.findIndex(a => a.id === ann.id);
                          const isDragging = draggingIndex === realIndex;
                          const isDragOver = dragOverIndex === realIndex;
                          return (
                          <tr
                            key={ann.id}
                            draggable
                            onDragStart={() => {
                              dragItem.current = realIndex;
                              setDraggingIndex(realIndex);
                            }}
                            onDragEnter={() => {
                              dragOverItem.current = realIndex;
                              setDragOverIndex(realIndex);
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDragEnd={handleSort}
                            className={`transition-colors group cursor-grab active:cursor-grabbing select-none
                              ${isDragging ? "opacity-40 bg-slate-50" : "hover:bg-slate-50/50"}
                              ${isDragOver && !isDragging ? "border-t-2 border-t-teal-500 bg-teal-50/40" : ""}
                            `}
                          >
                            {/* Drag handle column */}
                            <td className="px-3 py-4">
                              <div className="flex items-center justify-center text-slate-300 hover:text-teal-500 transition-colors">
                                <GripVertical className="h-4 w-4" />
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-slate-800">{ann.title}</p>
                              {ann.message && <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{ann.message}</p>}
                              {ann.linkUrl && (
                                <p className="text-[11px] font-semibold text-teal-600 flex items-center gap-1 mt-1">
                                  <Link className="h-3 w-3" />
                                  {ann.linkUrl}
                                </p>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                ann.type === "PROMO" ? "bg-purple-50 text-purple-600" :
                                ann.type === "WARNING" ? "bg-amber-50 text-amber-600" :
                                "bg-blue-50 text-blue-600"
                              }`}>
                                {ann.type === "PROMO" ? "PROMOTION" : ann.type === "WARNING" ? "UPDATE" : "SYSTEM"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                ann.active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                              }`}>
                                {ann.active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {ann.priority > 5 ? (
                                <span className="flex items-center gap-1 text-xs font-bold text-slate-700">
                                  <ArrowUp className="h-3.5 w-3.5 text-rose-500" />
                                  High
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs font-bold text-slate-700">
                                  <Minus className="h-3.5 w-3.5 text-blue-500" />
                                  Normal
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                              {ann.expiresAt ? new Date(ann.expiresAt).toLocaleDateString() : "-"}
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                              {new Date(ann.createdAt).toLocaleString(undefined, {
                                year: 'numeric', month: 'numeric', day: 'numeric',
                                hour: 'numeric', minute: '2-digit', hour12: true
                              })}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenAnnouncementEdit(ann)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition">
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleDeleteAnnouncement(ann.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
                    <p className="text-xs font-semibold text-slate-500">
                      Showing {startIndex + 1} to {Math.min(startIndex + annItemsPerPage, filtered.length)} of {filtered.length} announcements
                      <span className="ml-3 text-slate-400 font-normal">· {t("Kéo thả hàng để sắp xếp độ ưu tiên", "Drag rows to reorder priority")}</span>
                    </p>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setAnnPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 disabled:opacity-50 transition"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setAnnPage(page)}
                          className={`h-7 w-7 rounded-lg text-xs font-bold transition-colors ${
                            currentPage === page 
                              ? "bg-teal-600 text-white" 
                              : "text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {page}
                        </button>
                      ))}

                      <button 
                        onClick={() => setAnnPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 disabled:opacity-50 transition"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Tab 3: Reviews Management */}
      {activeTab === "reviews" && (
        <div className="space-y-6 pt-2">
          {/* Session history table (giống bảng /manager/history) */}
          <AdminSessionHistoryReviews />
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
            <form onSubmit={handleSaveArticle} className="space-y-4 text-sm font-bold text-slate-600">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label>{t("Tiêu đề", "Title")}</label>
                  <Input value={artTitle} onChange={(e) => {
                    setArtTitle(e.target.value);
                    if (e.target.value.trim()) setArtTitleError("");
                    if (!editingArticleId) setArtSlug(generateSlug(e.target.value));
                  }} required className={`rounded-xl p-3 text-sm ${artTitleError ? "border-rose-400 focus:border-rose-500" : ""}`} />
                  {artTitleError && <p className="text-xs text-rose-500 font-semibold">{artTitleError}</p>}
                </div>
                <div className="space-y-1">
                  <label>{t("Slug (URL)", "Slug")}</label>
                  <Input value={artSlug} onChange={(e) => {
                    setArtSlug(e.target.value);
                    if (e.target.value.trim()) setArtSlugError("");
                  }} required className={`rounded-xl p-3 text-sm ${artSlugError ? "border-rose-400" : ""}`} />
                  {artSlugError && <p className="text-xs text-rose-500 font-semibold">{artSlugError}</p>}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label>{t("Chuyên mục", "Category")}</label>
                  {!showInlineCatForm ? (
                    <div className="space-y-1.5">
                      <select
                        value={artCategoryId}
                        onChange={(e) => { setArtCategoryId(e.target.value); if (e.target.value) setArtCategoryError(""); }}
                        className={`w-full rounded-xl border p-2.5 text-sm font-semibold ${artCategoryError ? "border-rose-400" : "border-slate-200"}`}
                        required
                      >
                        <option value="" disabled>{t("Chọn chuyên mục...", "Select category...")}</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      {artCategoryError && <p className="text-xs text-rose-500 font-semibold">{artCategoryError}</p>}
                      <button
                        type="button"
                        onClick={() => setShowInlineCatForm(true)}
                        className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 transition"
                      >
                        <Plus className="h-3 w-3" />
                        {t("Thêm chuyên mục mới", "Add new category")}
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 space-y-2">
                      <p className="text-xs font-black text-teal-700 uppercase tracking-wider">{t("Chuyên mục mới", "New Category")}</p>
                      <Input
                        value={inlineCatName}
                        onChange={(e) => {
                          setInlineCatName(e.target.value);
                          setInlineCatSlug(generateSlug(e.target.value));
                          setInlineCatError("");
                        }}
                        placeholder={t("Tên chuyên mục", "Category name")}
                        className={`rounded-lg text-sm h-9 ${inlineCatError ? "border-rose-400" : ""}`}
                      />
                      {inlineCatError && <p className="text-xs text-rose-500 font-semibold">{inlineCatError}</p>}
                      <Input
                        value={inlineCatSlug}
                        onChange={(e) => setInlineCatSlug(e.target.value)}
                        placeholder="slug-url"
                        className="rounded-lg text-sm h-9"
                      />
                      <Input
                        value={inlineCatDesc}
                        onChange={(e) => setInlineCatDesc(e.target.value)}
                        placeholder={t("Mô tả (tuỳ chọn)", "Description (optional)")}
                        className="rounded-lg text-sm h-9"
                      />
                      <div className="flex gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          disabled={!inlineCatName.trim() || inlineCatSaving}
                          className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs h-7 px-3"
                          onClick={async () => {
                            const err = validateCategoryName(inlineCatName);
                            if (err) { setInlineCatError(err); return; }
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
                              setInlineCatError("");
                              setShowInlineCatForm(false);
                              swalSuccess("Category created successfully.");
                            } catch {
                              setInlineCatError("Failed to create category. Please try again.");
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
                            setInlineCatError("");
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
                  <select value={artStatus} onChange={(e) => setArtStatus(e.target.value as any)} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-semibold" required>
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="DRAFT">DRAFT</option>
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
                  onError={(msg) => swalError(msg)}
                />
              </div>
              <div className="space-y-1">
                <label>{t("Tóm tắt ngắn (Excerpt)", "Excerpt")}</label>
                <textarea value={artExcerpt} onChange={(e) => setArtExcerpt(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 outline-none min-h-[60px]" />
              </div>
              <div className="space-y-1">
                <label>{t("Nội dung bài viết", "Content")}</label>
                <RichTextArea value={artContent} onChange={(v) => { setArtContent(v); if (v.trim()) setArtContentError(""); }} />
                {artContentError && <p className="text-xs text-rose-500 font-semibold">{artContentError}</p>}
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
            <form onSubmit={handleSaveCategory} className="space-y-4 text-sm font-bold text-slate-600">
              <div className="space-y-1">
                <label>{t("Tên chuyên mục", "Category Name")}</label>
                <Input value={catName} onChange={(e) => {
                  setCatName(e.target.value);
                  setCatNameError("");
                  if (!editingCategoryId) setCatSlug(generateSlug(e.target.value));
                }} required className={`rounded-xl p-3 text-sm ${catNameError ? "border-rose-400" : ""}`} />
                {catNameError && <p className="text-xs text-rose-500 font-semibold">{catNameError}</p>}
              </div>
              <div className="space-y-1">
                <label>{t("Slug (URL)", "Slug")}</label>
                <Input value={catSlug} onChange={(e) => setCatSlug(e.target.value)} required className="rounded-xl p-3 text-sm" />
              </div>
              <div className="space-y-1">
                <label>{t("Mô tả", "Description")}</label>
                <textarea value={catDesc} onChange={(e) => setCatDesc(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 outline-none min-h-[60px] text-sm" />
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
            <form onSubmit={handleSaveAnnouncement} className="space-y-4 text-sm font-bold text-slate-600">
              <div className="space-y-1">
                <label>{t("Nội dung hiển thị", "Message text")} *</label>
                <Input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} required className="rounded-xl text-sm" placeholder={t("Nhập nội dung thông báo...", "Enter announcement text...")} />
              </div>
              <div className="space-y-1">
                <label>{t("Loại", "Type")}</label>
                <select 
                  value={annType} 
                  onChange={(e) => setAnnType(e.target.value as any)} 
                  className={`w-full rounded-xl border border-slate-200 p-2.5 text-sm font-bold ${
                    annType === 'PROMO' ? 'text-amber-700' :
                    annType === 'WARNING' ? 'text-rose-700' :
                    'text-blue-700'
                  }`}
                >
                  <option value="PROMO" className="text-amber-700 font-bold">PROMO — {t("Khuyến mãi / ưu đãi", "Discount / deal")}</option>
                  <option value="INFO" className="text-blue-700 font-bold">INFO — {t("Thông tin chung", "General information")}</option>
                  <option value="WARNING" className="text-rose-700 font-bold">WARNING — {t("Cảnh báo / lưu ý quan trọng", "Alert / important notice")}</option>
                </select>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label>{t("Link", "Link")}</label>
                    <select 
                      value={annLinkUrl} 
                      onChange={(e) => setAnnLinkUrl(e.target.value)} 
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-semibold"
                    >
                      <option value="">{t("Không có (None)", "None")}</option>
                      <option value="/customer/booking">{t("Đặt lịch (Booking)", "Booking")}</option>
                      <option value="/customer/history">{t("Lịch sử (History)", "History")}</option>
                      <option value="/customer/promotions">{t("Khuyến mãi (Promotions)", "Promotions")}</option>
                      <option value="/customer/profile">{t("Hồ sơ (Profile)", "Profile")}</option>
                      <option value="/customer/rewards">{t("Điểm thưởng (Rewards)", "Rewards")}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label>{t("Label", "Label")}</label>
                    <Input value={annLinkLabel} onChange={(e) => setAnnLinkLabel(e.target.value)} className="rounded-xl text-sm" placeholder={t("Đặt ngay", "Book now")} />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label>{t("Hết hạn vào (tuỳ chọn)", "Expires At (optional)")}</label>
                <Input type="datetime-local" value={annExpiresAt} onChange={(e) => setAnnExpiresAt(e.target.value)} className="rounded-xl text-sm" />
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

      {/* Modal: Category Manager */}
      {showCategoryManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg bg-white rounded-3xl shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Tag className="h-4 w-4 text-teal-600" />
                {t("Quản lý danh mục", "Manage Categories")}
              </h2>
              <button onClick={() => setShowCategoryManager(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-2">
              {categories.length === 0 ? (
                <p className="text-sm text-slate-400 italic py-4 text-center">{t("Chưa có danh mục nào.", "No categories yet.")}</p>
              ) : (
                categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{cat.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">/blog/{cat.slug}</p>
                      {cat.description && <p className="text-[11px] text-slate-500 truncate mt-0.5">{cat.description}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-200 rounded-full px-2 py-0.5">
                        {articles.filter((a) => a.category.id === cat.id).length} articles
                      </span>
                      <button
                        onClick={() => { setShowCategoryManager(false); handleOpenCategoryEdit(cat); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition"
                        title="Edit"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100">
              <Button
                onClick={() => { setShowCategoryManager(false); handleOpenCategoryCreate(); }}
                className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm gap-1.5 h-10"
              >
                <Plus className="h-4 w-4" />
                {t("Thêm danh mục mới", "Add New Category")}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal: Comments Popup */}
      {commentModalArticleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-xl bg-white rounded-3xl shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="min-w-0 pr-4">
                <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-teal-600 shrink-0" />
                  {t("Bình luận", "Comments")}
                </h2>
                <p className="text-xs text-slate-400 font-medium truncate mt-0.5">{commentModalTitle}</p>
              </div>
              <button onClick={() => setCommentModalArticleId(null)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-3">
              {modalComments.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <MessageCircle className="h-8 w-8 text-slate-200 mx-auto" />
                  <p className="text-sm text-slate-400 italic">{t("Chưa có bình luận nào.", "No comments yet.")}</p>
                </div>
              ) : (
                modalComments.map((comm) => (
                  <div key={comm.commentId} className="flex items-start justify-between gap-3 bg-slate-50 rounded-xl border border-slate-200/60 p-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-slate-800">{comm.authorName}</span>
                        <span className="text-[11px] font-medium text-slate-400">{new Date(comm.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-600 leading-relaxed">{comm.content}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteComment(comm.commentId)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
                      title="Delete comment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
              <Button variant="outline" onClick={() => setCommentModalArticleId(null)} className="rounded-xl font-bold text-sm h-9 px-5">
                {t("Đóng", "Close")}
              </Button>
            </div>
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
