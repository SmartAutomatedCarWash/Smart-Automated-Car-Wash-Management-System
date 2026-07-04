import {
  CUSTOMER_VEHICLE_TYPES,
  type CreateCustomerVehicleRequest,
  type CustomerVehicleDetail,
  type CustomerVehicleFormErrors,
  type CustomerVehicleFormValues,
  type CustomerVehicleListItem,
  type UpdateCustomerVehicleRequest,
} from "../../../entities/vehicles/index.ts";

export const customerVehiclePlatePattern = /^[0-9]{2}[A-Z]-[0-9]{6}$/;

export const EMPTY_CUSTOMER_VEHICLE_FORM: CustomerVehicleFormValues = {
  plate: "",
  type: "CAR",
  brand: "",
  model: "",
  year: "",
  color: "",
};

export function normalizeVehiclePlate(value: string) {
  return value.toUpperCase().replace(/\s+/g, "").replace(/\./g, "");
}

export function buildVehicleFormDefaults(
  vehicle?: Pick<CustomerVehicleDetail | CustomerVehicleListItem, "plate" | "type" | "brand" | "model" | "color"> & {
    year?: number;
  },
): CustomerVehicleFormValues {
  if (!vehicle) {
    return EMPTY_CUSTOMER_VEHICLE_FORM;
  }

  return {
    plate: vehicle.plate,
    type: vehicle.type,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year ? String(vehicle.year) : "",
    color: vehicle.color ?? "",
  };
}

export function validateCustomerVehicleForm(
  values: CustomerVehicleFormValues,
  mode: "create" | "update",
): CustomerVehicleFormErrors {
  const normalizedPlate = normalizeVehiclePlate(values.plate);
  const errors: CustomerVehicleFormErrors = {};
  const yearValue = values.year.trim();
  const parsedYear = Number.parseInt(yearValue, 10);

  if (mode === "create" && !customerVehiclePlatePattern.test(normalizedPlate)) {
    errors.plate = "Plate must match formats like 30H-123456.";
  }

  if (mode === "create" && !CUSTOMER_VEHICLE_TYPES.includes(values.type)) {
    errors.type = "Vehicle type is required.";
  }

  if (values.brand.trim().length === 0) {
    errors.brand = "Brand is required.";
  } else if (values.brand.trim().length > 50) {
    errors.brand = "Brand must be at most 50 characters.";
  }

  if (values.model.trim().length === 0) {
    errors.model = "Model is required.";
  } else if (values.model.trim().length > 50) {
    errors.model = "Model must be at most 50 characters.";
  }

  if (yearValue.length === 0 || Number.isNaN(parsedYear)) {
    errors.year = "Year is required.";
  } else if (parsedYear < 1900 || parsedYear > 2100) {
    errors.year = "Year must be between 1900 and 2100.";
  }

  if (values.color.trim().length > 30) {
    errors.color = "Color must be at most 30 characters.";
  }

  return errors;
}

export function buildCreateCustomerVehicleRequest(
  values: CustomerVehicleFormValues,
): CreateCustomerVehicleRequest {
  return {
    plate: normalizeVehiclePlate(values.plate),
    type: values.type,
    brand: values.brand.trim(),
    model: values.model.trim(),
    year: Number.parseInt(values.year.trim(), 10),
    color: normalizeVehicleColor(values.color),
  };
}

export function buildUpdateCustomerVehicleRequest(
  values: CustomerVehicleFormValues,
): UpdateCustomerVehicleRequest {
  return {
    brand: values.brand.trim(),
    model: values.model.trim(),
    year: Number.parseInt(values.year.trim(), 10),
    color: normalizeVehicleColor(values.color),
  };
}

function normalizeVehicleColor(value: string) {
  return value.trim().length > 0 ? value.trim() : null;
}
