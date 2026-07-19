import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const locales = ["vi", "en"] as const;
type Locale = (typeof locales)[number];

function isLocale(value: string | undefined): value is Locale {
  return value === "vi" || value === "en";
}

export default getRequestConfig(async () => {
  const cookieLocale = cookies().get("locale")?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : "en";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
