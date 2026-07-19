package com.autowash.service;

import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;

import com.autowash.entity.enums.WashSessionStatus;
import org.springframework.http.HttpStatus;

public final class WashSessionLifecycle {

    private WashSessionLifecycle() {
    }

    public static void validateTransition(WashSessionStatus current, WashSessionStatus next) {
        if (!isValidTransition(current, next)) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "Invalid transition: " + current + " \u2192 " + next,
                    ErrorCode.INVALID_STATE
            );
        }
    }

    public static boolean isValidTransition(WashSessionStatus current, WashSessionStatus next) {
        return switch (current) {
            case PENDING -> next == WashSessionStatus.PENDING || next == WashSessionStatus.QUEUED || next == WashSessionStatus.CHECKED_IN || next == WashSessionStatus.CANCELLED;
            case QUEUED -> next == WashSessionStatus.CHECKED_IN || next == WashSessionStatus.CANCELLED;
            case CHECKED_IN -> next == WashSessionStatus.IN_PROGRESS || next == WashSessionStatus.CANCELLED;
            case IN_PROGRESS -> next == WashSessionStatus.COMPLETED || next == WashSessionStatus.CANCELLED;
            case COMPLETED, CANCELLED -> false;
        };
    }
}

