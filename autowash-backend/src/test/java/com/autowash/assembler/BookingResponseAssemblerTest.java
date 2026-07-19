package com.autowash.assembler;

import static org.assertj.core.api.Assertions.assertThat;

import com.autowash.dto.BookingDetailResponse;
import com.autowash.dto.BookingStatusHistoryItem;
import com.autowash.entity.Booking;
import com.autowash.entity.BookingDetail;
import com.autowash.entity.BookingPricing;
import com.autowash.entity.User;
import com.autowash.entity.Vehicle;
import com.autowash.entity.WashSession;
import com.autowash.entity.enums.BookingItemType;
import com.autowash.entity.enums.PaymentMethod;
import com.autowash.entity.enums.PaymentStatus;
import com.autowash.entity.enums.UserRole;
import com.autowash.entity.enums.UserStatus;
import com.autowash.entity.enums.VehicleType;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class BookingResponseAssemblerTest {

    private final BookingResponseAssembler assembler = new BookingResponseAssembler();

    @Test
    void toDetailResponsePreservesAggregateFieldsAndHistoryOrder() {
        Instant scheduledAt = LocalDate.of(2026, 7, 20)
                .atTime(LocalTime.of(9, 30))
                .atZone(ZoneId.systemDefault())
                .toInstant();
        User customer = customer();
        User staff = staff("Staff One");
        Vehicle vehicle = new Vehicle(customer, "30H-123456", VehicleType.CAR, "Toyota", "Camry", 2023, "Black", true);
        Booking booking = new Booking(UUID.randomUUID(), customer, vehicle, scheduledAt);
        booking.setConfirmationEmail("customer@example.com");
        booking.assignStaff(staff);
        attachPricing(booking, 250_000, 50_000, 200_000, 75, "WELCOME50");
        attachDetails(booking, packageDetail("Premium Wash", 200_000), addonDetail("Interior Care", 50_000));

        WashSession washSession = WashSession.builder()
                .id(UUID.randomUUID())
                .booking(booking)
                .assignedStaff(staff("Session Staff"))
                .status(com.autowash.entity.enums.WashSessionStatus.COMPLETED)
                .completedAt(Instant.parse("2026-07-20T03:00:00Z"))
                .notes("Done cleanly")
                .createdAt(Instant.parse("2026-07-20T02:00:00Z"))
                .build();
        var payment = new BookingResponseAssembler.PaymentInfo(
                PaymentMethod.BANK_TRANSFER,
                PaymentStatus.PAID,
                "TXN-001",
                Instant.parse("2026-07-20T02:30:00Z")
        );
        List<BookingStatusHistoryItem> history = List.of(
                new BookingStatusHistoryItem(null, "PENDING", "Customer One", "Booking created", Instant.parse("2026-07-20T01:00:00Z")),
                new BookingStatusHistoryItem("PENDING", "CONFIRMED", "Staff One", "Confirmed", Instant.parse("2026-07-20T01:10:00Z"))
        );

        BookingDetailResponse response = assembler.toDetailResponse(booking, washSession, payment, history);

        assertThat(response.bookingId()).isEqualTo(booking.getId().toString());
        assertThat(response.customerId()).isEqualTo(customer.getId().toString());
        assertThat(response.customerName()).isEqualTo("Customer One");
        assertThat(response.vehiclePlate()).isEqualTo("30H-123456");
        assertThat(response.primaryItemName()).isEqualTo("Premium Wash");
        assertThat(response.details()).extracting("snapshotName").containsExactly("Premium Wash", "Interior Care");
        assertThat(response.pricing().subtotal()).isEqualTo(250_000);
        assertThat(response.pricing().discountCode()).isEqualTo("WELCOME50");
        assertThat(response.pricing().discountAmount()).isEqualTo(50_000);
        assertThat(response.pricing().finalAmount()).isEqualTo(200_000);
        assertThat(response.scheduling().bookingDate()).isEqualTo(LocalDate.of(2026, 7, 20));
        assertThat(response.scheduling().estimatedDuration()).isEqualTo(75);
        assertThat(response.payment().method()).isEqualTo("BANK_TRANSFER");
        assertThat(response.payment().status()).isEqualTo("PAID");
        assertThat(response.washSessionId()).isEqualTo(washSession.getId().toString());
        assertThat(response.staffName()).isEqualTo("Session Staff");
        assertThat(response.washStatus()).isEqualTo("COMPLETED");
        assertThat(response.notes()).isEqualTo("Done cleanly");
        assertThat(response.statusHistory()).containsExactlyElementsOf(history);
    }

    @Test
    void toListItemUsesNullWashFieldsWhenSessionIsMissing() {
        Instant scheduledAt = LocalDate.of(2026, 7, 21)
                .atTime(LocalTime.of(14, 0))
                .atZone(ZoneId.systemDefault())
                .toInstant();
        User customer = customer();
        Vehicle vehicle = new Vehicle(customer, "30H-654321", VehicleType.CAR, "Honda", "Civic", 2022, null, false);
        Booking booking = new Booking(UUID.randomUUID(), customer, vehicle, scheduledAt);
        attachPricing(booking, 100_000, 0, 100_000, 45, null);
        attachDetails(booking, packageDetail("Basic Wash", 100_000));

        var response = assembler.toListItem(booking, null);

        assertThat(response.bookingId()).isEqualTo(booking.getId().toString());
        assertThat(response.vehiclePlate()).isEqualTo("30H-654321");
        assertThat(response.primaryItemName()).isEqualTo("Basic Wash");
        assertThat(response.finalAmount()).isEqualTo(100_000);
        assertThat(response.washStatus()).isNull();
        assertThat(response.completedAt()).isNull();
    }

    private User customer() {
        return User.builder()
                .id(UUID.randomUUID())
                .fullName("Customer One")
                .phone("0900000000")
                .email("customer@example.com")
                .passwordHash("hash")
                .role(UserRole.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .createdAt(Instant.parse("2026-07-01T00:00:00Z"))
                .updatedAt(Instant.parse("2026-07-01T00:00:00Z"))
                .build();
    }

    private User staff(String name) {
        return User.builder()
                .id(UUID.randomUUID())
                .fullName(name)
                .phone("0911111111")
                .email(name.toLowerCase().replace(' ', '.') + "@example.com")
                .passwordHash("hash")
                .role(UserRole.STAFF)
                .status(UserStatus.ACTIVE)
                .createdAt(Instant.parse("2026-07-01T00:00:00Z"))
                .updatedAt(Instant.parse("2026-07-01T00:00:00Z"))
                .build();
    }

    private BookingDetail packageDetail(String name, long price) {
        return detail(BookingItemType.PACKAGE, name, price, 1, 60, 0);
    }

    private BookingDetail addonDetail(String name, long price) {
        return detail(BookingItemType.ADDON, name, price, 1, 15, 1);
    }

    private BookingDetail detail(BookingItemType type, String name, long price, int quantity, int duration, int sortOrder) {
        return BookingDetail.builder()
                .itemType(type)
                .refId(UUID.randomUUID())
                .snapshotName(name)
                .snapshotPrice(price)
                .quantity(quantity)
                .subtotal(price * quantity)
                .durationMinutes(duration)
                .sortOrder(sortOrder)
                .build();
    }

    private void attachPricing(
            Booking booking,
            long subtotal,
            long discountAmount,
            long finalAmount,
            int duration,
            String discountSnapshot
    ) {
        BookingPricing pricing = BookingPricing.builder()
                .booking(booking)
                .subtotal(subtotal)
                .discountAmount(discountAmount)
                .finalAmount(finalAmount)
                .estimatedDurationMinutes(duration)
                .discountRefSnapshot(discountSnapshot)
                .build();
        ReflectionTestUtils.setField(pricing, "bookingId", booking.getId());
        ReflectionTestUtils.setField(booking, "pricing", pricing);
    }

    private void attachDetails(Booking booking, BookingDetail... details) {
        for (BookingDetail detail : details) {
            booking.addDetail(detail);
        }
    }
}
