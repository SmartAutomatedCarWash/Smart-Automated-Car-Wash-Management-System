-- Thêm Bảng Lượt thích bài viết Blog
CREATE TABLE "blog_likes" (
  "id" uuid DEFAULT (gen_random_uuid()) PRIMARY KEY,
  "article_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  CONSTRAINT "uq_blog_article_customer_like" UNIQUE ("article_id", "customer_id")
);

-- Ràng buộc Khóa Ngoại cho blog_likes
ALTER TABLE "blog_likes" ADD FOREIGN KEY ("article_id") REFERENCES "blog_articles" ("id") ON DELETE CASCADE;
ALTER TABLE "blog_likes" ADD FOREIGN KEY ("customer_id") REFERENCES "users" ("id") ON DELETE CASCADE;

-- Thêm Bảng Bình luận bài viết Blog
CREATE TABLE "blog_comments" (
  "id" uuid DEFAULT (gen_random_uuid()) PRIMARY KEY,
  "article_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- Ràng buộc Khóa Ngoại cho blog_comments
ALTER TABLE "blog_comments" ADD FOREIGN KEY ("article_id") REFERENCES "blog_articles" ("id") ON DELETE CASCADE;
ALTER TABLE "blog_comments" ADD FOREIGN KEY ("customer_id") REFERENCES "users" ("id") ON DELETE CASCADE;
