package com.autowash.service.impl;

final class OwnedComboBookingPolicy {

    private OwnedComboBookingPolicy() {
    }

    static boolean isFullyCovered(boolean hasOwnedCombo, long finalAmount) {
        return hasOwnedCombo && finalAmount == 0;
    }

    static boolean hasUnsupportedPayableExtras(boolean hasOwnedCombo, long finalAmount) {
        return hasOwnedCombo && finalAmount > 0;
    }
}
