package com.autowash.service.impl;

import com.autowash.dto.BlogArticleRequest;
import com.autowash.dto.BlogArticleResponse;
import com.autowash.dto.BlogCategoryRequest;
import com.autowash.dto.BlogCategoryResponse;
import com.autowash.entity.BlogArticle;
import com.autowash.entity.BlogCategory;
import com.autowash.entity.User;
import com.autowash.entity.enums.BlogArticleStatus;
import com.autowash.repository.BlogArticleRepository;
import com.autowash.repository.BlogCategoryRepository;
import com.autowash.service.BlogService;
import com.autowash.service.CurrentUserService;
import com.autowash.shared.exception.ApiException;
import com.autowash.dto.BlogLikeResult;
import com.autowash.dto.BlogCommentResponse;
import com.autowash.entity.BlogLike;
import com.autowash.entity.BlogComment;
import com.autowash.repository.BlogLikeRepository;
import com.autowash.repository.BlogCommentRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;

@org.springframework.stereotype.Service
public class BlogServiceImpl implements BlogService {

    private final BlogCategoryRepository blogCategoryRepository;
    private final BlogArticleRepository blogArticleRepository;
    private final CurrentUserService currentUserService;
    private final BlogLikeRepository blogLikeRepository;
    private final BlogCommentRepository blogCommentRepository;

