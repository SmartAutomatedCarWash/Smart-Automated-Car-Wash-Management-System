package com.autowash.operation;


import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.autowash.entity.enums.WashSessionStatus;
import com.autowash.service.WashSessionLifecycle;
import com.autowash.shared.exception.ApiException;
import java.util.Set;
import org.junit.jupiter.api.Test;

class WashSessionLifecycleTest {

    @Test
    void acceptsOnlyConfiguredForwardTransitions() {
        WashSessionLifecycle.validateTransition(WashSessionStatus.PENDING, WashSessionStatus.PENDING);
        WashSessionLifecycle.validateTransition(WashSessionStatus.PENDING, WashSessionStatus.CHECKED_IN);
        WashSessionLifecycle.validateTransition(WashSessionStatus.CHECKED_IN, WashSessionStatus.IN_PROGRESS);
        WashSessionLifecycle.validateTransition(WashSessionStatus.IN_PROGRESS, WashSessionStatus.COMPLETED);
    }

    @Test
    void rejectsSkippedBackwardAndRepeatedTransitions() {
        Set<Transition> validTransitions = Set.of(
                new Transition(WashSessionStatus.PENDING, WashSessionStatus.PENDING),
                new Transition(WashSessionStatus.PENDING, WashSessionStatus.QUEUED),
                new Transition(WashSessionStatus.PENDING, WashSessionStatus.CHECKED_IN),
                new Transition(WashSessionStatus.PENDING, WashSessionStatus.CANCELLED),
                new Transition(WashSessionStatus.QUEUED, WashSessionStatus.CHECKED_IN),
                new Transition(WashSessionStatus.QUEUED, WashSessionStatus.CANCELLED),
                new Transition(WashSessionStatus.CHECKED_IN, WashSessionStatus.IN_PROGRESS),
                new Transition(WashSessionStatus.CHECKED_IN, WashSessionStatus.CANCELLED),
                new Transition(WashSessionStatus.IN_PROGRESS, WashSessionStatus.COMPLETED),
                new Transition(WashSessionStatus.IN_PROGRESS, WashSessionStatus.CANCELLED)
        );

        for (WashSessionStatus current : WashSessionStatus.values()) {
            for (WashSessionStatus next : WashSessionStatus.values()) {
                Transition transition = new Transition(current, next);
                if (validTransitions.contains(transition)) {
                    continue;
                }

                assertThatThrownBy(() -> WashSessionLifecycle.validateTransition(current, next))
                        .isInstanceOf(ApiException.class)
                        .hasMessage("Invalid transition: " + current + " \u2192 " + next);
            }
        }
    }

    private record Transition(WashSessionStatus current, WashSessionStatus next) {
    }
}
