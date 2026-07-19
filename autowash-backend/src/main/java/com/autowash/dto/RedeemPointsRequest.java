package com.autowash.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record RedeemPointsRequest(
        @NotNull UUID offerId
) {
}
