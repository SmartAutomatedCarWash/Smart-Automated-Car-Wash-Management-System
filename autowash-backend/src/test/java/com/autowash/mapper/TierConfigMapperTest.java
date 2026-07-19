package com.autowash.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import com.autowash.dto.TierConfigResponse;
import com.autowash.entity.TierConfig;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class TierConfigMapperTest {

    private final TierConfigMapper mapper = Mappers.getMapper(TierConfigMapper.class);

    @Test
    void mapsTierConfigToResponseWithDisplayNameAndMultiplierConversion() {
        TierConfig config = new TierConfig(
                "gold",
                "Gold Member",
                1500,
                BigDecimal.valueOf(1.25),
                30,
                3,
                true,
                true,
                "https://cdn.example.com/gold.png"
        );

        TierConfigResponse response = mapper.toResponse(config);

        assertThat(response.tier()).isEqualTo("GOLD");
        assertThat(response.name()).isEqualTo("Gold Member");
        assertThat(response.minPoints()).isEqualTo(1500);
        assertThat(response.pointMultiplier()).isEqualTo(1.25);
        assertThat(response.priorityScore()).isEqualTo(30);
        assertThat(response.rankOrder()).isEqualTo(3);
        assertThat(response.systemTier()).isTrue();
        assertThat(response.active()).isTrue();
        assertThat(response.imageUrl()).isEqualTo("https://cdn.example.com/gold.png");
        assertThat(response.updatedAt()).isEqualTo(config.getUpdatedAt());
    }
}
