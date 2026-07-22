package com.autowash.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "manager_notification_templates")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ManagerNotificationTemplate {

    @Id
    @Column(name = "template_key", length = 50)
    private String templateKey;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(nullable = false, length = 255)
    private String description;

    @Column(nullable = false, columnDefinition = "text")
    private String message;

    @Column(nullable = false, columnDefinition = "text")
    private String preview;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public ManagerNotificationTemplate(String templateKey, String displayName, String description, String message, String preview) {
        Instant now = Instant.now();
        this.templateKey = templateKey;
        this.displayName = displayName;
        this.description = description;
        this.message = message;
        this.preview = preview;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void update(String displayName, String description, String message, String preview) {
        this.displayName = displayName;
        this.description = description;
        this.message = message;
        this.preview = preview;
        this.updatedAt = Instant.now();
    }
}
