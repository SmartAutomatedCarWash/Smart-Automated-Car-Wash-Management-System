package com.autowash.repository;

import com.autowash.entity.BlogComment;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlogCommentRepository extends JpaRepository<BlogComment, UUID> {
    int countByArticleId(UUID articleId);
    Page<BlogComment> findByArticleIdOrderByCreatedAtDesc(UUID articleId, Pageable pageable);
}
