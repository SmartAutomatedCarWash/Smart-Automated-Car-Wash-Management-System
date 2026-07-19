package com.autowash.businessrules;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.autowash.entity.enums.WashSessionStatus;
import com.autowash.service.WashSessionLifecycle;
import com.autowash.shared.exception.ApiException;
import org.junit.jupiter.api.Test;

class WashSessionLifecycleBusinessRuleTest {

    @Test
    void br086AllowsDesignedForwardTransitionsAndCancellationFromNonTerminalStates() {
        assertThat(WashSessionLifecycle.isValidTransition(WashSessionStatus.PENDING, WashSessionStatus.QUEUED)).isTrue();
        assertThat(WashSessionLifecycle.isValidTransition(WashSessionStatus.QUEUED, WashSessionStatus.CHECKED_IN)).isTrue();
        assertThat(WashSessionLifecycle.isValidTransition(WashSessionStatus.CHECKED_IN, WashSessionStatus.IN_PROGRESS)).isTrue();
        assertThat(WashSessionLifecycle.isValidTransition(WashSessionStatus.IN_PROGRESS, WashSessionStatus.COMPLETED)).isTrue();
        assertThat(WashSessionLifecycle.isValidTransition(WashSessionStatus.CHECKED_IN, WashSessionStatus.CANCELLED)).isTrue();
    }

    @Test
    void br086RejectsInvalidOrTerminalTransitions() {
        assertThat(WashSessionLifecycle.isValidTransition(WashSessionStatus.COMPLETED, WashSessionStatus.CANCELLED)).isFalse();
        assertThat(WashSessionLifecycle.isValidTransition(WashSessionStatus.CANCELLED, WashSessionStatus.QUEUED)).isFalse();

        assertThatThrownBy(() -> WashSessionLifecycle.validateTransition(
                WashSessionStatus.IN_PROGRESS,
                WashSessionStatus.CHECKED_IN
        ))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Invalid transition");
    }
}
