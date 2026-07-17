import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCreateCustomerVehicleRequest,
  buildUpdateCustomerVehicleRequest,
  buildVehicleFormDefaults,
  normalizeVehiclePlate,
  validateCustomerVehicleForm,
} from "./vehicle-form.ts";

test("normalizes vehicle plate before create payload is sent", () => {
  assert.equal(normalizeVehiclePlate(" 30h-123.456 "), "30H-123456");
});

test("builds create vehicle payload with trimmed values", () => {
  assert.deepEqual(
    buildCreateCustomerVehicleRequest({
      plate: "30h-123.456",
      type: "SUV",
      brand: " Toyota ",
      model: " Cross ",
      year: " 2024 ",
      color: " White ",
    }),
    {
      plate: "30H-123456",
      type: "SUV",
      brand: "Toyota",
      model: "Cross",
      year: 2024,
      color: "White",
    },
  );
});

test("builds update vehicle payload without plate and type", () => {
  assert.deepEqual(
    buildUpdateCustomerVehicleRequest({
      plate: "ignored",
      type: "CAR",
      brand: " Mazda ",
      model: " 3 ",
      year: "2021",
      color: " ",
    }),
    {
      brand: "Mazda",
      model: "3",
      year: 2021,
      color: null,
    },
  );
});

test("returns explicit validation errors for create vehicle form", () => {
  assert.deepEqual(
    validateCustomerVehicleForm(
      {
        plate: "12A-12345",
        type: "CAR",
        brand: "",
        model: "",
        year: "1899",
        color: "x".repeat(31),
      },
      "create",
    ),
    {
      plate: "Plate must match formats like 30H-123456.",
      brand: "Brand is required.",
      model: "Model is required.",
      year: "Year must be between 1900 and 2100.",
      color: "Color must be at most 30 characters.",
    },
  );
});

test("requires an allowed vehicle type when creating a vehicle", () => {
  assert.deepEqual(
    validateCustomerVehicleForm(
      {
        plate: "30H-123456",
        type: "PLANE" as "CAR",
        brand: "Toyota",
        model: "Camry",
        year: "2024",
        color: "",
      },
      "create",
    ),
    {
      type: "Vehicle type is required.",
    },
  );
});

test("hydrates vehicle form defaults from detail payload", () => {
  assert.deepEqual(
    buildVehicleFormDefaults({
      plate: "30H-123456",
      type: "VAN",
      brand: "Ford",
      model: "Transit",
      year: 2022,
      color: null,
    }),
    {
      plate: "30H-123456",
      type: "VAN",
      brand: "Ford",
      model: "Transit",
      year: "2022",
      color: "",
    },
  );
});
