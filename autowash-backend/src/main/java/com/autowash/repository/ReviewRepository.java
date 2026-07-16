package com.autowash.repository;

import com.autowash.entity.Review;
import java.util.List;
import java.util.UUID;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReviewRepository extends JpaRepository<Review, UUID> {
    boolean existsByBookingId(UUID bookingId);
    Optional<Review> findByBookingId(UUID bookingId);
    List<Review> findByFeaturedTrueOrderByCreatedAtDesc();

    @Query("SELECT r FROM Review r WHERE " +
           "(:rating IS NULL OR r.rating = :rating)")
    Page<Review> findAllFiltered(@Param("rating") Integer rating, Pageable pageable);

    long countByFeaturedTrue();

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.booking.packageId = :packageId")
    Double getAverageRatingByPackageId(@Param("packageId") UUID packageId);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.booking.packageId = :packageId")
    Long getReviewCountByPackageId(@Param("packageId") UUID packageId);
}
