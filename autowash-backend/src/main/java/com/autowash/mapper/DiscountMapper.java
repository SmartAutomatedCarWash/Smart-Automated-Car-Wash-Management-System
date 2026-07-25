package com.autowash.mapper;

import com.autowash.dto.DiscountResponse;
import com.autowash.dto.UserDiscountResponse;
import com.autowash.entity.Booking;
import com.autowash.entity.Discount;
import com.autowash.entity.UserDiscount;
import java.util.List;
import java.util.UUID;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = CentralMapperConfig.class)
public interface DiscountMapper {

    @Mapping(target = "applicableTierIds", source = "applicableTierIds")
    @Mapping(target = "applicableServiceIds", source = "applicableServiceIds")
    DiscountResponse toResponse(Discount discount, List<String> applicableTierIds, List<UUID> applicableServiceIds);

    @Mapping(target = "id", source = "userDiscount.id")
    @Mapping(target = "voucherCode", source = "userDiscount.voucherCode")
    @Mapping(target = "discount", source = "discount")
    @Mapping(target = "acquisitionMethod", source = "userDiscount.acquisitionMethod")
    @Mapping(target = "pointsSpent", source = "userDiscount.pointsSpent")
    @Mapping(target = "claimedAt", source = "userDiscount.claimedAt")
    @Mapping(target = "expiresAt", source = "userDiscount.expiresAt")
    @Mapping(target = "status", source = "userDiscount.status")
    @Mapping(target = "usedAt", source = "userDiscount.usedAt")
    @Mapping(target = "usedInBookingId", source = "userDiscount.usedInBooking")
    UserDiscountResponse toUserDiscountResponse(UserDiscount userDiscount, DiscountResponse discount);

    default UUID map(Booking booking) {
        return booking == null ? null : booking.getId();
    }
}
