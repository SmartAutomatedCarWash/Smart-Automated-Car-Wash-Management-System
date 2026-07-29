package com.autowash.service;

import com.autowash.dto.AdminPackageRequest;
import com.autowash.dto.AdminServiceRequest;
import com.autowash.dto.PackageResponse;
import com.autowash.dto.ServiceResponse;
import com.autowash.shared.dto.PaginationMeta;
import java.util.List;

public interface AdminCatalogManagementService {

    List<ServiceResponse> listServices();
    ServicePage listServices(String status, String sortBy, String direction, int page, int limit);

    ServiceResponse getService(String serviceId);

    ServiceResponse createService(AdminServiceRequest request);

    ServiceResponse updateService(String serviceId, AdminServiceRequest request);

    ServiceResponse deleteService(String serviceId);


    List<PackageResponse> listPackages();
    PackagePage listPackages(String status, String sortBy, String direction, int page, int limit);

    PackageResponse getPackage(String packageId);

    PackageResponse createPackage(AdminPackageRequest request);

    PackageResponse updatePackage(String packageId, AdminPackageRequest request);

    PackageResponse deletePackage(String packageId);

    record ServicePage(List<ServiceResponse> items, PaginationMeta pagination) {}
    record PackagePage(List<PackageResponse> items, PaginationMeta pagination) {}
}
