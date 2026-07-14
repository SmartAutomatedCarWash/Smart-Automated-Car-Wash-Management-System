package com.autowash.repository;

import com.autowash.entity.Announcement;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AnnouncementRepository extends JpaRepository<Announcement, UUID> {

    @Query("""
            select a from Announcement a
            where a.active = true
              and (a.expiresAt is null or a.expiresAt > :now)
            order by a.priority desc, a.createdAt desc
            """)
    List<Announcement> findActiveAnnouncements(@Param("now") Instant now);

    List<Announcement> findAllByOrderByPriorityDescCreatedAtDesc();
}
