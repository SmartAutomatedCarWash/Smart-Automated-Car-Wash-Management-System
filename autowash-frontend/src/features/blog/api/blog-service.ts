import { apiClient, apiRequest } from "@/shared/lib/api";

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface BlogArticle {
  id: string;
  category: BlogCategory;
  authorId: string;
  authorName: string;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  excerpt: string | null;
  content: string;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN";
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogLikeResult {
  articleId: string;
  totalLikes: number;
  hasLiked: boolean;
}

export interface BlogComment {
  commentId: string;
  articleId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  content: string;
  createdAt: string;
}

export interface BlogCommentPage {
  content: BlogComment[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface AdminArticleRequest {
  categoryId: string;
  title: string;
  slug: string;
  thumbnailUrl?: string;
  excerpt?: string;
  content: string;
  status?: "DRAFT" | "PUBLISHED" | "HIDDEN";
}

// ────── Public APIs ──────

export async function listPublishedArticles(): Promise<BlogArticle[]> {
  const res = await apiClient.get("/blog/articles");
  return res.data.data;
}

export async function getPublishedArticle(slug: string): Promise<BlogArticle> {
  const res = await apiClient.get(`/blog/articles/${slug}`);
  return res.data.data;
}

export async function listBlogCategories(): Promise<BlogCategory[]> {
  const res = await apiClient.get("/blog/categories");
  return res.data.data;
}

export function toggleBlogLike(articleId: string) {
  return apiRequest<BlogLikeResult>({
    method: "POST",
    url: `/blog/articles/${articleId}/like`,
  });
}

export async function getBlogLikeSummary(articleId: string): Promise<BlogLikeResult> {
  const res = await apiClient.get(`/blog/articles/${articleId}/likes`);
  return res.data.data;
}

export function postBlogComment(articleId: string, content: string) {
  return apiRequest<BlogComment, { content: string }>({
    method: "POST",
    url: `/blog/articles/${articleId}/comments`,
    data: { content },
  });
}

export async function listBlogComments(articleId: string, page = 1, limit = 10): Promise<BlogCommentPage> {
  const res = await apiClient.get(`/blog/articles/${articleId}/comments`, {
    params: { page, limit },
  });
  return res.data.data;
}

// ────── Admin APIs ──────

export async function listAdminArticles(): Promise<BlogArticle[]> {
  const res = await apiClient.get("/admin/blog/articles");
  return res.data.data;
}

export async function getAdminArticle(articleId: string): Promise<BlogArticle> {
  const res = await apiClient.get(`/admin/blog/articles/${articleId}`);
  return res.data.data;
}

export async function listAdminCategories(): Promise<BlogCategory[]> {
  const res = await apiClient.get("/admin/blog/categories");
  return res.data.data;
}

export function createAdminArticle(payload: AdminArticleRequest) {
  return apiRequest<BlogArticle, AdminArticleRequest>({
    method: "POST",
    url: "/admin/blog/articles",
    data: payload,
  });
}

export function updateAdminArticle(articleId: string, payload: AdminArticleRequest) {
  return apiRequest<BlogArticle, AdminArticleRequest>({
    method: "PUT",
    url: `/admin/blog/articles/${articleId}`,
    data: payload,
  });
}

export function deleteAdminArticle(articleId: string) {
  return apiRequest<void>({
    method: "DELETE",
    url: `/admin/blog/articles/${articleId}`,
  });
}

export function createAdminCategory(payload: { name: string; slug: string; description?: string }) {
  return apiRequest({
    method: "POST",
    url: "/admin/blog/categories",
    data: payload,
  });
}

export function updateAdminCategory(categoryId: string, payload: { name: string; slug: string; description?: string }) {
  return apiRequest({
    method: "PUT",
    url: `/admin/blog/categories/${categoryId}`,
    data: payload,
  });
}

export function deleteAdminCategory(categoryId: string) {
  return apiRequest<void>({
    method: "DELETE",
    url: `/admin/blog/categories/${categoryId}`,
  });
}

export function deleteAdminComment(commentId: string) {
  return apiRequest<void>({
    method: "DELETE",
    url: `/admin/blog/comments/${commentId}`,
  });
}
