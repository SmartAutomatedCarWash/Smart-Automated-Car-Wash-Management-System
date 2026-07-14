package com.autowash.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "announcements")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Announcement {

    @Id
    private UUID id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "text")
    private String message;

    @Column(name = "link_url", length = 500)
    private String linkUrl;

    @Column(name = "link_label", length = 100)
    private String linkLabel;

    @Column(nullable = false, length = 30)
    private String type;

    @Column(nullable = false)
    private boolean active;

    @Column(nullable = false)
    private int priority;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Announcement(String title, String message, String linkUrl, String linkLabel,
                        String type, boolean active, int priority, Instant expiresAt) {
        Instant now = Instant.now();
        this.id = UUID.randomUUID();
        this.title = title;
        this.message = message;
        this.linkUrl = linkUrl;
        this.linkLabel = linkLabel;
        this.type = type != null ? type : "PROMO";
        this.active = active;
        this.priority = priority;
        this.expiresAt = expiresAt;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void update(String title, String message, String linkUrl, String linkLabel,
                       String type, boolean active, int priority, Instant expiresAt) {
        this.title = title;
        this.message = message;
        this.linkUrl = linkUrl;
        this.linkLabel = linkLabel;
        this.type = type != null ? type : "PROMO";
        this.active = active;
        this.priority = priority;
        this.expiresAt = expiresAt;
        this.updatedAt = Instant.now();
    }
}
