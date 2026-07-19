package com.autowash.mapper;

import com.autowash.dto.TierConfigResponse;
import com.autowash.entity.TierConfig;
import java.math.BigDecimal;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = CentralMapperConfig.class)
public interface TierConfigMapper {

    @Mapping(target = "name", source = "displayName")
    TierConfigResponse toResponse(TierConfig config);

    default double map(BigDecimal value) {
        return value == null ? 0.0 : value.doubleValue();
    }
}
