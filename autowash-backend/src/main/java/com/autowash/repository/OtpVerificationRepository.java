package com.autowash.repository;

import com.autowash.entity.User;
import com.autowash.entity.enums.OtpPurpose;
import com.autowash.entity.OtpVerification;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OtpVerificationRepository extends JpaRepository<OtpVerification, UUID> {

    Optional<OtpVerification> findFirstByUserAndPurposeAndVerifiedAtIsNullOrderByCreatedAtDesc(User user, OtpPurpose purpose);

    Optional<OtpVerification> findFirstByUserAndPurposeOrderByCreatedAtDesc(User user, OtpPurpose purpose);

    List<OtpVerification> findByUserAndPurposeAndVerifiedAtIsNull(User user, OtpPurpose purpose);

    long countByUserAndPurposeAndCreatedAtAfter(User user, OtpPurpose purpose, Instant createdAt);
}

