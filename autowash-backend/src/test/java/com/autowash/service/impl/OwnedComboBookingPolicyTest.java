package com.autowash.service.impl;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class OwnedComboBookingPolicyTest {

    @Test
    void fullyCoveredOwnedComboCanBeConfirmedImmediately() {
        assertThat(OwnedComboBookingPolicy.isFullyCovered(true, 0)).isTrue();
        assertThat(OwnedComboBookingPolicy.hasUnsupportedPayableExtras(true, 0)).isFalse();
    }

    @Test
    void ownedComboWithPayableExtrasMustNotBeMarkedPaid() {
        assertThat(OwnedComboBookingPolicy.isFullyCovered(true, 50_000)).isFalse();
        assertThat(OwnedComboBookingPolicy.hasUnsupportedPayableExtras(true, 50_000)).isTrue();
    }

    @Test
    void regularBookingIsNeverCoveredByOwnedComboPolicy() {
        assertThat(OwnedComboBookingPolicy.isFullyCovered(false, 0)).isFalse();
        assertThat(OwnedComboBookingPolicy.hasUnsupportedPayableExtras(false, 50_000)).isFalse();
    }
}
