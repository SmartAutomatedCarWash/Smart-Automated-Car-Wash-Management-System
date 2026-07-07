package com.autowash.entity;

import com.autowash.entity.enums.ActiveStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
@Entity
@Table(name = "packages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Package {

    @Id
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(name = "base_price", nullable = false)
    private long basePrice;

    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(length = 100)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActiveStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Package(String name, String description, long basePrice, int durationMinutes, String category, String imageUrl, ActiveStatus status) {
        this.id = UUID.randomUUID();
        this.name = name;
        this.description = description;
        this.basePrice = basePrice;
        this.durationMinutes = durationMinutes;
        this.category = category;
        this.imageUrl = imageUrl;
        this.status = status;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void update(String name, String description, long basePrice, int durationMinutes, String category, String imageUrl, ActiveStatus status) {
        this.name = name;
        this.description = description;
        this.basePrice = basePrice;
        this.durationMinutes = durationMinutes;
        this.category = category;
        this.imageUrl = imageUrl;
        this.status = status;
        this.updatedAt = Instant.now();
    }

    public void deactivate() {
        this.status = ActiveStatus.INACTIVE;
        this.updatedAt = Instant.now();
    }
}
