package com.autowash.businessrules;

import static org.assertj.core.api.Assertions.assertThat;

import com.autowash.dto.CreateBookingRequest;
import com.autowash.dto.CreateVehicleRequest;
import com.autowash.dto.RegisterRequest;
import com.autowash.entity.enums.PaymentMethod;
import com.autowash.entity.enums.VehicleType;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.time.LocalDate;
import java.util.Set;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class BusinessRuleValidationTest {

    private static jakarta.validation.ValidatorFactory validatorFactory;
    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        validatorFactory.close();
    }

    @Test
    void br007RegistrationPasswordRequiresLengthAndCharacterClasses() {
        assertThat(validator.validate(new RegisterRequest(
                "Customer One",
                "customer@example.com",
                "Strong1!",
                "Strong1!"
        ))).isEmpty();

        Set<String> invalidProperties = validator.validate(new RegisterRequest(
                        "Customer One",
                        "customer@example.com",
                        "weakpass",
                        "weakpass"
                )).stream()
                .map(violation -> violation.getPropertyPath().toString())
                .collect(java.util.stream.Collectors.toSet());

        assertThat(invalidProperties).contains("password");
    }

    @Test
    void br015RegistrationPasswordConfirmationMustMatch() {
        Set<String> invalidProperties = validator.validate(new RegisterRequest(
                        "Customer One",
                        "customer@example.com",
                        "Strong1!",
                        "Different1!"
                )).stream()
                .map(violation -> violation.getPropertyPath().toString())
                .collect(java.util.stream.Collectors.toSet());

        assertThat(invalidProperties).contains("passwordConfirmed");
    }

    @Test
    void br028AndBr032VehiclePlateAndYearAreValidated() {
        assertThat(validator.validate(new CreateVehicleRequest(
                "30H-123456",
                VehicleType.CAR,
                "Toyota",
                "Camry",
                2026,
                null
        ))).isEmpty();

        Set<String> invalidProperties = validator.validate(new CreateVehicleRequest(
                        "30h-123456",
                        VehicleType.CAR,
                        "Toyota",
                        "Camry",
                        1899,
                        null
                )).stream()
                .map(violation -> violation.getPropertyPath().toString())
                .collect(java.util.stream.Collectors.toSet());

        assertThat(invalidProperties).contains("plate", "year");
    }

    @Test
    void br038AndBr044BookingRequiresPackageOrComboAndValidTime() {
        assertThat(validator.validate(new CreateBookingRequest(
                "vehicle-1",
                "package-1",
                java.util.List.of(),
                LocalDate.now(),
                "08:30",
                null,
                "customer@example.com",
                PaymentMethod.CASH_AT_COUNTER,
                null,
                null
        ))).isEmpty();

        Set<String> invalidProperties = validator.validate(new CreateBookingRequest(
                        "vehicle-1",
                        null,
                        java.util.List.of(),
                        LocalDate.now(),
                        "24:00",
                        null,
                        "not-an-email",
                        PaymentMethod.CASH_AT_COUNTER,
                        null,
                        null
                )).stream()
                .map(violation -> violation.getPropertyPath().toString())
                .collect(java.util.stream.Collectors.toSet());

        assertThat(invalidProperties).contains("bookingTime", "confirmationEmail", "packageOrCombo");
    }
}
