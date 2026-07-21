package com.autowash.assembler;

import com.autowash.dto.BookingDetailDto;
import com.autowash.dto.BookingDetailResponse;
import com.autowash.dto.BookingListItemResponse;
import com.autowash.dto.BookingStatusHistoryItem;
import com.autowash.entity.Booking;
import com.autowash.entity.BookingStaffAssignment;
import com.autowash.entity.BookingDetail;
import com.autowash.entity.User;
import com.autowash.entity.WashSession;
import com.autowash.entity.WashSessionStaffAssignment;
import com.autowash.entity.enums.BookingItemType;
import com.autowash.entity.enums.PaymentMethod;
import com.autowash.entity.enums.PaymentStatus;
import com.autowash.repository.BookingStaffAssignmentRepository;
import com.autowash.repository.WashSessionStaffAssignmentRepository;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class BookingResponseAssembler {

    private static final Duration PENDING_BOOKING_HOLD_DURATION = Duration.ofMinutes(15);
    private final BookingStaffAssignmentRepository bookingStaffAssignmentRepository;
    private final WashSessionStaffAssignmentRepository washSessionStaffAssignmentRepository;
    private final String sepayBankCode;
    private final String sepayAccountNumber;
    private final String sepayAccountName;
    private final String sepayStoreName;
    private final String sepayVaCode;

    public BookingResponseAssembler(
            BookingStaffAssignmentRepository bookingStaffAssignmentRepository,
            WashSessionStaffAssignmentRepository washSessionStaffAssignmentRepository,
            @Value("${autowash.payment.sepay.bank-code:TPBank}") String sepayBankCode,
            @Value("${autowash.payment.sepay.account-number:}") String sepayAccountNumber,
            @Value("${autowash.payment.sepay.account-name:}") String sepayAccountName,
            @Value("${autowash.payment.sepay.store-name:Aura Car Wash}") String sepayStoreName,
            @Value("${autowash.payment.sepay.va-code:}") String sepayVaCode
    ) {
        this.bookingStaffAssignmentRepository = bookingStaffAssignmentRepository;
        this.washSessionStaffAssignmentRepository = washSessionStaffAssignmentRepository;
        this.sepayBankCode = sepayBankCode;
        this.sepayAccountNumber = sepayAccountNumber;
        this.sepayAccountName = sepayAccountName;
        this.sepayStoreName = sepayStoreName;
        this.sepayVaCode = sepayVaCode;
    }

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
                        payment.paidAt(),
                        buildSepayQrUrl(booking, payment),
                        sepayPaymentField(sepayBankCode),
                        sepayPaymentField(sepayAccountNumber),
                        sepayPaymentField(sepayAccountName),
                        buildSepayTransferDescription(payment)
                ),
                booking.getStatus().name(),
                booking.getConfirmationStatus().name(),
                resolveConfirmationExpiresAt(booking, payment),
                washSession == null ? null : washSession.getId().toString(),
                resolveAssignedStaffName(booking, washSession),
                resolveAssignedStaff(booking, washSession),
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

    private String buildSepayQrUrl(Booking booking, PaymentInfo payment) {
        String description = buildSepayTransferDescription(payment);
        if (payment.method() != PaymentMethod.BANK_TRANSFER
                || payment.status() == PaymentStatus.PAID
                || description == null
                || isBlank(sepayBankCode)
                || isBlank(sepayAccountNumber)) {
            return null;
        }
        StringBuilder url = new StringBuilder("https://vietqr.app/img?");
        appendQuery(url, "acc", sepayAccountNumber.trim());
        appendQuery(url, "bank", sepayBankCode.trim());
        appendQuery(url, "amount", String.valueOf(booking.getPricing().getFinalAmount()));
        appendQuery(url, "des", description);
        appendQuery(url, "template", "compact");
        appendQuery(url, "showinfo", "true");
        if (!isBlank(sepayAccountName)) {
            appendQuery(url, "holder", sepayAccountName.trim());
        }
        if (!isBlank(sepayStoreName)) {
            appendQuery(url, "store", sepayStoreName.trim());
        }
        return url.toString();
    }

    private String buildSepayTransferDescription(PaymentInfo payment) {
        if (payment.method() != PaymentMethod.BANK_TRANSFER || isBlank(payment.transactionRef())) {
            return null;
        }
        String code = payment.transactionRef().trim().toUpperCase(Locale.ROOT);
        if (isBlank(sepayVaCode)) {
            return code;
        }
        return "TKP" + sepayVaCode.trim().toUpperCase(Locale.ROOT) + " " + code;
    }

    private String sepayPaymentField(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private void appendQuery(StringBuilder url, String key, String value) {
        if (url.charAt(url.length() - 1) != '?') {
            url.append('&');
        }
        url.append(URLEncoder.encode(key, StandardCharsets.UTF_8))
                .append('=')
                .append(URLEncoder.encode(value, StandardCharsets.UTF_8));
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String resolveAssignedStaffName(Booking booking, WashSession washSession) {
        List<BookingDetailResponse.StaffAssignment> assignedStaff = resolveAssignedStaff(booking, washSession);
        if (!assignedStaff.isEmpty()) {
            return assignedStaff.get(0).staffName();
        }
        if (washSession != null && washSession.getAssignedStaff() != null) {
            return washSession.getAssignedStaff().getFullName();
        }
        User leadStaff = booking.getAssignedStaff();
        return leadStaff == null ? null : leadStaff.getFullName();
    }

    private List<BookingDetailResponse.StaffAssignment> resolveAssignedStaff(Booking booking, WashSession washSession) {
        List<BookingDetailResponse.StaffAssignment> sessionAssignments = washSession == null
                ? List.of()
                : washSessionStaffAssignmentRepository.findBySessionOrderBySortOrderAsc(washSession)
                .stream()
                .map(this::toStaffAssignment)
                .toList();
        if (!sessionAssignments.isEmpty()) {
            return sessionAssignments;
        }

        List<BookingDetailResponse.StaffAssignment> bookingAssignments = bookingStaffAssignmentRepository.findByBookingOrderBySortOrderAsc(booking)
                .stream()
                .map(this::toStaffAssignment)
                .toList();
        if (!bookingAssignments.isEmpty()) {
            return bookingAssignments;
        }

        User assignedStaff = washSession != null && washSession.getAssignedStaff() != null
                ? washSession.getAssignedStaff()
                : booking.getAssignedStaff();
        return assignedStaff == null
                ? List.of()
                : List.of(new BookingDetailResponse.StaffAssignment(
                        assignedStaff.getId().toString(),
                        assignedStaff.getFullName(),
                        1
                ));
    }

    private BookingDetailResponse.StaffAssignment toStaffAssignment(BookingStaffAssignment assignment) {
        return new BookingDetailResponse.StaffAssignment(
                assignment.getStaff().getId().toString(),
                assignment.getStaff().getFullName(),
                assignment.getSortOrder()
        );
    }

    private BookingDetailResponse.StaffAssignment toStaffAssignment(WashSessionStaffAssignment assignment) {
        return new BookingDetailResponse.StaffAssignment(
                assignment.getStaff().getId().toString(),
                assignment.getStaff().getFullName(),
                assignment.getSortOrder()
        );
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
