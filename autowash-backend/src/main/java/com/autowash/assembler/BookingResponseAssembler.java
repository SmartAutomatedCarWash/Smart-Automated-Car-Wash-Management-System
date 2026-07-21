package com.autowash.assembler;

import com.autowash.dto.BookingDetailDto;
import com.autowash.dto.BookingDetailResponse;
import com.autowash.dto.BookingListItemResponse;
import com.autowash.dto.BookingStatusHistoryItem;
import com.autowash.entity.Booking;
import com.autowash.entity.BookingDetail;
import com.autowash.entity.User;
import com.autowash.entity.WashSession;
import com.autowash.entity.enums.BookingItemType;
import com.autowash.entity.enums.PaymentMethod;
import com.autowash.entity.enums.PaymentStatus;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class BookingResponseAssembler {

    private static final Duration PENDING_BOOKING_HOLD_DURATION = Duration.ofMinutes(15);

    public BookingListItemResponse toListItem(Booking booking, WashSession washSession) {
        return toListItem(booking, washSession, booking.getDetails());
    }

    public BookingListItemResponse toListItem(Booking booking, WashSession washSession, List<BookingDetail> details) {
        String packageName = resolvePackageName(details);
        String washStatus = washSession == null ? null : washSession.getStatus().name();

        return new BookingListItemResponse(
                booking.getId().toString(),
                booking.getVehicle().getPlate(),
                packageName,
                booking.getBookingDate(),
                booking.getBookingTime().toString(),
                booking.getPricing().getFinalAmount(),
                booking.getStatus().name(),
                washStatus,
                booking.getCreatedAt(),
                resolveConfirmationExpiresAt(booking, null),
                washSession == null ? null : washSession.getCompletedAt()
        );
    }

    public BookingDetailResponse toDetailResponse(
            Booking booking,
            WashSession washSession,
            PaymentInfo payment,
            List<BookingStatusHistoryItem> statusHistory
    ) {
        String packageName = resolvePackageName(booking);

        return new BookingDetailResponse(
                booking.getId().toString(),
                booking.getId().toString(),
                booking.getCustomer().getId().toString(),
                booking.getCustomer().getFullName(),
                booking.getCustomer().getPhone(),
                booking.getConfirmationEmail(),
                booking.getVehicle().getId().toString(),
                booking.getVehicle().getPlate(),
                booking.getVehicle().getBrand(),
                booking.getVehicle().getModel(),
                packageName,
                toBookingDetailDtos(booking),
                new BookingDetailResponse.Pricing(
                        booking.getPricing().getSubtotal(),
                        booking.getPricing().getDiscountRefSnapshot(),
                        booking.getPricing().getDiscountAmount(),
                        booking.getPricing().getFinalAmount(),
                        "VND"
                ),
                new BookingDetailResponse.Scheduling(
                        booking.getBookingDate(),
                        booking.getBookingTime().toString(),
                        booking.getPricing().getEstimatedDurationMinutes(),
                        booking.getBookingTime()
                                .plusMinutes(booking.getPricing().getEstimatedDurationMinutes())
                                .format(DateTimeFormatter.ofPattern("HH:mm"))
                ),
                new BookingDetailResponse.Payment(
                        payment.method().name(),
                        payment.status().name(),
                        payment.transactionRef(),
                        payment.paidAt()
                ),
                booking.getStatus().name(),
                booking.getConfirmationStatus().name(),
                resolveConfirmationExpiresAt(booking, payment),
                washSession == null ? null : washSession.getId().toString(),
                resolveAssignedStaffName(booking, washSession),
                washSession == null ? null : washSession.getStatus().name(),
                washSession == null ? null : washSession.getNotes(),
                booking.getCreatedAt(),
                null,
                statusHistory
        );
    }

    private Instant resolveConfirmationExpiresAt(Booking booking, PaymentInfo payment) {
        PaymentStatus paymentStatus = payment == null ? PaymentStatus.UNPAID : payment.status();
        if (booking.getStatus().name().equals("PENDING") && paymentStatus != PaymentStatus.PAID) {
            return booking.getCreatedAt().plus(PENDING_BOOKING_HOLD_DURATION);
        }
        return booking.getConfirmationExpiresAt();
    }

    private String resolveAssignedStaffName(Booking booking, WashSession washSession) {
        if (washSession != null && washSession.getAssignedStaff() != null) {
            return washSession.getAssignedStaff().getFullName();
        }
        User assignedStaff = booking.getAssignedStaff();
        return assignedStaff == null ? null : assignedStaff.getFullName();
    }

    private String resolvePackageName(Booking booking) {
        return resolvePackageName(booking.getDetails());
    }

    private String resolvePackageName(List<BookingDetail> details) {
        return details.stream()
                .filter(d -> d.getItemType() == BookingItemType.PACKAGE || d.getItemType() == BookingItemType.COMBO)
                .map(BookingDetail::getSnapshotName)
                .findFirst()
                .orElse("Unknown Package");
    }

    public List<BookingDetailDto> toBookingDetailDtos(Booking booking) {
        return booking.getDetails().stream()
                .map(d -> new BookingDetailDto(
                        d.getId(),
                        d.getItemType().name(),
                        d.getRefId(),
                        d.getSnapshotName(),
                        d.getSnapshotPrice(),
                        d.getQuantity(),
                        d.getSubtotal(),
                        d.getDurationMinutes()
                ))
                .toList();
    }

    public record PaymentInfo(
            PaymentMethod method,
            PaymentStatus status,
            String transactionRef,
            Instant paidAt
    ) {
    }
}
