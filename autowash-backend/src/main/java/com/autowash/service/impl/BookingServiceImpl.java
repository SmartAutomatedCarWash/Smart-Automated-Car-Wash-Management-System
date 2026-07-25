package com.autowash.service.impl;

import com.autowash.entity.WashSession;
import com.autowash.assembler.BookingResponseAssembler;
import com.autowash.dto.EarnPointsResponse;
import com.autowash.entity.Notification;
import com.autowash.entity.SystemSettings;
import com.autowash.repository.NotificationRepository;
import com.autowash.repository.SystemSettingsRepository;
import com.autowash.entity.BookingDetail;
import com.autowash.entity.BookingStaffAssignment;
import com.autowash.entity.enums.BookingItemType;
import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;
import com.autowash.dto.BookingDetailResponse;
import java.util.List;
import java.util.Comparator;
import java.time.LocalDate;
import java.util.Locale;
import java.time.Instant;
import java.time.Duration;
import java.time.ZoneId;
import java.util.UUID;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import com.autowash.dto.BookingStatusHistoryItem;
import com.autowash.entity.User;
import com.autowash.entity.enums.NotificationType;
import com.autowash.dto.BookingListItemResponse;
import com.autowash.dto.CancelBookingResponse;
import com.autowash.dto.CreateBookingRequest;
import com.autowash.dto.CreateBookingResponse;
import com.autowash.dto.DiscountValidationRequest;
import com.autowash.dto.DiscountValidationResponse;
import com.autowash.dto.PayBookingResponse;
import com.autowash.entity.CustomerCombo;
import com.autowash.entity.enums.ActiveStatus;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.entity.enums.DiscountType;
import com.autowash.entity.enums.UserStatus;
import com.autowash.entity.Booking;
import com.autowash.entity.BookingPricing;
import com.autowash.entity.Discount;
import com.autowash.entity.UserDiscount;
import com.autowash.entity.BookingStatusHistory;
import com.autowash.entity.Payment;
import com.autowash.entity.enums.PaymentMethod;
import com.autowash.entity.enums.PaymentStatus;
import com.autowash.entity.enums.UserDiscountStatus;
import com.autowash.entity.enums.WashSessionStatus;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.BookingDetailRepository;
import com.autowash.repository.BookingStaffAssignmentRepository;
import com.autowash.repository.BookingStatusHistoryRepository;
import com.autowash.repository.PaymentRepository;
import com.autowash.repository.DiscountRepository;
import com.autowash.repository.UserDiscountRepository;
import com.autowash.entity.Combo;
import com.autowash.entity.Package;
import com.autowash.repository.SlotHoldRepository;
import com.autowash.repository.ViolationRecordRepository;
import com.autowash.entity.ViolationRecord;
import com.autowash.service.BookingService;
import com.autowash.service.CatalogService;
import com.autowash.service.CustomerComboService;
import com.autowash.service.DiscountRedemptionService;
import com.autowash.service.LoyaltyService;
import com.autowash.service.StaffAssignmentService;
import com.autowash.service.VnpayPaymentService;
import com.autowash.shared.dto.PaginationMeta;
import com.autowash.service.BookingEmailDeliveryService;
import com.autowash.service.CurrentUserService;
import com.autowash.repository.WashSessionRepository;
import com.autowash.entity.Vehicle;
import com.autowash.entity.enums.VehicleStatus;
import com.autowash.repository.VehicleRepository;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Set;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingServiceImpl implements BookingService {

    private static final Logger LOGGER = LoggerFactory.getLogger(BookingServiceImpl.class);
    private static final Duration PENDING_BOOKING_HOLD_DURATION = Duration.ofMinutes(15);

    private static final Set<BookingStatus> ACTIVE_BOOKING_STATUSES = Set.of(
            BookingStatus.CONFIRMED,
            BookingStatus.CHECKED_IN,
            BookingStatus.IN_PROGRESS
    );
    private static final Set<BookingStatus> DUPLICATE_BOOKING_STATUSES = Set.of(
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
            BookingStatus.CHECKED_IN,
            BookingStatus.IN_PROGRESS
    );
    private static final Set<BookingStatus> CANCELLABLE_BOOKING_STATUSES = Set.of(
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED
    );
    private static final List<BookingStatus> MAIN_BOOKING_STATUS_FLOW = List.of(
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
            BookingStatus.CHECKED_IN,
            BookingStatus.IN_PROGRESS,
            BookingStatus.COMPLETED
    );
    private static final Set<BookingStatus> TERMINAL_BOOKING_STATUSES = Set.of(
            BookingStatus.COMPLETED,
            BookingStatus.CANCELLED,
            BookingStatus.NO_SHOW
    );
    private static final Set<BookingStatus> SIDE_BOOKING_STATUSES = Set.of(
            BookingStatus.CANCELLED,
            BookingStatus.NO_SHOW
    );

    private final CurrentUserService currentUserService;
    private final VehicleRepository VehicleRepository;
    private final BookingRepository BookingRepository;
    private final CatalogService catalogService;
    private final WashSessionRepository washSessionRepository;
    private final LoyaltyService loyaltyService;
    private final CustomerComboService customerComboService;
    private final BookingDetailRepository bookingDetailRepository;
    private final PaymentRepository paymentRepository;
    private final BookingStaffAssignmentRepository bookingStaffAssignmentRepository;
    private final BookingStatusHistoryRepository bookingStatusHistoryRepository;
    private final BookingEmailDeliveryService bookingEmailDeliveryService;
    private final DiscountRedemptionService discountRedemptionService;
    private final DiscountRepository discountRepository;
    private final UserDiscountRepository userDiscountRepository;
    private final SystemSettingsRepository systemSettingsRepository;
    private final SlotHoldRepository slotHoldRepository;
    private final ViolationRecordRepository violationRecordRepository;
    private final NotificationRepository notificationRepository;
    private final BookingResponseAssembler bookingResponseAssembler;
    private final StaffAssignmentService staffAssignmentService;
    private final ObjectProvider<VnpayPaymentService> vnpayPaymentServiceProvider;

    @Value("${autowash.payment.sepay.payment-code-prefix:AU}")
    private String sepayPaymentCodePrefix;

    public BookingServiceImpl(
            CurrentUserService currentUserService,
            VehicleRepository VehicleRepository,
            BookingRepository BookingRepository,
            CatalogService catalogService,
            WashSessionRepository washSessionRepository,
            LoyaltyService loyaltyService,
            CustomerComboService customerComboService,
            BookingDetailRepository bookingDetailRepository,
            PaymentRepository paymentRepository,
            BookingStaffAssignmentRepository bookingStaffAssignmentRepository,
            BookingStatusHistoryRepository bookingStatusHistoryRepository,
            BookingEmailDeliveryService bookingEmailDeliveryService,
            DiscountRedemptionService discountRedemptionService,
            DiscountRepository discountRepository,
            UserDiscountRepository userDiscountRepository,
            SystemSettingsRepository systemSettingsRepository,
            SlotHoldRepository slotHoldRepository,
            ViolationRecordRepository violationRecordRepository,
            NotificationRepository notificationRepository,
            BookingResponseAssembler bookingResponseAssembler,
            StaffAssignmentService staffAssignmentService,
            ObjectProvider<VnpayPaymentService> vnpayPaymentServiceProvider
    ) {
        this.currentUserService = currentUserService;
        this.VehicleRepository = VehicleRepository;
        this.BookingRepository = BookingRepository;
        this.catalogService = catalogService;
        this.washSessionRepository = washSessionRepository;
        this.loyaltyService = loyaltyService;
        this.customerComboService = customerComboService;
        this.bookingDetailRepository = bookingDetailRepository;
        this.paymentRepository = paymentRepository;
        this.bookingStaffAssignmentRepository = bookingStaffAssignmentRepository;
        this.bookingStatusHistoryRepository = bookingStatusHistoryRepository;
        this.bookingEmailDeliveryService = bookingEmailDeliveryService;
        this.discountRedemptionService = discountRedemptionService;
        this.discountRepository = discountRepository;
        this.userDiscountRepository = userDiscountRepository;
        this.systemSettingsRepository = systemSettingsRepository;
        this.slotHoldRepository = slotHoldRepository;
        this.violationRecordRepository = violationRecordRepository;
        this.notificationRepository = notificationRepository;
        this.bookingResponseAssembler = bookingResponseAssembler;
        this.staffAssignmentService = staffAssignmentService;
        this.vnpayPaymentServiceProvider = vnpayPaymentServiceProvider;
    }

    @Override
    @Transactional(readOnly = true)
    public DiscountValidationResponse validateDiscount(DiscountValidationRequest request) {
        User user = currentUserService.getCurrentUser();
        String code = request.discountCode() == null ? "" : request.discountCode().trim();
        if (code.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Voucher code is required", ErrorCode.INVALID_DISCOUNT);
        }

        Discount discount = discountRepository.findByCodeIgnoreCase(code).orElse(null);
        UserDiscount userDiscount = null;
        if (discount == null) {
            userDiscount = userDiscountRepository.findByUserIdAndVoucherCodeIgnoreCase(user.getId(), code)
                    .orElseThrow(() -> new ApiException(
                            HttpStatus.BAD_REQUEST,
                            "This voucher is not available in your account",
                            ErrorCode.INVALID_DISCOUNT
                    ));
            discount = userDiscount.getDiscount();
        }

        Instant now = Instant.now();
        if (discount.getStatus() != ActiveStatus.ACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Voucher is inactive", ErrorCode.INVALID_DISCOUNT);
        }
        if (discount.getStartAt() != null && discount.getStartAt().isAfter(now)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Voucher is not active yet", ErrorCode.INVALID_DISCOUNT);
        }
        if (discount.getEndAt() != null && discount.getEndAt().isBefore(now)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Voucher has expired", ErrorCode.INVALID_DISCOUNT);
        }
        if (userDiscount != null && userDiscount.getStatus() != UserDiscountStatus.AVAILABLE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Voucher has already been used or is unavailable", ErrorCode.INVALID_DISCOUNT);
        }
        if (userDiscount != null && userDiscount.getExpiresAt() != null && userDiscount.getExpiresAt().isBefore(now)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Voucher has expired in your wallet", ErrorCode.INVALID_DISCOUNT);
        }
        if (discount.getUsageLimit() != null && discount.getUsedCount() >= discount.getUsageLimit()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Voucher usage limit has been reached", ErrorCode.INVALID_DISCOUNT);
        }

        long amount = Math.max(0, request.amount());
        if (discount.getMinOrderAmount() > 0 && amount < discount.getMinOrderAmount()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Order amount does not meet the minimum requirement for this voucher",
                    ErrorCode.INVALID_DISCOUNT
            );
        }

        long discountAmount = calculateDiscountAmount(amount, discount);
        return new DiscountValidationResponse(
                userDiscount != null ? userDiscount.getVoucherCode() : discount.getCode(),
                true,
                discount.getDiscountType().name(),
                discount.getDiscountValue(),
                discountAmount,
                Math.max(0, amount - discountAmount),
                userDiscount != null && userDiscount.getExpiresAt() != null ? userDiscount.getExpiresAt() : discount.getEndAt()
        );
    }

    @Override
    @Transactional
    public CreateBookingResponse createBooking(CreateBookingRequest request, Object metadata) {
        User user = currentUserService.getCurrentUser();
        validateCustomerCanCreateBooking(user);
        LocalTime requestedBookingTime = LocalTime.parse(request.bookingTime());
        SystemSettings settings = loadSettings();
        validateBookingTime(request.bookingDate(), requestedBookingTime, settings);
        LocalDateTime scheduledLocalDateTime = request.bookingDate().atTime(requestedBookingTime);
        Instant scheduledAt = scheduledLocalDateTime.atZone(ZoneId.systemDefault()).toInstant();
        validateSlotCapacity(scheduledLocalDateTime, settings.getMaxBookingsPerTimeSlot(), user);
        if (BookingRepository.countByCustomerAndStatusIn(user, ACTIVE_BOOKING_STATUSES) >= 3) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Maximum active bookings exceeded", ErrorCode.MAX_ACTIVE_BOOKINGS_EXCEEDED);
        }

        Vehicle vehicle = VehicleRepository.findByOwnerAndIdAndStatus(
                        user,
                        UUID.fromString(request.vehicleId()),
                        VehicleStatus.ACTIVE
                )
                .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Vehicle not found or not owned", ErrorCode.RESOURCE_NOT_FOUND));
        validateNoDuplicateBooking(vehicle, scheduledAt);

        Package Package = null;
        Combo Combo = null;
        CustomerCombo ownedCombo = null;
        long basePrice = 0;
        int baseDuration = 0;
        String responsePackageName;
        String customerComboId = null;
        boolean comboPurchased = false;

        if (request.packageId() != null && !request.packageId().isBlank()) {
            Package = catalogService.requireActivePackage(request.packageId());
            basePrice = Package.getBasePrice();
            baseDuration = Package.getDurationMinutes();
            responsePackageName = Package.getName();
        } else {
            Combo = catalogService.requireActiveCombo(request.comboId());
            ownedCombo = customerComboService.findActiveOwnedCombo(user, Combo.getId().toString());
            baseDuration = Combo.getDurationMinutes();
            responsePackageName = Combo.getName();
            if (ownedCombo != null) {
                basePrice = 0;
                customerComboId = ownedCombo.getId().toString();
            } else {
                basePrice = Combo.getPrice();
                comboPurchased = true;
            }
        }

        List<CatalogService.CatalogOption> options = Package != null
                ? catalogService.requireActivePackageOptions(Package, request.options())
                : catalogService.requireActiveComboOptions(Combo, request.options());
        long optionsTotal = options.stream().mapToLong(CatalogService.CatalogOption::price).sum();
        long subtotal = basePrice + optionsTotal;
        int totalDuration = baseDuration + options.stream().mapToInt(CatalogService.CatalogOption::durationMinutes).sum();

        Booking booking = new Booking(
                UUID.randomUUID(),
                user,
                vehicle,
                scheduledAt
        );
        booking.setConfirmationEmail(resolveConfirmationEmail(request.confirmationEmail(), user));
        
        BookingPricing pricing = BookingPricing.builder()
                .booking(booking)
                .bookingId(booking.getId())
                .subtotal(subtotal)
                .finalAmount(subtotal)
                .estimatedDurationMinutes(totalDuration)
                .build();
        booking.setPricing(pricing);
        
        if (Package != null) {
            booking.addDetail(BookingDetail.builder()
                .itemType(BookingItemType.PACKAGE)
                .refId(Package.getId())
                .snapshotName(Package.getName())
                .snapshotPrice(Package.getBasePrice())
                .subtotal(Package.getBasePrice())
                .durationMinutes(Package.getDurationMinutes())
                .build());
        } else if (Combo != null) {
            booking.addDetail(BookingDetail.builder()
                .itemType(BookingItemType.COMBO)
                .refId(Combo.getId())
                .snapshotName(Combo.getName())
                .snapshotPrice(basePrice)
                .subtotal(basePrice)
                .durationMinutes(Combo.getDurationMinutes())
                .build());
        }
        
        for (CatalogService.CatalogOption opt : options) {
            booking.addDetail(BookingDetail.builder()
                .itemType(BookingItemType.ADDON)
                .refId(opt.optionId())
                .snapshotName(opt.name())
                .snapshotPrice(opt.price())
                .subtotal(opt.price())
                .durationMinutes(opt.durationMinutes())
                .build());
        }

        booking.setPreferredStaffIds(normalizePreferredStaffIds(request.staffIds(), request.staffId()));

        BookingRepository.save(booking);

        // Apply discount if provided
        if (request.discountCode() != null && !request.discountCode().isBlank()) {
            Discount discount = discountRepository.findByCodeIgnoreCase(request.discountCode()).orElse(null);
            if (discount != null) {
                discountRedemptionService.redeemDiscount(booking, discount);
            } else {
                UserDiscount ud = userDiscountRepository
                        .findByUserIdAndVoucherCodeIgnoreCase(user.getId(), request.discountCode().trim())
                        .orElse(null);
                
                if (ud != null && ud.getUser().getId().equals(user.getId())) {
                    discountRedemptionService.redeemUserDiscount(booking, ud);
                } else {
                    throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid discount code", ErrorCode.INVALID_DISCOUNT);
                }
            }
        }

        Payment payment = new Payment(
                booking,
                request.paymentMethod(),
                initialPaymentStatus(request.paymentMethod()),
                booking.getPricing().getFinalAmount()
        );
        if (request.paymentMethod() == PaymentMethod.BANK_TRANSFER) {
            payment.prepareSepayPayment(booking.getPricing().getFinalAmount(), generateSepayTransferCode());
        }
        payment = paymentRepository.save(payment);
        
        slotHoldRepository.findByCustomerAndSlotTime(user, scheduledLocalDateTime.atZone(ZoneId.systemDefault()).toInstant())
                .ifPresent(slotHoldRepository::delete);

        recordStatusHistory(booking, null, booking.getStatus(), user, "Booking created");

        notificationRepository.save(Notification.builder()
                .id(UUID.randomUUID())
                .user(user)
                .title("Booking Successful!")
                .message("You have successfully booked a car wash on " + booking.getBookingDate() + " at " + booking.getBookingTime() + ".")
                .type(NotificationType.BOOKING_CREATED)
                .read(false)
                .createdAt(Instant.now())
                .build());

        if (Combo != null) {
            if (ownedCombo == null) {
                ownedCombo = customerComboService.createOwnedCombo(user, Combo.getId().toString(), booking.getId().toString());
                customerComboId = ownedCombo.getId().toString();
            }
            customerComboService.recordUsage(ownedCombo, booking.getId().toString(), request.bookingDate());
        }
        sendBookingConfirmationEmailAfterCommit(booking);

        return new CreateBookingResponse(
                booking.getId().toString(),
                user.getId().toString(),
                vehicle.getId().toString(),
                vehicle.getPlate(),
                responsePackageName,
                bookingResponseAssembler.toBookingDetailDtos(booking),
                new CreateBookingResponse.Pricing(
                        booking.getPricing().getSubtotal(),
                        booking.getPricing().getDiscountRefSnapshot(),
                        booking.getPricing().getDiscountAmount(),
                        booking.getPricing().getFinalAmount(),
                        "VND"
                ),
                booking.getBookingDate(),
                booking.getBookingTime().toString(),
                booking.getPricing().getEstimatedDurationMinutes(),
                payment.getMethod().name(),
                payment.getStatus().name(),
                booking.getStatus().name(),
                booking.getConfirmationStatus().name(),
                0,
                null,
                booking.getCreatedAt(),
                booking.getId().toString(),
                booking.getConfirmationEmail(),
                Combo == null ? null : Combo.getId().toString(),
                customerComboId,
                comboPurchased,
                null,
                booking.getAssignedStaff() == null ? null : booking.getAssignedStaff().getId().toString(),
                booking.getAssignedStaff() == null ? null : booking.getAssignedStaff().getFullName()
        );
    }

    @Transactional(readOnly = true)
    public BookingService.BookingPage listBookings(String status, LocalDate dateFrom, LocalDate dateTo, int page, int limit) {
        User user = currentUserService.getCurrentUser();
        Page<Booking> bookings;
        if (status != null && !status.isBlank()) {
            bookings = BookingRepository.findByCustomerAndStatusOrderByCreatedAtDesc(
                    user,
                    BookingStatus.valueOf(status),
                    PageRequest.of(Math.max(page - 1, 0), limit)
            );
        } else {
            bookings = BookingRepository.findByCustomerOrderByCreatedAtDesc(
                    user,
                    PageRequest.of(Math.max(page - 1, 0), limit)
            );
        }

        Map<UUID, WashSession> washSessionsByBookingId = latestWashSessionsByBookingId(bookings.getContent());
        Map<UUID, List<BookingDetail>> detailsByBookingId = detailsByBookingId(bookings.getContent());
        List<BookingListItemResponse> items = bookings.getContent().stream()
                .map(booking -> bookingResponseAssembler.toListItem(
                        booking,
                        washSessionsByBookingId.get(booking.getId()),
                        detailsByBookingId.getOrDefault(booking.getId(), List.of())
                ))
                .toList();
        PaginationMeta pagination = new PaginationMeta(
                bookings.getNumber() + 1,
                bookings.getSize(),
                bookings.getTotalElements(),
                bookings.getTotalPages(),
                bookings.hasNext()
        );
        return new BookingService.BookingPage(items, pagination);
    }

    @Transactional(readOnly = true)
    public BookingDetailResponse getBooking(String bookingId) {
        return toDetailResponse(findOwnedBooking(bookingId));
    }

    @Override
    public BookingDetailResponse toDetailResponse(Booking booking) {
        WashSession washSession = washSessionRepository.findFirstByBooking_IdOrderByCompletedAtDesc(booking.getId())
                .orElse(null);
        BookingResponseAssembler.PaymentInfo payment = resolvePaymentInfo(booking);
        List<BookingStatusHistoryItem> statusHistory = bookingStatusHistoryRepository
                .findByBooking_IdOrderByChangedAtAsc(booking.getId())
                .stream()
                .map(h -> new BookingStatusHistoryItem(
                        h.getOldStatus(),
                        h.getNewStatus(),
                        h.getChangedBy() == null ? null : h.getChangedBy().getFullName(),
                        h.getReason(),
                        h.getChangedAt()
                ))
                .toList();

        return bookingResponseAssembler.toDetailResponse(booking, washSession, payment, statusHistory);
    }

    @Transactional
    public CancelBookingResponse cancelBooking(String bookingId, String reason) {
        Booking booking = findOwnedBooking(bookingId);
        String cancelReason = sanitizeCancelReason(reason);
        if (!CANCELLABLE_BOOKING_STATUSES.contains(booking.getStatus())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Booking cannot be cancelled", ErrorCode.RESOURCE_LOCKED);
        }
        Duration timeUntilScheduled = Duration.between(Instant.now(), booking.getScheduledAt());
        if (booking.getStatus() == BookingStatus.CONFIRMED && timeUntilScheduled.compareTo(Duration.ofHours(2)) < 0) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Booking cannot be cancelled less than 2 hours before start time",
                    "CANCELLATION_WINDOW_CLOSED"
            );
        }
        Payment payment = paymentRepository.findByBooking(booking).orElse(null);
        long refundAmount = 0L;
        String refundStatus = "NONE";
        String refundMessage = "Cancellation processed according to voucher policy.";
        if (booking.getStatus() == BookingStatus.PENDING && payment != null && payment.getStatus() != PaymentStatus.PAID) {
            payment.markCancelled();
        }
        BookingStatus oldStatus = booking.getStatus();
        booking.cancel(cancelReason);

        long hoursUntilScheduled = timeUntilScheduled.toHours();
        
        String voucherRefundStatus = "NONE";
        boolean shouldApplyVoucherPolicy = oldStatus == BookingStatus.CONFIRMED;
        
        if (payment != null
                && payment.getMethod() == PaymentMethod.E_WALLET
                && payment.getStatus() == PaymentStatus.PAID
                && oldStatus == BookingStatus.CONFIRMED) {
            refundAmount = resolveRefundAmount(payment.getAmount(), hoursUntilScheduled);
            if (refundAmount > 0) {
                try {
                    vnpayPaymentServiceProvider.getObject().refund(booking.getId(), refundAmount, "customer-cancel", null);
                    refundStatus = payment.getStatus().name();
                    refundMessage = "Booking cancelled. VNPay refund request was submitted.";
                } catch (RuntimeException exception) {
                    payment.markRefundPending();
                    refundStatus = "REFUND_PENDING";
                    refundMessage = "Booking cancelled. VNPay refund is pending manual verification.";
                    LOGGER.warn("VNPay refund request failed during customer cancellation: bookingId={}", booking.getId(), exception);
                }
            } else {
                refundStatus = "NO_REFUND";
                refundMessage = "Booking cancelled inside the non-refundable window.";
            }
        }

        if (shouldApplyVoucherPolicy && hoursUntilScheduled > 24) {
            customerComboService.releaseUsageForBooking(booking.getId().toString());
            if (booking.getPricing().getDiscountType() != null) {
                discountRedemptionService.revertRedemption(booking);
                voucherRefundStatus = "REFUNDED";
            }
        } else if (shouldApplyVoucherPolicy && hoursUntilScheduled >= 6) {
            violationRecordRepository.save(new ViolationRecord(booking.getCustomer(), booking, "LATE_CANCEL", 0, "Cancelled between 6 and 24 hours"));
            if (booking.getPricing().getDiscountType() != null) {
                voucherRefundStatus = "FORFEITED";
            }
        } else if (shouldApplyVoucherPolicy && hoursUntilScheduled >= 1) {
            violationRecordRepository.save(new ViolationRecord(booking.getCustomer(), booking, "LATE_CANCEL", 0, "Cancelled between 1 and 6 hours"));
            if (booking.getPricing().getDiscountType() != null) {
                voucherRefundStatus = "FORFEITED";
            }
        } else if (shouldApplyVoucherPolicy) {
            violationRecordRepository.save(new ViolationRecord(booking.getCustomer(), booking, "LATE_CANCEL", 0, "Cancelled under 1 hour"));
            if (booking.getPricing().getDiscountType() != null) {
                voucherRefundStatus = "FORFEITED";
            }
        }

        recordStatusHistory(booking, oldStatus, booking.getStatus(), currentActorOrNull(), cancelReason);
        return new CancelBookingResponse(
                booking.getId().toString(),
                booking.getStatus().name(),
                booking.getUpdatedAt(),
                refundAmount,
                refundStatus,
                voucherRefundStatus,
                refundMessage
        );
    }

    private String sanitizeCancelReason(String reason) {
        if (reason == null) {
            return null;
        }
        String trimmed = reason.trim();
        if (trimmed.isBlank()) {
            return null;
        }
        return trimmed.length() <= 500 ? trimmed : trimmed.substring(0, 500);
    }

    @Transactional
    public PayBookingResponse payBooking(String bookingId, String transactionRef) {
        throw new ApiException(
                HttpStatus.FORBIDDEN,
                "Customers cannot mark booking payment as paid",
                "PAYMENT_VERIFICATION_REQUIRED"
        );
    }

    @Override
    @Transactional
    public PayBookingResponse markBookingPaidForOperations(String bookingId, String transactionRef) {
        Booking booking = requireBookingForOperations(bookingId);
        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.NO_SHOW) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Booking cannot be paid", ErrorCode.BUSINESS_RULE_VIOLATION);
        }

        Payment payment = paymentRepository.findByBooking(booking)
                .orElseGet(() -> paymentRepository.save(new Payment(
                        booking,
                        PaymentMethod.CASH_AT_COUNTER,
                        PaymentStatus.UNPAID,
                        booking.getPricing().getFinalAmount()
                )));

        if (payment.getStatus() != PaymentStatus.PAID) {
            payment.updateAmount(booking.getPricing().getFinalAmount());
            payment.markPaid(resolveTransactionRef(booking, transactionRef));
            if (booking.getStatus() == BookingStatus.PENDING) {
                BookingStatus oldStatus = booking.getStatus();
                booking.updateStatus(BookingStatus.CONFIRMED);
                assignSingleStaffOnConfirmation(booking);
                recordStatusHistory(booking, oldStatus, booking.getStatus(), currentActorOrNull(), "Payment verified");
                
                notificationRepository.save(Notification.builder()
                        .id(UUID.randomUUID())
                        .user(booking.getCustomer())
                        .title("Booking Confirmed!")
                        .message("Booking " + booking.getId() + " has been successfully paid and confirmed.")
                        .type(NotificationType.BOOKING_CONFIRMED)
                        .read(false)
                        .createdAt(Instant.now())
                        .build());
            }
        }

        return toPayBookingResponse(booking, payment);
    }

    @Override
    @Transactional
    public PayBookingResponse changeBookingPaymentMethod(String bookingId, PaymentMethod paymentMethod) {
        Booking booking = findOwnedBooking(bookingId);
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Payment method can only be changed while booking is pending", ErrorCode.BUSINESS_RULE_VIOLATION);
        }
        ensurePendingBookingHoldOpen(booking);
        Payment payment = paymentRepository.findByBooking(booking)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Booking payment not found", ErrorCode.RESOURCE_NOT_FOUND));
        if (payment.getStatus() == PaymentStatus.PAID) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Paid booking cannot change payment method", ErrorCode.BUSINESS_RULE_VIOLATION);
        }
        if (payment.getMethod() == PaymentMethod.CASH_AT_COUNTER && paymentMethod != PaymentMethod.CASH_AT_COUNTER) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Cash at counter bookings cannot switch to another payment method", ErrorCode.BUSINESS_RULE_VIOLATION);
        }

        if (paymentMethod == PaymentMethod.CASH_AT_COUNTER) {
            payment.changeToCashAtCounter();
        } else if (paymentMethod == PaymentMethod.BANK_TRANSFER) {
            payment.prepareSepayPayment(booking.getPricing().getFinalAmount(), generateSepayTransferCode());
        } else if (paymentMethod == PaymentMethod.E_WALLET) {
            payment.prepareOnlinePayment(booking.getPricing().getFinalAmount(), booking.getId().toString());
        } else {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Unsupported payment method for customer booking", ErrorCode.INVALID_INPUT);
        }

        return toPayBookingResponse(booking, payment);
    }

    @Override
    @Transactional
    public BookingDetailResponse updateBookingStaff(String bookingId, List<String> staffIds) {
        Booking booking = findOwnedBooking(bookingId);
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Assigned staff can only be changed after booking is confirmed", ErrorCode.BUSINESS_RULE_VIOLATION);
        }
        if (washSessionRepository.findFirstByBooking_IdOrderByCompletedAtDesc(booking.getId()).isPresent()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Booking staff cannot be changed after a wash session is created", ErrorCode.BUSINESS_RULE_VIOLATION);
        }

        List<BookingStaffAssignment> existingAssignments = bookingStaffAssignmentRepository.findByBookingOrderBySortOrderAsc(booking);
        if (existingAssignments.isEmpty()) {
            assignSingleStaffOnConfirmation(booking);
            existingAssignments = bookingStaffAssignmentRepository.findByBookingOrderBySortOrderAsc(booking);
        }
        if (existingAssignments.isEmpty()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Booking must have an assigned staff before staff can be changed", ErrorCode.BUSINESS_RULE_VIOLATION);
        }
        if (existingAssignments.size() > 1) {
            normalizeSingleStaffAssignment(booking, existingAssignments.get(0).getStaff());
            existingAssignments = bookingStaffAssignmentRepository.findByBookingOrderBySortOrderAsc(booking);
        }

        List<UUID> selectedStaffIds = parseSelectedStaffIds(staffIds);
        UUID selectedStaffId = selectedStaffIds.get(0);
        UUID currentStaffId = existingAssignments.get(0).getStaff().getId();
        if (selectedStaffId.equals(currentStaffId)) {
            return toDetailResponse(booking);
        }
        User selectedStaff = staffAssignmentService.requireActiveStaff(selectedStaffId);
        if (!staffAssignmentService.isStaffAvailableForBooking(selectedStaff, booking)) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Selected staff is not available for this booking time", ErrorCode.BUSINESS_RULE_VIOLATION);
        }

        normalizeSingleStaffAssignment(booking, selectedStaff);
        booking.setPreferredStaffIds(selectedStaff.getId().toString());
        return toDetailResponse(booking);
    }

    @Override
    @Transactional
    public BookingDetailResponse confirmPendingBooking(String bookingId) {
        Booking booking = requireBookingForOperations(bookingId);
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Only pending bookings can be confirmed", ErrorCode.BUSINESS_RULE_VIOLATION);
        }
        ensurePendingBookingHoldOpen(booking);
        BookingStatus oldStatus = booking.getStatus();
        booking.updateStatus(BookingStatus.CONFIRMED);
        assignSingleStaffOnConfirmation(booking);
        recordStatusHistory(booking, oldStatus, booking.getStatus(), currentActorOrNull(), "Booking confirmed manually");
        notificationRepository.save(Notification.builder()
                .id(UUID.randomUUID())
                .user(booking.getCustomer())
                .title("Booking Confirmed!")
                .message("Booking " + booking.getId() + " has been confirmed.")
                .type(NotificationType.BOOKING_CONFIRMED)
                .read(false)
                .createdAt(Instant.now())
                .build());
        return toDetailResponse(booking);
    }

    @Override
    @Transactional
    public BookingDetailResponse updateBookingStatus(String bookingId, BookingStatus status) {
        if (status == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Booking status is required", ErrorCode.INVALID_INPUT);
        }
        Booking booking = requireBookingForOperations(bookingId);
        BookingStatus oldStatus = booking.getStatus();
        if (oldStatus == status) {
            return toDetailResponse(booking);
        }
        validateAdminBookingStatusTransition(oldStatus, status);
        if (oldStatus == BookingStatus.PENDING && !SIDE_BOOKING_STATUSES.contains(status)) {
            ensurePendingBookingHoldOpen(booking);
        }
        booking.updateStatus(status);
        if (status == BookingStatus.CONFIRMED) {
            assignSingleStaffOnConfirmation(booking);
        }
        if (status == BookingStatus.COMPLETED) {
            markBookingPaidForOperations(booking.getId().toString(), null);
            completeAdminManagedWashSession(booking);
        }
        recordStatusHistory(booking, oldStatus, status, currentActorOrNull(), "Booking status updated by admin");
        return toDetailResponse(booking);
    }

    private void completeAdminManagedWashSession(Booking booking) {
        WashSession session = washSessionRepository.findFirstByBooking_IdOrderByCompletedAtDesc(booking.getId())
                .orElseGet(() -> washSessionRepository.save(WashSession.create(booking, "Completed from admin booking status", booking.getAssignedStaff())));

        if (session.getStatus() != WashSessionStatus.COMPLETED) {
            session.complete(Instant.now());
        }
        washSessionRepository.saveAndFlush(session);

        EarnPointsResponse earnResult = loyaltyService.postEarnTransaction(
                booking.getCustomer().getId(),
                session.getId()
        );
        session.recordAwardedPoints(earnResult.pointsAwarded());
        washSessionRepository.save(session);
    }

    private void validateAdminBookingStatusTransition(BookingStatus oldStatus, BookingStatus newStatus) {
        if (TERMINAL_BOOKING_STATUSES.contains(oldStatus)) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Booking status is locked after " + oldStatus,
                    ErrorCode.BUSINESS_RULE_VIOLATION
            );
        }
        if (SIDE_BOOKING_STATUSES.contains(newStatus)) {
            return;
        }

        int oldIndex = MAIN_BOOKING_STATUS_FLOW.indexOf(oldStatus);
        int newIndex = MAIN_BOOKING_STATUS_FLOW.indexOf(newStatus);
        if (oldIndex < 0 || newIndex < 0 || newIndex <= oldIndex) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Booking status cannot move backward",
                    ErrorCode.BUSINESS_RULE_VIOLATION
            );
        }
    }

    @Transactional(readOnly = true)
    public Booking requireBookingForOperations(String bookingId) {
        return BookingRepository.findById(UUID.fromString(bookingId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Booking not found", ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public void updateStatus(Booking booking, BookingStatus status) {
        BookingStatus oldStatus = booking.getStatus();
        if (oldStatus == status) {
            return;
        }
        booking.updateStatus(status);
        recordStatusHistory(booking, oldStatus, status, currentActorOrNull(), null);
    }

    private void validateBookingTime(LocalDate bookingDate, LocalTime bookingTime, SystemSettings settings) {
        LocalTime operatingStartTime = LocalTime.parse(settings.getOperatingStartTime());
        LocalTime operatingEndTime = LocalTime.parse(settings.getOperatingEndTime());
        if (bookingTime.isBefore(operatingStartTime) || !bookingTime.isBefore(operatingEndTime)) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Booking time must be within operating hours",
                    ErrorCode.BUSINESS_RULE_VIOLATION
            );
        }
        LocalDate today = LocalDate.now();
        if (bookingDate.isAfter(today.plusDays(settings.getMaxAdvanceBookingDays()))) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Booking date exceeds maximum advance booking window",
                    ErrorCode.BUSINESS_RULE_VIOLATION
            );
        }
        if (bookingDate.atTime(bookingTime).isBefore(LocalDateTime.now())) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Booking time cannot be in the past",
                    ErrorCode.BUSINESS_RULE_VIOLATION
            );
        }
    }

    private void validateSlotCapacity(LocalDateTime scheduledAt, int maxBookingsPerTimeSlot, User customerToExclude) {
        LocalDateTime slotStartLocal = scheduledAt.withMinute(0).withSecond(0).withNano(0);
        LocalDateTime slotEndLocal = slotStartLocal.plusHours(1);
        Instant slotStart = slotStartLocal.atZone(ZoneId.systemDefault()).toInstant();
        Instant slotEnd = slotEndLocal.atZone(ZoneId.systemDefault()).toInstant();

        long existingBookings = BookingRepository.countByScheduledAtSlot(
                slotStart,
                slotEnd,
                Set.of(BookingStatus.CANCELLED, BookingStatus.NO_SHOW)
        );
        long activeHolds = customerToExclude == null
                ? slotHoldRepository.countActiveHoldsForSlot(slotStart, slotEnd, Instant.now())
                : slotHoldRepository.countActiveHoldsForSlotExcludingCustomer(slotStart, slotEnd, Instant.now(), customerToExclude);
        if (existingBookings + activeHolds >= maxBookingsPerTimeSlot) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Booking slot is full", ErrorCode.BOOKING_SLOT_FULL);
        }
    }

    private String normalizePreferredStaffIds(List<String> staffIds, String legacyStaffId) {
        List<String> rawIds = staffIds == null || staffIds.isEmpty() ? List.of(legacyStaffId) : staffIds;
        List<String> normalized = new ArrayList<>();
        Set<UUID> seen = new LinkedHashSet<>();
        for (String rawId : rawIds) {
            if (rawId == null || rawId.isBlank()) {
                continue;
            }
            UUID staffId;
            try {
                staffId = UUID.fromString(rawId.trim());
            } catch (IllegalArgumentException exception) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid staff id", ErrorCode.INVALID_INPUT);
            }
            if (seen.add(staffId)) {
                normalized.add(staffId.toString());
                break;
            }
        }
        return normalized.isEmpty() ? null : String.join(",", normalized);
    }

    private List<UUID> parsePreferredStaffIds(Booking booking) {
        String preferredStaffIds = booking.getPreferredStaffIds();
        if (preferredStaffIds == null || preferredStaffIds.isBlank()) {
            return List.of();
        }
        return java.util.Arrays.stream(preferredStaffIds.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(UUID::fromString)
                .limit(1)
                .toList();
    }

    private List<UUID> parseSelectedStaffIds(List<String> staffIds) {
        if (staffIds == null || staffIds.size() != 1) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Exactly 1 staff must be selected", ErrorCode.INVALID_INPUT);
        }
        Set<UUID> selected = new LinkedHashSet<>();
        for (String rawId : staffIds) {
            if (rawId == null || rawId.isBlank()) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid staff id", ErrorCode.INVALID_INPUT);
            }
            try {
                selected.add(UUID.fromString(rawId.trim()));
            } catch (IllegalArgumentException exception) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid staff id", ErrorCode.INVALID_INPUT);
            }
        }
        if (selected.size() != 1) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Selected staff must be unique", ErrorCode.INVALID_INPUT);
        }
        return new ArrayList<>(selected);
    }

    private void assignSingleStaffOnConfirmation(Booking booking) {
        List<BookingStaffAssignment> existingAssignments = bookingStaffAssignmentRepository.findByBookingOrderBySortOrderAsc(booking);
        if (!existingAssignments.isEmpty()) {
            normalizeSingleStaffAssignment(booking, existingAssignments.get(0).getStaff());
            return;
        }

        User staff = staffAssignmentService.pickStaffGroupForBooking(booking, parsePreferredStaffIds(booking), 1).get(0);
        normalizeSingleStaffAssignment(booking, staff);
    }

    private void normalizeSingleStaffAssignment(Booking booking, User staff) {
        bookingStaffAssignmentRepository.deleteByBooking(booking);
        bookingStaffAssignmentRepository.save(new BookingStaffAssignment(booking, staff, 1));
        booking.assignStaff(staff);
    }

    private User resolveAssignedStaff(String staffId, Booking booking) {
        if (staffId == null || staffId.isBlank()) {
            return staffAssignmentService.pickLeastLoadedActiveStaffForBooking(booking);
        }

        User staff;
        try {
            staff = staffAssignmentService.requireActiveStaff(UUID.fromString(staffId));
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid staff id", ErrorCode.INVALID_INPUT);
        }

        if (!staffAssignmentService.isStaffAvailableForBooking(staff, booking)) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Selected staff is not available for this booking time", ErrorCode.BUSINESS_RULE_VIOLATION);
        }
        return staff;
    }

    private void validateCustomerCanCreateBooking(User user) {
        if (user.getStatus() == UserStatus.BLOCKED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Blocked accounts cannot create bookings", ErrorCode.ACCOUNT_BLOCKED);
        }
        if (user.getStatus() == UserStatus.SUSPENDED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Suspended accounts cannot create bookings", ErrorCode.ACCOUNT_SUSPENDED);
        }
        if (user.getBookingSuspendedUntil() != null && user.getBookingSuspendedUntil().isAfter(Instant.now())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Booking is suspended until " + user.getBookingSuspendedUntil(), ErrorCode.ACCOUNT_SUSPENDED);
        }
    }

    private void validateNoDuplicateBooking(Vehicle vehicle, Instant scheduledAt) {
        if (BookingRepository.countDuplicateVehicleSlot(vehicle, scheduledAt, DUPLICATE_BOOKING_STATUSES) > 0) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Duplicate booking for the same vehicle and time slot",
                    "DUPLICATE_BOOKING"
            );
        }
    }

    private SystemSettings loadSettings() {
        return systemSettingsRepository.findById(1)
                .orElseThrow(() -> new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "System settings not found", ErrorCode.SYSTEM_ERROR));
    }

    private Booking findOwnedBooking(String bookingId) {
        User user = currentUserService.getCurrentUser();
        return BookingRepository.findByCustomerAndId(user, UUID.fromString(bookingId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Booking not found", ErrorCode.RESOURCE_NOT_FOUND));
    }

    private Map<UUID, WashSession> latestWashSessionsByBookingId(List<Booking> bookings) {
        if (bookings.isEmpty()) {
            return Map.of();
        }
        List<UUID> bookingIds = bookings.stream()
                .map(Booking::getId)
                .toList();

        Comparator<WashSession> latestCompletedFirst = Comparator
                .comparing(WashSession::getCompletedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                .reversed();

        return washSessionRepository.findByBooking_IdIn(bookingIds).stream()
                .sorted(latestCompletedFirst)
                .collect(Collectors.toMap(
                        session -> session.getBooking().getId(),
                        Function.identity(),
                        (first, ignored) -> first
                ));
    }

    private Map<UUID, List<BookingDetail>> detailsByBookingId(List<Booking> bookings) {
        if (bookings.isEmpty()) {
            return Map.of();
        }
        List<UUID> bookingIds = bookings.stream()
                .map(Booking::getId)
                .toList();
        return bookingDetailRepository.findByBooking_IdIn(bookingIds).stream()
                .collect(Collectors.groupingBy(detail -> detail.getBooking().getId()));
    }

    private PaymentStatus initialPaymentStatus(PaymentMethod method) {
        return method == PaymentMethod.CASH_AT_COUNTER ? PaymentStatus.UNPAID : PaymentStatus.PENDING_PAYMENT;
    }

    private String generateSepayTransferCode() {
        String prefix = sepayPaymentCodePrefix == null || sepayPaymentCodePrefix.isBlank()
                ? "AU"
                : sepayPaymentCodePrefix.trim().toUpperCase(Locale.ROOT);
        for (int attempt = 0; attempt < 20; attempt++) {
            String code = prefix + String.format("%08d", ThreadLocalRandom.current().nextInt(100_000_000));
            if (!paymentRepository.existsByTransactionRef(code)) {
                return code;
            }
        }
        throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to generate SePay payment code", ErrorCode.SYSTEM_ERROR);
    }

    private void ensurePendingBookingHoldOpen(Booking booking) {
        if (booking.getStatus() != BookingStatus.PENDING) {
            return;
        }
        Instant expiresAt = booking.getCreatedAt().plus(PENDING_BOOKING_HOLD_DURATION);
        if (!expiresAt.isAfter(Instant.now())) {
            throw new ApiException(
                    HttpStatus.GONE,
                    "Booking hold expired. Please create a new booking.",
                    ErrorCode.BUSINESS_RULE_VIOLATION
            );
        }
    }

    private long resolveRefundAmount(long paymentAmount, long hoursUntilScheduled) {
        if (hoursUntilScheduled > 24) {
            return paymentAmount;
        }
        if (hoursUntilScheduled >= 6) {
            return paymentAmount / 2;
        }
        return 0L;
    }

    private BookingResponseAssembler.PaymentInfo resolvePaymentInfo(Booking booking) {
        return paymentRepository.findFirstByBookingOrderByCreatedAtDesc(booking)
                .map(payment -> new BookingResponseAssembler.PaymentInfo(
                        payment.getMethod() == null ? PaymentMethod.CASH_AT_COUNTER : payment.getMethod(),
                        payment.getStatus() == null ? PaymentStatus.UNPAID : payment.getStatus(),
                        payment.getTransactionRef(),
                        payment.getPaidAt()
                ))
                .orElseGet(() -> new BookingResponseAssembler.PaymentInfo(PaymentMethod.CASH_AT_COUNTER, PaymentStatus.UNPAID, null, null));
    }

    private String resolveTransactionRef(Booking booking, String transactionRef) {
        if (transactionRef != null && !transactionRef.isBlank()) {
            return transactionRef.trim();
        }
        return "PAY-" + booking.getId();
    }

    private PayBookingResponse toPayBookingResponse(Booking booking, Payment payment) {
        User assignedStaff = booking.getAssignedStaff();
        List<BookingDetailResponse.StaffAssignment> assignedStaffList = bookingStaffAssignmentRepository
                .findByBookingOrderBySortOrderAsc(booking)
                .stream()
                .map(assignment -> new BookingDetailResponse.StaffAssignment(
                        assignment.getStaff().getId().toString(),
                        assignment.getStaff().getFullName(),
                        assignment.getSortOrder()
                ))
                .toList();
        return new PayBookingResponse(
                booking.getId().toString(),
                payment.getId().toString(),
                payment.getMethod().name(),
                payment.getStatus().name(),
                payment.getAmount(),
                payment.getTransactionRef(),
                payment.getPaidAt(),
                booking.getStatus().name(),
                assignedStaff == null ? null : assignedStaff.getId().toString(),
                assignedStaff == null ? null : assignedStaff.getFullName(),
                assignedStaffList
        );
    }

    private long calculateDiscountAmount(long amount, Discount discount) {
        long discountAmount = 0;
        if (discount.getDiscountType() == DiscountType.FIXED_AMOUNT) {
            discountAmount = discount.getDiscountValue();
        } else if (discount.getDiscountType() == DiscountType.PERCENT) {
            discountAmount = (amount * discount.getDiscountValue()) / 100;
        }
        if (discount.getMaxDiscountAmount() != null && discount.getMaxDiscountAmount() > 0) {
            discountAmount = Math.min(discountAmount, discount.getMaxDiscountAmount());
        }
        return Math.min(discountAmount, amount);
    }

    private void recordStatusHistory(
            Booking booking,
            BookingStatus oldStatus,
            BookingStatus newStatus,
            User changedBy,
            String reason
    ) {
        bookingStatusHistoryRepository.save(new BookingStatusHistory(
                booking,
                oldStatus == null ? null : oldStatus.name(),
                newStatus.name(),
                changedBy,
                reason
        ));
    }

    private User currentActorOrNull() {
        try {
            return currentUserService.getCurrentUser();
        } catch (ApiException exception) {
            return null;
        }
    }

    private void sendBookingConfirmationEmailAfterCommit(Booking booking) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    sendBookingConfirmationEmail(booking);
                }
            });
            return;
        }
        sendBookingConfirmationEmail(booking);
    }

    private void sendBookingConfirmationEmail(Booking booking) {
        String email = booking.getConfirmationEmail();
        if (email == null || email.isBlank()) {
            LOGGER.warn("Skipping booking confirmation email because confirmation email is empty: bookingId={}", booking.getId());
            return;
        }
        try {
            bookingEmailDeliveryService.sendBookingConfirmation(booking, email);
        } catch (RuntimeException exception) {
            LOGGER.warn("Failed to send booking confirmation email: bookingId={}, to={}", booking.getId(), email, exception);
        }
    }

    private String resolveConfirmationEmail(String requestedEmail, User customer) {
        if (requestedEmail != null && !requestedEmail.isBlank()) {
            return requestedEmail.trim().toLowerCase(Locale.ROOT);
        }
        return customer.getEmail();
    }

}
