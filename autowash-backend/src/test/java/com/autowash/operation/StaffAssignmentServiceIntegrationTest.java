package com.autowash.operation; 
import java.time.Instant;
import static org.assertj.core.api.Assertions.assertThat;

import com.autowash.entity.Booking;
import com.autowash.entity.User;
import com.autowash.entity.Vehicle;
import com.autowash.entity.WashSession;
import com.autowash.entity.enums.PaymentMethod;
import com.autowash.entity.enums.UserRole;
import com.autowash.entity.enums.VehicleType;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.UserRepository;
import com.autowash.repository.VehicleRepository;
import com.autowash.repository.WashSessionRepository;
import com.autowash.service.StaffAssignmentService;
import java.time.LocalTime;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;

@SpringBootTest
@ActiveProfiles("test")
class StaffAssignmentServiceIntegrationTest {

    @Autowired
    private StaffAssignmentService staffAssignmentService;

    @Autowired
    private UserRepository UserRepository;

    @Autowired
    private VehicleRepository VehicleRepository;

    @Autowired
    private BookingRepository BookingRepository;

    @Autowired
    private WashSessionRepository washSessionRepository;

    @Test
    void picksLeastLoadedActiveStaffForNewBookingAssignment() {
        User busyStaff = createStaff("Busy Staff", "0913");
        createStaff("Available Staff", "0912");
        createAssignedBooking(busyStaff, "0901777021");
        createAssignedBooking(busyStaff, "0901777022");

        User selected = staffAssignmentService.pickLeastLoadedActiveStaff();

        assertThat(selected.getId()).isNotEqualTo(busyStaff.getId());
        assertThat(BookingRepository.countByAssignedStaffAndStatusIn(selected, ACTIVE_ASSIGNMENT_STATUSES))
                .isLessThan(BookingRepository.countByAssignedStaffAndStatusIn(busyStaff, ACTIVE_ASSIGNMENT_STATUSES));
    }

    @Test
    void picksStaffWithLowestDailyCompletedWashCount() {
        createStaff("Low Daily Staff", "0915");
        User highDailyStaff = createStaff("High Daily Staff", "0916");
        createCompletedSession(highDailyStaff, "0901777031");
        createCompletedSession(highDailyStaff, "0901777032");

        User selected = staffAssignmentService.pickLeastLoadedActiveStaff();

        assertThat(selected.getId()).isNotEqualTo(highDailyStaff.getId());
        assertThat(washSessionRepository.countByAssignedStaffAndStatusAndCompletedAtBetween(
                selected,
                com.autowash.entity.enums.WashSessionStatus.COMPLETED,
                startOfToday(),
                startOfTomorrow()
        )).isLessThan(2);
    }

    @Test
    void excludesStaffWithActiveWashSession() {
        User busySessionStaff = createStaff("Busy Session Staff", "0917");
        createActiveSession(busySessionStaff, "0901777041");

        User selected = staffAssignmentService.pickLeastLoadedActiveStaff();

        assertThat(selected.getId()).isNotEqualTo(busySessionStaff.getId());
        assertThat(washSessionRepository.existsByAssignedStaffAndStatusIn(
                busySessionStaff,
                Set.of(
                        com.autowash.entity.enums.WashSessionStatus.PENDING,
                        com.autowash.entity.enums.WashSessionStatus.QUEUED,
                        com.autowash.entity.enums.WashSessionStatus.CHECKED_IN,
                        com.autowash.entity.enums.WashSessionStatus.IN_PROGRESS
                )
        )).isTrue();
    }

    @Test
    void bookingTimeAssignmentExcludesStaffWithOverlappingActiveSession() {
        User overlappingStaff = createStaff("Overlapping Session Staff", "0920");
        Booking targetBooking = createConfirmedBooking(uniquePhone("0902"));
        createActiveSessionAt(overlappingStaff, "0901777051", targetBooking.getScheduledAt());

        assertThat(staffAssignmentService.isStaffAvailableForBooking(overlappingStaff, targetBooking)).isFalse();

        User selected = staffAssignmentService.pickLeastLoadedActiveStaffForBooking(targetBooking);

        assertThat(selected.getId()).isNotEqualTo(overlappingStaff.getId());
    }

