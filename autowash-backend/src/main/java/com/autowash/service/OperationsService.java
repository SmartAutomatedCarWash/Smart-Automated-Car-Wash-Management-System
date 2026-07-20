package com.autowash.service;

import com.autowash.dto.CheckInWashSessionResponse;
import com.autowash.dto.CancelWashSessionResponse;
import com.autowash.dto.CompleteWashSessionResponse;
import com.autowash.dto.CreateWashSessionRequest;
import com.autowash.dto.CreateWashSessionResponse;
import com.autowash.dto.EligibleSessionBookingResponse;
import com.autowash.dto.OperationsQueueResponse;
import com.autowash.dto.QueueWashSessionResponse;
import com.autowash.dto.StaffDashboardSummaryResponse;
import com.autowash.dto.StaffOptionResponse;
import com.autowash.dto.StaffSessionHistoryResponse;
import com.autowash.dto.StartWashSessionResponse;
import com.autowash.dto.StaffTodayResponse;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface OperationsService {
    CreateWashSessionResponse createSession(CreateWashSessionRequest request);
    OperationsQueueResponse getQueue();
    List<EligibleSessionBookingResponse> listEligibleSessionBookings(int limit);
    QueueWashSessionResponse queueSession(UUID sessionId);
    CheckInWashSessionResponse checkInSession(UUID sessionId);
    StartWashSessionResponse startSession(UUID sessionId);
    CompleteWashSessionResponse completeSession(UUID sessionId);
    CancelWashSessionResponse cancelSession(UUID sessionId, String reason, String faultType);
    StaffDashboardSummaryResponse getStaffSummary();
    List<StaffOptionResponse> listActiveStaff();
    OperationsQueueResponse getOperationsQueue();
    List<EligibleSessionBookingResponse> getEligibleSessionBookings(int limit);
    StaffDashboardSummaryResponse getMyStaffSummary();
    StaffTodayResponse getMySessionsToday(LocalDate date);
    StaffSessionHistoryResponse getMySessionHistory(
            int page,
            int limit,
            String period,
            LocalDate date,
            String servicePackage,
            String rating,
            String search,
            String sort
    );
    StaffSessionHistoryResponse getManagerSessionHistory(
            int page,
            int limit,
            String period,
            LocalDate date,
            String servicePackage,
            String rating,
            String search,
            String sort,
            UUID staffId
    );
}

