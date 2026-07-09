package com.autowash.repository;

import com.autowash.entity.BlogLike;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlogLikeRepository extends JpaRepository<BlogLike, UUID> {
    int countByArticleId(UUID articleId);
    boolean existsByArticleIdAndCustomerId(UUID articleId, UUID customerId);
    Optional<BlogLike> findByArticleIdAndCustomerId(UUID articleId, UUID customerId);
}
