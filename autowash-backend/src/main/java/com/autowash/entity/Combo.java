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
@Table(name = "combos")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Combo {

    @Id
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    private long price;

    @Column(name = "original_price")
    private Long originalPrice;

    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;

    @Column(name = "duration_days")
    private Integer durationDays;

    @Column(name = "max_usages")
    private Integer maxUsages;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActiveStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Combo(String name, String description, long price, Long originalPrice, int durationMinutes,
                 Integer durationDays, Integer maxUsages, String imageUrl, ActiveStatus status) {
        Instant now = Instant.now();
        this.id = UUID.randomUUID();
        this.name = name;
        this.description = description;
        this.price = price;
        this.originalPrice = originalPrice;
        this.durationMinutes = durationMinutes;
        this.durationDays = durationDays;
        this.maxUsages = maxUsages;
        this.imageUrl = imageUrl;
        this.status = status;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void update(String name, String description, long price, Long originalPrice, int durationMinutes,
                       Integer durationDays, Integer maxUsages, String imageUrl, ActiveStatus status) {
        this.name = name;
        this.description = description;
        this.price = price;
        this.originalPrice = originalPrice;
        this.durationMinutes = durationMinutes;
        this.durationDays = durationDays;
        this.maxUsages = maxUsages;
        this.imageUrl = imageUrl;
        this.status = status;
        this.updatedAt = Instant.now();
    }

    public void deactivate() {
        this.status = ActiveStatus.INACTIVE;
        this.updatedAt = Instant.now();
    }
}
