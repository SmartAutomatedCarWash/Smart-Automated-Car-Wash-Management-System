import type { CustomerVehicleDetail, CustomerVehicleListItem } from "@/entities/vehicles";
import { translate } from "@/shared/store/language.store";

type VehicleDisplaySource = Pick<CustomerVehicleDetail | CustomerVehicleListItem, "brand" | "model" | "plate" | "color">;

const PLACEHOLDER_VALUES = new Set(["other", "other model"]);

function isPlaceholder(value: string | null | undefined) {
  return !value || PLACEHOLDER_VALUES.has(value.trim().toLowerCase());
}

export function getVehicleDisplayName(vehicle: Pick<VehicleDisplaySource, "brand" | "model" | "plate">, language: "vi" | "en") {
  const brand = isPlaceholder(vehicle.brand) ? "" : vehicle.brand.trim();
  const model = isPlaceholder(vehicle.model) ? "" : vehicle.model.trim();
  const name = [brand, model].filter(Boolean).join(" ");

  if (name) {
    return name;
  }

  return translate(language, "Xe khac", "Other vehicle");
}

export function getVehicleDisplayColor(color: string | null | undefined, language: "vi" | "en") {
  return isPlaceholder(color) ? translate(language, "Chua cung cap", "Not provided") : color!.trim();
}

export function getVehicleDisplayField(
  field: "brand" | "model" | "color",
  value: string | null | undefined,
  language: "vi" | "en",
) {
  if (!isPlaceholder(value)) {
    return value!.trim();
  }

  if (field === "brand") {
    return translate(language, "Hang xe khac", "Other brand");
  }

  return translate(language, "Chua cung cap", "Not provided");
}
