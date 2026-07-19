export const phonePattern = /^0[0-9]{9}$/;
export const otpPattern = /^[0-9]{6}$/;
export const platePattern = /^[0-9]{2}[A-Z]{1}-[0-9]{5,6}$/;
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,128}$/;
export const discountCodePattern = /^[A-Z0-9_-]+$/;
export const discountCodeFormatMessage =
  "Mã giảm giá phải viết hoa và không chứa khoảng trắng.";
export const discountNameFormatMessage =
  "Tên discount phải viết hoa và không chứa khoảng trắng.";

export function sanitizeVoucherCodeInput(value: string): string {
  return value.replace(/\s/g, "").toUpperCase();
}

export function sanitizeDiscountNameInput(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s/g, "")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .toUpperCase();
}

export function getVoucherCodeFormatError(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (!discountCodePattern.test(normalized)) {
    return discountCodeFormatMessage;
  }

  return null;
}

export function getDiscountNameFormatError(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (!discountCodePattern.test(normalized)) {
    return discountNameFormatMessage;
  }

  return null;
}
