import { emailPattern, phonePattern } from "../../../shared/lib/validators.ts";

type ProfileValidationDraft = {
  fullName: string | null | undefined;
  email: string | null | undefined;
  phone: string | null | undefined;
};

type ProfileValidationErrors = {
  fullName: string | null;
  email: string | null;
  phone: string | null;
};

function normalizeProfileValue(value: string | null | undefined) {
  return (value ?? "").trim();
}

export function validateProfileForm(form: ProfileValidationDraft): ProfileValidationErrors {
  const fullName = normalizeProfileValue(form.fullName);
  const email = normalizeProfileValue(form.email);
  const phone = normalizeProfileValue(form.phone);

  return {
    fullName: fullName.length === 0 ? "Full name is required." : null,
    email: email.length > 0 && !emailPattern.test(email) ? "Email must be valid." : null,
    phone:
      phone.length > 0 && !phonePattern.test(phone)
        ? "Phone must use Vietnamese format 0XXXXXXXXX."
        : null,
  };
}
