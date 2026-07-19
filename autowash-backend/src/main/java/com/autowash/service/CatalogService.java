package com.autowash.service;

import com.autowash.dto.ComboResponse;
import com.autowash.dto.PackageResponse;
import com.autowash.dto.ServiceResponse;
import com.autowash.entity.Combo;
import com.autowash.entity.Package;
import com.autowash.shared.dto.PaginationMeta;
import java.util.List;
import java.util.UUID;

public interface CatalogService {
    PackagePage getPackages(int page, int limit);
    List<ServiceResponse> getServices();
    List<ComboResponse> getAvailableCombos();
    Package requireActivePackage(String packageId);
    Combo requireActiveCombo(String comboId);
    List<CatalogOption> requireActivePackageOptions(Package pkg, List<String> optionIds);
    List<CatalogOption> requireActiveComboOptions(Combo combo, List<String> optionIds);
    PackageResponse getPackageById(String packageId);
    ComboResponse getComboById(String comboId);

    record PackagePage(List<PackageResponse> items, PaginationMeta pagination) {}
    record CatalogOption(UUID optionId, String name, long price, int durationMinutes) {}
}
