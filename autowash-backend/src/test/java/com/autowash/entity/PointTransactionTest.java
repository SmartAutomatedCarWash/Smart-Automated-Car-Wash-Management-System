package com.autowash.entity;

import static org.assertj.core.api.Assertions.assertThat;

import com.autowash.entity.enums.PointTransactionType;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class PointTransactionTest {

    @Test
    void earnTransactionKeepsTheAppliedPointCalculation() {
        PointTransaction transaction = new PointTransaction(
                null,
                null,
                PointTransactionType.EARN,
                130,
                630,
                "Wash completed",
                87,
                new BigDecimal("1.50")
        );

        assertThat(transaction.getBasePoints()).isEqualTo(87);
        assertThat(transaction.getPointMultiplier()).isEqualByComparingTo("1.50");
        assertThat(transaction.getPoints()).isEqualTo(130);
    }
}
