package com.autowash.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "blog_comments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BlogComment {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "article_id", nullable = false)
    private BlogArticle article;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public BlogComment(BlogArticle article, User customer, String content) {
        Instant now = Instant.now();
        this.id = UUID.randomUUID();
        this.article = article;
        this.customer = customer;
        this.content = content;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void updateContent(String content) {
        this.content = content;
        this.updatedAt = Instant.now();
    }
}