    public BlogServiceImpl(
            BlogCategoryRepository blogCategoryRepository,
            BlogArticleRepository blogArticleRepository,
            CurrentUserService currentUserService,
            BlogLikeRepository blogLikeRepository,
            BlogCommentRepository blogCommentRepository
    ) {
        this.blogCategoryRepository = blogCategoryRepository;
        this.blogArticleRepository = blogArticleRepository;
        this.currentUserService = currentUserService;
        this.blogLikeRepository = blogLikeRepository;
        this.blogCommentRepository = blogCommentRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<BlogCategoryResponse> listCategories() {
        return blogCategoryRepository.findAll().stream()
                .map(this::toCategoryResponse)
                .toList();
    }

    @Override
    @Transactional
    public BlogCategoryResponse createCategory(BlogCategoryRequest request) {
        if (blogCategoryRepository.existsBySlug(request.slug())) {
            throw validationError("Blog category slug already exists");
        }
        BlogCategory category = blogCategoryRepository.save(new BlogCategory(
                request.name(),
                request.slug(),
                request.description()
        ));
        return toCategoryResponse(category);
    }

    @Override
    @Transactional
    public BlogCategoryResponse updateCategory(String categoryId, BlogCategoryRequest request) {
        BlogCategory category = requireCategory(categoryId);
        if (blogCategoryRepository.existsBySlugAndIdNot(request.slug(), category.getId())) {
            throw validationError("Blog category slug already exists");
        }
        category.update(request.name(), request.slug(), request.description());
        return toCategoryResponse(category);
    }

    @Override
    @Transactional
    public void deleteCategory(String categoryId) {
        blogCategoryRepository.delete(requireCategory(categoryId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<BlogArticleResponse> listPublishedArticles() {
        return blogArticleRepository.findByStatusOrderByPublishedAtDescCreatedAtDesc(BlogArticleStatus.PUBLISHED)
                .stream()
                .map(this::toArticleResponse)
                .toList();
    }

    @Override
    @Transactional
    public BlogArticleResponse getPublishedArticle(String slug) {
        BlogArticle article = blogArticleRepository.findBySlugAndStatus(slug, BlogArticleStatus.PUBLISHED)
                .orElseThrow(() -> notFound("Blog article not found"));
        article.incrementViewCount();
        return toArticleResponse(article);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BlogArticleResponse> listAdminArticles() {
        return blogArticleRepository.findAll().stream()
                .map(this::toArticleResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BlogArticleResponse getAdminArticle(String articleId) {
        return toArticleResponse(requireArticle(articleId));
    }

    @Override
    @Transactional
    public BlogArticleResponse createArticle(BlogArticleRequest request) {
        if (blogArticleRepository.existsBySlug(request.slug())) {
            throw validationError("Blog article slug already exists");
        }
        User author = currentUserService.getCurrentUser();
        BlogArticle article = blogArticleRepository.save(new BlogArticle(
                requireCategory(request.categoryId()),
                author,
                request.title(),
                request.slug(),
                request.thumbnailUrl(),
                request.excerpt(),
                request.content(),
                request.status()
        ));
        return toArticleResponse(article);
    }

    @Override
    @Transactional
    public BlogArticleResponse updateArticle(String articleId, BlogArticleRequest request) {
        BlogArticle article = requireArticle(articleId);
        if (blogArticleRepository.existsBySlugAndIdNot(request.slug(), article.getId())) {
            throw validationError("Blog article slug already exists");
        }
        article.update(
                requireCategory(request.categoryId()),
                request.title(),
                request.slug(),
                request.thumbnailUrl(),
                request.excerpt(),
                request.content(),
                request.status()
        );
        return toArticleResponse(article);
    }

    @Override
    @Transactional
    public void deleteArticle(String articleId) {
        blogArticleRepository.delete(requireArticle(articleId));
    }

    private BlogCategory requireCategory(String categoryId) {
        return blogCategoryRepository.findById(parseUuid(categoryId, "Blog category not found"))
                .orElseThrow(() -> notFound("Blog category not found"));
    }

    private BlogArticle requireArticle(String articleId) {
        return blogArticleRepository.findById(parseUuid(articleId, "Blog article not found"))
                .orElseThrow(() -> notFound("Blog article not found"));
    }

    private UUID parseUuid(String id, String message) {
        try {
            return UUID.fromString(id);
        } catch (RuntimeException exception) {
            throw new ApiException(HttpStatus.NOT_FOUND, message, "RESOURCE_NOT_FOUND");
        }
    }

    private ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, message, "RESOURCE_NOT_FOUND");
    }

    private ApiException validationError(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message, "VALIDATION_ERROR");
    }

    private BlogCategoryResponse toCategoryResponse(BlogCategory category) {
        return new BlogCategoryResponse(
                category.getId().toString(),
                category.getName(),
                category.getSlug(),
                category.getDescription()
        );
    }

    private BlogArticleResponse toArticleResponse(BlogArticle article) {
        int likeCount = blogLikeRepository.countByArticleId(article.getId());
        int commentCount = blogCommentRepository.countByArticleId(article.getId());
        return new BlogArticleResponse(
                article.getId().toString(),
                toCategoryResponse(article.getCategory()),
                article.getAuthor().getId().toString(),
                article.getAuthor().getFullName(),
                article.getTitle(),
                article.getSlug(),
                article.getThumbnailUrl(),
                article.getExcerpt(),
                article.getContent(),
                article.getStatus().name(),
                article.getViewCount(),
                likeCount,
                commentCount,
                article.getPublishedAt(),
                article.getCreatedAt(),
                article.getUpdatedAt()
        );
    }

    @Override
    @Transactional
    public BlogLikeResult toggleLike(String articleId) {
        User user = currentUserService.getCurrentUser();
        BlogArticle article = requireArticle(articleId);
        
        java.util.Optional<BlogLike> existingLike = blogLikeRepository.findByArticleIdAndCustomerId(article.getId(), user.getId());
        boolean hasLiked;
        if (existingLike.isPresent()) {
            blogLikeRepository.delete(existingLike.get());
            hasLiked = false;
        } else {
            blogLikeRepository.save(new BlogLike(article, user));
            hasLiked = true;
        }
        
        int totalLikes = blogLikeRepository.countByArticleId(article.getId());
        return new BlogLikeResult(article.getId().toString(), totalLikes, hasLiked);
    }

    @Override
    @Transactional(readOnly = true)
    public BlogLikeResult getLikeSummary(String articleId) {
        BlogArticle article = requireArticle(articleId);
        int totalLikes = blogLikeRepository.countByArticleId(article.getId());
        
        boolean hasLiked = false;
        User user = getCurrentUserOrNull();
        if (user != null) {
            hasLiked = blogLikeRepository.existsByArticleIdAndCustomerId(article.getId(), user.getId());
        }
        
        return new BlogLikeResult(article.getId().toString(), totalLikes, hasLiked);
    }

    @Override
    @Transactional
    public BlogCommentResponse addComment(String articleId, String content) {
        if (content == null || content.trim().isBlank()) {
            throw validationError("Comment content cannot be blank");
        }
        if (content.length() > 1000) {
            throw validationError("Comment content cannot exceed 1000 characters");
        }
        User user = currentUserService.getCurrentUser();
        BlogArticle article = requireArticle(articleId);
        
        BlogComment comment = blogCommentRepository.save(new BlogComment(article, user, content.trim()));
        return toCommentResponse(comment);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BlogCommentResponse> listComments(String articleId, int page, int limit) {
        BlogArticle article = requireArticle(articleId);
        Pageable pageable = PageRequest.of(page - 1, limit);
        Page<BlogComment> commentsPage = blogCommentRepository.findByArticleIdOrderByCreatedAtDesc(article.getId(), pageable);
        return commentsPage.map(this::toCommentResponse);
    }

    @Override
    @Transactional
    public void deleteComment(String commentId) {
        UUID uuid = parseUuid(commentId, "Comment not found");
        BlogComment comment = blogCommentRepository.findById(uuid)
                .orElseThrow(() -> notFound("Comment not found"));
        blogCommentRepository.delete(comment);
    }

    private User getCurrentUserOrNull() {
        try {
            return currentUserService.getCurrentUser();
        } catch (RuntimeException exception) {
            return null;
        }
    }

    private BlogCommentResponse toCommentResponse(BlogComment comment) {
        return new BlogCommentResponse(
                comment.getId().toString(),
                comment.getArticle().getId().toString(),
                comment.getCustomer().getFullName(),
                comment.getCustomer().getAvatarUrl(),
                comment.getContent(),
                comment.getCreatedAt()
        );
    }
}