    private static final Set<com.autowash.entity.enums.BookingStatus> ACTIVE_ASSIGNMENT_STATUSES = Set.of(
            com.autowash.entity.enums.BookingStatus.CONFIRMED,
            com.autowash.entity.enums.BookingStatus.CHECKED_IN,
            com.autowash.entity.enums.BookingStatus.IN_PROGRESS
    );

    private static java.time.Instant startOfToday() {
        return java.time.LocalDate.now(java.time.ZoneId.systemDefault())
                .atStartOfDay(java.time.ZoneId.systemDefault())
                .toInstant();
    }

    private static java.time.Instant startOfTomorrow() {
        return java.time.LocalDate.now(java.time.ZoneId.systemDefault())
                .plusDays(1)
                .atStartOfDay(java.time.ZoneId.systemDefault())
                .toInstant();
    }

    private User createStaff(String fullName, String phonePrefix) {
        User staff = new User(fullName, uniquePhone(phonePrefix), fullName.toLowerCase().replace(" ", ".") + "-" + UUID.randomUUID() + "@example.com", "hash");
        staff.activate();
        ReflectionTestUtils.setField(staff, "role", UserRole.STAFF);
        return UserRepository.saveAndFlush(staff);
    }

    private void createAssignedBooking(User staff, String customerPhone) {
        Booking booking = createConfirmedBooking(customerPhone);
        booking.assignStaff(staff);
        BookingRepository.saveAndFlush(booking);
    }

    private void createCompletedSession(User staff, String customerPhone) {
        Booking booking = createConfirmedBooking(customerPhone);
        booking.assignStaff(staff);
        BookingRepository.saveAndFlush(booking);
        WashSession session = WashSession.create(booking, null, staff);
        session.complete(Instant.now(), 10);
        washSessionRepository.saveAndFlush(session);
    }

    private void createActiveSession(User staff, String customerPhone) {
        Booking booking = createConfirmedBooking(customerPhone);
        booking.assignStaff(staff);
        BookingRepository.saveAndFlush(booking);
        washSessionRepository.saveAndFlush(WashSession.create(booking, null, staff));
    }

    private void createActiveSessionAt(User staff, String customerPhone, Instant scheduledAt) {
        Booking booking = createConfirmedBooking(customerPhone);
        ReflectionTestUtils.setField(booking, "scheduledAt", scheduledAt);
        booking.assignStaff(staff);
        BookingRepository.saveAndFlush(booking);
        washSessionRepository.saveAndFlush(WashSession.create(booking, null, staff));
    }

    private Booking createConfirmedBooking(String customerPhone) {
        User customer = new User("Assignment Customer", customerPhone, customerPhone + "@example.com", "hash");
        customer.activate();
        UserRepository.saveAndFlush(customer);
        Vehicle vehicle = VehicleRepository.saveAndFlush(new Vehicle(
                customer,
                "30A-" + customerPhone.substring(customerPhone.length() - 6),
                VehicleType.CAR,
                "Toyota",
                "Camry",
                2023,
                "Silver",
                true
        ));
        Booking booking = new Booking(
                UUID.randomUUID(),
                customer,
                vehicle,
                null,
                null,
                null,
                Instant.now().plusSeconds(86400),
                LocalTime.of(14, 0),
                PaymentMethod.E_WALLET,
                150000,
                0,
                0,
                150000,
                30
        );
        booking.confirmByOtp();
        return booking;
    }

    private String uniquePhone(String prefix) {
        String digits = UUID.randomUUID().toString().replaceAll("\\D", "");
        while (digits.length() < 6) {
            digits += "0";
        }
        return prefix + digits.substring(0, 6);
    }
}
