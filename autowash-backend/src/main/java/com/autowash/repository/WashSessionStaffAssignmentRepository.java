package com.autowash.repository;

import com.autowash.entity.User;
import com.autowash.entity.WashSession;
import com.autowash.entity.WashSessionStaffAssignment;
import com.autowash.entity.enums.WashSessionStatus;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WashSessionStaffAssignmentRepository extends JpaRepository<WashSessionStaffAssignment, UUID> {

    @EntityGraph(attributePaths = {"staff"})
    List<WashSessionStaffAssignment> findBySessionOrderBySortOrderAsc(WashSession session);

    void deleteBySession(WashSession session);

    @EntityGraph(attributePaths = {"session", "session.booking", "session.booking.details"})
    List<WashSessionStaffAssignment> findByStaffAndSession_StatusIn(User staff, Collection<WashSessionStatus> statuses);
}
