import { emailPattern } from "../../../shared/lib/validators.ts";

export function normalizeLoginIdentifier(value: string) {
  return value.trim().replace(/\s/g, "");
}

export function getLoginIdentifierValidationMessage(value: string) {
  if (value.length === 0) {
    return "Email is required.";
  }

  if (emailPattern.test(value)) {
    return null;
  }

  return "Enter a valid email address.";
}
