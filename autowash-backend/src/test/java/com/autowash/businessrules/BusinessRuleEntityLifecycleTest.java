package com.autowash.businessrules;

import static org.assertj.core.api.Assertions.assertThat;

import com.autowash.entity.Booking;
import com.autowash.entity.CustomerCombo;
import com.autowash.entity.User;
import com.autowash.entity.UserDiscount;
import com.autowash.entity.UserPreference;
import com.autowash.entity.Vehicle;
import com.autowash.entity.enums.BookingConfirmationStatus;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.entity.enums.CustomerComboStatus;
import com.autowash.entity.enums.LanguagePreference;
import com.autowash.entity.enums.ThemePreference;
import com.autowash.entity.enums.UserDiscountStatus;
import com.autowash.entity.enums.UserRole;
import com.autowash.entity.enums.UserStatus;
import com.autowash.entity.enums.VehicleStatus;
import com.autowash.entity.enums.VehicleType;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class BusinessRuleEntityLifecycleTest {

    @Test
    void br005NewCustomerStartsPendingAndCanBeActivatedByOtpFlow() {
        User user = new User("Customer One", "0900000000", "customer@example.com", "hash");

        assertThat(user.getRole()).isEqualTo(UserRole.CUSTOMER);
        assertThat(user.getStatus()).isEqualTo(UserStatus.PENDING);
        assertThat(user.isNewCustomer()).isTrue();

        user.activate();

        assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
    }

    @Test
    void br026UserPreferenceDefaultsAreVietnameseLightAndOptedInForSms() {
        UserPreference preference = new UserPreference(customer());

        assertThat(preference.getLanguage()).isEqualTo(LanguagePreference.VI);
        assertThat(preference.getTheme()).isEqualTo(ThemePreference.LIGHT);
        assertThat(preference.isNotificationsEnabled()).isTrue();
        assertThat(preference.isSmsNotifications()).isTrue();
        assertThat(preference.isEmailNotifications()).isFalse();
    }

    @Test
    void br036VehicleSoftDeleteMarksDeletedAndUnsetsPrimary() {
        Vehicle vehicle = new Vehicle(customer(), "30H-123456", VehicleType.CAR, "Toyota", "Camry", 2026, "Black", true);

        vehicle.softDelete();

        assertThat(vehicle.getStatus()).isEqualTo(VehicleStatus.DELETED);
        assertThat(vehicle.isPrimary()).isFalse();
    }

    @Test
    void br046AndBr069BookingDefaultsPendingAndMapsConfirmationStatus() {
        Booking booking = booking();

        assertThat(booking.getStatus()).isEqualTo(BookingStatus.PENDING);
        assertThat(booking.getConfirmationStatus()).isEqualTo(BookingConfirmationStatus.PENDING);

        booking.updateStatus(BookingStatus.CONFIRMED);
        assertThat(booking.getConfirmationStatus()).isEqualTo(BookingConfirmationStatus.VERIFIED);

        booking.cancel("customer requested");
        assertThat(booking.getConfirmationStatus()).isEqualTo(BookingConfirmationStatus.CANCELLED);

        booking.markNoShow();
        assertThat(booking.getConfirmationStatus()).isEqualTo(BookingConfirmationStatus.EXPIRED);
    }

    @Test
    void br062UserDiscountCanBeUsedOnceAndReleasedAfterCancellationEquivalent() {
        UserDiscount discount = UserDiscount.builder()
                .user(customer())
                .status(UserDiscountStatus.AVAILABLE)
                .build();
        Booking booking = booking();

        discount.markAsUsed(booking);

        assertThat(discount.getStatus()).isEqualTo(UserDiscountStatus.USED);
        assertThat(discount.getUsedInBooking()).isSameAs(booking);
        assertThat(discount.getUsedAt()).isNotNull();

        discount.release();

        assertThat(discount.getStatus()).isEqualTo(UserDiscountStatus.AVAILABLE);
        assertThat(discount.getUsedInBooking()).isNull();
        assertThat(discount.getUsedAt()).isNull();
    }

    @Test
    void br132ComboIsMarkedUsedUpWhenRemainingUsagesReachZeroAndCanBeRestored() {
        Instant now = Instant.now();
        CustomerCombo combo = new CustomerCombo(UUID.randomUUID(), customer(), UUID.randomUUID(), 1, now, now.plusSeconds(86_400));

        combo.consumeUsage();

        assertThat(combo.getRemainingUsages()).isZero();
        assertThat(combo.getStatus()).isEqualTo(CustomerComboStatus.USED_UP);
        assertThat(combo.hasRemainingUsages()).isFalse();

        combo.restoreUsage();

        assertThat(combo.getRemainingUsages()).isEqualTo(1);
        assertThat(combo.getStatus()).isEqualTo(CustomerComboStatus.ACTIVE);
    }

    private Booking booking() {
        User customer = customer();
        Vehicle vehicle = new Vehicle(customer, "30H-654321", VehicleType.CAR, "Honda", "Civic", 2025, null, false);
        return new Booking(UUID.randomUUID(), customer, vehicle, Instant.now().plusSeconds(86_400));
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
}
