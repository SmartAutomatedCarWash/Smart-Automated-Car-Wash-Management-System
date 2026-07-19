package com.autowash.service.impl;

import com.autowash.entity.WashSession;
import com.autowash.assembler.BookingResponseAssembler;
import com.autowash.service.LoyaltyService;
import com.autowash.entity.Notification;
import com.autowash.entity.SystemSettings;
import com.autowash.repository.NotificationRepository;
import com.autowash.repository.SystemSettingsRepository;
import com.autowash.entity.BookingDetail;
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
import com.autowash.dto.PayBookingResponse;
import com.autowash.entity.CustomerCombo;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.entity.enums.UserStatus;
import com.autowash.entity.Booking;
import com.autowash.entity.BookingPricing;
import com.autowash.entity.Discount;
import com.autowash.entity.UserDiscount;
import com.autowash.entity.BookingStatusHistory;
import com.autowash.entity.Payment;
import com.autowash.entity.enums.PaymentMethod;
import com.autowash.entity.enums.PaymentStatus;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.BookingDetailRepository;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingServiceImpl implements BookingService {

    private static final Logger LOGGER = LoggerFactory.getLogger(BookingServiceImpl.class);

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

    private final CurrentUserService currentUserService;
    private final VehicleRepository VehicleRepository;
    private final BookingRepository BookingRepository;
    private final CatalogService catalogService;
    private final WashSessionRepository washSessionRepository;
    private final LoyaltyService loyaltyService;
    private final CustomerComboService customerComboService;
    private final BookingDetailRepository bookingDetailRepository;
    private final PaymentRepository paymentRepository;
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
            BookingStatusHistoryRepository bookingStatusHistoryRepository,
            BookingEmailDeliveryService bookingEmailDeliveryService,
            DiscountRedemptionService discountRedemptionService,
            DiscountRepository discountRepository,
            UserDiscountRepository userDiscountRepository,
            SystemSettingsRepository systemSettingsRepository,
            SlotHoldRepository slotHoldRepository,
            ViolationRecordRepository violationRecordRepository,
            NotificationRepository notificationRepository,
            BookingResponseAssembler bookingResponseAssembler
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
    }

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
                if (ownedCombo.isExpired()) {
                    customerComboService.markExpired(ownedCombo);
                    throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Combo is expired", ErrorCode.BUSINESS_RULE_VIOLATION);
                }
                if (!ownedCombo.hasRemainingUsages()) {
                    throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Combo has no remaining usages", ErrorCode.BUSINESS_RULE_VIOLATION);
                }
                basePrice = 0;
                customerComboId = ownedCombo.getId().toString();
            } else {
                throw new ApiException(
                        HttpStatus.FORBIDDEN,
                        "Combo booking requires an active owned combo. Purchase must be verified before booking.",
                        "PAYMENT_VERIFICATION_REQUIRED"
                );
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
                .snapshotPrice(0)
                .subtotal(0)
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

        BookingRepository.save(booking);

        // Apply discount if provided
        if (request.discountCode() != null && !request.discountCode().isBlank()) {
            Discount discount = discountRepository.findByCodeIgnoreCase(request.discountCode()).orElse(null);
            if (discount != null) {
                discountRedemptionService.redeemDiscount(booking, discount);
            } else {
                // Check user discount
                UserDiscount ud = null;
                try {
                    UUID udId = UUID.fromString(request.discountCode());
                    ud = userDiscountRepository.findById(udId).orElse(null);
                } catch(Exception ignored) {}
                
                if (ud != null && ud.getUser().getId().equals(user.getId())) {
                    discountRedemptionService.redeemUserDiscount(booking, ud);
                } else {
                    throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid discount code", ErrorCode.INVALID_DISCOUNT);
                }
            }
        }

        long totalBookings = BookingRepository.countByCustomer(user);
        if (totalBookings == 1) {
            loyaltyService.postBonusTransaction(user.getId(), 30, "First booking bonus");
        }
        
        Payment payment = paymentRepository.save(new Payment(
                booking,
                request.paymentMethod(),
                initialPaymentStatus(request.paymentMethod()),
                booking.getPricing().getFinalAmount()
        ));
        
        slotHoldRepository.findByCustomerAndSlotTime(user, scheduledLocalDateTime.atZone(ZoneId.systemDefault()).toInstant())
                .ifPresent(slotHoldRepository::delete);

        recordStatusHistory(booking, null, booking.getStatus(), user, "Booking created");

        notificationRepository.save(Notification.builder()
                .id(UUID.randomUUID())
                .user(user)
                .title("Đặt lịch thành công!")
                .message("Bạn đã đặt lịch rửa xe thành công vào " + booking.getBookingDate() + " lúc " + booking.getBookingTime() + ".")
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
                null
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
        if (!CANCELLABLE_BOOKING_STATUSES.contains(booking.getStatus())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Booking cannot be cancelled", ErrorCode.RESOURCE_LOCKED);
        }
        Duration timeUntilScheduled = Duration.between(Instant.now(), booking.getScheduledAt());
        if (timeUntilScheduled.compareTo(Duration.ofHours(2)) < 0) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Booking cannot be cancelled less than 2 hours before start time",
                    "CANCELLATION_WINDOW_CLOSED"
            );
        }
        BookingStatus oldStatus = booking.getStatus();
        booking.cancel(reason);

        long hoursUntilScheduled = timeUntilScheduled.toHours();
        
        String voucherRefundStatus = "NONE";
        
        if (hoursUntilScheduled > 24) {
            customerComboService.releaseUsageForBooking(booking.getId().toString());
            if (booking.getPricing().getDiscountType() != null) {
                discountRedemptionService.revertRedemption(booking);
                voucherRefundStatus = "REFUNDED";
            }
        } else if (hoursUntilScheduled >= 6) {
            violationRecordRepository.save(new ViolationRecord(booking.getCustomer(), booking, "LATE_CANCEL", 0, "Cancelled between 6 and 24 hours"));
            if (booking.getPricing().getDiscountType() != null) {
                voucherRefundStatus = "FORFEITED";
            }
        } else if (hoursUntilScheduled >= 1) {
            violationRecordRepository.save(new ViolationRecord(booking.getCustomer(), booking, "LATE_CANCEL", 0, "Cancelled between 1 and 6 hours"));
            if (booking.getPricing().getDiscountType() != null) {
                voucherRefundStatus = "FORFEITED";
            }
        } else {
            violationRecordRepository.save(new ViolationRecord(booking.getCustomer(), booking, "LATE_CANCEL", 0, "Cancelled under 1 hour"));
            if (booking.getPricing().getDiscountType() != null) {
                voucherRefundStatus = "FORFEITED";
            }
        }

        recordStatusHistory(booking, oldStatus, booking.getStatus(), currentActorOrNull(), reason);
        return new CancelBookingResponse(
                booking.getId().toString(),
                booking.getStatus().name(),
                booking.getUpdatedAt(),
                0L,
                "NONE",
                voucherRefundStatus,
                "Cancellation processed according to voucher policy."
        );
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
                recordStatusHistory(booking, oldStatus, booking.getStatus(), currentActorOrNull(), "Payment verified");
                
                notificationRepository.save(Notification.builder()
                        .id(UUID.randomUUID())
                        .user(booking.getCustomer())
                        .title("Booking đã được xác nhận!")
                        .message("Booking " + booking.getId() + " đã được thanh toán và xác nhận thành công.")
                        .type(NotificationType.BOOKING_CONFIRMED)
                        .read(false)
                        .createdAt(Instant.now())
                        .build());
            }
        }

        return toPayBookingResponse(booking, payment);
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

    private BookingResponseAssembler.PaymentInfo resolvePaymentInfo(Booking booking) {
        return paymentRepository.findByBooking(booking)
                .map(payment -> new BookingResponseAssembler.PaymentInfo(
                        payment.getMethod(),
                        payment.getStatus(),
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
                assignedStaff == null ? null : assignedStaff.getFullName()
        );
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
