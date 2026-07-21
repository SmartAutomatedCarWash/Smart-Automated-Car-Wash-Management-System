package com.autowash.service.impl;

import com.autowash.dto.BookingStaffOptionResponse;
import com.autowash.dto.BookingStaffOptionsRequest;
import com.autowash.entity.Booking;
import com.autowash.entity.BookingDetail;
import com.autowash.entity.Combo;
import com.autowash.entity.Package;
import com.autowash.entity.User;
import com.autowash.entity.enums.BookingItemType;
import com.autowash.service.BookingStaffRecommendationService;
import com.autowash.service.CatalogService;
import com.autowash.service.CurrentUserService;
import com.autowash.service.StaffAssignmentService;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingStaffRecommendationServiceImpl implements BookingStaffRecommendationService {

    private final CurrentUserService currentUserService;
    private final CatalogService catalogService;
    private final StaffAssignmentService staffAssignmentService;

    public BookingStaffRecommendationServiceImpl(
            CurrentUserService currentUserService,
            CatalogService catalogService,
            StaffAssignmentService staffAssignmentService
    ) {
        this.currentUserService = currentUserService;
        this.catalogService = catalogService;
        this.staffAssignmentService = staffAssignmentService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingStaffOptionResponse> recommendStaffOptions(BookingStaffOptionsRequest request) {
        BookingDraft draft = buildDraftBooking(request);
        List<User> recommendedStaff = staffAssignmentService.rankAvailableStaffForBooking(draft.booking(), 3);

        return staffAssignmentService.rankActiveStaffForBooking(draft.booking()).stream()
                .map(staff -> new BookingStaffOptionResponse(
                        staff.getId().toString(),
                        staff.getFullName(),
                        draft.serviceName(),
                        recommendedStaff.stream().anyMatch(recommended -> recommended.getId().equals(staff.getId())),
                        staffAssignmentService.isStaffAvailableForBooking(staff, draft.booking())
                                ? "Available for this service window"
                                : "Busy during this service window",
                        staffAssignmentService.isStaffAvailableForBooking(staff, draft.booking()),
                        staffAssignmentService.isStaffAvailableForBooking(staff, draft.booking()) ? "AVAILABLE" : "BUSY"
                ))
                .toList();
    }

    private BookingDraft buildDraftBooking(BookingStaffOptionsRequest request) {
        LocalTime bookingTime = LocalTime.parse(request.bookingTime());
        Booking booking = new Booking(
                UUID.randomUUID(),
                currentUserService.getCurrentUser(),
                null,
                request.bookingDate().atTime(bookingTime).atZone(ZoneId.systemDefault()).toInstant()
        );

        String serviceName;
        if (request.packageId() != null && !request.packageId().isBlank()) {
            Package pkg = catalogService.requireActivePackage(request.packageId());
            serviceName = pkg.getName();
            booking.addDetail(BookingDetail.builder()
                    .itemType(BookingItemType.PACKAGE)
                    .refId(pkg.getId())
                    .snapshotName(pkg.getName())
                    .snapshotPrice(pkg.getBasePrice())
                    .subtotal(pkg.getBasePrice())
                    .durationMinutes(pkg.getDurationMinutes())
                    .build());
            catalogService.requireActivePackageOptions(pkg, request.options()).forEach(option -> booking.addDetail(
                    BookingDetail.builder()
                            .itemType(BookingItemType.ADDON)
                            .refId(option.optionId())
                            .snapshotName(option.name())
                            .snapshotPrice(option.price())
                            .subtotal(option.price())
                            .durationMinutes(option.durationMinutes())
                            .build()
            ));
        } else {
            Combo combo = catalogService.requireActiveCombo(request.comboId());
            serviceName = combo.getName();
            booking.addDetail(BookingDetail.builder()
                    .itemType(BookingItemType.COMBO)
                    .refId(combo.getId())
                    .snapshotName(combo.getName())
                    .snapshotPrice(0)
                    .subtotal(0)
                    .durationMinutes(combo.getDurationMinutes())
                    .build());
            catalogService.requireActiveComboOptions(combo, request.options()).forEach(option -> booking.addDetail(
                    BookingDetail.builder()
                            .itemType(BookingItemType.ADDON)
                            .refId(option.optionId())
                            .snapshotName(option.name())
                            .snapshotPrice(option.price())
                            .subtotal(option.price())
                            .durationMinutes(option.durationMinutes())
                            .build()
            ));
        }

        return new BookingDraft(booking, serviceName);
    }

    private record BookingDraft(Booking booking, String serviceName) {
    }
}
