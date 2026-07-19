package com.autowash.service.impl;

import com.autowash.entity.WashSession;

import com.autowash.entity.enums.BookingItemType;

import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;


import com.autowash.service.CustomerWashTrackingService;
import com.autowash.entity.User;
import com.autowash.entity.Booking;
import com.autowash.entity.Combo;
import com.autowash.entity.Package;
import com.autowash.repository.ComboRepository;
import com.autowash.repository.PackageRepository;
import com.autowash.dto.CustomerWashTrackingResponse;
import com.autowash.dto.WashCompletionSummaryResponse;
import com.autowash.repository.PaymentRepository;
import com.autowash.entity.enums.WashSessionStatus;
import com.autowash.repository.WashSessionRepository;
import com.autowash.service.CurrentUserService;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerWashTrackingServiceImpl implements CustomerWashTrackingService {

    private static final Set<WashSessionStatus> ACTIVE_STATUSES = Set.of(
            WashSessionStatus.PENDING,
            WashSessionStatus.QUEUED,
            WashSessionStatus.CHECKED_IN,
            WashSessionStatus.IN_PROGRESS
    );

    private final CurrentUserService currentUserService;
    private final WashSessionRepository washSessionRepository;
    private final PackageRepository PackageRepository;
    private final ComboRepository ComboRepository;
    private final PaymentRepository paymentRepository;

    public CustomerWashTrackingServiceImpl(
            CurrentUserService currentUserService,
            WashSessionRepository washSessionRepository,
            PackageRepository PackageRepository,
            ComboRepository ComboRepository,
            PaymentRepository paymentRepository
    ) {
        this.currentUserService = currentUserService;
        this.washSessionRepository = washSessionRepository;
        this.PackageRepository = PackageRepository;
        this.ComboRepository = ComboRepository;
        this.paymentRepository = paymentRepository;
    }

    @Transactional(readOnly = true)
    public CustomerWashTrackingResponse getActiveSession() {
        User customer = currentUserService.getCurrentUser();
        return washSessionRepository.findFirstByBookingCustomerAndStatusInOrderByCreatedAtDesc(customer, ACTIVE_STATUSES)
                .map(this::toResponse)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public CustomerWashTrackingResponse getSession(UUID washSessionId) {
        User customer = currentUserService.getCurrentUser();
        WashSession session = washSessionRepository.findByIdAndBookingCustomer(washSessionId, customer)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Wash session not found", ErrorCode.RESOURCE_NOT_FOUND));
        return toResponse(session);
    }

    @Transactional(readOnly = true)
public WashCompletionSummaryResponse getCompletionSummary(UUID washSessionId) {
    User customer = currentUserService.getCurrentUser();
    WashSession session = washSessionRepository.findByIdAndBookingCustomer(washSessionId, customer)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Wash session not found", ErrorCode.RESOURCE_NOT_FOUND));
    if (session.getStatus() != WashSessionStatus.COMPLETED) {
        throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Session is not completed", ErrorCode.BUSINESS_RULE_VIOLATION);
    }
    Booking booking = session.getBooking();
    var payment = paymentRepository.findByBooking(booking).orElse(null);
    return new WashCompletionSummaryResponse(
            session.getId().toString(),
            booking.getId().toString(),
            session.getStatus().name(),
            resolveServiceName(booking),
            booking.getVehicle().getPlate(),
            (booking.getPricing() != null ? booking.getPricing().getFinalAmount() : 0L),
            payment == null ? null : payment.getMethod().name(),
            payment == null ? null : payment.getStatus().name(),
            session.getAwardedLoyaltyPoints(),
            session.getProjectedLoyaltyPoints(),
            session.getCompletedAt(),
            session.getAssignedStaff() == null ? null : session.getAssignedStaff().getFullName(),
            session.getNotes()
    );
}

    private CustomerWashTrackingResponse toResponse(WashSession session) {
        Booking booking = session.getBooking();
        return CustomerWashTrackingResponse.builder()
                .washSessionId(session.getId().toString())
                .bookingId(booking.getId().toString())
                .status(session.getStatus().name())
                .customerName(booking.getCustomer().getFullName())
                .customerPhone(booking.getCustomer().getPhone())
                .vehiclePlate(booking.getVehicle().getPlate())
                .vehicleBrand(booking.getVehicle().getBrand())
                .vehicleModel(booking.getVehicle().getModel())
                .packageId(booking.getDetails().stream().filter(d -> d.getItemType() == BookingItemType.PACKAGE).map(d -> d.getRefId()).findFirst().orElse(null) == null ? null : booking.getDetails().stream().filter(d -> d.getItemType() == BookingItemType.PACKAGE).map(d -> d.getRefId()).findFirst().orElse(null).toString())
                .serviceName(resolveServiceName(booking))
                .bookingDate(booking.getBookingDate())
                .bookingTime(booking.getBookingTime().toString())
                .assignedStaffName(session.getAssignedStaff() == null ? null : session.getAssignedStaff().getFullName())
                .feeAmount(session.getFeeAmount())
                .projectedLoyaltyPoints(session.getProjectedLoyaltyPoints())
                .awardedLoyaltyPoints(session.getAwardedLoyaltyPoints())
                .notes(session.getNotes())
                .createdAt(session.getCreatedAt())
                .checkedInAt(session.getCheckedInAt())
                .startedAt(session.getStartedAt())
                .completedAt(session.getCompletedAt())
                .build();
    }

    private String resolveServiceName(Booking booking) {
        if (booking.getDetails().stream().filter(d -> d.getItemType() == BookingItemType.PACKAGE).map(d -> d.getRefId()).findFirst().orElse(null) != null) {
            return PackageRepository.findById(booking.getDetails().stream().filter(d -> d.getItemType() == BookingItemType.PACKAGE).map(d -> d.getRefId()).findFirst().orElse(null))
                    .map(Package::getName)
                    .orElse(booking.getDetails().stream().filter(d -> d.getItemType() == BookingItemType.PACKAGE).map(d -> d.getRefId()).findFirst().orElse(null) == null ? null : booking.getDetails().stream().filter(d -> d.getItemType() == BookingItemType.PACKAGE).map(d -> d.getRefId()).findFirst().orElse(null).toString());
        }
        if (booking.getDetails().stream().filter(d -> d.getItemType() == BookingItemType.COMBO).map(d -> d.getRefId()).findFirst().orElse(null) != null) {
            return ComboRepository.findById(booking.getDetails().stream().filter(d -> d.getItemType() == BookingItemType.COMBO).map(d -> d.getRefId()).findFirst().orElse(null))
                    .map(Combo::getName)
                    .orElse(booking.getDetails().stream().filter(d -> d.getItemType() == BookingItemType.COMBO).map(d -> d.getRefId()).findFirst().orElse(null) == null ? null : booking.getDetails().stream().filter(d -> d.getItemType() == BookingItemType.COMBO).map(d -> d.getRefId()).findFirst().orElse(null).toString());
        }
        return null;
    }
}

