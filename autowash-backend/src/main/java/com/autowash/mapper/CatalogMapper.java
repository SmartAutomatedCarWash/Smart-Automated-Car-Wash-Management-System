package com.autowash.mapper;

import com.autowash.dto.ComboResponse;
import com.autowash.dto.ComboServiceItem;
import com.autowash.dto.PackageResponse;
import com.autowash.dto.ServiceResponse;
import com.autowash.entity.Combo;
import com.autowash.entity.ComboService;
import com.autowash.entity.Package;
import com.autowash.entity.enums.ActiveStatus;
import java.util.List;
import java.util.UUID;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = CentralMapperConfig.class)
public interface CatalogMapper {

    @Mapping(target = "packageId", source = "pkg.id")
    @Mapping(target = "duration", source = "pkg.durationMinutes")
    @Mapping(target = "features", source = "features")
    @Mapping(target = "serviceIds", source = "serviceIds")
    @Mapping(target = "imageUrls", source = "imageUrls")
    @Mapping(target = "popularity", source = "popularity")
    @Mapping(target = "averageRating", source = "averageRating")
    @Mapping(target = "reviewCount", source = "reviewCount")
    PackageResponse toPackageResponse(
            Package pkg,
            List<String> features,
            List<String> serviceIds,
            List<String> imageUrls,
            String popularity,
            Double averageRating,
            Long reviewCount
    );

    @Mapping(target = "serviceId", source = "service.id")
    @Mapping(target = "duration", source = "service.durationMinutes")
    @Mapping(target = "imageUrls", source = "imageUrls")
    ServiceResponse toServiceResponse(com.autowash.entity.Service service, List<String> imageUrls);

    @Mapping(target = "comboId", source = "combo.id")
    @Mapping(target = "basePrice", source = "combo.price")
    @Mapping(target = "durationDays", source = "durationDays")
    @Mapping(target = "maxServices", source = "maxServices")
    @Mapping(target = "services", source = "services")
    @Mapping(target = "imageUrls", source = "imageUrls")
    @Mapping(target = "isActive", source = "active")
    @Mapping(target = "canUpgrade", source = "canUpgrade")
    @Mapping(target = "upgradePriceFrom", source = "upgradePriceFrom")
    ComboResponse toComboResponse(
            Combo combo,
            int durationDays,
            int maxServices,
            List<ComboServiceItem> services,
            List<String> imageUrls,
            boolean active,
            boolean canUpgrade,
            long upgradePriceFrom
    );

    @Mapping(target = "serviceId", source = "optionId")
    @Mapping(target = "name", source = "optionName")
    @Mapping(target = "description", source = "optionDescription")
    @Mapping(target = "price", source = "optionPrice")
    @Mapping(target = "durationMinutes", source = "optionDurationMinutes")
    ComboServiceItem toComboServiceItem(ComboService service);

    default String map(UUID value) {
        return value == null ? null : value.toString();
    }

    default String map(ActiveStatus value) {
        return value == null ? null : value.name();
    }
}
