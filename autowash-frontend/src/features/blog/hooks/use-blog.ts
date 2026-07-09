"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listPublishedArticles,
  getPublishedArticle,
  listBlogCategories,
  toggleBlogLike,
  getBlogLikeSummary,
  postBlogComment,
  listBlogComments,
  listAdminArticles,
  getAdminArticle,
  listAdminCategories,
  createAdminArticle,
  updateAdminArticle,
  deleteAdminArticle,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  deleteAdminComment,
  BlogArticle,
  BlogCategory,
  BlogCommentPage,
  BlogLikeResult,
} from "@/features/blog/api/blog-service";
import type { ApiErrorResponse } from "@/shared/types/api.types";

// Query keys
export const blogArticlesQueryKey = () => ["blog", "articles", "published"];
export const blogArticleDetailQueryKey = (slug: string) => ["blog", "articles", "published", slug];
export const blogCategoriesQueryKey = () => ["blog", "categories"];
export const blogLikeSummaryQueryKey = (articleId: string) => ["blog", "articles", articleId, "likes"];
export const blogCommentsQueryKey = (articleId: string, page: number) => ["blog", "articles", articleId, "comments", page];

export const adminArticlesQueryKey = () => ["admin", "blog", "articles"];
export const adminArticleDetailQueryKey = (articleId: string) => ["admin", "blog", "articles", articleId];
export const adminCategoriesQueryKey = () => ["admin", "blog", "categories"];

// Customer Hooks

export function useBlogArticles() {
  return useQuery<BlogArticle[], ApiErrorResponse>({
    queryKey: blogArticlesQueryKey(),
    queryFn: listPublishedArticles,
  });
}

export function useBlogArticle(slug: string) {
  return useQuery<BlogArticle, ApiErrorResponse>({
    queryKey: blogArticleDetailQueryKey(slug),
    queryFn: () => getPublishedArticle(slug),
    enabled: slug.length > 0,
  });
}

export function useBlogCategories() {
  return useQuery<BlogCategory[], ApiErrorResponse>({
    queryKey: blogCategoriesQueryKey(),
    queryFn: listBlogCategories,
  });
}

export function useBlogLikeSummary(articleId: string, enabled = true) {
  return useQuery<BlogLikeResult, ApiErrorResponse>({
    queryKey: blogLikeSummaryQueryKey(articleId),
    queryFn: () => getBlogLikeSummary(articleId),
    enabled: enabled && articleId.length > 0,
  });
}

export function useToggleBlogLike(articleId: string) {
  const queryClient = useQueryClient();
  return useMutation<BlogLikeResult, ApiErrorResponse, void>({
    mutationFn: () => toggleBlogLike(articleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogLikeSummaryQueryKey(articleId) });
      queryClient.invalidateQueries({ queryKey: blogArticlesQueryKey() });
    },
  });
}

export function useBlogComments(articleId: string, page = 1, limit = 10) {
  return useQuery<BlogCommentPage, ApiErrorResponse>({
    queryKey: blogCommentsQueryKey(articleId, page),
    queryFn: () => listBlogComments(articleId, page, limit),
    enabled: articleId.length > 0,
  });
}

export function usePostBlogComment(articleId: string) {
  const queryClient = useQueryClient();
  return useMutation<any, ApiErrorResponse, string>({
    mutationFn: (content) => postBlogComment(articleId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogCommentsQueryKey(articleId, 1) });
      queryClient.invalidateQueries({ queryKey: blogArticlesQueryKey() });
    },
  });
}

// Admin Hooks

export function useAdminArticles() {
  return useQuery<BlogArticle[], ApiErrorResponse>({
    queryKey: adminArticlesQueryKey(),
    queryFn: listAdminArticles,
  });
}

export function useAdminArticleDetail(articleId: string) {
  return useQuery<BlogArticle, ApiErrorResponse>({
    queryKey: adminArticleDetailQueryKey(articleId),
    queryFn: () => getAdminArticle(articleId),
    enabled: articleId.length > 0,
  });
}

export function useAdminCategories() {
  return useQuery<BlogCategory[], ApiErrorResponse>({
    queryKey: adminCategoriesQueryKey(),
    queryFn: listAdminCategories,
  });
}

export function useCreateAdminArticle() {
  const queryClient = useQueryClient();
  return useMutation<BlogArticle, ApiErrorResponse, any>({
    mutationFn: createAdminArticle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminArticlesQueryKey() });
      queryClient.invalidateQueries({ queryKey: blogArticlesQueryKey() });
    },
  });
}

export function useUpdateAdminArticle(articleId: string) {
  const queryClient = useQueryClient();
  return useMutation<BlogArticle, ApiErrorResponse, any>({
    mutationFn: (payload) => updateAdminArticle(articleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminArticleDetailQueryKey(articleId) });
      queryClient.invalidateQueries({ queryKey: adminArticlesQueryKey() });
      queryClient.invalidateQueries({ queryKey: blogArticlesQueryKey() });
    },
  });
}

export function useDeleteAdminArticle() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiErrorResponse, string>({
    mutationFn: deleteAdminArticle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminArticlesQueryKey() });
      queryClient.invalidateQueries({ queryKey: blogArticlesQueryKey() });
    },
  });
}

export function useCreateAdminCategory() {
  const queryClient = useQueryClient();
  return useMutation<any, ApiErrorResponse, any>({
    mutationFn: createAdminCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCategoriesQueryKey() });
      queryClient.invalidateQueries({ queryKey: blogCategoriesQueryKey() });
    },
  });
}

export function useUpdateAdminCategory(categoryId: string) {
  const queryClient = useQueryClient();
  return useMutation<any, ApiErrorResponse, any>({
    mutationFn: (payload) => updateAdminCategory(categoryId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCategoriesQueryKey() });
      queryClient.invalidateQueries({ queryKey: blogCategoriesQueryKey() });
    },
  });
}

export function useDeleteAdminCategory() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiErrorResponse, string>({
    mutationFn: deleteAdminCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCategoriesQueryKey() });
      queryClient.invalidateQueries({ queryKey: blogCategoriesQueryKey() });
    },
  });
}

export function useDeleteAdminComment(articleId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiErrorResponse, string>({
    mutationFn: deleteAdminComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogCommentsQueryKey(articleId, 1) });
      queryClient.invalidateQueries({ queryKey: blogArticlesQueryKey() });
    },
  });
}
